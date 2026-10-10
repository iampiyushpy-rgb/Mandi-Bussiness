import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Search,
  Printer,
  Download,
  Banknote,
  Package,
  TrendingUp,
  UserCheck,
  Truck,
  RotateCcw,
  Receipt,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export default function CashSellHistoryView({
  truckSalesList = [],
  customerProfiles = [],
  salesList = [],
  supplierProfiles = [],
  suppliers = [],
  purchasesList = [],
  selectedBoardDate,
  onBack,
  formatDisplayDate,
  getSystemDate,
  showToast
}) {
  const sysDate = getSystemDate ? getSystemDate() : new Date().toISOString().slice(0, 10);

  // Date Range Filter States (From Date & To Date)
  // Initially we leave both or set to current board date / today
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState('ALL'); // 'TODAY' | 'YESTERDAY' | 'LAST7' | 'MONTH' | 'ALL' | 'CUSTOM'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('ALL');

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

  const getDayName = (dStr) => {
    if (!dStr) return '';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { weekday: 'short' });
      }
    } catch { }
    return '';
  };

  // Quick Date Range Handler
  const handleQuickPreset = (preset) => {
    setActiveDatePreset(preset);
    const today = sysDate;

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
      return;
    }

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

    if (preset === 'MONTH') {
      try {
        const parts = today.split('-');
        const monthStart = `${parts[0]}-${parts[1]}-01`;
        setFromDate(monthStart);
        setToDate(today);
      } catch {
        setFromDate(today);
        setToDate(today);
      }
      return;
    }
  };

  // Consolidate all sales and filter for Cash Sales
  const allCashSales = useMemo(() => {
    const salesMap = new Map();
    const sigCounts = new Map();

    const cleanTruck = (t) => (t || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const makeSig = (truck, cust, dateStr, boxes, total) => {
      const t = cleanTruck(truck);
      const c = (cust || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const d = formatDisplayDate ? formatDisplayDate(dateStr) : String(dateStr).slice(0, 10);
      const b = Math.round(Number(boxes || 0));
      const tot = Math.round(Number(total || 0));
      return `${t}__${c}__${d}__${b}__${tot}`;
    };

    // 1. From truckSalesList (rapid board sales)
    (truckSalesList || []).forEach(s => {
      if (s && s.id !== undefined && s.id !== null) {
        salesMap.set(String(s.id), {
          ...s,
          source: 'board'
        });
        const sig = makeSig(s.truck_no, s.customer_name, s.selling_date || s.date, s.boxes, s.total);
        sigCounts.set(sig, (sigCounts.get(sig) || 0) + 1);
      }
    });

    // 2. From customer buy_history
    (customerProfiles || []).forEach(c => {
      (c.buy_history || []).forEach(b => {
        if (b && b.id !== undefined && b.id !== null && !salesMap.has(String(b.id))) {
          const sig = makeSig(b.truck_no, c.customer_name, b.date || b.selling_date, b.boxes, b.total);
          if ((sigCounts.get(sig) || 0) > 0) return;
          sigCounts.set(sig, 1);

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
            time: b.time || '',
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
        const sBoxes = Number(s.total_boxes || s.boxes || s.quantity || s.crates_sold || 0);
        const sRate = Number(s.rate || s.rate_per_box || (sBoxes > 0 ? sTotal / sBoxes : 0));
        const sDate = s.sale_date || s.order_date || s.date || (s.created_at ? String(s.created_at).slice(0, 10) : '');
        const sig = makeSig(s.truck_no || s.truck_number, s.customer_name, sDate, sBoxes, sTotal);

        if ((sigCounts.get(sig) || 0) > 0) {
          sigCounts.set(sig, sigCounts.get(sig) - 1);
          return;
        }

        salesMap.set(String(s.id), {
          id: s.id,
          selling_date: sDate,
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
          time: s.time || (s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
          source: 'backend_sales'
        });
      }
    });

    const list = [];

    // Filter only Cash Sales & resolve any missing supplier names
    salesMap.forEach(s => {
      const tot = Number(s.total || 0);
      const mode = String(s.payment_mode || '').toUpperCase();
      const custName = String(s.customer_name || '').toUpperCase();

      const isExplicitCash = mode === 'CASH' || mode === 'UPI' || custName === 'CASH SALE';
      const isExplicitCredit = mode === 'CREDIT' || mode === 'KHATA' || mode === 'UDHAAR';

      let paid = 0;
      if (s.amount_paid !== undefined && s.amount_paid !== null && s.amount_paid !== '') {
        paid = Number(s.amount_paid || 0);
      } else if (isExplicitCash) {
        paid = tot;
      } else if (custName.includes('CASH')) {
        paid = tot;
      }

      // Check if this sale had cash received
      const isCash = isExplicitCash || paid > 0 || (custName.includes('CASH') && !isExplicitCredit);
      if (!isCash) return;

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
        suppName = 'Cash Supplier Lot';
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
        cash_paid: paid > 0 ? paid : tot,
        customer_display: s.customer_name || 'CASH SALE'
      });
    });

    // Sort descending by date, then id
    return list.sort((a, b) => {
      const cmp = String(b.date).localeCompare(String(a.date));
      if (cmp !== 0) return cmp;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [truckSalesList, customerProfiles, salesList, supplierProfiles, purchasesList, sysDate]);

  // Unique suppliers list for filter dropdown
  const uniqueSuppliers = useMemo(() => {
    const set = new Set();
    allCashSales.forEach(s => {
      if (s.supplier_name) set.add(s.supplier_name);
    });
    return Array.from(set).sort();
  }, [allCashSales]);

  // Apply filters: Date Range (From & To) + Search Query + Supplier Dropdown
  const filteredSales = useMemo(() => {
    return allCashSales.filter(item => {
      // 1. Date Range: From Date
      if (fromDate && item.date < fromDate) {
        return false;
      }
      // 2. Date Range: To Date
      if (toDate && item.date > toDate) {
        return false;
      }
      // 3. Supplier Filter
      if (selectedSupplierFilter !== 'ALL' && item.supplier_name !== selectedSupplierFilter) {
        return false;
      }
      // 4. Search Query (supplier name, truck no, product, customer)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (item.supplier_name || '').toLowerCase().includes(q) ||
          (item.truck_no || '').toLowerCase().includes(q) ||
          (item.product_name || '').toLowerCase().includes(q) ||
          (item.customer_display || '').toLowerCase().includes(q) ||
          String(item.total).includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allCashSales, fromDate, toDate, selectedSupplierFilter, searchQuery]);

  // Metrics summary for the filtered result
  const summaryMetrics = useMemo(() => {
    let totalCashAmount = 0;
    let totalBoxes = 0;

    filteredSales.forEach(s => {
      totalCashAmount += Number(s.cash_paid || s.total || 0);
      totalBoxes += Number(s.boxes || 0);
    });

    const avgRate = totalBoxes > 0 ? Math.round(totalCashAmount / totalBoxes) : 0;

    return {
      totalCashAmount,
      totalBoxes,
      count: filteredSales.length,
      avgRate
    };
  }, [filteredSales]);

  // Print Cash Sell History Statement
  const handlePrintStatement = () => {
    const printWin = window.open('', '_blank', 'width=900,height=950');
    if (!printWin) {
      if (showToast) showToast('Please allow popups to print statement', 'error');
      return;
    }

    const dateRangeLabel = fromDate && toDate
      ? (fromDate === toDate ? formatDateLabel(fromDate) : `${formatDateLabel(fromDate)} to ${formatDateLabel(toDate)}`)
      : (fromDate ? `From ${formatDateLabel(fromDate)}` : (toDate ? `Up to ${formatDateLabel(toDate)}` : 'All Dates'));

    const rowsHtml = filteredSales.map((s, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 6px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px; font-weight: 600;">
          ${formatDateLabel(s.date)}<br/>
          <small style="color: #64748b;">${getDayName(s.date)} ${s.time || ''}</small>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px;">
          <strong style="color: #0f172a; font-size: 13px;">${s.supplier_name}</strong><br/>
          <span style="display: inline-block; margin-top: 2px; color: #047857; font-weight: 700; font-size: 11px;">
            Total Box: ${s.boxes} BX &nbsp;|&nbsp; Rate: ₹${Number(s.rate_per_box).toLocaleString('en-IN')}/box
          </span>
          ${s.product_name ? `<br/><small style="color: #475569;">${s.product_name}</small>` : ''}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px;">
          <span style="font-weight: 600;">${s.truck_no || '—'}</span>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px;">
          <span>${s.customer_display}</span>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: center;">
          <span style="background: #d1fae5; color: #065f46; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
            ${s.payment_mode || 'CASH'}
          </span>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px; text-align: right; font-weight: 800; color: #065f46; font-size: 13px;">
          ₹${Number(s.cash_paid || s.total || 0).toLocaleString('en-IN')}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cash Sell Statement - Aziz International</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
          .header { border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 800; color: #065f46; margin: 0; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #d1fae5; color: #065f46; }
          .kpi-row { display: flex; gap: 12px; margin-bottom: 16px; }
          .kpi-card { flex: 1; padding: 10px 14px; background: #f0fdf4; border: 1.5px solid #a7f3d0; border-radius: 8px; }
          .kpi-label { font-size: 10px; text-transform: uppercase; color: #047857; font-weight: 700; }
          .kpi-val { font-size: 17px; font-weight: 900; color: #065f46; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
          th { background: #f1f5f9; padding: 8px 8px; text-align: left; font-weight: 700; border: 1px solid #cbd5e1; font-size: 11px; color: #334155; }
          .footer { margin-top: 30px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
          @media print { body { padding: 12px; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">AZIZ INTERNATIONAL TRADING CO.</h1>
            <div class="subtitle">Wholesale Fruit Mandi & Commission Agent • Azadpur Mandi, Delhi</div>
            <div class="subtitle">License: APMC/AZD/2026/894 • Phone: +91 98765 43210</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">CASH SELL HISTORY STATEMENT</span>
            <div style="font-size: 11px; margin-top: 6px; font-weight: 700; color: #334155;">Period: ${dateRangeRangeLabel(dateRangeLabel)}</div>
            <div style="font-size: 10px; color: #64748b;">Printed on: ${new Date().toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Total Cash Sell Bikri</div>
            <div class="kpi-val">₹${summaryMetrics.totalCashAmount.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Boxes Sold</div>
            <div class="kpi-val">${summaryMetrics.totalBoxes.toLocaleString('en-IN')} BX</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Cash Receipts</div>
            <div class="kpi-val">${summaryMetrics.count} Sales</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Average Rate / Box</div>
            <div class="kpi-val">₹${summaryMetrics.avgRate.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">#</th>
              <th style="width: 100px;">Date</th>
              <th>Supplier Name & Box / Rate</th>
              <th style="width: 90px;">Truck No.</th>
              <th style="width: 110px;">Customer / Buyer</th>
              <th style="width: 65px; text-align: center;">Mode</th>
              <th style="width: 100px; text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;">No cash sales found for this date range</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800;">
              <td colspan="2" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">TOTAL:</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; color: #065f46;">${summaryMetrics.totalBoxes} Boxes Total</td>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 8px;"></td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; color: #065f46; font-size: 14px;">₹${summaryMetrics.totalCashAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>Authorized Signature: _______________________</div>
          <div>Computer Generated Mandi Cash Bikri Register • Shubh Labh 🙏</div>
        </div>

        <script>
          function dateRangeRangeLabel(txt) { return txt; }
          window.print();
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  // Print individual Bikri Parchi Slip for single sale
  const handlePrintSlip = (sale) => {
    const printWin = window.open('', '_blank', 'width=380,height=580');
    if (!printWin) {
      if (showToast) showToast('Please allow popups to print slip', 'error');
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cash Bikri Parchi - ${sale.supplier_name}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 18px; color: #000; margin: 0; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
          .title { font-size: 17px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 11px; margin-top: 3px; }
          .badge { display: inline-block; border: 1px solid #000; padding: 2px 6px; font-size: 10px; margin-top: 4px; font-weight: bold; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .highlight { font-size: 14px; font-weight: bold; }
          .footer { text-align: center; margin-top: 16px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">AZIZ INTERNATIONAL</div>
          <div class="subtitle">Wholesale Fruit Mandi, Azadpur, Delhi</div>
          <div class="badge">CASH BIKRI PARCHI</div>
        </div>
        <div class="row"><span>Date:</span><span>${formatDateLabel(sale.date)} ${sale.time || ''}</span></div>
        <div class="row"><span>Cash Supplier:</span><strong>${sale.supplier_name}</strong></div>
        <div class="row"><span>Truck No:</span><span>${sale.truck_no || '—'}</span></div>
        <div class="row"><span>Fruit/Variety:</span><span>${sale.product_name || 'Fresh Produce'}</span></div>
        <div class="row"><span>Customer/Buyer:</span><span>${sale.customer_display}</span></div>
        <div class="divider"></div>
        <div class="row highlight"><span>Total Box:</span><span>${sale.boxes} Boxes</span></div>
        <div class="row"><span>Rate / Box:</span><span>₹${Number(sale.rate_per_box).toLocaleString('en-IN')}</span></div>
        <div class="divider"></div>
        <div class="row highlight" style="font-size: 16px;"><span>TOTAL CASH:</span><span>₹${Number(sale.cash_paid || sale.total || 0).toLocaleString('en-IN')}</span></div>
        <div class="row"><span>Payment Mode:</span><span>${sale.payment_mode || 'CASH'}</span></div>
        <div class="footer">Thank you! Shubh Labh 🙏</div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['S.No', 'Date', 'Supplier Name', 'Total Box', 'Per Box Rate', 'Total Amount', 'Truck No', 'Produce', 'Customer', 'Payment Mode'];
      const csvRows = [headers.join(',')];

      filteredSales.forEach((s, idx) => {
        const row = [
          idx + 1,
          `"${s.date}"`,
          `"${(s.supplier_name || '').replace(/"/g, '""')}"`,
          s.boxes,
          s.rate_per_box,
          s.cash_paid || s.total,
          `"${(s.truck_no || '').replace(/"/g, '""')}"`,
          `"${(s.product_name || '').replace(/"/g, '""')}"`,
          `"${(s.customer_display || '').replace(/"/g, '""')}"`,
          `"${s.payment_mode || 'CASH'}"`
        ];
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Cash_Sell_History_${fromDate || 'All'}_to_${toDate || 'All'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (showToast) showToast('Cash Sell CSV downloaded successfully');
    } catch {
      if (showToast) showToast('Error exporting CSV', 'error');
    }
  };

  return (
    <div
      className="cash-sell-history-container"
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
        .cash-sell-history-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 85vh;
          width: 100%;
          animation: fadeIn 0.2s ease-in-out;
        }

        /* NAVBAR COMPACT BASE STYLES */
        .cash-sell-navbar {
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
        .cash-nav-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          flex-wrap: wrap;
        }
        .cash-nav-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cash-nav-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cash-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 7px;
          background: rgba(16, 185, 129, 0.09);
          border: 1.5px solid rgba(16, 185, 129, 0.3);
          color: #047857;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cash-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
        }
        .cash-nav-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          letter-spacing: -0.01em;
        }
        .cash-nav-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #065f46;
          font-weight: 800;
          font-size: 0.65rem;
          padding: 2px 5px;
          border-radius: 5px;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .cash-nav-subtitle {
          font-size: 0.72rem;
          color: var(--text-muted, #64748b);
          margin-top: 1px;
        }
        .cash-search-box {
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
        .cash-search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.78rem;
          color: var(--text-main, #0f172a);
          width: 150px;
        }
        .cash-csv-btn {
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
        .cash-nav-bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding-top: 6px;
          border-top: 1px solid var(--border-subtle, #f1f5f9);
          flex-wrap: wrap;
        }
        .cash-date-container {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 185, 129, 0.05);
          border: 1.5px solid rgba(16, 185, 129, 0.28);
          padding: 3px 8px;
          border-radius: 8px;
          height: 30px;
          box-sizing: border-box;
        }
        .cash-date-group {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .cash-date-input {
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
        .cash-date-arrow {
          color: #059669;
          font-weight: 800;
          font-size: 0.78rem;
        }
        .cash-date-clear-btn {
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
        .cash-quick-presets {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cash-quick-btn {
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
          .cash-sell-history-container {
            gap: 8px !important;
          }
          .cash-sell-navbar {
            padding: 6px 10px !important;
            gap: 5px !important;
            border-radius: 10px !important;
          }
          .cash-nav-subtitle {
            display: none !important;
          }
          .cash-nav-top-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 6px !important;
          }
          .cash-back-btn {
            padding: 4px 7px !important;
            font-size: 0.72rem !important;
            gap: 3px !important;
            border-radius: 6px !important;
          }
          .cash-icon-box {
            width: 24px !important;
            height: 24px !important;
            border-radius: 6px !important;
          }
          .cash-icon-box svg {
            width: 13px !important;
            height: 13px !important;
          }
          .cash-nav-title {
            font-size: 0.94rem !important;
          }
          .cash-nav-badge {
            font-size: 0.62rem !important;
            padding: 1px 4px !important;
          }
          .cash-nav-right {
            width: 100% !important;
            display: flex !important;
            gap: 6px !important;
            margin-top: 1px !important;
          }
          .cash-search-box {
            flex: 1 !important;
            width: auto !important;
            padding: 3px 8px !important;
            height: 30px !important;
          }
          .cash-search-input {
            width: 100% !important;
            font-size: 0.76rem !important;
          }
          .cash-csv-btn {
            padding: 3px 8px !important;
            font-size: 0.72rem !important;
            height: 30px !important;
          }
          .cash-nav-bottom-row {
            padding-top: 4px !important;
            gap: 4px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .cash-date-container {
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
          .cash-date-label {
            display: none !important;
          }
          .cash-date-group {
            display: flex !important;
            align-items: center !important;
            gap: 2px !important;
            flex: 1 !important;
            min-width: 0 !important;
          }
          .cash-date-sublabel {
            font-size: 0.68rem !important;
            color: #475569 !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
          }
          .cash-date-input {
            flex: 1 !important;
            min-width: 0 !important;
            width: 100% !important;
            height: 26px !important;
            padding: 1px 3px !important;
            font-size: 0.7rem !important;
            border-radius: 4px !important;
          }
          .cash-date-arrow {
            color: #059669 !important;
            font-weight: 800 !important;
            font-size: 0.72rem !important;
            flex-shrink: 0 !important;
          }
          .cash-date-clear-btn {
            font-size: 0.65rem !important;
            padding: 2px 4px !important;
            flex-shrink: 0 !important;
          }
          .cash-quick-presets {
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
          .cash-quick-presets::-webkit-scrollbar {
            display: none !important;
          }
          .cash-quick-label {
            font-size: 0.68rem !important;
            flex-shrink: 0 !important;
          }
          .cash-quick-btn {
            padding: 2px 7px !important;
            font-size: 0.68rem !important;
            height: 22px !important;
            border-radius: 5px !important;
            flex-shrink: 0 !important;
          }

          /* Table Mobile Polish & Compact Height */
          .cash-table-wrapper {
            margin: 0 !important;
          }
          .cash-table-header-bar {
            padding: 5px 8px !important;
            font-size: 0.74rem !important;
          }
          .cash-table th, .cash-table td {
            padding: 5px 6px !important;
          }
          .cash-th-date, .cash-td-date {
            width: 72px !important;
            min-width: 68px !important;
            font-size: 0.74rem !important;
          }
          .cash-th-total, .cash-td-total {
            width: 82px !important;
            min-width: 78px !important;
          }
          .cash-table-supplier-title {
            font-size: 0.84rem !important;
            line-height: 1.2 !important;
          }
          .cash-table-box-rate {
            font-size: 0.65rem !important;
            padding: 1px 4px !important;
            gap: 3px !important;
            flex-wrap: nowrap !important; /* Never wrap into 5 lines */
            margin-top: 1px !important;
            line-height: 1.2 !important;
            border-radius: 4px !important;
            white-space: nowrap !important;
          }
          .cash-table-total-amt {
            font-size: 0.88rem !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>

      {/* ===================================================================== */}
      {/* 1. TOP NAVBAR / HEADER WITH CALENDAR (FROM & TO DATE PICKERS)         */}
      {/* ===================================================================== */}
      <div className="cash-sell-navbar">
        {/* Top Row: Back button, Title & Search */}
        <div className="cash-nav-top-row">
          {/* Left: Back button & Title */}
          <div className="cash-nav-left">
            <button
              onClick={onBack}
              title="Return to Mandi Board"
              className="cash-back-btn"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="cash-icon-box">
                <Banknote size={15} color="#ffffff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <h2 className="cash-nav-title">
                    Cash Sell History
                  </h2>
                  <span className="cash-nav-badge">
                    ROKDA
                  </span>
                </div>
                <div className="cash-nav-subtitle">
                  Complete record of cash sales, supplier lots, boxes, rates and total amount
                </div>
              </div>
            </div>
          </div>

          {/* Right: Search box & CSV */}
          <div className="cash-nav-right">
            <div className="cash-search-box">
              <Search size={13} color="var(--text-muted, #64748b)" />
              <input
                type="text"
                placeholder="Search supplier, fruit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cash-search-input"
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
              title="Export Cash Sell History to Excel/CSV"
              className="cash-csv-btn"
            >
              <FileSpreadsheet size={13} color="#059669" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Bottom Row of Navbar: CALENDAR DATE RANGE PICKER (FROM & TO) & CLEAN QUICK FILTERS */}
        <div className="cash-nav-bottom-row">
          {/* CALENDAR INPUTS CONTAINER */}
          <div className="cash-date-container">
            <div className="cash-date-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 800, fontSize: '0.74rem' }}>
              <Calendar size={13} color="#059669" />
              <span>Date:</span>
            </div>

            {/* FROM DATE */}
            <div className="cash-date-group">
              <span className="cash-date-sublabel">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                }}
                className="cash-date-input"
              />
            </div>

            <span className="cash-date-arrow">→</span>

            {/* TO DATE */}
            <div className="cash-date-group">
              <span className="cash-date-sublabel">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                }}
                className="cash-date-input"
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
                className="cash-date-clear-btn"
              >
                Clear
              </button>
            )}
          </div>

          {/* QUICK PRESETS CHIPS (Today, Yesterday, Last 7 Days) */}
          <div className="cash-quick-presets">
            <span className="cash-quick-label" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>Quick:</span>
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
                  className="cash-quick-btn"
                  style={{
                    fontWeight: active ? 800 : 600,
                    border: active ? '1.5px solid #059669' : '1px solid var(--border-light, #cbd5e1)',
                    background: active ? '#10b981' : 'var(--bg-main, #f8fafc)',
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
      {/* 2. CASH SELL HISTORY TABLE (DATE, SUPPLIER WITH BOX/RATE, TOTAL AMOUNT) */}
      {/* ===================================================================== */}
      <div
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1.5px solid var(--border-subtle, #e2e8f0)',
          boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.04))',
          overflow: 'hidden'
        }}
      >
        {/* Table Header Bar */}
        <div
          className="cash-table-header-bar"
          style={{
            padding: '8px 14px',
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
              Cash Sell Entries ({filteredSales.length})
            </span>
            {(fromDate || toDate || searchQuery) && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  fontWeight: 700
                }}
              >
                Filtered
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748b)' }}>
            Total Cash: <b style={{ color: '#065f46' }}>₹{summaryMetrics.totalCashAmount.toLocaleString('en-IN')}</b>
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
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                color: '#059669'
              }}
            >
              <Banknote size={24} />
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-main, #0f172a)', fontWeight: 800 }}>
              No Cash Sales Found
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem' }}>
              {fromDate || toDate
                ? `No cash sales recorded between ${formatDateLabel(fromDate) || 'start'} and ${formatDateLabel(toDate) || 'end'}.`
                : 'There are currently no cash sales records.'}
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
                  background: '#10b981',
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
          <div className="cash-table-wrapper" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table className="cash-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main, #f8fafc)', borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)' }}>
                  <th className="cash-th-date" style={{ padding: '6px 8px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800, width: '85px' }}>
                    Date
                  </th>
                  <th className="cash-th-details" style={{ padding: '6px 8px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800 }}>
                    Cash Sell Supplier & Details
                  </th>
                  <th className="cash-th-total" style={{ padding: '6px 8px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', fontWeight: 800, width: '95px', textAlign: 'right' }}>
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
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* 1. DATE COLUMN */}
                      <td className="cash-td-date" style={{ padding: '6px 8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-main, #0f172a)', lineHeight: 1.2 }}>
                          {formatDateLabel(sale.date)}
                        </div>
                      </td>

                      {/* 2. CASH SELL SUPPLIER NAME + USKE NICHE TOTAL BOX / PER BOX RATE */}
                      <td className="cash-td-details" style={{ padding: '6px 8px', verticalAlign: 'middle' }}>
                        {/* Supplier Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', lineHeight: 1.2 }}>
                          <span
                            className="cash-table-supplier-title"
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
                        </div>

                        {/* USKE NICHE: TOTAL BOX / PER BOX RATE */}
                        <div
                          className="cash-table-box-rate"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginTop: '2px',
                            background: 'rgba(16, 185, 129, 0.08)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(16, 185, 129, 0.22)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            📦 {sale.boxes} BX
                          </span>
                          <span style={{ color: '#059669', opacity: 0.6, fontSize: '0.68rem' }}>•</span>
                          <span style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            Rate: ₹{Number(sale.rate_per_box).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>

                      {/* 3. TOTAL AMOUNT */}
                      <td className="cash-td-total" style={{ padding: '6px 8px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div
                          className="cash-table-total-amt"
                          style={{
                            fontWeight: 900,
                            fontSize: '0.92rem',
                            color: '#065f46',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.2
                          }}
                        >
                          ₹{Number(sale.cash_paid || sale.total || 0).toLocaleString('en-IN')}
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
