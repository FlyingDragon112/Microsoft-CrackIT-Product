from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import os
from pydantic import BaseModel
from Speech import recognize_from_microphone, translate_text_azure
from fastapi import Request
from openai import OpenAI
from fastapi import HTTPException
from typing import List
from chat import run_chatbot, context_window
from functions import local_image_to_data_url
from datetime import datetime
import uuid
import re

SERVER_SESSION_ID = str(uuid.uuid4())

# Load Model
endpoint = os.getenv("CHAT_ENDPOINT")
deployment_name = os.getenv("MODEL_NAME")

client = OpenAI(
    base_url=endpoint,
    api_key=os.getenv("CHAT_API2")
)

# Setup FastAPI
load_dotenv()
app = FastAPI(root_path = "/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── File serving ──────────────────────────────────────────────────────────────

UPLOAD_DIR = "uploads"

@app.get("/files/exists/{filename}")
def file_exists(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    return {"exists": os.path.exists(path)}

@app.get("/files/{filename}")
def serve_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")
    return FileResponse(file_path)


# ── Session ───────────────────────────────────────────────────────────────────

@app.get("/session-id")
def get_session_id():
    return {"session_id": SERVER_SESSION_ID}


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/progress/")
def get_progress():
    return {"progress": context_window.progress}

# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    query: str

@app.post("/chat/")
async def chat(request: ChatRequest):
    try:
        context_window.add_content(ticked_files_store)
        answer = run_chatbot(request.query)
        return {"query": request.query, "response": answer}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Speech ────────────────────────────────────────────────────────────────────

@app.post("/speech-to-text/")
async def speech_to_text():
    text,_ = recognize_from_microphone()
    return {"text": text}

from fastapi.responses import StreamingResponse
from speech_utils import stream_tts

@app.post("/text-to-speech/")
async def text_to_speech(request: Request):
    data     = await request.json()
    text     = data.get("text", "")
    language = data.get("language", "en-US")

    return StreamingResponse(
        stream_tts(text, language),
        media_type="audio/mpeg"
    )

@app.post("/translate-text/")
async def translate_text_endpoint(request: Request):
    body = await request.json()
    text = body.get("text", "")
    to_language = body.get("to_language", "en")

    if not text or to_language == "en":
        return {"translated_text": text}

    translated = translate_text_azure(text, to_language)
    return {"translated_text": translated}

# ── File upload ───────────────────────────────────────────────────────────────

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        return {"filename": file.filename, "status": "uploaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


# ── Ticked files ──────────────────────────────────────────────────────────────

class TickedFiles(BaseModel):
    ticked_files: List[str]

ticked_files_store = []

@app.post("/ticked-files/")
async def update_ticked_files(ticked_files: TickedFiles):
    global ticked_files_store
    ticked_files_store = ticked_files.ticked_files
    print(ticked_files_store)
    return {"status": "updated", "ticked_files": ticked_files_store}

@app.get("/ticked-files/")
async def get_ticked_files():
    print(ticked_files_store)
    return {"ticked_files": ticked_files_store}


# ── Quiz ──────────────────────────────────────────────────────────────────────

from azure_sql import get_quiz_questions as fetch_quiz_questions

prev_ques = None
@app.post("/get-quiz-questions/")
async def get_quiz_questions(
    num_ques: int,
    subjects: List[str] = Query(None),
    chapters: List[str] = Query(None),
):
    global prev_ques
    prev_ques = fetch_quiz_questions(num_ques, subjects, chapters)
    return prev_ques

class QuizResult(BaseModel):
    answers: dict[int, dict[str, str | int | None]]

from azure_sql import submit_quiz as sb_quiz
from azure_sql import update_topic, update_topic_stats

@app.post("/submit-quiz/")
async def submit_quiz(result: QuizResult):
    sb_quiz(result)
    for i in result.answers:
        row = next((q for q in prev_ques if q['question_index'] == i), None)
        if row:
            update_topic(row['chapter'], row['topic'], quiz=True)
            update_topic_stats(row['chapter'], row['topic'], result.answers[i]['correct_ans'] == result.answers[i]['user_ans'])

    return {"inserted": len(result.answers)}


# ── Flashcards ────────────────────────────────────────────────────────────────
def extract_flashcards(response_text: str) -> list[dict]:
    """
    Parse raw LLM response into a list of flashcard dicts.
    Handles markdown fences and escaped backslash issues.
    
    Returns a list of dicts with keys: question, answer, topic
    """
    cleaned = response_text.strip()

    # Strip markdown fences (```json ... ``` or ``` ... ```)
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Fix backslash escaping issues from LLM output
    cleaned = cleaned.replace('\\\\', '\x00DBL\x00')
    cleaned = cleaned.replace('\\"',  '\x00QT\x00')
    cleaned = cleaned.replace('\\',   '\\\\')
    cleaned = cleaned.replace('\x00DBL\x00', '\\\\')
    cleaned = cleaned.replace('\x00QT\x00',  '\\"')

    flashcards = json.loads(cleaned)
    return flashcards

from functions import handwriting_to_markdown

@app.post('/get-flashcards-data')
async def get_flashcards_data():
    if ticked_files_store == []:
        return []

    file_contents = []
    image_files = []
    for filename in ticked_files_store:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(file_path):
            continue
        if filename.lower().endswith((".jpg", ".jpeg", ".png", ".gif")):
            image_files.append(filename)
            continue
        try:
            if filename.lower().endswith(".pdf"):
                continue 
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                file_contents.append(f.read())
        except Exception:
            pass
    pdf_files = [file for file in ticked_files_store if file.lower().endswith(".pdf")]
    text_files = []
    for pdf in pdf_files:
        pdf_path = f"uploads/{pdf}"
        try:
            markdown = handwriting_to_markdown(pdf_path)
            text_files.append(markdown)
        except Exception as e:
            pass

    if not file_contents and not image_files and not text_files:  # add text_files here
        return []

    combined_text = "\n\n".join(file_contents + text_files)
    combined_text = combined_text[:8000]

    FLASHCARD_PROMPT = (
        "You are a flashcard generator for students preparing for JEE/NEET exams. "
        "Given the following study material, generate 10 flashcards as a JSON array. "
        "Each flashcard must have exactly these fields: \"question\", \"answer\", \"topic\". "
        "The topic should be the main chapter/concept the question belongs to. "
        "For any math expressions, use LaTeX wrapped in dollar signs: $...$ for inline math. "
        "Do NOT use parentheses like \\( \\) for math. Use ONLY dollar signs $...$ as math delimiters. "
        "CRITICAL: Every backslash in LaTeX must be doubled in the JSON string. "
        "Example: [{\"question\": \"What is $E = E^{\\\\circ} - \\\\frac{RT}{nF} \\\\ln Q$ called?\", "
        "\"answer\": \"The Nernst Equation: $E = E^{\\\\circ} - \\\\frac{RT}{nF} \\\\ln Q$\", "
        "\"topic\": \"Electrochemistry\"}] "
        "Return ONLY the JSON array, no markdown fences, no extra text."
    )

    content = []
    if combined_text.strip():
        content.append({"type": "text", "text": combined_text})
    for image in image_files:
        image_path = f"{UPLOAD_DIR}/{image}"
        data_url = local_image_to_data_url(image_path)
        content.append({"type": "image_url", "image_url": {"url": data_url}})

    if not content:
        return []

    try:
        response_obj = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": FLASHCARD_PROMPT},
                {"role": "user", "content": content}
            ],
            
        )
        response_text = response_obj.choices[0].message.content
        print(f"Flashcards raw response: {response_text}")

        flashcards = extract_flashcards(response_text)
        return [
            {"front": fc["question"], "back": fc["answer"], "chapter": fc["topic"]}
            for fc in flashcards
        ]
    except Exception as e:
        print(f"Error in /get-flashcards-data: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating flashcards: {str(e)}")

from azure_sql import push_flashcard_to_table, pop_flashcard_from_table, get_flashcards_from_table

@app.post('/save-flashcard')
async def save_flashcard(fc: dict):
    push_flashcard_to_table(
        subject=fc["subject"],
        chapter=fc["chapter"],
        front=fc["front"],
        back=fc["back"]
    )
    return {"saved": True}

@app.get("/get-flashcards")
async def get_flashcards(subject: str = None, chapter: str = None):
    df = get_flashcards_from_table(subject=subject, chapter=chapter)
    return df.to_dict(orient="records")

@app.delete('/delete-flashcard/{flashcard_id}')
async def delete_flashcard(flashcard_id: int):
    deleted = pop_flashcard_from_table(flashcard_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Flashcard {flashcard_id} not found.")
    return {"deleted": True}

# ── Analytics ─────────────────────────────────────────────────────────────────

from analytics import load_data, build_all_figures
import json

@app.get("/charts/{chart_name}")
def get_chart(chart_name: str):
    _df   = load_data()
    _figs = build_all_figures(_df)
    if chart_name not in _figs:
        raise HTTPException(404, "Chart not found")
    return json.loads(_figs[chart_name].to_json())

@app.get("/stats/summary")
def get_stats_summary():
    from azure_sql import get_aggregated_stats
    df = get_aggregated_stats()
    return df.fillna(0).to_dict(orient="records")


# ── Notes ─────────────────────────────────────────────────────────────────────
@app.get("/context/")
def get_context():
    return {
        "subject": context_window.subject or "Chat",
        "chapter": context_window.chapter or "AI Response",
    }
    
@app.get("/notes")
def get_notes(
    subject: str = None,
    chapter: str = None,
    from_date: datetime = None,
    to_date: datetime = None,
):
    from azure_sql import get_notes_from_table
    df = get_notes_from_table(subject=subject, chapter=chapter, from_date=from_date, to_date=to_date)
    return df.fillna("").to_dict(orient="records")

class NoteCreate(BaseModel):
    subject: str = "Chat"
    chapter: str = "AI Response"
    text: str

@app.post("/notes")
def add_note(note: NoteCreate):
    from azure_sql import push_note_to_table
    push_note_to_table(subject=note.subject, chapter=note.chapter, text=note.text)
    return {"status": "ok"}

@app.delete("/notes/{note_id}")
def delete_note(note_id: int):
    from azure_sql import pop_note_from_table
    deleted = pop_note_from_table(note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Note {note_id} not found")
    return {"status": "ok", "deleted_id": note_id}

# ── Quiz History ──────────────────────────────────────────────────────────────
from azure_sql import push_quiz_history, get_quiz_history, pop_quiz_history, get_questions_by_ids

class QuizHistoryCreate(BaseModel):
    subject:         list[str]
    chapter:         list[str]
    score:           int
    total_questions: int
    question_ids:    list[int]
    submitted_ans:   list[str]
    correct_ans:     list[str]
    time_taken:      list[int]
    
@app.post("/quiz-history")
def add_quiz_history(data: QuizHistoryCreate):
    push_quiz_history(
        subject=data.subject,
        chapter=data.chapter,
        score=data.score,
        total_questions=data.total_questions,
        question_ids=data.question_ids,
        submitted_ans=data.submitted_ans,
        correct_ans=data.correct_ans, 
        time_taken=data.time_taken,      
    )
    return {"status": "ok"}

@app.get("/quiz-history")
def list_quiz_history():
    df = get_quiz_history()
    if df.empty:
        return []
    return df.fillna("").to_dict(orient="records")

@app.delete("/quiz-history/{history_id}")
def delete_quiz_history(history_id: int):
    deleted = pop_quiz_history(history_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Quiz history {history_id} not found")
    return {"status": "ok", "deleted_id": history_id}

class QuestionIDsRequest(BaseModel):
    ids: list[int]

@app.post("/questions-by-ids")
def questions_by_ids(req: QuestionIDsRequest):
    return get_questions_by_ids(req.ids)

# Topics
from azure_sql import get_all_topics as fetch_all_topics
from azure_sql import get_weak_and_strong_topics as get_ws_topics
@app.get("/get-all-topics/")
async def get_all_topics():
    return fetch_all_topics()

@app.get("/get-weak-strong-topics/")
async def get_weak_strong_topics():
    return get_ws_topics()
# ── Prompt Settings ───────────────────────────────────────────────────────────

from store import PromptSettings, prompt_settings_store

# remove the PromptSettings class definition from here, keep the endpoints:
@app.post("/prompt-settings/")
async def save_prompt_settings(settings: PromptSettings):
    print("[RECEIVED SETTINGS]", settings.model_dump())
    prompt_settings_store.update(**settings.model_dump())
    print("[STORE AFTER UPDATE]", prompt_settings_store.model_dump())
    return {"status": "ok"}

@app.get("/prompt-settings/")
async def get_prompt_settings():
    return prompt_settings_store