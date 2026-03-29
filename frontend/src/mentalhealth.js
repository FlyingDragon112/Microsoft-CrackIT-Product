import { useState, useEffect, useRef } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .mh-root {
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    background: #EDF6FF;
    color: #2A343A;
  }

  .mh-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px 16px;
  }

  .mh-container {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .mh-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .mh-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 24px;
    font-weight: 800;
    line-height: 1.2;
    color: #2A343A;
  }

  .mh-subtitle {
    font-size: 13px;
    color: #566167;
    line-height: 1.5;
    max-width: 360px;
  }

  .mh-options { width: 100%; display: flex; flex-direction: column; gap: 7px; }

  .mh-option {
    width: 100%;
    padding: 11px 14px;
    background: rgba(255,255,255,0.82);
    border-radius: 14px;
    border: 1.5px solid rgba(255,255,255,0.55);
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    backdrop-filter: blur(4px);
    text-align: left;
    outline: none;
  }

  .mh-option:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0,0,0,0.09);
    background: rgba(255,255,255,0.96);
  }

  .mh-option.selected {
    border-color: #00639E;
    box-shadow: 0 0 0 2px rgba(0,99,158,0.2), 0 4px 14px rgba(0,0,0,0.08);
    background: white;
  }

  .mh-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
  }

  .icon-green  { background: rgba(136,249,176,0.28); }
  .icon-blue   { background: rgba(94,177,251,0.28); }
  .icon-gray   { background: #D9E4EC; }
  .icon-lblue  { background: rgba(116,195,254,0.28); }

  .mh-option-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #2A343A;
    margin-bottom: 1px;
  }

  .mh-option-desc { font-size: 11px; color: #566167; line-height: 1.4; }

  .mh-banner {
    width: 100%;
    padding: 8px 16px;
    background: rgba(94,177,251,0.38);
    border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #002E4E;
    font-weight: 500;
    backdrop-filter: blur(12px);
  }

  .mh-panel {
    width: 100%;
    padding: 20px;
    background: rgba(217,228,236,0.80);
    border-radius: 18px;
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mh-tags { display: flex; flex-wrap: wrap; gap: 7px; }

  .mh-tag {
    padding: 5px 13px;
    background: white;
    border-radius: 9999px;
    border: 1px solid rgba(169,179,187,0.25);
    font-size: 11px;
    color: #566167;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    outline: none;
  }

  .mh-tag:hover { background: #e8f4fd; color: #00639E; }
  .mh-tag.selected { background: #00639E; color: white; border-color: #00639E; }

  .mh-textarea-wrap { position: relative; }

  .mh-textarea {
    width: 100%;
    padding: 10px 40px 10px 14px;
    background: white;
    border-radius: 12px;
    border: 1.5px solid rgba(169,179,187,0.2);
    font-size: 12px;
    font-family: 'Inter', sans-serif;
    color: #2A343A;
    resize: none;
    outline: none;
    min-height: 52px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    transition: border-color 0.15s;
  }

  .mh-textarea:focus { border-color: rgba(0,99,158,0.35); }
  .mh-textarea::placeholder { color: rgba(114,124,131,0.6); }

  .mh-edit-icon {
    position: absolute;
    right: 12px;
    top: 10px;
    font-size: 14px;
    color: #A9B3BB;
    pointer-events: none;
  }

  .mh-btn {
    padding: 9px 28px;
    background: linear-gradient(90deg, #00639E 0%, #005080 100%);
    border-radius: 14px;
    border: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #F7F9FF;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s;
    box-shadow: 0 4px 14px rgba(0,99,158,0.22);
    outline: none;
  }

  .mh-btn:hover { opacity: 0.91; transform: translateY(-1px); }
  .mh-btn:active { transform: scale(0.98); }

  .mh-calm-card {
    width: 100%;
    padding: 20px;
    background: rgba(213,229,240,0.70);
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.28);
    backdrop-filter: blur(6px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
  }

  .mh-calm-card::before {
    content: '';
    position: absolute;
    width: 160px; height: 160px;
    left: -50px; top: -50px;
    background: rgba(94,177,251,0.16);
    border-radius: 50%;
    filter: blur(24px);
    pointer-events: none;
  }

  .mh-calm-card::after {
    content: '';
    position: absolute;
    width: 180px; height: 180px;
    right: -40px; bottom: -50px;
    background: rgba(136,249,176,0.16);
    border-radius: 50%;
    filter: blur(24px);
    pointer-events: none;
  }

  .mh-calm-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .mh-eyebrow {
    font-size: 10px;
    font-weight: 600;
    color: #00639E;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .mh-calm-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 20px;
    font-weight: 800;
    color: #2A343A;
    text-align: center;
  }

  .mh-calm-desc {
    font-size: 12px;
    color: #566167;
    text-align: center;
    line-height: 1.55;
    max-width: 340px;
  }

  .mh-breath-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin: 4px 0;
  }

  .mh-breath-circle {
    width: 130px;
    height: 130px;
    border-radius: 50%;
    border: 7px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  }

  .mh-breath-inner {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 3.8s cubic-bezier(0.45,0,0.55,1), background 3.8s ease;
    background: rgba(0,99,158,0.12);
  }

  .mh-breath-inner.inhale  { transform: scale(1.22); background: rgba(0,99,158,0.24); }
  .mh-breath-inner.hold    { transform: scale(1.22); background: rgba(0,99,158,0.18); }
  .mh-breath-inner.exhale  { transform: scale(1.0);  background: rgba(0,99,158,0.08); }

  .mh-breath-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #00639E;
    user-select: none;
  }

  .mh-phases {
    display: flex;
    gap: 12px;
    padding: 5px 16px;
    background: white;
    border-radius: 9999px;
    box-shadow: 0 1px 5px rgba(0,0,0,0.07);
  }

  .mh-phase {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #C4CDD4;
    transition: color 0.3s;
  }

  .mh-phase.active { color: #00639E; }

  .mh-steps { width: 100%; display: flex; flex-direction: column; gap: 7px; }

  .mh-step {
    padding: 14px 16px;
    background: rgba(255,255,255,0.85);
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.5);
    backdrop-filter: blur(2px);
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .mh-step-icon {
    width: 30px; height: 30px;
    border-radius: 15px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    margin-bottom: 8px;
  }

  .mh-step-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #2A343A;
    margin-bottom: 4px;
  }

  .mh-step-desc {
    font-size: 11px;
    color: #566167;
    line-height: 1.55;
    margin-bottom: 8px;
  }

  .mh-step-cta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    outline: none;
    transition: opacity 0.15s;
  }

  .mh-step-cta:hover { opacity: 0.75; }
  .cta-blue  { color: #00639E; }
  .cta-green { color: #006E3D; }
  .cta-lblue { color: #006595; }

  .mh-quote {
    width: 100%;
    padding: 20px 24px;
    background: rgba(94,177,251,0.13);
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.28);
    backdrop-filter: blur(6px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .mh-quote-text {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #002E4E;
    text-align: center;
    line-height: 1.55;
  }

  .mh-quote-attr { display: flex; align-items: center; gap: 8px; }
  .mh-quote-line { width: 24px; height: 2px; background: rgba(0,99,158,0.28); }
  .mh-quote-name { font-size: 11px; color: #566167; font-weight: 500; }

  .mh-fade-enter { animation: mhFadeIn 0.38s ease forwards; }
  @keyframes mhFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .mh-section-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #2A343A;
    margin-bottom: 8px;
    padding-left: 2px;
    width: 100%;
  }
`;

const BREATH_PHASES = [
  { label: "Inhale", cls: "inhale", key: "inhale" },
  { label: "Hold",   cls: "hold",   key: "hold"   },
  { label: "Exhale", cls: "exhale", key: "exhale" },
];

const TAGS = [
  "Upcoming exam/quiz",
  "Too much syllabus left",
  "Distracted",
  "Fear of failing",
  "Social comparison",
  "Lack of sleep",
];

function Page1({ onNext }) {
  const [selected, setSelected] = useState(null);

  const options = [
    { id: "energized", icon: "🌿", iconClass: "icon-green", label: "I'm still Energized!", desc: "Ready to tackle complex problems." },
    { id: "flowing",   icon: "💧", iconClass: "icon-blue",  label: "Flowing",              desc: "In the zone and maintaining pace." },
    { id: "stuck",     icon: "🧩", iconClass: "icon-gray",  label: "Feeling a bit stuck",  desc: "A challenge is slowing me down." },
    { id: "break",     icon: "☁️", iconClass: "icon-lblue", label: "Need a break",         desc: "Mind feels full, time to recharge." },
  ];

  const handleClick = (id) => {
    setSelected(id);
    setTimeout(onNext, 260);
  };

  return (
    <div className="mh-page">
      <div className="mh-container mh-fade-enter">
        <div className="mh-header">
          <h1 className="mh-title">How are you feeling right now?</h1>
          <p className="mh-subtitle">Take a moment to check in with yourself before your next deep work session.</p>
        </div>
        <div className="mh-options">
          {options.map((opt) => (
            <button
              key={opt.id}
              className={`mh-option${selected === opt.id ? " selected" : ""}`}
              onClick={() => handleClick(opt.id)}
            >
              <div className={`mh-icon ${opt.iconClass}`}>{opt.icon}</div>
              <div>
                <div className="mh-option-label">{opt.label}</div>
                <div className="mh-option-desc">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="mh-banner">
          <span style={{ fontSize: 13 }}>💡</span>
          <span>We'll adjust your study plan based on your energy level.</span>
        </div>
      </div>
    </div>
  );
}

function Page2({ onNext }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [text, setText] = useState("");

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  return (
    <div className="mh-page">
      <div className="mh-container mh-fade-enter">
        <div className="mh-header">
          <h1 className="mh-title">What's making you feel this way?</h1>
          <p className="mh-subtitle">
            Take a moment to name the pressure. Understanding it is the first step to clearing it.
          </p>
        </div>
        <div className="mh-panel">
          <div className="mh-tags">
            {TAGS.map((tag) => (
              <button
                key={tag}
                className={`mh-tag${selectedTags.includes(tag) ? " selected" : ""}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="mh-textarea-wrap">
            <textarea
              className="mh-textarea"
              placeholder="Or type your own thoughts here..."
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="mh-edit-icon">✏️</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="mh-btn" onClick={onNext}>Reflect &amp; Breathe</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const intervalRef = useRef(null);

  const stop = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setPhaseIdx(0);
  };

  const start = () => {
    if (running) { stop(); return; }
    setRunning(true);
    setPhaseIdx(0);
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % 3;
      setPhaseIdx(idx);
    }, 4000);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const currentPhase = BREATH_PHASES[phaseIdx];

  return (
    <div className="mh-breath-wrap">
      <div className="mh-breath-circle">
        <div className={`mh-breath-inner${running ? " " + currentPhase.cls : ""}`}>
          <span className="mh-breath-label">{currentPhase.label}</span>
        </div>
      </div>
      <div className="mh-phases">
        {BREATH_PHASES.map((p) => (
          <span key={p.key} className={`mh-phase${running && currentPhase.key === p.key ? " active" : ""}`}>
            {p.label}
          </span>
        ))}
      </div>
      <button className="mh-btn" onClick={start} style={{ marginTop: 2 }}>
        {running ? "⏸ Stop" : "▶ Start Breathing"}
      </button>
    </div>
  );
}

function Page3() {
  const steps = [
    { iconClass: "icon-blue",  icon: "📚", title: "Micro-Learning",  desc: "Break your complex physics topic into 4 smaller parts to reduce anxiety.",    cta: "Let's divide", ctaClass: "cta-blue"  },
    { iconClass: "icon-green", icon: "🃏", title: "Smart Revision",  desc: "Generate 10 AI flashcards for the formulas you missed in the last session.",  cta: "Generate now", ctaClass: "cta-green" },
    { iconClass: "icon-lblue", icon: "🚶", title: "Physical Break",  desc: "Take a 5-minute walk. Movement boosts neuroplasticity.",                       cta: "Set timer",    ctaClass: "cta-lblue" },
  ];

  return (
    <div className="mh-page" style={{ alignItems: "flex-start", paddingTop: 24, marginTop: 70}}>
      <div className="mh-container mh-fade-enter" style={{ maxWidth: 860 }}>

        {/* Two-column row: breathing left, steps right */}
        <div style={{ display: "flex", gap: 14, width: "100%", alignItems: "stretch" }}>

          {/* Left — breathing card */}
          <div className="mh-calm-card" style={{ flex: "0 0 340px" }}>
            <div className="mh-calm-inner">
              <span className="mh-eyebrow">Guided Calm</span>
              <h2 className="mh-calm-title">AI Sanctuary Support</h2>
              <p className="mh-calm-desc">
                Take a moment to reset. Your cognitive load is high, and your mind deserves a pause.
              </p>
              <BreathingExercise />
            </div>
          </div>

          {/* Right — next steps */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <h3 className="mh-section-title" style={{ marginBottom: 2 }}>Personalized Next Steps</h3>
            <div className="mh-steps" style={{ gap: 8 }}>
              {steps.map((s) => (
                <div key={s.title} className="mh-step">
                  <div className={`mh-step-icon ${s.iconClass}`}>{s.icon}</div>
                  <div className="mh-step-title">{s.title}</div>
                  <div className="mh-step-desc">{s.desc}</div>
                  <button className={`mh-step-cta ${s.ctaClass}`}>
                    {s.cta} <span style={{ fontSize: 9 }}>▶</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Quote — full width below */}
        <div className="mh-quote">
          <span style={{ fontSize: 16, color: "#00639E" }}>✦</span>
          <p className="mh-quote-text">
            "Your progress is not measured by the hours of stress, but by the clarity of your understanding. You are doing enough."
          </p>
          <div className="mh-quote-attr">
            <span className="mh-quote-line" />
            <span className="mh-quote-name">Sanctuary Wisdom</span>
            <span className="mh-quote-line" />
          </div>
        </div>

      </div>
    </div>
  );
}

export default function MentalHealthFlow() {
  const [page, setPage] = useState(1);

  const goTo = (n) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="mh-root">
        {page === 1 && <Page1 onNext={() => goTo(2)} />}
        {page === 2 && <Page2 onNext={() => goTo(3)} />}
        {page === 3 && <Page3 />}
      </div>
    </>
  );
}