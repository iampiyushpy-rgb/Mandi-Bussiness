import React from 'react';
import {
  LayoutDashboard,
  Apple,
  X,
  ReceiptText,
  Wallet,
  FileText
} from 'lucide-react';

export default function Sidebar({
  activeTab = 'dashboard',
  setActiveTab,
  collapsed,
  mobileOpen,
  setMobileOpen,
  onLogout,
  currentUser,
  isSalesPerson: isSalesPersonProp
}) {
  const handleItemClick = (action) => {
    if (action) action();
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const isSalesPerson = isSalesPersonProp !== undefined
    ? isSalesPersonProp
    : Boolean(
        currentUser?.role_code === 'SALES_PERSON' ||
        currentUser?.profile?.role_code === 'SALES_PERSON' ||
        currentUser?.role === 'Sales Person (Spot)' ||
        currentUser?.username?.toLowerCase() === 'sales'
      );

  const navItems = isSalesPerson
    ? [
        {
          id: 'dashboard',
          label: 'Spot Sales Board',
          subtitle: 'Lot Delivery & Bikri Entry',
          icon: LayoutDashboard,
          badge: 'Spot',
          badgeColor: '#f97316',
          action: () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (setActiveTab) setActiveTab('dashboard');
          }
        }
      ]
    : [
        {
          id: 'dashboard',
          label: 'Admin Dashboard',
          subtitle: 'Mandi Trading Overview',
          icon: LayoutDashboard,
          badge: 'Live',
          badgeColor: '#10b981',
          action: () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (setActiveTab) setActiveTab('dashboard');
          }
        },
        {
          id: 'cash-sale',
          label: 'Party Khata',
          subtitle: 'Suppliers & History',
          icon: ReceiptText,
          badge: 'Khata',
          badgeColor: '#f59e0b',
          action: () => {
            if (setActiveTab) setActiveTab('cash-sale');
          }
        },
        {
          id: 'cash-sell-transactions',
          label: 'Cash Sell Transactions',
          subtitle: 'Collection & Expenses',
          icon: Wallet,
          badge: 'Txn',
          badgeColor: '#8b5cf6',
          action: () => {
            if (setActiveTab) setActiveTab('cash-sell-transactions');
          }
        },
        {
          id: 'daily-reports',
          label: 'Daily Reports',
          subtitle: 'Saved Reports & Audits',
          icon: FileText,
          badge: 'Reports',
          badgeColor: '#0ea5e9',
          action: () => {
            if (setActiveTab) setActiveTab('daily-reports');
          }
        }
      ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`erp-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div
            className="sidebar-brand"
            onClick={() => handleItemClick(navItems[0].action)}
            title="AzizInternational Fresh Fruits & Dry Fruits"
          >
            <div className="brand-icon-box">
              <Apple size={22} />
            </div>
            {!collapsed && (
              <div className="brand-info">
                <span className="brand-title">AzizInternational</span>
                <span className="brand-subtitle">{isSalesPerson ? 'SPOT SALES DESK' : 'MANDI ERP • SPA'}</span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="sidebar-nav">
          {!collapsed && <div className="nav-section-title">{isSalesPerson ? 'SPOT SALES PANEL' : 'ADMIN PANEL'}</div>}

          {navItems.map(item => {
            const Icon = item.icon;
            const isSelected = item.id === activeTab;

            return (
              <div
                key={item.id}
                className={`nav-item ${isSelected ? 'active' : ''}`}
                onClick={() => handleItemClick(item.action)}
                title={item.label}
              >
                <div className="nav-item-icon">
                  <Icon size={18} />
                </div>
                {!collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            background: `${item.badgeColor}20`,
                            color: item.badgeColor,
                            border: `1px solid ${item.badgeColor}40`
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
