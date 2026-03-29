# CrackIT — AI-Powered Study Assistant

CrackIT is an AI-powered study assistant that helps students understand textbook content through an interactive chat interface. Upload PDF documents, ask questions, and get detailed explanations with full LaTeX math rendering.

## Tech Stack

- **Frontend:** React 19, React Markdown, KaTeX, MathJax
- **Backend:** FastAPI, Azure OpenAI (GPT-5.1-chat), Azure Document Intelligence, Azure Speech Services, Azure Translator, Azure SQL Database
- **Languages:** JavaScript, Python

## Project Structure

```
Microsoft-CrackIT-Product/
├── backend/
│   ├── api_main.py            # FastAPI server (all API endpoints)
│   ├── analytics.py           # Plotly chart builders & data loaders
│   ├── azure_sql.py           # Azure SQL: quiz, flashcards, notes, history
│   ├── chat.py                # Chatbot logic & context window management
│   ├── functions.py           # Utilities: image encoding, PDF→markdown
│   ├── get_question.py        # Question retrieval utilities
│   ├── Speech.py              # Microphone STT, TTS & Azure Translator
│   ├── speech_utils.py        # TTS audio streaming helper
│   ├── store.py               # Prompt settings model & in-memory store
│   ├── data/
│   │   └── subject_chapters_topics.json # Subject Metadata
│   ├── uploads/               # Uploaded study materials (runtime)
│   └── .env                   # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main React app entry & routing
│   │   ├── App.css            # Main styling
│   │   ├── MainChat.js        # Core chat interface
│   │   ├── Analytics.js       # Analytics dashboard component
│   │   ├── Calendar.js        # Study calendar component
│   │   ├── Calendar.css
│   │   ├── Goals.js           # Study goals tracker
│   │   ├── Goals.css
│   │   ├── Library.js         # Uploaded files library
│   │   ├── Library.css
│   │   ├── Notes.js           # Notes component
│   │   ├── Notes.css
│   │   ├── PromptEditor.js    # Custom prompt editor
│   │   ├── PromptEditor.css
│   │   ├── Quiz.js            # Quiz component
│   │   ├── Quiz.css
│   │   ├── QuizResponses.js   # Quiz results & response viewer
│   │   ├── QuizResponses.css
│   │   ├── revision.js        # Flashcard / revision component
│   │   ├── revision.css
│   │   ├── SavedFlashcards.js # Saved flashcards viewer
│   │   ├── SavedFlashcards.css
│   │   ├── Study.js           # Study session component
│   │   ├── Study.css
│   │   ├── Timer.js           # Study / quiz timer
│   │   ├── Timer.css
│   │   ├── TodoList.js        # Todo list component
│   │   ├── TodoList.css
│   │   ├── Topics.js          # Topic browser component
│   │   ├── Topics.css
│   │   ├── watermark.js       # Watermark / branding component
│   │   ├── watermark.css
│   │   ├── mentalhealth.js    # Mental health & wellness section
│   │   ├── syllabus.json      # Syllabus data (JEE/NEET topics)
│   └── public/
├── requirements.txt           # Python dependencies
└── README.md
```

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/FlyingDragon112/Microsoft-CrackIT-Product.git
cd Microsoft-CrackIT-Product
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
# Chat Model
CHAT_API=your-primary-chat-api-key
CHAT_API2=your-secondary-chat-api-key
CHAT_ENDPOINT=your-chat-model-endpoint
MODEL_NAME=your-deployment-model-name

# Azure Speech Services
SPEECH_ENDPOINT=your-azure-speech-endpoint
SPEECH_KEY=your-azure-speech-key

# Azure Document Intelligence
DOC_ENDPOINT=your-azure-doc-intelligence-endpoint
DOC_KEY=your-azure-doc-intelligence-key

# Azure Translator
TRANSLATE_ENDPOINT=your-azure-translator-endpoint
TRANSLATE_KEY=your-azure-translator-key

