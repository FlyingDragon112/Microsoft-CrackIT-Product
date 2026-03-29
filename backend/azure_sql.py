import csv
import json
from os import getenv
from dotenv import load_dotenv
from mssql_python import connect
import pandas as pd
from datetime import datetime
import random 

load_dotenv()

connection_string = getenv("AZURE_SQL_CONNECTIONSTRING")

# Connect to db
def get_conn():
    """Connect using mssql-python with built-in Microsoft Entra authentication."""
    conn = connect(connection_string)
    conn.setautocommit(True)
    return conn

# Table Reset Functions
def reset_table_data():
    """Drop and recreate the quiz_data table."""
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS quiz_data")

    cursor.execute("""
        CREATE TABLE quiz_data (
            id              INT IDENTITY(1,1) PRIMARY KEY,
            subject         NVARCHAR(255),
            chapter         NVARCHAR(255),
            topic           NVARCHAR(255),
            question        NVARCHAR(MAX),
            options         NVARCHAR(MAX),   -- stored as JSON string
            correct_option  NVARCHAR(MAX),   -- stored as JSON string
            explanation     NVARCHAR(MAX),
            paper_id        NVARCHAR(255),
            solved          INT,
            correct         INT,
            time_taken      INT,
            datetime        NVARCHAR(100)
        )
    """)
    print("Table quiz_data created successfully.")
    cursor.close()
    conn.close()


def load_csv_to_db(csv_path: str):
    """Parse CSV and insert rows into quiz_data."""
    conn = get_conn()
    cursor = conn.cursor()

    insert_sql = """
        INSERT INTO quiz_data (
            subject, chapter, topic, question, options,
            correct_option, explanation, paper_id,
            solved, correct, time_taken, datetime
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    rows_inserted = 0
    rows_failed = 0

    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for i, row in enumerate(reader, start=1):
            try:
                # options and correct_option may already be JSON strings;
                # normalise to ensure they're valid JSON
                options_raw = row.get("options", "[]")
                correct_raw = row.get("correct_option", "[]")

                # Re-serialise so we always store clean JSON
                options_json = json.dumps(json.loads(options_raw), ensure_ascii=False)
                correct_json = json.dumps(json.loads(correct_raw), ensure_ascii=False)

                cursor.execute(insert_sql, (
                    row["subject"],
                    row["chapter"],
                    row["topic"],
                    row["question"],
                    options_json,
                    correct_json,
                    row["explanation"],
                    row["paper_id"],
                    int(row["solved"] or 0),
                    int(row["correct"] or 0),
                    int(row["time_taken"] or 0),
                    row["datetime"],
                ))
                rows_inserted += 1

            except Exception as e:
                print(f"  Row {i} failed: {e}")
                rows_failed += 1

    cursor.close()
    conn.close()
    print(f"Done — {rows_inserted} inserted, {rows_failed} failed.")

# Quiz and Analytics Related Functions
def get_data_stats() -> pd.DataFrame:
    conn = get_conn()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, subject, chapter, topic, paper_id, solved, correct, time_taken, datetime FROM quiz_data")
    
    rows = cursor.fetchall()
    columns = [col[0].lower() for col in cursor.description]
    
    cursor.close()
    conn.close()
    
    return pd.DataFrame(rows, columns=columns)

def submit_quiz(result):
    now = datetime.now()

    conn = get_conn()
    cursor = conn.cursor()

    cursor.executemany("""
        UPDATE quiz_data
        SET solved = ?, correct = ?, time_taken = ?, datetime = ?
        WHERE id = ?
    """, [
        (
            1,
            1 if data["user_ans"] == data["correct_ans"][0] else 0,
            data.get("time_taken", 10),
            now.isoformat(),
            int(question_index)
        )
        for question_index, data in result.answers.items()
    ])

    cursor.close()
    conn.close()

    print(f"{len(result.answers)} rows updated")
    return {"updated": len(result.answers)}

def load_raw_attempted() -> pd.DataFrame:
    """Fetch subject + time_taken for attempted rows only — used for box plot."""
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT subject, time_taken
        FROM quiz_data
        WHERE solved = 1
    """)

    rows = cursor.fetchall()
    columns = [col[0].lower() for col in cursor.description]
    cursor.close()
    conn.close()

    return pd.DataFrame(rows, columns=columns)

