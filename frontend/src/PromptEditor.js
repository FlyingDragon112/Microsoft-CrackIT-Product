import React, { useState, useEffect } from "react";
import "./PromptEditor.css";

const LEARNING_GOALS = ["Understand Concept", "Practice for Exam", "Quick Revision"];
const OUTPUT_DEPTHS = ["One Liner", "Default", "One Paragraph", "Bulleted"];

export default function PromptEditor({ onApply }) {
  const [learningGoal, setLearningGoal] = useState("Understand Concept");
  const [outputDepth, setOutputDepth] = useState("Default");
  const [pyqRecommendation, setPyqRecommendation] = useState("No");
  const [realLifeApplication, setRealLifeApplication] = useState("No");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/prompt-settings/");
        const data = await res.json();

        // ✅ Set state from backend response
        if (data.learningGoal) setLearningGoal(data.learningGoal);
        if (data.outputDepth) setOutputDepth(data.outputDepth);
        if (data.pyqRecommendation) setPyqRecommendation(data.pyqRecommendation);
        if (data.realLifeApplication) setRealLifeApplication(data.realLifeApplication);
      } catch (err) {
        console.error("Failed to fetch prompt settings:", err);
      }
    };

    fetchSettings();
  }, []);

  const handleApply = () => {
    if (onApply) {
      onApply({ learningGoal, outputDepth, pyqRecommendation, realLifeApplication });
    }
  };

  return (
    <div className="pe-card">
      {/* Header */}
      <div className="pe-header">
        <span className="pe-header-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="3" width="16" height="2.5" rx="1.25" fill="#00639E" />
            <rect x="2" y="8.75" width="11" height="2.5" rx="1.25" fill="#00639E" />
            <rect x="2" y="14.5" width="13" height="2.5" rx="1.25" fill="#00639E" />
          </svg>
        </span>
        <span className="pe-header-label">PROMPT SETTINGS</span>
      </div>

      <div className="pe-body">
        {/* Learning Goal */}
        <div className="pe-section">
          <div className="pe-section-label">Learning Goal</div>
          <div className="pe-pill-group">
            {LEARNING_GOALS.map((goal) => (
              <button
                key={goal}
                className={`pe-pill ${learningGoal === goal ? "pe-pill--active" : ""}`}
                onClick={() => setLearningGoal(goal)}
                type="button"
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Output Depth */}
        <div className="pe-section">
          <div className="pe-section-label">Output Depth</div>
          <div className="pe-pill-group">
            {OUTPUT_DEPTHS.map((depth) => (
              <button
                key={depth}
                className={`pe-pill ${outputDepth === depth ? "pe-pill--active" : ""}`}
                onClick={() => setOutputDepth(depth)}
                type="button"
              >
                {depth}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles + Apply Row */}
        <div className="pe-bottom-row">
          <div className="pe-toggle-group">
            <div className="pe-section-label">PYQ Recommendation for Topic</div>
            <Toggle value={pyqRecommendation} onChange={setPyqRecommendation} />
          </div>

          <div className="pe-toggle-group">
            <div className="pe-section-label">Include Real Life Application</div>
            <Toggle value={realLifeApplication} onChange={setRealLifeApplication} />
          </div>

          <button className="pe-apply-btn" onClick={handleApply} type="button">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div className="pe-toggle">
      <button
        className={`pe-toggle-option ${value === "Yes" ? "pe-toggle-option--active" : ""}`}
        onClick={() => onChange("Yes")}
        type="button"
      >
        Yes
      </button>
      <button
        className={`pe-toggle-option ${value === "No" ? "pe-toggle-option--active" : ""}`}
        onClick={() => onChange("No")}
        type="button"
      >
        No
      </button>
    </div>
  );
}