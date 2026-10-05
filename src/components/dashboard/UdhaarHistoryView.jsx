import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Search,
  BookOpen,
  FileSpreadsheet
} from 'lucide-react';

export default function UdhaarHistoryView({
  truckSalesList = [],
  customerProfiles = [],
  salesList = [],
  supplierProfiles = [],
  purchasesList = [],
  onBack,
  getSystemDate,
  showToast
}) {
  const sysDate = getSystemDate ? getSystemDate() : new Date().toISOString().slice(0, 10);

  // Date Range Filter States (From Date & To Date)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState(''); // 'TODAY' | 'YESTERDAY' | 'LAST7' | 'CUSTOM'
  const [searchQuery, setSearchQuery] = useState('');

  // Helper date normalizer
  const normalizeDateStr = (rawDate) => {
    if (!rawDate) return '';
    const s = String(rawDate).trim();
    if (s.includes('T')) return s.split('T')[0];
    if (s.length >= 10) return s.slice(0, 10);
    return s;
  };

  const formatDateLabel = (dStr) => {
    if (!dStr) return '';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch { }
    return dStr;
  };

  // Quick Date Range Handler (Today, Yesterday, Last 7 Days)
  const handleQuickPreset = (preset) => {
    setActiveDatePreset(preset);
    const today = sysDate;

    if (preset === 'TODAY') {
      setFromDate(today);
      setToDate(today);
      return;
    }

    if (preset === 'YESTERDAY') {
      try {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        const yStr = d.toISOString().slice(0, 10);
        setFromDate(yStr);
        setToDate(yStr);
      } catch {
        setFromDate(today);
        setToDate(today);
      }
      return;
    }

    if (preset === 'LAST7') {
      try {
        const d = new Date(today);
        d.setDate(d.getDate() - 6);
        const pastStr = d.toISOString().slice(0, 10);
        setFromDate(pastStr);
        setToDate(today);
      } catch {
        setFromDate(today);
        setToDate(today);
      }
      return;
    }
  };

  // Consolidate all sales and filter for Udhaar / Credit Sales
  const allUdhaarSales = useMemo(() => {
    const salesMap = new Map();

    // 1. From truckSalesList (rapid board sales)
    (truckSalesList || []).forEach(s => {
      if (s && s.id !== undefined && s.id !== null) {
        salesMap.set(String(s.id), {
          ...s,
          source: 'board'
        });
      }
    });

    // 2. From customer buy_history
    (customerProfiles || []).forEach(c => {
      (c.buy_history || []).forEach(b => {
        if (b && b.id !== undefined && b.id !== null && !salesMap.has(String(b.id))) {
          salesMap.set(String(b.id), {
            id: b.id,
            selling_date: b.date || b.selling_date,
            customer_name: c.customer_name || 'Customer',
            customer_phone: c.phone || '',
            truck_no: b.truck_no || '',
            supplier_name: b.supplier_name || '',
            product_name: b.product_name || 'Fresh Produce',
            boxes: Number(b.boxes || 0),
            rate_per_box: Number(b.rate_per_box || 0),
            total: Number(b.total || 0),
            payment_mode: b.payment_mode || 'CREDIT',
            amount_paid: b.amount_paid !== undefined ? Number(b.amount_paid) : 0,
            source: 'customer_history'
          });
        }
      });
    });

    // 3. From backend salesList
    (salesList || []).forEach(s => {
      if (s && s.id !== undefined && s.id !== null && !salesMap.has(String(s.id))) {
        const sTotal = Number(s.total_amount || s.final_amount || s.total || 0);
        const sPaid = s.amount_paid !== undefined && s.amount_paid !== null
          ? Number(s.amount_paid)
          : (s.payment_type === 'CASH' || s.payment_mode === 'CASH' ? sTotal : 0);
        const sBoxes = Number(s.total_boxes || s.boxes || s.quantity || 0);
        const sRate = Number(s.rate || s.rate_per_box || (sBoxes > 0 ? sTotal / sBoxes : 0));

        salesMap.set(String(s.id), {
          id: s.id,
          selling_date: s.sale_date || s.date || (s.created_at ? String(s.created_at).slice(0, 10) : ''),
          customer_name: s.customer_name || 'Customer',
          customer_phone: s.customer_phone || '',
          truck_no: s.truck_no || s.truck_number || '',
          supplier_name: s.supplier_name || s.supplier || '',
          product_name: s.product_name || s.fruit || 'Produce',
          boxes: sBoxes,
          rate_per_box: sRate,
          total: sTotal,
          payment_mode: s.payment_type || s.payment_mode || (s.is_cash ? 'CASH' : 'CREDIT'),
          amount_paid: sPaid,
          source: 'backend_sales'
        });
      }
    });

    const list = [];

    // Filter only Udhaar (unpaid > 0)
    salesMap.forEach(s => {
      const tot = Number(s.total || 0);
      const mode = String(s.payment_mode || '').toUpperCase();
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

      // Check if this sale has Udhaar
      const isUdhaar = unpaid > 0 || (isExplicitCredit && paid < tot);
      if (!isUdhaar) return;

      const dateStr = normalizeDateStr(s.selling_date || s.date || s.sale_date || sysDate);

      // Resolve Supplier Name if missing
      let suppName = (s.supplier_name || '').trim();
      if (!suppName && s.lot_id) {
        const matchedLot = (supplierProfiles || []).find(l => String(l.id) === String(s.lot_id));
        if (matchedLot) suppName = matchedLot.supplier_name;
      }
      if (!suppName && s.truck_no) {
        const matchedLotByTruck = (supplierProfiles || []).find(l =>
          (l.truckno || '').trim().toLowerCase() === (s.truck_no || '').trim().toLowerCase()
        );
        if (matchedLotByTruck) suppName = matchedLotByTruck.supplier_name;
      }
      if (!suppName && s.truck_no) {
        const matchedPurch = (purchasesList || []).find(p =>
          (p.truck_number || '').trim().toLowerCase() === (s.truck_no || '').trim().toLowerCase()
        );
        if (matchedPurch) suppName = matchedPurch.supplier_name;
      }
      if (!suppName) {
        suppName = 'Supplier Lot';
      }

      const boxes = Number(s.boxes || 0);
      let rate = Number(s.rate_per_box || 0);
      if (!rate && boxes > 0 && tot > 0) {
        rate = Math.round(tot / boxes);
      }

      list.push({
        ...s,
        date: dateStr,
        supplier_name: suppName,
        boxes,
        rate_per_box: rate,
        total: tot,
        unpaid_amount: unpaid > 0 ? unpaid : tot,
        paid_amount: paid,
        customer_display: s.customer_name || 'Khata Customer'
      });
    });

    // Sort descending by date, then id
    return list.sort((a, b) => {
      const cmp = String(b.date).localeCompare(String(a.date));
      if (cmp !== 0) return cmp;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [truckSalesList, customerProfiles, salesList, supplierProfiles, purchasesList, sysDate]);

  // Apply filters: Date Range (From & To) + Search Query
  const filteredSales = useMemo(() => {
    return allUdhaarSales.filter(item => {
      // 1. Date Range: From Date
      if (fromDate && item.date < fromDate) {
        return false;
      }
      // 2. Date Range: To Date
      if (toDate && item.date > toDate) {
        return false;
      }
      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (item.supplier_name || '').toLowerCase().includes(q) ||
          (item.product_name || '').toLowerCase().includes(q) ||
          (item.customer_display || '').toLowerCase().includes(q) ||
          String(item.total).includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allUdhaarSales, fromDate, toDate, searchQuery]);

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    let totalUdhaarAmount = 0;
    let totalBoxes = 0;

    filteredSales.forEach(s => {
      totalUdhaarAmount += Number(s.unpaid_amount || s.total || 0);
      totalBoxes += Number(s.boxes || 0);
    });

    return {
      totalUdhaarAmount,
      totalBoxes,
      count: filteredSales.length
    };
  }, [filteredSales]);

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['S.No', 'Date', 'Supplier Name', 'Total Box', 'Per Box Rate', 'Udhaar Amount', 'Customer Name', 'Produce'];
      const csvRows = [headers.join(',')];

      filteredSales.forEach((s, idx) => {
        const row = [
          idx + 1,
          `"${s.date}"`,
          `"${(s.supplier_name || '').replace(/"/g, '""')}"`,
          s.boxes,
          s.rate_per_box,
          s.unpaid_amount || s.total,
          `"${(s.customer_display || '').replace(/"/g, '""')}"`,
          `"${(s.product_name || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Udhaar_History_${fromDate || 'All'}_to_${toDate || 'All'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (showToast) showToast('Udhaar CSV downloaded successfully');
    } catch {
      if (showToast) showToast('Error exporting CSV', 'error');
    }
  };

  return (
    <div
      className="udhaar-history-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: 'auto',
        width: '100%',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      <style>{`
        .udhaar-history-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: auto;
          width: 100%;
          animation: fadeIn 0.2s ease-in-out;
        }

        /* NAVBAR COMPACT BASE STYLES */
        .udhaar-navbar {
          padding: 8px 14px;
          gap: 6px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          z-index: 40;
          background: var(--bg-card, #ffffff);
          backdrop-filter: blur(12px);
          border: 1.5px solid var(--border-subtle, #e2e8f0);
          box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.06));
        }
        .udhaar-nav-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          flex-wrap: wrap;
        }
        .udhaar-nav-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .udhaar-nav-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .udhaar-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 7px;
          background: rgba(239, 68, 68, 0.09);
          border: 1.5px solid rgba(239, 68, 68, 0.3);
          color: #dc2626;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .udhaar-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
        }
        .udhaar-nav-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          letter-spacing: -0.01em;
        }
        .udhaar-nav-badge {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
          font-weight: 800;
          font-size: 0.65rem;
          padding: 2px 5px;
          border-radius: 5px;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .udhaar-nav-subtitle {
          font-size: 0.72rem;
          color: var(--text-muted, #64748b);
          margin-top: 1px;
        }
        .udhaar-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-main, #f8fafc);
          border: 1px solid var(--border-light, #cbd5e1);
          padding: 4px 8px;
          border-radius: 7px;
          height: 30px;
          box-sizing: border-box;
        }
        .udhaar-search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.78rem;
          color: var(--text-main, #0f172a);
          width: 150px;
        }
        .udhaar-csv-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 7px;
          background: var(--bg-main, #f8fafc);
          border: 1.5px solid var(--border-light, #cbd5e1);
          color: var(--text-secondary, #475569);
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          height: 30px;
          box-sizing: border-box;
          white-space: nowrap;
        }
        .udhaar-nav-bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding-top: 6px;
          border-top: 1px solid var(--border-subtle, #f1f5f9);
          flex-wrap: wrap;
        }
        .udhaar-date-container {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(239, 68, 68, 0.05);
          border: 1.5px solid rgba(239, 68, 68, 0.28);
          padding: 3px 8px;
          border-radius: 8px;
          height: 30px;
          box-sizing: border-box;
        }
        .udhaar-date-group {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .udhaar-date-input {
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          padding: 2px 5px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          cursor: pointer;
          height: 24px;
          box-sizing: border-box;
        }
        .udhaar-date-arrow {
          color: #dc2626;
          font-weight: 800;
          font-size: 0.78rem;
        }
        .udhaar-date-clear-btn {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 0.68rem;
          font-weight: 700;
          cursor: pointer;
          margin-left: 2px;
        }
        .udhaar-quick-presets {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .udhaar-quick-btn {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.15s ease;
          height: 24px;
          box-sizing: border-box;
          white-space: nowrap;
        }

        /* MOBILE RESPONSIVE SLEEK COMPACT STYLES (≤ 768px) */
        @media (max-width: 768px) {
          .udhaar-history-container {
            gap: 8px !important;
          }
          .udhaar-navbar {
            padding: 6px 10px !important;
            gap: 5px !important;
            border-radius: 10px !important;
          }
          .udhaar-nav-subtitle {
            display: none !important;
          }
          .udhaar-nav-top-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 6px !important;
          }
          .udhaar-back-btn {
            padding: 4px 7px !important;
            font-size: 0.72rem !important;
            gap: 3px !important;
            border-radius: 6px !important;
          }
          .udhaar-icon-box {
            width: 24px !important;
            height: 24px !important;
            border-radius: 6px !important;
          }
          .udhaar-icon-box svg {
            width: 13px !important;
            height: 13px !important;
          }
          .udhaar-nav-title {
            font-size: 0.94rem !important;
          }
          .udhaar-nav-badge {
            font-size: 0.62rem !important;
            padding: 1px 4px !important;
          }
          .udhaar-nav-right {
            width: 100% !important;
            display: flex !important;
            gap: 6px !important;
            margin-top: 1px !important;
          }
          .udhaar-search-box {
            flex: 1 !important;
            width: auto !important;
            padding: 3px 8px !important;
            height: 30px !important;
          }
          .udhaar-search-input {
            width: 100% !important;
            font-size: 0.76rem !important;
          }
          .udhaar-csv-btn {
            padding: 3px 8px !important;
            font-size: 0.72rem !important;
            height: 30px !important;
          }
          .udhaar-nav-bottom-row {
            padding-top: 4px !important;
            gap: 4px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .udhaar-date-container {
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            width: 100% !important;
            padding: 3px 5px !important;
            gap: 3px !important;
            height: auto !important;
            min-height: 30px !important;
            box-sizing: border-box !important;
          }
          .udhaar-date-label {
            display: none !important;
          }
          .udhaar-date-group {
            display: flex !important;
            align-items: center !important;
            gap: 2px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }
          .udhaar-date-sublabel {
            font-size: 0.68rem !important;
            color: #475569 !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
          }
          .udhaar-date-input {
            flex: 1 !important;
            min-width: 0 !important;
            width: 100% !important;
            height: 26px !important;
            padding: 1px 3px !important;
            font-size: 0.7rem !important;
            border-radius: 4px !important;
          }
          .udhaar-date-arrow {
            color: #dc2626 !important;
            font-weight: 800 !important;
            font-size: 0.72rem !important;
            flex-shrink: 0 !important;
          }
          .udhaar-date-clear-btn {
            font-size: 0.65rem !important;
            padding: 2px 4px !important;
            flex-shrink: 0 !important;
          }
          .udhaar-quick-presets {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            width: 100% !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            padding: 1px 0 !important;
          }
          .udhaar-quick-presets::-webkit-scrollbar {
            display: none !important;
          }
          .udhaar-quick-label {
            font-size: 0.68rem !important;
            flex-shrink: 0 !important;
          }
          .udhaar-quick-btn {
            padding: 2px 7px !important;
            font-size: 0.68rem !important;
            height: 22px !important;
            border-radius: 5px !important;
            flex-shrink: 0 !important;
          }

          /* Table Mobile Polish & Compact Height */
          .udhaar-table-wrapper {
            margin: 0 !important;
          }
          .udhaar-table-header-bar {
            padding: 5px 8px !important;
            font-size: 0.74rem !important;
          }
          .udhaar-table th, .udhaar-table td {
            padding: 5px 6px !important;
          }
          .udhaar-th-date, .udhaar-td-date {
            width: 72px !important;
            min-width: 68px !important;
            font-size: 0.74rem !important;
          }
          .udhaar-th-total, .udhaar-td-total {
            width: 82px !important;
            min-width: 78px !important;
          }
          .udhaar-table-supplier-title {
            font-size: 0.84rem !important;
            line-height: 1.2 !important;
          }
          .udhaar-table-box-rate {
            font-size: 0.65rem !important;
            padding: 1px 4px !important;
            gap: 3px !important;
            flex-wrap: nowrap !important;
            margin-top: 1px !important;
            line-height: 1.2 !important;
            border-radius: 4px !important;
            white-space: nowrap !important;
          }
          .udhaar-table-total-amt {
            font-size: 0.88rem !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>

      {/* ===================================================================== */}
      {/* 1. TOP NAVBAR / HEADER WITH CALENDAR (FROM & TO DATE PICKERS)         */}
      {/* ===================================================================== */}
      <div className="udhaar-navbar">
        {/* Top Row: Back button, Title & Search */}
        <div className="udhaar-nav-top-row">
          {/* Left: Back button & Title */}
          <div className="udhaar-nav-left">
            <button
              onClick={onBack}
              title="Return to Mandi Board"
              className="udhaar-back-btn"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="udhaar-icon-box">
                <BookOpen size={15} color="#ffffff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <h2 className="udhaar-nav-title">
                    Udhaar History
                  </h2>
                  <span className="udhaar-nav-badge">
                    KHATA
                  </span>
                </div>
                <div className="udhaar-nav-subtitle">
                  Complete record of udhaar credit sales, customer khata, boxes, rates and balance due
                </div>
              </div>
            </div>
          </div>

          {/* Right: Search box & CSV */}
          <div className="udhaar-nav-right">
            <div className="udhaar-search-box">
              <Search size={13} color="var(--text-muted, #64748b)" />
              <input
                type="text"
                placeholder="Search supplier, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="udhaar-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={handleExportCSV}
              title="Export Udhaar History to Excel/CSV"
              className="udhaar-csv-btn"
            >
              <FileSpreadsheet size={13} color="#dc2626" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Bottom Row of Navbar: CALENDAR DATE RANGE PICKER (FROM & TO) & CLEAN QUICK FILTERS */}
        <div className="udhaar-nav-bottom-row">
          {/* CALENDAR INPUTS CONTAINER */}
          <div className="udhaar-date-container">
            <div className="udhaar-date-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontWeight: 800, fontSize: '0.74rem' }}>
              <Calendar size={13} color="#dc2626" />
              <span>Date:</span>
            </div>

            {/* FROM DATE */}
            <div className="udhaar-date-group">
              <span className="udhaar-date-sublabel">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                }}
                className="udhaar-date-input"
              />
            </div>

            <span className="udhaar-date-arrow">→</span>

            {/* TO DATE */}
            <div className="udhaar-date-group">
              <span className="udhaar-date-sublabel">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                }}
                className="udhaar-date-input"
              />
            </div>

            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setActiveDatePreset('');
                }}
                title="Clear Date Range"
                className="udhaar-date-clear-btn"
              >
                Clear
              </button>
            )}
          </div>

          {/* QUICK PRESETS CHIPS (Today, Yesterday, Last 7 Days) */}
          <div className="udhaar-quick-presets">
            <span className="udhaar-quick-label" style={{ fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>Quick:</span>
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST7', label: 'Last 7 Days' }
            ].map(chip => {
              const active = activeDatePreset === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => handleQuickPreset(chip.id)}
                  className="udhaar-quick-btn"
                  style={{
                    fontWeight: active ? 800 : 600,
                    border: active ? '1.5px solid #dc2626' : '1px solid var(--border-light, #cbd5e1)',
                    background: active ? '#ef4444' : 'var(--bg-main, #f8fafc)',
                    color: active ? '#ffffff' : 'var(--text-secondary, #475569)'
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. UDHAAR HISTORY TABLE (DATE, SUPPLIER WITH BOX/RATE, TOTAL AMOUNT)   */}
      {/* ===================================================================== */}
      <div
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '12px',
          border: '1.5px solid var(--border-subtle, #e2e8f0)',
          boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.04))',
          overflow: 'hidden'
        }}
      >
        {/* Table Header Bar */}
        <div
          className="udhaar-table-header-bar"
          style={{
            padding: '6px 12px',
            borderBottom: '1.5px solid var(--border-subtle, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
            background: 'var(--bg-main, #f8fafc)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main, #0f172a)' }}>
              Udhaar Entries ({filteredSales.length})
            </span>
            {(fromDate || toDate || searchQuery) && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontWeight: 700
                }}
              >
                Filtered
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748b)' }}>
            Total Udhaar: <b style={{ color: '#b91c1c' }}>₹{summaryMetrics.totalUdhaarAmount.toLocaleString('en-IN')}</b>
          </div>
        </div>

        {/* When empty */}
        {filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted, #64748b)' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                color: '#dc2626'
              }}
            >
              <BookOpen size={24} />
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-main, #0f172a)', fontWeight: 800 }}>
              No Udhaar Sales Found
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem' }}>
              {fromDate || toDate
                ? `No udhaar sales recorded between ${formatDateLabel(fromDate) || 'start'} and ${formatDateLabel(toDate) || 'end'}.`
                : 'There are currently no udhaar sales records.'}
            </p>
            {(fromDate || toDate || searchQuery) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearchQuery('');
                  setActiveDatePreset('');
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="udhaar-table-wrapper" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="udhaar-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main, #f8fafc)', borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)' }}>
                  <th className="udhaar-th-date" style={{ padding: '6px 8px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800, width: '85px' }}>
                    Date
                  </th>
                  <th className="udhaar-th-details" style={{ padding: '6px 8px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800 }}>
                    Udhaar Supplier & Details
                  </th>
                  <th className="udhaar-th-total" style={{ padding: '6px 8px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800, width: '95px', textAlign: 'right' }}>
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, index) => {
                  return (
                    <tr
                      key={`${sale.id}-${index}`}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* 1. DATE COLUMN */}
                      <td className="udhaar-td-date" style={{ padding: '6px 8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-main, #0f172a)', lineHeight: 1.2 }}>
                          {formatDateLabel(sale.date)}
                        </div>
                      </td>

                      {/* 2. UDHAAR SUPPLIER NAME + USKE NICHE TOTAL BOX / PER BOX RATE */}
                      <td className="udhaar-td-details" style={{ padding: '6px 8px', verticalAlign: 'middle' }}>
                        {/* Supplier Name & Customer */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', lineHeight: 1.2 }}>
                          <span
                            className="udhaar-table-supplier-title"
                            style={{
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              color: 'var(--text-main, #0f172a)',
                              letterSpacing: '-0.01em'
                            }}
                          >
                            {sale.supplier_name}
                          </span>
                          {sale.product_name && (
                            <span
                              style={{
                                fontSize: '0.66rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(59, 130, 246, 0.08)',
                                color: '#1d4ed8',
                                fontWeight: 700
                              }}
                            >
                              {sale.product_name}
                            </span>
                          )}
                          {sale.customer_display && sale.customer_display !== 'Customer' && (
                            <span
                              style={{
                                fontSize: '0.66rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#b91c1c',
                                fontWeight: 700
                              }}
                            >
                              Khata: {sale.customer_display}
                            </span>
                          )}
                        </div>

                        {/* USKE NICHE: TOTAL BOX / PER BOX RATE */}
                        <div
                          className="udhaar-table-box-rate"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginTop: '2px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(239, 68, 68, 0.22)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            📦 {sale.boxes} BX
                          </span>
                          <span style={{ color: '#ef4444', opacity: 0.6, fontSize: '0.68rem' }}>•</span>
                          <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            Rate: ₹{Number(sale.rate_per_box).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>

                      {/* 3. TOTAL AMOUNT */}
                      <td className="udhaar-td-total" style={{ padding: '6px 8px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div
                          className="udhaar-table-total-amt"
                          style={{
                            fontWeight: 900,
                            fontSize: '0.92rem',
                            color: '#dc2626',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.2
                          }}
                        >
                          ₹{Number(sale.unpaid_amount || sale.total || 0).toLocaleString('en-IN')}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
