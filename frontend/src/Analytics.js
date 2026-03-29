import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
const API_BASE = "";

const T = {
  pageBg:      "#E8F4F8",
  cardBg:      "#FFFFFF",
  cardBorder:  "#C8DDE8",
  navBg:       "#B8D4E3",
  textPrimary: "#1A3344",
  textSecond:  "#4A6478",
  textMuted:   "#8AAAB8",
  accents: {
    all:       "#4A7FA5",
    physics:   "#5B6EF5",
    chemistry: "#0A9E84",
    maths:     "#E05A5A",
  },
};

const SUBJECTS = ["all", "physics", "chemistry", "maths"];
const SUBJECT_META = {
  all:       { label: "Overview",    icon: "◈" },
  physics:   { label: "Physics",     icon: "⚛" },
  chemistry: { label: "Chemistry",   icon: "⬡" },
  maths:     { label: "Mathematics", icon: "∑" },
};

const SUBJECT_CHARTS = [
  { key: "accuracy_bar",    cols: 6,  h: 280 },
  { key: "avg_time_bar",    cols: 6,  h: 280 },
  { key: "time_box",        cols: 12, h: 280 },
  { key: "time_vs_correct", cols: 12, h: 280 },
];

const CHART_TITLES = {
  score_donuts_subjects: "Score Distribution",
  accuracy_bar:          "Questions Breakdown",
  accuracy_rate:         "Accuracy Rate",
  avg_time_bar:          "Avg Time / Question",
  time_box:              "Time Distribution",
};

// Plotly layout — light theme, compact margins
const makePlotLayout = (accent, h) => ({
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor:  "rgba(0,0,0,0)",
  font:    { family: "Nunito, sans-serif", color: T.textPrimary, size: 10 },
  margin:  { t: 8, b: 28, l: 32, r: 8 },
  height:  h - 36,
  legend:  { bgcolor: "rgba(0,0,0,0)", font: { color: T.textSecond, size: 9 }, orientation: "v" },
  xaxis:   { gridcolor: "rgba(0,0,0,0.05)", zerolinecolor: "rgba(0,0,0,0.05)", tickfont: { size: 9 } },
  yaxis:   { gridcolor: "rgba(0,0,0,0.05)", zerolinecolor: "rgba(0,0,0,0.05)", tickfont: { size: 9 } },
  colorway: [accent, "#5B6EF5", "#0A9E84", "#E05A5A", "#F59E0B"],
});

const PLOTLY_CONFIG = {
  displaylogo:    false,
  responsive:     true,
  displayModeBar: false,
};

// Helpers
function computeStats(rows, subject) {
  const row = subject === "all"
    ? rows.reduce((acc, r) => ({
        total:       acc.total       + Number(r.total),
        attempted:   acc.attempted   + Number(r.attempted),
        correct:     acc.correct     + Number(r.correct),
        unattempted: acc.unattempted + Number(r.unattempted),
      }), { total: 0, attempted: 0, correct: 0, unattempted: 0 })
    : rows.find((r) => r.subject?.toLowerCase() === subject) ?? {};

  const { total=0, attempted=0, correct=0, unattempted=0 } = row;
  const accuracy = attempted ? ((correct / attempted) * 100).toFixed(1) + "%" : "—";
  const avgTime  = rows.find((r) => r.subject?.toLowerCase() === subject)?.avg_time;

  return {
    total, attempted, correct, unattempted, accuracy,
    avgTime: subject === "all"
      ? "—"
      : avgTime ? avgTime + "s" : "—",
  };
}

