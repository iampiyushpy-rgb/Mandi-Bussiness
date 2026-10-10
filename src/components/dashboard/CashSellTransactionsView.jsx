import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Banknote,
  CreditCard,
  Wallet,
  UserCheck,
  User,
  Truck,
  TrendingUp,
  TrendingDown,
  X,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Package,
  ClipboardList,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Download,
  Lock,
  Unlock,
  Printer,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';
import { printDailyReportDocument } from '../../utils/reportPrinter';

const PAYMENT_MODES = ['CASH', 'UPI', 'Bank Transfer', 'Cheque', 'NEFT', 'RTGS'];

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

const getPaymentCategory = (item) => {
  const rawMode = String(
    (typeof item === 'string' ? item : (item?.payment_method || item?.payment_mode || item?.mode || item?.payment_type)) || ''
  ).toUpperCase().trim();

  if (rawMode === 'UPI') return 'UPI';
  if (
    rawMode.includes('BANK') ||
    rawMode.includes('CHEQUE') ||
    rawMode.includes('NEFT') ||
    rawMode.includes('RTGS') ||
    rawMode.includes('TRANSFER')
  ) {
    return 'BANK';
  }
  return 'CASH';
};

export default function CashSellTransactionsView({
  customerProfiles = [],
  setCustomerProfiles,
  customers = [],
  setCustomers,
  suppliers = [],
  setSuppliers,
  supplierProfiles = [],
  setSupplierProfiles,
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
  savedReports = [],
  setSavedReports,
  saveDailyReport,
  onUnlockDailyReport,
  currentUser,
  onOpenDailyReports,
  onBack
}) {
  const sysDate = getSystemDate ? getSystemDate() : getDefaultDate();

  // Active tab: 'collection' or 'expenses'
  const [activeSection, setActiveSection] = useState('collection');

  // Date filter for history
  const [filterDate, setFilterDate] = useState(sysDate);

  const handlePrevDay = () => {
    try {
      const parts = (filterDate || sysDate).split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() - 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setFilterDate(`${year}-${month}-${day}`);
    } catch { }
  };

  const handleNextDay = () => {
    try {
      const parts = (filterDate || sysDate).split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setFilterDate(`${year}-${month}-${day}`);
    } catch { }
  };

  const handleToday = () => {
    setFilterDate(sysDate);
  };

  // Active date for Report Drawer (syncs with filterDate selected in Cash Sell Transactions)
  const activeReportDate = filterDate || sysDate;
  const isReportDateToday = normalizeDateStr(activeReportDate) === normalizeDateStr(sysDate);

  // Report Drawer State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [bfAmount, setBfAmount] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' | 'less'

  // Saved report & lock state for currently selected date
  const savedReportForActiveDate = useMemo(() => {
    const targetStr = normalizeDateStr(activeReportDate);
    return (savedReports || []).find(r => normalizeDateStr(r.date) === targetStr);
  }, [savedReports, activeReportDate]);

  const isCurrentReportLocked = Boolean(savedReportForActiveDate && savedReportForActiveDate.isLocked !== false);

  // Sync saved inputs if report was previously saved for this date, or reset when date changes
  useEffect(() => {
    if (savedReportForActiveDate) {
      if (savedReportForActiveDate.income?.bfAmount !== undefined) {
        setBfAmount(String(savedReportForActiveDate.income.bfAmount));
      } else {
        setBfAmount('');
      }
      if (savedReportForActiveDate.adjustment?.amount !== undefined) {
        setAdjustmentAmount(String(savedReportForActiveDate.adjustment.amount));
      } else {
        setAdjustmentAmount('');
      }
      if (savedReportForActiveDate.adjustment?.type) {
        setAdjustmentType(savedReportForActiveDate.adjustment.type);
      } else {
        setAdjustmentType('add');
      }
    } else {
      setBfAmount('');
      setAdjustmentAmount('');
      setAdjustmentType('add');
    }
  }, [savedReportForActiveDate, activeReportDate]);

  // ========================================================================
  // COLLECTION (Tagada) — Customer se paisa liya / Supplier collection
  // ========================================================================
  const [collectionRows, setCollectionRows] = useState([
    { id: Date.now(), date: sysDate, customer_name: '', amount: '', less: '', mode: 'CASH', party_type: 'customer' }
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
    (customers || []).forEach(c => {
      const n = (c.customer_name || c.name || '').trim();
      if (n) set.add(n);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [customerProfiles, customers]);

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
    (cashSalePayments || []).forEach(p => {
      const n = (p.supplier_name || '').trim();
      if (n) set.add(n);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [suppliers, supplierProfiles, unifiedSuppliers, allSupplierNames, cashSalePayments]);

  const handleCollectionChange = (idx, field, value) => {
    setCollectionRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    if (field === 'customer_name' && value.trim()) {
      const q = value.trim().toLowerCase();
      const matchedCusts = allCustomerNames.filter(n => n.toLowerCase().includes(q));
      setCollectionSuggestions(prev => ({ ...prev, [idx]: matchedCusts }));
    } else if (field === 'customer_name') {
      setCollectionSuggestions(prev => ({ ...prev, [idx]: [] }));
    }
  };

  const handleSelectCollectionCustomer = (idx, name) => {
    setCollectionRows(prev => prev.map((r, i) => i === idx ? {
      ...r,
      customer_name: name
    } : r));
    setCollectionSuggestions(prev => ({ ...prev, [idx]: [] }));
  };

  const addCollectionRow = () => {
    setCollectionRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      date: filterDate || sysDate,
      customer_name: '',
      amount: '',
      less: '',
      mode: 'CASH',
      party_type: 'customer'
    }]);
  };

  const removeCollectionRow = (idx) => {
    if (collectionRows.length <= 1) return;
    setCollectionRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveCollection = async () => {
    const validRows = collectionRows.filter(r => (r.customer_name || '').trim() && (Number(r.amount) > 0 || Number(r.less) > 0));
    if (validRows.length === 0) {
      if (showToast) showToast('Please fill at least one valid entry (Name + Amount or Less)', 'error');
      return;
    }

    let savedCustCount = 0;
    let savedSuppCount = 0;

    let currentCustProfiles = [...(customerProfiles || [])];
    let currentMasterCusts = [...(customers || [])];
    let currentSuppProfiles = [...(supplierProfiles || [])];
    let currentMasterSupps = [...(suppliers || [])];
    const newSupplierPayments = [];

    for (const row of validRows) {
      const amt = Number(row.amount) || 0;
      const lessAmt = Number(row.less) || 0;
      const totalReduction = amt + lessAmt;
      const partyName = row.customer_name.trim();
      const pDate = filterDate || row.date || sysDate;
      const pMode = row.mode || 'CASH';

      const isKnownSupplier = allSupplierNamesList.some(s => s.toLowerCase() === partyName.toLowerCase());
      const isKnownCustomer = allCustomerNames.some(c => c.toLowerCase() === partyName.toLowerCase());

      const isSupplier = row.party_type === 'supplier' || (isKnownSupplier && !isKnownCustomer);

      if (isSupplier) {
        savedSuppCount++;

        // 1. Create supplier profile if not exists
        const existsInProfiles = currentSuppProfiles.some(
          sp => (sp.supplier_name || '').trim().toLowerCase() === partyName.toLowerCase()
        );
        const existsInMaster = currentMasterSupps.some(
          s => (s.supplier_name || s.name || '').trim().toLowerCase() === partyName.toLowerCase()
        );

        const newSuppId = Date.now() + Math.random();

        if (!existsInProfiles) {
          const newSuppProfile = {
            id: newSuppId,
            supplier_name: partyName,
            phone: '',
            bank_name: '',
            account_number: '',
            ifsc_code: '',
            branch_name: '',
            truckno: '',
            date: pDate,
            fruit: '',
            variety: '',
            boxes: 0,
            balance_box: 0
          };
          currentSuppProfiles = [newSuppProfile, ...currentSuppProfiles];
        }

        if (!existsInMaster) {
          const newMasterSupp = {
            id: newSuppId,
            supplier_code: `SUP-${Date.now().toString().slice(-4)}`,
            supplier_name: partyName,
            name: partyName,
            phone: '',
            bank_name: '',
            account_number: '',
            ifsc_code: '',
            branch_name: '',
            current_balance: 0,
            status: 'ACTIVE'
          };
          currentMasterSupps = [newMasterSupp, ...currentMasterSupps];

          api.post('/suppliers/', {
            supplier_name: partyName,
            phone: '',
            supplier_code: `SUP-${Date.now().toString().slice(-4)}`
          }).catch(() => null);
        }

        // 2. Put into Paisa Diya (cashSalePayments)
        newSupplierPayments.push({
          id: Date.now() + Math.random(),
          supplier_name: partyName,
          date: pDate,
          amount: amt,
          less_amount: lessAmt,
          payment_method: pMode,
          reference: `COL-${Date.now().toString().slice(-4)}`,
          notes: lessAmt > 0 ? `Collection / Paisa Diya (Less: ₹${lessAmt.toLocaleString()})` : 'Collection / Paisa Diya'
        });

      } else {
        savedCustCount++;

        const newPayment = {
          id: Date.now() + Math.random(),
          date: pDate,
          amount: amt,
          less_amount: lessAmt,
          payment_method: pMode,
          reference: `COL-${Date.now().toString().slice(-4)}`,
          notes: lessAmt > 0
            ? (amt > 0 ? `Collection / Tagada (Less: ₹${lessAmt.toLocaleString()})` : `Less / Kasar (₹${lessAmt.toLocaleString()})`)
            : 'Collection / Tagada'
        };

        const existingCustIdx = currentCustProfiles.findIndex(
          c => (c.customer_name || c.name || '').trim().toLowerCase() === partyName.toLowerCase()
        );

        if (existingCustIdx >= 0) {
          const c = currentCustProfiles[existingCustIdx];
          const updated = {
            ...c,
            total_paid: Number(c.total_paid || 0) + amt,
            total_discount: Number(c.total_discount || 0) + lessAmt,
            current_balance: Math.max(0, Number(c.current_balance || 0) - totalReduction),
            payment_history: [newPayment, ...(c.payment_history || [])]
          };
          currentCustProfiles[existingCustIdx] = updated;

          if (c.id) {
            api.post('/payments/', {
              party_type: 'CUSTOMER',
              customer: c.id,
              payment_type: 'INWARD',
              payment_date: pDate,
              amount: amt,
              payment_method: pMode,
              payment_mode: pMode,
              transaction_reference: newPayment.reference,
              reference_number: newPayment.reference,
              notes: newPayment.notes,
              description: newPayment.notes
            }).catch(() => null);
          }
        } else {
          // NEW CUSTOMER: Create complete profile with payment_history
          const newCust = {
            id: Date.now() + Math.random(),
            customer_name: partyName,
            phone: '',
            city: '',
            address: '',
            total_boxes: 0,
            total_bought: 0,
            total_paid: amt,
            total_discount: lessAmt,
            current_balance: 0,
            buy_history: [],
            payment_history: [newPayment]
          };
          currentCustProfiles = [newCust, ...currentCustProfiles];

          const existsMaster = currentMasterCusts.some(
            mc => (mc.customer_name || mc.name || '').trim().toLowerCase() === partyName.toLowerCase()
          );
          if (!existsMaster) {
            currentMasterCusts = [{
              id: newCust.id,
              customer_code: `CUST-${Date.now().toString().slice(-4)}`,
              customer_name: partyName,
              phone: '',
              current_balance: 0,
              status: 'ACTIVE'
            }, ...currentMasterCusts];

            api.post('/customers/', {
              customer_name: partyName,
              phone: '',
              customer_code: `CUST-${Date.now().toString().slice(-4)}`,
              current_balance: 0
            }).catch(() => null);
          }
        }

        // Keep master customer current_balance in sync
        const masterCustIdx = currentMasterCusts.findIndex(
          mc => (mc.customer_name || mc.name || '').trim().toLowerCase() === partyName.toLowerCase()
        );
        if (masterCustIdx >= 0) {
          const mc = currentMasterCusts[masterCustIdx];
          currentMasterCusts[masterCustIdx] = {
            ...mc,
            current_balance: Math.max(0, Number(mc.current_balance || 0) - totalReduction)
          };
        }
      }
    }

    if (setCustomerProfiles) {
      setCustomerProfiles(currentCustProfiles);
    }
    try {
      localStorage.setItem('mandi_customer_profiles', JSON.stringify(currentCustProfiles));
    } catch { }

    if (setCustomers) {
      setCustomers(currentMasterCusts);
    }

    if (setSupplierProfiles) {
      setSupplierProfiles(currentSuppProfiles);
    }
    try {
      localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(currentSuppProfiles));
    } catch { }

    if (setSuppliers) {
      setSuppliers(currentMasterSupps);
    }

    if (newSupplierPayments.length > 0) {
      const updatedPayments = [...newSupplierPayments, ...(cashSalePayments || [])];
      if (setCashSalePayments) setCashSalePayments(updatedPayments);
      if (saveCashSalePayments) saveCashSalePayments(updatedPayments);
      try {
        localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updatedPayments));
      } catch { }
    }

    const msg = [];
    if (savedCustCount > 0) msg.push(`${savedCustCount} Customer profile & Payment History updated 👤💵`);
    if (savedSuppCount > 0) msg.push(`${savedSuppCount} Supplier profile & Paisa Diya updated 🚚💰`);
    if (showToast) showToast(msg.join(' | ') || 'Saved successfully!', 'success');

    setCollectionRows([{
      id: Date.now(),
      date: filterDate || sysDate,
      customer_name: '',
      amount: '',
      less: '',
      mode: 'CASH',
      party_type: 'customer'
    }]);
  };

  // ========================================================================
  // EXPENSES — Supplier ko paisa diya
  // ========================================================================
  const [expenseRows, setExpenseRows] = useState([
    { id: Date.now(), date: sysDate, supplier_name: '', edit: '', amount: '', mode: 'CASH' }
  ]);
  const [expenseSuggestions, setExpenseSuggestions] = useState({});

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
    setExpenseRows(prev => [...prev, { id: Date.now() + Math.random(), date: filterDate || sysDate, supplier_name: '', edit: '', amount: '', mode: 'CASH' }]);
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

    let currentSuppProfiles = [...(supplierProfiles || [])];
    let currentMasterSupps = [...(suppliers || [])];
    const newPayments = [];

    validRows.forEach(row => {
      const amt = Number(row.amount);
      const suppName = row.supplier_name.trim();
      const pDate = filterDate || row.date || sysDate;
      const pMode = row.mode || 'CASH';

      const existsInProfiles = currentSuppProfiles.some(
        sp => (sp.supplier_name || '').trim().toLowerCase() === suppName.toLowerCase()
      );
      const existsInMaster = currentMasterSupps.some(
        s => (s.supplier_name || s.name || '').trim().toLowerCase() === suppName.toLowerCase()
      );

      const newSuppId = Date.now() + Math.random();

      if (!existsInProfiles) {
        const newSuppProfile = {
          id: newSuppId,
          supplier_name: suppName,
          phone: '',
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          branch_name: '',
          truckno: '',
          date: pDate,
          fruit: '',
          variety: '',
          boxes: 0,
          balance_box: 0
        };
        currentSuppProfiles = [newSuppProfile, ...currentSuppProfiles];
      }

      if (!existsInMaster) {
        const newMasterSupp = {
          id: newSuppId,
          supplier_code: `SUP-${Date.now().toString().slice(-4)}`,
          supplier_name: suppName,
          name: suppName,
          phone: '',
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          branch_name: '',
          current_balance: 0,
          status: 'ACTIVE'
        };
        currentMasterSupps = [newMasterSupp, ...currentMasterSupps];

        api.post('/suppliers/', {
          supplier_name: suppName,
          phone: '',
          supplier_code: `SUP-${Date.now().toString().slice(-4)}`
        }).catch(() => null);
      }

      newPayments.push({
        id: Date.now() + Math.random(),
        supplier_name: suppName,
        date: pDate,
        amount: amt,
        payment_method: pMode,
        reference: `EXP-${Date.now().toString().slice(-4)}`,
        notes: (row.edit && row.edit.trim()) ? row.edit.trim() : 'Expenses / Paisa Diya',
        edit: (row.edit && row.edit.trim()) ? row.edit.trim() : ''
      });
    });

    if (setSupplierProfiles) {
      setSupplierProfiles(currentSuppProfiles);
    }
    try {
      localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(currentSuppProfiles));
    } catch { }

    if (setSuppliers) {
      setSuppliers(currentMasterSupps);
    }

    const updated = [...newPayments, ...(cashSalePayments || [])];
    if (setCashSalePayments) setCashSalePayments(updated);
    if (saveCashSalePayments) saveCashSalePayments(updated);
    try {
      localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updated));
    } catch { }

    if (showToast) showToast(`${validRows.length} supplier payment(s) saved! Supplier profile & Paisa Diya updated. 💰`, 'success');
    setExpenseRows([{ id: Date.now(), date: filterDate || sysDate, supplier_name: '', edit: '', amount: '', mode: 'CASH' }]);
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
            _source: 'customer_profile',
            _customerId: c.id,
            party_type: 'customer',
            party_name: c.customer_name || c.name || '',
            customer_name: c.customer_name || c.name || ''
          });
        }
      });
    });
    (cashSalePayments || []).forEach(p => {
      const pDate = normalizeDateStr(p.date);
      const isCol = (p.reference && String(p.reference).startsWith('COL-')) || (p.notes && String(p.notes).toLowerCase().includes('collection'));
      if (isCol && (!fd || pDate === fd)) {
        allPayments.push({
          ...p,
          _source: 'cash_sale_payment',
          party_type: 'supplier',
          party_name: p.supplier_name || '',
          customer_name: p.supplier_name || ''
        });
      }
    });
    return allPayments.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [customerProfiles, cashSalePayments, filterDate]);

  const expenseHistory = useMemo(() => {
    const fd = normalizeDateStr(filterDate);
    return (cashSalePayments || []).filter(p => {
      const pDate = normalizeDateStr(p.date);
      const isCol = (p.reference && String(p.reference).startsWith('COL-')) || (p.notes && String(p.notes).toLowerCase().includes('collection'));
      return !isCol && (!fd || pDate === fd);
    }).sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [cashSalePayments, filterDate]);

  const totalCollection = useMemo(() => collectionHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0), [collectionHistory]);
  const totalExpense = useMemo(() => expenseHistory.reduce((s, p) => s + (Number(p.amount) || 0), 0), [expenseHistory]);

  // Breakdown of collection for the selected date: Cash, UPI, Bank/Cheque/NEFT/RTGS
  const collectionBreakdown = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let bank = 0;

    (collectionHistory || []).forEach(item => {
      const amt = Number(item.amount) || 0;
      const cat = getPaymentCategory(item);
      if (cat === 'UPI') upi += amt;
      else if (cat === 'BANK') bank += amt;
      else cash += amt;
    });

    return { cash, upi, bank, total: cash + upi + bank };
  }, [collectionHistory]);

  // ========================================================================
  // EDIT TRANSACTION MODAL
  // ========================================================================
  const [editingItem, setEditingItem] = useState(null); // { item, type: 'collection' | 'expense' }
  const [editFormData, setEditFormData] = useState({
    name: '',
    amount: '',
    less: '',
    mode: 'CASH',
    date: '',
    notes: ''
  });

  const handleOpenEditModal = (item, type) => {
    setEditingItem({ item, type });
    setEditFormData({
      name: item.party_name || item.customer_name || item.supplier_name || '',
      amount: item.amount ?? '',
      less: item.less_amount ?? '',
      mode: ['BANK', 'CHEQUE', 'NEFT', 'RTGS', 'BANK_TRANSFER'].includes(String(item.payment_method || item.mode || '').toUpperCase())
        ? 'BANK / CHEQUE / NEFT / RTGS'
        : (item.payment_method || item.mode || 'CASH'),
      date: item.date ? (String(item.date).includes('T') ? String(item.date).split('T')[0] : String(item.date)) : (filterDate || sysDate),
      notes: (item.notes && item.notes !== 'Expenses / Paisa Diya' && item.notes !== 'Collection / Paisa Diya') ? item.notes : (item.edit || '')
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const { item, type } = editingItem;
    const newName = (editFormData.name || '').trim();
    const newAmount = Number(editFormData.amount) || 0;
    const newLess = Number(editFormData.less) || 0;
    const newMode = editFormData.mode || 'CASH';
    const newDate = editFormData.date || filterDate || sysDate;
    const newNotes = (editFormData.notes || '').trim();

    if (!newName || (newAmount <= 0 && newLess <= 0)) {
      if (showToast) showToast('Please enter a valid Name and Amount or Less', 'error');
      return;
    }

    if (type === 'collection') {
      if (item._source === 'customer_profile' || item.party_type === 'customer') {
        const oldAmt = Number(item.amount || 0);
        const oldLess = Number(item.less_amount || 0);
        const oldTotalReduction = oldAmt + oldLess;
        const newTotalReduction = newAmount + newLess;
        const diffReduction = newTotalReduction - oldTotalReduction;

        const updatedProfiles = (customerProfiles || []).map(cp => {
          const isTargetCustomer = (item._customerId && cp.id === item._customerId) ||
            ((cp.customer_name || cp.name || '').trim().toLowerCase() === (item.party_name || item.customer_name || '').trim().toLowerCase());

          if (!isTargetCustomer) return cp;

          const updatedHistory = (cp.payment_history || []).map(p => {
            if (p.id === item.id) {
              return {
                ...p,
                amount: newAmount,
                less_amount: newLess,
                payment_method: newMode,
                mode: newMode,
                date: newDate,
                notes: newNotes || (newLess > 0 ? `Collection / Tagada (Less: ₹${newLess.toLocaleString()})` : 'Collection / Tagada'),
                remarks: newNotes
              };
            }
            return p;
          });

          return {
            ...cp,
            customer_name: newName,
            total_paid: Math.max(0, Number(cp.total_paid || 0) + (newAmount - oldAmt)),
            current_balance: Math.max(0, Number(cp.current_balance || 0) - diffReduction),
            payment_history: updatedHistory
          };
        });

        if (setCustomerProfiles) setCustomerProfiles(updatedProfiles);
        try {
          localStorage.setItem('mandi_customer_profiles', JSON.stringify(updatedProfiles));
        } catch { }

        if (setCustomers) {
          setCustomers(prev => prev.map(c => {
            if ((c.customer_name || c.name || '').trim().toLowerCase() === (item.party_name || item.customer_name || '').trim().toLowerCase()) {
              return {
                ...c,
                customer_name: newName,
                name: newName,
                current_balance: Math.max(0, Number(c.current_balance || 0) - diffReduction)
              };
            }
            return c;
          }));
        }
      } else {
        const updatedPayments = (cashSalePayments || []).map(p => {
          if (p.id === item.id) {
            return {
              ...p,
              supplier_name: newName,
              amount: newAmount,
              less_amount: newLess,
              payment_method: newMode,
              date: newDate,
              notes: newNotes || (newLess > 0 ? `Collection / Paisa Diya (Less: ₹${newLess.toLocaleString()})` : 'Collection / Paisa Diya')
            };
          }
          return p;
        });

        if (setCashSalePayments) setCashSalePayments(updatedPayments);
        if (saveCashSalePayments) saveCashSalePayments(updatedPayments);
        try {
          localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updatedPayments));
        } catch { }
      }

      if (showToast) showToast('Collection entry updated! ✏️', 'success');
    } else {
      // type === 'expense'
      const updatedPayments = (cashSalePayments || []).map(p => {
        if (p.id === item.id) {
          return {
            ...p,
            supplier_name: newName,
            amount: newAmount,
            payment_method: newMode,
            date: newDate,
            notes: newNotes || 'Expenses / Paisa Diya',
            edit: newNotes
          };
        }
        return p;
      });

      if (setCashSalePayments) setCashSalePayments(updatedPayments);
      if (saveCashSalePayments) saveCashSalePayments(updatedPayments);
      try {
        localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updatedPayments));
      } catch { }

      if (showToast) showToast('Expense entry updated! ✏️', 'success');
    }

    setEditingItem(null);
  };

  const handleDeleteEdit = () => {
    if (!editingItem) return;
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    const { item, type } = editingItem;

    if (type === 'collection' && (item._source === 'customer_profile' || item.party_type === 'customer')) {
      const updatedProfiles = (customerProfiles || []).map(cp => {
        const isTargetCustomer = (item._customerId && cp.id === item._customerId) ||
          ((cp.customer_name || cp.name || '').trim().toLowerCase() === (item.party_name || item.customer_name || '').trim().toLowerCase());
        if (!isTargetCustomer) return cp;
        return {
          ...cp,
          payment_history: (cp.payment_history || []).filter(p => p.id !== item.id)
        };
      });
      if (setCustomerProfiles) setCustomerProfiles(updatedProfiles);
      try {
        localStorage.setItem('mandi_customer_profiles', JSON.stringify(updatedProfiles));
      } catch { }
    } else {
      const updatedPayments = (cashSalePayments || []).filter(p => p.id !== item.id);
      if (setCashSalePayments) setCashSalePayments(updatedPayments);
      if (saveCashSalePayments) saveCashSalePayments(updatedPayments);
      try {
        localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updatedPayments));
      } catch { }
    }

    if (showToast) showToast('Entry deleted successfully! 🗑️', 'info');
    setEditingItem(null);
  };

  // ========================================================================
  // CASH SELL FOR SELECTED DATE — aggregated from truckSalesList + salesList + customer buy_history
  // ========================================================================
  const reportCashSell = useMemo(() => {
    const targetDateStr = normalizeDateStr(activeReportDate);
    const salesMap = new Map();
    const sigCounts = new Map();

    const cleanTruck = (t) => (t || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const makeSig = (truck, cust, dateStr, boxes, total) => {
      const t = cleanTruck(truck);
      const c = (cust || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const d = normalizeDateStr(dateStr);
      const b = Math.round(Number(boxes || 0));
      const tot = Math.round(Number(total || 0));
      return `${t}__${c}__${d}__${b}__${tot}`;
    };

    // 1. From truckSalesList (rapid board sales)
    (truckSalesList || []).forEach(s => {
      if (s && s.id !== undefined && s.id !== null) {
        const dateStr = normalizeDateStr(s.selling_date || s.date || '');
        if (dateStr === targetDateStr) {
          salesMap.set(String(s.id), s);
          const sig = makeSig(s.truck_no, s.customer_name, dateStr, s.boxes, s.total);
          sigCounts.set(sig, (sigCounts.get(sig) || 0) + 1);
        }
      }
    });

    // 2. From customer buy_history
    (customerProfiles || []).forEach(c => {
      (c.buy_history || []).forEach(b => {
        if (b && b.id !== undefined && !salesMap.has(String(b.id))) {
          const dateStr = normalizeDateStr(b.date || b.selling_date || '');
          if (dateStr === targetDateStr) {
            const sig = makeSig(b.truck_no, c.customer_name, dateStr, b.boxes, b.total);
            if ((sigCounts.get(sig) || 0) > 0) return;
            sigCounts.set(sig, 1);

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
        if (dateStr === targetDateStr) {
          const sBoxes = Number(s.total_boxes || s.boxes || s.quantity || s.crates_sold || 0);
          const sTotal = Number(s.total_amount || s.final_amount || s.total || 0);
          const sig = makeSig(s.truck_number || s.truck_no, s.customer_name, dateStr, sBoxes, sTotal);

          if ((sigCounts.get(sig) || 0) > 0) {
            sigCounts.set(sig, sigCounts.get(sig) - 1);
            return;
          }

          salesMap.set(String(s.id), {
            ...s,
            total: sTotal,
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
  }, [truckSalesList, customerProfiles, salesList, activeReportDate]);

  // ========================================================================
  // REPORT METRICS & STATS (Calculated for activeReportDate)
  // ========================================================================
  const reportCollectionStats = useMemo(() => {
    const targetDateStr = normalizeDateStr(activeReportDate);
    const items = [];

    (customerProfiles || []).forEach(c => {
      (c.payment_history || []).forEach(p => {
        if (normalizeDateStr(p.date) === targetDateStr) {
          items.push({
            ...p,
            party_name: c.customer_name || c.name || 'Customer',
            customer_name: c.customer_name || c.name || 'Customer',
            amount: Number(p.amount) || 0
          });
        }
      });
    });

    (cashSalePayments || []).forEach(p => {
      const isCol = (p.reference && String(p.reference).startsWith('COL-')) || (p.notes && String(p.notes).toLowerCase().includes('collection'));
      if (isCol && normalizeDateStr(p.date) === targetDateStr) {
        items.push({
          ...p,
          party_name: p.supplier_name || 'Party',
          customer_name: p.supplier_name || 'Party',
          amount: Number(p.amount) || 0
        });
      }
    });

    let cash = 0;
    let upi = 0;
    let bank = 0;

    items.forEach(item => {
      const cat = getPaymentCategory(item);
      if (cat === 'UPI') upi += item.amount;
      else if (cat === 'BANK') bank += item.amount;
      else cash += item.amount;
    });

    return {
      items,
      cash,
      upi,
      bank,
      total: cash + upi + bank
    };
  }, [customerProfiles, cashSalePayments, activeReportDate]);

  const reportExpenseStats = useMemo(() => {
    const targetDateStr = normalizeDateStr(activeReportDate);
    const items = (cashSalePayments || []).filter(p => {
      const isCol = (p.reference && String(p.reference).startsWith('COL-')) || (p.notes && String(p.notes).toLowerCase().includes('collection'));
      return !isCol && normalizeDateStr(p.date) === targetDateStr;
    });
    const total = items.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { items, total };
  }, [cashSalePayments, activeReportDate]);

  // If the active date's report was already saved & locked, use the saved snapshot values
  const effectiveCollectionTotal = isCurrentReportLocked && savedReportForActiveDate?.income?.collection?.total !== undefined
    ? Number(savedReportForActiveDate.income.collection.total)
    : reportCollectionStats.total;

  const effectiveCollectionCash = isCurrentReportLocked && savedReportForActiveDate?.income?.collection?.cash !== undefined
    ? Number(savedReportForActiveDate.income.collection.cash)
    : reportCollectionStats.cash;

  const effectiveCollectionUpi = isCurrentReportLocked && savedReportForActiveDate?.income?.collection?.upi !== undefined
    ? Number(savedReportForActiveDate.income.collection.upi)
    : reportCollectionStats.upi;

  const effectiveCollectionBank = isCurrentReportLocked && savedReportForActiveDate?.income?.collection?.bank !== undefined
    ? Number(savedReportForActiveDate.income.collection.bank)
    : reportCollectionStats.bank;

  const effectiveCashSell = isCurrentReportLocked && savedReportForActiveDate?.income?.cashSell !== undefined
    ? Number(savedReportForActiveDate.income.cashSell)
    : reportCashSell;

  const effectiveExpenseTotal = isCurrentReportLocked && (savedReportForActiveDate?.expenses?.subtotal !== undefined || savedReportForActiveDate?.expenses?.total !== undefined)
    ? Number(savedReportForActiveDate.expenses.subtotal ?? savedReportForActiveDate.expenses.total)
    : reportExpenseStats.total;

  // Save Report handler (saves for activeReportDate)
  const handleSaveActiveDateReport = () => {
    if (isCurrentReportLocked) {
      if (showToast) showToast(`Report for ${formatDateLabel(activeReportDate)} is already saved and locked! 🔒`, 'info');
      return;
    }

    const adjVal = Number(adjustmentAmount) || 0;
    const effectiveAdj = adjustmentType === 'add' ? adjVal : -adjVal;
    const incomeSubtotal = effectiveCollectionTotal + effectiveCashSell + (Number(bfAmount) || 0);
    const expenseSubtotal = effectiveExpenseTotal;
    const finalTotal = incomeSubtotal - expenseSubtotal + effectiveAdj;
    const cleanDate = normalizeDateStr(activeReportDate);

    const reportData = {
      id: `RPT-${cleanDate}`,
      date: cleanDate,
      savedAt: new Date().toISOString(),
      savedBy: currentUser?.first_name || currentUser?.username || 'Admin',
      isLocked: true,
      income: {
        collection: {
          total: effectiveCollectionTotal,
          cash: effectiveCollectionCash,
          upi: effectiveCollectionUpi,
          bank: effectiveCollectionBank,
          itemsCount: reportCollectionStats.items.length
        },
        cashSell: effectiveCashSell,
        bfAmount: Number(bfAmount) || 0,
        subtotal: incomeSubtotal
      },
      expenses: {
        total: expenseSubtotal,
        subtotal: expenseSubtotal,
        itemsCount: reportExpenseStats.items.length
      },
      adjustment: {
        type: adjustmentType,
        amount: adjVal,
        effectiveAmount: effectiveAdj
      },
      finalTotal: finalTotal,
      collectionItems: reportCollectionStats.items.map(item => ({
        name: item.party_name || item.customer_name || 'Customer',
        party_name: item.party_name || item.customer_name || 'Customer',
        amount: Number(item.amount) || 0,
        mode: item.mode || item.payment_method || 'CASH',
        less: Number(item.less_amount) || 0
      })),
      expenseItems: reportExpenseStats.items.map(item => ({
        name: item.supplier_name || 'Party',
        supplier_name: item.supplier_name || 'Party',
        amount: Number(item.amount) || 0,
        mode: item.payment_method || item.mode || 'CASH',
        notes: item.notes || item.edit || ''
      }))
    };

    if (saveDailyReport) {
      saveDailyReport(reportData);
    } else {
      try {
        const raw = localStorage.getItem('mandi_daily_saved_reports');
        const existing = raw ? JSON.parse(raw) : [];
        const updated = [
          reportData,
          ...existing.filter(r => normalizeDateStr(r.date) !== cleanDate)
        ];
        localStorage.setItem('mandi_daily_saved_reports', JSON.stringify(updated));
        if (setSavedReports) setSavedReports(updated);
      } catch {}
    }

    if (showToast) {
      const label = isReportDateToday ? `Today's Report (${formatDateLabel(activeReportDate)})` : `Daily Report (${formatDateLabel(activeReportDate)})`;
      showToast(`${label} saved & locked! 🔒📄`, 'success');
    }
  };

  // Download / Print Report handler (downloads for activeReportDate)
  const handleDownloadActiveDateReport = () => {
    const adjVal = Number(adjustmentAmount) || 0;
    const effectiveAdj = adjustmentType === 'add' ? adjVal : -adjVal;
    const incomeSubtotal = effectiveCollectionTotal + effectiveCashSell + (Number(bfAmount) || 0);
    const expenseSubtotal = effectiveExpenseTotal;
    const finalTotal = incomeSubtotal - expenseSubtotal + effectiveAdj;
    const cleanDate = normalizeDateStr(activeReportDate);

    const reportData = savedReportForActiveDate || {
      id: `RPT-${cleanDate}`,
      date: cleanDate,
      savedAt: new Date().toISOString(),
      savedBy: currentUser?.first_name || currentUser?.username || 'Admin',
      isLocked: isCurrentReportLocked,
      income: {
        collection: {
          total: effectiveCollectionTotal,
          cash: effectiveCollectionCash,
          upi: effectiveCollectionUpi,
          bank: effectiveCollectionBank
        },
        cashSell: effectiveCashSell,
        bfAmount: Number(bfAmount) || 0,
        subtotal: incomeSubtotal
      },
      expenses: {
        total: expenseSubtotal,
        subtotal: expenseSubtotal
      },
      adjustment: {
        type: adjustmentType,
        amount: adjVal,
        effectiveAmount: effectiveAdj
      },
      finalTotal: finalTotal,
      collectionItems: reportCollectionStats.items,
      expenseItems: reportExpenseStats.items
    };

    printDailyReportDocument(reportData);
  };

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
    <div ref={containerRef} style={{ minHeight: '100vh', background: 'var(--bg-main, #f8fafc)', padding: '0', color: 'var(--text-main, #0f172a)' }}>
      {/* ====== TOP NAV BAR ====== */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card, #ffffff)',
        borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)',
        boxShadow: 'var(--shadow-sm, 0 2px 10px rgba(0,0,0,0.04))',
        padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: '6px'
      }}>
        {/* Row 1: Back + Title on Left, Today Report button on Top Right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
          {/* Back & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexShrink: 1 }}>
            <button onClick={onBack} style={{
              background: 'var(--bg-surface, #f1f5f9)',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              color: 'var(--text-main, #0f172a)',
              borderRadius: '6px', padding: '3px 8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: 700,
              height: '26px', minHeight: 'unset', flexShrink: 0
            }}>
              <ArrowLeft size={13} /> Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
              <Wallet size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                Cash Sell Transactions
              </span>
            </div>
          </div>

          {/* 📊 Today Report Button (Desktop view only, top right) */}
          <button
            onClick={() => setIsReportOpen(!isReportOpen)}
            className="cash-sell-report-btn-desktop"
            style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              padding: '2px 7px', borderRadius: '5px', height: '23px', minHeight: 'unset', maxHeight: '23px',
              background: isReportOpen
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'rgba(245, 158, 11, 0.12)',
              border: isReportOpen ? 'none' : '1px solid rgba(245, 158, 11, 0.35)',
              color: isReportOpen ? '#fff' : '#f59e0b',
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

        {/* Row 2: Date Selector Bar (Mobile Responsive Single Row) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            width: '100%',
            background: 'var(--bg-main, #f8fafc)',
            border: '1.5px solid var(--border-subtle, #e2e8f0)',
            borderRadius: '10px',
            padding: '4px 6px',
            boxSizing: 'border-box',
            flexWrap: 'nowrap'
          }}
        >
          {/* Left / Middle Group */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minWidth: 0,
              flex: 1,
              flexWrap: 'nowrap'
            }}
          >
            <button
              type="button"
              onClick={handlePrevDay}
              title="Previous Day"
              style={{
                width: '28px',
                height: '28px',
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                color: 'var(--text-main, #0f172a)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                padding: 0,
                flexShrink: 0
              }}
            >
              <ChevronLeft size={15} />
            </button>

            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--text-muted, #64748b)',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                flexShrink: 0
              }}
            >
              DATE:
            </span>

            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{
                background: 'var(--bg-input, #ffffff)',
                border: '1.5px solid var(--border-subtle, #cbd5e1)',
                color: 'var(--text-main, #0f172a)',
                colorScheme: 'inherit',
                fontWeight: 800,
                fontSize: '0.8rem',
                borderRadius: '6px',
                padding: '2px 4px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                outline: 'none',
                height: '28px',
                minWidth: 0,
                flex: 1,
                maxWidth: '125px',
                boxSizing: 'border-box'
              }}
            />

            <button
              type="button"
              onClick={handleNextDay}
              title="Next Day"
              style={{
                width: '28px',
                height: '28px',
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                color: 'var(--text-main, #0f172a)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                padding: 0,
                flexShrink: 0
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Right Group: Today Button */}
          <button
            type="button"
            onClick={handleToday}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '0 12px',
              height: '28px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxSizing: 'border-box',
              whiteSpace: 'nowrap'
            }}
          >
            Today
          </button>
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
                  ? `${tab.color}18`
                  : 'var(--bg-card, #f8fafc)',
                color: activeSection === tab.key ? tab.color : 'var(--text-muted, #64748b)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 4: Summary Cards with Collection Breakdown (Cash, UPI, Bank) */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{
            flex: 1.15, padding: '6px 10px', borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex', flexDirection: 'column', gap: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} color="#10b981" />
                <span style={{ fontSize: '0.66rem', color: '#059669', fontWeight: 800 }}>Collection</span>
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#10b981' }}>
                ₹{totalCollection.toLocaleString()}
              </span>
            </div>
            {/* Mode breakdown: Cash / UPI / Bank */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap',
              paddingTop: '3px', borderTop: '1px dashed rgba(16, 185, 129, 0.25)'
            }}>
              <span
                title="Cash Collection"
                style={{
                  fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.16)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                💵 ₹{collectionBreakdown.cash.toLocaleString()}
              </span>
              <span
                title="UPI Collection"
                style={{
                  fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                  background: 'rgba(59, 130, 246, 0.14)', color: '#1d4ed8', border: '1px solid rgba(59, 130, 246, 0.28)'
                }}
              >
                📱 ₹{collectionBreakdown.upi.toLocaleString()}
              </span>
              <span
                title="Bank / Cheque / NEFT / RTGS Collection"
                style={{
                  fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                  background: 'rgba(168, 85, 247, 0.14)', color: '#6d28d9', border: '1px solid rgba(168, 85, 247, 0.28)'
                }}
              >
                🏦 ₹{collectionBreakdown.bank.toLocaleString()}
              </span>
            </div>
          </div>

          <div style={{
            flex: 0.85, padding: '6px 10px', borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingDown size={14} color="#ef4444" />
                <span style={{ fontSize: '0.66rem', color: '#dc2626', fontWeight: 800 }}>Expenses</span>
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ef4444' }}>
                ₹{totalExpense.toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '0.60rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
              {expenseHistory.length} entry/entries
            </div>
          </div>
        </div>
      </div>

      {/* ====== CONTENT BODY ====== */}
      <div style={{ padding: '10px 8px 65px 8px', maxWidth: '900px', margin: '0 auto' }}>

        {/* ======================== COLLECTION / TAGADA ======================== */}
        {activeSection === 'collection' && (
          <div>
            {/* Entry Form */}
            <div style={{
              background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: '12px', padding: '12px 10px', marginBottom: '12px',
              boxShadow: 'var(--shadow-sm, 0 2px 10px rgba(0,0,0,0.05))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={16} color="#10b981" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    Customer se Paisa Liya (Collection / Tagada)
                  </span>
                </div>
              </div>

              {collectionRows.map((row, idx) => (
                <div key={row.id} style={{
                  marginBottom: '10px', padding: '10px',
                  background: 'var(--bg-surface, #f8fafc)', borderRadius: '10px',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  {/* Row 1: Customer Name (full width & responsive) */}
                  <div style={{ width: '100%', position: 'relative' }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '3px', display: 'block' }}>
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={row.customer_name}
                      onChange={e => handleCollectionChange(idx, 'customer_name', e.target.value)}
                      onFocus={() => {
                        const q = (row.customer_name || '').trim().toLowerCase();
                        const matchedCusts = allCustomerNames
                          .filter(n => !q || n.toLowerCase().includes(q))
                          .slice(0, 15);
                        setCollectionSuggestions(prev => ({ ...prev, [idx]: matchedCusts }));
                      }}
                      placeholder="Type customer name..."
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 600,
                        border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px',
                        background: 'var(--bg-input, #ffffff)', color: 'var(--text-main, #0f172a)', outline: 'none',
                        boxSizing: 'border-box', height: '36px'
                      }}
                    />
                    {(collectionSuggestions[idx] || []).length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)',
                        borderRadius: '8px', maxHeight: '180px', overflowY: 'auto',
                        zIndex: 200, boxShadow: 'var(--shadow-dropdown, 0 8px 24px rgba(0,0,0,0.12))',
                        marginTop: '3px'
                      }}>
                        {collectionSuggestions[idx].map((name, si) => (
                          <div
                            key={si}
                            onClick={() => handleSelectCollectionCustomer(idx, name)}
                            style={{
                              padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem',
                              fontWeight: 600, color: 'var(--text-main, #0f172a)',
                              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                              display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover, #f8fafc)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <UserCheck size={14} color="#10b981" />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Amount (₹) + Less (₹) + Mode + Remove button */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
                    {/* Amount */}
                    <div style={{ flex: 1, minWidth: '95px' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '3px', display: 'block' }}>
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={e => handleCollectionChange(idx, 'amount', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%', padding: '6px 10px', fontSize: '0.88rem', fontWeight: 700,
                          border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px',
                          background: 'var(--bg-input, #ffffff)', color: 'var(--text-main, #0f172a)', outline: 'none',
                          boxSizing: 'border-box', height: '36px'
                        }}
                      />
                    </div>

                    {/* Less (₹) */}
                    <div style={{ width: '125px', flexShrink: 0 }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', marginBottom: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Less (₹)</span>
                      </label>
                      <input
                        type="number"
                        value={row.less ?? ''}
                        onChange={e => handleCollectionChange(idx, 'less', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%', padding: '6px 10px', fontSize: '0.88rem', fontWeight: 700,
                          border: '1.5px solid rgba(239, 68, 68, 0.35)', borderRadius: '8px',
                          background: 'var(--bg-input, #ffffff)', color: '#ef4444', outline: 'none',
                          boxSizing: 'border-box', height: '36px'
                        }}
                      />
                    </div>

                    {/* Mode */}
                    <div style={{ width: '185px', flexShrink: 0 }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '3px', display: 'block' }}>
                        Mode
                      </label>
                      <select
                        value={row.mode}
                        onChange={e => handleCollectionChange(idx, 'mode', e.target.value)}
                        style={{
                          width: '100%', padding: '6px 8px', fontSize: '0.82rem', fontWeight: 700,
                          border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px',
                          background: 'var(--bg-input, #ffffff)', color: 'var(--text-main, #0f172a)', outline: 'none',
                          boxSizing: 'border-box', height: '36px', cursor: 'pointer'
                        }}
                      >
                        {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* Remove button */}
                    {collectionRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCollectionRow(idx)}
                        style={{
                          width: '36px', height: '36px', flexShrink: 0,
                          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444', borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                        }}
                        title="Remove entry"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Row + Save Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={addCollectionRow}
                  style={{
                    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 10px', height: '36px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem',
                    cursor: 'pointer', border: '1.5px dashed var(--border-subtle, #cbd5e1)',
                    background: 'var(--bg-surface, #f8fafc)', color: 'var(--text-secondary, #64748b)',
                    transition: 'all 0.2s', boxSizing: 'border-box', whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={15} /> Add More Entry
                </button>
                <button
                  type="button"
                  onClick={handleSaveCollection}
                  style={{
                    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 10px', height: '36px', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem',
                    cursor: 'pointer', border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff', boxShadow: '0 2px 10px rgba(16,185,129,0.25)',
                    transition: 'all 0.2s', boxSizing: 'border-box', whiteSpace: 'nowrap'
                  }}
                >
                  <Check size={16} /> Save Collection
                </button>
              </div>
            </div>

            {/* Collection History */}
            <div style={{
              background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: '12px', padding: '12px 10px',
              boxShadow: 'var(--shadow-sm, 0 2px 10px rgba(0,0,0,0.05))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Receipt size={15} color="#10b981" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
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
                  padding: '20px 0', textAlign: 'center', color: 'var(--text-muted, #64748b)',
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
                      background: 'var(--bg-surface, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)'
                    }}>
                      {p.party_type === 'supplier' ? (
                        <Truck size={14} color="#ef4444" />
                      ) : (
                        <UserCheck size={14} color="#10b981" />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                            {p.party_name || p.customer_name || p.supplier_name}
                          </span>
                          {p.party_type === 'supplier' && (
                            <span style={{
                              fontSize: '0.62rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'rgba(239,68,68,0.1)',
                              color: '#ef4444',
                              fontWeight: 700
                            }}>
                              Supplier (Paisa Diya)
                            </span>
                          )}
                          {Number(p.less_amount || 0) > 0 && (
                            <span style={{
                              fontSize: '0.64rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(239,68,68,0.1)',
                              color: '#dc2626',
                              fontWeight: 800,
                              border: '1px solid rgba(239,68,68,0.25)'
                            }}>
                              Less: ₹{Number(p.less_amount).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                          {formatDateLabel(p.date)} • {p.payment_method || 'CASH'}{(p.notes && !p.notes.toLowerCase().includes('collection')) ? ` • ${p.notes}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          color: p.party_type === 'supplier' ? '#ef4444' : '#10b981'
                        }}>
                          {p.party_type === 'supplier' ? '-' : '+'}₹{Number(p.amount || 0).toLocaleString()}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p, 'collection')}
                          title="Edit entry"
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            background: 'var(--bg-card, #ffffff)',
                            color: 'var(--text-muted, #64748b)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}
                        >
                          <Pencil size={11} />
                        </button>
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
              background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: '12px', padding: '12px 10px', marginBottom: '12px',
              boxShadow: 'var(--shadow-sm, 0 2px 10px rgba(0,0,0,0.05))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    Supplier ko Paisa Diya (Expenses)
                  </span>
                </div>
              </div>

              {expenseRows.map((row, idx) => (
                <div key={row.id} style={{
                  marginBottom: '10px', padding: '10px',
                  background: 'var(--bg-surface, #f8fafc)', borderRadius: '10px',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  {/* Row 1: Supplier Name (full width & responsive) */}
                  <div style={{ width: '100%', position: 'relative' }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '3px', display: 'block' }}>
                      Name
                    </label>
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
                        width: '100%', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 600,
                        border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px',
                        background: 'var(--bg-input, #ffffff)', color: 'var(--text-main, #0f172a)', outline: 'none',
                        boxSizing: 'border-box', height: '36px'
                      }}
                    />
                    {(expenseSuggestions[idx] || []).length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)',
                        borderRadius: '8px', maxHeight: '180px', overflowY: 'auto',
                        zIndex: 200, boxShadow: 'var(--shadow-dropdown, 0 8px 24px rgba(0,0,0,0.12))',
                        marginTop: '3px'
                      }}>
                        {expenseSuggestions[idx].map((name, si) => (
                          <div
                            key={si}
                            onClick={() => handleSelectExpenseSupplier(idx, name)}
                            style={{
                              padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem',
                              fontWeight: 600, color: 'var(--text-main, #0f172a)',
                              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                              display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover, #f8fafc)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Truck size={14} color="#ef4444" />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Edit Input Section (Below Supplier Name) */}
                  <div style={{ width: '100%' }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '3px', display: 'block' }}>
                      Details
                    </label>
                    <input
                      type="text"
                      value={row.edit || ''}
                      onChange={e => handleExpenseChange(idx, 'edit', e.target.value)}
                      placeholder="Type details..."
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 600,
                        border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px',
                        background: 'var(--bg-input, #ffffff)', color: 'var(--text-main, #0f172a)', outline: 'none',
                        boxSizing: 'border-box', height: '36px'
                      }}
                    />
                  </div>

                  {/* Row 2: Amount (₹) + Mode + Remove button */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%' }}>
                    {/* Amount */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '3px', display: 'block' }}>
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={row.amount}
                        onChange={e => handleExpenseChange(idx, 'amount', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%', padding: '6px 10px', fontSize: '0.88rem', fontWeight: 700,
                          border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px',
                          background: 'var(--bg-input, #ffffff)', color: 'var(--text-main, #0f172a)', outline: 'none',
                          boxSizing: 'border-box', height: '36px'
                        }}
                      />
                    </div>

                    {/* Mode */}
                    <div style={{ width: '210px', flexShrink: 0 }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '3px', display: 'block' }}>
                        Mode
                      </label>
                      <select
                        value={row.mode}
                        onChange={e => handleExpenseChange(idx, 'mode', e.target.value)}
                        style={{
                          width: '100%', padding: '6px 8px', fontSize: '0.82rem', fontWeight: 700,
                          border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '8px',
                          background: 'var(--bg-input, #ffffff)', color: 'var(--text-main, #0f172a)', outline: 'none',
                          boxSizing: 'border-box', height: '36px', cursor: 'pointer'
                        }}
                      >
                        {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* Remove button */}
                    {expenseRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExpenseRow(idx)}
                        style={{
                          width: '36px', height: '36px', flexShrink: 0,
                          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444', borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                        }}
                        title="Remove entry"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Row + Save Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={addExpenseRow}
                  style={{
                    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 10px', height: '36px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem',
                    cursor: 'pointer', border: '1.5px dashed var(--border-subtle, #cbd5e1)',
                    background: 'var(--bg-surface, #f8fafc)', color: 'var(--text-secondary, #64748b)',
                    transition: 'all 0.2s', boxSizing: 'border-box', whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={15} /> Add More Entry
                </button>
                <button
                  type="button"
                  onClick={handleSaveExpenses}
                  style={{
                    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 10px', height: '36px', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem',
                    cursor: 'pointer', border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff', boxShadow: '0 2px 10px rgba(239,68,68,0.25)',
                    transition: 'all 0.2s', boxSizing: 'border-box', whiteSpace: 'nowrap'
                  }}
                >
                  <Check size={16} /> Save Expenses
                </button>
              </div>
            </div>

            {/* Expense History */}
            <div style={{
              background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: '12px', padding: '12px 10px',
              boxShadow: 'var(--shadow-sm, 0 2px 10px rgba(0,0,0,0.05))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Receipt size={15} color="#ef4444" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
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
                  padding: '20px 0', textAlign: 'center', color: 'var(--text-muted, #64748b)',
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
                      background: 'var(--bg-surface, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)'
                    }}>
                      <Truck size={14} color="#ef4444" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                          {p.supplier_name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                          {formatDateLabel(p.date)} • {p.payment_method || 'CASH'}{(p.notes && p.notes !== 'Expenses / Paisa Diya') ? ` • ${p.notes}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ef4444' }}>
                          -₹{Number(p.amount || 0).toLocaleString()}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p, 'expense')}
                          title="Edit expense"
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            background: 'var(--bg-card, #ffffff)',
                            color: 'var(--text-muted, #64748b)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ====== EDIT TRANSACTION MODAL ====== */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setEditingItem(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-modal, #ffffff)',
              borderRadius: '16px',
              border: '1.5px solid var(--border-subtle, #e2e8f0)',
              width: '100%',
              maxWidth: '420px',
              boxShadow: 'var(--shadow-dropdown, 0 20px 40px rgba(0,0,0,0.25))',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 18px',
                background: editingItem.type === 'collection'
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%)',
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
                    background: editingItem.type === 'collection'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Pencil size={15} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main, #0f172a)' }}>
                    {editingItem.type === 'collection' ? 'Edit Collection' : 'Edit Expense'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>
                    Update details & save changes
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted, #64748b)',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={e => { e.preventDefault(); handleSaveEdit(); }} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>
                  {editingItem.type === 'collection' ? 'Customer Name' : 'Supplier Name / Name'}
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Enter name..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    outline: 'none',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'var(--text-main, #0f172a)',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Amount, Less & Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: editingItem.type === 'collection' ? '1fr 1fr 1.2fr' : '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editFormData.amount}
                    onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: editingItem.type === 'collection' ? '1.5px solid #10b981' : '1.5px solid #ef4444',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: editingItem.type === 'collection' ? '#10b981' : '#ef4444',
                      outline: 'none',
                      background: 'var(--bg-input, #ffffff)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {editingItem.type === 'collection' && (
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '4px' }}>
                      Less (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={editFormData.less ?? ''}
                      onChange={e => setEditFormData({ ...editFormData, less: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid rgba(239, 68, 68, 0.4)',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: '#ef4444',
                        outline: 'none',
                        background: 'var(--bg-input, #ffffff)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={editFormData.mode}
                    onChange={e => setEditFormData({ ...editFormData, mode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle, #cbd5e1)',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      outline: 'none',
                      background: 'var(--bg-input, #ffffff)',
                      color: 'var(--text-main, #0f172a)',
                      boxSizing: 'border-box'
                    }}
                  >
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    outline: 'none',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'var(--text-main, #0f172a)',
                    colorScheme: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Details / Notes */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>
                  Details / Note
                </label>
                <input
                  type="text"
                  value={editFormData.notes}
                  onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Optional details..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'var(--text-main, #0f172a)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleDeleteEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      background: 'var(--bg-surface, #f8fafc)',
                      color: 'var(--text-muted, #64748b)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: editingItem.type === 'collection'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    <Check size={14} /> Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ====== TODAY REPORT BOTTOM DRAWER ====== */}
      {isReportOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setIsReportOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 998,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(3px)',
              transition: 'opacity 0.3s ease'
            }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
            background: 'var(--bg-modal, #0b1912)',
            borderTop: '2px solid var(--border-focus, #10b981)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 16px 28px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
            maxHeight: '80vh', overflowY: 'auto',
            animation: 'slideUp 0.35s ease-out'
          }}>
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-light, rgba(255,255,255,0.2))' }} />
            </div>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <ClipboardList size={20} color="#f59e0b" />
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>
                  📊 {isReportDateToday ? "Today's Report" : "Daily Report"}
                </span>
                <span style={{
                  fontSize: '0.74rem',
                  color: isReportDateToday ? '#10b981' : '#38bdf8',
                  fontWeight: 700,
                  background: isReportDateToday ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                  border: isReportDateToday ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {formatDateLabel(activeReportDate)} {isReportDateToday ? '(Today)' : ''}
                </span>
                {isCurrentReportLocked && (
                  <span style={{
                    fontSize: '0.68rem',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <Lock size={11} /> Locked
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsReportOpen(false)}
                style={{
                  background: 'var(--bg-card, rgba(255,255,255,0.08))',
                  border: '1px solid var(--border-subtle, transparent)',
                  color: 'var(--text-muted, #94a3b8)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ===== INCOME SECTION (+ items) ===== */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                ➕ {isReportDateToday ? 'Aaj ki Amdani (Income)' : 'Amdani (Income)'}
              </div>

              {/* Collection / Tagada with Cash, UPI, Bank Breakdown */}
              <div style={{
                padding: '12px 14px', borderRadius: '12px', marginBottom: '8px',
                background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} color="#10b981" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #e2e8f0)' }}>Collection / Tagada</span>
                  </div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>₹{effectiveCollectionTotal.toLocaleString()}</span>
                </div>

                {/* Sub-breakdown: Cash, UPI, Bank / Cheque / NEFT / RTGS */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  paddingTop: '8px',
                  borderTop: '1px dashed rgba(16, 185, 129, 0.22)'
                }}>
                  {/* Cash */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '7px',
                    padding: '5px 8px'
                  }}>
                    <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>
                      💵 Cash
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#10b981', marginTop: '1px' }}>
                      ₹{effectiveCollectionCash.toLocaleString()}
                    </div>
                  </div>

                  {/* UPI */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '7px',
                    padding: '5px 8px'
                  }}>
                    <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>
                      📱 UPI
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#3b82f6', marginTop: '1px' }}>
                      ₹{effectiveCollectionUpi.toLocaleString()}
                    </div>
                  </div>

                  {/* Bank / Cheque / NEFT / RTGS */}
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    borderRadius: '7px',
                    padding: '5px 8px'
                  }}>
                    <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="Bank / Cheque / NEFT / RTGS">
                      🏦 Bank / Cheque
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#a855f7', marginTop: '1px' }}>
                      ₹{effectiveCollectionBank.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Sell */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '6px',
                background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Banknote size={16} color="#3b82f6" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #e2e8f0)' }}>Cash Sell (Rokda Bikri)</span>
                </div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3b82f6' }}>₹{effectiveCashSell.toLocaleString()}</span>
              </div>

              {/* B/F (Brought Forward) — input */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '6px',
                background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={16} color="#a855f7" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #e2e8f0)' }}>B/F (Brought Forward)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.95rem' }}>₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    disabled={isCurrentReportLocked}
                    value={bfAmount}
                    onChange={e => setBfAmount(e.target.value)}
                    style={{
                      width: '100px', padding: '6px 10px', borderRadius: '6px',
                      background: 'var(--bg-input, rgba(255,255,255,0.06))',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      color: '#a855f7', fontWeight: 800, fontSize: '1rem', textAlign: 'right', outline: 'none',
                      opacity: isCurrentReportLocked ? 0.75 : 1,
                      cursor: isCurrentReportLocked ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
              </div>

              {/* Subtotal line */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '8px 14px', borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', marginTop: '6px'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginRight: '12px' }}>Sub Total</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                  ₹{(effectiveCollectionTotal + effectiveCashSell + (Number(bfAmount) || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* ===== EXPENSE SECTION (- items) ===== */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                ➖ {isReportDateToday ? 'Aaj ka Kharcha (Expenses)' : 'Kharcha (Expenses)'}
              </div>

              {/* Expenses */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px', marginBottom: '6px',
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingDown size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #e2e8f0)' }}>Expenses / Paisa Diya</span>
                </div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444' }}>₹{effectiveExpenseTotal.toLocaleString()}</span>
              </div>

              {/* Subtotal line */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '8px 14px', borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', marginTop: '6px'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginRight: '12px' }}>Sub Total</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444' }}>
                  ₹{effectiveExpenseTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* ===== ADJUSTMENT SECTION (below Expenses) ===== */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                ⚖️ Adjustment
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px',
                background: adjustmentType === 'add' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: adjustmentType === 'add' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                transition: 'all 0.2s ease',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal size={16} color={adjustmentType === 'add' ? '#10b981' : '#ef4444'} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #e2e8f0)' }}>Adjustment</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                  {/* Add / Less Segmented Control */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px',
                    borderRadius: '8px',
                    background: 'var(--bg-card, rgba(0, 0, 0, 0.35))',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))'
                  }}>
                    <button
                      type="button"
                      disabled={isCurrentReportLocked}
                      onClick={() => setAdjustmentType('add')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: isCurrentReportLocked ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        transition: 'all 0.18s ease',
                        background: adjustmentType === 'add' ? '#10b981' : 'transparent',
                        color: adjustmentType === 'add' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                        boxShadow: adjustmentType === 'add' ? '0 2px 6px rgba(16, 185, 129, 0.4)' : 'none'
                      }}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      disabled={isCurrentReportLocked}
                      onClick={() => setAdjustmentType('less')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: isCurrentReportLocked ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        transition: 'all 0.18s ease',
                        background: adjustmentType === 'less' ? '#ef4444' : 'transparent',
                        color: adjustmentType === 'less' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                        boxShadow: adjustmentType === 'less' ? '0 2px 6px rgba(239, 68, 68, 0.4)' : 'none'
                      }}
                    >
                      − Less
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{
                      color: adjustmentType === 'add' ? '#10b981' : '#ef4444',
                      fontWeight: 800,
                      fontSize: '0.95rem'
                    }}>
                      {adjustmentType === 'add' ? '+₹' : '−₹'}
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      disabled={isCurrentReportLocked}
                      value={adjustmentAmount}
                      onChange={e => setAdjustmentAmount(e.target.value)}
                      style={{
                        width: '85px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-input, rgba(255,255,255,0.06))',
                        border: adjustmentType === 'add' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                        color: adjustmentType === 'add' ? '#10b981' : '#ef4444',
                        fontWeight: 800,
                        fontSize: '1rem',
                        textAlign: 'right',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        opacity: isCurrentReportLocked ? 0.75 : 1,
                        cursor: isCurrentReportLocked ? 'not-allowed' : 'text'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== FINAL DAY TOTAL & ACTIONS ===== */}
            {(() => {
              const adjVal = Number(adjustmentAmount) || 0;
              const effectiveAdj = adjustmentType === 'add' ? adjVal : -adjVal;
              const income = effectiveCollectionTotal + effectiveCashSell + (Number(bfAmount) || 0);
              const expense = effectiveExpenseTotal;
              const dayFinal = income - expense + effectiveAdj;
              return (
                <div>
                  <div style={{
                    padding: '16px 18px', borderRadius: '14px',
                    background: dayFinal >= 0
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.06) 100%)'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.06) 100%)',
                    border: dayFinal >= 0
                      ? '2px solid rgba(16,185,129,0.35)'
                      : '2px solid rgba(239,68,68,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        💰 {isReportDateToday ? "Today's Total" : "Day's Net Total"}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                        ({effectiveCollectionTotal.toLocaleString()} + {effectiveCashSell.toLocaleString()} + {(Number(bfAmount) || 0).toLocaleString()}) − {effectiveExpenseTotal.toLocaleString()}
                        {adjVal > 0 ? ` ${adjustmentType === 'add' ? '+' : '−'} ${adjVal.toLocaleString()}` : ''}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '1.55rem', fontWeight: 900,
                      color: dayFinal >= 0 ? '#10b981' : '#ef4444',
                      textShadow: dayFinal >= 0 ? '0 0 20px rgba(16,185,129,0.3)' : '0 0 20px rgba(239,68,68,0.3)'
                    }}>
                      ₹{dayFinal.toLocaleString()}
                    </span>
                  </div>

                  {/* Locked status banner if saved */}
                  {isCurrentReportLocked && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.74rem',
                      color: '#10b981',
                      fontWeight: 700
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={13} />
                        <span>Report is saved & locked ({formatDateLabel(activeReportDate)})</span>
                      </div>
                      {onUnlockDailyReport && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Unlock report for ${formatDateLabel(activeReportDate)} for editing?`)) {
                              onUnlockDailyReport(activeReportDate);
                              if (showToast) showToast('Report unlocked for editing 🔓', 'info');
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f59e0b',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textDecoration: 'underline'
                          }}
                        >
                          Unlock
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions: Download Report & Save Report */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginTop: '16px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.1))'
                  }}>
                    {/* Download / Print Report */}
                    <button
                      type="button"
                      onClick={handleDownloadActiveDateReport}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '11px 16px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Download size={15} />
                      <span>Download Report</span>
                    </button>

                    {/* Save Daily Report / Locked Button */}
                    <button
                      type="button"
                      onClick={handleSaveActiveDateReport}
                      disabled={isCurrentReportLocked}
                      title={isCurrentReportLocked ? `Report for ${formatDateLabel(activeReportDate)} is already saved and locked` : "Save and lock report"}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '11px 16px',
                        borderRadius: '10px',
                        background: isCurrentReportLocked
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: isCurrentReportLocked
                          ? '1.5px solid rgba(16, 185, 129, 0.4)'
                          : 'none',
                        color: isCurrentReportLocked ? '#10b981' : '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: isCurrentReportLocked ? 'not-allowed' : 'pointer',
                        boxShadow: isCurrentReportLocked ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                        opacity: isCurrentReportLocked ? 0.9 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isCurrentReportLocked ? (
                        <>
                          <Lock size={15} />
                          <span>Report Locked</span>
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          <span>Save Report</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sidebar Daily Reports Navigation link */}
                  {onOpenDailyReports && (
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsReportOpen(false);
                          onOpenDailyReports();
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#0284c7',
                          cursor: 'pointer',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          textDecoration: 'underline'
                        }}
                      >
                        📋 View All Daily Reports in Sidebar
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* ====== MOBILE FIXED BOTTOM/FOOTER REPORT BUTTON ====== */}
      <div
        className="cash-sell-report-btn-mobile-fixed"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 950,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: isReportOpen ? 'none' : 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => setIsReportOpen(!isReportOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 18px',
            borderRadius: '24px',
            height: '34px',
            background: isReportOpen
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'var(--bg-card, #ffffff)',
            border: isReportOpen ? '1.5px solid #d97706' : '1.5px solid #f59e0b',
            color: isReportOpen ? '#ffffff' : '#f59e0b',
            fontWeight: 800,
            fontSize: '0.82rem',
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box'
          }}
        >
          <ClipboardList size={14} color={isReportOpen ? '#ffffff' : '#f59e0b'} />
          <span>Report</span>
          {isReportOpen ? <ChevronDown size={14} color="#ffffff" /> : <ChevronUp size={14} color="#f59e0b" />}
        </button>
      </div>

      {/* Slide-up animation & Responsive visibility */}
      <style>{`
        /* Remove number input spin buttons / up-down arrows */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        input[type="number"] {
          -moz-appearance: textfield !important;
          appearance: textfield !important;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .cash-sell-report-btn-desktop {
            display: none !important;
          }
          .cash-sell-report-btn-mobile-fixed {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .cash-sell-report-btn-desktop {
            display: flex !important;
          }
          .cash-sell-report-btn-mobile-fixed {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
