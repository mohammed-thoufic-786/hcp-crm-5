import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendChatMessage, addUserMessage, clearChat } from '../store/chatSlice';
import { populateFromChat, clearMappedHighlight } from '../store/interactionSlice';
import './ChatInterface.css';

// ── The ONE master prompt that fills ALL 11 form fields ──────────────────────
const MASTER_PROMPT =
  `Met Dr. Anjali Sharma (Cardiologist, Apollo Hospital) today at 14:30 via Meeting. ` +
  `Attendees: Dr. Priya Nair, Rep Karthik Suresh. ` +
  `Discussed OncoBoost Phase III efficacy data, Product X dosage guidelines, and cardiac safety profile. ` +
  `Shared OncoBoost Clinical Brochure, Phase III Trial Summary PDF. ` +
  `Distributed 5 units of OncoBoost 10mg samples, 3 units of CardioShield 20mg. ` +
  `Dr. Sharma was very interested and agreed to trial OncoBoost with 3 patients next week — Positive sentiment. ` +
  `Outcome: Doctor agreed to prescribe OncoBoost for trial patients, requested follow-up data on renal safety. ` +
  `Follow-up: Schedule call in 2 weeks to review trial results, send renal safety white paper by Friday.`;

const QUICK_PROMPTS = [
  {
    label: '📋 Fill ALL fields (demo)',
    text: MASTER_PROMPT,
  },
  {
    label: '📞 Quick call log',
    text: 'Called Dr. Ravi Patel at 10:00, discussed Product Y pricing, doctor was neutral, follow up next week',
  },
  {
    label: '📜 HCP History',
    text: 'Show history for Dr. Anjali Sharma',
  },
  {
    label: '🔍 Analyze sentiment',
    text: 'Analyze: The doctor seemed skeptical about the clinical data and raised concerns about pricing and side effects',
  },
  {
    label: '💡 Suggest follow-ups',
    text: 'Suggest follow-up actions for Dr. Mehta after positive oncology meeting about OncoBoost',
  },
];

const TOOL_BADGES = {
  log_interaction:   { label: 'Log Interaction',   color: '#2563eb' },
  edit_interaction:  { label: 'Edit Interaction',  color: '#7c3aed' },
  get_hcp_history:   { label: 'HCP History',       color: '#0891b2' },
  suggest_followup:  { label: 'Suggest Follow-up', color: '#16a34a' },
  analyze_sentiment: { label: 'Analyze Sentiment', color: '#d97706' },
};

const FORM_FIELDS = [
  'hcp_name','interaction_type','date','time','attendees',
  'topics_discussed','materials_shared','samples_distributed',
  'sentiment','outcomes','followup_actions',
];

const FIELD_LABELS = {
  hcp_name: 'HCP Name',
  interaction_type: 'Type',
  date: 'Date',
  time: 'Time',
  attendees: 'Attendees',
  topics_discussed: 'Topics',
  materials_shared: 'Materials',
  samples_distributed: 'Samples',
  sentiment: 'Sentiment',
  outcomes: 'Outcomes',
  followup_actions: 'Follow-ups',
};

