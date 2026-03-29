// ─── Study.js ────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import Goals  from './Goals.js';
import Topics from './Topics.js';
import Calendar from './Calendar.js';
import './Study.css';

const TABS = [
  { key: 'goals',   label: 'Goals' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'topics', label: 'Topics' },
];

export default function Study() {
  const [activeTab, setActiveTab] = useState('goals');

  return (
    <div className="study-page">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="study-header">
        <h1 className="study-title">Study Plan</h1>

        {/* Tab bar */}
        <div className="study-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`study-tab${activeTab === tab.key ? ' study-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="study-content">
        {activeTab === 'goals'   && <Goals />}
        {activeTab === 'calendar'   && <Calendar />}
        {activeTab === 'topics' && <Topics />}
      </div>

    </div>
  );
}