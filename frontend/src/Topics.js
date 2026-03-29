import React, { useState, useEffect } from "react";
import "./Topics.css";

// ── Icons ────────────────────────────────────────────────────────────────────

const CheckIcon = ({ color }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 7.5L6 11.5L13 3.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 7.5H12" stroke="#A9B3BB" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="12" height="8" viewBox="0 0 12 8" fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`chevron-icon ${open ? "open" : ""}`}
  >
    <path d="M1 1L6 6.5L11 1" stroke="#566167" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Status Cell ──────────────────────────────────────────────────────────────

const StatusCell = ({ status, accentColor, bgColor }) => (
  <div className="status-cell">
    <div className={`status-box ${!status ? "status-box--empty" : ""}`} style={status ? { background: bgColor } : {}}>
      {status ? <CheckIcon color={accentColor} /> : <DashIcon />}
    </div>
  </div>
);

// ── Rows ─────────────────────────────────────────────────────────────────────

const SubtopicRow = ({ name, studied, quiz, accentColor, bgColor }) => (
  <div className="subtopic-row">
    <div className="subtopic-name">{name}</div>
    <StatusCell status={studied} accentColor={accentColor} bgColor={bgColor} />
    <StatusCell status={quiz}    accentColor="#006E3D"     bgColor="rgba(0, 110, 61, 0.10)" />
  </div>
);

const TopicGroup = ({ name, subtopics, accentColor, bgColor }) => (
  <>
    <div className="topic-group-header">
      <span className="topic-group-name" style={{ color: accentColor }}>{name}</span>
    </div>
    {subtopics.map((sub, i) => (
      <SubtopicRow key={i} {...sub} accentColor={accentColor} bgColor={bgColor} />
    ))}
  </>
);

// ── Subject Config (colors only, data comes from API) ────────────────────────

const SUBJECT_CONFIG = {
  physics: {
    label:       "Physics",
    accentColor: "#00639E",
    iconBg:      "rgba(0, 99, 158, 0.10)",
    headerBg:    "rgba(238, 244, 250, 0.40)",
  },
  chemistry: {
    label:       "Chemistry",
    accentColor: "#006E3D",
    iconBg:      "rgba(0, 110, 61, 0.10)",
    headerBg:    "rgba(240, 250, 245, 0.40)",
  },
  maths: {
    label:       "Mathematics",
    accentColor: "#006595",
    iconBg:      "rgba(0, 101, 149, 0.10)",
    headerBg:    "rgba(238, 247, 250, 0.40)",
  },
};

// ── Transform API rows → subject cards ───────────────────────────────────────

function transformToSubjects(rows) {
  const subjectMap = {};

  rows.forEach(({ subject, chapter, topic, studied, quiz }) => {
    if (!subjectMap[subject]) {
      subjectMap[subject] = {};
    }
    if (!subjectMap[subject][chapter]) {
      subjectMap[subject][chapter] = [];
    }
    subjectMap[subject][chapter].push({ name: topic, studied: !!studied, quiz: !!quiz });
  });

  return Object.entries(subjectMap).map(([key, chapters]) => ({
    key,
    ...SUBJECT_CONFIG[key],
    groups: Object.entries(chapters).map(([chapter, subtopics]) => ({
      name: chapter,
      subtopics,
    })),
    get status() {
      const all     = this.groups.flatMap(g => g.subtopics);
      const studied = all.filter(t => t.studied).length;
      return `${Math.round((studied / all.length) * 100)}% Studied`;
    },
  }));
}

// ── Subject Card ─────────────────────────────────────────────────────────────

const SubjectCard = ({ subject }) => {
  const [open, setOpen] = useState(false);
 
  return (
    <div className="subject-card" style={{ maxHeight: open ? "500px" : "auto" }}>
      <button
        className="subject-header"
        style={{ background: open ? subject.headerBg : "white" }}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
      >
        <div className="subject-header__left">
          <div className="subject-icon" style={{ background: subject.iconBg }}>
            <CheckIcon color={subject.accentColor} />
          </div>
          <span className="subject-title">{subject.label}</span>
        </div>
        <div className="subject-header__right">
          <span className="subject-status" style={{ color: subject.accentColor }}>
            {subject.status}
          </span>
          <ChevronIcon open={open} />
        </div>
      </button>
 
      {open && (
        <div className="subject-body">
          <div className="table-header-row">
            <div className="col-topic">Topic / Subtopic</div>
            <div className="col-status">Studied</div>
            <div className="col-status">Quiz Taken</div>
          </div>
          {subject.groups.map((group, i) => (
            <TopicGroup
              key={i}
              name={group.name}
              subtopics={group.subtopics}
              accentColor={subject.accentColor}
              bgColor={subject.iconBg}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function SubjectMastery() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(`/api/get-all-topics/`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load topics.");
        return res.json();
      })
      .then(data => {
        setSubjects(transformToSubjects(data));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="subject-mastery">Loading topics...</div>;
  if (error)   return <div className="subject-mastery">{error}</div>;

  return (
    <div className="subject-mastery">
      <div className="subject-list">
        {subjects.map((subject, i) => (
          <SubjectCard key={i} subject={subject} />
        ))}
      </div>
    </div>
  );
}