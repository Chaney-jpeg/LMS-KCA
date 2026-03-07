import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export default function Register({ onRegisterSuccess, onBackToLogin }) {
  const [step, setStep] = useState('role'); // role -> form (no more verify step)
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: '',
    reg_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep('form');
    setError('');
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Valid email is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      return false;
    }
    if (selectedRole === 'STUDENT' && !formData.reg_number.trim()) {
      setError('Registration number is required for students');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await axios.post(`${API_URL}/register/`, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: selectedRole,
        reg_number: selectedRole === 'STUDENT' ? formData.reg_number : ''
      });

      if (response.status === 201) {
        setMessage('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          onRegisterSuccess(formData.email);
        }, 1500);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Registration failed. Email may already exist.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'form') {
      setStep('role');
      setSelectedRole(null);
      setFormData({ name: '', email: '', phone: '', password: '', password_confirm: '', reg_number: '' });
    }
    setError('');
    setMessage('');
  };

  const renderContent = () => {
    if (step === 'role') {
      return (
        <div className="body" style={{ padding: '20px 0' }}>
          <div style={{ padding: '20px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>📝</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Create Account</div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '30px' }}>Select your role to get started</div>
          </div>

          {['STUDENT', 'LECTURER'].map((role) => (
            <div
              key={role}
              onClick={() => handleRoleSelect(role)}
              style={{
                padding: '16px 10px',
                background: '#fff',
                borderLeft: '4px solid #0d47a1',
                margin: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{role === 'STUDENT' ? '👨‍🎓 Student' : '👨‍🏫 Lecturer'}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{role === 'STUDENT' ? 'Access courses & submit work' : 'Create courses & grade students'}</div>
              </div>
              <div style={{ fontSize: '20px' }}>→</div>
            </div>
          ))}

          <div style={{ padding: '16px 10px', textAlign: 'center', marginTop: '20px' }}>
            <button onClick={onBackToLogin} style={{ padding: '8px 16px', background: '#888', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>← Back to Login</button>
          </div>
        </div>
      );
    }

    if (step === 'form') {
      return (
        <div className="body">
          <div style={{ padding: '16px 10px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Create {selectedRole === 'STUDENT' ? 'Student' : 'Lecturer'} Account</div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>Fill in your details below</div>

            {error && (
              <div style={{ padding: '10px', background: '#ffebee', border: '1px solid #ef5350', borderRadius: '6px', marginBottom: '12px', color: '#c62828', fontSize: '12px', fontWeight: 500 }}>
                ⚠️ {error}
              </div>
            )}

            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}
            />

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number (optional)"
              value={formData.phone}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}
            />

            {selectedRole === 'STUDENT' && (
              <input
                type="text"
                name="reg_number"
                placeholder="Registration Number"
                value={formData.reg_number}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}
              />
            )}

            <input
              type="password"
              name="password"
              placeholder="Password (min 6 chars)"
              value={formData.password}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}
            />

            <input
              type="password"
              name="password_confirm"
              placeholder="Confirm Password"
              value={formData.password_confirm}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '13px' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRegister}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#0d47a1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#888',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show success message
    return (
      <div className="body">
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: '#1b6b3a' }}>Account Created!</div>
          {message && (
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>
              {message}
            </div>
          )}
          <button
            onClick={onBackToLogin}
            style={{
              padding: '12px 24px',
              background: '#0d47a1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              marginTop: '20px'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="sc">
      <div className="hdr" style={{ background: '#0d47a1' }}>
        <div style={{ paddingBottom: '12px', position: 'relative', zIndex: 1 }}>
          <div className="rp" style={{ background: 'rgba(13,71,161,.2)', borderColor: 'rgba(13,71,161,.4)', color: '#42a5f5', marginBottom: '5px' }}>🎓 LMS KCA</div>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '4px 0 3px' }}>Create Your Account</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)' }}>Join Learning Management System</div>
        </div>
      </div>

      <div className="scrollable">
        {renderContent()}
        <div style={{ height: '80px' }}></div>
      </div>
    </div>
  );
}
