// ─── QuizResponses.js ─────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, memo } from "react";
import { MathJax } from "better-react-mathjax";
import DOMPurify from "dompurify";
import "./QuizResponses.css";

const sanitize = (text) =>
  DOMPurify.sanitize(text || "", { ADD_TAGS: ["style"], FORCE_BODY: true });

const MathText = memo(({ text }) => {
  if (!text) return null;
  return (
    <MathJax dynamic inline>
      <span style={{ display: "inline" }} dangerouslySetInnerHTML={{ __html: sanitize(text) }} />
    </MathJax>
  );
});

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    + " • " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function accuracy(score, total) {
  if (!total) return 0;
  return Math.round((score / total) * 100);
}

function accuracyColor(pct) {
  if (pct >= 80) return "#006E3D";
  if (pct >= 60) return "#00639E";
  return "#A83836";
}

function subjectColor(subjects) {
  const s = (Array.isArray(subjects) ? subjects[0] : subjects)?.toLowerCase();
  if (s === "physics")   return { bg: "#DBEAFE", color: "#2563EB" };
  if (s === "chemistry") return { bg: "#DCFCE7", color: "#16A34A" };
  if (s === "maths")     return { bg: "#F3E8FF", color: "#9333EA" };
  return                        { bg: "#E1E9F0", color: "#00639E" };
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────

function ReviewCard({ question, index, userAnswer, correctAnswer, isCorrect, timeTaken }) {
  return (
    <div className={`qr-review-card${isCorrect ? " qr-review-card--correct" : " qr-review-card--incorrect"}`}>
      <div className="qr-review-card__header">
        <div className="qr-review-card__num">Question {String(index + 1).padStart(2, "0")}</div>
        <div className={`qr-review-card__badge${isCorrect ? " qr-review-card__badge--correct" : " qr-review-card__badge--incorrect"}`}>
          {isCorrect ? "Correct" : "Incorrect"}{timeTaken ? ` • ${timeTaken}s` : ""}
        </div>
      </div>
      <div className="qr-review-card__question">
        <MathText text={question.question} />
      </div>
      <div className="qr-review-card__answers">
        <div className={`qr-answer-pill${isCorrect ? " qr-answer-pill--correct" : " qr-answer-pill--wrong"}`}>
          <div className="qr-answer-pill__label">Your Answer</div>
          <div className="qr-answer-pill__value"><MathText text={userAnswer || "Not answered"} /></div>
        </div>
        <div className="qr-answer-pill qr-answer-pill--correct-ans">
          <div className="qr-answer-pill__label">Correct Answer</div>
          <div className="qr-answer-pill__value"><MathText text={correctAnswer || "—"} /></div>
        </div>
      </div>
      {question.explanation && (
        <div className="qr-solution">
          <span className="qr-solution__label">Solution</span>
          <div className="qr-solution__text"><MathText text={question.explanation} /></div>
        </div>
      )}
    </div>
  );
}

// ─── DetailView ───────────────────────────────────────────────────────────────

function DetailView({ attempt, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!attempt?.question_ids?.length) { setLoading(false); return; }
    fetch("/api/questions-by-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: attempt.question_ids }),
    })
      .then((r) => r.json())
      .then(setQuestions)
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [attempt]);

  const pct       = accuracy(attempt.score, attempt.total_questions);
  const incorrect = attempt.total_questions - attempt.score;
  const ringColor = accuracyColor(pct);
  const R = 56, C = 2 * Math.PI * R, arc = (pct / 100) * C;

  const subjectLabel = Array.isArray(attempt.subject) ? attempt.subject.join(", ") : attempt.subject || "Quiz";
  const chapterLabel = Array.isArray(attempt.chapter) && attempt.chapter.length
    ? attempt.chapter.join(", ") : "All Chapters";

  // ── Uses correct_ans and time_taken from stored history ──
  const answersMap = useMemo(() => {
    const map = {};
    attempt.question_ids?.forEach((id, i) => {
      map[id] = {
        user_ans:    attempt.submitted_ans?.[i] ?? null,
        correct_ans: attempt.correct_ans?.[i]   ?? null,
        time_taken:  attempt.time_taken?.[i]     ?? 0,
      };
    });
    return map;
  }, [attempt]);

  const [filter, setFilter] = useState("all");

  // ── Uses stored correct_ans instead of q.correct_option ──
  const filteredQuestions = questions.filter((q) => {
    const { user_ans, correct_ans } = answersMap[q.question_index] ?? {};
    const correct = !!(user_ans && user_ans === correct_ans);
    if (filter === "correct")   return correct;
    if (filter === "incorrect") return !correct;
    return true;
  });

  return (
    <div className="qr-detail">
      <button className="qr-detail__back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to History
      </button>

      <div className="qr-detail__heading">
        <h1 className="qr-detail__title">{subjectLabel}</h1>
        <p className="qr-detail__sub">{chapterLabel} • {formatDate(attempt.date)}</p>
      </div>

      <div className="qr-detail__summary">
        <div className="qr-donut-card">
          <svg width="128" height="128" viewBox="0 0 136 136">
            <circle cx="68" cy="68" r={R} fill="none" stroke="#E1E9F0" strokeWidth="10"/>
            <circle cx="68" cy="68" r={R} fill="none" stroke={ringColor} strokeWidth="10"
              strokeDasharray={`${arc} ${C}`} strokeDashoffset={C / 4} strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
            <text x="68" y="63" textAnchor="middle" dominantBaseline="central"
              style={{ fill: "#2A343A", fontSize: 26, fontFamily: "Inter, sans-serif", fontWeight: 800 }}>
              {pct}%
            </text>
            <text x="68" y="83" textAnchor="middle"
              style={{ fill: "#566167", fontSize: 9, fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: 1 }}>
              ACCURACY
            </text>
          </svg>
        </div>
        <div className="qr-detail__stats">
          {[
            { label: "Score",     value: `${attempt.score}/${attempt.total_questions}`, color: "#2A343A" },
            { label: "Correct",   value: attempt.score,   color: "#006E3D" },
            { label: "Incorrect", value: incorrect,        color: "#A83836" },
          ].map(({ label, value, color }) => (
            <div key={label} className="qr-stat-chip">
              <div className="qr-stat-chip__label">{label}</div>
              <div className="qr-stat-chip__value" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="qr-detail__filter-row">
        <h2 className="qr-detail__review-title">Review Answers</h2>
        <div className="qr-detail__pills">
          {[
            { key: "correct",   label: `Correct (${attempt.score})`, mod: "green" },
            { key: "incorrect", label: `Incorrect (${incorrect})`,    mod: "red"   },
          ].map(({ key, label, mod }) => (
            <button key={key}
              onClick={() => setFilter(filter === key ? "all" : key)}
              className={`qr-filter-pill qr-filter-pill--${mod}${filter === key ? " qr-filter-pill--active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="qr-loading">Loading questions…</div>
      ) : filteredQuestions.length === 0 ? (
        <div className="qr-empty">No questions to show.</div>
      ) : (
        // ── Passes correctAnswer from stored history, not q.correct_option ──
        filteredQuestions.map((q, i) => {
          const { user_ans, correct_ans, time_taken } = answersMap[q.question_index] ?? {};
          const isCorrect = !!(user_ans && user_ans === correct_ans);
          const optMap    = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
          return (
            <ReviewCard
              key={q.question_index}
              question={q}
              index={i}
              userAnswer={user_ans    ? optMap[user_ans]    : null}
              correctAnswer={correct_ans ? optMap[correct_ans] : null}
              isCorrect={isCorrect}
              timeTaken={time_taken}
            />
          );
        })
      )}
    </div>
  );
}

// ─── AttemptRow ───────────────────────────────────────────────────────────────

function AttemptRow({ attempt, onClick }) {
  const pct = accuracy(attempt.score, attempt.total_questions);
  const { bg, color } = subjectColor(attempt.subject);
  const label   = Array.isArray(attempt.subject) ? attempt.subject.join(", ") : attempt.subject || "Quiz";
  const chapter = Array.isArray(attempt.chapter) && attempt.chapter.length
    ? attempt.chapter.join(", ") : "All Chapters";

  return (
    <div className="qr-attempt-row" onClick={onClick}>
      <div className="qr-attempt-row__left">
        <div className="qr-attempt-row__icon" style={{ background: bg }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke={color} strokeWidth="1.8"/>
            <rect x="9" y="3" width="6" height="4" rx="1" stroke={color} strokeWidth="1.8"/>
            <path d="M9 12h6M9 16h4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="qr-attempt-row__info">
          <div className="qr-attempt-row__title">{label} — {chapter}</div>
          <div className="qr-attempt-row__date">Attempted on {formatDate(attempt.date)}</div>
        </div>
      </div>
      <div className="qr-attempt-row__right">
        <div className="qr-attempt-row__stat">
          <div className="qr-attempt-row__stat-label">Score</div>
          <div className="qr-attempt-row__stat-value">{attempt.score}/{attempt.total_questions}</div>
        </div>
        <div className="qr-attempt-row__stat">
          <div className="qr-attempt-row__stat-label">Accuracy</div>
          <div className="qr-attempt-row__stat-value" style={{ color: accuracyColor(pct) }}>{pct}%</div>
        </div>
        <div className="qr-attempt-row__chevron">
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M1 1l5 5-5 5" stroke="#2A343A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

function StatsBar({ history }) {
  const total  = history.length;
  const avgPct = total
    ? Math.round(history.reduce((s, h) => s + accuracy(h.score, h.total_questions), 0) / total)
    : 0;

  const bySubject = {};
  history.forEach((h) => {
    const subj = Array.isArray(h.subject) ? h.subject[0] : h.subject || "Unknown";
    if (!bySubject[subj]) bySubject[subj] = { total: 0, score: 0 };
    bySubject[subj].total += h.total_questions;
    bySubject[subj].score += h.score;
  });
  const strongest = Object.entries(bySubject)
    .sort(([, a], [, b]) => accuracy(b.score, b.total) - accuracy(a.score, a.total))[0]?.[0] ?? "—";

  return (
    <div className="qr-stats-bar">
      {[
        { label: "Average Score",     value: `${avgPct}%`, bg: "rgba(136,249,176,0.30)", color: "#006E3D" },
        { label: "Total Quizzes",     value: String(total), bg: "rgba(116,195,254,0.30)", color: "#006595" },
        { label: "Strongest Subject", value: strongest,    bg: "rgba(94,177,251,0.30)",  color: "#00639E" },
      ].map(({ label, value, bg, color }) => (
        <div key={label} className="qr-stat-card">
          <div className="qr-stat-card__icon" style={{ background: bg }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2z" stroke={color} strokeWidth="1.8"/>
              <path d="M12 8v4l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="qr-stat-card__label">{label}</div>
            <div className="qr-stat-card__value">{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AccuracyChart ────────────────────────────────────────────────────────────

function AccuracyChart({ history }) {
  const recent = [...history].slice(0, 7).reverse();
  if (!recent.length) return null;
  return (
    <div className="qr-chart-card">
      <div className="qr-chart-card__header">
        <div className="qr-chart-card__title">Accuracy Over Time</div>
        <div className="qr-chart-card__legend">
          <span className="qr-chart-card__legend-dot" />Daily Score %
        </div>
      </div>
      <div className="qr-chart-bars">
        {recent.map((h, i) => {
          const pct = accuracy(h.score, h.total_questions);
          return (
            <div key={i} className="qr-chart-bar-wrap">
              <div className="qr-chart-bar-bg">
                <div className="qr-chart-bar-fill" style={{ height: `${pct}%` }} title={`${pct}%`} />
              </div>
              <div className="qr-chart-bar-label">{formatDateShort(h.date)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuizResponses() {
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [page,     setPage]     = useState(1);
  const PER_PAGE = 6;

  useEffect(() => {
    fetch("/api/quiz-history")
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = history.slice(0, page * PER_PAGE);

  if (selected) {
    return (
      <div className="qr-page">
        <DetailView attempt={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="qr-page">
      {loading ? (
        <div className="qr-loading qr-loading--full">Loading quiz history…</div>
      ) : history.length === 0 ? (
        <div className="qr-empty qr-empty--full">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="#CBD5E1" strokeWidth="1.5"/>
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="#CBD5E1" strokeWidth="1.5"/>
            <path d="M9 12h6M9 16h4" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>No quiz attempts yet. Complete a quiz to see your history here.</span>
        </div>
      ) : (
        <>
          <StatsBar history={history} />
          <AccuracyChart history={history} />
          <div className="qr-section-header">
            <h2 className="qr-section-title">Recent Attempts</h2>
          </div>
          <div className="qr-attempts-list">
            {shown.map((attempt) => (
              <AttemptRow key={attempt.id} attempt={attempt} onClick={() => setSelected(attempt)} />
            ))}
          </div>
          {page * PER_PAGE < history.length && (
            <div className="qr-load-more-wrap">
              <button className="qr-load-more" onClick={() => setPage((p) => p + 1)}>
                Load More Attempts
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}