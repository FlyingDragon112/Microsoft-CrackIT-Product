// ─── Quiz.jsx ───────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { MathJax } from "better-react-mathjax";
import DOMPurify from "dompurify";
import SYLLABUS from "./syllabus.json";
import "./Quiz.css";

const sanitize = (text) =>
  DOMPurify.sanitize(text || "", { ADD_TAGS: ["style"], FORCE_BODY: true });

const MathText = memo(({ text }) => {
  if (!text) return null;
  return (
    <MathJax dynamic inline>
      <span
        style={{ display: "inline" }}
        dangerouslySetInnerHTML={{ __html: sanitize(text) }}
      />
    </MathJax>
  );
});

const slugToLabel = (slug) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const SUBJECT_OPTIONS = ["Chemistry", "Physics", "Maths"];
const NUM_QUESTIONS_OPTIONS = [10, 20, 30];
const TIME_LIMIT_OPTIONS = [
  { label: "10m", value: 10 },
  { label: "15m", value: 15 },
  { label: "20m", value: 20 },
  { label: "25m", value: 25 },
  { label: "30m", value: 30 },
];
const OPTION_LABELS = ["A", "B", "C", "D"];

// ─── Translation constants ───────────────────────────────────────────────────
const TTS_LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "bn-IN", label: "বাংলা" },
  { code: "gu-IN", label: "ગુજરાતી" },
];

const TTS_TO_TRANSLATOR_CODE = {
  "en-US": "en",
  "hi-IN": "hi",
  "bn-IN": "bn",
  "gu-IN": "gu",
};

// ─── useTranslation hook ─────────────────────────────────────────────────────
// translationMap shape: { [questionId]: { language, translatedFields, loading } }
function useTranslation() {
  const [translationMap, setTranslationMap] = useState({});

  const handleLanguageChange = useCallback(async (questionId, question, newTtsCode) => {
    const translatorCode = TTS_TO_TRANSLATOR_CODE[newTtsCode] || "en";

    // Show loading immediately
    setTranslationMap((prev) => ({
      ...prev,
      [questionId]: {
        language: newTtsCode,
        translatedFields: prev[questionId]?.translatedFields ?? null,
        loading: true,
      },
    }));

    // English — revert to original, no API call
    if (translatorCode === "en") {
      setTranslationMap((prev) => ({
        ...prev,
        [questionId]: { language: newTtsCode, translatedFields: null, loading: false },
      }));
      return;
    }

    // Batch all translatable fields into one API call using a safe delimiter
    const combined = [
      question.question,
      question.optionA,
      question.optionB,
      question.optionC,
      question.optionD,
      question.explanation,
    ].join("\n||||\n");

    try {
      const res = await fetch("/api/translate-text/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combined, to_language: translatorCode }),
      });
      const data = await res.json();
      const parts = (data.translated_text ?? combined).split("\n||||\n");

      setTranslationMap((prev) => ({
        ...prev,
        [questionId]: {
          language: newTtsCode,
          loading: false,
          translatedFields: {
            question:    parts[0] ?? question.question,
            optionA:     parts[1] ?? question.optionA,
            optionB:     parts[2] ?? question.optionB,
            optionC:     parts[3] ?? question.optionC,
            optionD:     parts[4] ?? question.optionD,
            explanation: parts[5] ?? question.explanation,
          },
        },
      }));
    } catch {
      // Fallback: revert to original on error
      setTranslationMap((prev) => ({
        ...prev,
        [questionId]: { language: newTtsCode, translatedFields: null, loading: false },
      }));
    }
  }, []);

  // Get a specific field for a question (translated or original)
  const getField = useCallback(
    (questionId, question, field) =>
      translationMap[questionId]?.translatedFields?.[field] ?? question[field],
    [translationMap]
  );

  const getLanguage = useCallback(
    (questionId) => translationMap[questionId]?.language ?? "en-US",
    [translationMap]
  );

  const isTranslating = useCallback(
    (questionId) => translationMap[questionId]?.loading === true,
    [translationMap]
  );

  return { handleLanguageChange, getField, getLanguage, isTranslating };
}

