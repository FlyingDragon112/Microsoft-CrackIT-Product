import logging
import hashlib
import os
from typing import Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from typing_extensions import TypedDict 
from langchain.agents import create_agent
from langchain_core.tools import tool
from functions import local_image_to_data_url, SYSTEM_PROMPT, handwriting_to_markdown, add_to_prompt
from get_question import classify_notes, classify_notes_from_text
from azure_sql import get_quiz_questions
from dotenv import load_dotenv
load_dotenv()
import json
from pydantic import BaseModel, Field
from store import prompt_settings_store
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(BASE_DIR, "data", "subject_chapters_topics.json")
with open(json_path, "r", encoding="utf-8") as f:
    chap_info = json.load(f)

logger = logging.getLogger("chatbot")
logger.setLevel(logging.DEBUG)

formatter = logging.Formatter(
    fmt="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
console_handler.setFormatter(formatter)

file_handler = logging.FileHandler("chatbot.log", mode="a", encoding="utf-8")
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(formatter)

logger.addHandler(console_handler)
logger.addHandler(file_handler)

MODEL_NAME = os.getenv("MODEL_NAME")
os.environ["OPENAI_API_KEY"] = os.getenv("CHAT_API2")

logger.info("Model: %s", MODEL_NAME)

def was_tool_called(response, tool_name):
    for msg in response["messages"]:
        content = msg.content if hasattr(msg, "content") else []
        if isinstance(content, list):
            for block in content:
                if hasattr(block, "type") and block.type == "tool_use" and block.name == tool_name:
                    return True
    return False

@tool
def get_question_user() -> list[dict]:
    """
    Fetches a random question based on the user's handwritten notes.
    Use this tool when the user wants to:
    - a question
    - practice questions
    - test their understanding
    - get a question on the topic they are studying
    - Prompt Settings have PYQ Recommendation set to YES
    Returns a single question with options, correct answer, and explanation.
    **ONLY CALL THIS TOOL ONE TIME**
    """
    logger.debug("Tool 'get_question_user' called")
    if context_window.subject == None:
        notes_information = classify_notes(context_window.get_content())
        subject = notes_information["subject"]
        chapter = notes_information["chapter"]
    else:
        subject = context_window.subject
        chapter = context_window.chapter
    logger.info("Fetching question for subject='%s', chapter='%s'", subject, chapter)
    result = get_quiz_questions(1,[subject.strip()], [chapter.strip()])
    context_window.last_correct_answer = result[0]["correct_option"]
    result[0].pop("correct_option", None)
    result[0].pop("explanation", None)

    logger.debug("Question fetched: %s", result)
    return result

@tool
def generate_diagram(topic: str, diagram_type: str = "auto") -> str:
    """
    Generates a Mermaid.js diagram (mindmap, flowchart, or concept map) for a given topic.
    Use this tool when the user wants to:
    - visualize a concept or topic as a diagram
    - see a mindmap of a chapter or subject
    - understand a process as a flowchart
    - get a visual summary of their notes
    - "show me a diagram", "make a mindmap", "flowchart of X"

    Args:
        topic: The topic or concept to diagram (inferred from user message)
        diagram_type: "mindmap", "flowchart", or "auto" (LLM decides)
    Returns:
        A Mermaid.js code block string ready to render in the frontend.
    """
    logger.debug("Tool 'generate_diagram' called — topic='%s', type='%s'", topic, diagram_type)

    # If auto, decide based on topic phrasing
    type_prompt = ""
    if diagram_type == "auto":
        type_prompt = """
        Decide the best diagram type:
        - mindmap → for concepts, topics, overviews
        - flowchart → for processes, steps, sequences
        Output mindmap or flowchart syntax accordingly.
        """
    elif diagram_type == "mindmap":
        type_prompt = "Generate a Mermaid mindmap."
    else:
        type_prompt = "Generate a Mermaid flowchart (flowchart TD)."

    # Use the subject/chapter context if available
    context_hint = ""
    if context_window.subject and context_window.chapter:
        context_hint = f"This is for the subject '{context_window.subject}', chapter '{context_window.chapter}'."

    prompt = f"""
    {type_prompt}
    {context_hint}

    Topic: {topic}

    Rules:
    - Output ONLY valid Mermaid syntax, no explanation, no markdown fences.
    - For mindmap: max 3 levels, 5-6 branches.
    - For flowchart: max 8-10 nodes, use TD direction.
    - Labels must be concise (under 5 words each).
    - No special characters that break Mermaid parsing (avoid colons, quotes inside labels).
    """

    response = model.invoke([{"role": "user", "content": prompt}])
    mermaid_code = response.content.strip()

    # Strip accidental markdown fences if model adds them
    if mermaid_code.startswith("```"):
        lines = mermaid_code.split("\n")
        mermaid_code = "\n".join(
            line for line in lines
            if not line.strip().startswith("```")
        )

    logger.info("Diagram generated (%d chars)", len(mermaid_code))
    logger.debug("Mermaid output:\n%s", mermaid_code)

    return f"```mermaid\n{mermaid_code.strip()}\n```"

ques_tools = [get_question_user, generate_diagram]
model = init_chat_model(MODEL_NAME, openai_api_base=os.getenv("CHAT_ENDPOINT"))
logger.info("Base model initialized")
ques_model = create_agent(model, tools=ques_tools)
logger.info("Agent model initialized with tools: %s", [t.name for t in ques_tools])

# Defined States    
class State(TypedDict):
    messages: Annotated[list, add_messages]

def _hash_filelist(files: list) -> str:
    """Returns a stable MD5 hash for a list of filenames, order-independent."""
    combined = "|".join(sorted(files))
    return hashlib.md5(combined.encode()).hexdigest()

class ContextWindow:
    def __init__(self):
        self.messages = []
        self.content = []
        self.content_hash = None      
        self.subject = None
        self.chapter = None
        self.image_sent = False
        self.text_files = []
        self.text_files_sent = False
        self.last_correct_answer = None
        self.topics = []
        self.progress = 0
        self.quiz_given = False
        logger.debug("ContextWindow initialized")

    def add_message(self, message):
        self.messages.append(message)
        logger.debug("Message added to context: %s", message)

    def add_content(self, ticked_files):
        logger.info("add_content called with files: %s", ticked_files)
        incoming_hash = _hash_filelist(ticked_files)
        if self.content_hash == incoming_hash:
            logger.debug("Content hash unchanged (%s), skipping update", incoming_hash)
            return

        logger.debug("Content hash changed: old=%s new=%s", self.content_hash, incoming_hash)
        self.reset_window()
        self.content_hash = incoming_hash  # set AFTER reset so it isn't cleared

        image_files = [file for file in ticked_files if file.lower().endswith((".jpg", ".jpeg", ".png", ".gif"))]
        logger.info("Image files detected: %s", image_files)
        for image in image_files:
            image_path = f"uploads/{image}"
            logger.debug("Loading image from path: %s", image_path)
            data_url = local_image_to_data_url(image_path)
            self.content.append({"type": "image_url", "image_url": {"url": data_url}})

        pdf_files = [file for file in ticked_files if file.lower().endswith(".pdf")]
        logger.info("PDF files detected: %s", pdf_files)
        self.text_files = []
        for pdf in pdf_files:
            pdf_path = f"uploads/{pdf}"
            logger.debug("Converting PDF to markdown: %s", pdf_path)
            try:
                markdown = handwriting_to_markdown(pdf_path)
                self.text_files.append(markdown)
                logger.info("PDF converted successfully: %s (%d chars)", pdf, len(markdown))
            except Exception as e:
                logger.error("Failed to convert PDF '%s': %s", pdf, e)

        if self.content:
            logger.info("Classifying notes from %d image(s)", len(self.content))
            info = classify_notes(self.content)
            self.subject = info["subject"]
            self.chapter = info["chapter"]
            logger.info("Notes classified - subject='%s', chapter='%s'", self.subject, self.chapter)
            self.topics = chap_info.get(self.subject, {}).get(self.chapter, [])
        elif self.text_files:
            info = classify_notes_from_text(self.get_text_files_content())
            self.subject = info["subject"]
            self.chapter = info["chapter"]
            logger.info("Notes classified from text - subject='%s', chapter='%s'", self.subject, self.chapter)
            self.topics = chap_info.get(self.subject, {}).get(self.chapter, [])
        else:
            logger.warning("No valid image content found after processing ticked_files")

    def reset_window(self):
        logger.info("ContextWindow reset")
        self.messages = []
        self.content = []
        self.content_hash = None
        self.subject = None
        self.chapter = None
        self.image_sent = False
        self.last_correct_answer = None
        self.progress = 0
        self.text_files = []
        self.text_files_sent = False
        self.quiz_given = False
        self.topics = []

    def get_context(self):
        return "\n".join(self.messages)

    def get_content(self):
        return self.content
    
    def get_text_files_content(self):
        return "\n".join(self.text_files)

context_window = ContextWindow()

def classifier(state: State):
    ans = len(context_window.content) > 0 or len(context_window.text_files) > 0
    logger.info("Classifier node - has_content=%s, routing to '%s'", ans, "ques_chat" if ans else "explain_chat")
    return {"next": ans}

def ques_chat(state: State):
    logger.info("Entering ques_chat node")
    last_mesg = state["messages"][-1]
    content = last_mesg.content if hasattr(last_mesg, "content") else last_mesg["content"]
    logger.debug("User message: %s", content)

    context_window.add_message(f"User: {content}")
    if context_window.image_sent == False:
        logger.debug("First invocation - attaching image content to message")
        user_content = [{"type": "text", "text": content}] + context_window.get_content()
        context_window.image_sent = True
    else:
        logger.debug("Image already sent, sending text only")
        user_content = [{"type": "text", "text": content}]

    if not context_window.text_files_sent:
        user_content += [{
            "type": "text",
            "text": "The following is the content of the student's uploaded notes:\n\n" + "\n".join(context_window.text_files)
        }]
        context_window.text_files_sent = True

    extra = add_to_prompt(prompt_settings_store.model_dump())
    logger.debug(extra)
    history = context_window.get_context()
    logger.debug("Invoking ques_model with history length=%d chars", len(history))

    response = ques_model.invoke({
        "messages": [
            {
                "role": "system",
                "content": (
                    SYSTEM_PROMPT +
                    "\n\n" + extra +
                    "\n\nConversation history:\n" + history
                )
            },
            {"role": "user", "content": user_content}
        ]
    })
    answer = response["messages"][-1].content

    if "```mermaid" not in answer and was_tool_called(response, "generate_diagram"):
        for msg in response["messages"]:
            msg_content = msg.content if hasattr(msg, "content") else ""
            if isinstance(msg_content, str) and "```mermaid" in msg_content:
                mermaid_blocks = re.findall(r"```mermaid[\s\S]*?```", msg_content)
                if mermaid_blocks:
                    answer = "\n\n".join(mermaid_blocks) + "\n\n" + answer
                    logger.info("Re-injected mermaid block from tool message into answer")
                break

    logger.info("ques_chat response received, length=%d chars", len(answer))
    logger.debug("ques_chat answer: %s", answer)

    clean_answer = re.sub(r"```[\s\S]*?```", "", answer).strip()

    context_window.add_message(f"Assistant: {clean_answer}")

    return {"messages": [{"role": "assistant", "content": answer}]}

class Quiz_Check(BaseModel):
    should_recommend_quiz: bool
    reason: str
    progress: int = Field(ge=0, le=100, description="Percentage of topics covered so far, from 0 to 100")
    covered_topics: list[str] = Field(default=[], description="Topics from the full list that have been meaningfully discussed so far")

from azure_sql import update_topic

def check_quiz_recommend(state: State):
    logger.info("Entering check_quiz_recommend node")

    last_mesg = state["messages"][-1]
    content = last_mesg.content if hasattr(last_mesg, "content") else last_mesg["content"]

    # Already gave quiz and not yet 100% — pass through unchanged
    if context_window.quiz_given == True and context_window.progress != 100:
        return {"messages": state["messages"]}

    # 100% progress — force quiz recommendation
    if context_window.progress == 100:
        base_url = "http://localhost:3000/quiz"
        quiz_url = (
            f"{base_url}"
            f"?subject={context_window.subject}"
            f"&chapter={context_window.chapter}"
        )
        recommendation_msg = (
            f"You've covered all topics! "
            f"[QUIZ_LINK]({quiz_url})"
        )
        return {"messages": [{"role": "assistant", "content": content + "\n" + recommendation_msg}]}

    # No topics uploaded — pass through unchanged
    if not context_window.topics:
        logger.debug("No topics found in context_window, skipping quiz recommendation")
        return {"messages": state["messages"]}

    structured_llm = model.with_structured_output(Quiz_Check)

    prompt = f"""
    You are an educational progress evaluator.

    ALL topics in the current learning module:
    {context_window.topics}

    Conversation history (topics covered so far):
    {context_window.get_context()}

    Instructions:
    - Compare the conversation history against the full topic list.
    - Estimate what percentage of topics have been meaningfully discussed (0-100).
    - If MORE THAN 30% of topics are covered → set should_recommend_quiz = true.
    - Otherwise → set it to false.
    - Set progress to the estimated percentage (integer, 0-100).
    - In covered_topics, list ONLY the topics from the full topic list that appear in the conversation history.
    - Provide a brief reason for your decision.
    """

    result: Quiz_Check = structured_llm.invoke(prompt)
    context_window.progress = result.progress
    logger.info(
        "Quiz check — recommend=%s | progress=%d%% | reason=%s",
        result.should_recommend_quiz,
        result.progress,
        result.reason,
    )

    if result.should_recommend_quiz or result.progress >= 30:
        base_url = "http://localhost:3000/quiz"
        quiz_url = (
            f"{base_url}"
            f"?subject={context_window.subject}"
            f"&chapter={context_window.chapter}"
        )
        recommendation_msg = (
            f"You've covered enough topics! "
            f"[QUIZ_LINK]({quiz_url})"
        )
        context_window.quiz_given = True
        for topic in result.covered_topics:
            update_topic(context_window.chapter, topic, studied=True)
        return {"messages": [{"role": "assistant", "content": content + "\n" + recommendation_msg}]}

    return {"messages": state["messages"]}

def explain_chat(state: State):
    logger.info("Entering explain_chat node")
    last_mesg = state["messages"][-1]
    content = last_mesg.content if hasattr(last_mesg, "content") else last_mesg["content"]
    logger.debug("User message: %s", content)

    messages = [
        {
            "role": "system",
            "content": (
                SYSTEM_PROMPT
            )
        }
    ]
    user_content = [{"type": "text", "text": content}]
    messages.append({"role": "user", "content": user_content})

    logger.debug("Invoking base model for explanation")
    response = model.invoke(messages)
    logger.info("explain_chat response received, length=%d chars", len(response.content))
    logger.debug("explain_chat answer: %s", response.content)

    return {"messages": [{"role": "assistant", "content": response.content}]}

# Graph Initialization
logger.info("Building LangGraph state graph")
graph_builder = StateGraph(State)
graph_builder.add_node("classifier", classifier)
graph_builder.add_node("ques_chat", ques_chat)
graph_builder.add_node("explain_chat", explain_chat)
graph_builder.add_node("check_quiz_recommend",check_quiz_recommend)

graph_builder.add_edge(START,"classifier")
graph_builder.add_conditional_edges(
    "classifier",
    lambda state: state.get("next"), {True :"ques_chat",False :"explain_chat"}
    )

graph_builder.add_edge("ques_chat", "check_quiz_recommend")
graph_builder.add_edge("check_quiz_recommend", END)
graph_builder.add_edge("explain_chat", END)
graph = graph_builder.compile()
logger.info("Graph compiled successfully")

def run_chatbot(user_input: str) -> str:
    logger.info("run_chatbot called with input: %s", user_input)
    state = {
        "messages": [{"role": "user", "content": user_input}],
        "next": None
    }

    state = graph.invoke(state)
    logger.debug("Graph invocation complete")

    answer = state["messages"][-1].content if hasattr(state["messages"][-1], "content") else state["messages"][-1]["content"]
    logger.info("Final answer length: %d chars", len(answer))
    return answer