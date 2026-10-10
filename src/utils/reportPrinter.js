/**
 * Utility to generate and print / download Daily Financial Report
 */

export const printDailyReportDocument = (report) => {
  if (!report) return;

  const printWin = window.open('', '_blank', 'width=900,height=950');
  if (!printWin) {
    alert('Please allow popups in your browser to download/print the report.');
    return;
  }

  const formatDate = (dStr) => {
    if (!dStr) return '';
    try {
      const parts = String(dStr).split('T')[0].split('-');
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

  const formattedDate = formatDate(report.date);
  const printTimestamp = report.savedAt
    ? new Date(report.savedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const inc = report.income || {};
  const col = inc.collection || {};
  const exp = report.expenses || {};
  const adj = report.adjustment || {};

  const colTotal = Number(col.total || 0);
  const colCash = Number(col.cash || 0);
  const colUpi = Number(col.upi || 0);
  const colBank = Number(col.bank || 0);
  const cashSell = Number(inc.cashSell || 0);
  const bfAmount = Number(inc.bfAmount || 0);
  const incomeSubtotal = Number(inc.subtotal || (colTotal + cashSell + bfAmount));

  const expTotal = Number(exp.total || exp.subtotal || 0);
  const expSubtotal = Number(exp.subtotal || expTotal);

  const adjType = adj.type || 'add';
  const adjAmt = Number(adj.amount || 0);
  const adjEffective = adjType === 'add' ? adjAmt : -adjAmt;

  const finalTotal = report.finalTotal !== undefined
    ? Number(report.finalTotal)
    : (incomeSubtotal - expSubtotal + adjEffective);

  const collectionItems = report.collectionItems || [];
  const expenseItems = report.expenseItems || [];

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Daily Report - ${formattedDate} - AzizInternational</title>
      <style>
        @page {
          size: A4;
          margin: 14mm 12mm 14mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          margin: 0;
          padding: 18px 24px;
          font-size: 13px;
          line-height: 1.4;
        }

        /* HEADER */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .brand-subtitle {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 2px;
        }
        .report-badge {
          text-align: right;
        }
        .report-title {
          font-size: 18px;
          font-weight: 800;
          color: #0284c7;
          margin: 0;
        }
        .report-date {
          display: inline-block;
          margin-top: 4px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 3px 10px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 13px;
          color: #0f172a;
        }
        .meta-line {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }
        .lock-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        /* SUMMARY TOP CARDS */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .sum-card {
          border-radius: 8px;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .sum-card.highlight {
          background: #f0fdf4;
          border-color: #86efac;
        }
        .sum-card.highlight.neg {
          background: #fef2f2;
          border-color: #fca5a5;
        }
        .sum-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .sum-val {
          font-size: 18px;
          font-weight: 900;
          margin-top: 3px;
        }
        .sum-val.green { color: #16a34a; }
        .sum-val.red { color: #dc2626; }
        .sum-val.blue { color: #0284c7; }

        /* SECTIONS */
        .section-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 14px;
          overflow: hidden;
        }
        .section-header {
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-header.income {
          background: #ecfdf5;
          color: #065f46;
          border-bottom: 1px solid #a7f3d0;
        }
        .section-header.expense {
          background: #fef2f2;
          color: #991b1b;
          border-bottom: 1px solid #fecaca;
        }
        .section-header.adjustment {
          background: #f8fafc;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .data-table th {
          background: #f8fafc;
          text-align: left;
          padding: 7px 10px;
          font-weight: 700;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
          padding: 7px 10px;
          border-bottom: 1px solid #f1f5f9;
        }
        .data-table tr:last-child td {
          border-bottom: none;
        }
        .data-table td.amount {
          text-align: right;
          font-weight: 800;
          font-size: 13px;
        }
        .subtotal-row {
          background: #f8fafc;
          font-weight: 800;
        }
        .subtotal-row td {
          border-top: 1.5px solid #cbd5e1 !important;
          padding: 9px 10px;
        }

        /* COLLECTION BREAKDOWN SUB-BOX */
        .breakdown-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 6px;
          padding: 8px 12px;
          margin: 6px 10px 8px;
        }
        .breakdown-title {
          font-size: 10.5px;
          font-weight: 700;
          color: #166534;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .breakdown-chips {
          display: flex;
          gap: 12px;
        }
        .breakdown-chip {
          background: #ffffff;
          border: 1px solid #bbf7d0;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .chip-label { font-weight: 600; color: #475569; }
        .chip-val { font-weight: 800; color: #0f172a; }

        /* GRAND TOTAL FINAL BANNER */
        .grand-total-banner {
          background: ${finalTotal >= 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
          color: #ffffff;
          padding: 14px 18px;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }
        .grand-total-label {
          font-size: 15px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .grand-total-sub {
          font-size: 11px;
          opacity: 0.9;
          margin-top: 2px;
        }
        .grand-total-amount {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        /* SIGNATURES */
        .signatures {
          margin-top: 30px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 14px;
          border-top: 1px dashed #cbd5e1;
        }
        .sig-block {
          text-align: center;
        }
        .sig-line {
          height: 35px;
          border-bottom: 1px solid #94a3b8;
          margin-bottom: 6px;
        }
        .sig-name {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
        }

        /* FOOTER */
        .footer {
          margin-top: 18px;
          text-align: center;
          font-size: 10.5px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 8px;
        }

        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- TOP ACTION BAR FOR PREVIEW -->
      <div class="no-print" style="margin-bottom: 14px; display: flex; justify-content: flex-end; gap: 8px;">
        <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 7px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px;">
          🖨️ Print / Save as PDF
        </button>
        <button onclick="window.close()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">
          Close
        </button>
      </div>

      <!-- HEADER -->
      <div class="header">
        <div>
          <h1 class="brand-title">AzizInternational</h1>
          <div class="brand-subtitle">Fresh Fruits & Dry Fruits Wholesale • Azadpur Mandi, Delhi</div>
          <div class="meta-line">Generated on: ${printTimestamp} ${report.savedBy ? '• By: ' + report.savedBy : ''}</div>
        </div>
        <div class="report-badge">
          <div class="report-title">📊 DAILY FINANCIAL REPORT</div>
          <div class="report-date">${formattedDate}</div>
          <div style="margin-top: 5px;">
            ${report.isLocked ? '<span class="lock-pill">🔒 Finalized & Locked</span>' : '<span style="font-size: 11px; color: #f59e0b; font-weight: 700;">⚡ Live Unlocked</span>'}
          </div>
        </div>
      </div>

      <!-- SUMMARY CARDS -->
      <div class="summary-grid">
        <div class="sum-card">
          <div class="sum-label">Total Income</div>
          <div class="sum-val green">${formatCurrency(incomeSubtotal)}</div>
        </div>
        <div class="sum-card">
          <div class="sum-label">Total Expenses</div>
          <div class="sum-val red">${formatCurrency(expSubtotal)}</div>
        </div>
        <div class="sum-card">
          <div class="sum-label">Adjustment</div>
          <div class="sum-val" style="color: ${adjEffective >= 0 ? '#16a34a' : '#dc2626'};">
            ${adjEffective >= 0 ? '+' : '−'}${formatCurrency(Math.abs(adjEffective))}
          </div>
        </div>
        <div class="sum-card highlight ${finalTotal < 0 ? 'neg' : ''}">
          <div class="sum-label">Today's Closing</div>
          <div class="sum-val ${finalTotal >= 0 ? 'green' : 'red'}">${formatCurrency(finalTotal)}</div>
        </div>
      </div>

      <!-- INCOME TABLE -->
      <div class="section-box">
        <div class="section-header income">
          <span>➕ Aaj ki Amdani (Income Breakdown)</span>
          <span>₹${incomeSubtotal.toLocaleString('en-IN')}</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 55%;">Income Head</th>
              <th style="width: 25%;">Mode / Note</th>
              <th style="text-align: right; width: 20%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Collection / Tagada</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                  Customer receipts & party collections
                </div>
              </td>
              <td>All Modes (${(collectionItems.length)} entries)</td>
              <td class="amount" style="color: #16a34a;">${formatCurrency(colTotal)}</td>
            </tr>
            <!-- Breakdown pills -->
            <tr>
              <td colspan="3" style="padding: 4px 10px 8px;">
                <div class="breakdown-box">
                  <div class="breakdown-title">Collection Mode Breakdown (कलेक्शन माध्यम विवरण)</div>
                  <div class="breakdown-chips">
                    <div class="breakdown-chip">
                      <span class="chip-label">💵 Cash:</span>
                      <span class="chip-val" style="color: #16a34a;">${formatCurrency(colCash)}</span>
                    </div>
                    <div class="breakdown-chip">
                      <span class="chip-label">📱 UPI:</span>
                      <span class="chip-val" style="color: #0284c7;">${formatCurrency(colUpi)}</span>
                    </div>
                    <div class="breakdown-chip">
                      <span class="chip-label">🏦 Bank / Cheque / NEFT / RTGS:</span>
                      <span class="chip-val" style="color: #7c3aed;">${formatCurrency(colBank)}</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Cash Sell (Rokda Bikri)</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                  Spot cash sales from boards & rapid counters
                </div>
              </td>
              <td>Direct Cash Sales</td>
              <td class="amount" style="color: #0284c7;">${formatCurrency(cashSell)}</td>
            </tr>
            <tr>
              <td>
                <strong>B/F (Brought Forward)</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                  Opening cash / previous balance brought forward
                </div>
              </td>
              <td>Opening Balance</td>
              <td class="amount" style="color: #9333ea;">${formatCurrency(bfAmount)}</td>
            </tr>
            <tr class="subtotal-row">
              <td colspan="2">INCOME SUB TOTAL</td>
              <td class="amount" style="color: #16a34a;">${formatCurrency(incomeSubtotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- EXPENSE TABLE -->
      <div class="section-box">
        <div class="section-header expense">
          <span>➖ Aaj ka Kharcha (Expenses / Paisa Diya)</span>
          <span>₹${expSubtotal.toLocaleString('en-IN')}</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 55%;">Expense Head</th>
              <th style="width: 25%;">Mode / Note</th>
              <th style="text-align: right; width: 20%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Supplier Payments & Operational Expenses</strong>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                  Paisa Diya to suppliers, freight, labor & mandi expenses
                </div>
              </td>
              <td>Cash & Bank (${(expenseItems.length)} entries)</td>
              <td class="amount" style="color: #dc2626;">${formatCurrency(expTotal)}</td>
            </tr>
            <tr class="subtotal-row">
              <td colspan="2">EXPENSES SUB TOTAL</td>
              <td class="amount" style="color: #dc2626;">${formatCurrency(expSubtotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ADJUSTMENT TABLE -->
      <div class="section-box">
        <div class="section-header adjustment">
          <span>⚖️ Adjustment / Kasar / Galla Sudhar</span>
          <span>${adjEffective >= 0 ? '+' : '−'}₹${Math.abs(adjEffective).toLocaleString('en-IN')}</span>
        </div>
        <table class="data-table">
          <tbody>
            <tr>
              <td style="width: 55%;">
                <strong>Daily Adjustment (${adjType === 'add' ? '+ Add' : '− Less'})</strong>
              </td>
              <td style="width: 25%; font-weight: 700; color: ${adjType === 'add' ? '#16a34a' : '#dc2626'};">
                ${adjType === 'add' ? '+ Added to Net' : '− Deducted from Net'}
              </td>
              <td class="amount" style="color: ${adjType === 'add' ? '#16a34a' : '#dc2626'}; width: 20%;">
                ${adjType === 'add' ? '+' : '−'}${formatCurrency(adjAmt)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- GRAND TOTAL BANNER -->
      <div class="grand-total-banner">
        <div>
          <div class="grand-total-label">💰 Today's Net Total (आज का अंतिम हिसाब)</div>
          <div class="grand-total-sub">
            (Collection ${formatCurrency(colTotal)} + Cash Sell ${formatCurrency(cashSell)} + B/F ${formatCurrency(bfAmount)}) − Expenses ${formatCurrency(expSubtotal)} ${adjAmt > 0 ? (adjType === 'add' ? '+ ' : '− ') + formatCurrency(adjAmt) : ''}
          </div>
        </div>
        <div class="grand-total-amount">
          ${formatCurrency(finalTotal)}
        </div>
      </div>

      <!-- ITEM LISTS IF AVAILABLE -->
      ${collectionItems.length > 0 ? `
        <div style="margin-top: 14px; page-break-inside: avoid;">
          <div style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.04em;">
            📋 Customer Collection Entries (${collectionItems.length})
          </div>
          <table class="data-table" style="border: 1px solid #e2e8f0; border-radius: 6px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="width: 8%;">#</th>
                <th style="width: 42%;">Customer / Party Name</th>
                <th style="width: 25%;">Payment Mode</th>
                <th style="width: 25%; text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${collectionItems.slice(0, 15).map((ci, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${ci.name || ci.party_name || 'Customer'}</strong></td>
                  <td><span style="font-size: 11px; padding: 2px 6px; background: #e2e8f0; border-radius: 4px; font-weight: 700;">${ci.mode || 'CASH'}</span></td>
                  <td class="amount" style="color: #16a34a;">${formatCurrency(ci.amount)}</td>
                </tr>
              `).join('')}
              ${collectionItems.length > 15 ? `
                <tr>
                  <td colspan="4" style="text-align: center; color: #64748b; font-style: italic;">
                    ... and ${collectionItems.length - 15} more collections recorded
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- SIGNATURES -->
      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-name">Prepared By / Cashier</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-name">Checked By / Munshi</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-name">Proprietor / Authorized Signatory</div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        Computer Generated Daily Financial Closing Report • AzizInternational Mandi ERP System • Shubh Labh 🙏
      </div>

      <script>
        window.onload = function() {
          // Auto-prompt print dialog
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
};
