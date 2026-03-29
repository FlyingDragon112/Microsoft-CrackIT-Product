from mimetypes import guess_type
import base64
import os
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential

def local_image_to_data_url(image_path):
    mime_type, _ = guess_type(image_path)
    if mime_type is None:
        mime_type = 'application/octet-stream' 

    with open(image_path, "rb") as image_file:
        base64_encoded_data = base64.b64encode(image_file.read()).decode('utf-8')

    return f"data:{mime_type};base64,{base64_encoded_data}"

def handwriting_to_markdown(pdf_path: str) -> str:
    """
    Convert a handwritten PDF to markdown text using Azure Document Intelligence.

    Args:
        pdf_path: Path to the PDF file (or a public URL string).

    Returns:
        Extracted content as a markdown string.
    """
    client = DocumentIntelligenceClient(
        endpoint=os.environ["DOC_ENDPOINT"],
        credential=AzureKeyCredential(os.environ["DOC_KEY"]),
    )

    with open(pdf_path, "rb") as f:
        poller = client.begin_analyze_document(
            model_id="prebuilt-read",
            body=f.read(),
            content_type="application/pdf",
            output_content_format="markdown",
        )

    return poller.result().content

SYSTEM_PROMPT = (
    "You are a helpful tutor specialising in Math, Physics and Chemistry. When explaining solutions, "
    "format your response in plain text. Do NOT use LaTeX, dollar signs ($), "
    "\\boxed{}, or any math markup. Use simple notation like: "
    "x² for exponents, fractions should look like fractions and not a/b. "
    "Use clear step-by-step formatting with numbered steps. "      
    "Use proper line breaks between steps and sections."                          
    "**When the user answers a question**, always start your reply with either "  
    "CORRECT or INCORRECT before any explanation. "
    "When the **get_question_user** tool is called, dont show the answer and solution with the question"
    "When the user asks to visualize, diagram, mindmap, or see a flowchart of a topic, "  
    "call the `generate_diagram` tool with the relevant topic extracted from their message. "
    "Do NOT generate Mermaid code yourself — always use the tool. "    
    "IMPORTANT: When you call the generate_diagram tool, you MUST include the COMPLETE "  
    "tool output (the full ```mermaid ... ``` block) verbatim in your response. "
    "Do NOT summarize or replace it with a description. The diagram code must appear "
    "in your message exactly as returned by the tool."
)

def add_to_prompt(result: dict) -> str:
    parts = []

    learning_goal_map = {
        "Understand Concept": (
            "Explain the concept clearly, covering the core idea, how it works, "
            "and why it matters. Use simple language suitable for a student."
        ),
        "Practice for Exam": (
            "Focus on exam-relevant details: key definitions, important formulas, "
            "common question patterns, and typical mistakes to avoid."
        ),
        "Quick Revision": (
            "Give a concise, high-density summary — only the most essential points "
            "a student needs to recall before an exam."
        ),
    }
    goal_instruction = learning_goal_map.get(result.get("learningGoal", ""), "")
    if goal_instruction:
        parts.append(goal_instruction)

    depth_map = {
        "One Liner":     "Respond in a single sentence only.",
        "Default":       "",
        "One Paragraph": "Keep your response to one concise paragraph (4-5 sentences).",
        "Bulleted":      "Format your response as a clear bullet-point list.",
    }
    depth_instruction = depth_map.get(result.get("outputDepth", ""), "")
    if depth_instruction:
        parts.append(depth_instruction)

    if result.get("pyqRecommendation") in ("Yes", True):
        parts.append(
            "After your explanation, suggest a relevant previous-year exam question "
            "on this topic using the get_question_user tool."
        )

    if result.get("realLifeApplication") in ("Yes", True): 
        parts.append(
            "Ground your explanation with a relatable real-life example or analogy "
            "that makes the concept easier to visualise."
        )

    return "\n".join(filter(None, parts)) 