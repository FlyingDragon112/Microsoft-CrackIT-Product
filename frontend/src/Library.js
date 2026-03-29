// ─── Library.js ──────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import Notes          from './Notes';
import QuizResponses  from './QuizResponses';
import SavedFlashcards from './SavedFlashcards';
import './Library.css';

const TABS = [
  { key: 'notes',      label: 'Saved Notes'      },
  { key: 'quiz',       label: 'Quiz Responses'    },
  { key: 'flashcards', label: 'Saved Flashcards'  },
];

export default function Library({ notes = [], onDeleteNote }) {
  const [activeTab, setActiveTab] = useState('notes');

  return (
    <div className="library-page">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="library-header">
        <h1 className="library-title">Library</h1>

        {/* Tab bar */}
        <div className="library-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`library-tab${activeTab === tab.key ? ' library-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="library-content">
        {activeTab === 'notes'      && <Notes notes={notes} onDelete={onDeleteNote} />}
        {activeTab === 'quiz'       && <QuizResponses />}
        {activeTab === 'flashcards' && <SavedFlashcards />}
      </div>

    </div>
  );
}