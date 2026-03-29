// ─── Goals.js ─────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import './Goals.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAM_DATE     = new Date('2026-04-02T00:00:00');
const ADVANCED_DATE = new Date('2026-05-17T00:00:00');

const INIT_MONTH_GOALS = [
  { text: 'Finish Organic Chemistry (Advanced)', done: true  },
  { text: 'Complete 5 Full-Length Mock Tests',   done: false },
];

const INIT_WEEK_GOALS = [
  { text: 'Master 200 Organic Flashcards',            done: true  },
  { text: 'Physics: Rotational Dynamics Problem Set', done: false },
];

// ─── Countdown hook ───────────────────────────────────────────────────────────

function calcCountdown(target) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hrs:  String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
    min:  String(Math.floor((diff % 3600000)  / 60000)).padStart(2, '0'),
  };
}

function useCountdown(target) {
  const [t, setT] = useState(() => calcCountdown(target));
  useEffect(() => {
    const id = setInterval(() => setT(calcCountdown(target)), 10000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({ title, goals, setGoals }) {
  const [adding, setAdding] = useState(false);
  const [draft,  setDraft]  = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  const toggle  = (i) => setGoals(g => g.map((x, idx) => idx === i ? { ...x, done: !x.done } : x));
  const remove  = (i) => setGoals(g => g.filter((_, idx) => idx !== i));
  const confirm = ()  => {
    if (draft.trim()) setGoals(g => [...g, { text: draft.trim(), done: false }]);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="sp-goal-card">
      <div className="sp-goal-header">
        <div className="sp-goal-title-row">
          <span className="sp-goal-dot" />
          <span className="sp-goal-title">{title}</span>
        </div>
        <button
          className="sp-goal-add-btn"
          onClick={() => setAdding(a => !a)}
          aria-label="Add goal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="#00639E" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5"  x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <ul className="sp-goal-list">
        {goals.map((g, i) => (
          <li key={i} className="sp-goal-item">
            <span
              className={`sp-goal-check${g.done ? ' done' : ''}`}
              style={{ background: g.done ? '#006E3D' : '#A9B3BB' }}
              onClick={() => toggle(i)}
            />
            <span className={`sp-goal-text${g.done ? ' done' : ''}`}>{g.text}</span>
            <button
              className="sp-goal-delete"
              onClick={() => remove(i)}
              aria-label="Delete goal"
            >×</button>
          </li>
        ))}
      </ul>

      {adding && (
        <div className="sp-goal-add-row">
          <input
            ref={inputRef}
            className="sp-goal-add-input"
            placeholder="New goal…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  confirm();
              if (e.key === 'Escape') { setAdding(false); setDraft(''); }
            }}
          />
          <button className="sp-goal-add-confirm" onClick={confirm}>Add</button>
          <button className="sp-goal-add-cancel"  onClick={() => { setAdding(false); setDraft(''); }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ─── Goals (default export) ───────────────────────────────────────────────────

export default function Goals() {
  const [monthGoals, setMonthGoals] = useState(INIT_MONTH_GOALS);
  const [weekGoals,  setWeekGoals]  = useState(INIT_WEEK_GOALS);

  const { days,    hrs,    min    } = useCountdown(EXAM_DATE);
  const { days: advDays, hrs: advHrs, min: advMin } = useCountdown(ADVANCED_DATE);

  return (
    <div className="study-plan">

      {/* ── Top row: Roadmap + Goals ──────────────────────────────────────── */}
      <div className="sp-top-row">

        {/* Left: Course Roadmap */}
        <div className="sp-roadmap">
          <div className="sp-section-head">
            <h2 className="sp-section-title">Upcoming Exams</h2>
          </div>

          {/* JEE Mains banner */}
          <div className="sp-exam-banner">
            <div className="sp-exam-glow" />
            <div className="sp-exam-info">
              <div className="sp-exam-label">
                <span className="sp-exam-label-dot" />
                MAIN GOAL
              </div>
              <div className="sp-exam-name">JEE Mains: April 2</div>
            </div>
            <div className="sp-countdown">
              <div className="sp-countdown-unit">
                <span className="sp-countdown-num">{days}</span>
                <span className="sp-countdown-lbl">DAYS</span>
              </div>
              <span className="sp-countdown-sep">:</span>
              <div className="sp-countdown-unit">
                <span className="sp-countdown-num">{hrs}</span>
                <span className="sp-countdown-lbl">HRS</span>
              </div>
              <span className="sp-countdown-sep">:</span>
              <div className="sp-countdown-unit">
                <span className="sp-countdown-num">{min}</span>
                <span className="sp-countdown-lbl">MIN</span>
              </div>
            </div>
          </div>

          {/* JEE Advanced banner */}
          <div className="sp-exam-banner sp-exam-banner--advanced">
            <div className="sp-exam-glow" />
            <div className="sp-exam-info">
              <div className="sp-exam-label">
                <span className="sp-exam-label-dot" />
                NEXT GOAL
              </div>
              <div className="sp-exam-name">JEE Advanced: May 17</div>
            </div>
            <div className="sp-countdown">
              <div className="sp-countdown-unit">
                <span className="sp-countdown-num">{advDays}</span>
                <span className="sp-countdown-lbl">DAYS</span>
              </div>
              <span className="sp-countdown-sep">:</span>
              <div className="sp-countdown-unit">
                <span className="sp-countdown-num">{advHrs}</span>
                <span className="sp-countdown-lbl">HRS</span>
              </div>
              <span className="sp-countdown-sep">:</span>
              <div className="sp-countdown-unit">
                <span className="sp-countdown-num">{advMin}</span>
                <span className="sp-countdown-lbl">MIN</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Goal cards */}
        <div className="sp-goals">
          <GoalCard title="This Month" goals={monthGoals} setGoals={setMonthGoals} />
          <GoalCard title="This Week"  goals={weekGoals}  setGoals={setWeekGoals}  />
        </div>

      </div>
    </div>
  );
}