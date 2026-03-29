import React, { useState, useEffect } from 'react';
import './TodoList.css';

const STORAGE_KEY = 'crackit-todos';

function TodoList() {
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [editingIdx, setEditingIdx] = useState(null);
  const [editVal,    setEditVal]    = useState('');

  // Persist to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    const newIdx = todos.length;
    setTodos(prev => [...prev, { text: '', done: false }]);
    setEditingIdx(newIdx);
    setEditVal('');
  };

  const toggleTodo = idx => {
    setTodos(prev => prev.map((t, i) => i === idx ? { ...t, done: !t.done } : t));
  };

  const commitEdit = (idx, val) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setTodos(prev => prev.filter((_, i) => i !== idx));
    } else {
      setTodos(prev => prev.map((t, i) => i === idx ? { ...t, text: trimmed } : t));
    }
    setEditingIdx(null);
  };

  const removeTodo = (e, idx) => {
    e.stopPropagation();
    setTodos(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  return (
    <div className="todo-section">

      {/* ── Header ── */}
      <div className="todo-header">
        <span className="todo-header-label">QUICK TASKS</span>
        <button className="todo-add-btn" onClick={addTodo} title="Add task">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5"/>
            <path d="M8 5v6M5 8h6" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Task list ── */}
      <div className="todo-list">
        {todos.length === 0 && (
          <div className="todo-empty">No tasks yet — click + to add one</div>
        )}
        {todos.map((todo, idx) => (
          <div
            key={idx}
            className={`todo-item${todo.done ? ' todo-item--done' : idx === todos.findIndex(t => !t.done) ? ' todo-item--active' : ''}`}
            onClick={() => editingIdx !== idx && toggleTodo(idx)}
          >
            {/* Circle checkbox */}
            <div className={`todo-check${todo.done ? ' todo-check--done' : ''}`}>
              {todo.done && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            {/* Label / edit input */}
            {editingIdx === idx ? (
              <input
                type="text"
                className="todo-edit-input"
                value={editVal}
                autoFocus
                onChange={e => setEditVal(e.target.value)}
                onBlur={() => commitEdit(idx, editVal)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit(idx, editVal);
                  if (e.key === 'Escape') { setEditingIdx(null); setTodos(p => p.filter((_, i) => i !== idx || p[i].text)); }
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className="todo-text"
                onDoubleClick={e => { e.stopPropagation(); setEditingIdx(idx); setEditVal(todo.text); }}
              >
                {todo.text || <span className="todo-placeholder">New task…</span>}
              </span>
            )}

            {/* Remove × */}
            <button
              className="todo-remove-btn"
              onClick={e => removeTodo(e, idx)}
              title="Remove"
            >x</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TodoList;