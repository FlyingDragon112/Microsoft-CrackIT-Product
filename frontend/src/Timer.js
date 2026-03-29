import React, { useState, useRef, useEffect } from 'react';
import './Timer.css';

const DEFAULT_HOURS   = 0;
const DEFAULT_MINUTES = 25;
const DEFAULT_SECONDS = 0;

function pad(n) { return String(n).padStart(2, '0'); }

function playAlarmSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio failed:', e);
  }
}

function Timer() {
  const [hours,   setHours]   = useState(DEFAULT_HOURS);
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [editing,   setEditing]   = useState(null); // 'h' | 'm' | 's' | null
  const [editVal,   setEditVal]   = useState('');

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isRunning) setRemaining(hours * 3600 + minutes * 60 + seconds);
    // eslint-disable-next-line
  }, [hours, minutes, seconds]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev > 0) return prev - 1;
          clearInterval(intervalRef.current);
          setIsRunning(false);
          playAlarmSound();
          return 0;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning && remaining !== hours * 3600 + minutes * 60 + seconds) {
      setHours(Math.floor(remaining / 3600));
      setMinutes(Math.floor((remaining % 3600) / 60));
      setSeconds(remaining % 60);
    }
    // eslint-disable-next-line
  }, [remaining, isRunning]);

  const displayH = Math.floor(remaining / 3600);
  const displayM = Math.floor((remaining % 3600) / 60);
  const displayS = remaining % 60;

  const handleStart = () => { if (!isRunning && remaining > 0) setIsRunning(true); };
  const handleStop  = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setHours(DEFAULT_HOURS);
    setMinutes(DEFAULT_MINUTES);
    setSeconds(DEFAULT_SECONDS);
    setRemaining(DEFAULT_HOURS * 3600 + DEFAULT_MINUTES * 60 + DEFAULT_SECONDS);
  };

  const handleEdit      = (type, val) => { setEditing(type); setEditVal(pad(val)); };
  const handleEditChange = e => setEditVal(e.target.value.replace(/\D/g, '').slice(0, 2));
  const handleEditBlur  = () => {
    const v = Math.max(0, Math.min(99, parseInt(editVal) || 0));
    if (editing === 'h') setHours(v);
    if (editing === 'm') setMinutes(Math.min(59, v));
    if (editing === 's') setSeconds(Math.min(59, v));
    setEditing(null);
  };
  const handleEditKey = e => { if (e.key === 'Enter') handleEditBlur(); };

  const renderSegment = (type, val) =>
    editing === type ? (
      <input
        key={type}
        type="text"
        value={editVal}
        onChange={handleEditChange}
        onBlur={handleEditBlur}
        onKeyDown={handleEditKey}
        className="timer-edit-input"
        autoFocus
      />
    ) : (
      <span
        key={type}
        className={`timer-segment${isRunning ? ' locked' : ''}`}
        onClick={() => !isRunning && handleEdit(type, val)}
        title={isRunning ? '' : `Edit ${type === 'h' ? 'hours' : type === 'm' ? 'minutes' : 'seconds'}`}
      >
        {pad(val)}
      </span>
    );

  return (
    <div className="timer-card">
      <div className="timer-label">FOCUS SESSION</div>

      <div className="timer-display">
        {renderSegment('h', displayH)}
        <span className="timer-colon">:</span>
        {renderSegment('m', displayM)}
        <span className="timer-colon">:</span>
        {renderSegment('s', displayS)}
      </div>

      <div className="timer-actions">
        {isRunning ? (
          <button className="timer-btn timer-btn--stop" onClick={handleStop}>
            Pause Session
          </button>
        ) : (
          <button
            className="timer-btn timer-btn--start"
            onClick={handleStart}
            disabled={remaining === 0}
          >
            {remaining < totalSeconds && remaining > 0 ? 'Resume Session' : 'Start Session'}
          </button>
        )}
        <button className="timer-btn-reset" onClick={handleReset} title="Reset">
          ↺
        </button>
      </div>
    </div>
  );
}

export default Timer;