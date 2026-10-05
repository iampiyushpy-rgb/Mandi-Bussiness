import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Banknote,
  CreditCard,
  Wallet,
  UserCheck,
  Truck,
  TrendingUp,
  TrendingDown,
  X,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Receipt,
  Package,
  ClipboardList
} from 'lucide-react';

const getDefaultDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

const normalizeDateStr = (rawDate) => {
  if (!rawDate) return '';
  const s = String(rawDate).trim();
  if (s.includes('T')) return s.split('T')[0];
  if (s.length >= 10) return s.slice(0, 10);
  return s;
};

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK', 'CHEQUE', 'NEFT', 'RTGS'];

export default function CashSellTransactionsView({
  customerProfiles = [],
  setCustomerProfiles,
  suppliers = [],
  supplierProfiles = [],
  cashSalePayments = [],
  setCashSalePayments,
  saveCashSalePayments,
  allSupplierNames = [],
  unifiedSuppliers = [],
  truckSalesList = [],
  salesList = [],
  purchasesList = [],
  getSystemDate,
  showToast,
  onBack
}) {
  const sysDate = getSystemDate ? getSystemDate() : getDefaultDate();

  // Active tab: 'collection' or 'expenses'
  const [activeSection, setActiveSection] = useState('collection');

  // Date filter for history
  const [filterDate, setFilterDate] = useState(sysDate);

  // Today Report Drawer
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [bfAmount, setBfAmount] = useState('');
  const [extraCashAmount, setExtraCashAmount] = useState('');

  // ========================================================================
  // COLLECTION (Tagada) — Customer se paisa liya
  // ========================================================================
  const [collectionRows, setCollectionRows] = useState([
    { id: Date.now(), date: sysDate, customer_name: '', amount: '', mode: 'CASH' }
  ]);
  const [collectionSuggestions, setCollectionSuggestions] = useState({});
  const [collectionSavingIdx, setCollectionSavingIdx] = useState(null);

  // All customer names for autocomplete
  const allCustomerNames = useMemo(() => {
    const set = new Set();
    (customerProfiles || []).forEach(c => {
      const n = (c.customer_name || c.name || '').trim();
      if (n) set.add(n);
    });
    return [...set].sort();
  }, [customerProfiles]);

  const handleCollectionChange = (idx, field, value) => {
    setCollectionRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    if (field === 'customer_name' && value.trim()) {
      const q = value.trim().toLowerCase();
      const matches = allCustomerNames.filter(n => n.toLowerCase().includes(q));
      setCollectionSuggestions(prev => ({ ...prev, [idx]: matches }));
    } else if (field === 'customer_name') {
      setCollectionSuggestions(prev => ({ ...prev, [idx]: [] }));
    }
  };

  const handleSelectCollectionCustomer = (idx, name) => {
    setCollectionRows(prev => prev.map((r, i) => i === idx ? { ...r, customer_name: name } : r));
    setCollectionSuggestions(prev => ({ ...prev, [idx]: [] }));
  };

  const addCollectionRow = () => {
    setCollectionRows(prev => [...prev, { id: Date.now() + Math.random(), date: sysDate, customer_name: '', amount: '', mode: 'CASH' }]);
  };

  const removeCollectionRow = (idx) => {
    if (collectionRows.length <= 1) return;
    setCollectionRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveCollection = () => {
    const validRows = collectionRows.filter(r => r.customer_name.trim() && Number(r.amount) > 0);
    if (validRows.length === 0) {
      if (showToast) showToast('Please fill at least one valid entry (customer + amount)', 'error');
      return;
    }

    validRows.forEach(row => {
      const amt = Number(row.amount);
      const custName = row.customer_name.trim();
      const newPayment = {
        id: Date.now() + Math.random(),
        date: row.date || sysDate,
        amount: amt,
        payment_method: row.mode || 'CASH',
        reference: `COL-${Date.now().toString().slice(-4)}`,
        notes: 'Collection / Tagada'
      };

      // Save into customer's payment_history
      if (setCustomerProfiles) {
        setCustomerProfiles(prev => {
          const exists = prev.find(c => (c.customer_name || c.name || '').trim().toLowerCase() === custName.toLowerCase());
          if (exists) {
            return prev.map(c => {
              if ((c.customer_name || c.name || '').trim().toLowerCase() === custName.toLowerCase()) {
                return {
                  ...c,
                  total_paid: Number(c.total_paid || 0) + amt,
                  current_balance: Math.max(0, Number(c.current_balance || 0) - amt),
                  payment_history: [newPayment, ...(c.payment_history || [])]
                };
              }
              return c;
            });
          }
          return prev;
        });
      }
    });

    if (showToast) showToast(`${validRows.length} customer payment(s) saved successfully! 💵`, 'success');
    // Reset form
    setCollectionRows([{ id: Date.now(), date: sysDate, customer_name: '', amount: '', mode: 'CASH' }]);
  };

  // ========================================================================
  // EXPENSES — Supplier ko paisa diya
  // ========================================================================
  const [expenseRows, setExpenseRows] = useState([
    { id: Date.now(), date: sysDate, supplier_name: '', amount: '', mode: 'CASH' }
  ]);
  const [expenseSuggestions, setExpenseSuggestions] = useState({});

  // All supplier names for autocomplete
  const allSupplierNamesList = useMemo(() => {
    const set = new Set();
    (suppliers || []).forEach(s => {
      const n = (s.supplier_name || s.name || '').trim();
      if (n) set.add(n);
    });
    (supplierProfiles || []).forEach(sp => {
      const n = (sp.supplier_name || '').trim();
      if (n) set.add(n);
    });
    (unifiedSuppliers || []).forEach(s => {
      const n = (s.supplier_name || s.name || '').trim();
      if (n) set.add(n);
    });
    (allSupplierNames || []).forEach(n => { if (n) set.add(n.trim()); });
    return [...set].sort();
  }, [suppliers, supplierProfiles, unifiedSuppliers, allSupplierNames]);

  const handleExpenseChange = (idx, field, value) => {
    setExpenseRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    if (field === 'supplier_name' && value.trim()) {
      const q = value.trim().toLowerCase();
      const matches = allSupplierNamesList.filter(n => n.toLowerCase().includes(q));
      setExpenseSuggestions(prev => ({ ...prev, [idx]: matches }));
    } else if (field === 'supplier_name') {
      setExpenseSuggestions(prev => ({ ...prev, [idx]: [] }));
    }
  };

  const handleSelectExpenseSupplier = (idx, name) => {
    setExpenseRows(prev => prev.map((r, i) => i === idx ? { ...r, supplier_name: name } : r));
    setExpenseSuggestions(prev => ({ ...prev, [idx]: [] }));
  };

  const addExpenseRow = () => {
    setExpenseRows(prev => [...prev, { id: Date.now() + Math.random(), date: sysDate, supplier_name: '', amount: '', mode: 'CASH' }]);
  };

  const removeExpenseRow = (idx) => {
    if (expenseRows.length <= 1) return;
    setExpenseRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveExpenses = () => {
    const validRows = expenseRows.filter(r => r.supplier_name.trim() && Number(r.amount) > 0);
    if (validRows.length === 0) {
      if (showToast) showToast('Please fill at least one valid entry (supplier + amount)', 'error');
      return;
    }

    const newPayments = validRows.map(row => ({
      id: Date.now() + Math.random(),
      supplier_name: row.supplier_name.trim(),
      date: row.date || sysDate,
      amount: Number(row.amount),
      payment_method: row.mode || 'CASH',
      reference: `EXP-${Date.now().toString().slice(-4)}`,
      notes: ''
    }));

    // Save into cashSalePayments (Party Khata Paisa Diya section)
    const updated = [...newPayments, ...(cashSalePayments || [])];
    if (setCashSalePayments) setCashSalePayments(updated);
    if (saveCashSalePayments) saveCashSalePayments(updated);
    try { localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updated)); } catch { }

    if (showToast) showToast(`${validRows.length} supplier payment(s) saved! Party Khata updated. 💰`, 'success');
    // Reset form
    setExpenseRows([{ id: Date.now(), date: sysDate, supplier_name: '', amount: '', mode: 'CASH' }]);
  };

  // ========================================================================
  // History for the selected date
  // ========================================================================
  const collectionHistory = useMemo(() => {
    const fd = normalizeDateStr(filterDate);
    const allPayments = [];
    (customerProfiles || []).forEach(c => {
      (c.payment_history || []).forEach(p => {
        const pDate = normalizeDateStr(p.date);
        if (!fd || pDate === fd) {
          allPayments.push({
            ...p,
            customer_name: c.customer_name || c.name || ''
          });
        }
      });
    });
    return allPayments.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [customerProfiles, filterDate]);

  const expenseHistory = useMemo(() => {
    const fd = normalizeDateStr(filterDate);
    return (cashSalePayments || []).filter(p => {
      const pDate = normalizeDateStr(p.date);
      return !fd || pDate === fd;
    }).sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [cashSalePayments, filterDate]);

  const totalCollection = useMemo(() => collectionHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0), [collectionHistory]);
  const totalExpense = useMemo(() => expenseHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0), [expenseHistory]);

  // ========================================================================
  // TODAY'S CASH SELL — aggregated from truckSalesList + salesList + customer buy_history
  // ========================================================================
  const todayCashSell = useMemo(() => {
    const todayStr = normalizeDateStr(sysDate);
    const salesMap = new Map();

    // 1. From truckSalesList (rapid board sales)
    (truckSalesList || []).forEach(s => {
      if (s && s.id !== undefined && s.id !== null) {
        const dateStr = normalizeDateStr(s.selling_date || s.date || '');
        if (dateStr === todayStr) {
          salesMap.set(String(s.id), s);
        }
      }
    });

    // 2. From customer buy_history
    (customerProfiles || []).forEach(c => {
      (c.buy_history || []).forEach(b => {
        if (b && b.id !== undefined && !salesMap.has(String(b.id))) {
          const dateStr = normalizeDateStr(b.date || b.selling_date || '');
          if (dateStr === todayStr) {
            salesMap.set(String(b.id), {
              ...b,
              total: Number(b.total || 0),
              payment_mode: b.payment_mode || 'CREDIT',
              amount_paid: b.amount_paid !== undefined ? Number(b.amount_paid) : 0
            });
          }
        }
      });
    });

    // 3. From backend salesList
    (salesList || []).forEach(s => {
      if (s && s.id !== undefined && !salesMap.has(String(s.id))) {
        const dateStr = normalizeDateStr(s.sale_date || s.date || s.order_date || (s.created_at ? String(s.created_at).slice(0, 10) : ''));
        if (dateStr === todayStr) {
          salesMap.set(String(s.id), {
            ...s,
            total: Number(s.total_amount || s.final_amount || s.total || 0),
            payment_mode: s.payment_type || s.payment_mode || 'CASH',
            amount_paid: s.amount_paid !== undefined ? Number(s.amount_paid) : 0
          });
        }
      }
    });

    // Filter cash sales & sum
    let cashTotal = 0;
    salesMap.forEach(s => {
      const tot = Number(s.total || 0);
      const mode = String(s.payment_mode || '').toUpperCase();
      const isCash = mode === 'CASH' || mode === 'UPI';
      const paid = Number(s.amount_paid || 0);
      if (isCash) {
        cashTotal += tot;
      } else if (paid > 0) {
        cashTotal += paid;
      }
    });
    return cashTotal;
  }, [truckSalesList, customerProfiles, salesList, sysDate]);

  // Close suggestions on click outside
  const containerRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setCollectionSuggestions({});
        setExpenseSuggestions({});
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div ref={containerRef} style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '0' }}>
      {/* ====== TOP NAV BAR ====== */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card, #ffffff)',
        borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: '6px'
      }}>
        {/* Row 1: Back + Title on Left, Today Report button on Top Right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
          {/* Back & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexShrink: 1 }}>
            <button onClick={onBack} style={{
              background: 'var(--bg-secondary, #f1f5f9)',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              color: 'var(--text-primary, #0f172a)',
              borderRadius: '6px', padding: '3px 8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: 700,
              height: '26px', minHeight: 'unset', flexShrink: 0
            }}>
              <ArrowLeft size={13} /> Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
              <Wallet size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                Cash Sell Transactions
              </span>
            </div>
          </div>

          {/* 📊 Today Report Button (Top Right side, chota sa) */}
          <button
            onClick={() => setIsReportOpen(!isReportOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              padding: '2px 7px', borderRadius: '5px', height: '23px', minHeight: 'unset', maxHeight: '23px',
              background: isReportOpen
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'rgba(245, 158, 11, 0.12)',
              border: isReportOpen ? 'none' : '1px solid rgba(245, 158, 11, 0.35)',
              color: isReportOpen ? '#fff' : '#d97706',
              fontWeight: 700, fontSize: '0.68rem', lineHeight: 1, cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isReportOpen ? '0 2px 6px rgba(245,158,11,0.25)' : 'none',
              whiteSpace: 'nowrap', flexShrink: 0,
              boxSizing: 'border-box'
            }}
          >
            <ClipboardList size={11} />
            <span>Report</span>
            {isReportOpen ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
          </button>
        </div>

        {/* Row 2: Date Picker (Lamba / Full-width) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          width: '100%',
          background: 'var(--bg-secondary, #f8fafc)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '8px',
          padding: '2px 10px',
          height: '32px',
          boxSizing: 'border-box'
        }}>
          <Calendar size={14} color="var(--text-muted, #64748b)" />
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{
              flex: 1,
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '0.78rem',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Row 3: Toggle Buttons — Collection vs Expenses */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'collection', label: 'Collection / Tagada', icon: TrendingUp, color: '#10b981' },
            { key: 'expenses', label: 'Expenses / Paisa Diya', icon: TrendingDown, color: '#ef4444' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                padding: '5px 8px',
                height: '30px',
                borderRadius: '6px',
                fontWeight: activeSection === tab.key ? 800 : 600,
                fontSize: '0.76rem',
                cursor: 'pointer',
                border: activeSection === tab.key
                  ? `2px solid ${tab.color}`
                  : '1px solid var(--border-subtle, #e2e8f0)',
                background: activeSection === tab.key
                  ? `${tab.color}15`
                  : 'var(--bg-secondary, #f8fafc)',
                color: activeSection === tab.key ? tab.color : 'var(--text-secondary, #64748b)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 4: Summary Cards */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{
            flex: 1, padding: '5px 10px', borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <TrendingUp size={15} color="#10b981" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.62rem', color: '#059669', fontWeight: 700 }}>Collection</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10b981' }}>₹{totalCollection.toLocaleString()}</div>
            </div>
          </div>
          <div style={{
            flex: 1, padding: '5px 10px', borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <TrendingDown size={15} color="#ef4444" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 700 }}>Expenses</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ef4444' }}>₹{totalExpense.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== CONTENT BODY ====== */}
      <div style={{ padding: '10px 8px', maxWidth: '900px', margin: '0 auto' }}>

        {/* ======================== COLLECTION / TAGADA ======================== */}
        {activeSection === 'collection' && (
          <div>
            {/* Entry Form */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: '12px', padding: '12px 10px', marginBottom: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={16} color="#10b981" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Customer se Paisa Liya (Collection / Tagada)
                  </span>
                </div>
              </div>

              {collectionRows.map((row, idx) => (
                <div key={row.id} style={{
                  marginBottom: '8px', padding: '8px 10px',
                  background: 'var(--bg-secondary)', borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex', flexDirection: 'column', gap: '6px'
                }}>
                  {/* Top Line: Customer Name + Date */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%' }}>
                    {/* Customer Name */}
                    <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Customer Name</label>
                      <input
                        type="text"
                        value={row.customer_name}
                        onChange={e => handleCollectionChange(idx, 'customer_name', e.target.value)}
                        onFocus={() => {
                          if (row.customer_name.trim()) {
                            const q = row.customer_name.trim().toLowerCase();
                            setCollectionSuggestions(prev => ({ ...prev, [idx]: allCustomerNames.filter(n => n.toLowerCase().includes(q)) }));
                          } else {
                            setCollectionSuggestions(prev => ({ ...prev, [idx]: allCustomerNames.slice(0, 10) }));
                          }
                        }}
                        placeholder="Type customer name..."
                        style={{
                          width: '100%', padding: '5px 8px', fontSize: '0.8rem', fontWeight: 600,
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                          boxSizing: 'border-box', height: '32px'
                        }}
                      />
                      {(collectionSuggestions[idx] || []).length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                          borderRadius: '8px', maxHeight: '180px', overflowY: 'auto',
                          zIndex: 200, boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                          marginTop: '2px'
                        }}>
                          {collectionSuggestions[idx].map((name, si) => (
                            <div
                              key={si}
                              onClick={() => handleSelectCollectionCustomer(idx, name)}
                              style={{
                                padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem',
                                fontWeight: 600, color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--border-subtle)',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <UserCheck size={13} color="#10b981" />
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div style={{ width: '120px', flexShrink: 0 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Date</label>
                      <input
                        type="date"
                        value={row.date}
                        onChange={e => handleCollectionChange(idx, 'date', e.target.value)}
                        style={{
                          width: '100%', padding: '4px 6px', fontSize: '0.78rem', fontWeight: 600,
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                          boxSizing: 'border-box', height: '32px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Bottom Line: Amount + Mode + Remove */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%' }}>
                    {/* Amount */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Amount (₹)</label>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={e => handleCollectionChange(idx, 'amount', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%', padding: '5px 8px', fontSize: '0.82rem', fontWeight: 700,
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                          boxSizing: 'border-box', height: '32px'
                        }}
                      />
                    </div>

                    {/* Mode */}
                    <div style={{ width: '95px', flexShrink: 0 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Mode</label>
                      <select
                        value={row.mode}
                        onChange={e => handleCollectionChange(idx, 'mode', e.target.value)}
                        style={{
                          width: '100%', padding: '4px 6px', fontSize: '0.78rem', fontWeight: 600,
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                          boxSizing: 'border-box', height: '32px'
                        }}
                      >
                        {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* Remove button */}
                    {collectionRows.length > 1 && (
                      <button
                        onClick={() => removeCollectionRow(idx)}
                        style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444', borderRadius: '6px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                        }}
                        title="Remove this row"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Row + Save Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={addCollectionRow}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    padding: '7px 10px', height: '34px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem',
                    cursor: 'pointer', border: '1.5px dashed var(--border-subtle)',
                    background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                    transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                >
                  <Plus size={15} /> Add More Entry
                </button>
                <button
                  onClick={handleSaveCollection}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    padding: '7px 10px', height: '34px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem',
                    cursor: 'pointer', border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff', boxShadow: '0 2px 10px rgba(16,185,129,0.25)',
                    transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                >
                  <Check size={15} /> Save Collection
                </button>
              </div>
            </div>

            {/* Collection History */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: '12px', padding: '12px 10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Receipt size={15} color="#10b981" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Collection History — {formatDateLabel(filterDate)}
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '6px',
                  background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)'
                }}>
                  {collectionHistory.length} entries
                </span>
              </div>

              {collectionHistory.length === 0 ? (
                <div style={{
                  padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)',
                  fontSize: '0.82rem', fontWeight: 600
                }}>
                  No collection records for this date
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {collectionHistory.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', borderRadius: '8px',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
                    }}>
                      <UserCheck size={14} color="#10b981" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {p.customer_name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {formatDateLabel(p.date)} • {p.payment_method || 'CASH'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10b981', flexShrink: 0 }}>
                        +₹{Number(p.amount || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================== EXPENSES / PAISA DIYA ======================== */}
        {activeSection === 'expenses' && (
          <div>
            {/* Entry Form */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: '12px', padding: '12px 10px', marginBottom: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Supplier ko Paisa Diya (Expenses)
                  </span>
                </div>
              </div>

              {expenseRows.map((row, idx) => (
                <div key={row.id} style={{
                  marginBottom: '8px', padding: '8px 10px',
                  background: 'var(--bg-secondary)', borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex', flexDirection: 'column', gap: '6px'
                }}>
                  {/* Top Line: Supplier Name + Date */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%' }}>
                    {/* Supplier Name */}
                    <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Supplier Name</label>
                      <input
                        type="text"
                        value={row.supplier_name}
                        onChange={e => handleExpenseChange(idx, 'supplier_name', e.target.value)}
                        onFocus={() => {
                          if (row.supplier_name.trim()) {
                            const q = row.supplier_name.trim().toLowerCase();
                            setExpenseSuggestions(prev => ({ ...prev, [idx]: allSupplierNamesList.filter(n => n.toLowerCase().includes(q)) }));
                          } else {
                            setExpenseSuggestions(prev => ({ ...prev, [idx]: allSupplierNamesList.slice(0, 10) }));
                          }
                        }}
                        placeholder="Type supplier name..."
                        style={{
                          width: '100%', padding: '5px 8px', fontSize: '0.8rem', fontWeight: 600,
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                          boxSizing: 'border-box', height: '32px'
                        }}
                      />
                      {(expenseSuggestions[idx] || []).length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                          borderRadius: '8px', maxHeight: '180px', overflowY: 'auto',
                          zIndex: 200, boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                          marginTop: '2px'
                        }}>
                          {expenseSuggestions[idx].map((name, si) => (
                            <div
                              key={si}
                              onClick={() => handleSelectExpenseSupplier(idx, name)}
                              style={{
                                padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem',
                                fontWeight: 600, color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--border-subtle)',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Truck size={13} color="#ef4444" />
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div style={{ width: '120px', flexShrink: 0 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Date</label>
                      <input
                        type="date"
                        value={row.date}
                        onChange={e => handleExpenseChange(idx, 'date', e.target.value)}
                        style={{
                          width: '100%', padding: '4px 6px', fontSize: '0.78rem', fontWeight: 600,
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                          boxSizing: 'border-box', height: '32px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Bottom Line: Amount + Mode + Remove */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%' }}>
                    {/* Amount */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Amount (₹)</label>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={e => handleExpenseChange(idx, 'amount', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%', padding: '5px 8px', fontSize: '0.82rem', fontWeight: 700,
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                          boxSizing: 'border-box', height: '32px'
                        }}
                      />
                    </div>

                    {/* Mode */}
                    <div style={{ width: '95px', flexShrink: 0 }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px', display: 'block' }}>Mode</label>
                      <select
                        value={row.mode}
                        onChange={e => handleExpenseChange(idx, 'mode', e.target.value)}
                        style={{
                          width: '100%', padding: '4px 6px', fontSize: '0.78rem', fontWeight: 600,
                          border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                          boxSizing: 'border-box', height: '32px'
                        }}
                      >
                        {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* Remove button */}
                    {expenseRows.length > 1 && (
                      <button
                        onClick={() => removeExpenseRow(idx)}
                        style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444', borderRadius: '6px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                        }}
                        title="Remove this row"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Row + Save Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={addExpenseRow}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    padding: '7px 10px', height: '34px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem',
                    cursor: 'pointer', border: '1.5px dashed var(--border-subtle)',
                    background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                    transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                >
                  <Plus size={15} /> Add More Entry
                </button>
                <button
                  onClick={handleSaveExpenses}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    padding: '7px 10px', height: '34px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem',
                    cursor: 'pointer', border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff', boxShadow: '0 2px 10px rgba(239,68,68,0.25)',
                    transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                >
                  <Check size={15} /> Save Expenses
                </button>
              </div>
            </div>

            {/* Expense History */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: '12px', padding: '12px 10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Receipt size={15} color="#ef4444" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Expense History — {formatDateLabel(filterDate)}
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '6px',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)'
                }}>
                  {expenseHistory.length} entries
                </span>
              </div>

              {expenseHistory.length === 0 ? (
                <div style={{
                  padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)',
                  fontSize: '0.82rem', fontWeight: 600
                }}>
                  No expense records for this date
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {expenseHistory.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', borderRadius: '8px',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
                    }}>
                      <Truck size={14} color="#ef4444" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {p.supplier_name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {formatDateLabel(p.date)} • {p.payment_method || 'CASH'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ef4444', flexShrink: 0 }}>
                        -₹{Number(p.amount || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* ====== TODAY REPORT BOTTOM DRAWER ====== */}
      {isReportOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setIsReportOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 998,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(2px)',
              transition: 'opacity 0.3s ease'
            }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderTop: '2px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 16px 28px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            maxHeight: '80vh', overflowY: 'auto',
            animation: 'slideUp 0.35s ease-out'
          }}>
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={20} color="#f59e0b" />
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>📊 Today's Report</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>
                  {formatDateLabel(sysDate)}
                </span>
              </div>
              <button
                onClick={() => setIsReportOpen(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ===== INCOME SECTION (+ items) ===== */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                ➕ Aaj ki Amdani (Income)
              </div>

              {/* Collection */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '6px',
                background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="#10b981" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>Collection / Tagada</span>
                </div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>₹{totalCollection.toLocaleString()}</span>
              </div>

              {/* Cash Sell */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '6px',
                background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Banknote size={16} color="#3b82f6" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>Cash Sell (Rokda Bikri)</span>
                </div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3b82f6' }}>₹{todayCashSell.toLocaleString()}</span>
              </div>

              {/* B/F (Brought Forward) — input */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '6px',
                background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={16} color="#a855f7" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>B/F (Brought Forward)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.95rem' }}>₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={bfAmount}
                    onChange={e => setBfAmount(e.target.value)}
                    style={{
                      width: '100px', padding: '6px 10px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: '#a855f7', fontWeight: 800, fontSize: '1rem', textAlign: 'right', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Subtotal line */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '8px 14px', borderTop: '2px solid rgba(255,255,255,0.1)', marginTop: '6px'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginRight: '12px' }}>Sub Total</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                  ₹{(totalCollection + todayCashSell + (Number(bfAmount) || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* ===== EXPENSE SECTION (- items) ===== */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                ➖ Aaj ka Kharcha (Expenses)
              </div>

              {/* Expenses */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '6px',
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingDown size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>Expenses / Paisa Diya</span>
                </div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444' }}>₹{totalExpense.toLocaleString()}</span>
              </div>

              {/* Extra Cash — input */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '6px',
                background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={16} color="#f97316" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>Extra Cash</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#f97316', fontWeight: 700, fontSize: '0.95rem' }}>₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={extraCashAmount}
                    onChange={e => setExtraCashAmount(e.target.value)}
                    style={{
                      width: '100px', padding: '6px 10px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249, 115, 22, 0.35)',
                      color: '#f97316', fontWeight: 800, fontSize: '1rem', textAlign: 'right', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Subtotal line */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '8px 14px', borderTop: '2px solid rgba(255,255,255,0.1)', marginTop: '6px'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginRight: '12px' }}>Total Kharcha</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444' }}>
                  ₹{(totalExpense + (Number(extraCashAmount) || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* ===== FINAL TODAY'S TOTAL ===== */}
            {(() => {
              const income = totalCollection + todayCashSell + (Number(bfAmount) || 0);
              const expense = totalExpense + (Number(extraCashAmount) || 0);
              const todayFinal = income - expense;
              return (
                <div style={{
                  padding: '16px 18px', borderRadius: '14px',
                  background: todayFinal >= 0
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.06) 100%)'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.06) 100%)',
                  border: todayFinal >= 0
                    ? '2px solid rgba(16,185,129,0.35)'
                    : '2px solid rgba(239,68,68,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      💰 Today's Total
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                      ({totalCollection.toLocaleString()} + {todayCashSell.toLocaleString()} + {(Number(bfAmount) || 0).toLocaleString()}) − ({totalExpense.toLocaleString()} + {(Number(extraCashAmount) || 0).toLocaleString()})
                    </div>
                  </div>
                  <span style={{
                    fontSize: '1.55rem', fontWeight: 900,
                    color: todayFinal >= 0 ? '#10b981' : '#ef4444',
                    textShadow: todayFinal >= 0 ? '0 0 20px rgba(16,185,129,0.3)' : '0 0 20px rgba(239,68,68,0.3)'
                  }}>
                    ₹{todayFinal.toLocaleString()}
                  </span>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
