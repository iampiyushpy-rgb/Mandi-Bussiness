import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import DashboardView from './pages/DashboardView';
import LoginView from './pages/LoginView';

import { initialDashboardData } from './services/mockData';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTabRaw] = useState(() => {
    return sessionStorage.getItem('erp_active_tab') || 'dashboard';
  });
  const setActiveTab = (tab) => {
    sessionStorage.setItem('erp_active_tab', tab);
    setActiveTabRaw(tab);
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('erp_theme') || 'light');

  // SPA Modal & Action Controls
  const [inwardFormOpen, setInwardFormOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('access_token'));
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user')) || {
        username: 'admin',
        role: 'Super Admin',
        first_name: 'Aziz',
        last_name: 'Admin'
      };
    } catch {
      return {
        username: 'admin',
        role: 'Super Admin',
        first_name: 'Aziz',
        last_name: 'Admin'
      };
    }
  });

  const isSalesPerson = Boolean(
    currentUser?.role_code === 'SALES_PERSON' ||
    currentUser?.profile?.role_code === 'SALES_PERSON' ||
    currentUser?.role === 'Sales Person (Spot)' ||
    currentUser?.username?.toLowerCase() === 'sales'
  );

  useEffect(() => {
    if (isSalesPerson && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [isSalesPerson, activeTab]);

  const handleLoginSuccess = (userData) => {
    if (userData) {
      setCurrentUser(userData);
      const isSales = userData.role_code === 'SALES_PERSON' ||
                      userData.profile?.role_code === 'SALES_PERSON' ||
                      userData.username?.toLowerCase() === 'sales';
      if (isSales) {
        setActiveTab('dashboard');
      }
    }
    setIsAuthenticated(true);
    const roleTitle = userData?.role || userData?.profile?.role_name || 'User';
    showToast(`Welcome, ${userData?.first_name || userData?.username || 'User'} (${roleTitle})! 🍎`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    showToast('Signed out successfully! Have a fruitful day 🍇', 'success');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('erp_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      showToast('Session expired. Please log in again.', 'error');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Live state
  const [dashboardData, setDashboardData] = useState(initialDashboardData);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [purchasesList, setPurchasesList] = useState([]);
  const [truckPayments, setTruckPayments] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [customerLedger, setCustomerLedger] = useState([]);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = async () => {
    try {
      const [
        dashRes,
        prodRes,
        supRes,
        custRes,
        poRes,
        soRes,
        custLedgRes,
        truckPayRes
      ] = await Promise.all([
        api.get('/reports/dashboard/').catch(() => null),
        api.get('/products/').catch(() => null),
        api.get('/suppliers/').catch(() => null),
        api.get('/customers/').catch(() => null),
        api.get('/purchases/').catch(() => null),
        api.get('/sales/').catch(() => null),
        api.get('/payments/customer-ledger/').catch(() => null),
        api.get('/purchases/truck-payments/').catch(() => null),
      ]);

      if (dashRes) setDashboardData(dashRes);
      if (prodRes?.results || Array.isArray(prodRes)) setProducts(prodRes.results || prodRes);
      if (supRes?.results || Array.isArray(supRes)) setSuppliers(supRes.results || supRes);
      if (custRes?.results || Array.isArray(custRes)) setCustomers(custRes.results || custRes);
      if (poRes?.results || Array.isArray(poRes)) setPurchasesList(poRes.results || poRes);
      if (truckPayRes?.results || Array.isArray(truckPayRes)) setTruckPayments(truckPayRes.results || truckPayRes);
      if (soRes?.results || Array.isArray(soRes)) setSalesList(soRes.results || soRes);
      if (custLedgRes?.results || Array.isArray(custLedgRes)) setCustomerLedger(custLedgRes.results || custLedgRes);
    } catch (e) {
      console.warn('Backend loading note: using live cache / fallback', e.message);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadAllData();
    const handleRefresh = () => loadAllData();
    window.addEventListener('erp:refresh-data', handleRefresh);
    const interval = setInterval(loadAllData, 60000); // 60s background sync
    return () => {
      clearInterval(interval);
      window.removeEventListener('erp:refresh-data', handleRefresh);
    };
  }, [isAuthenticated]);

  // SPA In-Page Navigation Handlers
  const handleOpenInward = () => {
    setInwardFormOpen(true);
    setTimeout(() => {
      const el = document.getElementById('supplier-entry-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  const handleOpenCustomerModal = () => {
    setCustomerModalOpen(true);
  };

  const handleOpenSupplierModal = () => {
    setSupplierModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="erp-container" style={{ display: 'block', minHeight: '100vh', background: 'transparent' }}>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          theme={theme}
          toggleTheme={toggleTheme}
          showToast={showToast}
        />
        {toast && (
          <div className="toast-container">
            <div className="toast" style={{ borderColor: toast.type === 'error' ? '#fb7185' : '#34d399' }}>
              <span style={{ color: toast.type === 'error' ? '#fb7185' : '#34d399', fontWeight: 800 }}>
                {toast.type === 'error' ? '!' : '✓'}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="erp-container">
      {/* Mobile off-canvas backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Unified Single Page Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
        currentUser={currentUser}
        isSalesPerson={isSalesPerson}
      />

      {/* Main Single Page Layout */}
      <div className="erp-main">
        <Navbar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          theme={theme}
          toggleTheme={toggleTheme}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="erp-content" id="mandi-spa-content">
          <DashboardView
            dashboardData={dashboardData}
            suppliers={suppliers}
            truckPayments={truckPayments}
            products={products}
            trucks={trucks}
            customers={customers}
            salesList={salesList}
            customerLedger={customerLedger}
            purchasesList={purchasesList}
            setCustomers={setCustomers}
            setSuppliers={setSuppliers}
            setSalesList={setSalesList}
            setActiveTab={setActiveTab}
            onRefresh={loadAllData}
            showToast={showToast}
            isFormOpen={inwardFormOpen}
            setIsFormOpen={setInwardFormOpen}
            isCustomerModalOpen={customerModalOpen}
            setIsCustomerModalOpen={setCustomerModalOpen}
            isSupplierTrucksModalOpen={supplierModalOpen}
            setIsSupplierTrucksModalOpen={setSupplierModalOpen}
            searchQuery={searchQuery}
            currentUser={currentUser}
            activeTab={activeTab}
          />
        </main>
      </div>

      {/* Toast Popups */}
      {toast && (
        <div className="toast-container">
          <div className="toast" style={{ borderColor: toast.type === 'error' ? '#fb7185' : '#34d399' }}>
            <span style={{ color: toast.type === 'error' ? '#fb7185' : '#34d399', fontWeight: 800 }}>
              {toast.type === 'error' ? '!' : '✓'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