// ─── PillSelector ────────────────────────────────────────────────────────────
function PillSelector({ options, selected, onToggle, multi = true }) {
  return (
    <div className="qs-pill-row">
      {options.map((opt) => {
        const val   = typeof opt === "object" ? opt.value : opt;
        const label = typeof opt === "object" ? opt.label : opt;
        const active = multi ? selected.includes(val) : selected === val;
        return (
          <button
            key={label}
            onClick={() => onToggle(val)}
            className={`qs-pill${active ? " qs-pill--active" : ""}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── ChapterTag ──────────────────────────────────────────────────────────────
function ChapterTag({ label, onRemove }) {
  return (
    <span className="qs-chapter-tag">
      {label}
      <button className="qs-chapter-tag__remove" onClick={onRemove}>×</button>
    </span>
  );
}

// ─── SegmentedSelector ───────────────────────────────────────────────────────
function SegmentedSelector({ options, selected, onSelect }) {
  return (
    <div className="qs-seg">
      {options.map((opt) => {
        const val    = typeof opt === "object" ? opt.value : opt;
        const label  = typeof opt === "object" ? opt.label : String(opt);
        const active = selected === val;
        return (
          <button
            key={label}
            onClick={() => onSelect(val)}
            className={`qs-seg__btn${active ? " qs-seg__btn--active" : ""}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const capitalizeWords = (str) =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());

// ─── LeftSidebar ─────────────────────────────────────────────────────────────
function LeftSidebar({ subject, chapter }) {
  return (
    <div className="qs-sidebar qs-sidebar--left">
      <div className="qs-sidebar__header">
        <div className="qs-sidebar__title">Study Details</div>
        <div className="qs-sidebar__sub">Current Context</div>
      </div>
      <div className="qs-sidebar__details">
        <div className="qs-sidebar__detail-group">
          <div className="qs-sidebar__detail-label">CURRENT TOPIC</div>
          <div className="qs-sidebar__detail-value">{subject ? capitalizeWords(subject) : "—"}</div>
        </div>
        <div className="qs-sidebar__detail-group">
          <div className="qs-sidebar__detail-label">CHAPTER</div>
          <div className="qs-sidebar__detail-value">{chapter ? capitalizeWords(chapter) : "All Chapters"}</div>
        </div>
      </div>
      <div className="qs-sidebar__spacer">
        <div className="qs-protip">
          <div className="qs-protip__label">Pro Tip</div>
          <div className="qs-protip__text">
            Standard potentials are measured at 298K and 1M concentration.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RightSidebar ────────────────────────────────────────────────────────────
function RightSidebar({ timeLeft, totalQuestions, currentIndex, answers, markedForReview, onFinish, started }) {
  return (
    <div className="qs-sidebar qs-sidebar--right">
      <div className="qs-sidebar__header">
        <div className="qs-sidebar__title">Productivity</div>
        <div className="qs-sidebar__sub">Deep Work Zone</div>
      </div>

      <div className="qs-timer-card">
        <div className="qs-timer-card__label">
          {started ? "Quiz Time Left" : "Timer"}
        </div>
        <div className="qs-timer-card__value">
          {started && timeLeft !== null ? formatTime(timeLeft) : "∞"}
        </div>
      </div>

      {started && totalQuestions > 0 && (
        <div className="qs-qmap">
          <div className="qs-qmap__heading">Question Map</div>
          <div className="qs-qmap__grid">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const isCurrent  = i === currentIndex;
              const isAnswered = answers[i] !== undefined && answers[i] !== null;
              const isMarked   = markedForReview?.includes(i);
              let cls = "qs-qmap__cell";
              if (isCurrent)       cls += " qs-qmap__cell--current";
              else if (isMarked)   cls += " qs-qmap__cell--marked";
              else if (isAnswered) cls += " qs-qmap__cell--answered";
              return <div key={i} className={cls}>{i + 1}</div>;
            })}
          </div>
          <div className="qs-qmap__legend">
            {[
              { mod: "current",   label: "Current"    },
              { mod: "answered",  label: "Answered"   },
              { mod: "marked",    label: "Marked"     },
              { mod: "",          label: "Unanswered" },
            ].map(({ mod, label }) => (
              <div key={label} className="qs-qmap__legend-item">
                <div className={`qs-qmap__legend-swatch qs-qmap__cell${mod ? ` qs-qmap__cell--${mod}` : ""}`} />
                <span className="qs-qmap__legend-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="qs-sidebar__spacer">
        <button className="qs-finish-btn" onClick={onFinish}>
          Finish Session
        </button>
      </div>
    </div>
  );
}

// ─── ChapterSearch ───────────────────────────────────────────────────────────
function ChapterSearch({ availableChapters, selectedChapters, onAdd, onRemove }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = availableChapters.filter(
    (c) => !selectedChapters.includes(c) && c.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="qs-chapter-search">
      <div className="qs-chapter-search__input-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#566167" strokeWidth="2"/>
          <path d="M16.5 16.5L21 21" stroke="#566167" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          className="qs-chapter-search__input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search chapters (e.g., Quantum Mechanics)"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="qs-chapter-search__dropdown">
          {filtered.slice(0, 12).map((ch) => (
            <div
              key={ch}
              className="qs-chapter-search__option"
              onClick={() => { onAdd(ch); setQuery(""); setOpen(false); }}
            >
              {slugToLabel(ch)}
            </div>
          ))}
        </div>
      )}

      {selectedChapters.length > 0 && (
        <div className="qs-chapter-tags">
          {selectedChapters.map((ch) => (
            <ChapterTag key={ch} label={slugToLabel(ch)} onRemove={() => onRemove(ch)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QuizSetup ───────────────────────────────────────────────────────────────
function QuizSetup({ onStart, defaultSubjects = [], defaultChapters = [] }) {
  const [subjects,  setSubjects]  = useState(defaultSubjects.length > 0 ? defaultSubjects : ["Chemistry"]);
  const [chapters,  setChapters]  = useState(defaultChapters);
  const [numQ,      setNumQ]      = useState(20);
  const [timeLimit, setTimeLimit] = useState(15);

  const defaultSubjectsKey = defaultSubjects.join(",");
  const defaultChaptersKey = defaultChapters.join(",");

  useEffect(() => {
    if (defaultSubjects.length > 0) {
      const normalized = defaultSubjects.map((s) =>
        SUBJECT_OPTIONS.find((o) => o.toLowerCase() === s.toLowerCase()) || s
      );
      setSubjects(normalized);
    }
  }, [defaultSubjectsKey, defaultSubjects]);

  useEffect(() => {
    if (defaultChapters.length > 0) setChapters(defaultChapters);
  }, [defaultChaptersKey, defaultChapters]);

  const availableChapters = subjects.flatMap(
    (s) => SYLLABUS[s.toLowerCase()]?.Chapter || []
  );

  const toggleSubject = (s) =>
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const addChapter    = (c) => setChapters((prev) => [...prev, c]);
  const removeChapter = (c) => setChapters((prev) => prev.filter((x) => x !== c));

  const disabled = subjects.length === 0;

  return (
    <div className="qs-setup">
      <img
        src={`${process.env.PUBLIC_URL}/image.png`}
        alt="Quiz"
        className="qs-setup__hero"
        onError={(e) => { e.target.style.display = "none"; }}
      />
      <div className="qs-setup__heading-group">
        <h1 className="qs-setup__title">Start Your Practice Quiz</h1>
        <p className="qs-setup__sub">Select your focus areas and challenge yourself.</p>
      </div>

      <div className="qs-setup__card">
        <div className="qs-setup__section">
          <div className="qs-setup__section-label">Choose Subjects</div>
          <PillSelector options={SUBJECT_OPTIONS} selected={subjects} onToggle={toggleSubject} multi={true} />
        </div>

        <div className="qs-setup__section">
          <div className="qs-setup__section-label">Select Chapters</div>
          <ChapterSearch
            availableChapters={availableChapters}
            selectedChapters={chapters}
            onAdd={addChapter}
            onRemove={removeChapter}
          />
        </div>

        <div className="qs-setup__section">
          <div className="qs-setup__section-label">Number of Questions</div>
          <SegmentedSelector
            options={NUM_QUESTIONS_OPTIONS}
            selected={numQ}
            onSelect={(v) => setNumQ(v)}
          />
        </div>

        <div className="qs-setup__section">
          <div className="qs-setup__section-label">Time Limit</div>
          <SegmentedSelector
            options={TIME_LIMIT_OPTIONS}
            selected={timeLimit}
            onSelect={setTimeLimit}
          />
        </div>

        <button
          disabled={disabled}
          onClick={() => onStart({ subjects, chapters, numQuestions: typeof numQ === "number" ? numQ : 20, timeLimit })}
          className={`qs-setup__start-btn${disabled ? " qs-setup__start-btn--disabled" : ""}`}
        >
          Start Quiz
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#F7F9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── QuestionScreen ──────────────────────────────────────────────────────────
function QuestionScreen({
  question, questionIndex, totalQuestions,
  selected, onSelect, onPrevious, onMarkForReview, onSaveNext,
  isMarked, isFirst, isLast,
  // Translation props
  onLanguageChange, getField, getLanguage, isTranslating,
}) {
  const tid         = question.question_index;
  const translating = isTranslating(tid);
  const language    = getLanguage(tid);

  // Helper: get translated field and wrap in MathText
  const T = (field) => <MathText text={getField(tid, question, field)} />;

  const opts = ["optionA", "optionB", "optionC", "optionD"];
  const pct  = (questionIndex / totalQuestions) * 100;

  return (
    <div className="qs-question-screen">
      <div className="qs-topbar">
        <div className="qs-topbar__left">
          <div className="qs-topbar__counter">
            QUESTION {questionIndex + 1}/{totalQuestions}
          </div>
          <div className="qs-progress-track">
            <div className="qs-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* ── Language selector ── */}
        <select
          className="qs-lang-select"
          value={language}
          onChange={(e) => onLanguageChange(tid, question, e.target.value)}
          disabled={translating}
          title="Select Language"
        >
          {TTS_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </div>

      <div className="qs-qcard">
        <div className="qs-qcard__body">
          <div className="qs-qcard__text-row">
            <div className="qs-qcard__text">
              {translating
                ? <span className="qs-translating-indicator">Translating…</span>
                : T("question")
              }
            </div>
            <div className="qs-qcard__actions">
              <button
                onClick={onMarkForReview}
                className={`qs-icon-btn${isMarked ? " qs-icon-btn--marked" : ""}`}
                title="Mark for review"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isMarked ? "#F59E0B" : "none"}>
                  <path d="M5 3h14v18l-7-4-7 4V3z" stroke={isMarked ? "#F59E0B" : "#94A3B8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="qs-icon-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="4" y1="22" x2="4" y2="15" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {question.hint && (
            <div className="qs-qcard__hint">
              <MathText text={question.hint} />
            </div>
          )}

          <div className="qs-options">
            {opts.map((optField, idx) => {
              const isSelected = selected === idx;
              return (
                <div
                  key={idx}
                  onClick={() => !translating && onSelect(idx)}
                  className={`qs-option${isSelected ? " qs-option--selected" : ""}${translating ? " qs-option--disabled" : ""}`}
                >
                  <div className={`qs-option__badge${isSelected ? " qs-option__badge--selected" : ""}`}>
                    {OPTION_LABELS[idx]}
                  </div>
                  <div className={`qs-option__text${isSelected ? " qs-option__text--selected" : ""}`}>
                    {translating
                      ? <span className="qs-translating-placeholder">…</span>
                      : T(optField)
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {question.paper_id && (
          <div className="qs-qcard__paper-id">
            {question.paper_id}
          </div>
        )}

        <div className="qs-qcard__footer">
          <button
            onClick={onPrevious}
            disabled={isFirst}
            className={`qs-btn qs-btn--outline${isFirst ? " qs-btn--disabled" : ""}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            PREVIOUS
          </button>
          <div className="qs-qcard__footer-right">
            <button
              onClick={onMarkForReview}
              className={`qs-btn qs-btn--outline${isMarked ? " qs-btn--marked" : ""}`}
            >
              {isMarked ? "✓ MARKED" : "MARK FOR REVIEW"}
            </button>
            <button onClick={onSaveNext} className="qs-btn qs-btn--primary">
              {isLast ? "FINISH QUIZ" : "SAVE & NEXT"}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="#F7F9FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ReviewCard ──────────────────────────────────────────────────────────────
function ReviewCard({ question, index, userAnswer, correctAnswer, isCorrect, timeTaken }) {
  return (
    <div className={`qs-review-card${isCorrect ? " qs-review-card--correct" : " qs-review-card--incorrect"}`}>
      <div className="qs-review-card__header">
        <div className="qs-review-card__num">
          Question {String(index + 1).padStart(2, "0")}
        </div>
        <div className={`qs-review-card__badge${isCorrect ? " qs-review-card__badge--correct" : " qs-review-card__badge--incorrect"}`}>
          {isCorrect ? `Correct • ${timeTaken}s` : `Incorrect • ${timeTaken}s`}
        </div>
      </div>

      <div className="qs-review-card__question">
        <MathText text={question.question} />
      </div>

      <div className="qs-review-card__answers">
        <div className={`qs-answer-pill${isCorrect ? " qs-answer-pill--user-correct" : " qs-answer-pill--user-wrong"}`}>
          <div className="qs-answer-pill__inner">
            <div className={`qs-answer-pill__label${isCorrect ? " qs-answer-pill__label--correct" : " qs-answer-pill__label--wrong"}`}>
              Your Answer
            </div>
            <div className="qs-answer-pill__value">
              <MathText text={userAnswer || "Not answered"} />
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {isCorrect
              ? <path d="M20 6L9 17l-5-5" stroke="#006E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M18 6L6 18M6 6l12 12" stroke="#A83836" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </div>

        <div className={`qs-answer-pill qs-answer-pill--correct-ans${isCorrect ? " qs-answer-pill--dimmed" : ""}`}>
          <div className="qs-answer-pill__inner">
            <div className="qs-answer-pill__label qs-answer-pill__label--correct-ans">
              Correct Answer
            </div>
            <div className="qs-answer-pill__value">
              <MathText text={correctAnswer} />
            </div>
          </div>
          {!isCorrect && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#006E3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {question.solution && (
        <div className="qs-solution">
          <div className="qs-solution__heading">
            <svg width="10" height="13" viewBox="0 0 10 13" fill="none">
              <path d="M5 0L9.33 6.5H0.67L5 0Z" fill="#00639E"/>
              <rect x="3.5" y="7.5" width="3" height="5.5" fill="#00639E"/>
            </svg>
            <span>Solution</span>
          </div>
          <div className="qs-solution__text">
            <MathText text={question.solution} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ResultsScreen ───────────────────────────────────────────────────────────
function ResultsScreen({ score, total, answers, questions, quizConfig, onReset, onGoToRevision }) {
  const pct       = total > 0 ? Math.round((score / total) * 100) : 0;
  const incorrect = total - score;
  const [filter, setFilter] = useState("all");

  const subjectLabel = quizConfig?.subjects?.join(", ") || "Quiz";
  const chapterLabel = quizConfig?.chapters?.length > 0
    ? quizConfig.chapters.map(slugToLabel).join(", ")
    : "All Chapters";

  const perfLabel = pct >= 80 ? "Excellent Performance!" : pct >= 60 ? "Good Job!" : "Keep Practising!";
  const perfSub   = pct >= 80 ? "You are in the top 5% of students today." : pct >= 60 ? "You're making great progress." : "Review the solutions below.";
  const ringColor = pct >= 80 ? "#006E3D" : pct >= 60 ? "#00639E" : "#A83836";
  const perfColor = pct >= 80 ? "#006E3D" : pct >= 60 ? "#00639E" : "#A83836";

  const R   = 80;
  const C   = 2 * Math.PI * R;
  const arc = (pct / 100) * C;

  const timeTakenValues = Object.values(answers)
    .map((a) => a?.time_taken)
    .filter((t) => typeof t === "number");
  const avgTime = timeTakenValues.length > 0
    ? Math.round(timeTakenValues.reduce((a, b) => a + b, 0) / timeTakenValues.length)
    : 0;

  const filteredQuestions = questions.filter((q) => {
    const ans     = answers[q.question_index];
    const correct = !!(ans?.user_ans && ans.user_ans === ans.correct_ans);
    if (filter === "correct")   return correct;
    if (filter === "incorrect") return !correct;
    return true;
  });

  return (
    <div className="qs-results">
      <div className="qs-results__heading">
        <div className="qs-results__heading-row">
          <div>
            <h1 className="qs-results__title">Quiz Results</h1>
            <p className="qs-results__sub">
              Detailed analysis of your {subjectLabel}: {chapterLabel} performance.
            </p>
          </div>
          <button className="qs-revision-btn" onClick={onGoToRevision}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor"/>
            </svg>
            Go To Revision
          </button>
        </div>
      </div>

      <div className="qs-results__summary">
        <div className="qs-donut-card">
          <svg width="160" height="160" viewBox="0 0 192 192">
            <circle cx="96" cy="96" r={R} fill="none" stroke="#C2CDD6" strokeWidth="12"/>
            <circle
              cx="96" cy="96" r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="12"
              strokeDasharray={`${arc} ${C}`}
              strokeDashoffset={C / 4}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s ease" }}
            />
            <text x="96" y="88" textAnchor="middle" dominantBaseline="central"
              style={{ fill: "#2A343A", fontSize: 40, fontFamily: "Inter, sans-serif", fontWeight: 800 }}>
              {pct}%
            </text>
            <text x="96" y="118" textAnchor="middle"
              style={{ fill: "#566167", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: 1.2 }}>
              ACCURACY
            </text>
          </svg>
          <div className="qs-donut-card__perf">
            <div className="qs-donut-card__perf-title" style={{ color: perfColor }}>{perfLabel}</div>
            <div className="qs-donut-card__perf-sub">{perfSub}</div>
          </div>
        </div>

        <div className="qs-stat-cards">
          {[
            { label: "Correct Answers", value: String(score).padStart(2,"0"),     unit: `/ ${total}`, colorCls: "qs-stat__val--green"  },
            { label: "Incorrect",       value: String(incorrect).padStart(2,"0"), unit: `/ ${total}`, colorCls: "qs-stat__val--red"    },
            { label: "Avg Time per Q",  value: `${avgTime}s`, unit: "Target: 60s", colorCls: "qs-stat__val--blue",  unitSmall: true },
            { label: "Best Streak",     value: "14",  unit: "Questions",   colorCls: "qs-stat__val--blue2", unitSmall: true },
          ].map(({ label, value, unit, colorCls, unitSmall }) => (
            <div key={label} className="qs-stat-card">
              <div className="qs-stat__label">{label}</div>
              <div className="qs-stat__row">
                <span className={`qs-stat__val ${colorCls}`}>{value}</span>
                <span className={`qs-stat__unit${unitSmall ? " qs-stat__unit--small" : ""}`}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="qs-results__review">
        <div className="qs-results__review-header">
          <h2 className="qs-results__review-title">Review Answers</h2>
          <div className="qs-results__filter-pills">
            {[
              { key: "correct",   label: `Correct (${score})`,      mod: "green" },
              { key: "incorrect", label: `Incorrect (${incorrect})`, mod: "red"   },
            ].map(({ key, label, mod }) => (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                className={`qs-filter-pill qs-filter-pill--${mod}${filter === key ? " qs-filter-pill--active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredQuestions.map((q) => {
          const origIndex = questions.indexOf(q);
          const ans       = answers[q.question_index];
          const isCorrect = !!(ans?.user_ans && ans.user_ans === ans.correct_ans);
          const optMap    = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
          return (
            <ReviewCard
              key={q.question_index}
              question={q}
              index={origIndex}
              userAnswer={ans?.user_ans    ? optMap[ans.user_ans]    : null}
              correctAnswer={ans?.correct_ans ? optMap[ans.correct_ans] : null}
              isCorrect={isCorrect}
              timeTaken={ans?.time_taken ?? 0}
            />
          );
        })}
      </div>

      <div className="qs-results__cta">
        <button className="qs-btn qs-btn--primary qs-btn--lg" onClick={onReset}>
          Start Next Module
        </button>
      </div>
    </div>
  );
}

// ─── Main Quiz component ──────────────────────────────────────────────────────
const Quiz = ({ details = [], onModeChange = () => {} }) => {
  const [phase,           setPhase]           = useState("setup");
  const [quizConfig,      setQuizConfig]      = useState(null);
  const [questions,       setQuestions]       = useState([]);
  const [error,           setError]           = useState(null);
  const [currentIdx,      setCurrentIdx]      = useState(0);
  const [selected,        setSelected]        = useState(null);
  const [answers,         setAnswers]         = useState({});
  const [markedForReview, setMarkedForReview] = useState([]);
  const [timeLeft,        setTimeLeft]        = useState(null);
  const timerRef          = useRef(null);
  const answersRef        = useRef({});
  const timeLeftRef       = useRef(null);
  const finishQuizRef     = useRef(null);
  const questionStartTime = useRef(null);

  // ── Translation ─────────────────────────────────────────────────────────────
  const { handleLanguageChange, getField, getLanguage, isTranslating } = useTranslation();

  // Keep refs in sync
  useEffect(() => { answersRef.current  = answers;  }, [answers]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const defaultSubjects = [...new Set(details.map((d) => d.subject))];
  const defaultChapters = details.map((d) => d.chapter);

  const getRestoredSelected = useCallback((posIdx, currentAnswers) => {
    const q = questions[posIdx];
    if (!q) return null;
    const saved = currentAnswers[q.question_index]?.user_ans;
    if (!saved) return null;
    const idx = OPTION_LABELS.indexOf(saved);
    return idx >= 0 ? idx : null;
  }, [questions]);

  const handleStart = (config) => {
    setQuizConfig(config);
    setPhase("loading");
    setError(null);
    setTimeLeft(config.timeLimit ? config.timeLimit * 60 : null);

    const params = new URLSearchParams();
    params.append("num_ques", config.numQuestions);
    config.subjects.forEach((s) => params.append("subjects", s));
    config.chapters.forEach((c) => params.append("chapters", c));

    fetch(`/api/get-quiz-questions/?${params.toString()}`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data.length) { setError("No questions found for selected filters."); setPhase("setup"); return; }
        setQuestions(data);
        setCurrentIdx(0);
        setAnswers({});
        setMarkedForReview([]);
        setSelected(null);
        questionStartTime.current = Date.now();
        setPhase("active");
      })
      .catch((err) => { setError(err.message); setPhase("setup"); });
  };

  // Timer
  useEffect(() => {
    if (phase !== "active" || timeLeftRef.current === null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          finishQuizRef.current(answersRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const finishQuiz = useCallback((finalAnswers) => {
    fetch("/api/submit-quiz/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: finalAnswers }),
    }).catch(() => {});

    const score         = Object.values(finalAnswers).filter(
      ({ correct_ans, user_ans }) => user_ans && user_ans === correct_ans
    ).length;
    const entries       = Object.entries(finalAnswers);
    const question_ids  = entries.map(([id]) => Number(id));
    const submitted_ans = entries.map(([, a]) => a.user_ans  ?? "");
    const correct_ans   = entries.map(([, a]) => a.correct_ans ?? "");
    const time_taken    = entries.map(([, a]) => a.time_taken  ?? 0);

    fetch("/api/quiz-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: quizConfig?.subjects ?? [],
        chapter: quizConfig?.chapters ?? [],
        score,
        total_questions: entries.length,
        question_ids,
        submitted_ans,
        correct_ans,
        time_taken,
      }),
    }).catch(() => {});

    setPhase("results");
  }, [quizConfig]);

  useEffect(() => { finishQuizRef.current = finishQuiz; }, [finishQuiz]);

  const handleSaveNext = useCallback(() => {
    const q = questions[currentIdx];
    const elapsed = questionStartTime.current
      ? Math.round((Date.now() - questionStartTime.current) / 1000)
      : 0;
    questionStartTime.current = Date.now();

    const newAnswers = {
      ...answers,
      [q.question_index]: {
        correct_ans: q.correct_option?.[0],
        user_ans:    selected !== null ? OPTION_LABELS[selected] : null,
        time_taken:  elapsed,
      },
    };
    setAnswers(newAnswers);

    if (currentIdx + 1 >= questions.length) {
      clearInterval(timerRef.current);
      finishQuiz(newAnswers);
    } else {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setSelected(getRestoredSelected(nextIdx, newAnswers));
    }
  }, [questions, currentIdx, selected, answers, finishQuiz, getRestoredSelected]);

  const handlePrevious = useCallback(() => {
    if (currentIdx === 0) return;
    const prevIdx = currentIdx - 1;
    setCurrentIdx(prevIdx);
    setSelected(getRestoredSelected(prevIdx, answers));
  }, [currentIdx, answers, getRestoredSelected]);

  const toggleMark = useCallback(() => {
    setMarkedForReview((prev) =>
      prev.includes(currentIdx) ? prev.filter((x) => x !== currentIdx) : [...prev, currentIdx]
    );
  }, [currentIdx]);

  const handleReset = () => {
    setPhase("setup");
    setQuestions([]);
    setCurrentIdx(0);
    setAnswers({});
    setMarkedForReview([]);
    setSelected(null);
    setQuizConfig(null);
    setTimeLeft(null);
    questionStartTime.current = null;
    clearInterval(timerRef.current);
  };

  const score = Object.values(answers).filter(
    ({ correct_ans, user_ans }) => user_ans && user_ans === correct_ans
  ).length;

  const currentSubject = quizConfig?.subjects?.join(", ") || defaultSubjects.join(", ") || "";
  const currentChapter = quizConfig?.chapters?.length > 0
    ? quizConfig.chapters.map(slugToLabel).join(", ")
    : defaultChapters.map(slugToLabel).join(", ") || "";

  return (
    <div className="qs-page">
      {phase !== "results" && <LeftSidebar subject={currentSubject} chapter={currentChapter} />}

      <div className={`qs-center${phase === "active" ? " qs-center--active" : ""}`}>
        {phase === "setup" && (
          <QuizSetup
            onStart={handleStart}
            defaultSubjects={defaultSubjects}
            defaultChapters={defaultChapters}
          />
        )}

        {phase === "loading" && (
          <div className="qs-loading">
            <div className="qs-spinner" />
            <div className="qs-loading__text">Loading questions…</div>
          </div>
        )}

        {error && phase === "setup" && (
          <div className="qs-error">{error}</div>
        )}

        {phase === "active" && questions.length > 0 && (
          <QuestionScreen
            question={questions[currentIdx]}
            questionIndex={currentIdx}
            totalQuestions={questions.length}
            selected={selected}
            onSelect={setSelected}
            onPrevious={handlePrevious}
            onMarkForReview={toggleMark}
            onSaveNext={handleSaveNext}
            isMarked={markedForReview.includes(currentIdx)}
            isFirst={currentIdx === 0}
            isLast={currentIdx === questions.length - 1}
            // Translation props
            onLanguageChange={handleLanguageChange}
            getField={getField}
            getLanguage={getLanguage}
            isTranslating={isTranslating}
          />
        )}

        {phase === "results" && (
          <ResultsScreen
            score={score}
            total={questions.length}
            answers={answers}
            questions={questions}
            quizConfig={quizConfig}
            onReset={handleReset}
            onGoToRevision={() => onModeChange("revision")}
          />
        )}
      </div>

      {phase !== "results" && (
        <RightSidebar
          timeLeft={timeLeft}
          totalQuestions={questions.length}
          currentIndex={currentIdx}
          answers={Object.fromEntries(
            questions.map((q, i) => [i, answers[q.question_index]?.user_ans ?? null])
          )}
          markedForReview={markedForReview}
          onFinish={() => { clearInterval(timerRef.current); finishQuiz(answers); }}
          started={phase === "active"}
        />
      )}
    </div>
  );
};

export default Quiz;