import React from 'react';
import './watermark.css';

const Watermark = ({ onAction, onModeChange })   => {
  return (
    <div className="tutor-container">
      {/* Header */}
      <header className="tutor-header">
        <h1 className="tutor-title">What shall we master today?</h1>
        <p className="tutor-subtitle">
          Your personalized tutor is ready to help you dive deep into<br />your materials.
        </p>
      </header>

      {/* Options */}
      <div className="tutor-options-list">
        <div className="tutor-card" onClick={() => onAction('Explain the given PDF')}>
          <div className="card-icon" style={{ backgroundColor: "#FEF2F2" }}>
            {/* SVG icon here */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10.5H8V8.5H9C9.28333 8.5 9.52083 8.40417 9.7125 8.2125C9.90417 8.02083 10 7.78333 10 7.5V6.5C10 6.21667 9.90417 5.97917 9.7125 5.7875C9.52083 5.59583 9.28333 5.5 9 5.5H7V10.5V10.5M8 7.5V6.5H9V7.5H8V7.5M11 10.5H13C13.2833 10.5 13.5208 10.4042 13.7125 10.2125C13.9042 10.0208 14 9.78333 14 9.5V6.5C14 6.21667 13.9042 5.97917 13.7125 5.7875C13.5208 5.59583 13.2833 5.5 13 5.5H11V10.5V10.5M12 9.5V6.5H13V9.5H12V9.5M15 10.5H16V8.5H17V7.5H16V6.5H17V5.5H15V10.5V10.5M6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6V16M6 14H18V14V14V2V2V2H6V2V2V14V14V14V14M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18V18V18H16V20H2V20M6 2V2V2V2V14V14V14V14V14V14V2V2V2V2" fill="#DC2626"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-title">Explain my uploaded PDF</div>
            <div className="card-desc">Analyze Electrochem_Notes.pdf</div>
          </div>
          <div className="arrow-icon" />
        </div>

        <div className="tutor-card" onClick={() => onAction('Summarize my handwritten notes')}>
          <div className="card-icon" style={{ backgroundColor: "#EFF6FF" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 6C5.28333 6 5.52083 5.90417 5.7125 5.7125C5.90417 5.52083 6 5.28333 6 5C6 4.71667 5.90417 4.47917 5.7125 4.2875C5.52083 4.09583 5.28333 4 5 4C4.71667 4 4.47917 4.09583 4.2875 4.2875C4.09583 4.47917 4 4.71667 4 5C4 5.28333 4.09583 5.52083 4.2875 5.7125C4.47917 5.90417 4.71667 6 5 6V6M5 10C5.28333 10 5.52083 9.90417 5.7125 9.7125C5.90417 9.52083 6 9.28333 6 9C6 8.71667 5.90417 8.47917 5.7125 8.2875C5.52083 8.09583 5.28333 8 5 8C4.71667 8 4.47917 8.09583 4.2875 8.2875C4.09583 8.47917 4 8.71667 4 9C4 9.28333 4.09583 9.52083 4.2875 9.7125C4.47917 9.90417 4.71667 10 5 10V10M5 14C5.28333 14 5.52083 13.9042 5.7125 13.7125C5.90417 13.5208 6 13.2833 6 13C6 12.7167 5.90417 12.4792 5.7125 12.2875C5.52083 12.0958 5.28333 12 5 12C4.71667 12 4.47917 12.0958 4.2875 12.2875C4.09583 12.4792 4 12.7167 4 13C4 13.2833 4.09583 13.5208 4.2875 13.7125C4.47917 13.9042 4.71667 14 5 14V14M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H13L18 5V16C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2V18M2 16H16V16V16V6H12V2H2V2V2V16V16V16V16M2 2V2V6V6V2V6V6V16V16V16V16V16V16V2V2V2V2" fill="#2563EB"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-title">Summarize handwritten notes</div>
            <div className="card-desc">Get the key concepts quickly</div>
          </div>
          <div className="arrow-icon" />
        </div>

        <div className="tutor-card">
          <div className="card-icon" style={{ backgroundColor: "#FAF5FF" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 13C12.2833 13 12.5292 12.8958 12.7375 12.6875C12.9458 12.4792 13.05 12.2333 13.05 11.95C13.05 11.6667 12.9458 11.4208 12.7375 11.2125C12.5292 11.0042 12.2833 10.9 12 10.9C11.7167 10.9 11.4708 11.0042 11.2625 11.2125C11.0542 11.4208 10.95 11.6667 10.95 11.95C10.95 12.2333 11.0542 12.4792 11.2625 12.6875C11.4708 12.8958 11.7167 13 12 13V13M11.25 9.8H12.75C12.75 9.31667 12.8 8.9625 12.9 8.7375C13 8.5125 13.2333 8.21667 13.6 7.85C14.1 7.35 14.4333 6.94583 14.6 6.6375C14.7667 6.32917 14.85 5.96667 14.85 5.55C14.85 4.8 14.5875 4.1875 14.0625 3.7125C13.5375 3.2375 12.85 3 12 3C11.3167 3 10.7208 3.19167 10.2125 3.575C9.70417 3.95833 9.35 4.46667 9.15 5.1L10.5 5.65C10.65 5.23333 10.8542 4.92083 11.1125 4.7125C11.3708 4.50417 11.6667 4.4 12 4.4C12.4 4.4 12.725 4.5125 12.975 4.7375C13.225 4.9625 13.35 5.26667 13.35 5.65C13.35 5.88333 13.2833 6.10417 13.15 6.3125C13.0167 6.52083 12.7833 6.78333 12.45 7.1C11.9 7.58333 11.5625 7.9625 11.4375 8.2375C11.3125 8.5125 11.25 9.03333 11.25 9.8V9.8M6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6V16M6 14H18V14V14V2V2V2H6V2V2V14V14V14V14M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18V18V18H16V20H2V20M6 2V2V2V2V14V14V14V14V14V14V2V2V2V2" fill="#9333EA"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-title">Start a Practice Quiz</div>
            <div className="card-desc">Test your knowledge on Redox</div>
          </div>
          <div className="arrow-icon" />
        </div>

        <div className="tutor-card">
          <div className="card-icon" style={{ backgroundColor: "#FFFBEB" }}>
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.4 12L0 10.6L7.4 3.15L11.4 7.15L16.6 2H14V0H20V6H18V3.4L11.4 10L7.4 6L1.4 12V12" fill="#D97706"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-title">Review Weak Areas</div>
            <div className="card-desc">Based on your recent quiz scores</div>
          </div>
          <div className="arrow-icon" />
        </div>
      </div>
    </div>
  );
};

export default Watermark;