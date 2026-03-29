// ─── MainChat.js ─────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath    from 'remark-math';
import rehypeKatex   from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid       from 'mermaid';
import Timer        from './Timer';
import TodoList     from './TodoList';
import PromptEditor from './PromptEditor';
import Watermark    from './watermark';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

function normalizeLatex(text) {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g,  (_, m) => `$$${m.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g,  (_, m) => `$${m.trim()}$`)
    .replace(/(?<!\w)\[([^[\]]*\\[a-zA-Z][^[\]]*)\](?!\w)/g, (_, m) => `$$${m.trim()}$$`)
    .replace(/\$\s+(.*?)\s+\$/g,     (_, m) => `$${m}$`);
}

function parseQuizLink(text) {
  const match = text.match(/\[QUIZ_LINK\]\((.*?)\)/);
  if (!match) return null;
  try {
    const url = new URL(match[1]);
    return {
      subject:   url.searchParams.get('subject'),
      chapter:   url.searchParams.get('chapter'),
      cleanText: text.replace(/\[QUIZ_LINK\]\(.*?\)/, '').trim(),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MermaidDiagram
// ─────────────────────────────────────────────────────────────────────────────

let mermaidInitialized = false;

function MermaidDiagram({ code }) {
  const ref = useRef(null);
  const [svg, setSvg]     = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor:       '#e0f0ff',
          primaryTextColor:   '#1a1a2e',
          primaryBorderColor: '#4a90d9',
          lineColor:          '#4a90d9',
          secondaryColor:     '#f0f4ff',
          tertiaryColor:      '#fff',
          fontSize:           '14px',
        },
      });
      mermaidInitialized = true;
    }

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    setError(false);
    setSvg('');

    mermaid.render(id, code.trim())
      .then(({ svg: rendered }) => setSvg(rendered))
      .catch(() => setError(true));
  }, [code]);

  if (error) {
    return (
      <pre style={{
        background:   '#fff1f0',
        border:       '1px solid #fca5a5',
        borderRadius: 8,
        padding:      '12px 16px',
        fontSize:     13,
        color:        '#b91c1c',
        overflowX:    'auto',
      }}>
        ⚠️ Could not render diagram.{'\n'}{code}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        background:   '#f8fbff',
        border:       '1px solid #dbeafe',
        borderRadius: 12,
        padding:      '16px',
        margin:       '8px 0',
        overflowX:    'auto',
        textAlign:    'center',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThinkingIndicator
// ─────────────────────────────────────────────────────────────────────────────

const THINKING_STEPS = [
  'Reading your question…',
  'Searching documents…',
  'Processing context…',
  'Thinking of answer…',
  'Almost there…',
];

function ThinkingIndicator() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % THINKING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="crackit-thinking">
      <div className="crackit-thinking-dots">
        <span /><span /><span />
      </div>
      <span className="crackit-thinking-text">{THINKING_STEPS[step]}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuizSuggestionWidget
// ─────────────────────────────────────────────────────────────────────────────

function QuizSuggestionWidget({ subject, chapter, onStart, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className="crackit-quiz-widget"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <button className="crackit-quiz-widget__dismiss" onClick={handleDismiss} title="Dismiss">
        x
      </button>

      <div className="crackit-quiz-widget__icon">🎯</div>

      <div className="crackit-quiz-widget__body">
        <div className="crackit-quiz-widget__title">Ready for a Quiz?</div>
        <div className="crackit-quiz-widget__sub">
          You've covered enough of{' '}
          <strong>{chapter || subject || 'this topic'}</strong>. Test yourself!
        </div>
      </div>

      <button
        className="crackit-quiz-widget__btn"
        onClick={() => { onStart(subject, chapter); handleDismiss(); }}
      >
        📝 Take Quiz
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatBox
// ─────────────────────────────────────────────────────────────────────────────
function ChatBox({ messages, onSend }) {
  const [input,             setInput]             = useState('');
  const [listening,         setListening]         = useState(false);
  const [isSpeaking,        setIsSpeaking]        = useState(false);
  const [savingId,          setSavingId]          = useState(null);
  const [showPromptEditor,  setShowPromptEditor]  = useState(false);
  const chatEndRef = useRef(null);

  // ── Per-message translation state ──────────────────────────────────────────
  // translationMap: { [msgIdx]: { language: string, translatedText: string, loading: boolean } }
  const [translationMap, setTranslationMap] = useState({});

  const ttsLanguages = [
    { code: 'en-US', label: 'English'  },
    { code: 'hi-IN', label: 'Hindi'    },
    { code: 'bn-IN', label: 'Bengali'  },
    { code: 'gu-IN', label: 'Gujarati' },
  ];

  // Map TTS locale codes (e.g. "hi-IN") to Azure Translator language codes (e.g. "hi")
  const ttsToTranslatorCode = {
    'en-US': 'en',
    'hi-IN': 'hi',
    'bn-IN': 'bn',
    'gu-IN': 'gu',
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

const audioRef       = useRef(null);
const mediaSourceRef = useRef(null);
const readerRef      = useRef(null);

const handleTextToSpeech = async (text, language) => {
  // ── Stop ──────────────────────────────────────────────────────────────
  if (isSpeaking) {
    setIsSpeaking(false);
    try { readerRef.current?.cancel(); }                          catch {}
    try { audioRef.current?.pause(); audioRef.current.src = ''; } catch {}
    try {
      if (mediaSourceRef.current?.readyState === 'open')
        mediaSourceRef.current.endOfStream();
    }                                                             catch {}
    readerRef.current      = null;
    audioRef.current       = null;
    mediaSourceRef.current = null;
    return;
  }

  // ── Start ─────────────────────────────────────────────────────────────
  if (!text.trim()) return;
  setIsSpeaking(true);

  try {
    const res = await fetch('/api/text-to-speech/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, language }),
    });
    if (!res.ok) { setIsSpeaking(false); return; }

    const mediaSource      = new MediaSource();
    mediaSourceRef.current = mediaSource;
    const audio            = new Audio();
    audioRef.current       = audio;
    audio.src              = URL.createObjectURL(mediaSource);

    audio.onended = () => {
      setIsSpeaking(false);
      audioRef.current = null;
    };

    mediaSource.addEventListener('sourceopen', async () => {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      const reader       = res.body.getReader();
      readerRef.current  = reader;
      audio.play();

      const pump = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (mediaSource.readyState === 'open') mediaSource.endOfStream();
            return;
          }
          if (sourceBuffer.updating)
            await new Promise(r => sourceBuffer.addEventListener('updateend', r, { once: true }));
          sourceBuffer.appendBuffer(value);
          await new Promise(r => sourceBuffer.addEventListener('updateend', r, { once: true }));
          pump();
        } catch {
        }
      };
      pump();
    });

  } catch (err) {
    console.error('TTS error:', err);
    setIsSpeaking(false);
  }
};
  const handleSpeechToText = async () => {
    setListening(true);
    try {
      const res  = await fetch('/api/speech-to-text/', { method: 'POST' });
      const data = await res.json();
      if (data.text) setInput(data.text);
    } catch {
      alert('Speech recognition failed.');
    } finally {
      setListening(false);
    }
  };

  const handleAddToNotes = async (text, idx) => {
    setSavingId(idx);
    try {
      const ctxRes = await fetch('/api/context/');
      const ctx    = await ctxRes.json();

      const res = await fetch('/api/notes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          subject: ctx.subject,
          chapter: ctx.chapter,
          text,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error('Save note error:', err);
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handlePromptApply = async (settings) => {
    await fetch("/api/prompt-settings/", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(settings),
    });
    setShowPromptEditor(false);
  };

  // ── Translate a specific message when its dropdown changes ─────────────────
  const handleLanguageChange = async (msgIdx, originalText, newTtsCode) => {
    const translatorCode = ttsToTranslatorCode[newTtsCode] || 'en';

    // Immediately update the dropdown selection (show loading state)
    setTranslationMap(prev => ({
      ...prev,
      [msgIdx]: {
        language:       newTtsCode,
        translatedText: prev[msgIdx]?.translatedText ?? originalText,
        loading:        true,
      },
    }));

    // If English selected, revert to original — no API call needed
    if (translatorCode === 'en') {
      setTranslationMap(prev => ({
        ...prev,
        [msgIdx]: { language: newTtsCode, translatedText: originalText, loading: false },
      }));
      return;
    }

    try {
      const res = await fetch('/api/translate-text/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: originalText, to_language: translatorCode }),
      });
      const data = await res.json();
      setTranslationMap(prev => ({
        ...prev,
        [msgIdx]: {
          language:       newTtsCode,
          translatedText: data.translated_text ?? originalText,
          loading:        false,
        },
      }));
    } catch {
      // Fallback: revert to original on error
      setTranslationMap(prev => ({
        ...prev,
        [msgIdx]: { language: newTtsCode, translatedText: originalText, loading: false },
      }));
    }
  };

  // Helper: get displayed text for a bot message (translated or original)
  const getDisplayText = (idx, originalText) =>
    translationMap[idx]?.translatedText ?? originalText;

  const getMessageLanguage = (idx) =>
    translationMap[idx]?.language ?? 'en-US';

  const isTranslating = (idx) =>
    translationMap[idx]?.loading === true;

  return (
    <div className="crackit-chatbox">
      <div className="crackit-chat-messages">
        {messages.length === 0 ? (
          <Watermark onAction={(task) => setInput(task)} />
        ) : (
          messages.map((msg, idx) => {
            if (msg.role === 'loading') {
              return (
                <div key={idx} className="crackit-chat-bubble bot">
                  <div className="crackit-chat-bubble-content">
                    <ThinkingIndicator />
                  </div>
                </div>
              );
            }
          const quizLink    = msg.role === 'bot' ? parseQuizLink(msg.text) : null;
          // Always translate from the original English source text
          const originalText = quizLink ? quizLink.cleanText : msg.text;
          const displayText  = msg.role === 'bot' ? getDisplayText(idx, originalText) : originalText;

          return (
            <div key={idx} className={`crackit-chat-bubble ${msg.role}`}>
              <div className="crackit-chat-bubble-content">
                {isTranslating(idx) ? (
                  <span className="crackit-translating-indicator">Translating…</span>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const lang = (className || '').replace('language-', '');
                        const code = String(children).trim();

                        if (!inline && lang === 'mermaid') {
                          return <MermaidDiagram code={code} />;
                        }

                        return inline
                          ? <code className={className} {...props}>{children}</code>
                          : (
                            <pre style={{ overflowX: 'auto' }}>
                              <code className={className} {...props}>{children}</code>
                            </pre>
                          );
                      }
                    }}
                  >
                    {displayText}
                  </ReactMarkdown>
                )}
              </div>

              {msg.role === 'bot' && (
                <div className="crackit-bot-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      className="crackit-bot-action-btn crackit-bot-action-circle"
                      title={isSpeaking ? 'Stop Speech' : 'Text to Speech'}
                      onClick={() => handleTextToSpeech(msg.text, getMessageLanguage(idx))}
                    >
                      {isSpeaking ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect width="24" height="24" rx="12" fill="white"/>
                          <rect x="7" y="7" width="10" height="10" rx="2" fill="#1D1B20"/>
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect width="24" height="24" rx="12" fill="white"/>
                          <path
                            d="M14 20.7251V18.6751C15.5 18.2418 16.7083 17.4084 17.625
                               16.1751C18.5417 14.9418 19 13.5418 19 11.9751C19 10.4084
                               18.5417 9.00843 17.625 7.7751C16.7083 6.54176 15.5 5.70843
                               14 5.2751V3.2251C16.0667 3.69176 17.75 4.7376 19.05
                               6.3626C20.35 7.9876 21 9.85843 21 11.9751C21 14.0918 20.35
                               15.9626 19.05 17.5876C17.75 19.2126 16.0667 20.2584 14
                               20.7251ZM3 15.0001V9.0001H7L12 4.0001V20.0001L7
                               15.0001H3ZM14 16.0001V7.9501C14.7833 8.31676 15.3958
                               8.86676 15.8375 9.6001C16.2792 10.3334 16.5 11.1334 16.5
                               12.0001C16.5 12.8501 16.2792 13.6376 15.8375
                               14.3626C15.3958 15.0876 14.7833 15.6334 14
                               16.0001ZM10 8.8501L7.85 11.0001H5V13.0001H7.85L10
                               15.1501V8.8501Z"
                            fill="#1D1B20"
                          />
                        </svg>
                      )}
                    </button>

                    {/* ── Per-message language dropdown ── */}
                    <select
                      className="crackit-tts-language-dropdown"
                      value={getMessageLanguage(idx)}
                      onChange={e => handleLanguageChange(idx, originalText, e.target.value)}
                      title="Select Language"
                      disabled={isTranslating(idx)}
                    >
                      {ttsLanguages.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="crackit-bot-action-btn crackit-bot-action-circle"
                    title={savingId === idx ? 'Saving…' : 'Add to Notes'}
                    onClick={() => handleAddToNotes(msg.text, idx)}
                    disabled={savingId === idx}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="12" fill={savingId === idx ? '#a8c8d8' : '#d3e6ef'} />
                      <path d="M7 5H17V19L12 16L7 19V5Z" fill={savingId === idx ? '#888' : '#222'} />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
        <div ref={chatEndRef} />
      </div>

      {/* ── PromptEditor panel ── */}
      {showPromptEditor && (
        <>
          <div
            className="crackit-prompt-editor-backdrop"
            onClick={() => setShowPromptEditor(false)}
          />
          <div className="crackit-prompt-editor-panel">
            <PromptEditor onApply={handlePromptApply} />
          </div>
        </>
      )}

      {/* ── Chat input row ── */}
      <div className="crackit-chat-input-row">

        <button
          className={`crackit-chat-attach-btn${showPromptEditor ? ' active' : ''}`}
          title="Edit Prompt"
          onClick={() => setShowPromptEditor(prev => !prev)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.1445 10.0964L6.24451 19.9964H2.00151V15.7534L11.9015 5.85336L16.1445 10.0964ZM15.4375 2.31736C15.625 2.12989 15.8793 2.02458 16.1445 2.02458C16.4097 2.02458 16.664 2.12989 16.8515 2.31736L19.6795 5.14736C19.867 5.33489 19.9723 5.5892 19.9723 5.85436C19.9723 6.11953 19.867 6.37383 19.6795 6.56136L17.5585 8.68136L13.3155 4.43936L15.4375 2.31736ZM3.53051 0.319362C3.56806 0.225117 3.63301 0.144302 3.71698 0.0873682C3.80095 0.0304345 3.90006 0 4.00151 0C4.10296 0 4.20208 0.0304345 4.28604 0.0873682C4.37001 0.144302 4.43496 0.225117 4.47251 0.319362L4.72551 0.931362C5.15021 1.96606 5.95548 2.79853 6.97551 3.25736L7.69351 3.57736C7.78531 3.61984 7.86304 3.6877 7.91751 3.77294C7.97199 3.85817 8.00094 3.95721 8.00094 4.05836C8.00094 4.15952 7.97199 4.25856 7.91751 4.34379C7.86304 4.42902 7.78531 4.49688 7.69351 4.53936L6.93351 4.87736C5.93888 5.32369 5.14755 6.12644 4.71551 7.12736L4.46851 7.69336C4.43006 7.78553 4.36521 7.86426 4.28211 7.91963C4.199 7.97501 4.10137 8.00456 4.00151 8.00456C3.90165 8.00456 3.80402 7.97501 3.72091 7.91963C3.63781 7.86426 3.57296 7.78553 3.53451 7.69336L3.28751 7.12836C2.85544 6.12689 2.0637 5.32373 1.06851 4.87736L0.30851 4.53936C0.216429 4.497 0.138424 4.42913 0.0837436 4.34379C0.029063 4.25845 0 4.15922 0 4.05786C0 3.95651 0.029063 3.85728 0.0837436 3.77193C0.138424 3.68659 0.216429 3.61872 0.30851 3.57636L1.02651 3.25636C2.04673 2.79798 2.85236 1.96587 3.27751 0.931362L3.53051 0.319362Z" fill="#01639E"/>
          </svg>
        </button>

        <button
          className={`crackit-chat-speech-btn${listening ? ' active' : ''}`}
          title={listening ? 'Stop listening' : 'Voice input'}
          onClick={handleSpeechToText}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 14C11.1667 14 10.4583 13.7083 9.875 13.125C9.29167 12.5417 9 11.8333 9 11V5C9 4.16667 9.29167 3.45833 9.875 2.875C10.4583 2.29167 11.1667 2 12 2C12.8333 2 13.5417 2.29167 14.125 2.875C14.7083 3.45833 15 4.16667 15 5V11C15 11.8333 14.7083 12.5417 14.125 13.125C13.5417 13.7083 12.8333 14 12 14ZM11 21V17.925C9.26667 17.6917 7.83333 16.9167 6.7 15.6C5.56667 14.2833 5 12.75 5 11H7C7 12.3833 7.4875 13.5625 8.4625 14.5375C9.4375 15.5125 10.6167 16 12 16C13.3833 16 14.5625 15.5125 15.5375 14.5375C16.5125 13.5625 17 12.3833 17 11H19C19 12.75 18.4333 14.2833 17.3 15.6C16.1667 16.9167 14.7333 17.6917 13 17.925V21H11Z"
              fill={listening ? '#ef4444' : '#566167'}
            />
          </svg>
        </button>

        <input
          type="text"
          className="crackit-chat-input"
          value={input}
          placeholder="Ask a follow up… (e.g., 'What happens if I remove the salt bridge?')"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
        />
        <button className="crackit-chat-send-btn" onClick={handleSend} title="Send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M16.175 13H4V11H16.175L10.575 5.4L12 4L20 12L12 20L10.575 18.6L16.175 13Z"
              fill="#F7F9FF"
            />
          </svg>
        </button>
      </div>

      {listening && (
        <div className="crackit-listening-msg">Microphone is open, speak now…</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MainChat
// ─────────────────────────────────────────────────────────────────────────────
function MainChat({ onQuizStart = () => {} }) {

  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crackit-chat-messages')) || []; }
    catch { return []; }
  });

  const [uploadedFiles, setUploadedFiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crackit-uploaded-files')) || []; }
    catch { return []; }
  });

  const [progress,       setProgress]       = useState(0);
  const [quizSuggestion, setQuizSuggestion] = useState(null);

  useEffect(() => {
    localStorage.setItem('crackit-chat-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('crackit-uploaded-files', JSON.stringify(uploadedFiles));
  }, [uploadedFiles]);

  useEffect(() => {
    fetchProgress();
  }, []);

  useEffect(() => {
    const verify = async () => {
      const saved = localStorage.getItem('crackit-uploaded-files');
      const files = saved ? JSON.parse(saved) : [];
      if (!files.length) return;

      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const res  = await fetch(`/api/files/exists/${file.name}`);
            const data = await res.json();
            if (!data.exists) return null;
            const ext     = file.name.split('.').pop().toLowerCase();
            const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext);
            return {
              ...file,
              previewUrl: isImage ? `/files/${file.name}` : null,
            };
          } catch { return null; }
        })
      );
      setUploadedFiles(results.filter(Boolean));
    };
    verify();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext        = file.name.split('.').pop().toLowerCase();
    const isImage    = ['jpg','jpeg','png','gif','webp','svg'].includes(ext);
    const previewUrl = isImage ? `/files/${file.name}` : null;
    const uploadedAt = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res  = await fetch('/api/upload/', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(prev => [
          ...prev,
          { name: data.filename, checked: false, previewUrl, uploadedAt },
        ]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const debouncedUpdateTicked = useRef(
    debounce((files) => {
      const ticked = files.filter(f => f.checked).map(f => f.name);
      fetch('/api/ticked-files/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ticked_files: ticked }),
      }).catch(err => console.error('Ticked-files sync error:', err));
    }, 300)
  ).current;

  const toggleFileCheck = (idx) => {
    setUploadedFiles(prev => {
      const updated = prev.map((f, i) => i === idx ? { ...f, checked: !f.checked } : f);
      debouncedUpdateTicked(updated);
      return updated;
    });
  };

  const syncTicked = useCallback(async () => {
    const ticked = uploadedFiles.filter(f => f.checked).map(f => f.name);
    try {
      await fetch('/api/ticked-files/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ticked_files: ticked }),
      });
    } catch (err) {
      console.error('Ticked sync error:', err);
    }
  }, [uploadedFiles]);

  useEffect(() => { syncTicked(); }, [syncTicked]);

  const handleChat = async (query) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', text: query },
      { role: 'loading', text: '' },
    ]);
    try {
      const res  = await fetch('/api/chat/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: String(query) }),
      });
      const data = await res.json();

      let text = (data.response && typeof data.response === 'object')
        ? (data.response.content || '[Object]')
        : data.response;

      const quizLink = parseQuizLink(text);
      if (quizLink) {
        setQuizSuggestion({ subject: quizLink.subject, chapter: quizLink.chapter });
      }

      setMessages(prev => [
        ...prev.filter(m => m.role !== 'loading'),
        { role: 'bot', text: normalizeLatex(text) },
      ]);
      fetchProgress();
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev.filter(m => m.role !== 'loading'),
        { role: 'bot', text: 'Something went wrong. Please try again.' },
      ]);
    }
  };

  const handleQuizStart = (subject, chapter) => {
    onQuizStart(subject, chapter);
  };

  function getProgressColor(progress) {
    const hue = Math.round((progress / 100) * 240);
    return `hsl(${hue}, 90%, 55%)`;
  }

  const fetchProgress = async () => {
    try {
      const res  = await fetch('/api/progress/');
      const data = await res.json();
      const raw  = data.progress ?? 0;
      setProgress(raw <= 1 ? Math.round(raw * 100) : raw);
    } catch (err) {
      console.error('Progress fetch error:', err);
    }
  };

  return (
    <div className="crackit-main">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div className="crackit-sidebar">
        <div className="crackit-sidebar-header">
          <span className="crackit-sidebar-title">Your Learning Material</span>
        </div>

        <div className="crackit-sidebar-upload">
          <input
            type="file"
            id="source-upload"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <label htmlFor="source-upload" className="crackit-upload-btn">
            + Add Source
          </label>
        </div>

        <div className="crackit-sidebar-files">
          {uploadedFiles.map((file, idx) => {
            const ext     = file.name.split('.').pop().toLowerCase();
            const isVideo = ['mp4','mov','webm','avi'].includes(ext);
            const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext);
            const isPdf   = ext === 'pdf';
            const fileUrl = `/files/${file.name}`;
            const badge   = isVideo ? { bg: '#A855F7', label: 'VID' }
                          : isImage ? { bg: '#3B82F6', label: 'IMG' }
                          : isPdf   ? { bg: '#EF4444', label: 'PDF' }
                          :           { bg: '#64748B', label: 'DOC' };
            const meta    = file.uploadedAt || file.duration || 'Uploaded';
            return (
              <div
                key={idx}
                className={`crackit-source-card${file.checked ? ' checked' : ''}`}
                onClick={() => toggleFileCheck(idx)}
                title={file.name}
              >
                <div className="crackit-source-thumb">
                  {isImage && (
                    <img
                      src={fileUrl}
                      alt={file.name}
                      className="crackit-source-thumb-img"
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.parentNode.classList.add('thumb-fallback');
                      }}
                    />
                  )}
                  {isPdf && (
                    <div className="crackit-source-thumb-pdf">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5"/>
                        <path d="M14 2v6h6" stroke="#ef4444" strokeWidth="1.5" fill="none"/>
                        <path d="M9 13h6M9 17h4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                  {isVideo && (
                    <div className="crackit-source-thumb-video">
                      <div className="crackit-source-play">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                          <circle cx="14" cy="14" r="14" fill="rgba(255,255,255,0.18)"/>
                          <path d="M11.5 9.5l8 4.5-8 4.5V9.5z" fill="white"/>
                        </svg>
                      </div>
                      <span className="crackit-source-video-label">VIDEO PREVIEW</span>
                    </div>
                  )}
                  {!isImage && !isPdf && !isVideo && (
                    <div className="crackit-source-thumb-doc">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/>
                        <path d="M14 2v6h6" stroke="#94a3b8" strokeWidth="1.5" fill="none"/>
                        <path d="M9 13h6M9 17h4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                  <div className="crackit-source-badge" style={{ background: badge.bg }}>
                    {badge.label}
                  </div>
                  <label className="crackit-source-check-wrap" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="crackit-source-check"
                      checked={file.checked}
                      onChange={() => toggleFileCheck(idx)}
                    />
                  </label>
                </div>
                <div className="crackit-source-info">
                  <span className="crackit-source-name">{file.name}</span>
                  <span className="crackit-source-meta">{meta}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Center – chat only ───────────────────────────────────────────── */}
      <div className="crackit-content">
          <ChatBox
            messages={messages}
            onSend={handleChat}
            onQuizStart={handleQuizStart}
          />
      </div>

      {/* ── Right tools panel ────────────────────────────────────────────── */}
      <div className="crackit-tools">
        <div className="crackit-tools-header">
          <div>
            <div className="crackit-tools-title">Productivity Tools</div>
          </div>
        </div>
        <div className="crackit-tools-body">
          <Timer />
          {quizSuggestion && (
            <QuizSuggestionWidget
              subject={quizSuggestion.subject}
              chapter={quizSuggestion.chapter}
              onStart={handleQuizStart}
              onDismiss={() => setQuizSuggestion(null)}
            />
          )}
          <TodoList />
        </div>
        <hr className="crackit-tools-divider" />
        <break></break>
        <div className="crackit-progress-card crackit-progress-card--static">
          <div className="crackit-progress-header">
            <span className="crackit-progress-title">Progress of current topic</span>
            <span className="crackit-progress-pct">{progress}%</span>
          </div>
          <div className="crackit-progress-track">
            <div
              className="crackit-progress-fill"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(to right, #ef4444, ${getProgressColor(progress)})`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainChat;