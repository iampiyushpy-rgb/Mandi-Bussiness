import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  X
} from 'lucide-react';

export default function Navbar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  onSearch,
  searchQuery,
  theme = 'light',
  toggleTheme,
  currentUser,
  onLogout
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuToggle = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const displayName = currentUser?.first_name
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
    : (currentUser?.name || currentUser?.username || 'Aziz Admin');
  const displayRole = currentUser?.role || 'Super Admin';
  const initialChar = displayName ? displayName[0].toUpperCase() : 'A';

  return (
    <header className="erp-navbar">
      <div className="navbar-left">
        <button
          className="toggle-sidebar-btn"
          onClick={handleMenuToggle}
          title="Toggle Navigation Menu"
          aria-label="Toggle Menu"
        >
          <Menu size={20} />
        </button>

        <div className="search-bar-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search Fruit, Variety, Truck, Party..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="navbar-right">
        {/* Theme Toggle */}
        {toggleTheme && (
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        )}

        {/* User Profile Container with Dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            className="user-profile-widget"
            onClick={() => setIsProfileMenuOpen(prev => !prev)}
            title={`Logged in as ${displayName} - Click for menu`}
            style={{
              userSelect: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px',
              borderRadius: '10px',
              transition: 'background 0.15s ease'
            }}
          >
            <div
              className="user-avatar"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #f97316 100%)',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
              }}
            >
              {initialChar}
            </div>
            <div className="hide-on-mobile" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{displayName}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--emerald-dark, #059669)', fontWeight: 700 }}>{displayRole}</span>
            </div>
            <ChevronDown
              size={14}
              color="var(--text-secondary)"
              style={{
                marginLeft: '2px',
                transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '230px',
                background: 'var(--bg-card, #ffffff)',
                border: '1.5px solid var(--border-subtle, #e2e8f0)',
                borderRadius: '14px',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.05)',
                zIndex: 1000,
                padding: '6px',
                animation: 'fadeIn 0.15s ease'
              }}
            >
              {/* Dropdown User Info Card */}
              <div
                style={{
                  padding: '10px 12px 10px 12px',
                  borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #f97316 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {initialChar}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main, #0f172a)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                    @{currentUser?.username || 'admin'} • {displayRole}
                  </div>
                </div>
              </div>

              {/* Action 1: My Profile */}
              <div style={{ padding: '4px 0' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '9px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: 'var(--text-main, #0f172a)',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-main, #f8fafc)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <User size={16} color="#059669" />
                  <span>My Profile</span>
                </button>

                {/* Action 2: Log Out */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '9px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: '#ef4444',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} color="#ef4444" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MY PROFILE MODAL                                                      */}
      {/* ===================================================================== */}
      {isProfileModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '430px',
              border: '1.5px solid var(--border-subtle, #e2e8f0)',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                background: 'var(--bg-main, #f8fafc)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  My Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted, #64748b)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
              {/* Avatar Hero */}
              <div
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #f97316 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '2.1rem',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
                }}
              >
                {initialChar}
              </div>

              <div style={{ textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                  {displayName}
                </h2>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    marginTop: '6px'
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>{displayRole}</span>
                </div>
              </div>

              {/* User Meta Details Card */}
              <div
                style={{
                  width: '100%',
                  background: 'var(--bg-main, #f8fafc)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  fontSize: '0.84rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Username</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)', fontFamily: 'monospace' }}>@{currentUser?.username || 'admin'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Firm / Mandi</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>AzizInternational</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Account Status</span>
                  <span style={{ fontWeight: 800, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                    Active Session
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 20px',
                background: 'var(--bg-main, #f8fafc)',
                borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsProfileModalOpen(false);
                  if (onLogout) onLogout();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--emerald, #10b981)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

