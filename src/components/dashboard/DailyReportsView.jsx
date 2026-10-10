import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Search,
  Download,
  Printer,
  Lock,
  Unlock,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  PlusCircle,
  Filter,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { printDailyReportDocument } from '../../utils/reportPrinter';

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
  } catch {}
  return dStr;
};

const formatCurrency = (val) => {
  const n = Number(val) || 0;
  return '₹' + n.toLocaleString('en-IN');
};

export default function DailyReportsView({
  savedReports = [],
  setSavedReports,
  saveDailyReport,
  onDeleteDailyReport,
  onUnlockDailyReport,
  getSystemDate,
  showToast,
  currentUser,
  onOpenTodayReport,
  onBack
}) {
  const [searchDate, setSearchDate] = useState('');
  const [selectedReportForModal, setSelectedReportForModal] = useState(null);

  // Filtered reports
  const filteredReports = useMemo(() => {
    let list = [...(savedReports || [])];
    if (searchDate) {
      const q = searchDate.trim().toLowerCase();
      list = list.filter(r => {
        const dStr = (r.date || '').toLowerCase();
        const formatted = formatDateLabel(r.date).toLowerCase();
        return dStr.includes(q) || formatted.includes(q);
      });
    }
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [savedReports, searchDate]);

  // Delete handler
  const handleDelete = (report) => {
    const dLabel = formatDateLabel(report.date);
    if (!window.confirm(`Are you sure you want to delete the saved report for ${dLabel}? This cannot be undone.`)) {
      return;
    }
    if (onDeleteDailyReport) {
      onDeleteDailyReport(report.id || report.date);
    } else {
      const updated = (savedReports || []).filter(r => (r.id || r.date) !== (report.id || report.date));
      if (setSavedReports) setSavedReports(updated);
      try {
        localStorage.setItem('mandi_daily_saved_reports', JSON.stringify(updated));
      } catch {}
    }
    if (showToast) showToast(`Report for ${dLabel} deleted. 🗑️`, 'info');
  };

  // Unlock handler
  const handleUnlock = (report) => {
    const dLabel = formatDateLabel(report.date);
    if (!window.confirm(`Unlock report for ${dLabel}? This will allow updating and re-saving today's figures.`)) {
      return;
    }
    if (onUnlockDailyReport) {
      onUnlockDailyReport(report.id || report.date);
    } else {
      const updated = (savedReports || []).map(r => {
        if ((r.id || r.date) === (report.id || report.date)) {
          return { ...r, isLocked: false };
        }
        return r;
      });
      if (setSavedReports) setSavedReports(updated);
      try {
        localStorage.setItem('mandi_daily_saved_reports', JSON.stringify(updated));
      } catch {}
    }
    if (showToast) showToast(`Report for ${dLabel} is unlocked for editing. 🔓`, 'info');
  };

  return (
    <div className="daily-reports-container">
      {/* ===== HEADER BAR ===== */}
      <div className="daily-reports-header">
        <div className="daily-reports-header-left">
          {onBack && (
            <button
              onClick={onBack}
              className="daily-reports-back-btn"
              title="Back to Dashboard"
            >
              <ArrowLeft size={13} /> Dashboard
            </button>
          )}

          <div className="daily-reports-title-wrap">
            <div className="daily-reports-icon-badge">
              <FileText size={15} />
            </div>
            <h1 className="daily-reports-title">Daily Reports</h1>
          </div>
        </div>

        {/* Quick action button: Open Today's Live Report */}
        {onOpenTodayReport && (
          <button
            onClick={onOpenTodayReport}
            className="daily-reports-quick-btn"
            title="Open Live Report drawer in Cash Sell Transactions"
          >
            <Sparkles size={14} />
            <span>Cash Sell Transactions</span>
          </button>
        )}
      </div>

      {/* ===== SEARCH & FILTER BAR ===== */}
      <div className="daily-reports-search-card">
        <div className="daily-reports-search-input-box">
          <Search size={14} color="var(--text-muted, #64748b)" />
          <input
            type="text"
            className="daily-reports-search-input"
            placeholder="Search by date (e.g. 2026-10-08 or Oct)..."
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
          />
          {searchDate && (
            <button
              onClick={() => setSearchDate('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '1px', color: 'var(--text-muted, #64748b)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="daily-reports-count-label">
          Showing <strong>{filteredReports.length}</strong> of <strong>{savedReports.length}</strong> reports
        </div>
      </div>

      {/* ===== SAVED REPORTS LIST / CARDS ===== */}
      {filteredReports.length === 0 ? (
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1.5px dashed var(--border-subtle, #cbd5e1)',
          borderRadius: '12px',
          padding: '32px 18px',
          textAlign: 'center',
          color: 'var(--text-muted, #64748b)'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'rgba(2, 132, 199, 0.08)',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px'
          }}>
            <FileSpreadsheet size={22} />
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            {searchDate ? 'No Reports Match Your Search' : 'No Daily Reports Saved Yet'}
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: '0.78rem', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
            {searchDate
              ? `No saved reports match "${searchDate}". Try clearing your search.`
              : 'Save daily reports from the Report drawer in Cash Sell Transactions. Once saved, they lock and appear here for permanent records.'}
          </p>
          {onOpenTodayReport && !searchDate && (
            <button
              onClick={onOpenTodayReport}
              className="daily-reports-quick-btn"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              <Sparkles size={14} /> Cash Sell Transactions
            </button>
          )}
        </div>
      ) : (
        <div className="daily-reports-list">
          {filteredReports.map((report) => {
            const isLocked = Boolean(report.isLocked !== false);

            return (
              <div
                key={report.id || report.date}
                className="daily-reports-item-card"
              >
                <div className="daily-reports-date-badge">
                  <Calendar size={13} color="#0284c7" />
                  <span>{formatDateLabel(report.date)}</span>
                </div>

                {/* Actions for this report */}
                <div className="daily-reports-item-actions">
                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => setSelectedReportForModal(report)}
                    className="daily-reports-btn-details"
                    title="View Breakdown Details"
                  >
                    <Eye size={12} /> Details
                  </button>

                  {/* Unlock button */}
                  {isLocked && (
                    <button
                      type="button"
                      onClick={() => handleUnlock(report)}
                      className="daily-reports-btn-unlock"
                      title="Unlock report to re-edit"
                    >
                      <Unlock size={11} />
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(report)}
                    className="daily-reports-btn-delete"
                    title="Delete saved report"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== DETAILS MODAL ===== */}
      {selectedReportForModal && (
        <div className="daily-reports-modal-overlay">
          <div className="daily-reports-modal-content">
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <FileText size={16} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Report Breakdown: {formatDateLabel(selectedReportForModal.date)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportForModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted, #64748b)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Income & Expense Breakdown Details */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
                ➕ Aaj ki Amdani (Income)
              </div>
              <div style={{ background: 'var(--bg-card, #f8fafc)', borderRadius: '7px', padding: '8px 10px', border: '1px solid var(--border-subtle, #e2e8f0)', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Collection / Tagada (Total):</span>
                  <strong>{formatCurrency(selectedReportForModal.income?.collection?.total)}</strong>
                </div>
                <div style={{ paddingLeft: '8px', fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• 💵 Cash Collection:</span>
                    <strong style={{ color: '#16a34a' }}>{formatCurrency(selectedReportForModal.income?.collection?.cash)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• 📱 UPI Collection:</span>
                    <strong style={{ color: '#0284c7' }}>{formatCurrency(selectedReportForModal.income?.collection?.upi)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• 🏦 Bank / Cheque / NEFT:</span>
                    <strong style={{ color: '#7c3aed' }}>{formatCurrency(selectedReportForModal.income?.collection?.bank)}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span>Cash Sell (Rokda Bikri):</span>
                  <strong>{formatCurrency(selectedReportForModal.income?.cashSell)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>B/F (Brought Forward):</span>
                  <strong>{formatCurrency(selectedReportForModal.income?.bfAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle, #e2e8f0)', marginTop: '6px', paddingTop: '5px', fontWeight: 800, color: '#10b981' }}>
                  <span>Sub Total Income:</span>
                  <span>{formatCurrency(selectedReportForModal.income?.subtotal)}</span>
                </div>
              </div>
            </div>

            {/* Expenses Breakdown */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>
                ➖ Aaj ka Kharcha (Expenses)
              </div>
              <div style={{ background: 'var(--bg-card, #f8fafc)', borderRadius: '7px', padding: '8px 10px', border: '1px solid var(--border-subtle, #e2e8f0)', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Expenses / Paisa Diya:</span>
                  <strong style={{ color: '#ef4444' }}>{formatCurrency(selectedReportForModal.expenses?.subtotal || selectedReportForModal.expenses?.total)}</strong>
                </div>
              </div>
            </div>

            {/* Adjustment & Net Closing */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', marginBottom: '4px' }}>
                ⚖️ Adjustment & Closing
              </div>
              <div style={{ background: 'var(--bg-card, #f8fafc)', borderRadius: '7px', padding: '8px 10px', border: '1px solid var(--border-subtle, #e2e8f0)', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Adjustment ({selectedReportForModal.adjustment?.type === 'add' ? '+ Add' : '− Less'}):</span>
                  <strong style={{ color: selectedReportForModal.adjustment?.type === 'add' ? '#10b981' : '#ef4444' }}>
                    {selectedReportForModal.adjustment?.type === 'add' ? '+' : '−'}{formatCurrency(selectedReportForModal.adjustment?.amount)}
                  </strong>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1.5px solid var(--border-subtle, #cbd5e1)',
                  paddingTop: '6px',
                  marginTop: '6px',
                  fontSize: '0.94rem',
                  fontWeight: 900,
                  color: Number(selectedReportForModal.finalTotal) >= 0 ? '#10b981' : '#ef4444'
                }}>
                  <span>Today's Net Total:</span>
                  <span>{formatCurrency(selectedReportForModal.finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSelectedReportForModal(null)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-card, #f1f5f9)',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  color: 'var(--text-main, #334155)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  printDailyReportDocument(selectedReportForModal);
                }}
                className="daily-reports-btn-print"
                style={{ padding: '6px 14px', fontSize: '0.76rem' }}
              >
                <Printer size={13} /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
