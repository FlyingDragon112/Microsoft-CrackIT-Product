// ─── Calendar.js ──────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import './Calendar.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March',     'April',   'May',      'June',
  'July',    'August',   'September', 'October', 'November', 'December',
];

export const EVENT_COLORS = [
  { hex: '#00639E', bg: 'rgba(0,99,158,0.12)'   },
  { hex: '#006E3D', bg: 'rgba(0,110,61,0.12)'   },
  { hex: '#A83836', bg: 'rgba(168,56,54,0.12)'  },
  { hex: '#7B5EA7', bg: 'rgba(123,94,167,0.12)' },
  { hex: '#C47F17', bg: 'rgba(196,127,23,0.12)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(y, m)     { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }

function buildGrid(year, month) {
  const cells   = [];
  const fd      = firstDayOfMonth(year, month);
  const dim     = daysInMonth(year, month);
  const prevM   = month === 0 ? 11 : month - 1;
  const prevY   = month === 0 ? year - 1 : year;
  const prevDim = daysInMonth(prevY, prevM);

  for (let i = 0; i < fd; i++)
    cells.push({ day: prevDim - fd + 1 + i, type: 'prev' });
  for (let d = 1; d <= dim; d++)
    cells.push({ day: d, type: 'current' });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - fd - dim + 1, type: 'next' });

  return cells;
}

// ─── EventModal ───────────────────────────────────────────────────────────────

function EventModal({ date, events, onAdd, onDelete, onClose }) {
  const [label,    setLabel]    = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const save = () => {
    if (!label.trim()) return;
    onAdd({ label: label.trim(), ...EVENT_COLORS[colorIdx] });
    setLabel('');
  };

  return (
    <div
      className="sp-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sp-modal">
        <div className="sp-modal-title">{date}</div>

        {events.length > 0 && (
          <div className="sp-modal-events">
            <div className="sp-modal-divider">Events</div>
            {events.map((ev, i) => (
              <div key={i} className="sp-modal-event-item">
                <span className="sp-modal-event-dot" style={{ background: ev.hex }} />
                <span className="sp-modal-event-label">{ev.label}</span>
                <button
                  className="sp-modal-event-del"
                  onClick={() => onDelete(i)}
                  aria-label="Delete event"
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div className="sp-modal-divider">Add Event</div>

        <div className="sp-modal-field">
          <label className="sp-modal-label">Title</label>
          <input
            ref={inputRef}
            className="sp-modal-input"
            placeholder="Event name…"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  save();
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>

        <div className="sp-modal-field">
          <label className="sp-modal-label">Color</label>
          <div className="sp-color-row">
            {EVENT_COLORS.map((c, i) => (
              <span
                key={i}
                className={`sp-color-swatch${colorIdx === i ? ' selected' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setColorIdx(i)}
              />
            ))}
          </div>
        </div>

        <div className="sp-modal-btns">
          <button className="sp-modal-save"   onClick={save}>Add Event</button>
          <button className="sp-modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── StudyCalendar (default export) ──────────────────────────────────────────

export default function StudyCalendar() {
  const now   = new Date();
  const [year,   setYear]   = useState(now.getFullYear());
  const [month,  setMonth]  = useState(now.getMonth());
  const [events, setEvents] = useState({});   // { 'year-month-day': [{label,hex,bg}] }
  const [modal,  setModal]  = useState(null); // { day, key } | null

  const grid           = buildGrid(year, month);
  const today          = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const key     = (day) => `${year}-${month}-${day}`;
  const openDay = (cell) => {
    if (cell.type !== 'current') return;
    setModal({ day: cell.day, key: key(cell.day) });
  };

  const addEvent = (ev) =>
    setEvents(prev => ({ ...prev, [modal.key]: [...(prev[modal.key] || []), ev] }));

  const delEvent = (idx) =>
    setEvents(prev => {
      const arr = [...(prev[modal.key] || [])];
      arr.splice(idx, 1);
      return { ...prev, [modal.key]: arr };
    });

  return (
    <>
      <section className="sp-calendar-section">

        {/* ── Header ── */}
        <div className="sp-cal-header">
          <div className="sp-cal-header-left">
            <div className="sp-cal-nav">
              <button className="sp-cal-nav-btn" onClick={prevMonth} aria-label="Previous month">
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                  <path
                    d="M5 1L1 5L5 9"
                    stroke="#566167"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="sp-cal-month-label">{MONTH_NAMES[month]} {year}</span>
              <button className="sp-cal-nav-btn" onClick={nextMonth} aria-label="Next month">
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                  <path
                    d="M1 1L5 5L1 9"
                    stroke="#566167"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="sp-cal-grid-wrap">
          <div className="sp-cal-grid sp-cal-grid--labels">
            {WEEK_LABELS.map(l => (
              <div key={l} className="sp-cal-label">{l}</div>
            ))}
          </div>

          <div className="sp-cal-grid sp-cal-grid--days">
            {grid.map((cell, i) => {
              const isToday   = isCurrentMonth && cell.type === 'current' && cell.day === today;
              const isPrev    = cell.type !== 'current';
              const dayEvents = events[key(cell.day)] || [];
              const hasEvents = cell.type === 'current' && dayEvents.length > 0;

              return (
                <div
                  key={i}
                  className={[
                    'sp-cal-day',
                    isPrev    ? 'sp-cal-day--prev'       : '',
                    isToday   ? 'sp-cal-day--today'      : '',
                    hasEvents ? 'sp-cal-day--has-events' : '',
                  ].join(' ')}
                  onClick={() => openDay(cell)}
                >
                  <span className="sp-cal-day-num">{cell.day}</span>

                  {hasEvents && (
                    <div className="sp-cal-events">
                      {dayEvents.slice(0, 3).map((ev, j) => (
                        <div
                          key={j}
                          className="sp-cal-chip"
                          style={{ background: ev.bg, color: ev.hex }}
                        >
                          <span className="sp-cal-chip-dot" style={{ background: ev.hex }} />
                          {ev.label}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="sp-cal-chip sp-cal-chip--overflow">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* ── Modal ── */}
      {modal && (
        <EventModal
          date={`${MONTH_NAMES[month]} ${modal.day}, ${year}`}
          events={events[modal.key] || []}
          onAdd={addEvent}
          onDelete={delEvent}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}