def get_aggregated_stats() -> pd.DataFrame:
    """Return per-subject aggregates directly from SQL — no full table scan in Python."""
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            subject,
            COUNT(*)                                         AS total,
            SUM(solved)                                      AS attempted,
            SUM(correct)                                     AS correct,
            SUM(solved) - SUM(correct)                       AS incorrect,
            COUNT(*) - SUM(solved)                           AS unattempted,
            ROUND(
                CASE WHEN SUM(solved) > 0
                     THEN CAST(SUM(correct) AS FLOAT) / SUM(solved) * 100
                     ELSE 0 END, 1)                          AS accuracy,
            ROUND(
                AVG(CASE WHEN solved = 1
                         THEN CAST(time_taken AS FLOAT) END), 1) AS avg_time
        FROM quiz_data
        GROUP BY subject
    """)

    rows = cursor.fetchall()
    columns = [col[0].lower() for col in cursor.description]
    cursor.close()
    conn.close()

    return pd.DataFrame(rows, columns=columns)

# Notes based Functions
def make_notes_table():
    """
    Table Schema
        id      : Unique ID (auto-increment)
        subject : Subject of Note
        chapter : Chapter of Note
        date    : datetime string
        text    : notes text
    """
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS notes")

    cursor.execute("""
        CREATE TABLE notes (
            id      INT IDENTITY(1,1) PRIMARY KEY,
            subject NVARCHAR(255),
            chapter NVARCHAR(255),
            date    NVARCHAR(100),
            text    NVARCHAR(MAX)
        )
    """)

    print("Table notes created successfully.")
    cursor.close()
    conn.close()


def push_note_to_table(subject: str, chapter: str, text: str):
    """Insert a new note into the notes table."""
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO notes (subject, chapter, date, text)
        VALUES (?, ?, ?, ?)
    """, (subject, chapter, datetime.now().isoformat(), text))

    cursor.close()
    conn.close()
    print(f"Note added — subject: {subject!r}, chapter: {chapter!r}")


def get_notes_from_table(
    subject: str = None,
    chapter: str = None,
    from_date: datetime = None,
    to_date: datetime = None,
) -> pd.DataFrame:
    """
    Fetch notes, optionally filtered by subject, chapter, and/or date range.
    Returns a DataFrame with columns: id, subject, chapter, date, text.
    """
    conn = get_conn()
    cursor = conn.cursor()

    query = "SELECT id, subject, chapter, date, text FROM notes WHERE 1=1"
    params = []

    if subject:
        query += " AND subject = ?"
        params.append(subject)
    if chapter:
        query += " AND chapter = ?"
        params.append(chapter)
    if from_date:
        query += " AND date >= ?"
        params.append(from_date.isoformat())
    if to_date:
        query += " AND date <= ?"
        params.append(to_date.isoformat())

    query += " ORDER BY id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    columns = [col[0].lower() for col in cursor.description]

    cursor.close()
    conn.close()

    return pd.DataFrame(rows, columns=columns)


def pop_note_from_table(note_id: int) -> bool:
    """
    Delete a note by its ID.
    Returns True if a row was deleted, False if the ID was not found.
    """
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    deleted = cursor.rowcount 

    cursor.close()
    conn.close()

    if deleted:
        print(f"Note {note_id} deleted.")
    else:
        print(f"Note {note_id} not found.")

    return deleted > 0

