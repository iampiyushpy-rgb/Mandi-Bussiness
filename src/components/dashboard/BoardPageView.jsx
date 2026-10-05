import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  Apple,
  Truck,
  Package,
  Calendar,
  Clock,
  Check,
  Trash2,
  Search,
  ArrowDown,
  X,
  User,
  Users,
  ShoppingCart,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Phone,
  Building2,
  CreditCard,
  Percent,
  CheckCircle,
  Banknote,
  BookOpen,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDisplayDate } from '../../utils/dateUtils';
import CashSellHistoryView from './CashSellHistoryView';
import UdhaarHistoryView from './UdhaarHistoryView';



export default function BoardPageView({
  supplierProfiles = [],
  setSupplierProfiles,
  truckSalesList = [],
  setTruckSalesList,
  salesList = [],
  customerProfiles = [],
  setCustomerProfiles,
  suppliers = [],
  setSuppliers,
  customers = [],
  setCustomers,
  purchasesList = [],
  setActiveTab,
  showToast,
  setIsCustomerModalOpen,
  setIsSupplierTrucksModalOpen,
  saveFruitAndVariety,
  savedFruitNames = [],
  savedFruitVarieties = [],
  currentUser
}) {
  const [showCashSellPage, setShowCashSellPage] = useState(false);
  const [showUdhaarPage, setShowUdhaarPage] = useState(false);

  const handleOpenCashSellHistory = () => {
    if (setActiveTab) {
      setActiveTab('cash-sell-history');
    } else {
      setShowCashSellPage(true);
    }
  };

  const handleOpenUdhaarHistory = () => {
    if (setActiveTab) {
      setActiveTab('udhaar-history');
    } else {
      setShowUdhaarPage(true);
    }
  };
  // ---------------------------------------------------------------------------
  // 1. Board Header Date & Day State
  // ---------------------------------------------------------------------------
  const getSystemDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedBoardDate, setSelectedBoardDate] = useState(() => getSystemDate());
  const [lotFilterMode, setLotFilterMode] = useState('ACTIVE'); // 'ACTIVE' (balance > 0) | 'COMPLETED' (balance <= 0)
  const [boardSearchQuery, setBoardSearchQuery] = useState('');

  // Compute dynamic day of week name (e.g. WEDNESDAY, THURSDAY)
  const dayOfWeekName = useMemo(() => {
    try {
      const parts = selectedBoardDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    } catch {
      return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    }
  }, [selectedBoardDate]);

  const handlePrevDay = () => {
    try {
      const parts = selectedBoardDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() - 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedBoardDate(`${year}-${month}-${day}`);
    } catch { }
  };

  const handleNextDay = () => {
    try {
      const parts = selectedBoardDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedBoardDate(`${year}-${month}-${day}`);
    } catch { }
  };

  const handleToday = () => {
    setSelectedBoardDate(getSystemDate());
  };

  // ---------------------------------------------------------------------------
  // 1b. Daily Date-Wise Sales Metrics (Cash Sale vs Udhaar / Khata)
  // ---------------------------------------------------------------------------
  const dailyDateSalesMetrics = useMemo(() => {
    const targetDate = selectedBoardDate || getSystemDate();

    // Map to deduplicate sales by ID
    const allSalesMap = new Map();

    // 1. From truckSalesList (primary board sales source)
    (truckSalesList || []).forEach(s => {
      if (s && s.id !== undefined && s.id !== null) {
        allSalesMap.set(String(s.id), s);
      }
    });

    // 2. From customer buy_history (if any sale was saved to customer profile)
    (customerProfiles || []).forEach(c => {
      (c.buy_history || []).forEach(b => {
        if (b && b.id !== undefined && b.id !== null && !allSalesMap.has(String(b.id))) {
          allSalesMap.set(String(b.id), {
            id: b.id,
            selling_date: b.date || b.selling_date,
            total: Number(b.total || 0),
            boxes: Number(b.boxes || 0),
            payment_mode: b.payment_mode || 'CREDIT',
            amount_paid: b.amount_paid !== undefined ? Number(b.amount_paid) : 0,
            customer_name: c.customer_name || 'Customer'
          });
        }
      });
    });

    // 3. From backend salesList
    (salesList || []).forEach(s => {
      if (s && s.id !== undefined && s.id !== null && !allSalesMap.has(String(s.id))) {
        const sTotal = Number(s.total_amount || s.final_amount || s.total || 0);
        const sPaid = s.amount_paid !== undefined && s.amount_paid !== null ? Number(s.amount_paid) : (s.payment_type === 'CASH' || s.payment_mode === 'CASH' ? sTotal : 0);
        allSalesMap.set(String(s.id), {
          id: s.id,
          selling_date: s.sale_date || s.date || (s.created_at ? String(s.created_at).slice(0, 10) : ''),
          total: sTotal,
          boxes: Number(s.total_boxes || s.boxes || s.quantity || 0),
          payment_mode: s.payment_type || s.payment_mode || (s.is_cash ? 'CASH' : 'CREDIT'),
          amount_paid: sPaid,
          customer_name: s.customer_name || 'Customer'
        });
      }
    });

    const allSales = Array.from(allSalesMap.values());

    const normalizeDateStr = (rawDate) => {
      if (!rawDate) return '';
      const s = String(rawDate).trim();
      if (s.includes('T')) return s.split('T')[0];
      if (s.length >= 10) return s.slice(0, 10);
      return s;
    };

    const daySales = allSales.filter(s => {
      const sDate = normalizeDateStr(s.selling_date || s.date || s.created_at || s.sale_date);
      return sDate === targetDate;
    });

    let totalCashAmount = 0;
    let totalKhataAmount = 0;
    let totalBoxesSold = 0;

    daySales.forEach(s => {
      const tot = Number(s.total || s.total_amount || 0);
      const mode = String(s.payment_mode || s.payment_type || '').toUpperCase();
      const custName = String(s.customer_name || '').toUpperCase();

      const isExplicitCash = mode === 'CASH' || mode === 'UPI' || custName === 'CASH SALE';
      const isExplicitCredit = mode === 'CREDIT' || mode === 'KHATA' || mode === 'UDHAAR';

      let paid = 0;
      let unpaid = 0;

      if (s.amount_paid !== undefined && s.amount_paid !== null && s.amount_paid !== '') {
        paid = Number(s.amount_paid || 0);
        unpaid = Math.max(0, tot - paid);
      } else if (isExplicitCash) {
        paid = tot;
        unpaid = 0;
      } else if (isExplicitCredit) {
        paid = 0;
        unpaid = tot;
      } else {
        if (custName.includes('CASH')) {
          paid = tot;
          unpaid = 0;
        } else {
          unpaid = tot;
          paid = 0;
        }
      }

      totalCashAmount += paid;
      totalKhataAmount += unpaid;
      totalBoxesSold += Number(s.boxes || 0);
    });

    const totalDayBikri = totalCashAmount + totalKhataAmount;

    return {
      daySales,
      totalCashAmount,
      totalKhataAmount,
      totalDayBikri,
      totalBoxesSold,
      count: daySales.length
    };
  }, [truckSalesList, customerProfiles, salesList, selectedBoardDate]);

  // ---------------------------------------------------------------------------
  // 2. Filter Lots & Active Selected Lot State
  // ---------------------------------------------------------------------------
  const activeLotsCount = useMemo(() => {
    return supplierProfiles.filter(lot => Number(lot.balance_box || 0) > 0).length;
  }, [supplierProfiles]);

  const completedLotsCount = useMemo(() => {
    return supplierProfiles.filter(lot => Number(lot.balance_box || 0) <= 0).length;
  }, [supplierProfiles]);

  const filteredLots = useMemo(() => {
    return supplierProfiles.filter(lot => {
      const bal = Number(lot.balance_box || 0);

      // Mode: ACTIVE (balance > 0) vs COMPLETED (balance <= 0)
      if (lotFilterMode === 'COMPLETED') {
        if (bal > 0) return false;
      } else {
        if (bal <= 0) return false;
      }

      // Search query
      if (boardSearchQuery.trim()) {
        const q = boardSearchQuery.trim().toLowerCase();
        const match =
          (lot.supplier_name || '').toLowerCase().includes(q) ||
          (lot.fruit || '').toLowerCase().includes(q) ||
          (lot.variety || '').toLowerCase().includes(q) ||
          (lot.truckno || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [supplierProfiles, lotFilterMode, boardSearchQuery]);

  const [selectedLotId, setSelectedLotId] = useState(null);

  // Auto-select first lot if none selected or if selected lot no longer exists
  useEffect(() => {
    if (filteredLots.length > 0) {
      const exists = filteredLots.some(l => l.id === selectedLotId);
      if (!exists || selectedLotId === null) {
        setSelectedLotId(filteredLots[0].id);
      }
    } else {
      setSelectedLotId(null);
    }
  }, [filteredLots, selectedLotId]);

  const activeLot = useMemo(() => {
    return supplierProfiles.find(l => l.id === selectedLotId) || (filteredLots.length > 0 ? filteredLots[0] : null);
  }, [supplierProfiles, selectedLotId, filteredLots]);

  // ---------------------------------------------------------------------------
  // 3. Lot Delivery Entry Popup Modal State
  // ---------------------------------------------------------------------------
  const [isAddLotModalOpen, setIsAddLotModalOpen] = useState(false);
  const [isSubmittingLot, setIsSubmittingLot] = useState(false);
  const [lotForm, setLotForm] = useState({
    supplier_name: '',
    phone: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    date: getSystemDate(),
    truckno: '',
    fruit: '',
    variety: '',
    boxes: '',
    damage_boxes: '0'
  });

  // Autocomplete for supplier inside popup
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [activeSupplierSuggestIdx, setActiveSupplierSuggestIdx] = useState(-1);
  const supplierInputRef = useRef(null);

  const handleSupplierNameInput = (val) => {
    setLotForm(prev => ({ ...prev, supplier_name: val }));
    if (!val || !val.trim()) {
      setSupplierSuggestions([]);
      setShowSupplierSuggestions(false);
      return;
    }
    const q = val.toLowerCase().trim();
    const pool = [];
    const seen = new Set();
    suppliers.forEach(s => {
      const name = s.supplier_name || s.name || '';
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        pool.push(s);
      }
    });
    supplierProfiles.forEach(p => {
      const name = p.supplier_name || '';
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        pool.push(p);
      }
    });
    const matched = pool.filter(s =>
      (s.supplier_name || s.name || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
    setSupplierSuggestions(matched);
    setShowSupplierSuggestions(matched.length > 0);
    setActiveSupplierSuggestIdx(-1);
  };

  const handleSelectSupplierSuggestion = (s) => {
    setLotForm(prev => ({
      ...prev,
      supplier_name: s.supplier_name || s.name || '',
      phone: s.phone || prev.phone || '',
      bank_name: s.bank_name || prev.bank_name || '',
      account_number: s.account_number || prev.account_number || '',
      ifsc_code: s.ifsc_code || prev.ifsc_code || '',
      branch_name: s.branch_name || prev.branch_name || '',
      truckno: s.truckno || prev.truckno || ''
    }));
    setShowSupplierSuggestions(false);
  };

  const handleOpenAddLotModal = () => {
    setLotForm({
      supplier_name: '',
      phone: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      date: selectedBoardDate || getSystemDate(),
      truckno: '',
      fruit: '',
      variety: '',
      boxes: '',
      damage_boxes: '0'
    });
    setShowSupplierSuggestions(false);
    setIsAddLotModalOpen(true);
    setTimeout(() => {
      if (supplierInputRef.current) {
        supplierInputRef.current.focus();
      }
    }, 150);
  };

  const handleSaveLotDelivery = async (e) => {
    if (e) e.preventDefault();
    const cleanName = lotForm.supplier_name.trim();
    if (!cleanName) {
      if (showToast) showToast('Please enter Supplier Name', 'error');
      return;
    }
    const cleanFruit = (lotForm.fruit || '').trim();
    if (!cleanFruit) {
      if (showToast) showToast('Please enter Fruit Name', 'error');
      return;
    }
    const totalBoxes = Number(lotForm.boxes);
    if (!totalBoxes || totalBoxes <= 0) {
      if (showToast) showToast('Please enter valid number of boxes', 'error');
      return;
    }
    const damageBoxes = Number(lotForm.damage_boxes) || 0;
    if (damageBoxes > totalBoxes) {
      if (showToast) showToast('Damage boxes cannot exceed total inward boxes!', 'error');
      return;
    }
    const balanceBoxes = Math.max(0, totalBoxes - damageBoxes);
    const finalTruckNo = (lotForm.truckno || '').trim().toUpperCase() || 'WB-1234';

    setIsSubmittingLot(true);
    try {
      // Find or create supplier
      const matchedSup = suppliers.find(s => (s.supplier_name || '').toLowerCase() === cleanName.toLowerCase());
      let supplierId = matchedSup?.id;
      if (!matchedSup) {
        try {
          const supPayload = {
            supplier_code: `SUP-${Date.now().toString().slice(-4)}`,
            supplier_name: cleanName,
            phone: (lotForm.phone || '').trim(),
            company_name: cleanName,
            bank_name: (lotForm.bank_name || '').trim(),
            account_number: (lotForm.account_number || '').trim(),
            ifsc_code: (lotForm.ifsc_code || '').trim(),
            branch_name: (lotForm.branch_name || '').trim(),
            status: 'ACTIVE'
          };
          const createdSup = await api.post('/suppliers/', supPayload).catch(() => null);
          if (createdSup?.id) {
            supplierId = createdSup.id;
            if (setSuppliers) setSuppliers(prev => [createdSup, ...prev]);
          }
        } catch { }
      }

      // Sync to purchases truck payments
      const lotPayload = {
        supplier: supplierId,
        supplier_name: cleanName,
        truck_number: finalTruckNo,
        payment_date: lotForm.date,
        fruit_name: cleanFruit,
        variety: (lotForm.variety || '').trim(),
        no_of_boxes: totalBoxes,
        pay: totalBoxes * 1000,
        rate_per_box: 1000,
        transport_charge: 0,
        loading_charge: 0,
        unloading_charge: 0,
        commission_charge: 0,
        discount: 0
      };
      await api.post('/purchases/truck-payments/', lotPayload).catch(() => null);

      const newLot = {
        id: Date.now(),
        supplier_name: cleanName,
        phone: (lotForm.phone || matchedSup?.phone || '').trim(),
        bank_name: (lotForm.bank_name || matchedSup?.bank_name || '').trim(),
        account_number: (lotForm.account_number || matchedSup?.account_number || '').trim(),
        ifsc_code: (lotForm.ifsc_code || matchedSup?.ifsc_code || '').trim(),
        branch_name: (lotForm.branch_name || matchedSup?.branch_name || '').trim(),
        truckno: finalTruckNo,
        date: lotForm.date || selectedBoardDate || getSystemDate(),
        fruit: cleanFruit,
        variety: (lotForm.variety || '').trim(),
        boxes: totalBoxes,
        damage_boxes: damageBoxes,
        balance_box: balanceBoxes
      };

      setSupplierProfiles(prev => [newLot, ...prev]);
      setSelectedLotId(newLot.id);
      setLotFilterMode('ACTIVE');

      if (saveFruitAndVariety) {
        saveFruitAndVariety(cleanFruit, lotForm.variety || '');
      }

      setIsAddLotModalOpen(false);
      if (showToast) {
        showToast(`Lot saved! ${cleanName} - ${cleanFruit}${lotForm.variety ? ` (${lotForm.variety.trim()})` : ''} (${balanceBoxes} Boxes)`, 'success');
      }
    } catch (err) {
      if (showToast) showToast('Error saving lot entry: ' + err.message, 'error');
    } finally {
      setIsSubmittingLot(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Delete Lot Handler
  // ---------------------------------------------------------------------------
  const handleDeleteLot = async (lot) => {
    if (!lot) return;
    if (window.confirm(`Are you sure you want to delete Lot for ${lot.supplier_name} (${lot.truckno})?`)) {
      // 0. Remove from backend database if registered
      try {
        if (lot.id && typeof lot.id === 'number' && lot.id < 1000000000000) {
          await api.delete(`/purchases/orders/${lot.id}/`).catch(() => null);
          await api.delete(`/purchases/truck-payments/${lot.id}/`).catch(() => null);
        }
        const matchedPO = (purchasesList || []).find(p =>
          p.id === lot.id ||
          (lot.truckno && (p.truck_number || '').trim().toUpperCase() === (lot.truckno || '').trim().toUpperCase())
        );
        if (matchedPO?.id && typeof matchedPO.id === 'number' && matchedPO.id < 1000000000000) {
          await api.delete(`/purchases/orders/${matchedPO.id}/`).catch(() => null);
          await api.delete(`/purchases/truck-payments/${matchedPO.id}/`).catch(() => null);
        }
      } catch {
        // ignore network error
      }

      // 1. Remove from supplierProfiles
      setSupplierProfiles(prev => {
        const updated = prev.filter(p => p.id !== lot.id);
        try { localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(updated)); } catch { }
        return updated;
      });

      // 2. Remove all sales associated with this deleted lot from truckSalesList
      const lotTruckNorm = (lot.truckno || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      setTruckSalesList(prev => {
        const updated = prev.filter(s => {
          if (s.lot_id && String(s.lot_id) === String(lot.id)) return false;
          if (lotTruckNorm && (s.truck_no || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === lotTruckNorm) return false;
          return true;
        });
        try { localStorage.setItem('mandi_truck_sales', JSON.stringify(updated)); } catch { }
        return updated;
      });

      // 3. Remove customer buy records associated with this lot
      if (setCustomerProfiles) {
        setCustomerProfiles(prev => {
          const updated = (prev || []).map(c => ({
            ...c,
            buy_history: (c.buy_history || []).filter(b => {
              if (b.lot_id && String(b.lot_id) === String(lot.id)) return false;
              if (lotTruckNorm && (b.truck_no || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === lotTruckNorm) return false;
              return true;
            })
          }));
          try { localStorage.setItem('mandi_customer_profiles', JSON.stringify(updated)); } catch { }
          return updated;
        });
      }

      if (selectedLotId === lot.id) {
        const remaining = supplierProfiles.filter(p => p.id !== lot.id);
        setSelectedLotId(remaining.length > 0 ? remaining[0].id : null);
      }
      if (showToast) showToast(`Lot for ${lot.supplier_name} deleted!`, 'info');
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Sales Entries for the Active Lot (History UPAR)
  // ---------------------------------------------------------------------------
  const activeLotSales = useMemo(() => {
    if (!activeLot) return [];
    return truckSalesList.filter(s => {
      if (s.lot_id) {
        return s.lot_id === activeLot.id;
      }
      const tNumMatch =
        s.truck_no && activeLot.truckno &&
        s.truck_no.trim().toUpperCase() === activeLot.truckno.trim().toUpperCase();
      const suppMatch =
        s.supplier_name && activeLot.supplier_name &&
        s.supplier_name.trim().toLowerCase() === activeLot.supplier_name.trim().toLowerCase();
      return tNumMatch && suppMatch;
    });
  }, [truckSalesList, activeLot]);

  const activeLotSoldBoxes = useMemo(() => {
    return activeLotSales.reduce((sum, s) => sum + Number(s.boxes || 0), 0);
  }, [activeLotSales]);

  const activeLotTotalBikri = useMemo(() => {
    return activeLotSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  }, [activeLotSales]);

  const liveNetBalanceBoxes = useMemo(() => {
    if (!activeLot) return 0;
    return Number(activeLot.balance_box || 0);
  }, [activeLot]);

  // ---------------------------------------------------------------------------
  // 6. New Sale Entry Form State (Form NICHE)
  // ---------------------------------------------------------------------------
  const [saleCustomerType, setSaleCustomerType] = useState('CASH'); // 'CASH' | 'NAME'
  const [saleForm, setSaleForm] = useState({
    customer_name: 'CASH SALE',
    phone: '',
    city: '',
    boxes: '',
    rate_per_box: '',
    total_amount: '',
    payment_mode: 'CASH',
    amount_paid: ''
  });
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [recentSavedSaleId, setRecentSavedSaleId] = useState(null);

  // Customer Autocomplete inside inline sale form
  const [saleCustSuggestions, setSaleCustSuggestions] = useState([]);
  const [showSaleCustSuggestions, setShowSaleCustSuggestions] = useState(false);
  const [activeSaleCustIdx, setActiveSaleCustIdx] = useState(-1);
  const saleCustInputRef = useRef(null);
  const saleBoxesInputRef = useRef(null);
  const saleRateInputRef = useRef(null);

  // Switch between CASH SALE and Party Name
  const handleToggleCustomerType = (type) => {
    setSaleCustomerType(type);
    if (type === 'CASH') {
      setSaleForm(prev => ({
        ...prev,
        customer_name: 'CASH SALE',
        phone: '',
        payment_mode: 'CASH'
      }));
      setShowSaleCustSuggestions(false);
    } else {
      setSaleForm(prev => ({
        ...prev,
        customer_name: '',
        payment_mode: 'CREDIT'
      }));
      setTimeout(() => {
        if (saleCustInputRef.current) saleCustInputRef.current.focus();
      }, 80);
    }
  };

  const handleSaleCustomerChange = (val) => {
    setSaleForm(prev => ({ ...prev, customer_name: val }));
    if (!val || !val.trim()) {
      setSaleCustSuggestions([]);
      setShowSaleCustSuggestions(false);
      return;
    }
    const q = val.toLowerCase().trim();
    const matched = customerProfiles.filter(c =>
      (c.customer_name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
    setSaleCustSuggestions(matched);
    setShowSaleCustSuggestions(matched.length > 0);
    setActiveSaleCustIdx(-1);
  };

  const handleSelectSaleCustomer = (c) => {
    setSaleForm(prev => ({
      ...prev,
      customer_name: c.customer_name,
      phone: c.phone || '',
      city: c.city || ''
    }));
    setShowSaleCustSuggestions(false);
    if (saleBoxesInputRef.current) {
      saleBoxesInputRef.current.focus();
    }
  };

  // Live Auto-Calculation between Boxes, Rate, and Total Amount
  const handleSaleBoxesChange = (val) => {
    const boxesNum = Number(val) || 0;
    const rateNum = Number(saleForm.rate_per_box) || 0;
    const computedTotal = boxesNum > 0 && rateNum > 0 ? (boxesNum * rateNum).toString() : saleForm.total_amount;
    setSaleForm(prev => ({
      ...prev,
      boxes: val,
      total_amount: computedTotal
    }));
  };

  const handleSaleRateChange = (val) => {
    const rateNum = Number(val) || 0;
    const boxesNum = Number(saleForm.boxes) || 0;
    const computedTotal = boxesNum > 0 && rateNum > 0 ? (boxesNum * rateNum).toString() : saleForm.total_amount;
    setSaleForm(prev => ({
      ...prev,
      rate_per_box: val,
      total_amount: computedTotal
    }));
  };

  const handleSaleTotalChange = (val) => {
    const totalNum = Number(val) || 0;
    const boxesNum = Number(saleForm.boxes) || 0;
    let computedRate = saleForm.rate_per_box;
    if (boxesNum > 0 && totalNum > 0) {
      computedRate = (totalNum / boxesNum).toFixed(2).replace(/\.00$/, '');
    }
    setSaleForm(prev => ({
      ...prev,
      total_amount: val,
      rate_per_box: computedRate
    }));
  };

  // ---------------------------------------------------------------------------
  // 7. Save Sale Entry (Moves entry to history UPAR, keeps form NICHE)
  // ---------------------------------------------------------------------------
  const handleSaveSaleEntry = async (e) => {
    if (e) e.preventDefault();
    if (!activeLot) {
      if (showToast) showToast('Please select a lot first', 'error');
      return;
    }

    const cleanCustName = (saleForm.customer_name || '').trim();
    if (!cleanCustName) {
      if (showToast) showToast('Please enter Customer / Party Name', 'error');
      return;
    }

    const boxesToSell = Number(saleForm.boxes);
    if (!boxesToSell || boxesToSell <= 0) {
      if (showToast) showToast('Please enter valid number of boxes', 'error');
      return;
    }

    const availBoxes = Number(activeLot.balance_box || 0);
    if (boxesToSell > availBoxes) {
      if (showToast) showToast(`Cannot sell ${boxesToSell} boxes. Only ${availBoxes} balance boxes available in this lot!`, 'error');
      return;
    }

    let rate = Number(saleForm.rate_per_box);
    const totalAmt = Number(saleForm.total_amount);
    if ((!rate || rate <= 0) && totalAmt > 0 && boxesToSell > 0) {
      rate = parseFloat((totalAmt / boxesToSell).toFixed(2));
    }
    if (!rate || rate <= 0) {
      if (showToast) showToast('Please enter valid Rate/Box or Total Amount', 'error');
      return;
    }

    const finalTotal = boxesToSell * rate;
    const paidAmount = saleForm.payment_mode === 'CASH'
      ? (saleForm.amount_paid !== '' ? Number(saleForm.amount_paid) : finalTotal)
      : (Number(saleForm.amount_paid) || 0);
    const unpaidAmount = Math.max(0, finalTotal - paidAmount);

    setIsSubmittingSale(true);
    try {
      // 1. Deduct boxes from activeLot
      const remainingBoxes = Math.max(0, availBoxes - boxesToSell);
      setSupplierProfiles(prev => prev.map(p => {
        if (p.id === activeLot.id) {
          return { ...p, balance_box: remainingBoxes };
        }
        return p;
      }));

      // 2. Create Sale Record
      const newSaleId = Date.now();
      const newSale = {
        id: newSaleId,
        lot_id: activeLot.id,
        selling_date: selectedBoardDate || getSystemDate(),
        customer_name: cleanCustName,
        customer_phone: saleForm.phone || '',
        truck_no: (activeLot.truckno || '').trim().toUpperCase(),
        supplier_name: (activeLot.supplier_name || '').trim(),
        product_name: `${activeLot.fruit || ''} ${activeLot.variety || ''}`.trim() || 'Produce',
        boxes: boxesToSell,
        rate_per_box: rate,
        total: finalTotal,
        payment_mode: saleForm.payment_mode,
        amount_paid: paidAmount,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // Put at top of truckSalesList
      setTruckSalesList(prev => [newSale, ...prev]);

      // Highlight this newly added sale in history
      setRecentSavedSaleId(newSaleId);
      setTimeout(() => setRecentSavedSaleId(null), 3000);

      // 3. Update or create Customer Profile if named customer
      if (cleanCustName !== 'CASH SALE') {
        const newBuyRecord = {
          id: newSaleId,
          date: selectedBoardDate || getSystemDate(),
          product_name: `${activeLot.fruit || ''} ${activeLot.variety || ''}`.trim(),
          truck_no: activeLot.truckno,
          supplier_name: activeLot.supplier_name,
          boxes: boxesToSell,
          rate_per_box: rate,
          total: finalTotal,
          payment_mode: saleForm.payment_mode,
          amount_paid: paidAmount
        };

        let newPaymentRecord = null;
        if (paidAmount > 0) {
          newPaymentRecord = {
            id: newSaleId + 1,
            date: selectedBoardDate || getSystemDate(),
            amount: paidAmount,
            payment_method: saleForm.payment_mode,
            reference: `LOT-${activeLot.truckno}`,
            notes: `Immediate payment for ${boxesToSell} BX ${activeLot.fruit}`
          };
        }

        setCustomerProfiles(prev => {
          const idx = prev.findIndex(c => (c.customer_name || '').toLowerCase() === cleanCustName.toLowerCase());
          if (idx >= 0) {
            const existing = prev[idx];
            const updated = {
              ...existing,
              phone: saleForm.phone || existing.phone,
              city: saleForm.city || existing.city,
              total_boxes: Number(existing.total_boxes || 0) + boxesToSell,
              total_bought: Number(existing.total_bought || 0) + finalTotal,
              total_paid: Number(existing.total_paid || 0) + paidAmount,
              current_balance: Number(existing.current_balance || 0) + unpaidAmount,
              buy_history: [newBuyRecord, ...(existing.buy_history || [])],
              payment_history: newPaymentRecord ? [newPaymentRecord, ...(existing.payment_history || [])] : (existing.payment_history || [])
            };
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          } else {
            const newCust = {
              id: Date.now() + 2,
              customer_name: cleanCustName,
              phone: (saleForm.phone || '').trim(),
              city: (saleForm.city || '').trim(),
              current_balance: unpaidAmount,
              total_bought: finalTotal,
              total_paid: paidAmount,
              total_boxes: boxesToSell,
              status: 'ACTIVE',
              buy_history: [newBuyRecord],
              payment_history: newPaymentRecord ? [newPaymentRecord] : []
            };
            return [newCust, ...prev];
          }
        });
      }

      // 4. Persist to Backend MySQL
      try {
        await api.post('/sales/orders/', {
          customer_name: cleanCustName,
          phone: saleForm.phone || '',
          city: saleForm.city || '',
          order_date: selectedBoardDate || getSystemDate(),
          truck_number: (activeLot.truckno || '').trim().toUpperCase(),
          crates_sold: boxesToSell,
          rate_per_crate: rate,
          gross_amount: finalTotal,
          subtotal: finalTotal,
          grand_total: finalTotal,
          paid_amount: paidAmount,
          payment_terms: saleForm.payment_mode === 'CASH' ? 'CASH' : 'CREDIT',
          product_name: activeLot.fruit || 'Fruit',
          status: 'DISPATCHED'
        });
        window.dispatchEvent(new CustomEvent('erp:refresh-data'));
      } catch (apiErr) {
        console.warn('Backend sale sync note:', apiErr.message);
      }

      // 5. Reset Form NICHE and auto-focus for immediate next entry!
      setSaleForm(prev => ({
        ...prev,
        boxes: '',
        rate_per_box: '',
        total_amount: '',
        amount_paid: '',
        // If cash sale, keep cash sale, otherwise keep party name or reset
        customer_name: saleCustomerType === 'CASH' ? 'CASH SALE' : '',
        phone: saleCustomerType === 'CASH' ? '' : prev.phone
      }));

      if (showToast) {
        showToast(`✓ Bikri saved! ${cleanCustName} - ${boxesToSell} BX @ ₹${rate} (= ₹${finalTotal.toLocaleString()}). Added to history above!`, 'success');
      }

      // Set focus back to input for rapid typing!
      setTimeout(() => {
        if (saleCustomerType === 'CASH') {
          if (saleBoxesInputRef.current) saleBoxesInputRef.current.focus();
        } else {
          if (saleCustInputRef.current) saleCustInputRef.current.focus();
        }
      }, 100);

    } catch (err) {
      if (showToast) showToast('Error saving sale: ' + err.message, 'error');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 8. Delete Single Sale Entry from History
  // ---------------------------------------------------------------------------
  const handleDeleteSaleEntry = async (sale) => {
    if (!sale) return;
    if (window.confirm(`Delete sale entry for ${sale.customer_name} (${sale.boxes} BX)? ${sale.boxes} boxes will be refunded back to this lot balance.`)) {
      // 0. Remove from backend database if registered
      try {
        if (sale.id && typeof sale.id === 'number' && sale.id < 1000000000000) {
          await api.delete(`/sales/orders/${sale.id}/`).catch(() => null);
        }
        const matchedSale = (salesList || []).find(s =>
          s.id === sale.id ||
          (sale.order_no && s.order_no === sale.order_no) ||
          (sale.invoice_no && s.invoice?.invoice_no === sale.invoice_no)
        );
        if (matchedSale?.id && typeof matchedSale.id === 'number' && matchedSale.id < 1000000000000) {
          await api.delete(`/sales/orders/${matchedSale.id}/`).catch(() => null);
        }
      } catch {
        // ignore network error
      }

      // 1. Refund boxes to lot
      setSupplierProfiles(prev => prev.map(p => {
        if (p.id === activeLot.id) {
          return { ...p, balance_box: Number(p.balance_box || 0) + Number(sale.boxes || 0) };
        }
        return p;
      }));

      // 2. Remove from sales list
      setTruckSalesList(prev => prev.filter(s => s.id !== sale.id));

      // 3. Adjust customer balance if named customer
      if (sale.customer_name && sale.customer_name !== 'CASH SALE') {
        setCustomerProfiles(prev => prev.map(c => {
          if ((c.customer_name || '').toLowerCase() === sale.customer_name.toLowerCase()) {
            return {
              ...c,
              total_boxes: Math.max(0, Number(c.total_boxes || 0) - Number(sale.boxes || 0)),
              total_bought: Math.max(0, Number(c.total_bought || 0) - Number(sale.total || 0)),
              current_balance: Math.max(0, Number(c.current_balance || 0) - Number(sale.total || 0)),
              buy_history: (c.buy_history || []).filter(b => b.id !== sale.id)
            };
          }
          return c;
        }));
      }

      if (showToast) showToast(`Sale deleted and ${sale.boxes} boxes refunded to lot balance!`, 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // 8b. Clear All Daily Sales Data (Cash Sell, Udhaar, Total)
  // ---------------------------------------------------------------------------
  const handleClearAllSales = async () => {
    if (window.confirm('Kya aap Cash Sell, Udhaar aur Total me jitna bhi price / sales data hai usko poori tarah delete karna chahte hain?')) {
      // 0. Clear backend sales orders from database
      try {
        await api.delete('/sales/orders/clear-all/').catch(() => null);
      } catch { }

      // 1. Clear truckSalesList
      setTruckSalesList([]);
      try {
        localStorage.removeItem('mandi_truck_sales');
        localStorage.setItem('mandi_truck_sales', '[]');
      } catch { }

      // 2. Clear customer buy & payment histories and khata balances
      setCustomerProfiles(prev => {
        const cleaned = (prev || []).map(c => ({
          ...c,
          total_boxes: 0,
          total_bought: 0,
          total_paid: 0,
          current_balance: 0,
          khata_balance: 0,
          total_pending: 0,
          buy_history: [],
          payment_history: []
        }));
        try {
          localStorage.setItem('mandi_customer_profiles', JSON.stringify(cleaned));
        } catch { }
        return cleaned;
      });

      // 3. Restore lot balance boxes so no phantom sales remain
      setSupplierProfiles(prev => {
        const restored = (prev || []).map(p => ({
          ...p,
          balance_box: Number(p.boxes || p.total_boxes || p.balance_box || 0)
        }));
        try {
          localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(restored));
        } catch { }
        return restored;
      });

      if (showToast) showToast('Cash Sell, Udhaar aur Total ka saara data poori tarah delete kar diya gaya! 🗑️', 'info');
    }
  };



  if (showCashSellPage) {
    return (
      <CashSellHistoryView
        truckSalesList={truckSalesList}
        customerProfiles={customerProfiles}
        salesList={salesList}
        supplierProfiles={supplierProfiles}
        suppliers={suppliers}
        purchasesList={purchasesList}
        selectedBoardDate={selectedBoardDate}
        onBack={() => setShowCashSellPage(false)}
        formatDisplayDate={formatDisplayDate}
        getSystemDate={getSystemDate}
        showToast={showToast}
      />
    );
  }

  if (showUdhaarPage) {
    return (
      <UdhaarHistoryView
        truckSalesList={truckSalesList}
        customerProfiles={customerProfiles}
        salesList={salesList}
        supplierProfiles={supplierProfiles}
        suppliers={suppliers}
        purchasesList={purchasesList}
        selectedBoardDate={selectedBoardDate}
        onBack={() => setShowUdhaarPage(false)}
        formatDisplayDate={formatDisplayDate}
        getSystemDate={getSystemDate}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="board-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ----------------------------------------------------------------- */}
      {/* TOP HEADER: BOARD [PAGE] | WEDNESDAY | DATE                       */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="board-top-header"
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          padding: '16px 22px',
          border: '1.5px solid var(--border-subtle, #e2e8f0)',
          boxShadow: 'var(--shadow-md, 0 4px 14px rgba(0, 0, 0, 0.05))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Left Column: Title, Subtitle, and Action Buttons */}
        <div className="board-header-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '1.25rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              ①
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main, #0f172a)', letterSpacing: '0.04em' }}>
                  BOARD <span style={{ color: '#10b981', fontWeight: 800 }}>[PAGE]</span>
                </h1>
                {/* DAY CAPSULE */}
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1.5px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '8px',
                    padding: '3px 10px',
                    color: '#059669',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Calendar size={13} color="#059669" />
                  <span>{dayOfWeekName}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #64748b)', marginTop: '3px' }}>
                Mandi Daily Lot Delivery & Rapid Bikri Parchi Board
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                border: 'none',
                padding: '7px 13px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Users size={14} />
              <span>Customers & Khata</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSupplierTrucksModalOpen(true)}
              style={{
                background: 'var(--bg-main, #f8fafc)',
                color: 'var(--text-main, #0f172a)',
                border: '1.5px solid var(--border-subtle, #e2e8f0)',
                padding: '7px 13px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Truck size={14} color="var(--text-secondary, #64748b)" />
              <span>Supplier Passbooks</span>
            </button>
          </div>
        </div>

        {/* Right Column: Date Switcher + Directly Under Date Part: Daily Date-Wise Cash & Udhaar Amounts */}
        <div className="board-header-right-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {/* Top: Date Selector & Switcher */}
          <div
            className="board-date-switcher"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-main, #f8fafc)',
              padding: '5px 10px',
              borderRadius: '12px',
              border: '1.5px solid var(--border-subtle, #e2e8f0)'
            }}
          >
            <button
              type="button"
              onClick={handlePrevDay}
              className="btn btn-sm"
              title="Previous Day"
              style={{
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                color: 'var(--text-main, #0f172a)',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>DATE:</span>
              <input
                type="date"
                value={selectedBoardDate}
                onChange={(e) => setSelectedBoardDate(e.target.value)}
                style={{
                  background: 'var(--bg-surface, #ffffff)',
                  border: '1.5px solid var(--border-light, #cbd5e1)',
                  color: 'var(--text-main, #0f172a)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="btn btn-sm"
              title="Next Day"
              style={{
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                color: 'var(--text-main, #0f172a)',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              Today
            </button>
          </div>

          {/* Under Date Part: Daily Date-Wise Cash Sell & Udhaar Amounts */}
          <div
            className="board-under-date-strip"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end'
            }}
          >
            {/* CASH SELL (ROKDA) */}
            <div
              className="board-sales-pill pill-cash"
              title="Click to view full Cash Sell History (Rokda Bikri Byora)"
              onClick={handleOpenCashSellHistory}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1.5px solid rgba(16, 185, 129, 0.35)',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#059669',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1.5px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.22)';
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(16, 185, 129, 0.08)';
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
              }}
            >
              <Banknote size={14} color="#059669" />
              <span style={{ color: '#047857', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Cash Sell:</span>
              <span className="board-pill-value" style={{ color: '#065f46', fontWeight: 900, fontSize: '0.85rem' }}>
                ₹{dailyDateSalesMetrics.totalCashAmount.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#059669', marginLeft: '2px', fontWeight: 800 }}>↗</span>
            </div>

            {/* UDHAAR (KHATA) */}
            <div
              className="board-sales-pill pill-udhaar"
              title="Click to view full Udhaar History (Khata Bikri Byora)"
              onClick={handleOpenUdhaarHistory}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#dc2626',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1.5px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.22)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              }}
            >
              <BookOpen size={14} color="#dc2626" />
              <span style={{ color: '#b91c1c', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Udhaar:</span>
              <span className="board-pill-value" style={{ color: '#991b1b', fontWeight: 900, fontSize: '0.85rem' }}>
                ₹{dailyDateSalesMetrics.totalKhataAmount.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#dc2626', marginLeft: '2px', fontWeight: 800 }}>↗</span>
            </div>

            {/* TOTAL DAY BIKRI */}
            <div
              className="board-sales-pill pill-total"
              title={`Total Sales (Cash + Udhaar) on ${formatDisplayDate(selectedBoardDate)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1.5px solid rgba(59, 130, 246, 0.3)',
                padding: '5px 11px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#2563eb',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.08)'
              }}
            >
              <TrendingUp size={14} color="#2563eb" />
              <span style={{ color: '#1d4ed8', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total:</span>
              <span className="board-pill-value" style={{ color: '#1e40af', fontWeight: 900, fontSize: '0.85rem' }}>
                ₹{dailyDateSalesMetrics.totalDayBikri.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* HORIZONTAL ROW OF LOT CARDS + PLUS CARD                           */}
      {/* (Clicking ANY lot card opens its details & Bikri Parchi below)     */}
      {/* ----------------------------------------------------------------- */}
      {/* ----------------------------------------------------------------- */}
      {/* DAILY INWARD LOTS SECTION: RESPONSIVE HEADER & 2-COLUMN GRID      */}
      {/* ----------------------------------------------------------------- */}
      <div className="board-inward-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="board-inward-header">
          {/* Title & Hint */}
          <div className="board-inward-title-group">
            <div className="board-inward-title">
              <span className="board-inward-icon">{lotFilterMode === 'COMPLETED' ? '✅' : '📦'}</span>
              <span className="board-inward-heading">
                {lotFilterMode === 'COMPLETED' ? 'Completed Lots:' : 'Daily Inward Lots:'}
              </span>
              <span
                className="board-inward-count-badge"
                style={{
                  background: lotFilterMode === 'COMPLETED' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined
                }}
              >
                {filteredLots.length}
              </span>
            </div>
          </div>

          {/* Search & Mode Switch Button */}
          <div className="board-inward-controls">
            <div className="board-inward-search-box">
              <input
                type="text"
                placeholder={lotFilterMode === 'COMPLETED' ? "Search completed lot..." : "Search lot..."}
                value={boardSearchQuery}
                onChange={(e) => setBoardSearchQuery(e.target.value)}
                className="board-inward-search-input"
              />
              <Search size={14} color="#94a3b8" className="board-inward-search-icon" />
            </div>

            <button
              type="button"
              id="btn-lot-filter-mode"
              className={`board-inward-filter-btn ${lotFilterMode === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setLotFilterMode(prev => prev === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE')}
              title={lotFilterMode === 'COMPLETED' ? "Click to view active inward lots" : "Click to view completed lots (0 balance trucks)"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {lotFilterMode === 'COMPLETED' ? (
                <>
                  <span>📦 Active Lots</span>
                  {activeLotsCount > 0 && (
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      {activeLotsCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span>✅ Complete</span>
                  {completedLotsCount > 0 && (
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      {completedLotsCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* The Row of Divs: Responsive Grid across Mobile, Tablets, iPads & Desktop */}
        <div className="board-lots-row">
          {/* Empty state for Completed Lots */}
          {filteredLots.length === 0 && lotFilterMode === 'COMPLETED' && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '28px 16px',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                borderRadius: '14px',
                border: '1.5px dashed var(--border-subtle)',
                color: 'var(--text-secondary)'
              }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>🏁</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>Koi Completed Lot Nahi Hai</div>
              <div style={{ fontSize: '0.76rem', marginTop: '4px' }}>
                Jab kisi truck lot ka balance 0 boxes ho jaayega, wo automatic yahan dikhega.
              </div>
            </div>
          )}
          {/* Each Lot Div Card */}
          {filteredLots.map((lot) => {
            const isSelected = activeLot && activeLot.id === lot.id;
            const bal = Number(lot.balance_box || 0);
            const isZeroBal = bal <= 0;

            return (
              <div
                key={lot.id}
                onClick={() => setSelectedLotId(lot.id)}
                className={`board-lot-card ${isSelected ? 'active' : ''}`}
                style={{
                  minHeight: '115px',
                  borderRadius: '14px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isSelected
                    ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, var(--bg-surface) 100%)'
                    : 'var(--bg-surface)',
                  border: isSelected
                    ? '2.5px solid #10b981'
                    : isZeroBal
                      ? '1.5px solid var(--border-subtle)'
                      : '1.5px solid var(--border-subtle)',
                  boxShadow: isSelected
                    ? '0 8px 20px rgba(16, 185, 129, 0.25)'
                    : '0 2px 6px rgba(0, 0, 0, 0.04)',
                  transform: isSelected ? 'translateY(-2px)' : 'none'
                }}
                title={`Click to open ${lot.supplier_name} - ${lot.fruit}`}
              >
                {/* Card Top: Supplier Name */}
                <div>
                  <div
                    className="board-lot-card-title"
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 900,
                      color: isSelected ? '#10b981' : 'var(--text-main)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {lot.supplier_name}
                  </div>

                  {/* Card Middle: Fruit & Variety (e.g. APPLE MB) */}
                  <div
                    className="board-lot-card-fruit"
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <span>🍎</span>
                    <span>
                      {lot.fruit || 'Fruit'} {lot.variety ? lot.variety.trim() : ''}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Total Boxes & Balance */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px' }}>
                    <span className="board-lot-card-boxes" style={{ fontSize: '1.05rem', fontWeight: 900, color: isZeroBal ? '#64748b' : '#10b981' }}>
                      {lot.boxes} CB
                    </span>
                    {bal !== Number(lot.boxes) && (
                      <span className="board-lot-card-bal" style={{ fontSize: '0.74rem', color: isZeroBal ? '#ef4444' : '#059669', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {isZeroBal ? '0 BAL' : `${bal} Bal`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Downward Arrow for Active Selected Lot */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#10b981',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
                      zIndex: 10
                    }}
                  >
                    <ArrowDown size={13} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}

          {/* THE PLUS [ + ] DIV - ONLY IN ACTIVE LOTS MODE */}
          {lotFilterMode !== 'COMPLETED' && (
            <div
              onClick={handleOpenAddLotModal}
              className="board-add-lot-card"
              style={{
                minHeight: '115px',
                borderRadius: '14px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: '2px dashed #10b981',
                background: 'rgba(16, 185, 129, 0.04)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                e.currentTarget.style.borderColor = '#059669';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.04)';
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.transform = 'none';
              }}
              title="Click to add new Lot Delivery Entry"
            >
              <div
                className="board-add-lot-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Plus size={22} strokeWidth={3} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="board-add-lot-title" style={{ fontSize: '0.86rem', fontWeight: 800, color: '#10b981' }}>+ Add Lot</div>
                <div className="board-add-lot-sub" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Delivery Entry</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* LOT DETAILS SUMMARY BAR (Directly Underneath Selected Lot Div)    */}
      {/* Matches user sketch: Left: PIYUSH-APPLE, WB-1234, 1200, DAMAGE     */}
      {/*                     Right: Grade B-Depo, S - 25, N - 15, Dlt     */}
      {/* ----------------------------------------------------------------- */}
      {activeLot ? (
        <div
          className="board-lot-summary-bar"
          style={{
            background: 'var(--bg-surface)',
            border: '2px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '14px',
            padding: '12px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            position: 'relative'
          }}
        >
          {/* Top Row: Title, Truck Badge on Left & Delete Button on Top Right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', flex: 1, minWidth: 0 }}>
              <span className="board-lot-summary-title" style={{ fontSize: '1.18rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.01em', lineHeight: '1.2' }}>
                {activeLot.supplier_name} — {activeLot.fruit} {activeLot.variety ? `(${activeLot.variety})` : ''}
              </span>
              <span
                style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#2563eb',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2'
                }}
              >
                🚚 {activeLot.truckno}
              </span>
              {Number(activeLot.balance_box || 0) <= 0 && (
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}
                >
                  ✅ COMPLETED (0 BAL)
                </span>
              )}
            </div>

            {/* Dlt [Trash Icon] Button - Positioned at Top Right */}
            <button
              type="button"
              className="board-lot-dlt-btn"
              onClick={() => handleDeleteLot(activeLot)}
              title="Delete this lot"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                height: '24px',
                minHeight: '24px',
                maxHeight: '24px',
                padding: '0 8px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.72rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                alignSelf: 'center',
                lineHeight: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
              }}
            >
              <Trash2 size={11} />
              <span>Dlt</span>
            </button>
          </div>

          {/* Bottom Row: Metadata on Left & Stats Pills (Grade, S, N) on Right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
            {/* Metadata (Total Inward, Damage, Date, Phone) */}
            <div className="board-lot-summary-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px', fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.2' }}>
              <span style={{ whiteSpace: 'nowrap' }}>
                Total Inward: <strong style={{ color: 'var(--text-main)' }}>{activeLot.boxes} Boxes</strong>
              </span>
              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>•</span>
              <span style={{ whiteSpace: 'nowrap', color: Number(activeLot.damage_boxes) > 0 ? '#ef4444' : 'var(--text-secondary)', fontWeight: 700 }}>
                Damage: {activeLot.damage_boxes || 0}
              </span>
              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>•</span>
              <span style={{ whiteSpace: 'nowrap' }}>
                Date: {formatDisplayDate(activeLot.date)}
              </span>
              {activeLot.phone && (
                <>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>•</span>
                  <span style={{ whiteSpace: 'nowrap' }}>📞 {activeLot.phone}</span>
                </>
              )}
            </div>

            {/* Stats Badges: Grade, S, N */}
            <div className="board-lot-summary-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Grade */}
              <div
                className="board-lot-summary-pill"
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2'
                }}
              >
                <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Grade / Variety: </span>
                <strong style={{ color: 'var(--text-main)' }}>{activeLot.variety || '-'}</strong>
              </div>

              {/* S - Sold */}
              <div
                className="board-lot-summary-pill"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#2563eb',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2'
                }}
              >
                S – {activeLotSoldBoxes} BX
              </div>

              {/* N - Net Balance */}
              <div
                className="board-lot-summary-pill"
                style={{
                  background: liveNetBalanceBoxes <= 0 ? 'rgba(100, 116, 139, 0.1)' : 'rgba(16, 185, 129, 0.12)',
                  border: liveNetBalanceBoxes <= 0 ? '1px solid rgba(100, 116, 139, 0.3)' : '1.5px solid #10b981',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  color: liveNetBalanceBoxes <= 0 ? '#64748b' : '#059669',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2'
                }}
              >
                N – {liveNetBalanceBoxes} BX
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            padding: '30px 20px',
            textAlign: 'center',
            border: '1px dashed var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}
        >
          <Package size={36} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block', opacity: 0.6 }} />
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
            No Lot Selected
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
            Upar diye gaye kisi bhi div card ko click karein ya naya lot add karne ke liye <strong>+ Add Lot</strong> dabayein.
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* BIKRI PARCHI SECTION: HISTORY UPAR (Top), FORM NICHE (Bottom)     */}
      {/* "save karenge to entery history upar aa jaayega form input niche" */}
      {/* ----------------------------------------------------------------- */}
      {activeLot && (
        <div
          className="board-bikri-container"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '0'
          }}
        >
          {/* ============================================================= */}
          {/* PART 1: ENTRY HISTORY (UPAR / TOP)                            */}
          {/* ============================================================= */}
          <div style={{ padding: '18px 22px', borderBottom: liveNetBalanceBoxes > 0 ? '1.5px solid var(--border-subtle)' : 'none', background: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  📜 Bikri Parchi History
                </span>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {activeLotSales.length} Entries
                </span>
              </div>

              {activeLotSales.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Total Sold: <strong style={{ color: '#2563eb' }}>{activeLotSoldBoxes} Boxes</strong>
                  </span>
                  <span>•</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Total Collection: <strong style={{ color: '#10b981' }}>₹{activeLotTotalBikri.toLocaleString()}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* List of Sales Entries (UPAR) */}
            {activeLotSales.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📝</div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Abhi tak is lot se koi Bikri Entry nahi hui hai
                </div>
                <div style={{ fontSize: '0.78rem', marginTop: '3px', color: '#10b981', fontWeight: 600 }}>
                  Niche diye gaye form me Party Name, Boxes aur Rate enter karke save karein 👇
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {activeLotSales.map((sale) => {
                  const isRecent = recentSavedSaleId === sale.id;

                  return (
                    <div
                      key={sale.id}
                      style={{
                        background: isRecent ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface, #ffffff)',
                        border: isRecent ? '1.5px solid #10b981' : '1px solid var(--border-subtle, #e2e8f0)',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'all 0.25s ease',
                        boxShadow: isRecent ? '0 4px 14px rgba(16, 185, 129, 0.18)' : '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Row 1: Customer Name on Left & Compact Delete Button on Right */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            color: 'var(--text-main, #0f172a)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            lineHeight: '1.1'
                          }}
                        >
                          {sale.customer_name}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSaleEntry(sale)}
                          title="Delete this sale entry (refunds boxes to lot)"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.22)',
                            color: '#ef4444',
                            width: '18px',
                            height: '18px',
                            minHeight: '18px',
                            maxHeight: '18px',
                            minWidth: '18px',
                            maxWidth: '18px',
                            padding: 0,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            alignSelf: 'center',
                            transition: 'all 0.15s ease',
                            lineHeight: 1
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
                          <Trash2 size={10} />
                        </button>
                      </div>

                      {/* Row 2 (Name ke niche): Mode of Payment Badge + Payment Amount */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '8px',
                            background: sale.payment_mode === 'CASH' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.14)',
                            color: sale.payment_mode === 'CASH' ? '#047857' : '#b45309',
                            border: sale.payment_mode === 'CASH' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.35)',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            lineHeight: '1.1'
                          }}
                        >
                          {sale.payment_mode === 'CASH' ? 'ROKDA (CASH)' : 'KHATA (UDHAAR)'}
                        </span>

                        <span
                          style={{
                            fontSize: '0.94rem',
                            fontWeight: 900,
                            color: '#10b981',
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.1'
                          }}
                        >
                          ₹{Number(sale.total).toLocaleString()}
                        </span>
                      </div>

                      {/* Row 3: Date on Left & Boxes × Rate Breakdown on Right */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary, #64748b)', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                          <span>📅</span>
                          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDisplayDate(sale.selling_date)}</span>
                        </div>

                        {/* Math Breakdown: 10 BX × ₹980 */}
                        <div
                          style={{
                            background: 'var(--bg-main, #f8fafc)',
                            border: '1px solid var(--border-subtle, #e2e8f0)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: 'var(--text-secondary, #475569)',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.1'
                          }}
                        >
                          <span style={{ color: '#2563eb', fontWeight: 800 }}>{sale.boxes} BX</span>
                          <span style={{ margin: '0 3px', color: 'var(--text-muted, #94a3b8)' }}>×</span>
                          <span>₹{Number(sale.rate_per_box).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* PART 2: NEW SALE ENTRY FORM (NICHE / BOTTOM)                  */}
          {/* "form input niche phir data input kar ke save karenge phir o" */}
          {/* Truck lot balance 0 hone par New Sale Entry form hide rahega */}
          {/* ============================================================= */}
          {liveNetBalanceBoxes > 0 && (
            <form
              onSubmit={handleSaveSaleEntry}
              className="board-bikri-form"
              style={{
                padding: '12px 16px',
                background: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.94rem', fontWeight: 900, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                    ➕ New Sale Entry (Bikri Parchi)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                    Bal: {liveNetBalanceBoxes} Boxes
                  </span>
                </div>

                {/* Quick Party Mode Toggle: Cash Sale vs Name */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'var(--bg-main)',
                    padding: '2px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    gap: '2px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleCustomerType('CASH')}
                    style={{
                      height: '24px',
                      minHeight: '24px',
                      maxHeight: '24px',
                      padding: '0 8px',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: saleCustomerType === 'CASH' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                      color: saleCustomerType === 'CASH' ? '#fff' : 'var(--text-secondary)',
                      boxShadow: saleCustomerType === 'CASH' ? '0 1px 4px rgba(16, 185, 129, 0.25)' : 'none',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1
                    }}
                  >
                    💵 Cash Sale (Rokda)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCustomerType('NAME')}
                    style={{
                      height: '24px',
                      minHeight: '24px',
                      maxHeight: '24px',
                      padding: '0 8px',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: saleCustomerType === 'NAME' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                      color: saleCustomerType === 'NAME' ? '#fff' : 'var(--text-secondary)',
                      boxShadow: saleCustomerType === 'NAME' ? '0 1px 4px rgba(59, 130, 246, 0.25)' : 'none',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1
                    }}
                  >
                    👤 Customer / Khata (Name)
                  </button>
                </div>
              </div>

              {/* Input Row: Customer Name, Boxes, Rate, Total Amount, Payment, Save */}
              <div className="board-bikri-form-grid">
                {/* Field 1: Customer / Party Name */}
                <div className="board-bikri-field-name" style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', lineHeight: 1.2 }}>
                    {saleCustomerType === 'CASH' ? 'Party / Sale Type' : 'Customer Name *'}
                  </label>
                  {saleCustomerType === 'CASH' ? (
                    <input
                      type="text"
                      value={saleForm.customer_name}
                      readOnly
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1.5px solid #10b981',
                        background: 'rgba(16, 185, 129, 0.08)',
                        fontWeight: 800,
                        color: '#059669',
                        fontSize: '0.84rem'
                      }}
                    />
                  ) : (
                    <div>
                      <input
                        ref={saleCustInputRef}
                        type="text"
                        placeholder="e.g. TIYASHA / Sharmaji"
                        value={saleForm.customer_name}
                        onChange={(e) => handleSaleCustomerChange(e.target.value)}
                        onFocus={() => saleForm.customer_name && handleSaleCustomerChange(saleForm.customer_name)}
                        required
                        autoComplete="off"
                        style={{
                          width: '100%',
                          height: '34px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1.5px solid var(--border-focus)',
                          background: 'var(--bg-surface)',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          fontSize: '0.84rem'
                        }}
                      />
                      {showSaleCustSuggestions && saleCustSuggestions.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            background: 'var(--bg-surface)',
                            border: '1.5px solid #3b82f6',
                            borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            marginTop: '2px'
                          }}
                        >
                          {saleCustSuggestions.map((c) => (
                            <div
                              key={c.id}
                              onMouseDown={() => handleSelectSaleCustomer(c)}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border-subtle)',
                                fontSize: '0.82rem'
                              }}
                            >
                              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.customer_name}</span>
                              <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>
                                Due: ₹{Number(c.current_balance || 0).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Field 2: Boxes */}
                <div className="board-bikri-field-boxes">
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#10b981', display: 'block', marginBottom: '2px', lineHeight: 1.2 }}>
                    Boxes (Max: {liveNetBalanceBoxes}) *
                  </label>
                  <input
                    ref={saleBoxesInputRef}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={liveNetBalanceBoxes}
                    placeholder="0"
                    value={saleForm.boxes}
                    onChange={(e) => handleSaleBoxesChange(e.target.value)}
                    required
                    disabled={liveNetBalanceBoxes <= 0}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #10b981',
                      background: 'var(--bg-surface)',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      color: '#10b981'
                    }}
                  />
                </div>

                {/* Field 3: Rate / Box (₹) */}
                <div className="board-bikri-field-rate">
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', lineHeight: 1.2 }}>
                    Rate / Box (₹) *
                  </label>
                  <input
                    ref={saleRateInputRef}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="any"
                    placeholder="e.g. 630"
                    value={saleForm.rate_per_box}
                    onChange={(e) => handleSaleRateChange(e.target.value)}
                    required
                    disabled={liveNetBalanceBoxes <= 0}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>

                {/* Field 4: Total Amount (₹) (Bi-directional Calculator) */}
                <div className="board-bikri-field-total">
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#047857', display: 'block', marginBottom: '2px', lineHeight: 1.2 }}>
                    Total Amount (₹)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="Auto or enter"
                    value={saleForm.total_amount}
                    onChange={(e) => handleSaleTotalChange(e.target.value)}
                    disabled={liveNetBalanceBoxes <= 0}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid rgba(16, 185, 129, 0.5)',
                      background: 'rgba(16, 185, 129, 0.05)',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      color: '#047857'
                    }}
                  />
                </div>

                {/* Field 5: Payment Mode */}
                <div className="board-bikri-field-mode">
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', lineHeight: 1.2 }}>
                    Payment Mode
                  </label>
                  <select
                    value={saleForm.payment_mode}
                    onChange={(e) => setSaleForm({ ...saleForm, payment_mode: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontWeight: 700,
                      fontSize: '0.80rem',
                      color: 'var(--text-main)'
                    }}
                  >
                    <option value="CASH">Cash (Rokda)</option>
                    <option value="CREDIT">Khata / Credit (Udhaar)</option>
                    <option value="UPI">UPI / GPay</option>
                  </select>
                </div>

                {/* Field 6: Save Entry Button */}
                <div className="board-bikri-field-submit">
                  <button
                    type="submit"
                    disabled={isSubmittingSale || liveNetBalanceBoxes <= 0}
                    style={{
                      width: '100%',
                      height: '34px',
                      minHeight: '34px',
                      maxHeight: '34px',
                      padding: '0 14px',
                      background: liveNetBalanceBoxes <= 0 ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 900,
                      fontSize: '0.84rem',
                      cursor: liveNetBalanceBoxes <= 0 ? 'not-allowed' : 'pointer',
                      boxShadow: liveNetBalanceBoxes <= 0 ? 'none' : '0 3px 10px rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>{isSubmittingSale ? 'Saving...' : 'Save Entry ↵'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* LOT DELIVERY ENTRY POPUP MODAL                                    */}
      {/* (Triggered by clicking the [ + ] div in the top row)             */}
      {/* ----------------------------------------------------------------- */}
      {isAddLotModalOpen && (
        <div
          className="mandi-modal-backdrop"
          onClick={() => setIsAddLotModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            className="mandi-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '580px',
              background: 'var(--bg-modal, #ffffff)',
              borderRadius: '16px',
              border: '1.5px solid var(--border-subtle)',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                background: 'var(--bg-modal-header, #f8fafc)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <Plus size={20} strokeWidth={3} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    Lot Delivery Entry Form
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Save karne ke baad div me add hoga aur bagal me [ + ] option rahega
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddLotModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveLotDelivery} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Row 1: Supplier Name & Truck No */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Supplier Name *
                  </label>
                  <input
                    ref={supplierInputRef}
                    type="text"
                    className="form-control"
                    placeholder="e.g. Piyush Traders"
                    value={lotForm.supplier_name}
                    onChange={(e) => handleSupplierNameInput(e.target.value)}
                    required
                    autoComplete="off"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-focus)',
                      background: 'var(--bg-surface)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: 'var(--text-main)'
                    }}
                  />
                  {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: 'var(--bg-surface)',
                        border: '1.5px solid #10b981',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}
                    >
                      {supplierSuggestions.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          onMouseDown={() => handleSelectSupplierSuggestion(s)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border-subtle)',
                            fontSize: '0.82rem'
                          }}
                        >
                          <strong style={{ color: 'var(--text-main)' }}>{s.supplier_name || s.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>{s.phone || 'Supplier'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Truck Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WB-1234"
                    value={lotForm.truckno}
                    onChange={(e) => setLotForm({ ...lotForm, truckno: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      fontSize: '0.88rem',
                      color: '#2563eb'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Fruit Name & Variety / Grade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Fruit Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Fruit Name (e.g. Apple / Banana)"
                    value={lotForm.fruit}
                    onChange={(e) => setLotForm({ ...lotForm, fruit: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Variety / Marka / Grade
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Variety / Marka / Grade (optional)"
                    value={lotForm.variety}
                    onChange={(e) => setLotForm({ ...lotForm, variety: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Total Boxes & Damage Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10b981', display: 'block', marginBottom: '4px' }}>
                    Total Boxes (CB / BX) *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder="e.g. 1200"
                    value={lotForm.boxes}
                    onChange={(e) => setLotForm({ ...lotForm, boxes: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #10b981',
                      background: 'var(--bg-surface)',
                      fontWeight: 900,
                      fontSize: '1.05rem',
                      color: '#10b981'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '4px' }}>
                    Damage Boxes (Damage Qty)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={lotForm.damage_boxes}
                    onChange={(e) => setLotForm({ ...lotForm, damage_boxes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: '#ef4444'
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Date & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Arrival Date *
                  </label>
                  <input
                    type="date"
                    value={lotForm.date}
                    onChange={(e) => setLotForm({ ...lotForm, date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontWeight: 700,
                      fontSize: '0.84rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9830012345"
                    value={lotForm.phone}
                    onChange={(e) => setLotForm({ ...lotForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontWeight: 600,
                      fontSize: '0.84rem'
                    }}
                  />
                </div>
              </div>

              {/* Net Balance Preview Strip */}
              {Number(lotForm.boxes) > 0 && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.82rem',
                    fontWeight: 800
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Inward: {lotForm.boxes} - Damage: {lotForm.damage_boxes || 0}
                  </span>
                  <span style={{ color: '#059669' }}>
                    Available Net Balance: {Math.max(0, (Number(lotForm.boxes) || 0) - (Number(lotForm.damage_boxes) || 0))} Boxes
                  </span>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddLotModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingLot}
                  style={{
                    padding: '9px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} strokeWidth={3} />
                  <span>{isSubmittingLot ? 'Saving...' : 'Save Lot Delivery Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