# Azure SQL Database
AZURE_SQL_CONNECTIONSTRING=your-azure-sql-connection-string
```

**What these variables are for:**

| Variable | Service | Used By |
|---|---|---|
| `CHAT_API` | Primary chat model API key | `chat.py` |
| `CHAT_API2` | Secondary / fallback chat model API key | `chat.py` |
| `CHAT_ENDPOINT` | Chat model base URL | `chat.py` |
| `MODEL_NAME` | Deployment/model name | `chat.py` |
| `SPEECH_ENDPOINT` | Azure Speech Services endpoint | `Speech.py` |
| `SPEECH_KEY` | Azure Speech Services API key | `Speech.py` |
| `DOC_ENDPOINT` | Azure Document Intelligence endpoint | `api_main.py` |
| `DOC_KEY` | Azure Document Intelligence API key | `api_main.py` |
| `TRANSLATE_ENDPOINT` | Azure Translator endpoint | `Speech.py` |
| `TRANSLATE_KEY` | Azure Translator API key | `Speech.py` |
| `AZURE_SQL_CONNECTIONSTRING` | Azure SQL Database connection string | `azure_sql.py` |

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

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/session-id` | Get the current server session ID |
| GET | `/progress/` | Get current chat context progress |
| GET | `/context/` | Get current subject & chapter context |
| POST | `/chat/` | Send a query to the AI tutor |
| POST | `/upload/` | Upload a file (PDF, image, etc.) |
| GET | `/files/{filename}` | Serve an uploaded file |
| GET | `/files/exists/{filename}` | Check if an uploaded file exists |
| POST | `/ticked-files/` | Update the list of selected context files |
| GET | `/ticked-files/` | Get the current list of selected context files |
| POST | `/speech-to-text/` | Convert microphone speech to text |
| POST | `/text-to-speech/` | Stream text-to-speech audio (MP3) |
| POST | `/translate-text/` | Translate text to a target language |
| POST | `/get-quiz-questions/` | Fetch quiz questions by subject/chapter |
| POST | `/submit-quiz/` | Submit quiz answers and update topic stats |
| POST | `/get-flashcards-data` | Generate flashcards from uploaded materials |
| POST | `/save-flashcard` | Save a flashcard to the database |
| GET | `/get-flashcards` | Retrieve saved flashcards (filter by subject/chapter) |
| DELETE | `/delete-flashcard/{flashcard_id}` | Delete a saved flashcard |
| GET | `/charts/{chart_name}` | Get a Plotly chart figure by name |
| GET | `/stats/summary` | Get aggregated topic performance stats |
| GET | `/notes` | Retrieve notes (filter by subject/chapter/date) |
| POST | `/notes` | Add a new note |
| DELETE | `/notes/{note_id}` | Delete a note |
| POST | `/quiz-history` | Save a completed quiz session |
| GET | `/quiz-history` | List all past quiz sessions |
| DELETE | `/quiz-history/{history_id}` | Delete a quiz history entry |
| POST | `/questions-by-ids` | Fetch question details by list of IDs |
| GET | `/get-all-topics/` | Get all syllabus topics |
| GET | `/get-weak-strong-topics/` | Get weak and strong topics based on performance |
| POST | `/prompt-settings/` | Save custom AI prompt settings |
| GET | `/prompt-settings/` | Get current AI prompt settings |

## Features

- **AI Chat Tutor** — Interactive chat with context-aware responses (Math, Physics, Chemistry)
- **File Upload** — Upload PDFs, images, and documents as study context
- **Document Analysis** — Extract text from PDFs via Azure Document Intelligence
- **Speech-to-Text & Text-to-Speech** — Voice input and audio responses with multi-language support (English, Hindi, Bengali, Gujarati)
- **PYQ Recommendations** — Get relevant JEE/NEET previous year questions based on your queries
- **Quiz Mode** — Auto-generated quizzes filtered by subject and topic with response history viewer
- **Flashcard Generation** — AI-generated flashcards from your uploaded study materials
- **Revision View** — Dedicated revision interface for flashcard-based study
- **Saved Flashcards** — Persist and revisit previously generated flashcard sets
- **Notes** — In-app note-taking alongside study sessions
- **Goals** — Set and track study goals
- **Calendar** — Schedule and review study sessions
- **Topic Browser** — Browse syllabus topics (JEE/NEET) to focus your study
- **Library** — Manage and browse all uploaded study materials
- **Prompt Editor** — Customize the AI tutor's system prompt
- **Analytics** — Track study activity and performance over time
- **Mental Health & Wellness** — Dedicated wellness section for student wellbeing
- **Timer** — Built-in study/quiz timer
- **Todo List** — Track your study tasks
- **Math Rendering** — LaTeX rendering with KaTeX and MathJax (supports `$...$`, `$$...$$`, `\[...\]`, `\(...\)`)
- **Markdown Formatting** — Rich text responses with code blocks, lists, tables, etc.

## Notes

- Upload study materials (PDFs, images) through the app's UI — they are stored in `backend/uploads/`.
- Ensure `.env` is configured in `backend/` before starting the backend.
- Both frontend and backend must be running simultaneously.