async function apiFetchChart(key) {
  const res = await fetch(`${API_BASE}/api/charts/${key}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiFetchSummary() {
  const res = await fetch(`${API_BASE}/api/stats/summary`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // [{subject, total, attempted, correct, incorrect, unattempted, accuracy, avg_time}]
}

// Spinner
function Spinner({ accent }) {
  return (
    <div style={{
      width:        20,
      height:       20,
      border:       `2px solid ${accent}30`,
      borderTop:    `2px solid ${accent}`,
      borderRadius: "50%",
      animation:    "crackit-spin 0.7s linear infinite",
      flexShrink:   0,
    }} />
  );
}

// Stat card
function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      background:    T.cardBg,
      border:        `1.5px solid ${T.cardBorder}`,
      borderRadius:  12,
      padding:       "10px 16px",
      display:       "flex",
      flexDirection: "column",
      gap:           2,
      flex:          1,
      minWidth:      0,
      boxShadow:     "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <span style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1.1, fontFamily: "Nunito, sans-serif" }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 10, color: T.textMuted }}>{sub}</span>}
    </div>
  );
}

// Tab button
function TabButton({ subject, active, onClick, badge }) {
  const accent = T.accents[subject];
  const { label, icon } = SUBJECT_META[subject];
  return (
    <button
      onClick={() => onClick(subject)}
      style={{
        background:  active ? `${accent}18` : T.cardBg,
        border:      `1.5px solid ${active ? accent + "99" : T.cardBorder}`,
        borderRadius: 20,
        padding:     "5px 13px",
        color:       active ? accent : T.textMuted,
        fontFamily:  "Nunito, sans-serif",
        fontSize:    12,
        fontWeight:  active ? 800 : 600,
        cursor:      "pointer",
        display:     "flex",
        alignItems:  "center",
        gap:         5,
        transition:  "all 0.15s",
        whiteSpace:  "nowrap",
        boxShadow:   active ? `0 2px 8px ${accent}28` : "none",
      }}
    >
      <span style={{ fontSize: 11 }}>{icon}</span>
      {label}
      {badge != null && (
        <span style={{
          background:   active ? accent : T.pageBg,
          color:        active ? "#fff" : T.textMuted,
          borderRadius: 10,
          padding:      "0px 6px",
          fontSize:     10,
          fontWeight:   700,
          border:       `1px solid ${active ? "transparent" : T.cardBorder}`,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

//  Chart card
function ChartCard({ chartKey, accent, height }) {
  const [fig,     setFig]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let live = true;
    setLoading(true); setFig(null); setError(null);
    apiFetchChart(chartKey)
      .then((d)  => { if (live) { setFig(d);           setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [chartKey]);

  const mergedLayout = fig
    ? { ...fig.layout, ...makePlotLayout(accent, height) }
    : makePlotLayout(accent, height);

  return (
    <div style={{
      background:    T.cardBg,
      border:        `1.5px solid ${T.cardBorder}`,
      borderRadius:  12,
      padding:       "10px 10px 4px",
      display:       "flex",
      flexDirection: "column",
      height:        height,
      boxSizing:     "border-box",
      overflow:      "hidden",
      boxShadow:     "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, letterSpacing: "0.09em", textTransform: "uppercase" }}>
          {CHART_TITLES[chartKey] ?? chartKey}
        </span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
        {loading && <Spinner accent={accent} />}
        {error   && <div style={{ color: "#E05A5A", fontSize: 10 }}>⚠ {error}</div>}
        {fig && !loading && (
          <Plot
            data={fig.data}
            layout={mergedLayout}
            config={PLOTLY_CONFIG}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        )}
      </div>
    </div>
  );
}

// Strong & Weak Topics Panel
function StrongWeakPanel() {
  const [data,    setData]    = useState({ strong: [], weak: [] });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    fetch(`/api/get-weak-strong-topics/`)  
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const sections = [
    { key: "strong", label: "Strong Topics", icon: "💪", bg: "#22c55e", light: "#f0fdf4", dot: "#22c55e" },
    { key: "weak",   label: "Weak Topics",   icon: "⚠️", bg: "#ef4444", light: "#fef2f2", dot: "#ef4444" },
  ];

  return (
    <div style={{
      background:    T.cardBg,
      border:        `1.5px solid ${T.cardBorder}`,
      borderRadius:  12,
      padding:       "12px",
      display:       "flex",
      flexDirection: "column",
      gap:           8,
      boxShadow:     "0 1px 4px rgba(0,0,0,0.06)",
      height:        "100%",
      boxSizing:     "border-box",
    }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: T.textPrimary, marginBottom: 2 }}>
        Strong &amp; Weak Topics
      </span>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
          <Spinner accent="#22c55e" />                    
        </div>
      )}
      {error && (
        <span style={{ fontSize: 11, color: "#ef4444" }}>⚠ {error}</span>
      )}

      {!loading && !error && sections.map(({ key, label, icon, bg, light, dot }) => (
        <div key={key} style={{
          background:   light,
          borderRadius: 8,
          overflow:     "hidden",
          flex:         1,
        }}>
          {/* Header */}
          <div style={{
            background: bg,
            padding:    "4px 10px",
            display:    "flex",
            alignItems: "center",
            gap:        6,
          }}>
            <span style={{ fontSize: 11 }}>{icon}</span>
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{label}</span>
          </div>

          {/* Items */}
          <div style={{ padding: "4px 10px 6px" }}>
            {data[key].length === 0 ? (
              <div style={{ fontSize: 10, color: T.textSecond, marginTop: 2 }}>
                No data available
              </div>
            ) : (
              data[key].map((item) => (
                <div key={`${item.subject}-${item.topic}`} style={{
                  fontSize:   10,
                  color:      T.textSecond,
                  display:    "flex",
                  alignItems: "center",
                  gap:        5,
                  marginTop:  2,
                }}>
                  <span style={{ color: dot, fontSize: 9 }}>✓</span>
                  <span>
                    <span style={{ fontWeight: 600 }}>{item.topic}</span>
                    <span style={{ color: T.textSecond, opacity: 0.7 }}>
                      {" "}· {item.subject}
                    </span>
                  </span>
                  <span style={{
                    marginLeft: "auto",
                    fontWeight: 700,
                    color:      dot,
                    fontSize:   10,
                  }}>
                    {Math.round(item.ratio * 100)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewLayout({ accent }) {
  const R1 = 230, R2 = 230;
  const GAP = 8;
  const panelH = R1 + R2 + GAP;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
      <div style={{ display: "flex", gap: GAP, alignItems: "stretch" }}>
        <div style={{ flex: "0 0 calc(75% - 4px)", display: "flex", flexDirection: "column", gap: GAP }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: GAP }}>
            <ChartCard chartKey="score_donut_overall" accent={accent} height={R1} />
            <ChartCard chartKey="accuracy_bar"        accent={accent} height={R1} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: GAP }}>
            <ChartCard chartKey="accuracy_rate" accent={accent} height={R2} />
            <ChartCard chartKey="avg_time_bar"  accent={accent} height={R2} />
            <ChartCard chartKey="time_box"      accent={accent} height={R2} />
          </div>

        </div>

        <div style={{ flex: "0 0 calc(25% - 4px)", height: panelH }}>
          <StrongWeakPanel />
        </div>

      </div>
    </div>
  );
}

function SubjectLayout({ accent }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {SUBJECT_CHARTS.map(({ key, cols, h }) => (
        <div key={key} style={cols === 12 ? { gridColumn: "1 / -1" } : {}}>
          <ChartCard chartKey={key} accent={accent} height={h} />
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [tab,        setTab]        = useState("all");
  const [rawRows,    setRawRows]    = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const [rawError,   setRawError]   = useState(null);

  useEffect(() => {
    apiFetchSummary()
      .then((d) => { setRawRows(d); setRawLoading(false); })
      .catch((e) => { setRawError(e.message); setRawLoading(false); });
  }, []);

  const accent = T.accents[tab];
  const stats  = computeStats(rawRows, tab);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        @keyframes crackit-spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }

        /* Root fills parent height — parent must be height: calc(100vh - navbarH) */
        .crackit-analytics {
          margin-top: 55px;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #F5FAFE;
          font-family: 'Nunito', sans-serif;
          color: #1A3344;
          overflow: hidden;   /* overview = no scroll; subject tabs scroll below */
        }
        .crackit-analytics.scrollable {
          overflow-y: auto;
        }
        .crackit-analytics::-webkit-scrollbar       { width: 5px; }
        .crackit-analytics::-webkit-scrollbar-track { background: #D6EAF2; border-radius: 99px; }
        .crackit-analytics::-webkit-scrollbar-thumb { background: #A0C4D8; border-radius: 99px; }
      `}</style>

      <div className={`crackit-analytics${tab !== "all" ? " scrollable" : ""}`}>
        <div style={{ padding: "10px 16px 12px", display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>

          {/* ── Tabs row ── */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            {SUBJECTS.map((s) => (
              <TabButton
                key={s}
                subject={s}
                active={tab === s}
                onClick={setTab}
              />
            ))}
          </div>

          {/* ── Stat cards ── */}
          {!rawLoading && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <StatCard label="Total"     value={stats.total}      accent={accent} />
              <StatCard label="Attempted" value={stats.attempted}  accent={accent} sub={`${stats.unattempted} skipped`} />
              <StatCard label="Correct"   value={stats.correct}    accent={accent} />
              <StatCard label="Accuracy"  value={stats.accuracy}   accent={accent} />
              <StatCard label="Avg Time"  value={stats.avgTime}    accent={accent} sub="per attempted q" />
            </div>
          )}
          {rawError && <p style={{ color: "#E05A5A", fontSize: 11, flexShrink: 0 }}>⚠ {rawError}</p>}

          {/* ── Charts ── */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {tab === "all"
              ? <OverviewLayout accent={accent} />
              : <SubjectLayout  accent={accent} />
            }
          </div>

        </div>
      </div>
    </>
  );
}