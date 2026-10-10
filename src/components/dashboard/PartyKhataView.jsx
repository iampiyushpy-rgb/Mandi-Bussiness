import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  DollarSign,
  Truck,
  CreditCard,
  Building2,
  Phone,
  Calendar,
  Package,
  ArrowRight,
  ReceiptText,
  X,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../services/api';

export default function PartyKhataView({
  unifiedSuppliers = [],
  suppliers = [],
  setSuppliers,
  supplierProfiles = [],
  setSupplierProfiles,
  purchasesList = [],
  truckSalesList = [],
  setTruckSalesList,
  salesList = [],
  cashSaleSettlements = [],
  setCashSaleSettlements,
  saveCashSaleSettlements,
  cashSalePayments = [],
  setCashSalePayments,
  saveCashSalePayments,
  getSystemDate,
  showToast,
  onBack
}) {
  const sysDate = getSystemDate ? getSystemDate() : new Date().toISOString().slice(0, 10);

  // Selected Supplier for Detail / Transition History View
  const [selectedSuppName, setSelectedSuppName] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);

  // Payment form state (Kis date me kitna amount diya)
  const [paymentForm, setPaymentForm] = useState({
    date: sysDate,
    supplier_name: '',
    amount: '',
    payment_method: 'CASH',
    reference: '',
    notes: ''
  });

  // Date formatter
  const formatDateLabel = (dStr) => {
    if (!dStr) return '';
    try {
      const s = String(dStr).trim();
      const clean = s.includes('T') ? s.split('T')[0] : s;
      const parts = clean.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch { }
    return dStr;
  };

  // ---------------------------------------------------------------------------
  // 1. Unified Master List of All Suppliers
  //    (Directly reflects live master suppliers & active lot profiles)
  // ---------------------------------------------------------------------------
  const allSuppliers = useMemo(() => {
    const map = new Map();

    // 1. From master registered suppliers
    (suppliers || []).forEach(s => {
      const name = (s.supplier_name || s.name || '').trim();
      if (name) {
        map.set(name.toLowerCase(), {
          id: s.id || `supp-${name}`,
          supplier_name: name,
          phone: s.phone || '',
          city: s.city || '',
          bank_name: s.bank_name || '',
          account_number: s.account_number || '',
          ifsc_code: s.ifsc_code || '',
          branch_name: s.branch_name || ''
        });
      }
    });

    // 2. From active supplierProfiles (lot cards on Mandi board / admin dashboard)
    (supplierProfiles || []).forEach(sp => {
      const name = (sp.supplier_name || '').trim();
      if (name) {
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: sp.id || `sp-${name}`,
            supplier_name: name,
            phone: sp.phone || '',
            city: '',
            bank_name: sp.bank_name || '',
            account_number: sp.account_number || '',
            ifsc_code: sp.ifsc_code || '',
            branch_name: sp.branch_name || ''
          });
        } else {
          const existing = map.get(key);
          if (!existing.phone && sp.phone) existing.phone = sp.phone;
          if (!existing.bank_name && sp.bank_name) existing.bank_name = sp.bank_name;
        }
      }
    });

    // 3. From saved settlements
    (cashSaleSettlements || []).forEach(cs => {
      const name = (cs.supplier_name || '').trim();
      if (name) {
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: `settle-supp-${name}`,
            supplier_name: name,
            phone: '',
            city: '',
            bank_name: '',
            account_number: '',
            ifsc_code: '',
            branch_name: ''
          });
        }
      }
    });

    // 4. From cashSalePayments (payments given / paisa diya)
    (cashSalePayments || []).forEach(cp => {
      const name = (cp.supplier_name || '').trim();
      if (name) {
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: `pay-supp-${name}`,
            supplier_name: name,
            phone: '',
            city: '',
            bank_name: '',
            account_number: '',
            ifsc_code: '',
            branch_name: ''
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
  }, [suppliers, supplierProfiles, cashSaleSettlements, cashSalePayments]);

  // ---------------------------------------------------------------------------
  // 2. Helper: Get All Settled Trucks for a Supplier
  //    (ONLY trucks jinka 'Vyapari Invoice Settlement' ka Save Settlement complete hai)
  // ---------------------------------------------------------------------------
  const getSupplierTrucks = (sName) => {
    if (!sName) return [];
    const norm = sName.trim().toLowerCase();
    const truckMap = new Map();

    // 1. Get all saved settlements from cashSaleSettlements (props or localStorage)
    const settlementsSource = (cashSaleSettlements && cashSaleSettlements.length > 0)
      ? cashSaleSettlements
      : (() => {
          try {
            return JSON.parse(localStorage.getItem('mandi_cash_sale_settlements')) || [];
          } catch { return []; }
        })();

    // 2. Filter settlements strictly for this supplier
    const suppSettlements = (settlementsSource || []).filter(st => {
      const stSupp = (st.supplier_name || '').trim().toLowerCase();
      return stSupp === norm;
    });

    // If no settlement has been saved for this supplier, return empty array
    if (suppSettlements.length === 0) {
      return [];
    }

    // 3. For each saved settlement, build the truck arrival & bikri entry
    suppSettlements.forEach(st => {
      const cleanStTruck = (st.truck_no || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const key = cleanStTruck || `settlement-${st.id}`;

      // Match with lot in supplierProfiles if available
      const matchedLot = (supplierProfiles || []).find(lot => {
        const lotSupp = (lot.supplier_name || '').trim().toLowerCase();
        if (lotSupp !== norm) return false;
        const cleanLotTruck = (lot.truckno || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleanStTruck && cleanLotTruck && cleanStTruck === cleanLotTruck) return true;
        if (lot.truckno && st.truck_no && lot.truckno.trim().toLowerCase() === st.truck_no.trim().toLowerCase()) return true;
        return false;
      });

      // Calculate total sold from truckSalesList if needed
      const lotSales = (truckSalesList || []).filter(s => {
        if (matchedLot && s.lot_id && String(s.lot_id) === String(matchedLot.id)) return true;
        const sTruckClean = (s.truck_no || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleanStTruck && sTruckClean === cleanStTruck) return true;
        return false;
      });
      const totalSoldFromSales = lotSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const totalBoxesSold = lotSales.reduce((sum, s) => sum + Number(s.boxes || 0), 0);

      // Settlement Total Amount (user request: iska total amount party khata ke truck arrivals & bikri section ke total sold amount me set ho jaaye)
      const settlementTotal = (st.total_amount !== undefined && st.total_amount !== null)
        ? Number(st.total_amount)
        : ((st.net_invoice !== undefined && st.net_invoice !== null)
          ? Number(st.net_invoice)
          : Number(st.gross_bikri || 0));

      const soldAmount = settlementTotal > 0
        ? settlementTotal
        : (totalSoldFromSales > 0 ? totalSoldFromSales : Number(matchedLot?.total_sold || 0));

      const boxesCount = Number(st.boxes || matchedLot?.boxes || totalBoxesSold || 0);
      const fruitName = st.fruit || matchedLot?.fruit || matchedLot?.product_name || (lotSales[0]?.product_name) || 'Produce';
      const arrivalDate = matchedLot?.date || matchedLot?.entry_date || st.saved_date || sysDate;

      truckMap.set(key, {
        id: st.id || matchedLot?.id || key,
        truck_no: st.truck_no || matchedLot?.truckno || `Truck #${st.id}`,
        arrival_date: arrivalDate,
        product_name: fruitName,
        variety: matchedLot?.variety || '',
        boxes: boxesCount,
        boxes_sold: totalBoxesSold > 0 ? totalBoxesSold : boxesCount,
        total_sold: soldAmount,
        settlement: st
      });
    });

    return Array.from(truckMap.values()).sort((a, b) => String(b.arrival_date).localeCompare(String(a.arrival_date)));
  };

  // ---------------------------------------------------------------------------
  // 3. Helper: Get Payments Given to Supplier (Kis date me kitna amount diye)
  // ---------------------------------------------------------------------------
  const getSupplierPayments = (sName) => {
    if (!sName) return [];
    const norm = sName.trim().toLowerCase();
    return (cashSalePayments || [])
      .filter(p => (p.supplier_name || '').trim().toLowerCase() === norm)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  };

  // ---------------------------------------------------------------------------
  // 4. Financial Summary for any Supplier
  // ---------------------------------------------------------------------------
  const getSupplierFinancials = (sName) => {
    const trucks = getSupplierTrucks(sName);
    const payments = getSupplierPayments(sName);
    const totalSold = trucks.reduce((sum, t) => sum + Number(t.total_sold || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balance = Math.max(0, totalSold - totalPaid);
    return {
      truckCount: trucks.length,
      totalSold,
      totalPaid,
      balance,
      trucks,
      payments
    };
  };

  // Filtered suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return allSuppliers;
    const q = searchQuery.toLowerCase().trim();
    return allSuppliers.filter(s =>
      (s.supplier_name || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.bank_name || '').toLowerCase().includes(q)
    );
  }, [allSuppliers, searchQuery]);

  // Overall Global Stats for Header
  const globalSummary = useMemo(() => {
    let totalBusiness = 0;
    let totalGiven = 0;
    allSuppliers.forEach(s => {
      const fin = getSupplierFinancials(s.supplier_name);
      totalBusiness += fin.totalSold;
      totalGiven += fin.totalPaid;
    });
    return {
      totalSuppliers: allSuppliers.length,
      totalBusiness,
      totalGiven,
      totalPending: Math.max(0, totalBusiness - totalGiven)
    };
  }, [allSuppliers, supplierProfiles, truckSalesList, cashSalePayments, cashSaleSettlements]);

  // ---------------------------------------------------------------------------
  // 5. Actions: Record Payment (Paisa Diya) & Delete
  // ---------------------------------------------------------------------------
  const handleOpenPayModal = (suppName = null) => {
    setPaymentForm({
      date: sysDate,
      supplier_name: suppName || selectedSuppName || allSuppliers[0]?.supplier_name || '',
      amount: '',
      payment_method: 'CASH',
      reference: '',
      notes: ''
    });
    setPayModalOpen(true);
  };

  const handleSavePayment = (e) => {
    e.preventDefault();
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      if (showToast) showToast('Please enter a valid payment amount', 'error');
      return;
    }
    if (!paymentForm.supplier_name) {
      if (showToast) showToast('Please select a supplier', 'error');
      return;
    }

    const newPayment = {
      id: Date.now(),
      supplier_name: paymentForm.supplier_name,
      date: paymentForm.date || sysDate,
      amount: amt,
      payment_method: paymentForm.payment_method || 'CASH',
      reference: paymentForm.reference || `PAY-${Date.now().toString().slice(-4)}`,
      notes: paymentForm.notes || ''
    };

    const updated = [newPayment, ...(cashSalePayments || [])];
    setCashSalePayments(updated);
    if (saveCashSalePayments) saveCashSalePayments(updated);
    try {
      localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updated));
    } catch { }

    setPayModalOpen(false);
    if (showToast) showToast(`Payment ₹${amt.toLocaleString('en-IN')} recorded for ${paymentForm.supplier_name}! 💵`, 'success');
  };

  // Delete Single Payment
  const handleDeletePayment = async (payId) => {
    if (window.confirm('Kya aap yeh payment record delete karna chahte hain?')) {
      // 0. Remove from backend database if registered
      try {
        if (payId && typeof payId === 'number' && payId < 1000000000000) {
          await api.delete(`/payments/${payId}/`).catch(() => null);
        }
      } catch {
        // ignore network error
      }

      const updated = (cashSalePayments || []).filter(p => p.id !== payId);
      setCashSalePayments(updated);
      if (saveCashSalePayments) saveCashSalePayments(updated);
      try {
        localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updated));
      } catch { }
      if (showToast) showToast('Payment record delete ho gaya', 'info');
    }
  };

  // Delete Single Supplier's Data
  const handleDeleteSupplierData = async (sName) => {
    if (!sName) return;
    if (window.confirm(`Kya aap "${sName}" ka saara Party Khata data (Profiles, Bikri, Payments) delete karna chahte hain?`)) {
      const norm = sName.trim().toLowerCase();

      // 0. Delete from backend database if registered supplier
      try {
        const match = (suppliers || []).find(s => (s.supplier_name || s.name || '').trim().toLowerCase() === norm);
        if (match?.id && typeof match.id === 'number' && match.id < 1000000000000) {
          await api.delete(`/suppliers/${match.id}/`).catch(() => null);
        }
      } catch {
        // ignore network error
      }

      // 1. Remove from supplierProfiles
      if (setSupplierProfiles) {
        setSupplierProfiles(prev => {
          const updated = prev.filter(sp => (sp.supplier_name || '').trim().toLowerCase() !== norm);
          try { localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }

      // 2. Remove all sales associated with this supplier from truckSalesList
      if (setTruckSalesList) {
        setTruckSalesList(prev => {
          const updated = prev.filter(s => (s.supplier_name || '').trim().toLowerCase() !== norm);
          try { localStorage.setItem('mandi_truck_sales', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }

      // 3. Remove payments for this supplier
      const updatedPayments = (cashSalePayments || []).filter(p => (p.supplier_name || '').trim().toLowerCase() !== norm);
      setCashSalePayments(updatedPayments);
      if (saveCashSalePayments) saveCashSalePayments(updatedPayments);
      try {
        localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updatedPayments));
      } catch { }

      // 4. Remove settlements
      const updatedSettlements = (cashSaleSettlements || []).filter(s => (s.supplier_name || '').trim().toLowerCase() !== norm);
      setCashSaleSettlements(updatedSettlements);
      if (saveCashSaleSettlements) saveCashSaleSettlements(updatedSettlements);
      try {
        localStorage.setItem('mandi_cash_sale_settlements', JSON.stringify(updatedSettlements));
      } catch { }

      // 5. Remove from master suppliers if registered
      if (setSuppliers) {
        setSuppliers(prev => prev.filter(s => (s.supplier_name || s.name || '').trim().toLowerCase() !== norm));
      }

      setSelectedSuppName(null);
      if (showToast) showToast(`"${sName}" ka saara data successfully delete ho gaya! 🗑️`, 'info');
    }
  };

  // Delete ALL Party Khata Data
  const handleDeleteAllKhataData = async () => {
    // 0. Trigger backend reset to wipe all transactional data from database
    try {
      await api.post('/core/reset-all-data/').catch(() => null);
    } catch {
      // ignore
    }

    // 1. Clear payments
    setCashSalePayments([]);
    if (saveCashSalePayments) saveCashSalePayments([]);
    try { localStorage.removeItem('mandi_cash_sale_payments'); } catch { }

    // 2. Clear settlements
    setCashSaleSettlements([]);
    if (saveCashSaleSettlements) saveCashSaleSettlements([]);
    try {
      localStorage.removeItem('mandi_cash_sale_settlements');
      localStorage.removeItem('mandi_truck_settlements');
    } catch { }

    // 3. Clear active supplier profiles / lots
    if (setSupplierProfiles) {
      setSupplierProfiles([]);
      try { localStorage.removeItem('dashboard_supplier_profiles'); } catch {}
    }

    // 4. Clear truck sales
    if (setTruckSalesList) {
      setTruckSalesList([]);
      try {
        localStorage.removeItem('mandi_truck_sales');
        localStorage.setItem('mandi_truck_sales', '[]');
      } catch {}
    }

    setSelectedSuppName(null);
    setConfirmDeleteAllOpen(false);
    if (showToast) showToast('Party Khata ka saara data successfully delete ho gaya! 🗑️', 'info');
  };

  // Active supplier details if in detail view
  const currentSupp = useMemo(() => {
    if (!selectedSuppName) return null;
    const found = allSuppliers.find(s => s.supplier_name.trim().toLowerCase() === selectedSuppName.trim().toLowerCase());
    return found || { supplier_name: selectedSuppName, phone: '', bank_name: '' };
  }, [allSuppliers, selectedSuppName]);

  const currentFinancials = useMemo(() => {
    if (!selectedSuppName) return null;
    return getSupplierFinancials(selectedSuppName);
  }, [selectedSuppName, supplierProfiles, truckSalesList, cashSalePayments, cashSaleSettlements]);

  return (
    <div
      className="party-khata-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: '85vh',
        width: '100%',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      <style>{`
        .party-khata-container {
          gap: 12px !important;
        }
        .supp-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }
        .supp-card {
          background: var(--bg-card, #ffffff);
          border: 1.5px solid var(--border-subtle, #e2e8f0);
          border-left: 3.5px solid #f59e0b;
          border-radius: 10px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
        }
        .supp-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(245, 158, 11, 0.14);
          border-color: #f59e0b;
        }
        @media (max-width: 768px) {
          .party-khata-container {
            gap: 10px !important;
          }
          .party-khata-header {
            padding: 8px 10px !important;
            gap: 8px !important;
            border-radius: 10px !important;
          }
          .party-khata-subtitle {
            display: none !important;
          }
          .party-khata-search-bar {
            padding: 6px 10px !important;
            border-radius: 8px !important;
          }
          .supp-card-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .supp-card {
            padding: 10px 12px !important;
            border-radius: 9px !important;
          }
          .detail-section-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .party-kpi-row {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .supplier-header-banner {
            padding: 10px 12px !important;
            gap: 10px !important;
            border-radius: 10px !important;
          }
        }
      `}</style>

      {/* ===================================================================== */}
      {/* 1. TOP HEADER / ACTIONS (PARTY KHATA MAIN NAVBAR)                     */}
      {/* ===================================================================== */}
      <div
        className="party-khata-header"
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1.5px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '12px',
          padding: '10px 16px',
          boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.04))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {selectedSuppName ? (
            <button
              onClick={() => setSelectedSuppName(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#d97706',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                height: '28px',
                minHeight: 'unset',
                flexShrink: 0
              }}
            >
              <ChevronLeft size={14} />
              <span>All Suppliers</span>
            </button>
          ) : (
            onBack && (
              <button
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'var(--bg-main, #f8fafc)',
                  border: '1px solid var(--border-light, #cbd5e1)',
                  color: 'var(--text-secondary, #475569)',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  height: '28px',
                  minHeight: 'unset',
                  flexShrink: 0
                }}
              >
                <ChevronLeft size={14} />
                <span>Dashboard</span>
              </button>
            )
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                flexShrink: 0
              }}
            >
              <ReceiptText size={16} />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                  Party Khata
                </h2>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.14)',
                    color: '#b45309',
                    fontWeight: 800,
                    fontSize: '0.62rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {selectedSuppName ? 'TRANSITION HISTORY' : 'ALL SUPPLIERS'}
                </span>
              </div>
              <div className="party-khata-subtitle" style={{ fontSize: '0.70rem', color: 'var(--text-muted, #64748b)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedSuppName
                  ? `${selectedSuppName} - Truck arrival & payment records`
                  : 'Supplier profile cards, truck lot arrivals aur jama records'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: ALL SUPPLIER PROFILES IN CARD-WISE GRID FORMAT                */}
      {/* ===================================================================== */}
      {!selectedSuppName ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Search bar & Supplier count */}
          <div
            className="party-khata-search-bar"
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '10px',
              border: '1.5px solid var(--border-subtle, #e2e8f0)',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 200px', minWidth: 0 }}>
              <Search size={14} color="var(--text-muted, #64748b)" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search supplier name, phone..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  color: 'var(--text-main, #0f172a)',
                  width: '100%',
                  height: '26px'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem', padding: '0 4px', minHeight: 'unset' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Total: <b style={{ color: '#d97706' }}>{filteredSuppliers.length}</b>
            </div>
          </div>

          {/* Supplier Cards Grid */}
          {filteredSuppliers.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-card, #ffffff)',
                borderRadius: '12px',
                border: '1.5px dashed var(--border-subtle, #cbd5e1)',
                padding: '40px 16px',
                textAlign: 'center',
                color: 'var(--text-muted, #64748b)'
              }}
            >
              <Users size={32} color="#d97706" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-main, #0f172a)', fontWeight: 800 }}>
                Koi Supplier Nahi Mila
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem' }}>
                {searchQuery ? 'Search term change karke dekhein.' : 'Supplier profile add karne ke baad yahan card show honge.'}
              </p>
            </div>
          ) : (
            <div className="supp-card-grid">
              {filteredSuppliers.map(supp => {
                const fin = getSupplierFinancials(supp.supplier_name);
                const firstLetter = (supp.supplier_name || 'S')[0].toUpperCase();

                return (
                  <div
                    key={supp.supplier_name}
                    className="supp-card"
                    onClick={() => setSelectedSuppName(supp.supplier_name)}
                  >
                    <div>
                      {/* Card Top: Avatar & Supplier Name & Direct Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.92rem',
                              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)',
                              flexShrink: 0
                            }}
                          >
                            {firstLetter}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: '0.88rem',
                                fontWeight: 800,
                                color: 'var(--text-main, #0f172a)',
                                letterSpacing: '-0.01em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {supp.supplier_name}
                            </h3>
                            {supp.phone ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', marginTop: '1px' }}>
                                <Phone size={10} color="#f59e0b" />
                                <span>{supp.phone}</span>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '1px' }}>
                                Supplier Profile
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Direct Delete Trash Button on Card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSupplierData(supp.supplier_name);
                          }}
                          title={`Delete ${supp.supplier_name} from Party Khata`}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.22)',
                            color: '#ef4444',
                            borderRadius: '6px',
                            width: '24px',
                            height: '24px',
                            minHeight: 'unset',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>

                      {/* Bank / City Tag if available */}
                      {supp.bank_name && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.64rem',
                            background: 'var(--bg-main, #f8fafc)',
                            border: '1px solid var(--border-light, #e2e8f0)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: 'var(--text-secondary, #475569)',
                            marginBottom: '6px',
                            fontWeight: 600
                          }}
                        >
                          <Building2 size={10} color="#d97706" />
                          <span>{supp.bank_name}</span>
                        </div>
                      )}

                      {/* Metrics Summary inside Card */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '4px 8px',
                          background: 'var(--bg-main, #f8fafc)',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          border: '1px solid var(--border-subtle, #f1f5f9)',
                          marginBottom: '8px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.60rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Trucks Arrived
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                            🚚 {fin.truckCount} Trucks
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.60rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Total Bikri
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669' }}>
                            ₹{fin.totalSold.toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.60rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Paisa Diya
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2563eb' }}>
                            ₹{fin.totalPaid.toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.60rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Balance
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: fin.balance > 0 ? '#dc2626' : '#059669' }}>
                            ₹{fin.balance.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-subtle, #f1f5f9)',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#d97706'
                      }}
                    >
                      <span>View Transition History</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================== */
        /* VIEW 2: SUPPLIER SPECIFIC TRANSITION HISTORY (EXACT 2 SECTIONS)       */
        /* ===================================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Supplier Header Banner */}
          <div
            className="supplier-header-banner"
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '10px',
              border: '1.5px solid var(--border-subtle, #e2e8f0)',
              borderLeft: '4px solid #d97706',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.03))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  boxShadow: '0 3px 8px rgba(245, 158, 11, 0.3)',
                  flexShrink: 0
                }}
              >
                {(selectedSuppName || 'S')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SUPPLIER PROFILE
                </div>
                <h2 style={{ margin: '1px 0 2px 0', fontSize: '1.08rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                  {selectedSuppName}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-secondary, #475569)' }}>
                  {currentSupp?.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={11} color="#d97706" /> {currentSupp.phone}
                    </span>
                  )}
                  {currentSupp?.bank_name && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={11} color="#d97706" /> {currentSupp.bank_name} {currentSupp.account_number ? `(A/C: ${currentSupp.account_number})` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Highlights */}
            <div className="party-kpi-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div
                style={{
                  background: 'rgba(5, 150, 105, 0.08)',
                  border: '1px solid rgba(5, 150, 105, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.60rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                  Total Bikri
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#059669', marginTop: '1px' }}>
                  ₹{currentFinancials?.totalSold.toLocaleString('en-IN')}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.60rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>
                  Paisa Diya
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#2563eb', marginTop: '1px' }}>
                  ₹{currentFinancials?.totalPaid.toLocaleString('en-IN')}
                </div>
              </div>

              <div
                style={{
                  background: (currentFinancials?.balance || 0) > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(5, 150, 105, 0.08)',
                  border: (currentFinancials?.balance || 0) > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(5, 150, 105, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.60rem', fontWeight: 800, color: (currentFinancials?.balance || 0) > 0 ? '#dc2626' : '#059669', textTransform: 'uppercase' }}>
                  Pending Balance
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: (currentFinancials?.balance || 0) > 0 ? '#dc2626' : '#059669', marginTop: '1px' }}>
                  ₹{currentFinancials?.balance.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* TWO MAIN SECTIONS REQUESTED BY USER                                */}
          {/* =================================================================== */}
          <div className="detail-section-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            {/* ----------------------------------------------------------------- */}
            {/* SECTION 1: TRUCK ARRIVALS & BIKRI HISTORY                         */}
            {/* (Jis din truck aaya / lot add hua us din ka date, product name,   */}
            {/*  us truck se sell hua total amount)                              */}
            {/* ----------------------------------------------------------------- */}
            <div
              style={{
                background: 'var(--bg-card, #ffffff)',
                borderRadius: '10px',
                border: '1.5px solid var(--border-subtle, #e2e8f0)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.03))',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Section Header */}
              <div
                style={{
                  padding: '9px 12px',
                  background: 'var(--bg-main, #f8fafc)',
                  borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(5, 150, 105, 0.12)',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Truck size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      Truck Arrivals & Bikri
                    </h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>
                      Truck aane ki date, product name aur total sold bikri
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    background: 'rgba(5, 150, 105, 0.1)',
                    color: '#047857',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {currentFinancials?.trucks.length || 0} Trucks
                </span>
              </div>

              {/* Truck List Table */}
              {(!currentFinancials?.trucks || currentFinancials.trucks.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted, #64748b)' }}>
                  <Truck size={30} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main, #0f172a)' }}>
                    Koi settled truck record nahi mila
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>
                    Truck-wise Order & Sales Details section ke Vyapari Invoice Settlement ka 'Save Settlement' complete hone ke baad yahan show hoga.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-main, #f8fafc)', borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)' }}>
                        <th style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800 }}>
                          Date (Arrival)
                        </th>
                        <th style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800 }}>
                          Product Name
                        </th>
                        <th style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800, textAlign: 'right' }}>
                          Total Sold Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentFinancials.trucks.map((truck, idx) => (
                        <tr
                          key={`${truck.id}-${idx}`}
                          style={{
                            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(5, 150, 105, 0.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* 1. DATE (Truck Aane Ki Date) */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main, #0f172a)' }}>
                              {formatDateLabel(truck.arrival_date)}
                            </div>
                            {truck.truck_no && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', fontFamily: 'monospace' }}>
                                🚚 {truck.truck_no}
                              </div>
                            )}
                          </td>

                          {/* 2. PRODUCT NAME */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                  color: 'var(--text-main, #0f172a)'
                                }}
                              >
                                {truck.product_name}
                              </span>
                              {truck.boxes > 0 && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    color: '#1d4ed8',
                                    fontWeight: 700
                                  }}
                                >
                                  {truck.boxes} BX
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. US TRUCK SE SELL HUA TOTAL AMOUNT */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: '0.96rem',
                                color: '#059669',
                                letterSpacing: '-0.01em'
                              }}
                            >
                              ₹{Number(truck.total_sold || 0).toLocaleString('en-IN')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--bg-main, #f8fafc)', borderTop: '1.5px solid var(--border-subtle, #e2e8f0)', fontWeight: 800 }}>
                        <td colSpan={2} style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-secondary, #475569)' }}>
                          Total Bikri ({currentFinancials.trucks.length} Trucks):
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.96rem', color: '#059669', fontWeight: 900 }}>
                          ₹{currentFinancials.totalSold.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* SECTION 2: SUPPLIER PAYMENTS GIVEN (PAISA DIYA)                   */}
            {/* (Kis date me kitna amount diye, amount bs)                        */}
            {/* ----------------------------------------------------------------- */}
            <div
              style={{
                background: 'var(--bg-card, #ffffff)',
                borderRadius: '10px',
                border: '1.5px solid var(--border-subtle, #e2e8f0)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.03))',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Section Header */}
              <div
                style={{
                  padding: '9px 12px',
                  background: 'var(--bg-main, #f8fafc)',
                  borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(37, 99, 235, 0.12)',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      Paisa Diya
                    </h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>
                      Kis date me kitna payment diya gaya
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      background: 'rgba(37, 99, 235, 0.1)',
                      color: '#1d4ed8',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {currentFinancials?.payments.length || 0} Records
                  </span>
                </div>
              </div>

              {/* Payments List Table */}
              {(!currentFinancials?.payments || currentFinancials.payments.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted, #64748b)' }}>
                  <CreditCard size={30} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main, #0f172a)' }}>
                    Abhi tak koi payment record nahi hai
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>
                    Cash Sell Transactions me se supplier expenses save karne par yahan records show honge.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-main, #f8fafc)', borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)' }}>
                        <th style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800 }}>
                          Date (Kis Date Me)
                        </th>
                        <th style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800, textAlign: 'right' }}>
                          Amount Diya (Kitna Amount)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentFinancials.payments.map((pay, idx) => (
                        <tr
                          key={`${pay.id}-${idx}`}
                          style={{
                            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* 1. KIS DATE ME */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main, #0f172a)' }}>
                              {formatDateLabel(pay.date)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  color: '#b45309',
                                  fontWeight: 700
                                }}
                              >
                                {pay.payment_method || 'CASH'}
                              </span>
                              {pay.notes &&
                               !pay.notes.toLowerCase().includes('supplier payment') &&
                               !pay.notes.toLowerCase().includes('paisa diya') && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)' }}>
                                  • {pay.notes}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. KITNA AMOUNT DIYE (AMOUNT BS) */}
                          <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: '1rem',
                                color: '#2563eb',
                                letterSpacing: '-0.01em'
                              }}
                            >
                              ₹{Number(pay.amount || 0).toLocaleString('en-IN')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--bg-main, #f8fafc)', borderTop: '1.5px solid var(--border-subtle, #e2e8f0)', fontWeight: 800 }}>
                        <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-secondary, #475569)' }}>
                          Total Paisa Diya:
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.96rem', color: '#2563eb', fontWeight: 900 }}>
                          ₹{currentFinancials.totalPaid.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: RECORD PAYMENT (PAISA DIYA)                                   */}
      {/* ===================================================================== */}
      {payModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              border: '1.5px solid var(--border-subtle, #e2e8f0)',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, transparent 100%)',
                borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <DollarSign size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main, #0f172a)' }}>
                    Paisa Diya (Record Payment)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>
                    Supplier ko payment record karein
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePayment} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary, #475569)', display: 'block', marginBottom: '4px' }}>
                  Supplier Name *
                </label>
                <select
                  value={paymentForm.supplier_name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplier_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    outline: 'none',
                    background: '#ffffff'
                  }}
                  required
                >
                  <option value="">-- Select Supplier --</option>
                  {allSuppliers.map(s => (
                    <option key={s.supplier_name} value={s.supplier_name}>
                      {s.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary, #475569)', display: 'block', marginBottom: '4px' }}>
                    Payment Date (Kis Date Me) *
                  </label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      outline: 'none',
                      background: '#ffffff'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary, #475569)', display: 'block', marginBottom: '4px' }}>
                    Amount (Kitna Diye ₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Enter ₹ amount"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #059669',
                      fontSize: '1rem',
                      fontWeight: 900,
                      color: '#059669',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary, #475569)', display: 'block', marginBottom: '4px' }}>
                  Payment Mode
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  <option value="CASH">Cash (Rokda)</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary, #475569)', display: 'block', marginBottom: '4px' }}>
                  Note / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid in full / Part payment"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.84rem',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'transparent',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  <Check size={16} />
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CONFIRM DELETE ALL PARTY KHATA DATA                            */}
      {/* ===================================================================== */}
      {confirmDeleteAllOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}
            >
              <Trash2 size={26} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.18rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
              Party Khata Data Delete Karein?
            </h3>

            <p style={{ margin: '0 0 20px 0', fontSize: '0.84rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
              Kya aap Party Khata ka saara data delete karna chahte hain? Isse sabhi <b>Supplier Profiles, Bikri & Sales Records</b> aur <b>Paisa Diya Payment Records</b> delete ho jayenge.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteAllOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: 'transparent',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllKhataData}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                }}
              >
                Yes, Delete All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
