import React, { useState } from 'react';

export default function Login({ onLogin, onRegisterClick, error, isLoading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [detectedRole, setDetectedRole] = useState(null);

  const detectRole = (emailStr) => {
    const p = emailStr.split('@')[0].toLowerCase();
    if (p.startsWith('admin')) setDetectedRole('ADMIN');
    else if (/^\d/.test(p)) setDetectedRole('STUDENT');
    else if (p.length > 1) setDetectedRole('LECTURER');
    else setDetectedRole(null);
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    detectRole(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.includes('@') || !password) {
      return;
    }
    onLogin(email, password);
  };

  const BADGE_CONFIG = {
    ADMIN: { text: '⚙️ Signing in as Administrator', bg: 'rgba(198,40,40,.1)', border: 'rgba(198,40,40,.35)', color: '#C62828' },
    LECTURER: { text: '🎓 Signing in as Lecturer', bg: 'rgba(27,107,58,.1)', border: 'rgba(27,107,58,.35)', color: '#1B6B3A' },
    STUDENT: { text: '📚 Signing in as Student', bg: 'rgba(201,168,76,.1)', border: 'rgba(201,168,76,.45)', color: '#A8872E' },
  };

  const cfg = detectedRole ? BADGE_CONFIG[detectedRole] : null;

  return (
    <div className="login-container" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 30% 0%,#1a3060 0%,#07102A 55%,#0D1B3E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: '"DM Sans",sans-serif' }}>
      <div className="login-box" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎓</div>
          <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>KCAU LMS</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', margin: 0 }}>Learning Management System</p>
        </div>

        {cfg && (
          <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', fontSize: '11px', fontWeight: 600, color: cfg.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {cfg.text}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(198, 40, 40, .15)', border: '1px solid rgba(198, 40, 40, .3)', borderRadius: '8px', padding: '12px 10px', marginBottom: '10px', fontSize: '12px', fontWeight: 600, color: '#ef5350', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(20px)' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. admin@kcau.ac.ke"
              value={email}
              onChange={handleEmailChange}
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid rgba(255,255,255,.15)', borderRadius: '10px', padding: '12px 12px', fontFamily: '"DM Sans",sans-serif', fontSize: '13px', color: '#fff', background: 'rgba(255,255,255,.03)', outline: 'none', transition: 'all .2s' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(201,168,76,.4)'; e.target.style.background = 'rgba(255,255,255,.05)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,.15)'; e.target.style.background = 'rgba(255,255,255,.03)'; }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid rgba(255,255,255,.15)', borderRadius: '10px', padding: '12px 12px', fontFamily: '"DM Sans",sans-serif', fontSize: '13px', color: '#fff', background: 'rgba(255,255,255,.03)', outline: 'none', transition: 'all .2s' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(201,168,76,.4)'; e.target.style.background = 'rgba(255,255,255,.05)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,.15)'; e.target.style.background = 'rgba(255,255,255,.03)'; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'rgba(255,255,255,.4)' }}>
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} style={{ width: '100%', background: isLoading ? 'linear-gradient(135deg, #999 0%, #BBB 100%)' : 'linear-gradient(135deg, #C9A84C 0%, #E8C857 100%)', color: '#0D1B3E', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all .3s', boxShadow: '0 6px 20px rgba(201,168,76,.3)', opacity: isLoading ? 0.6 : 1 }} onMouseOver={(e) => { if (!isLoading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 10px 30px rgba(201,168,76,.5)'; } }} onMouseOut={(e) => { if (!isLoading) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 6px 20px rgba(201,168,76,.3)'; } }}>
            {isLoading ? '⏳ Signing In...' : '🔐 Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ padding: '8px 12px', borderRadius: '20px', border: '1.5px solid rgba(198,40,40,.3)', background: detectedRole === 'ADMIN' ? 'rgba(198,40,40,.15)' : 'rgba(255,255,255,.05)', color: detectedRole === 'ADMIN' ? '#C62828' : 'rgba(255,255,255,.3)', fontSize: '10px', fontWeight: 700 }}>⚙️ Admin</div>
          <div style={{ padding: '8px 12px', borderRadius: '20px', border: '1.5px solid rgba(27,107,58,.3)', background: detectedRole === 'LECTURER' ? 'rgba(27,107,58,.15)' : 'rgba(255,255,255,.05)', color: detectedRole === 'LECTURER' ? '#1B6B3A' : 'rgba(255,255,255,.3)', fontSize: '10px', fontWeight: 700 }}>🎓 Lecturer</div>
          <div style={{ padding: '8px 12px', borderRadius: '20px', border: '1.5px solid rgba(201,168,76,.3)', background: detectedRole === 'STUDENT' ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.05)', color: detectedRole === 'STUDENT' ? '#A8872E' : 'rgba(255,255,255,.3)', fontSize: '10px', fontWeight: 700 }}>📚 Student</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '9px', color: 'rgba(255,255,255,.2)' }}>
          © 2025 KCAU — Password: kcau_lms
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onRegisterClick}
            style={{
              background: 'rgba(13,71,161,.15)',
              border: '1.5px solid rgba(13,71,161,.3)',
              color: '#42a5f5',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .2s'
            }}
            onMouseOver={(e) => { e.target.style.background = 'rgba(13,71,161,.25)'; }}
            onMouseOut={(e) => { e.target.style.background = 'rgba(13,71,161,.15)'; }}
          >
            📝 Don't have an account? Register
          </button>
        </div>
      </div>
    </div>
  );
}
