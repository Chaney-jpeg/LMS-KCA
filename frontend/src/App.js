import React, { useState } from 'react';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Login from './screens/Login';
import Register from './screens/Register';
import AdminDashboard from './screens/AdminDashboard';
import LecturerDashboard from './screens/LecturerDashboard';
import StudentDashboard from './screens/StudentDashboard';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api`;

function App() {
  const [currentRole, setCurrentRole] = useState(null);
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Automatic device detection
  useEffect(() => {
    const detectDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      const shouldUseMobileView = isMobile || isSmallScreen;
      
      setIsMobileDevice(shouldUseMobileView);
      
      if (shouldUseMobileView) {
        document.body.classList.add('mobile-presentation');
      } else {
        document.body.classList.remove('mobile-presentation');
      }
    };

    // Initial detection
    detectDevice();

    // Re-detect on window resize
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  const handleLogin = async (email, password) => {
    setIsLoading(true);
    setLoginError('');
    
    try {
      // Call backend API to verify credentials
      const response = await axios.post(`${API_URL}/login/`, {
        email: email.toLowerCase(),
        password: password
      });

      if (response.status === 200 && response.data.ok) {
        // Login successful - set user data from API response
        const userData = response.data.user || {};
        setUser({
          email: userData.email,
          role: response.data.role,
          name: userData.name,
          id: userData.id
        });
        setCurrentRole(response.data.role);
      }
    } catch (error) {
      // Login failed - show error message
      if (error.response?.status === 401) {
        setLoginError('Invalid email or password');
      } else if (error.response?.status === 400) {
        setLoginError(error.response.data?.error || 'Email and password are required');
      } else {
        setLoginError('Login failed. Please try again.');
      }
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentRole(null);
    setUser(null);
    setLoginError('');
  };

  const handleRegisterSuccess = (email) => {
    setShowRegister(false);
    // After registration, redirect to login
    setLoginError('');
  };

  if (showRegister) {
    return <Register onRegisterSuccess={handleRegisterSuccess} onBackToLogin={() => setShowRegister(false)} />;
  }

  if (!currentRole) {
    return <Login onLogin={handleLogin} onRegisterClick={() => setShowRegister(true)} error={loginError} isLoading={isLoading} />;
  }

  return (
    <div className="phone-shell">
      {currentRole === 'ADMIN' && <AdminDashboard user={user} onLogout={handleLogout} />}
      {currentRole === 'LECTURER' && <LecturerDashboard user={user} onLogout={handleLogout} />}
      {currentRole === 'STUDENT' && <StudentDashboard user={user} onLogout={handleLogout} />}
    </div>
  );
}

export default App;
