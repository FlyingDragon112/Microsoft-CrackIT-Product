import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./SavedFlashcards.css";

function FlipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
        fill="#00578B"
      />
    </svg>
  );
}

function ChevronIcon({ direction }) {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
      {direction === "left" ? (
        <path d="M9 1L1 8L9 15" stroke="#00639E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M1 1L9 8L1 15" stroke="#00639E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function FlashcardGridItem({ card, index, onClick }) {
  return (
    <div className="sf-grid-card" onClick={() => onClick(index)}>
      <div className="sf-grid-card__body">
        <div className="sf-grid-card__concept">
          Concept #{String(index + 1).padStart(2, "0")}
        </div>
        <div className="sf-grid-card__front">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {card.front}
          </ReactMarkdown>
        </div>
      </div>
      <div className="sf-grid-card__footer">
        <span className="sf-grid-card__subject">
          {card.subject ? `${card.subject}: ` : ""}{card.chapter}
        </span>
        <div className="sf-grid-card__flip-hint">
          Flip <FlipIcon />
        </div>
      </div>
    </div>
  );
}

function FlashcardModal({ cards, activeIndex, onClose, onDelete, onPrev, onNext }) {
  const [flipped,  setFlipped]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const card = cards[activeIndex];

  useEffect(() => { setFlipped(false); }, [activeIndex]);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    await onDelete(card.id);
    setDeleting(false);
  };

  return (
    <div className="sf-overlay" onClick={onClose}>
      <button className="sf-overlay__close" onClick={onClose}>✕</button>

      <div className="sf-modal-row" onClick={e => e.stopPropagation()}>

        {/* Prev */}
        <button className="sf-nav-btn" onClick={onPrev} disabled={activeIndex === 0}>
          <ChevronIcon direction="left" />
        </button>

        {/* Flip card */}
        <div className="sf-flipcard-wrapper">
          <div className={`sf-flipcard${flipped ? " sf-flipcard--flipped" : ""}`}>

            {/* Front face */}
            <div className="sf-flipcard__shell">
              <div className="sf-flipcard__inner">
                <div className="sf-card-badge">
                  <span className="sf-card-badge__chapter">{card.chapter}</span>
                  <span className="sf-card-badge__count">Card {activeIndex + 1} of {cards.length}</span>
                </div>
                <div className="sf-card-front__content">
                  <div className="sf-card-front__question">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {card.front}
                    </ReactMarkdown>
                  </div>
                  <div className="sf-card-front__subject">{card.subject}</div>
                </div>
                <div className="sf-card-actions">
                  <button className="sf-flip-btn" onClick={() => setFlipped(true)}>
                    Flip to see Answer
                  </button>
                  <button className="sf-delete-btn" onClick={handleDelete} disabled={deleting}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6h14z" stroke="#566167" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {deleting ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            </div>

            {/* Back face */}
            <div className="sf-flipcard__shell sf-flipcard__shell--back">
              <div className="sf-flipcard__inner">
                <div className="sf-card-badge">
                  <span className="sf-card-badge__chapter">{card.chapter}</span>
                  <span className="sf-card-badge__count">Card {activeIndex + 1} of {cards.length}</span>
                </div>
                <div className="sf-card-back__content">
                  <div className="sf-card-back__label">Answer</div>
                  <div className="sf-card-back__answer">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {card.back}
                    </ReactMarkdown>
                  </div>
                </div>
                <div className="sf-card-actions">
                  <button className="sf-flip-back-btn" onClick={() => setFlipped(false)}>
                    Flip Back <FlipIcon />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Next */}
        <button className="sf-nav-btn" onClick={onNext} disabled={activeIndex === cards.length - 1}>
          <ChevronIcon direction="right" />
        </button>

      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="sf-empty">
      {[0, 1, 2].map(i => (
        <div key={i} className="sf-empty__skeleton">
          <div className="sf-empty__skeleton-icon" />
          <div className="sf-empty__skeleton-line1" />
          <div className="sf-empty__skeleton-line2" />
        </div>
      ))}
      <p className="sf-empty__text">No saved flashcards yet</p>
    </div>
  );
}

function SavedFlashcards() {
  const [cards,       setCards]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res  = await fetch("/api/get-flashcards");
        const data = await res.json();
        if (Array.isArray(data)) setCards(data);
      } catch (e) {
        console.error("Failed to fetch flashcards", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/delete-flashcard/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCards(prev => {
          const updated = prev.filter(c => c.id !== id);
          setActiveIndex(idx => {
            if (idx === null) return null;
            if (updated.length === 0) return null;
            return Math.min(idx, updated.length - 1);
          });
          return updated;
        });
      }
    } catch (e) {
      console.error("Failed to delete flashcard", e);
    }
  };

  if (loading) return <div className="sf-loading">Loading saved flashcards…</div>;

  return (
    <div className="sf-page">
      <div className="sf-content">
        {cards.length === 0 ? (
        <EmptyState />
        ) : (
        <div className="sf-cards-grid">
            {cards.map((card, i) => (
            <FlashcardGridItem key={card.id} card={card} index={i} onClick={setActiveIndex} />
            ))}
        </div>
        )}
      </div>

      {activeIndex !== null && cards.length > 0 && (
        <FlashcardModal
          cards={cards}
          activeIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
          onDelete={handleDelete}
          onPrev={() => setActiveIndex(i => Math.max(0, i - 1))}
          onNext={() => setActiveIndex(i => Math.min(cards.length - 1, i + 1))}
        />
      )}
    </div>
  );
}

export default SavedFlashcards;