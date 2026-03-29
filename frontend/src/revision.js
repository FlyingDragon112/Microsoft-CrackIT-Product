import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import "./revision.css";

// ── FlipIcon ──────────────────────────────────────────────────────────────────
function FlipIcon() {
  return (
    <span className="revision-flip-icon">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
          fill="#00639E"
        />
      </svg>
    </span>
  );
}

// ── SaveIcon ──────────────────────────────────────────────────────────────────
function SaveIcon({ saved }) {
  return saved ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" fill="#00639E"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M17 3H5a2 2 0 0 0-2 2v14l7-3 7 3V5a2 2 0 0 0-2-2Zm0 14-5-2.18L7 17V5h10v12Z" fill="currentColor"/>
    </svg>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState({ error }) {
  return (
    <div className="revision-container">
      {error && <div className="revision-error">{error}</div>}
      <div className="revision-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM6 20V4h5v7h7v9H6z"
            fill="#00639E"
            opacity="0.5"
          />
        </svg>
        <p className="revision-empty-title">No flashcards yet</p>
        <p className="revision-empty-subtitle">
          Attach documents and reload, or reload if a document is already uploaded.
        </p>
        <button
          className="revision-ctrl-btn"
          onClick={() => window.location.reload()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
              fill="currentColor"
            />
          </svg>
          Reload
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function Revision() {
  const [flashcards,        setFlashcards]        = useState([]);
  const [currentIndex,      setCurrentIndex]      = useState(0);
  const [flipped,           setFlipped]           = useState(false);
  const [savedCards,        setSavedCards]        = useState(new Set());
  const [savingCard,        setSavingCard]        = useState(false);
  const [context,           setContext]           = useState({ subject: "", chapter: "" });
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState(null);

  // ── Fetch context ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res  = await fetch("/api/context/");
        const data = await res.json();
        setContext(data);
      } catch {
        // silently fall back to empty strings
      }
    };
    fetchContext();
  }, []);

  // ── Fetch flashcards ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        setLoading(true);
        const res  = await fetch("/api/get-flashcards-data", { method: "POST" });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setFlashcards(data);
      } catch {
        setError("Could not load flashcards from server.");
      } finally {
        setLoading(false);
      }
    };
    fetchFlashcards();
  }, []);

  // ── Save current card ─────────────────────────────────────────────────────
  const saveCard = async () => {
    if (savedCards.has(currentIndex) || savingCard) return;
    setSavingCard(true);
    try {
      const res = await fetch("/api/save-flashcard", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: context.subject,
          chapter: card.chapter,
          front:   card.front,
          back:    card.back,
        }),
      });
      if (res.ok) {
        setSavedCards(prev => new Set(prev).add(currentIndex));
      } else {
        setError("Failed to save flashcard.");
      }
    } catch {
      setError("Failed to save flashcard.");
    } finally {
      setSavingCard(false);
    }
  };

  const goNext = () => {
    if (currentIndex < flashcards.length - 1) { setCurrentIndex(i => i + 1); setFlipped(false); }
  };

  const goPrev = () => {
    if (currentIndex > 0) { setCurrentIndex(i => i - 1); setFlipped(false); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="revision-container">
        <div className="revision-loading">Loading flashcards…</div>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!flashcards.length) {
    return <EmptyState error={error} />;
  }

  const total           = flashcards.length;
  const card            = flashcards[currentIndex];
  const progressPercent = ((currentIndex + 1) / total) * 100;
  const isSaved         = savedCards.has(currentIndex);

  return (
    <div className="revision-container">

      {error && <div className="revision-error">{error}</div>}

      {/* ── Topic header ─────────────────────────────────────────────────── */}
      <div className="revision-header">
        <div className="revision-eyebrow">
          <span className="revision-eyebrow-icon">✦</span>
          AI Personalised Revision
        </div>
        <h1 className="revision-title">
          {context.subject}: {context.chapter}
        </h1>
        <p className="revision-subtitle">Focusing on your weak areas from the last practice session.</p>
      </div>

      {/* ── Progress strip ───────────────────────────────────────────────── */}
      <div className="revision-progress-bar-area">
        <div className="revision-progress-info">
          <span className="revision-progress-text">
            Progress&nbsp; {currentIndex + 1}/{total}
          </span>
          <span className="revision-topic-pill">Topic: {card.chapter}</span>
        </div>
        <div className="revision-progress-track">
          <div className="revision-progress-fill" style={{ width: `${progressPercent}%` }} />
          <div className="revision-progress-thumb" style={{ left: `${progressPercent}%` }} />
        </div>
      </div>

      {/* ── Flashcard ────────────────────────────────────────────────────── */}
      <div className="revision-flashcard-wrapper">

        <div className="revision-flashcard-badge">
          Concept&nbsp;{String(currentIndex + 1).padStart(2, '0')}
        </div>

        <div
          className={`revision-flashcard${flipped ? ' flipped' : ''}`}
          onClick={() => setFlipped(f => !f)}
        >
          <div className="revision-flashcard-inner">

            {/* Front */}
            <div className="revision-flashcard-front">
              <div className="revision-flashcard-label">Question</div>
              <div className="revision-flashcard-question">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {card.front}
                </ReactMarkdown>
              </div>
              <div className="revision-flashcard-hint">(Try to recall before flipping)</div>
              <div className="revision-flashcard-divider" />
              <button
                className="revision-flip-btn"
                onClick={e => { e.stopPropagation(); setFlipped(true); }}
              >
                Flip Card <FlipIcon />
              </button>
            </div>

            {/* Back */}
            <div className="revision-flashcard-back">
              <div className="revision-flashcard-label">Answer</div>
              <div className="revision-flashcard-answer">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {card.back}
                </ReactMarkdown>
              </div>
              <div className="revision-flashcard-divider" />
              <button
                className="revision-flip-btn"
                onClick={e => { e.stopPropagation(); setFlipped(false); }}
              >
                Flip Back <FlipIcon />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="revision-controls">

        {/* Previous */}
        <button
          className="revision-ctrl-btn"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="currentColor"/>
          </svg>
          Previous
        </button>

        {/* Save card */}
        <button
          className={`revision-ctrl-btn revision-save-btn${isSaved ? ' saved' : ''}`}
          onClick={e => { e.stopPropagation(); saveCard(); }}
          disabled={isSaved || savingCard}
        >
          <SaveIcon saved={isSaved} />
          {savingCard ? 'Saving…' : isSaved ? 'Saved' : 'Save Card'}
        </button>

        {/* Next */}
        <button
          className="revision-ctrl-btn revision-ctrl-btn--next"
          onClick={goNext}
          disabled={currentIndex === total - 1}
        >
          Next
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 13H16.17L10.58 18.59L12 20L20 12L12 4L10.59 5.41L16.17 11H4V13Z" fill="currentColor"/>
          </svg>
        </button>

      </div>
    </div>
  );
}

export default Revision;