def get_quiz_questions(num_ques: int, subjects: list[str] = None, chapters: list[str] = None) -> list[dict]:
    if not subjects:
        subjects = ['physics', 'chemistry', 'maths']

    subjects_lower = [s.lower() for s in subjects]
    num_subjects = len(subjects_lower)
    base_per_subject = num_ques // num_subjects
    remainder = num_ques % num_subjects

    conn = get_conn()
    cursor = conn.cursor()

    chapter_filter = ""
    chapter_params = []
    if chapters:
        chapter_placeholders = ', '.join('?' for _ in chapters)
        chapter_filter = f"AND LOWER(chapter) IN ({chapter_placeholders})"
        chapter_params = [c.lower() for c in chapters]

    all_rows = []

    for i, subject in enumerate(subjects_lower):
        n = base_per_subject + (1 if i < remainder else 0)

        cursor.execute(f"""
            SELECT TOP (?)
                id, subject, chapter, topic, question,
                options, correct_option, explanation, paper_id
            FROM quiz_data
            WHERE LOWER(subject) = ?
            AND solved = 0
            {chapter_filter}
            ORDER BY NEWID()
        """, [n, subject] + chapter_params)
        all_rows.extend(cursor.fetchall())

    cursor.close()
    conn.close()

    # Shuffle the combined results
    random.shuffle(all_rows)

    questions = []
    for row in all_rows:
        id_, subject, chapter, topic, question, options_raw, correct_raw, explanation, paper_id = row

        try:
            options = json.loads(options_raw) if isinstance(options_raw, str) else []
        except Exception:
            options = []

        options_map = {}
        if isinstance(options, list):
            for opt in options:
                if isinstance(opt, dict):
                    identifier = opt.get("identifier", "").upper()
                    options_map[f"option{identifier}"] = opt.get("content", "")

        try:
            correct = json.loads(correct_raw) if isinstance(correct_raw, str) else correct_raw
        except Exception:
            correct = correct_raw

        questions.append({
            "question_index": id_,
            "subject":        subject,
            "chapter":        chapter or "",
            "topic":          topic or "",
            "question":       question,
            "optionA":        options_map.get("optionA", ""),
            "optionB":        options_map.get("optionB", ""),
            "optionC":        options_map.get("optionC", ""),
            "optionD":        options_map.get("optionD", ""),
            "correct_option": correct,
            "explanation":    explanation or "",
            "paper_id":       paper_id or "",
        })

    return questions

def make_quiz_history_table():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS quiz_history")
    cursor.execute("""
        CREATE TABLE quiz_history (
            id              INT IDENTITY(1,1) PRIMARY KEY,
            subject         NVARCHAR(255),
            chapter         NVARCHAR(255),
            date            NVARCHAR(100),
            score           INT,
            total_questions INT,
            question_ids    NVARCHAR(MAX),
            submitted_ans   NVARCHAR(MAX),
            correct_ans     NVARCHAR(MAX),
            time_taken      NVARCHAR(MAX)
        )
    """)
    cursor.close()
    conn.close()


def push_quiz_history(
    subject, chapter, score, total_questions,
    question_ids, submitted_ans, correct_ans, time_taken
):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO quiz_history
            (subject, chapter, date, score, total_questions,
             question_ids, submitted_ans, correct_ans, time_taken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        json.dumps(subject),
        json.dumps(chapter),
        datetime.now().isoformat(),
        score,
        total_questions,
        json.dumps(question_ids),
        json.dumps(submitted_ans),
        json.dumps(correct_ans),
        json.dumps(time_taken),
    ))
    cursor.close()
    conn.close()


