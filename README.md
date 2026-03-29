# CrackIT — AI-Powered Study Assistant

CrackIT is an AI-powered study assistant that helps students understand textbook content through an interactive chat interface. Upload PDF documents, ask questions, and get detailed explanations with full LaTeX math rendering.

## Tech Stack

- **Frontend:** React 19, React Markdown, KaTeX, MathJax
- **Backend:** FastAPI, Azure OpenAI (GPT-4.1-nano), Azure Document Intelligence, Azure Speech Services, Azure Translator, FAISS, Sentence-Transformers
- **Languages:** JavaScript, Python

## Project Structure

```
microsoft-ai-study/
├── backend/
│   ├── api_main.py            # FastAPI server (all API endpoints)
│   ├── Speech.py              # Speech-to-text, text-to-speech & translation
│   ├── get_question.py        # Question retrieval utilities
│   ├── data/
│   │   ├── data_jee.csv       # JEE question dataset
│   │   └── subject_chapters_topics.json
│   └── .env                   # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main React app with chat UI
│   │   ├── App.css            # Main styling
│   │   ├── Quiz.js            # Quiz component
│   │   ├── Quiz.css           # Quiz styling
│   │   ├── revision.js        # Flashcard / revision component
│   │   ├── revision.css       # Revision styling
│   │   ├── Timer.js           # Timer component
│   │   └── TodoList.js        # Todo list component
│   └── public/
├── requirements.txt           # Python dependencies
├── FEATURES.md                # Feature roadmap
└── README.md
```

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/FlyingDragon112/microsoft-ai-study.git
cd microsoft-ai-study
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r ../requirements.txt
```


#### Environment Variables (.env)

You **must** create a `.env` file in the `backend/` folder before running the backend. This file stores sensitive API keys and endpoints. **Never commit your `.env` file to version control** — it is already listed in `.gitignore`.

Example `.env` file:

```env
# Azure Document Intelligence
DOC_ENDPOINT=your-azure-doc-intelligence-endpoint
DOC_KEY=your-azure-doc-intelligence-key

# Azure Speech Services
SPEECH_ENDPOINT=your-azure-speech-endpoint
SPEECH_KEY=your-azure-speech-key

# Azure Translator
TRANSLATE_ENDPOINT=your-azure-translator-endpoint
TRANSLATE_KEY=your-azure-translator-key

# Chat API (GitHub Models / OpenAI)
CHAT_API=your-chat-api-key
```

**What these variables are for:**

| Variable | Service | Used By |
|---|---|---|
| `DOC_ENDPOINT` | Azure Document Intelligence endpoint | `read_doc.py` |
| `DOC_KEY` | Azure Document Intelligence API key | `read_doc.py` |
| `SPEECH_ENDPOINT` | Azure Speech Services endpoint | `Speech.py` |
| `SPEECH_KEY` | Azure Speech Services API key | `Speech.py` |
| `TRANSLATE_ENDPOINT` | Azure Translator endpoint | `Speech.py` |
| `TRANSLATE_KEY` | Azure Translator API key | `Speech.py` |
| `CHAT_API` | Chat model API key | `api_main.py` |

**How to maintain your `.env` file:**
- Keep it up to date whenever new services or keys are added.
- Do **not** share it publicly or commit it to GitHub.
- If you rotate keys or change endpoints, update `.env` and restart the backend.
- If the `.env` file is missing or misconfigured, features like document analysis, speech, and translation will fail.

Start the backend:

```bash
uvicorn api_main:app --reload
```

The API will be available at http://localhost:8000

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

The app will be available at http://localhost:3000

## API Endpoints

| Method | Endpoint                  | Description                                    |
|--------|---------------------------|------------------------------------------------|
| GET    | `/health`                 | Health check                                   |
| POST   | `/chat/`                  | Send a query to the AI tutor                   |
| POST   | `/upload/`                | Upload a file (PDF, image, etc.)               |
| POST   | `/ticked-files/`          | Update the list of selected context files       |
| GET    | `/ticked-files/`          | Get the current list of selected context files  |
| POST   | `/speech-to-text/`        | Convert speech input to text                   |
| POST   | `/text-to-speech/`        | Convert text to speech output                  |
| POST   | `/get-single-question/`   | Get a PYQ recommendation based on context      |
| POST   | `/get-quiz-questions/`    | Generate quiz questions by subject/topic        |
| POST   | `/get-flashcards-data`    | Generate flashcards from uploaded materials     |

## Features

- **AI Chat Tutor** — Interactive chat with context-aware responses (Math, Physics, Chemistry)
- **File Upload** — Upload PDFs, images, and documents as study context
- **Document Analysis** — Extract text from PDFs via Azure Document Intelligence
- **Speech-to-Text & Text-to-Speech** — Voice input and audio responses with multi-language support (English, Hindi, Bengali, Gujarati)
- **PYQ Recommendations** — Get relevant JEE/NEET previous year questions based on your queries
- **Quiz Mode** — Auto-generated quizzes filtered by subject and topic
- **Flashcard Generation** — AI-generated flashcards from your uploaded study materials
- **Revision View** — Dedicated revision interface for flashcard-based study
- **Timer** — Built-in study/quiz timer
- **Todo List** — Track your study tasks
- **Math Rendering** — LaTeX rendering with KaTeX and MathJax (supports `$...$`, `$$...$$`, `\[...\]`, `\(...\)`)
- **Markdown Formatting** — Rich text responses with code blocks, lists, tables, etc.

## Notes

- Upload study materials (PDFs, images) through the app's UI — they are stored in `backend/uploads/`.
- Ensure `.env` is configured in `backend/` before starting the backend.
- Both frontend and backend must be running simultaneously.
- The app uses a FAISS index (`faiss_index.bin`) and `metadata.json` for PYQ semantic search — these must be present in the project root for quiz/question features to work.