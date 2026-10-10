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
  ChevronDown,
  ChevronUp,
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
  DollarSign,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDisplayDate } from '../../utils/dateUtils';
import CashSellHistoryView from './CashSellHistoryView';
import UdhaarHistoryView from './UdhaarHistoryView';
import ExcelImportModal from '../modals/ExcelImportModal';

export const INWARD_UNIT_OPTIONS = [
  'KG',
  'GRAM (G)',
  'TON (T)',
  'QUINTAL (QTL)',
  'BOX',
  'CARTON',
  'CRATE',
  'CASE',
  'BAG',
  'SACK',
  'BASKET',
  'TRAY',
  'BUNCH',
  'DOZEN',
  'PIECE / PCS',
  'PAIR',
  'PACK',
  'POUCH',
  'JAR',
  'TIN',
  'BUCKET',
  'DRUM'
];

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
  currentUser,
  isSalesPerson: isSalesPersonProp
}) {
  const isSalesPerson = isSalesPersonProp !== undefined
    ? isSalesPersonProp
    : Boolean(
      currentUser?.role_code === 'SALES_PERSON' ||
      currentUser?.profile?.role_code === 'SALES_PERSON' ||
      currentUser?.role === 'Sales Person (Spot)' ||
      currentUser?.username?.toLowerCase() === 'sales'
    );

  const [showCashSellPage, setShowCashSellPage] = useState(false);
  const [showUdhaarPage, setShowUdhaarPage] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const handleOpenCashSellHistory = () => {
    if (isSalesPerson) return;
    if (setActiveTab) {
      setActiveTab('cash-sell-history');
    } else {
      setShowCashSellPage(true);
    }
  };

  const handleOpenUdhaarHistory = () => {
    if (isSalesPerson) return;
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

    // Map to deduplicate sales by ID and composite signature
    const allSalesMap = new Map();
    const sigCounts = new Map();

    const cleanTruck = (t) => (t || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const makeSig = (truck, cust, dateStr, boxes, total) => {
      const t = cleanTruck(truck);
      const c = (cust || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const d = formatDisplayDate(dateStr);
      const b = Math.round(Number(boxes || 0));
      const tot = Math.round(Number(total || 0));
      return `${t}__${c}__${d}__${b}__${tot}`;
    };

    // 1. From truckSalesList (primary board sales source)
    (truckSalesList || []).forEach(s => {
      if (s && s.id !== undefined && s.id !== null) {
        allSalesMap.set(String(s.id), s);
        const sig = makeSig(s.truck_no, s.customer_name, s.selling_date || s.date, s.boxes, s.total);
        sigCounts.set(sig, (sigCounts.get(sig) || 0) + 1);
      }
    });

    // 2. From customer buy_history (if any sale was saved to customer profile)
    (customerProfiles || []).forEach(c => {
      (c.buy_history || []).forEach(b => {
        if (b && b.id !== undefined && b.id !== null && !allSalesMap.has(String(b.id))) {
          const sig = makeSig(b.truck_no, c.customer_name, b.date || b.selling_date, b.boxes, b.total);
          if ((sigCounts.get(sig) || 0) > 0) return;
          sigCounts.set(sig, 1);
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
        const sBoxes = Number(s.total_boxes || s.boxes || s.quantity || s.crates_sold || 0);
        const sDate = s.sale_date || s.order_date || s.date || (s.created_at ? String(s.created_at).slice(0, 10) : '');
        const sig = makeSig(s.truck_number || s.truck_no, s.customer_name, sDate, sBoxes, sTotal);

        if ((sigCounts.get(sig) || 0) > 0) {
          sigCounts.set(sig, sigCounts.get(sig) - 1);
          return;
        }

        allSalesMap.set(String(s.id), {
          id: s.id,
          selling_date: sDate,
          total: sTotal,
          boxes: sBoxes,
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
  const [showBikriHistory, setShowBikriHistory] = useState(false);

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
    varieties: [{ variety: '', boxes: '', damage_boxes: '' }],
    unit: 'BOX', // 'BOX' | 'KG'
    boxes: '',
    damage_boxes: ''
  });

  // Autocomplete for supplier inside popup
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [activeSupplierSuggestIdx, setActiveSupplierSuggestIdx] = useState(-1);
  const supplierInputRef = useRef(null);

  // Helper to gather all unique recent suppliers
  const getRecentSuppliersPool = () => {
    const pool = [];
    const seen = new Set();
    // 1. From supplierProfiles (active & recent inward lots)
    (supplierProfiles || []).forEach(p => {
      const name = (p.supplier_name || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        pool.push(p);
      }
    });
    // 2. From suppliers list
    (suppliers || []).forEach(s => {
      const name = (s.supplier_name || s.name || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        pool.push(s);
      }
    });
    // 3. From purchasesList
    (purchasesList || []).forEach(p => {
      const name = (p.supplier_name || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        pool.push({
          supplier_name: name,
          phone: p.phone || '',
          truckno: p.truck_number || ''
        });
      }
    });
    return pool;
  };

  const handleSupplierNameInput = (val) => {
    setLotForm(prev => ({ ...prev, supplier_name: val }));
    const pool = getRecentSuppliersPool();

    // If completely empty without any space
    if (val === '') {
      setSupplierSuggestions([]);
      setShowSupplierSuggestions(false);
      return;
    }

    // If user clicked/typed space (e.g. " ", or starts/ends with space) -> show all recent names!
    if (!val.trim()) {
      setSupplierSuggestions(pool);
      setShowSupplierSuggestions(pool.length > 0);
      setActiveSupplierSuggestIdx(-1);
      return;
    }

    const q = val.toLowerCase().trim();
    const matched = pool.filter(s =>
      (s.supplier_name || s.name || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.truckno || '').toLowerCase().includes(q)
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
      varieties: [{ variety: '', boxes: '', damage_boxes: '' }],
      unit: 'BOX',
      boxes: '',
      damage_boxes: ''
    });
    setShowSupplierSuggestions(false);
    setIsAddLotModalOpen(true);
    setTimeout(() => {
      if (supplierInputRef.current) {
        supplierInputRef.current.focus();
      }
    }, 150);
  };

  const handleAddVarietyRow = () => {
    setLotForm(prev => {
      const currentVarieties = prev.varieties || [];
      const updatedVarieties = [
        ...currentVarieties,
        { variety: '', boxes: '', damage_boxes: '' }
      ];
      const totalDamage = updatedVarieties.reduce((sum, v) => sum + (Number(v.damage_boxes) || 0), 0);
      return {
        ...prev,
        varieties: updatedVarieties,
        damage_boxes: totalDamage > 0 ? String(totalDamage) : ''
      };
    });
  };

  const handleRemoveVarietyRow = (index) => {
    setLotForm(prev => {
      const updated = (prev.varieties || []).filter((_, idx) => idx !== index);
      const newVarieties = updated.length > 0 ? updated : [{ variety: '', boxes: '', damage_boxes: '' }];
      const hasAnyBoxes = newVarieties.some(v => v.boxes !== '' && Number(v.boxes) > 0);
      const newTotalBoxes = hasAnyBoxes
        ? newVarieties.reduce((sum, v) => sum + (Number(v.boxes) || 0), 0)
        : prev.boxes;
      const totalDamage = newVarieties.reduce((sum, v) => sum + (Number(v.damage_boxes) || 0), 0);
      return {
        ...prev,
        varieties: newVarieties,
        boxes: hasAnyBoxes ? String(newTotalBoxes) : prev.boxes,
        damage_boxes: totalDamage > 0 ? String(totalDamage) : ''
      };
    });
  };

  const handleVarietyChange = (index, field, value) => {
    setLotForm(prev => {
      const updated = (prev.varieties || [{ variety: '', boxes: '', damage_boxes: '' }]).map((item, idx) => {
        if (idx === index) {
          return { ...item, [field]: value };
        }
        return item;
      });

      const firstVar = updated[0]?.variety || '';

      let nextBoxes = prev.boxes;
      const hasAnyBoxes = updated.some(v => v.boxes !== '' && Number(v.boxes) > 0);
      if (hasAnyBoxes) {
        const sumBoxes = updated.reduce((sum, v) => sum + (Number(v.boxes) || 0), 0);
        nextBoxes = sumBoxes > 0 ? String(sumBoxes) : '';
      }

      // Compute total damage across all varieties
      const totalDamage = updated.reduce((sum, v) => sum + (Number(v.damage_boxes) || 0), 0);

      return {
        ...prev,
        variety: firstVar,
        varieties: updated,
        boxes: nextBoxes,
        damage_boxes: totalDamage > 0 ? String(totalDamage) : ''
      };
    });
  };

  const handleSingleDamageChange = (val) => {
    setLotForm(prev => {
      const updatedVarieties = (prev.varieties || [{ variety: '', boxes: '', damage_boxes: '' }]).map((v, idx) => {
        if (idx === 0) {
          return { ...v, damage_boxes: val };
        }
        return v;
      });
      return {
        ...prev,
        damage_boxes: val,
        varieties: updatedVarieties
      };
    });
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
      if (showToast) showToast(`Please enter valid total quantity for ${lotForm.unit || 'BOX'}`, 'error');
      return;
    }
    const damageBoxes = Number(lotForm.damage_boxes) || 0;
    if (damageBoxes > totalBoxes) {
      if (showToast) showToast(`Damage (${lotForm.unit || 'BOX'}) cannot exceed total inward!`, 'error');
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

      // Check if multiple varieties with positive boxes are specified
      const rawVarieties = (lotForm.varieties || [])
        .map(v => ({
          variety: (v.variety || '').trim(),
          boxes: Number(v.boxes) || 0,
          damage_boxes: Number(v.damage_boxes) || 0
        }))
        .filter(v => v.variety || v.boxes > 0);

      // Validate per-variety damage does not exceed variety quantity
      if (rawVarieties.length > 1) {
        for (const v of rawVarieties) {
          if (v.damage_boxes > v.boxes) {
            if (showToast) showToast(`Damage for "${v.variety || 'Variety'}" (${v.damage_boxes}) cannot exceed its inward quantity (${v.boxes} ${lotForm.unit || 'BOX'})!`, 'error');
            setIsSubmittingLot(false);
            return;
          }
        }
      }

      const combinedVariety = rawVarieties.length > 0
        ? rawVarieties.map(v => v.variety).filter(Boolean).join(', ')
        : (lotForm.variety || '').trim();

      const varietiesList = rawVarieties.length > 0
        ? rawVarieties.map(v => {
            const lotDamage = Math.min(v.boxes, Math.max(0, Number(v.damage_boxes) || 0));
            return {
              variety: v.variety,
              boxes: v.boxes,
              damage_boxes: lotDamage,
              balance_box: Math.max(0, v.boxes - lotDamage)
            };
          })
        : [{
            variety: combinedVariety,
            boxes: totalBoxes,
            damage_boxes: damageBoxes,
            balance_box: balanceBoxes
          }];

      // Single unified lot profile for this supplier/truck delivery entry
      const singleLot = {
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
        variety: combinedVariety,
        varieties: varietiesList,
        unit: lotForm.unit || 'BOX',
        boxes: totalBoxes,
        damage_boxes: damageBoxes,
        balance_box: balanceBoxes
      };

      // Sync backend purchases truck payments for each variety entered
      for (const v of varietiesList) {
        const lotPayload = {
          supplier: supplierId,
          supplier_name: cleanName,
          truck_number: finalTruckNo,
          payment_date: lotForm.date,
          fruit_name: cleanFruit,
          variety: v.variety,
          no_of_boxes: v.boxes,
          pay: v.boxes * 1000,
          rate_per_box: 1000,
          transport_charge: 0,
          loading_charge: 0,
          unloading_charge: 0,
          commission_charge: 0,
          discount: 0
        };
        await api.post('/purchases/truck-payments/', lotPayload).catch(() => null);

        if (saveFruitAndVariety && v.variety) {
          saveFruitAndVariety(cleanFruit, v.variety);
        }
      }

      setSupplierProfiles(prev => [singleLot, ...prev]);
      setSelectedLotId(singleLot.id);
      setLotFilterMode('ACTIVE');

      setIsAddLotModalOpen(false);
      if (showToast) {
        const unitText = lotForm.unit || 'BOX';
        if (varietiesList.length > 1) {
          const varSummary = varietiesList.map(l => `${l.variety || 'Lot'} (${l.balance_box} ${unitText})`).join(', ');
          showToast(`Lot saved! ${cleanName} - ${cleanFruit}: ${varSummary} (Total Net: ${balanceBoxes} ${unitText})`, 'success');
        } else {
          showToast(`Lot saved! ${cleanName} - ${cleanFruit}${singleLot.variety ? ` (${singleLot.variety.trim()})` : ''} (${singleLot.balance_box} ${unitText})`, 'success');
        }
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
      const isIdMatch = s.lot_id && String(s.lot_id) === String(activeLot.id);
      const tNumMatch =
        s.truck_no && activeLot.truckno &&
        s.truck_no.trim().toUpperCase() === activeLot.truckno.trim().toUpperCase();
      const suppMatch =
        !activeLot.supplier_name || !s.supplier_name ||
        s.supplier_name.trim().toLowerCase() === activeLot.supplier_name.trim().toLowerCase();
      return isIdMatch || (tNumMatch && suppMatch);
    });
  }, [truckSalesList, activeLot]);

  const activeLotSoldBoxes = useMemo(() => {
    return activeLotSales.reduce((sum, s) => sum + Number(s.boxes || 0), 0);
  }, [activeLotSales]);

  const activeLotTotalBikri = useMemo(() => {
    return activeLotSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  }, [activeLotSales]);

  const activeLotCashSaleTotal = useMemo(() => {
    return activeLotSales
      .filter(s => {
        const mode = String(s.payment_mode || s.payment_type || '').toUpperCase();
        const cust = String(s.customer_name || '').trim().toUpperCase();
        return mode === 'CASH' || cust === 'CASH SALE' || s.is_cash === true;
      })
      .reduce((sum, s) => sum + Number(s.total || 0), 0);
  }, [activeLotSales]);

  const activeLotCashSaleBoxes = useMemo(() => {
    return activeLotSales
      .filter(s => {
        const mode = String(s.payment_mode || s.payment_type || '').toUpperCase();
        const cust = String(s.customer_name || '').trim().toUpperCase();
        return mode === 'CASH' || cust === 'CASH SALE' || s.is_cash === true;
      })
      .reduce((sum, s) => sum + Number(s.boxes || 0), 0);
  }, [activeLotSales]);

  const liveNetBalanceBoxes = useMemo(() => {
    if (!activeLot) return 0;
    return Number(activeLot.balance_box || 0);
  }, [activeLot]);

  // ---------------------------------------------------------------------------
  // 5b. Active Sellable Lots (Stock Available)
  // ---------------------------------------------------------------------------
  const activeSellableLots = useMemo(() => {
    return supplierProfiles.filter(lot => Number(lot.balance_box || 0) > 0);
  }, [supplierProfiles]);

  // ---------------------------------------------------------------------------
  // 6. Truck-Specific Bikri Parchi State (Isolated Per Truck No Profile)
  // ---------------------------------------------------------------------------
  const [truckSaleForms, setTruckSaleForms] = useState({});
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [recentSavedSaleId, setRecentSavedSaleId] = useState(null);

  // Helper to extract list of varieties for a given lot
  const getLotVarietiesList = (lot) => {
    if (!lot) return [];
    if (Array.isArray(lot.varieties) && lot.varieties.length > 0) {
      return lot.varieties
        .map(v => ({
          variety: (v.variety || '').trim(),
          boxes: Number(v.boxes || 0),
          damage_boxes: Number(v.damage_boxes || 0),
          balance_box: Number(v.balance_box !== undefined ? v.balance_box : Math.max(0, (Number(v.boxes) || 0) - (Number(v.damage_boxes) || 0)))
        }))
        .filter(v => Boolean(v.variety));
    }
    if (lot.variety) {
      const parts = String(lot.variety).split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts.map(p => ({
          variety: p,
          boxes: Number(lot.boxes || 0),
          damage_boxes: Number(lot.damage_boxes || 0),
          balance_box: Number(lot.balance_box || 0)
        }));
      }
    }
    return [{
      variety: lot.fruit || 'Standard',
      boxes: Number(lot.boxes || 0),
      damage_boxes: Number(lot.damage_boxes || 0),
      balance_box: Number(lot.balance_box || 0)
    }];
  };

  // Helper to get or initialize form state for a specific lot/truck
  const getTruckSaleForm = (lot) => {
    if (!lot) {
      return {
        customerType: 'CASH',
        customerName: 'CASH SALE',
        customerPhone: '',
        customerCity: '',
        paymentMode: 'CASH',
        amountPaid: '',
        date: selectedBoardDate || getSystemDate(),
        items: [{ id: 1, variety: '', quantity: '', rate: '', total_amount: '' }]
      };
    }

    const existing = truckSaleForms[lot.id];
    if (existing) {
      return existing;
    }

    const vars = getLotVarietiesList(lot);
    const defaultVar = vars[0]?.variety || lot.variety || '';

    return {
      customerType: 'CASH',
      customerName: 'CASH SALE',
      customerPhone: '',
      customerCity: '',
      paymentMode: 'CASH',
      amountPaid: '',
      date: selectedBoardDate || getSystemDate(),
      items: [{ id: 1, variety: defaultVar, quantity: '', rate: '', total_amount: '' }]
    };
  };

  // Active form for the currently selected truck profile
  const activeSaleForm = useMemo(() => {
    return getTruckSaleForm(activeLot);
  }, [activeLot?.id, truckSaleForms, selectedBoardDate]);

  // Update field(s) in active truck's form
  const updateActiveTruckForm = (fieldOrUpdates, maybeValue) => {
    if (!activeLot) return;
    const current = getTruckSaleForm(activeLot);
    const updates = typeof fieldOrUpdates === 'string'
      ? { [fieldOrUpdates]: maybeValue }
      : fieldOrUpdates;

    setTruckSaleForms(prev => ({
      ...prev,
      [activeLot.id]: {
        ...current,
        ...updates
      }
    }));
  };

  // Customer Autocomplete inside inline sale form
  const [saleCustSuggestions, setSaleCustSuggestions] = useState([]);
  const [showSaleCustSuggestions, setShowSaleCustSuggestions] = useState(false);
  const [activeSaleCustIdx, setActiveSaleCustIdx] = useState(-1);
  const saleCustInputRef = useRef(null);

  // Switch between CASH SALE and Party Name for active truck
  const handleToggleCustomerType = (type) => {
    if (!activeLot) return;
    const current = getTruckSaleForm(activeLot);
    if (type === 'CASH') {
      setTruckSaleForms(prev => ({
        ...prev,
        [activeLot.id]: {
          ...current,
          customerType: 'CASH',
          customerName: 'CASH SALE',
          customerPhone: '',
          customerCity: '',
          paymentMode: 'CASH'
        }
      }));
      setShowSaleCustSuggestions(false);
    } else {
      setTruckSaleForms(prev => ({
        ...prev,
        [activeLot.id]: {
          ...current,
          customerType: 'NAME',
          customerName: '',
          paymentMode: 'CREDIT'
        }
      }));
      setTimeout(() => {
        if (saleCustInputRef.current) saleCustInputRef.current.focus();
      }, 80);
    }
  };

  const handleSaleCustomerChange = (val) => {
    updateActiveTruckForm('customerName', val);
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
    if (!activeLot) return;
    updateActiveTruckForm({
      customerName: c.customer_name,
      customerPhone: c.phone || '',
      customerCity: c.city || ''
    });
    setShowSaleCustSuggestions(false);
  };

  // Item helpers for active truck
  const handleAddTruckSaleItem = () => {
    if (!activeLot) return;
    const current = getTruckSaleForm(activeLot);
    const vars = getLotVarietiesList(activeLot);
    const usedVars = (current.items || []).map(i => i.variety);
    const unused = vars.find(v => !usedVars.includes(v.variety));
    const nextVar = unused ? unused.variety : (vars[0]?.variety || activeLot.variety || '');

    setTruckSaleForms(prev => ({
      ...prev,
      [activeLot.id]: {
        ...current,
        items: [
          ...(current.items || []),
          {
            id: Date.now() + Math.random(),
            variety: nextVar,
            quantity: '',
            rate: '',
            total_amount: ''
          }
        ]
      }
    }));
  };

  const handleRemoveTruckSaleItem = (idx) => {
    if (!activeLot) return;
    const current = getTruckSaleForm(activeLot);
    if ((current.items || []).length <= 1) return;
    setTruckSaleForms(prev => ({
      ...prev,
      [activeLot.id]: {
        ...current,
        items: current.items.filter((_, i) => i !== idx)
      }
    }));
  };

  const handleUpdateTruckSaleItem = (idx, field, value) => {
    if (!activeLot) return;
    const current = getTruckSaleForm(activeLot);
    const copy = [...(current.items || [])];
    const item = { ...copy[idx], [field]: value };

    const avail = Number(activeLot?.balance_box || 0);
    const lotVars = getLotVarietiesList(activeLot);
    const activeVarName = field === 'variety' ? value : (item.variety || lotVars[0]?.variety || '');
    const currentVar = lotVars.find(v => (v.variety || '').trim().toLowerCase() === (activeVarName || '').trim().toLowerCase());
    const varMax = currentVar && currentVar.balance_box !== undefined ? Number(currentVar.balance_box) : avail;

    if (field === 'variety') {
      // If new variety has lower balance than currently entered quantity, cap quantity
      if (item.quantity && Number(item.quantity) > varMax) {
        item.quantity = varMax > 0 ? String(varMax) : '';
      }
    }

    if (field === 'quantity') {
      if (Number(value) > varMax) {
        item.quantity = varMax > 0 ? String(varMax) : '';
      }
    }

    if (field === 'quantity' || field === 'rate' || field === 'variety') {
      const q = field === 'quantity' ? Number(value) || 0 : Number(item.quantity) || 0;
      const r = field === 'rate' ? Number(value) || 0 : Number(item.rate) || 0;
      if (q > 0 && r > 0) {
        item.total_amount = String(Math.round(q * r * 100) / 100);
      }
    } else if (field === 'total_amount') {
      const tot = Number(value) || 0;
      const q = Number(item.quantity) || 0;
      if (q > 0 && tot > 0) {
        item.rate = (tot / q).toFixed(2).replace(/\.00$/, '');
      }
    }

    copy[idx] = item;
    setTruckSaleForms(prev => ({
      ...prev,
      [activeLot.id]: {
        ...current,
        items: copy
      }
    }));
  };

  const truckParchiGrandTotal = useMemo(() => {
    if (!activeSaleForm?.items) return 0;
    return activeSaleForm.items.reduce((sum, item) => {
      const tot = Number(item.total_amount);
      if (tot > 0) return sum + tot;
      const q = Number(item.quantity) || 0;
      const r = Number(item.rate) || 0;
      return sum + (q * r);
    }, 0);
  }, [activeSaleForm]);

  const truckParchiTotalQty = useMemo(() => {
    if (!activeSaleForm?.items) return 0;
    return activeSaleForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [activeSaleForm]);

  // ---------------------------------------------------------------------------
  // 7. Save Truck Bikri Parchi Entry (For Active Truck Profile)
  // ---------------------------------------------------------------------------
  const handleSaveSaleEntry = async (e) => {
    if (e) e.preventDefault();

    if (!activeLot) {
      if (showToast) showToast('Please select a truck lot to sell from!', 'error');
      return;
    }

    const availBal = Number(activeLot.balance_box || 0);
    if (availBal <= 0) {
      if (showToast) showToast(`Is truck (${activeLot.truckno}) ka poora stock bik chuka hai (0 Balance)!`, 'error');
      return;
    }

    const cleanCustName = (activeSaleForm.customerName || '').trim() || (activeSaleForm.customerType === 'CASH' ? 'CASH SALE' : '');
    if (!cleanCustName) {
      if (showToast) showToast('Please enter Customer / Party Name', 'error');
      return;
    }

    const items = activeSaleForm.items || [];
    if (items.length === 0) {
      if (showToast) showToast('Please enter quantity and rate', 'error');
      return;
    }

    // Validate rows
    const validatedRows = [];
    let totalDemand = 0;
    const lotVars = getLotVarietiesList(activeLot);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const q = Number(item.quantity);
      if (!q || q <= 0) {
        if (showToast) showToast(`Row ${i + 1}: Please enter valid quantity`, 'error');
        return;
      }
      let r = Number(item.rate);
      const tot = Number(item.total_amount);
      if ((!r || r <= 0) && tot > 0 && q > 0) {
        r = parseFloat((tot / q).toFixed(2));
      }
      if (!r || r <= 0) {
        if (showToast) showToast(`Row ${i + 1}: Please enter valid rate or total amount`, 'error');
        return;
      }
      const finalTot = Math.round(q * r * 100) / 100;
      totalDemand += q;
      const rowVar = (item.variety || lotVars[0]?.variety || activeLot.variety || '').trim();
      validatedRows.push({
        ...item,
        variety: rowVar,
        qty: q,
        rate: r,
        total: finalTot
      });
    }

    if (totalDemand > availBal) {
      if (showToast) showToast(`Cannot sell ${totalDemand} ${activeLot.unit || 'boxes'}. Only ${availBal} balance available in truck ${activeLot.truckno}!`, 'error');
      return;
    }

    // Validate per-variety balance if multiple varieties exist
    if (lotVars.length > 1) {
      for (const v of lotVars) {
        if (v.balance_box !== undefined) {
          const soldForThisVar = validatedRows
            .filter(r => (r.variety || '').toLowerCase() === (v.variety || '').toLowerCase())
            .reduce((sum, r) => sum + r.qty, 0);
          if (soldForThisVar > Number(v.balance_box)) {
            if (showToast) showToast(`Cannot sell ${soldForThisVar} of "${v.variety}". Only ${v.balance_box} balance left in truck!`, 'error');
            return;
          }
        }
      }
    }

    const grandTotal = validatedRows.reduce((sum, r) => sum + r.total, 0);
    const paidAmount = activeSaleForm.paymentMode === 'CASH'
      ? (activeSaleForm.amountPaid !== '' ? Number(activeSaleForm.amountPaid) : grandTotal)
      : (Number(activeSaleForm.amountPaid) || 0);
    const unpaidAmount = Math.max(0, grandTotal - paidAmount);

    setIsSubmittingSale(true);
    try {
      // 1. Deduct quantity from activeLot in supplierProfiles (both total and per-variety)
      setSupplierProfiles(prev => prev.map(p => {
        if (p.id === activeLot.id || String(p.id) === String(activeLot.id)) {
          const currentVars = Array.isArray(p.varieties) && p.varieties.length > 0
            ? p.varieties
            : getLotVarietiesList(p);

          const updatedVarieties = currentVars.map(v => {
            const soldForThis = validatedRows
              .filter(r => (r.variety || '').trim().toLowerCase() === (v.variety || '').trim().toLowerCase())
              .reduce((sum, r) => sum + r.qty, 0);
            return {
              ...v,
              balance_box: Math.max(0, Number(v.balance_box !== undefined ? v.balance_box : v.boxes || 0) - soldForThis)
            };
          });

          return {
            ...p,
            balance_box: Math.max(0, Number(p.balance_box || 0) - totalDemand),
            varieties: updatedVarieties
          };
        }
        return p;
      }));

      // 2. Create Sale Records in truckSalesList
      const parchiNo = `BP-${Date.now().toString().slice(-6)}`;
      const newSalesList = [];
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentSaleDate = activeSaleForm.date || selectedBoardDate || getSystemDate();

      validatedRows.forEach((row, idx) => {
        const itemSaleId = Date.now() + idx + Math.random();
        const itemProportion = grandTotal > 0 ? (row.total / grandTotal) : 0;
        const itemPaid = Math.round(paidAmount * itemProportion * 100) / 100;
        const itemVariety = (row.variety || activeLot.variety || '').trim();

        const newSale = {
          id: itemSaleId,
          parchi_no: parchiNo,
          lot_id: activeLot.id,
          selling_date: currentSaleDate,
          customer_name: cleanCustName,
          customer_phone: activeSaleForm.customerPhone || '',
          truck_no: (activeLot.truckno || '').trim().toUpperCase(),
          supplier_name: (activeLot.supplier_name || '').trim(),
          product_name: `${activeLot.fruit || ''}${itemVariety ? ` - ${itemVariety}` : ''}`.trim() || 'Produce',
          variety: itemVariety,
          unit: activeLot.unit || 'BOX',
          boxes: row.qty,
          rate_per_box: row.rate,
          total: row.total,
          payment_mode: activeSaleForm.paymentMode,
          amount_paid: itemPaid,
          time: timestamp
        };
        newSalesList.push(newSale);
      });

      setTruckSalesList(prev => [...newSalesList, ...prev]);
      setShowBikriHistory(true);

      if (newSalesList.length > 0) {
        setRecentSavedSaleId(newSalesList[0].id);
        setTimeout(() => setRecentSavedSaleId(null), 3000);
      }

      // 3. Update customer profiles
      if (cleanCustName !== 'CASH SALE') {
        const newBuyRecords = newSalesList.map(s => ({
          id: s.id,
          parchi_no: parchiNo,
          date: currentSaleDate,
          product_name: s.product_name,
          truck_no: s.truck_no,
          supplier_name: s.supplier_name,
          boxes: s.boxes,
          unit: s.unit,
          rate_per_box: s.rate_per_box,
          total: s.total,
          payment_mode: activeSaleForm.paymentMode,
          amount_paid: s.amount_paid
        }));

        let newPaymentRecord = null;
        if (paidAmount > 0) {
          newPaymentRecord = {
            id: Date.now() + 99,
            date: currentSaleDate,
            amount: paidAmount,
            payment_method: activeSaleForm.paymentMode,
            reference: parchiNo,
            notes: `Payment for Bikri Parchi #${parchiNo} (${totalDemand} ${activeLot.unit || 'boxes'} ${activeLot.fruit} - 🚚 ${activeLot.truckno})`
          };
        }

        setCustomerProfiles(prev => {
          const idx = prev.findIndex(c => (c.customer_name || '').toLowerCase() === cleanCustName.toLowerCase());
          if (idx >= 0) {
            const existing = prev[idx];
            const updated = {
              ...existing,
              phone: activeSaleForm.customerPhone || existing.phone,
              city: activeSaleForm.customerCity || existing.city,
              total_boxes: Number(existing.total_boxes || 0) + totalDemand,
              total_bought: Number(existing.total_bought || 0) + grandTotal,
              total_paid: Number(existing.total_paid || 0) + paidAmount,
              current_balance: Number(existing.current_balance || 0) + unpaidAmount,
              buy_history: [...newBuyRecords, ...(existing.buy_history || [])],
              payment_history: newPaymentRecord ? [newPaymentRecord, ...(existing.payment_history || [])] : (existing.payment_history || [])
            };
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          } else {
            const newCust = {
              id: Date.now() + 2,
              customer_name: cleanCustName,
              phone: (activeSaleForm.customerPhone || '').trim(),
              city: (activeSaleForm.customerCity || '').trim(),
              current_balance: unpaidAmount,
              total_bought: grandTotal,
              total_paid: paidAmount,
              total_boxes: totalDemand,
              status: 'ACTIVE',
              buy_history: newBuyRecords,
              payment_history: newPaymentRecord ? [newPaymentRecord] : []
            };
            return [newCust, ...prev];
          }
        });
      }

      // 4. Sync backend API
      try {
        for (const row of validatedRows) {
          await api.post('/sales/orders/', {
            customer_name: cleanCustName,
            phone: activeSaleForm.customerPhone || '',
            city: activeSaleForm.customerCity || '',
            order_date: currentSaleDate,
            truck_number: (activeLot.truckno || '').trim().toUpperCase(),
            crates_sold: row.qty,
            rate_per_crate: row.rate,
            gross_amount: row.total,
            subtotal: row.total,
            grand_total: row.total,
            paid_amount: grandTotal > 0 ? Math.round(paidAmount * (row.total / grandTotal)) : 0,
            payment_terms: activeSaleForm.paymentMode === 'CASH' ? 'CASH' : 'CREDIT',
            product_name: `${activeLot.fruit || ''}${row.variety ? ` - ${row.variety}` : ''}`.trim() || activeLot.fruit || 'Fruit',
            variety_name: (row.variety || activeLot.variety || '').trim(),
            status: 'DISPATCHED'
          }).catch(() => null);
        }
        window.dispatchEvent(new CustomEvent('erp:refresh-data'));
      } catch (apiErr) {
        console.warn('Backend sale sync note:', apiErr.message);
      }

      // 5. Reset form for this active lot
      const defaultVar = lotVars[0]?.variety || activeLot.variety || '';
      setTruckSaleForms(prev => ({
        ...prev,
        [activeLot.id]: {
          customerType: activeSaleForm.customerType,
          customerName: activeSaleForm.customerType === 'CASH' ? 'CASH SALE' : '',
          customerPhone: '',
          customerCity: '',
          paymentMode: activeSaleForm.customerType === 'CASH' ? 'CASH' : 'CREDIT',
          amountPaid: '',
          date: currentSaleDate,
          items: [{ id: Date.now(), variety: defaultVar, quantity: '', rate: '', total_amount: '' }]
        }
      }));

      if (showToast) {
        showToast(`✓ Bikri Parchi saved! ${totalDemand} ${activeLot.unit || 'Boxes'} (${activeLot.truckno}) sold to ${cleanCustName} for ₹${grandTotal.toLocaleString()} 📦`, 'success');
      }
    } catch (err) {
      if (showToast) showToast('Error saving bikri parchi: ' + err.message, 'error');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 8. Delete Single Sale Entry from History
  // ---------------------------------------------------------------------------
  const handleDeleteSaleEntry = async (sale) => {
    if (!sale) return;
    const unitText = sale.unit === 'KG' ? 'KG' : 'BX';
    if (window.confirm(`Delete sale entry for ${sale.customer_name} (${sale.boxes} ${unitText})? ${sale.boxes} will be refunded back to this lot balance.`)) {
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

      // 1. Refund boxes / kg to lot
      setSupplierProfiles(prev => prev.map(p => {
        if (p.id === (sale.lot_id || activeLot?.id)) {
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

      if (showToast) {
        showToast(`Sale deleted! ${sale.boxes} ${unitText} refunded back to lot balance.`, 'info');
      }
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
          {!isSalesPerson ? (
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
                <span>Customers & Parcha</span>
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

              <button
                type="button"
                onClick={() => setIsExcelModalOpen(true)}
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
                title="Bulk upload deliveries / purchase orders via Excel"
              >
                <FileSpreadsheet size={14} color="#10b981" />
                <span>Import Excel</span>
              </button>
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1.5px solid rgba(249, 115, 22, 0.35)',
              padding: '6px 12px',
              borderRadius: '8px',
              color: '#ea580c',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              <span>👤 Spot Sales Counter</span>
            </div>
          )}
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
          {!isSalesPerson ? (
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
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#059669'
              }}
            >
              <span>🍎 Live Sale Entry Mode</span>
            </div>
          )}
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
                onClick={() => {
                  if (isSelected) {
                    setShowBikriHistory(prev => !prev);
                  } else {
                    setSelectedLotId(lot.id);
                    setShowBikriHistory(true);
                  }
                }}
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
                      {lot.boxes} {lot.unit || 'BX'}
                    </span>
                    {bal !== Number(lot.boxes) && (
                      <span className="board-lot-card-bal" style={{ fontSize: '0.74rem', color: isZeroBal ? '#ef4444' : '#059669', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {isZeroBal ? '0 BAL' : `${bal} ${lot.unit || 'Bal'}`}
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
          onClick={() => setShowBikriHistory(prev => !prev)}
          title={showBikriHistory ? 'Click to hide Bikri Parchi History' : 'Click to show Bikri Parchi History'}
          style={{
            background: 'var(--bg-surface)',
            border: showBikriHistory ? '2px solid #10b981' : '1.5px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '14px',
            padding: '12px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: showBikriHistory ? '0 6px 20px rgba(16, 185, 129, 0.15)' : '0 4px 16px rgba(0, 0, 0, 0.04)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {/* Top Row: Title, Truck Badge on Left & Controls on Top Right */}
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

            {/* Right Controls: History Toggle Button & Delete Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {/* Bikri Parchi History Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBikriHistory(prev => !prev);
                }}
                style={{
                  background: showBikriHistory ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                  border: showBikriHistory ? '1.5px solid #10b981' : '1.5px solid rgba(59, 130, 246, 0.35)',
                  color: showBikriHistory ? '#059669' : '#2563eb',
                  height: '24px',
                  minHeight: '24px',
                  maxHeight: '24px',
                  padding: '0 9px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                title={showBikriHistory ? 'Click to hide Bikri Parchi History' : 'Click to show Bikri Parchi History'}
              >
                <span>📜 Bikri History ({activeLotSales.length})</span>
                {showBikriHistory ? <ChevronUp size={12} strokeWidth={2.5} /> : <ChevronDown size={12} strokeWidth={2.5} />}
              </button>

              {/* Dlt [Trash Icon] Button - Positioned at Top Right */}
              {!isSalesPerson && (
                <button
                  type="button"
                  className="board-lot-dlt-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLot(activeLot);
                  }}
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
              )}
            </div>
          </div>

          {/* Bottom Row: Metadata on Left & Stats Pills (Grade, S, N) on Right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
            {/* Metadata (Total Inward, Damage, Date, Phone) */}
            <div className="board-lot-summary-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px', fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.2' }}>
              <span style={{ whiteSpace: 'nowrap' }}>
                Total Inward: <strong style={{ color: 'var(--text-main)' }}>{activeLot.boxes} {activeLot.unit || 'Boxes'}</strong>
              </span>
              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>•</span>
              <span style={{ whiteSpace: 'nowrap', color: Number(activeLot.damage_boxes) > 0 ? '#ef4444' : 'var(--text-secondary)', fontWeight: 700 }}>
                Damage: {activeLot.damage_boxes || 0} {activeLot.unit || ''}
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
                S – {activeLotSoldBoxes} {activeLot.unit === 'KG' ? 'KG' : 'BX'}
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
                N – {liveNetBalanceBoxes} {activeLot.unit === 'KG' ? 'KG' : 'BX'}
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
      {/* TRUCK BIKRI PARCHI HISTORY (Selected Truck Only)                  */}
      {/* Expands / Collapses when clicking the profile div                  */}
      {/* ----------------------------------------------------------------- */}
      {activeLot && showBikriHistory && (
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
          {/* TRUCK BIKRI PARCHI HISTORY (Selected Truck Only)              */}
          {/* ============================================================= */}
          <div style={{ padding: '18px 22px', background: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  📜 Bikri Parchi History — {activeLot.fruit} {activeLot.variety ? `(${activeLot.variety})` : ''} • 🚚 {activeLot.truckno}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {!isSalesPerson && activeLotSales.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Cash Sell: <strong style={{ color: '#059669' }}>₹{activeLotCashSaleTotal.toLocaleString()}</strong>
                      {activeLotCashSaleBoxes > 0 && (
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                          ({activeLotCashSaleBoxes} {activeLot.unit === 'KG' ? 'KG' : 'Boxes'})
                        </span>
                      )}
                    </span>
                    <span>•</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Total Sell: <strong style={{ color: '#10b981' }}>₹{activeLotTotalBikri.toLocaleString()}</strong>
                    </span>
                  </div>
                )}
                {/* Close/Hide Button */}
                <button
                  type="button"
                  onClick={() => setShowBikriHistory(false)}
                  title="Hide Bikri Parchi History"
                  style={{
                    background: 'rgba(100, 116, 139, 0.08)',
                    border: '1px solid rgba(100, 116, 139, 0.25)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px 9px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.16)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.08)'}
                >
                  <ChevronUp size={13} strokeWidth={2.5} />
                  <span>Hide History</span>
                </button>
              </div>
            </div>

            {/* List of Sales Entries for this Truck */}
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
                  Abhi tak is truck ({activeLot.truckno} - {activeLot.fruit}) se koi Bikri Entry nahi hui hai
                </div>
                <div style={{ fontSize: '0.78rem', marginTop: '3px', color: '#10b981', fontWeight: 600 }}>
                  Neeche diye gaye New Sale Entry (Bikri Parchi) me is truck ka fruit select karke save karein
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

                        {!isSalesPerson && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSaleEntry(sale)}
                            title="Delete this sale entry (refunds stock to lot)"
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
                        )}
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

                      {/* Row 3: Date on Left & Boxes/KG × Rate Breakdown on Right */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary, #64748b)', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                          <span>📅</span>
                          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDisplayDate(sale.selling_date)}</span>
                        </div>

                        {/* Math Breakdown: 10 BX × ₹980 or 10 KG × ₹980 */}
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
                          <span style={{ color: '#2563eb', fontWeight: 800 }}>{sale.boxes} {sale.unit === 'KG' ? 'KG' : 'BX'}</span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRUCK-SPECIFIC NEW SALE ENTRY (BIKRI PARCHI) SECTION                     */}
      {/* Opens separately for the selected truck profile                          */}
      {/* ========================================================================= */}
      {activeLot ? (
        <div className="board-standalone-sale-container">
          {/* Section Header */}
          <div className="board-sale-header-bar">
            <div className="board-sale-header-title-box">
              <div className="board-sale-header-main-title">
                <div className="board-sale-header-icon">
                  <ShoppingCart size={18} strokeWidth={2.5} />
                </div>
                <div className="board-sale-title-wrap">
                  <h2 className="board-sale-title">
                    New Sale Entry (Bikri Parchi) — <span className="board-sale-fruit-highlight">{activeLot.fruit} {activeLot.variety ? `(${activeLot.variety})` : ''}</span>
                  </h2>
                </div>
              </div>

              <div className="board-sale-header-meta-row">
                <span className="board-sale-truck-pill">
                  🚚 {activeLot.truckno}
                </span>
                <span className="board-sale-subtitle">
                  Supplier: <strong>{activeLot.supplier_name}</strong>
                </span>
                <span
                  className={`board-sale-lots-badge ${Number(activeLot.balance_box || 0) > 0 ? 'stock-ok' : 'stock-out'}`}
                >
                  <span className="board-sale-stock-lead">
                    {Number(activeLot.balance_box || 0) > 0
                      ? `Stock Available: ${activeLot.balance_box} ${activeLot.unit || 'BX'}`
                      : 'Stock Sold Out (0 Balance)'}
                  </span>
                  {Array.isArray(activeLot.varieties) && activeLot.varieties.length > 1 && (
                    <span className="board-sale-varieties-breakdown">
                      ({activeLot.varieties.map(v => `${v.variety}: ${v.balance_box !== undefined ? v.balance_box : v.boxes}`).join(', ')})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Header Controls: Cash vs Khata Toggle & Sale Date */}
            <div className="board-sale-header-controls">
              {/* Date */}
              <div className="board-sale-date-box">
                <Calendar size={14} color="var(--text-secondary)" />
                <input
                  type="date"
                  value={activeSaleForm.date}
                  onChange={(e) => updateActiveTruckForm('date', e.target.value)}
                  className="board-sale-date-input"
                />
              </div>

              {/* Mode Toggle: Cash vs Name */}
              <div className="board-sale-mode-toggle">
                <button
                  type="button"
                  onClick={() => handleToggleCustomerType('CASH')}
                  className={`board-sale-mode-btn ${activeSaleForm.customerType === 'CASH' ? 'active-cash' : ''}`}
                >
                  <span>💵 Cash Sale (Rokda)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCustomerType('NAME')}
                  className={`board-sale-mode-btn ${activeSaleForm.customerType === 'NAME' ? 'active-name' : ''}`}
                >
                  <span>👤 Customer / Khata (Name)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer Info Bar */}
          <div
            className="board-sale-cust-grid"
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '10px 14px'
            }}
          >
            {activeSaleForm.customerType === 'CASH' ? (
              <div className="board-sale-cash-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Billing Party:</span>
                  <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '3px 10px', borderRadius: '6px', fontWeight: 900, fontSize: '0.86rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    💵 CASH SALE
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Customer Name *
                </label>
                <input
                  ref={saleCustInputRef}
                  type="text"
                  placeholder="Type customer name (e.g. Rahul, Sharmaji)"
                  value={activeSaleForm.customerName}
                  onChange={(e) => handleSaleCustomerChange(e.target.value)}
                  onFocus={() => activeSaleForm.customerName && handleSaleCustomerChange(activeSaleForm.customerName)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: '1.5px solid var(--border-focus)',
                    background: 'var(--bg-surface)',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
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
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
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
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{c.customer_name}</span>
                        <span style={{ color: Number(c.current_balance || 0) > 0 ? '#ef4444' : '#10b981', fontSize: '0.74rem', fontWeight: 800 }}>
                          Due: ₹{Number(c.current_balance || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Truck Produce & Stock Items Section */}
          {Number(activeLot.balance_box || 0) <= 0 ? (
            <div
              style={{
                background: 'var(--bg-main)',
                border: '1.5px dashed var(--border-subtle)',
                borderRadius: '12px',
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>🏁</div>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                Is truck ({activeLot.truckno} - {activeLot.fruit}) ka poora stock sell ho chuka hai! (0 Balance)
              </div>
              <div style={{ fontSize: '0.80rem', marginTop: '4px' }}>
                Nayi bikri entry karne ke liye upar diye gaye list me se doosra active truck select karein.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveSaleEntry} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Table / Grid Container */}
              <div className="board-sale-table-wrapper">
                <div className="board-sale-items-list">
                  {/* Desktop-only Column Header */}
                  <div className="board-sale-table-header">
                    <span style={{ textAlign: 'center' }}>#</span>
                    <span>Item / Variety</span>
                    <span style={{ textAlign: 'center' }}>Unit</span>
                    <span>Qty</span>
                    <span>Rate (₹)</span>
                    <span>Total (₹)</span>
                    <span style={{ textAlign: 'center' }}>Act</span>
                  </div>

                  {/* Items List */}
                  {(activeSaleForm.items || []).map((item, idx) => {
                    const availBal = Number(activeLot.balance_box || 0);
                    const lotUnit = activeLot.unit || 'BX';
                    const lotVars = getLotVarietiesList(activeLot);
                    const selectedVarName = (item.variety || lotVars[0]?.variety || activeLot.variety || '').trim();
                    const selectedVarObj = lotVars.find(v => (v.variety || '').trim().toLowerCase() === selectedVarName.toLowerCase());
                    const varAvail = selectedVarObj && selectedVarObj.balance_box !== undefined ? Number(selectedVarObj.balance_box) : availBal;

                    return (
                      <div key={item.id || idx} className="board-sale-item-card">
                        {/* Desktop Row Index */}
                        <div className="board-sale-row-idx hide-on-mobile-tab">
                          {idx + 1}
                        </div>

                        {/* Item / Variety Selection Column */}
                        <div className="board-sale-fruit-col">
                          {lotVars.length > 1 ? (
                            <div
                              style={{
                                padding: '5px 10px',
                                background: 'var(--bg-main)',
                                border: '1.5px solid var(--border-focus, #3b82f6)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                minHeight: '38px',
                                boxSizing: 'border-box'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🍎</span>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', lineHeight: 1.1 }}>
                                    {activeLot.fruit} • Variety
                                  </span>
                                  <select
                                    value={selectedVarName}
                                    onChange={(e) => handleUpdateTruckSaleItem(idx, 'variety', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '2px 0',
                                      background: 'transparent',
                                      border: 'none',
                                      fontSize: '0.88rem',
                                      fontWeight: 800,
                                      color: 'var(--text-main)',
                                      cursor: 'pointer',
                                      outline: 'none'
                                    }}
                                  >
                                    {lotVars.map((v, vIdx) => {
                                      const vBal = v.balance_box !== undefined ? v.balance_box : availBal;
                                      return (
                                        <option key={vIdx} value={v.variety} style={{ background: 'var(--bg-surface)', color: 'var(--text-main)' }}>
                                          {v.variety} (Bal: {vBal} {lotUnit})
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              </div>
                              {(activeSaleForm.items || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTruckSaleItem(idx)}
                                  title="Remove item"
                                  className="board-sale-remove-btn hide-on-desktop-tab"
                                  style={{ flexShrink: 0 }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: '8px 12px',
                                background: 'var(--bg-main)',
                                border: '1.5px solid var(--border-subtle)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '1.1rem' }}>🍎</span>
                                <strong style={{ color: 'var(--text-main)', fontSize: '0.90rem' }}>
                                  {activeLot.fruit}{activeLot.variety ? ` -- ${activeLot.variety}` : ''}
                                </strong>
                              </div>
                              {(activeSaleForm.items || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTruckSaleItem(idx)}
                                  title="Remove item"
                                  className="board-sale-remove-btn hide-on-desktop-tab"
                                  style={{ flexShrink: 0 }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Desktop Unit Badge */}
                        <div className="board-sale-unit-col hide-on-mobile-tab">
                          <span className={`board-sale-unit-badge ${lotUnit.toLowerCase() === 'kg' ? 'unit-kg' : 'unit-bx'}`}>
                            {lotUnit}
                          </span>
                        </div>

                        {/* Inputs Group: Qty, Rate, Total */}
                        <div className="board-sale-inputs-group">
                          {/* Quantity Input */}
                          <div className="board-sale-qty-col">
                            <label className="board-sale-input-label">
                              Qty {lotUnit ? `(${lotUnit})` : ''}
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max={varAvail || undefined}
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => handleUpdateTruckSaleItem(idx, 'quantity', e.target.value)}
                              required
                              className="board-sale-input board-sale-input-qty"
                            />
                          </div>

                          {/* Rate Input */}
                          <div className="board-sale-rate-col">
                            <label className="board-sale-input-label">
                              Rate (₹/{lotUnit})
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              step="any"
                              placeholder={`Rate/${lotUnit}`}
                              value={item.rate}
                              onChange={(e) => handleUpdateTruckSaleItem(idx, 'rate', e.target.value)}
                              required
                              className="board-sale-input board-sale-input-rate"
                            />
                          </div>

                          {/* Total Amount Input */}
                          <div className="board-sale-total-col">
                            <label className="board-sale-input-label">
                              Total (₹)
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              placeholder="Total"
                              value={item.total_amount}
                              onChange={(e) => handleUpdateTruckSaleItem(idx, 'total_amount', e.target.value)}
                              className="board-sale-input board-sale-input-total"
                            />
                          </div>
                        </div>

                        {/* Desktop Action: Remove */}
                        <div className="board-sale-act-col hide-on-mobile-tab">
                          <button
                            type="button"
                            onClick={() => handleRemoveTruckSaleItem(idx)}
                            disabled={(activeSaleForm.items || []).length <= 1}
                            title="Remove item"
                            className="board-sale-remove-btn"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row Action: + Add More Rate/Grade Item */}
              <div className="board-sale-add-item-wrap">
                <button
                  type="button"
                  onClick={handleAddTruckSaleItem}
                  className="board-sale-add-item-btn"
                >
                  <Plus size={15} strokeWidth={3} />
                  <span>Add Another Item ({activeLot.fruit} • {activeLot.truckno})</span>
                </button>
              </div>

              {/* Billing Footer: Payment Details & Save Button */}
              <div className="board-sale-footer-bar">
                {/* Summary & Payment Controls Grid */}
                <div className="board-sale-footer-grid">
                  <div className="board-sale-footer-stat-box">
                    <span className="board-sale-footer-stat-label">Payment Mode</span>
                    <select
                      value={activeSaleForm.paymentMode}
                      onChange={(e) => updateActiveTruckForm('paymentMode', e.target.value)}
                      className="board-sale-footer-select"
                    >
                      <option value="CASH">Cash (Rokda)</option>
                      <option value="CREDIT">Khata / Udhaar (Credit)</option>
                      <option value="UPI">UPI / GPay</option>
                    </select>
                  </div>

                  {activeSaleForm.customerType === 'NAME' && (
                    <div className="board-sale-footer-stat-box">
                      <span className="board-sale-footer-stat-label">Amount Paid (₹)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="₹ 0"
                        value={activeSaleForm.amountPaid}
                        onChange={(e) => updateActiveTruckForm('amountPaid', e.target.value)}
                        className="board-sale-footer-input"
                      />
                    </div>
                  )}

                  <div className={`board-sale-footer-total-box ${activeSaleForm.customerType === 'NAME' ? 'span-full-on-mobile' : ''}`}>
                    <span className="board-sale-footer-total-label">Grand Total</span>
                    <span className="board-sale-footer-total-val">
                      ₹{truckParchiGrandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Save Button */}
                <div className="board-sale-footer-action">
                  <button
                    type="submit"
                    disabled={isSubmittingSale || Number(activeLot.balance_box || 0) <= 0}
                    className="board-sale-submit-btn"
                  >
                    <Check size={16} strokeWidth={3} />
                    <span>{isSubmittingSale ? 'Saving Parchi...' : 'Save Bikri Parchi ↵'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'center',
            border: '1.5px dashed var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}
        >
          <ShoppingCart size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block', opacity: 0.6 }} />
          <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-main)' }}>
            Koi Truck Lot Selected Nahi Hai
          </div>
          <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Nayi bikri parchi enter karne ke liye upar diye gaye kisi bhi truck lot card ko click karein.
          </div>
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
            className="lot-delivery-modal-dialog mandi-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 18px',
                background: 'var(--bg-modal-header, #f8fafc)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}
                >
                  <Plus size={18} strokeWidth={3} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    Lot Delivery Entry Form
                  </h3>
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

            {/* Modal Form with Scrollable Body & Pinned Footer */}
            <form onSubmit={handleSaveLotDelivery} className="lot-delivery-modal-form">
              <div className="lot-delivery-modal-body">
                {/* Row 1: Supplier Name & Truck No */}
                <div className="lot-modal-grid-sup-truck">
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Supplier Name * <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>(Space dabakar all recent dekhein)</span>
                    </label>
                    <input
                      ref={supplierInputRef}
                      type="text"
                      className="form-control"
                      placeholder="e.g. Piyush Traders (Press Space for all recent)"
                      value={lotForm.supplier_name}
                      onChange={(e) => handleSupplierNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Spacebar') {
                          const pool = getRecentSuppliersPool();
                          setSupplierSuggestions(pool);
                          setShowSupplierSuggestions(pool.length > 0);
                        } else if (e.key === 'ArrowDown') {
                          if (showSupplierSuggestions && supplierSuggestions.length > 0) {
                            e.preventDefault();
                            setActiveSupplierSuggestIdx(prev => (prev < supplierSuggestions.length - 1 ? prev + 1 : 0));
                          }
                        } else if (e.key === 'ArrowUp') {
                          if (showSupplierSuggestions && supplierSuggestions.length > 0) {
                            e.preventDefault();
                            setActiveSupplierSuggestIdx(prev => (prev > 0 ? prev - 1 : supplierSuggestions.length - 1));
                          }
                        } else if (e.key === 'Enter') {
                          if (showSupplierSuggestions && activeSupplierSuggestIdx >= 0 && supplierSuggestions[activeSupplierSuggestIdx]) {
                            e.preventDefault();
                            handleSelectSupplierSuggestion(supplierSuggestions[activeSupplierSuggestIdx]);
                          }
                        } else if (e.key === 'Escape') {
                          setShowSupplierSuggestions(false);
                        }
                      }}
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
                          maxHeight: '190px',
                          overflowY: 'auto',
                          marginTop: '2px'
                        }}
                      >
                        <div
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.68rem',
                            color: '#10b981',
                            fontWeight: 800,
                            background: 'rgba(16, 185, 129, 0.08)',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>RECENT SUPPLIERS ({supplierSuggestions.length})</span>
                          <span style={{ fontSize: '0.64rem', color: 'var(--text-secondary)' }}>Click / Press Enter ↵</span>
                        </div>
                        {supplierSuggestions.map((s, idx) => {
                          const isItemActive = idx === activeSupplierSuggestIdx;
                          return (
                            <div
                              key={s.id || idx}
                              onMouseDown={() => handleSelectSupplierSuggestion(s)}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border-subtle)',
                                fontSize: '0.82rem',
                                background: isItemActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = isItemActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent'}
                            >
                              <div>
                                <strong style={{ color: 'var(--text-main)', display: 'block' }}>{s.supplier_name || s.name}</strong>
                                {s.truckno && (
                                  <span style={{ fontSize: '0.70rem', color: '#2563eb', fontFamily: 'monospace' }}>
                                    🚚 {s.truckno}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>{s.phone || 'Supplier'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Truck Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WB12C8934"
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

                {/* Row 2: Fruit Name & Inward Unit Type */}
                <div className="lot-modal-grid-sup-truck">
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
                      Inward Unit Type *
                    </label>
                    <select
                      value={lotForm.unit || 'BOX'}
                      onChange={(e) => setLotForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="form-control"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        color: 'var(--text-main)',
                        cursor: 'pointer'
                      }}
                    >
                      {INWARD_UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Varieties & Box Breakdown Section */}
                <div
                  style={{
                    background: 'var(--bg-main, #f8fafc)',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', margin: 0 }}>
                      Variety & Quantity ({lotForm.unit || 'BOX'})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddVarietyRow}
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '6px',
                        color: '#059669',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Plus size={13} strokeWidth={3} />
                      <span>Add Variety</span>
                    </button>
                  </div>

                  {/* Variety Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(lotForm.varieties || [{ variety: '', boxes: '' }]).map((vRow, vIdx) => {
                      const hasMultiple = (lotForm.varieties || []).length > 1;
                      return (
                        <div
                          key={vIdx}
                          className={`lot-modal-variety-row ${hasMultiple ? '' : 'single'}`}
                        >
                          <div>
                            <input
                              type="text"
                              placeholder={`Variety ${hasMultiple ? `#${vIdx + 1}` : ''} (e.g. Kashmiri / Shimla)`}
                              value={vRow.variety}
                              onChange={(e) => handleVarietyChange(vIdx, 'variety', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '7px',
                                border: '1.5px solid var(--border-subtle)',
                                background: 'var(--bg-surface)',
                                fontWeight: 700,
                                fontSize: '0.86rem',
                                color: 'var(--text-main)'
                              }}
                            />
                          </div>

                          <div>
                            <input
                              type="number"
                              min="0"
                              placeholder={`${lotForm.unit || 'BOX'} Qty`}
                              value={vRow.boxes}
                              onChange={(e) => handleVarietyChange(vIdx, 'boxes', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '7px',
                                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                                background: 'var(--bg-surface)',
                                fontWeight: 800,
                                fontSize: '0.86rem',
                                color: '#059669'
                              }}
                            />
                          </div>

                          {hasMultiple && (
                            <div>
                              <button
                                type="button"
                                onClick={() => handleRemoveVarietyRow(vIdx)}
                                title="Remove this variety"
                                style={{
                                  width: '36px',
                                  height: '34px',
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#ef4444',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Row 3: Total Quantity & Damage Quantity */}
                <div className="lot-modal-grid-2col">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
                        Total Quantity ({lotForm.unit || 'BOX'}) *
                      </label>
                      {(lotForm.varieties || []).length > 1 && (
                        <span style={{ fontSize: '0.67rem', color: '#10b981', fontWeight: 800 }}>
                          (Auto Sum of Varieties)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      placeholder={`e.g. 1000 ${lotForm.unit || 'BOX'}`}
                      value={lotForm.boxes}
                      onChange={(e) => setLotForm({ ...lotForm, boxes: e.target.value })}
                      required
                      readOnly={(lotForm.varieties || []).length > 1}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #10b981',
                        background: (lotForm.varieties || []).length > 1 ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                        fontWeight: 900,
                        fontSize: '1.05rem',
                        color: '#10b981'
                      }}
                    />
                    {(lotForm.varieties || []).length > 1 && (
                      <div style={{
                        marginTop: '6px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px'
                      }}>
                        {lotForm.varieties.map((v, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.69rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            {v.variety || `Var #${idx + 1}`}: {v.boxes || 0}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {(lotForm.varieties || []).length > 1 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>
                            Damage Quantity ({lotForm.unit || 'BOX'})
                          </label>
                          <span style={{
                            fontSize: '0.69rem',
                            fontWeight: 800,
                            color: '#ef4444',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '1px 7px',
                            borderRadius: '6px'
                          }}>
                            Total Damage: {lotForm.damage_boxes || 0}
                          </span>
                        </div>

                        <div style={{
                          background: 'var(--bg-main, #f8fafc)',
                          border: '1.5px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          maxHeight: '160px',
                          overflowY: 'auto'
                        }}>
                          {lotForm.varieties.map((vRow, vIdx) => {
                            const vName = (vRow.variety || '').trim() || `Variety #${vIdx + 1}`;
                            const vQty = Number(vRow.boxes) || 0;
                            return (
                              <div
                                key={vIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '6px',
                                  padding: '5px 8px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                                  <span style={{
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    color: 'var(--text-main)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {vName}
                                  </span>
                                  {vQty > 0 && (
                                    <span style={{ fontSize: '0.67rem', color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                      ({vQty} {lotForm.unit || 'BOX'})
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444' }}>Dmg:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={vQty > 0 ? vQty : undefined}
                                    placeholder="0"
                                    value={vRow.damage_boxes ?? ''}
                                    onChange={(e) => handleVarietyChange(vIdx, 'damage_boxes', e.target.value)}
                                    style={{
                                      width: '68px',
                                      padding: '4px 6px',
                                      borderRadius: '5px',
                                      border: '1.5px solid rgba(239, 68, 68, 0.4)',
                                      background: 'var(--bg-surface)',
                                      fontWeight: 800,
                                      fontSize: '0.84rem',
                                      color: '#ef4444',
                                      textAlign: 'right'
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '4px' }}>
                          Damage Quantity ({lotForm.unit || 'BOX'})
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="0"
                          value={lotForm.damage_boxes ?? ''}
                          onChange={(e) => handleSingleDamageChange(e.target.value)}
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
                    )}
                  </div>
                </div>

                {/* Row 4: Date & Phone */}
                <div className="lot-modal-grid-2col">
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
              </div>

              {/* Pinned Modal Footer */}
              <div
                style={{
                  padding: '12px 18px',
                  background: 'var(--bg-modal-header, #f8fafc)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: 0
                }}
              >
                {/* Net Balance Preview Strip */}
                {Number(lotForm.boxes) > 0 && (
                  <div
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '6px',
                      fontSize: '0.80rem',
                      fontWeight: 800
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Inward: {lotForm.boxes} {lotForm.unit || 'BOX'} - Damage: {lotForm.damage_boxes || 0} {lotForm.unit || 'BOX'}
                    </span>
                    <span style={{ color: '#059669' }}>
                      Available Net Balance: {Math.max(0, (Number(lotForm.boxes) || 0) - (Number(lotForm.damage_boxes) || 0))} {lotForm.unit || 'BOX'}
                    </span>
                  </div>
                )}

                {/* Modal Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Bulk Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportSuccess={() => {
          setIsExcelModalOpen(false);
          window.dispatchEvent(new CustomEvent('erp:refresh-data'));
        }}
        showToast={showToast}
      />
    </div>
  );
}