def get_quiz_history():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, subject, chapter, date, score, total_questions,
               question_ids, submitted_ans, correct_ans, time_taken
        FROM quiz_history ORDER BY id DESC
    """)
    rows = cursor.fetchall()
    columns = [col[0].lower() for col in cursor.description]
    cursor.close()
    conn.close()
    df = pd.DataFrame(rows, columns=columns)
    if not df.empty:
        for col in ["subject","chapter","question_ids","submitted_ans","correct_ans","time_taken"]:
            df[col] = df[col].apply(lambda x: json.loads(x) if x else [])
    return df

def pop_quiz_history(history_id: int) -> bool:
    """Delete a quiz history record by ID."""
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM quiz_history WHERE id = ?", (history_id,))
    deleted = cursor.rowcount

    cursor.close()
    conn.close()

    return deleted > 0

def get_questions_by_ids(question_ids: list[int]) -> list[dict]:
    conn = get_conn()
    cursor = conn.cursor()
    placeholders = ', '.join('?' for _ in question_ids)
    cursor.execute(f"""
        SELECT id, subject, chapter, topic, question, options,
               correct_option, explanation, paper_id
        FROM quiz_data WHERE id IN ({placeholders})
    """, question_ids)
    rows = cursor.fetchall()
    columns = [col[0].lower() for col in cursor.description]
    cursor.close()
    conn.close()
    df = pd.DataFrame(rows, columns=columns)
    if df.empty:
        return []
    questions = []
    for _, row in df.iterrows():
        try:
            options = json.loads(row["options"]) if isinstance(row["options"], str) else []
        except Exception:
            options = []
        options_map = {}
        if isinstance(options, list):
            for opt in options:
                if isinstance(opt, dict):
                    identifier = opt.get("identifier", "").upper()
                    options_map[f"option{identifier}"] = opt.get("content", "")
        try:
            correct = json.loads(row["correct_option"]) if isinstance(row["correct_option"], str) else row["correct_option"]
        except Exception:
            correct = row["correct_option"]
        questions.append({
            "question_index": row["id"],
            "subject": row["subject"],
            "chapter": row.get("chapter", ""),
            "topic": row.get("topic", ""),
            "question": row["question"],
            "optionA": options_map.get("optionA", ""),
            "optionB": options_map.get("optionB", ""),
            "optionC": options_map.get("optionC", ""),
            "optionD": options_map.get("optionD", ""),
            "correct_option": correct,
            "explanation": row.get("explanation", ""),
            "paper_id": row.get("paper_id", ""),
        })
    return questions

def make_flashcards_table():
    """
    Table Schema
        id      : Unique ID (auto-increment)
        subject : Subject of Flashcard
        chapter : Chapter of Flashcard
        front   : Front text of Flashcard (question/term)
        back    : Back text of Flashcard (answer/definition)
    """
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS flashcard_history")

    cursor.execute("""
        CREATE TABLE flashcard_history (
            id      INT IDENTITY(1,1) PRIMARY KEY,
            subject NVARCHAR(255),
            chapter NVARCHAR(255),
            front   NVARCHAR(MAX),
            back    NVARCHAR(MAX)
        )
    """)

    print("Table flashcard_history created successfully.")
    cursor.close()
    conn.close()


def push_flashcard_to_table(subject: str, chapter: str, front: str, back: str):
    """Insert a new flashcard into the flashcard_history table."""
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO flashcard_history (subject, chapter, front, back)
        VALUES (?, ?, ?, ?)
    """, (subject, chapter, front, back))

    cursor.close()
    conn.close()
    print(f"Flashcard added — subject: {subject!r}, chapter: {chapter!r}")


def get_flashcards_from_table(
    subject: str = None,
    chapter: str = None,
) -> pd.DataFrame:
    """
    Fetch flashcards, optionally filtered by subject and/or chapter.
    Returns a DataFrame with columns: id, subject, chapter, front, back.
    """
    conn = get_conn()
    cursor = conn.cursor()

    query = "SELECT id, subject, chapter, front, back FROM flashcard_history WHERE 1=1"
    params = []

    if subject:
        query += " AND subject = ?"
        params.append(subject)
    if chapter:
        query += " AND chapter = ?"
        params.append(chapter)

    query += " ORDER BY id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    columns = [col[0].lower() for col in cursor.description]

    cursor.close()
    conn.close()

    return pd.DataFrame(rows, columns=columns)


def pop_flashcard_from_table(flashcard_id: int) -> bool:
    """
    Delete a flashcard by its ID.
    Returns True if a row was deleted, False if the ID was not found.
    """
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM flashcard_history WHERE id = ?", (flashcard_id,))
    deleted = cursor.rowcount

    cursor.close()
    conn.close()

    if deleted:
        print(f"Flashcard {flashcard_id} deleted.")
    else:
        print(f"Flashcard {flashcard_id} not found.")

    return deleted > 0

def make_topics_table():
    """
    Table Schema
        id      : Unique ID (auto-increment)
        subject : Subject name (chemistry / maths / physics)
        chapter : Chapter name
        topic   : Topic name
        studied : Whether the topic has been studied (default False)
        quiz    : Whether the quiz has been attempted (default False)
    """
    conn = get_conn()
    cursor = conn.cursor()
 
    cursor.execute("DROP TABLE IF EXISTS topics")
 
    cursor.execute("""
        CREATE TABLE topics (
            id      INT IDENTITY(1,1) PRIMARY KEY,
            subject NVARCHAR(255),
            chapter NVARCHAR(255),
            topic   NVARCHAR(255),
            studied BIT DEFAULT 0,
            quiz    BIT DEFAULT 0
        )
    """)
 
    print("Table topics created successfully.")
    cursor.close()
    conn.close()

