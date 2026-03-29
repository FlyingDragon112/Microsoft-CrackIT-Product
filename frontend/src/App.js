// ─── App.js ──────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import './App.css';
import { MathJaxContext } from 'better-react-mathjax';
import MainChat  from './MainChat';
import Library     from './Library';
import Analytics from './Analytics';
import Quiz      from './Quiz';
import Revision  from './revision';
import Study from './Study.js'
import MentalHealthFlow from './mentalhealth.js';

const MATHJAX_CONFIG = {
  tex: {
    inlineMath:  [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
  },
};

function App() {
  const [activePage,   setActivePage]  = useState('explanation');
  const [notes,        setNotes]       = useState([]);
  const [quizDetails,  setQuizDetails] = useState([]);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    fetch('/api/session-id')
      .then(res => res.json())
      .then(data => {
        const storedId = localStorage.getItem('crackit-session-id');
        if (storedId !== data.session_id) {
          localStorage.removeItem('crackit-chat-messages');
          localStorage.removeItem('crackit-uploaded-files');
          localStorage.removeItem('crackit-mode');
          localStorage.removeItem('crackit-tools');
          localStorage.setItem('crackit-session-id', data.session_id);
        }
      })
      .catch(err => console.error('Session check failed:', err))
      .finally(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    fetch('/api/notes')
      .then(res => res.json())
      .then(data => setNotes(data))
      .catch(err => console.error('Failed to fetch notes:', err));
  }, []); // ← on mount

  useEffect(() => {
    if (activePage !== 'library') return;
    fetch('/api/notes')
      .then(res => res.json())
      .then(data => setNotes(data))
      .catch(err => console.error('Failed to fetch notes:', err));
  }, [activePage]);

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleQuizStart = (subject, chapter) => {
    setQuizDetails([{ subject, chapter }]);
    setActivePage('quiz');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'explanation': return (
        <MainChat
          mode="Explanation Mode"
          onModeChange={setActivePage}
          onQuizStart={handleQuizStart}
        />
      );
      case 'quiz': return <Quiz details={quizDetails} onModeChange={setActivePage} />;
      case 'revision':    return <Revision />;
      case 'study_plan':  return <Study />;
      case 'library':       return <Library notes={notes} onDeleteNote={handleDelete} />
      case 'analytics':   return <div className="crackit-analytics-wrap"><Analytics /></div>;
      case 'meditate':    return <MentalHealthFlow />;
      default:            return (
        <MainChat
          mode="Explanation Mode"
          onModeChange={setActivePage}
          onQuizStart={handleQuizStart}
        />
      );
    }
  };

  if (!sessionReady) return null;

  return (
    <div className="crackit-app">
      <header className="crackit-header">
        <div className="crackit-header-left">
          <span className="crackit-header-title">CrackIT AI</span>
          <nav className="crackit-header-nav crackit-header-nav--primary">
            {[
              { key: 'explanation', label: 'Explanation' },
              { key: 'quiz',        label: 'Quiz'        },
              { key: 'revision',    label: 'Revision'    },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`crackit-header-nav-link${activePage === key ? ' active' : ''}`}
                onClick={() => setActivePage(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <nav className="crackit-header-nav crackit-header-nav--secondary">
          {[
            { key: 'study_plan',     label: 'Study Plan'},
            { key: 'library',     label: 'Library' },
            { key: 'analytics', label: 'Progress' },
            { key: 'meditate',  label: 'Meditate'  },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`crackit-header-nav-link${activePage === key ? ' active' : ''}`}
              onClick={() => setActivePage(key)}
            >
              {label}
            </button>
          ))}
          <div className="crackit-header-profile" title="Profile">👤</div>
        </nav>
      </header>

      {renderPage()}
    </div>
  );
}

const WrappedApp = () => (
  <MathJaxContext config={MATHJAX_CONFIG}>
    <App />
  </MathJaxContext>
);

export default WrappedApp;  