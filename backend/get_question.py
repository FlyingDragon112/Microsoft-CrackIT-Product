from pydantic import BaseModel, Field
import pandas as pd
from typing import Literal
from langchain.chat_models import init_chat_model
import os
from dotenv import load_dotenv
load_dotenv()
import json

os.environ["OPENAI_API_KEY"] = os.getenv("CHAT_API2")

json_path = os.path.join(os.path.dirname(__file__), "data", "subject_chapters_topics.json")
with open(json_path, "r", encoding="utf-8") as f:
    subject_chapters = json.load(f)

SUBJECTS = list(subject_chapters.keys())
CHAPTERS = {
    subject: list(subject_chapters[subject].keys())
    for subject in SUBJECTS
}

MODEL_NAME = "gpt-4.1-nano"
model = init_chat_model(os.getenv("MODEL_NAME"),openai_api_base = os.getenv("CHAT_ENDPOINT"))

# Classify Subject

SubjectType = Literal["chemistry", "maths", "physics"]

class ClassifySubject(BaseModel):
    subject: SubjectType

def classify_subject(images: list) -> str:
    classifier_llm = model.with_structured_output(ClassifySubject)

    result = classifier_llm.invoke([
        {
            "role": "system",
            "content": (
                "You are a classifier. Given image(s) of handwritten notes, "
                "identify the subject.\n\n"
                "You MUST choose from: chemistry, maths, physics"
            )
        },
        {
            "role": "user",
            "content": [
                *images,
                {"type": "text", "text": "What subject are these notes about?"}
            ]
        }
    ])
    return result.subject


# Classify Chapter (only for detected subject)

class ClassifyChapter(BaseModel):
    chapter: str = Field(..., description="Must be one of the valid chapters provided")

def classify_chapter(images: list, subject: str) -> str:
    classifier_llm = model.with_structured_output(ClassifyChapter)

    valid_chapters = "\n".join(f"- {c}" for c in CHAPTERS[subject])

    result = classifier_llm.invoke([
        {
            "role": "system",
            "content": (
                f"You are a classifier. The subject is already known: {subject}.\n"
                "Given image(s) of handwritten notes, identify the chapter.\n\n"
                f"You MUST choose EXACTLY from this list:\n{valid_chapters}"
            )
        },
        {
            "role": "user",
            "content": [
                *images,
                {"type": "text", "text": f"Which {subject} chapter are these notes about?"}
            ]
        }
    ])
    return result.chapter

def classify_notes_from_text(text: str) -> dict:
    subject_llm = model.with_structured_output(ClassifySubject)
    subject_result = subject_llm.invoke([
        {
            "role": "system",
            "content": (
                "You are a classifier. Given text of handwritten notes or markdown, "
                "identify the subject.\n\n"
                "You MUST choose from: chemistry, maths, physics"
            )
        },
        {
            "role": "user",
            "content": text
        }
    ])
    subject = subject_result.subject

    chapter_llm = model.with_structured_output(ClassifyChapter)
    valid_chapters = "\n".join(f"- {c}" for c in CHAPTERS[subject])
    chapter_result = chapter_llm.invoke([
        {
            "role": "system",
            "content": (
                f"You are a classifier. The subject is already known: {subject}.\n"
                "Given text of handwritten notes or markdown, identify the chapter.\n\n"
                f"You MUST choose EXACTLY from this list:\n{valid_chapters}"
            )
        },
        {
            "role": "user",
            "content": text
        }
    ])

    return {"subject": subject, "chapter": chapter_result.chapter}

def classify_notes(images: list) -> dict:
    subject = classify_subject(images)
    chapter = classify_chapter(images, subject)
    return {"subject": subject, "chapter": chapter}