export default function ChatInterface() {
  const dispatch = useDispatch();
  const { messages, loading, lastToolUsed } = useSelector((s) => s.chat);
  const { chatMappedFields } = useSelector((s) => s.interaction);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Clear highlight after 4 seconds
  useEffect(() => {
    if (chatMappedFields.length > 0) {
      const t = setTimeout(() => dispatch(clearMappedHighlight()), 4000);
      return () => clearTimeout(t);
    }
  }, [chatMappedFields, dispatch]);

  const dispatchChat = (text) => {
    if (!text.trim() || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    dispatch(addUserMessage(text));
    setInput('');

    dispatch(sendChatMessage({ message: text, history })).then((action) => {
      if (!action.payload) return;
      const { extracted_data } = action.payload;
      if (!extracted_data) return;

      const hasFormFields = FORM_FIELDS.some(
        (k) => extracted_data[k] !== undefined && extracted_data[k] !== null
      );
      if (hasFormFields) {
        dispatch(populateFromChat(extracted_data));
        // Scroll left panel to top so user sees auto-filled form
        const left = document.querySelector('.split-left');
        if (left) left.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const handleSend = () => dispatchChat(input.trim());

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-root">

      {/* ── Header ── */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="ai-avatar">✦</div>
          <div>
            <div className="chat-title">AI Assistant</div>
            <div className="chat-subtitle">Describe interaction → auto-fills form</div>
          </div>
        </div>
        <div className="chat-header-right">
          {lastToolUsed && TOOL_BADGES[lastToolUsed] && (
            <span className="tool-badge" style={{ background: TOOL_BADGES[lastToolUsed].color }}>
              ⚡ {TOOL_BADGES[lastToolUsed].label}
            </span>
          )}
          <button className="btn-icon" onClick={() => dispatch(clearChat())} title="Clear">🗑</button>
        </div>
      </div>

      {/* ── Mapped Banner ── */}
      {chatMappedFields.length > 0 && (
        <div className="mapped-banner">
          <span className="mapped-icon">↖</span>
          <div>
            <strong>{chatMappedFields.length} field{chatMappedFields.length > 1 ? 's' : ''} auto-filled</strong>
            {' '}on the form — review &amp; click <strong>Log Interaction</strong> to save
          </div>
        </div>
      )}

      {/* ── Quick Prompt Buttons ── */}
      <div className="quick-prompts">
        <div className="quick-label">Quick actions:</div>
        <div className="quick-chips">
          {QUICK_PROMPTS.map((q, i) => (
            <button
              key={i}
              className={`quick-chip ${i === 0 ? 'quick-chip-primary' : ''}`}
              onClick={() => dispatchChat(q.text)}
              disabled={loading}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble-wrap ${msg.role}`}>
            {msg.role === 'assistant' && <div className="bubble-avatar">✦</div>}

            <div className={`chat-bubble ${msg.role}`}>
              <p className="bubble-text">{msg.content}</p>

              {/* Tool badge */}
              {msg.tool_used && TOOL_BADGES[msg.tool_used] && (
                <div className="bubble-tool-tag" style={{ color: TOOL_BADGES[msg.tool_used].color }}>
                  ⚡ Tool: {TOOL_BADGES[msg.tool_used].label}
                </div>
              )}

              {/* Extracted fields grid */}
              {msg.extracted_data && (() => {
                const filled = FORM_FIELDS.filter(
                  (k) => msg.extracted_data[k] !== undefined && msg.extracted_data[k] !== null
                );
                if (filled.length === 0) return null;
                return (
                  <div className="bubble-extracted">
                    <div className="bubble-extracted-title">
                      📋 {filled.length} field{filled.length > 1 ? 's' : ''} mapped to form:
                    </div>
                    <div className="bubble-extracted-grid">
                      {filled.map((f) => (
                        <div key={f} className="extracted-row">
                          <span className="chip-key">{FIELD_LABELS[f]}</span>
                          <span className="chip-val">
                            {String(msg.extracted_data[f]).length > 35
                              ? String(msg.extracted_data[f]).slice(0, 35) + '…'
                              : String(msg.extracted_data[f])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Suggested follow-ups */}
              {msg.extracted_data?.suggested_followups?.length > 0 && (
                <div className="bubble-followups">
                  <strong>Suggested Follow-ups:</strong>
                  <ul>
                    {msg.extracted_data.suggested_followups.map((s, j) => (
                      <li key={j}>› {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sentiment result */}
              {msg.tool_used === 'analyze_sentiment' && msg.extracted_data?.sentiment && (
                <div className="bubble-sentiment">
                  Sentiment: <strong style={{
                    color: msg.extracted_data.sentiment === 'Positive' ? '#16a34a'
                      : msg.extracted_data.sentiment === 'Negative' ? '#dc2626' : '#6b7280'
                  }}>{msg.extracted_data.sentiment}</strong>
                  {msg.extracted_data.confidence_percent && (
                    <span className="confidence"> ({msg.extracted_data.confidence_percent}% confidence)</span>
                  )}
                </div>
              )}

              {/* HCP History list */}
              {msg.extracted_data?.interactions?.length > 0 && (
                <div className="bubble-history">
                  <strong>Past interactions ({msg.extracted_data.total || msg.extracted_data.interactions.length}):</strong>
                  {msg.extracted_data.interactions.slice(0, 4).map((it, j) => (
                    <div key={j} className="history-item">
                      <span className="history-date">{it.date}</span>
                      <span className="history-type">{it.interaction_type}</span>
                      <span className={`history-sentiment s-${(it.sentiment||'neutral').toLowerCase()}`}>
                        {it.sentiment}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && <div className="bubble-avatar user-av">U</div>}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="chat-bubble-wrap assistant">
            <div className="bubble-avatar">✦</div>
            <div className="chat-bubble assistant typing-bubble">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder='e.g. "Met Dr. Sharma today at 2pm, discussed OncoBoost efficacy, shared brochure, positive"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          {loading ? <span className="spinner-dark" /> : '↑'}
        </button>
      </div>
    </div>
  );
}
