import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Apple,
  Sun,
  Moon
} from 'lucide-react';
import { api } from '../services/api';

// Floating Fruit Particle System

const FRUIT_PARTICLES = [
  { fruit: '🍎', size: '2.8rem', top: '8%', left: '10%', duration: '6.5s', delay: '0s' },
  { fruit: '🍊', size: '3.2rem', top: '15%', left: '84%', duration: '7.8s', delay: '1.2s' },
  { fruit: '🥭', size: '3.6rem', top: '68%', left: '7%', duration: '8.2s', delay: '0.5s' },
  { fruit: '🍇', size: '2.9rem', top: '78%', left: '88%', duration: '6.9s', delay: '2.1s' },
  { fruit: '🍓', size: '2.5rem', top: '42%', left: '4%', duration: '5.8s', delay: '1.5s' },
  { fruit: '🥝', size: '2.7rem', top: '22%', left: '72%', duration: '7.2s', delay: '3.0s' },
  { fruit: '🍒', size: '2.6rem', top: '85%', left: '38%', duration: '6.1s', delay: '0.8s' },
  { fruit: '🥑', size: '3.0rem', top: '6%', left: '48%', duration: '8.5s', delay: '2.4s' },
  { fruit: '🍍', size: '3.4rem', top: '55%', left: '92%', duration: '9.0s', delay: '1.8s' },
  { fruit: '🌰', size: '2.4rem', top: '35%', left: '18%', duration: '6.7s', delay: '3.5s' },
];

export default function LoginView({ onLoginSuccess, theme, toggleTheme, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login/', {
        username: u,
        password: p
      });

      if (response && response.access) {
        localStorage.setItem('access_token', response.access);
        if (response.refresh) localStorage.setItem('refresh_token', response.refresh);
        const userData = response.user || {
          username: u,
          role: u === 'sales' ? 'Sales Person (Spot)' : 'Super Admin',
          role_code: u === 'sales' ? 'SALES_PERSON' : 'SUPER_ADMIN'
        };
        // Normalize role properties
        if (u.toLowerCase() === 'sales' || userData.profile?.role_code === 'SALES_PERSON') {
          userData.role_code = 'SALES_PERSON';
          userData.role = 'Sales Person (Spot)';
        }
        localStorage.setItem('auth_user', JSON.stringify(userData));
        if (showToast) showToast(`Welcome back, ${userData.first_name || userData.username}! 🍎`, 'success');
        onLoginSuccess(userData);
      } else {
        throw new Error('Invalid authentication response from server');
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fruit-login-page">
      {/* Background Floating Fruit Elements */}
      <div className="floating-fruits-bg">
        {FRUIT_PARTICLES.map((p, idx) => (
          <div
            key={idx}
            className="floating-fruit-item"
            style={{
              top: p.top,
              left: p.left,
              fontSize: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              opacity: theme === 'dark' ? 0.38 : 0.65
            }}
          >
            {p.fruit}
          </div>
        ))}
      </div>

      {/* Top Controls: Theme Switcher */}
      {toggleTheme && (
        <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 20 }}>
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      )}

      {/* Central Fruit Login Card */}
      <div className={`fruit-login-card ${error ? 'shake-error' : ''}`}>
        {/* Brand & Fruit Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className="fruit-brand-badge">
            <Apple size={36} color="#ffffff" />
          </div>

          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 900,
            color: 'var(--text-main)',
            letterSpacing: '-0.02em',
            margin: '0 0 6px 0'
          }}>
            Aziz<span style={{ color: '#f97316' }}>International</span>
          </h1>

          <p style={{
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            margin: 0,
            fontWeight: 500
          }}>
            Fresh Fruits & Dry Fruits Trading ERP
          </p>
        </div>

        {/* Role Quick Selector Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '18px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))'
        }}>
          <button
            type="button"
            onClick={() => {
              setUsername('admin');
              setPassword('admin123');
              setError('');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '9px',
              border: username.toLowerCase() === 'admin' ? '1.5px solid #10b981' : '1px solid transparent',
              background: username.toLowerCase() === 'admin' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: username.toLowerCase() === 'admin' ? '#10b981' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.78rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>👑 Admin</span>
            <span style={{ fontSize: '0.67rem', opacity: 0.75, fontWeight: 500 }}>admin / admin123</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setUsername('sales');
              setPassword('sales123');
              setError('');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '9px',
              border: username.toLowerCase() === 'sales' ? '1.5px solid #f97316' : '1px solid transparent',
              background: username.toLowerCase() === 'sales' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
              color: username.toLowerCase() === 'sales' ? '#f97316' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.78rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>👤 Spot Sales</span>
            <span style={{ fontSize: '0.67rem', opacity: 0.75, fontWeight: 500 }}>sales / sales123</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '18px',
            fontSize: '0.82rem',
            color: '#fb7185',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Username Input */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="#f97316" />
              <span>Username or Mandi ID</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                style={{ width: '100%', paddingLeft: '38px', borderRadius: '10px' }}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                🍊
              </span>
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} color="#10b981" />
              <span>Security Password</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ width: '100%', paddingLeft: '38px', paddingRight: '40px', borderRadius: '10px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                🍇
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="fruit-login-btn"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Mandi ERP</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
