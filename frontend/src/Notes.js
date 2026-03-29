import React, { useState, useMemo } from 'react';
import './Notes.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          .toUpperCase(); // → "17 MARCH, 2024"
}

function subjectColor(subject) {
  const s = subject?.toLowerCase();
  if (s === 'physics')   return { bg: '#EAF4FF', color: '#1565C0', dot: '#1565C0' };
  if (s === 'chemistry') return { bg: '#E8F5E9', color: '#2E7D32', dot: '#2E7D32' };
  if (s === 'maths')     return { bg: '#FFF8E1', color: '#F57F17', dot: '#F57F17' };
  if (s === 'biology')   return { bg: '#F3E5F5', color: '#6A1B9A', dot: '#6A1B9A' };
  return                        { bg: '#F1F5F9', color: '#475569', dot: '#475569' };
}

function SubjectIcon({ subject }) {
  const { bg, color } = subjectColor(subject);
  const s = subject?.toLowerCase();
  return (
    <div className="note-subject-icon" style={{ background: bg }}>
      {s === 'physics' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
            fill={color}/>
          <path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      {s === 'chemistry' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 3h6M10 3v7L5 20h14L14 10V3" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
      )}
      {s === 'maths' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h10M4 18h13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      {s === 'biology' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" stroke={color} strokeWidth="1.8"/>
          <circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.8"/>
        </svg>
      )}
      {!['physics','chemistry','maths','biology'].includes(s) && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="1.8"/>
          <path d="M8 9h8M8 13h5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      )}
    </div>
  );
}

// Extract a "first sentence" preview from note text
function getPreview(text) {
  if (!text) return '';
  const first = text.split(/[.!?\n]/)[0];
  return first.length > 90 ? first.slice(0, 87) + '…' : first + '…';
}

// Try to pull a "key takeaway" from the note text — first quoted line or first sentence
function getKeyTakeaway(text) {
  if (!text) return null;
  const quoted = text.match(/"([^"]{20,})"/);
  if (quoted) return quoted[1];
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) return sentences[0];
  return null;
}

// Very light markdown-to-JSX: bold, bullet lists, h2 headings
function RichText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // h2 heading: ## ...
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="notes-detail-h2">{line.slice(3)}</h2>
      );
      i++; continue;
    }

    // Bullet list block
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="notes-detail-ul">
          {items.map((item, j) => (
            <li key={j}>{inlineBold(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line — spacer
    if (!line.trim()) {
      elements.push(<div key={i} className="notes-detail-spacer" />);
      i++; continue;
    }

    // Paragraph
    elements.push(
      <p key={i} className="notes-detail-para">{inlineBold(line)}</p>
    );
    i++;
  }

  return <>{elements}</>;
}

function inlineBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Notes({ notes = [], onDelete }) {
  const [selectedId, setSelectedId] = useState(null);
  const [search,     setSearch]     = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notes.filter(n =>
      !q ||
      n.subject?.toLowerCase().includes(q) ||
      n.chapter?.toLowerCase().includes(q) ||
      n.text?.toLowerCase().includes(q)
    );
  }, [notes, search]);

  // Auto-select first note if none selected or selected note filtered out
  const activeNote = filtered.find(n => n.id === selectedId) ?? filtered[0] ?? null;
  const capitalizeWords = (str) =>
    str.replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="notes-page">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <aside className="notes-sidebar">

        {/* Header */}
        <div className="notes-sidebar-header">
          <h1 className="notes-sidebar-title">Notes</h1>
          <div className="notes-sidebar-count">{notes.length}</div>
        </div>

        {/* Search */}
        <div className="notes-search-wrap">
          <svg className="notes-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#94A3B8" strokeWidth="2"/>
            <path d="M16.5 16.5L21 21" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            className="notes-search-input"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Note list */}
        <div className="notes-list">
          {filtered.length === 0 && (
            <div className="notes-empty">No notes found.</div>
          )}
          {filtered.map(note => {
            const { dot } = subjectColor(note.subject);
            const isActive = activeNote?.id === note.id;
            return (
              <div
                key={note.id}
                className={`note-card${isActive ? ' active' : ''}`}
                onClick={() => setSelectedId(note.id)}
              >
                {/* Card header row */}
                <div className="note-card-top">
                  <SubjectIcon subject={note.subject} />
                  <span className="note-card-title">
                    {capitalizeWords(note.subject)}: {capitalizeWords(note.chapter)}
                  </span>
                </div>
                <div className="note-card-preview">{getPreview(note.text)}</div>
                <div className="note-card-footer">
                  <span className="note-card-date">{formatDate(note.date || note.created_at)}</span>
                  {isActive && (
                    <span className="note-card-dot" style={{ background: dot }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Right detail panel ─────────────────────────────────────────────── */}
      <main className="notes-detail">
        {activeNote ? (
          <>
            {/* Detail header */}
            <div className="notes-detail-topbar">
              <div className="notes-detail-meta">
                <span
                  className="notes-detail-subject-pill"
                  style={{
                    background: subjectColor(activeNote.subject).bg,
                    color:      subjectColor(activeNote.subject).color,
                  }}
                >
                  {activeNote.subject?.toUpperCase()}
                </span>
                <span className="notes-detail-date">
                  Last edited {formatDate(activeNote.date || activeNote.created_at)}
                </span>
              </div>
              <button
                className="notes-delete-btn"
                onClick={() => onDelete?.(activeNote.id)}
                title="Delete note"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"
                    stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
                    stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Title */}
            <h1 className="notes-detail-title">
              {capitalizeWords(activeNote.subject)}: {capitalizeWords(activeNote.chapter)}
            </h1>

            {/* Key takeaway blockquote */}
            {getKeyTakeaway(activeNote.text) && (
              <div className="notes-detail-blockquote">
                <div className="notes-detail-blockquote-label">Key takeaway from the session:</div>
                <div className="notes-detail-blockquote-body">
                  "{getKeyTakeaway(activeNote.text)}"
                </div>
              </div>
            )}

            {/* Body */}
            <div className="notes-detail-body">
              <RichText text={activeNote.text} />
            </div>
          </>
        ) : (
          <div className="notes-detail-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                stroke="#CBD5E1" strokeWidth="1.5"/>
              <rect x="9" y="3" width="6" height="4" rx="1" stroke="#CBD5E1" strokeWidth="1.5"/>
              <path d="M9 12h6M9 16h4" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Select a note to read it</span>
          </div>
        )}
      </main>
    </div>
  );
}