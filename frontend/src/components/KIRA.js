import React, { useState, useRef, useEffect } from 'react';
import { kiraAPI } from '../api';

function KIRA({ role, onClose }) {
  const [messages, setMessages] = useState([
    { type: 'bot', text: `Hi! I'm KIRA, your KCAU assistant. How can I help you today with your ${role.toLowerCase()} responsibilities?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMsg = input;
    setMessages((prev) => [...prev, { type: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await kiraAPI.chat(role, userMsg);
      setMessages((prev) => [...prev, { type: 'bot', text: res.data.text || 'No response' }]);
    } catch (err) {
      setMessages((prev) => [...prev, { type: 'bot', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kira-modal open" onClick={onClose}>
      <div className="kira-box" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="kira-header">
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '28px',
              height: '28px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,.1)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            ✕
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(201,168,76,.15)', border: '2px solid rgba(201,168,76,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>🤖</div>
            <div>
              <div style={{ fontFamily: 'Playfair Display,serif', fontSize: '15px', fontWeight: 700, color: '#fff' }}>KIRA</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.55)' }}>KCAU Intelligent Research Assistant</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(27,107,58,.25)', border: '1px solid rgba(74,222,128,.3)', borderRadius: '50px', padding: '3px 9px', marginLeft: 'auto' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: '#4ade80' }}></div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#4ade80' }}>Online</div>
            </div>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="kira-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`msg-row ${msg.type === 'user' ? 'user' : ''}`}>
              {msg.type === 'bot' && (
                <div style={{ width: '24px', height: '24px', borderRadius: '12px', background: 'var(--nv-m)', border: '1.5px solid rgba(201,168,76,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                  🤖
                </div>
              )}
              <div className={`msg-bubble ${msg.type === 'bot' ? 'bot' : 'user'}`}>{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div className="msg-row">
              <div style={{ width: '24px', height: '24px', borderRadius: '12px', background: 'var(--nv-m)', border: '1.5px solid rgba(201,168,76,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                🤖
              </div>
              <div className="msg-bubble bot" style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: 'var(--tx3)', animation: 'bounce 0.9s infinite' }}></div>
                <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: 'var(--tx3)', animation: 'bounce 0.9s infinite 0.2s' }}></div>
                <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: 'var(--tx3)', animation: 'bounce 0.9s infinite 0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="kira-input">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask KIRA anything…"
            style={{ resize: 'none', minHeight: '36px', maxHeight: '80px' }}
          />
          <button className="kira-send" onClick={handleSend} disabled={loading || !input.trim()}>
            ➤
          </button>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-5px); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default KIRA;