def insert_topics(json_file: str):
    """
    Reads the JSON file and inserts all subject → chapter → topic
    rows into the topics table.
    """
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)
 
    rows = []
    for subject, chapters in data.items():
        for chapter, topics in chapters.items():
            for topic in topics:
                rows.append((subject, chapter, topic, False, False))
 
    conn = get_conn()
    cursor = conn.cursor()
 
    cursor.executemany(
        """
        INSERT INTO topics (subject, chapter, topic, studied, quiz)
        VALUES (?, ?, ?, ?, ?)
        """,
        rows
    )
 
    conn.commit()
    print(f"{len(rows)} rows inserted into topics successfully.")
    cursor.close()
    conn.close()

def update_topic(chapter: str, topic: str, studied: bool = None, quiz: bool = None):
    """
    Updates the studied and/or quiz status of a topic.

    Args:
        chapter : Chapter name of the topic
        topic   : Topic name to update
        studied : Set True/False to update studied status (None = no change)
        quiz    : Set True/False to update quiz status    (None = no change)

    """
    if studied is None and quiz is None:
        print("Nothing to update. Pass at least one of: studied=, quiz=")
        return

    fields = []
    values = []

    if studied is not None:
        fields.append("studied = ?")
        values.append(studied)

    if quiz is not None:
        fields.append("quiz = ?")
        values.append(quiz)

    values.extend([chapter, topic])

    query = f"""
        UPDATE topics
        SET    {', '.join(fields)}
        WHERE  chapter = ?
        AND    topic   = ?
    """

    conn   = get_conn()
    cursor = conn.cursor()

    cursor.execute(query, values)
    conn.commit()

    if cursor.rowcount == 0:
        print(f"No matching topic found: chapter='{chapter}', topic='{topic}'")
    else:
        print(f"Updated '{topic}' in '{chapter}' — " +
              (f"studied={studied} " if studied is not None else "") +
              (f"quiz={quiz}"        if quiz    is not None else ""))

    cursor.close()
    conn.close()

def update_topic_stats(chapter: str, topic: str, is_correct: bool):
    """
    Increment total attempts for the given chapter/topic.
    Increment correct attempts if is_correct is True.
    """
    conn = get_conn()
    cursor = conn.cursor()

    if is_correct:
        cursor.execute("""
            UPDATE topics
            SET total = ISNULL(total, 0) + 1, correct = ISNULL(correct, 0) + 1
            WHERE chapter = ? AND topic = ?
        """, (chapter, topic))
    else:
        cursor.execute("""
            UPDATE topics
            SET total = ISNULL(total, 0) + 1
            WHERE chapter = ? AND topic = ?
        """, (chapter, topic))

    conn.commit()
    cursor.close()
    conn.close()

def get_all_topics():
    """
    Fetches all topics from the topics table.
    """
    conn   = get_conn()
    cursor = conn.cursor()
 
    cursor.execute("""
        SELECT subject, chapter, topic, studied, quiz
        FROM   topics
        ORDER  BY subject, chapter, topic
    """)
 
    columns = [col[0] for col in cursor.description]
    rows    = [dict(zip(columns, row)) for row in cursor.fetchall()]
 
    cursor.close()
    conn.close()
 
    return rows

def get_weak_and_strong_topics():
    """
    Fetches top 3 strong and top 3 weak topics based on quiz performance.
    Strong: correct/total > 0.50
    Weak:   correct/total <= 0.50
    """
    conn   = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT subject, chapter, topic, studied, quiz, correct, total,
            ROUND(CAST(correct AS FLOAT) / CAST(total AS FLOAT), 2) AS ratio
        FROM   topics
        WHERE  total > 0
        ORDER  BY ratio DESC
    """)
    columns = [col[0] for col in cursor.description]
    rows    = [dict(zip(columns, row)) for row in cursor.fetchall()]

    cursor.close()
    conn.close()

    strong = [row for row in rows if row["ratio"] is not None and float(row["ratio"]) > 0.50][:3]
    weak   = sorted(
                [row for row in rows if row["ratio"] is not None and float(row["ratio"]) <= 0.50],
                key=lambda x: float(x["ratio"])
            )[:3]

    return {"strong": strong, "weak": weak}