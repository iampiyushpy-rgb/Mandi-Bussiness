import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  CheckCircle,
  Truck,
  Package,
  Apple,
  CreditCard,
  Search,
  Phone,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Layers,
  X,
  ShoppingCart,
  DollarSign,
  History,
  Check,
  Printer,
  Download,
  Receipt,
  MapPin,
  Copy,
  Edit,
  Edit2,
  Building2,
  UserPlus,
  FileText,
  ChevronLeft,
  ShieldCheck,
  Lock,
  Trash2,
  Percent,
  Calculator,
  Calendar,
  Filter
} from 'lucide-react';
import jsPDF from 'jspdf';
import { api } from '../services/api';
import BoardPageView from '../components/dashboard/BoardPageView';
import CashSellHistoryView from '../components/dashboard/CashSellHistoryView';
import UdhaarHistoryView from '../components/dashboard/UdhaarHistoryView';
import PartyKhataView from '../components/dashboard/PartyKhataView';
import CashSellTransactionsView from '../components/dashboard/CashSellTransactionsView';
import DailyReportsView from '../components/dashboard/DailyReportsView';
import { formatDisplayDate } from '../utils/dateUtils';

const getSystemDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export default function DashboardView({
  dashboardData,
  suppliers = [],
  truckPayments = [],
  products = [],
  trucks = [],
  customers = [],
  salesList = [],
  customerLedger = [],
  purchasesList = [],
  setCustomers,
  setSuppliers,
  setSalesList,
  setActiveTab,
  openNewPurchase,
  openNewSale,
  onRefresh,
  showToast,
  isFormOpen: extIsFormOpen,
  setIsFormOpen: extSetIsFormOpen,
  isCustomerModalOpen: extIsCustomerModalOpen,
  setIsCustomerModalOpen: extSetIsCustomerModalOpen,
  isSupplierTrucksModalOpen: extIsSupplierTrucksModalOpen,
  setIsSupplierTrucksModalOpen: extSetIsSupplierTrucksModalOpen,
  searchQuery = '',
  currentUser,
  activeTab = 'dashboard'
}) {
  const [internalFormOpen, setInternalFormOpen] = useState(false);
  const isFormOpen = extIsFormOpen !== undefined ? extIsFormOpen : internalFormOpen;
  const setIsFormOpen = extSetIsFormOpen || setInternalFormOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileStatusFilter, setProfileStatusFilter] = useState('ACTIVE'); // 'ACTIVE' (default: balance > 0) | 'COMPLETED' (balance == 0) | 'ALL'

  // ---------------------------------------------------------------------------
  // Supplier Profiles & Trucks Directory Modal State
  // ---------------------------------------------------------------------------
  const [internalSupplierTrucksModalOpen, setInternalSupplierTrucksModalOpen] = useState(false);
  const isSupplierTrucksModalOpen = extIsSupplierTrucksModalOpen !== undefined ? extIsSupplierTrucksModalOpen : internalSupplierTrucksModalOpen;
  const setIsSupplierTrucksModalOpen = extSetIsSupplierTrucksModalOpen || setInternalSupplierTrucksModalOpen;
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState(null);
  const [isSupplierDetailPopupOpen, setIsSupplierDetailPopupOpen] = useState(false);
  const [isPassbookSectionOpen, setIsPassbookSectionOpen] = useState(false);
  const [supplierTrucksSearch, setSupplierTrucksSearch] = useState('');
  const [selectedTruckFilter, setSelectedTruckFilter] = useState('ALL');
  const [supplierDirectoryFilter, setSupplierDirectoryFilter] = useState('ALL'); // 'ALL' | 'ACTIVE_TRUCKS'
  const [truckStatusFilter, setTruckStatusFilter] = useState('ACTIVE'); // 'ACTIVE' (balance > 0) | 'COMPLETE' (balance === 0)
  const [selectedTruckNumber, setSelectedTruckNumber] = useState(null);
  const [truckSettlements, setTruckSettlements] = useState(() => {
    try {
      const fullWipe = localStorage.getItem('mandi_settlements_placeholder_v1');
      if (!fullWipe) {
        localStorage.removeItem('mandi_truck_settlements');
        localStorage.setItem('mandi_settlements_placeholder_v1', 'true');
        return {};
      }
      return JSON.parse(localStorage.getItem('mandi_truck_settlements')) || {};
    } catch {
      return {};
    }
  });

  const updateTruckSettlement = (truckKey, field, val) => {
    setTruckSettlements(prev => {
      const cur = prev[truckKey] || {};
      const updated = {
        ...prev,
        [truckKey]: {
          ...cur,
          [field]: val
        }
      };
      try {
        localStorage.setItem('mandi_truck_settlements', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  const handlePrintTruckInvoice = (supplier, truckNo, fruitName, truckSales, totalBoxes, totalSold, settlement, commAmount, fareAmount, kuliAmount, invoiceTotal, cashAmount = 0) => {
    const printWin = window.open('', '_blank', 'width=840,height=900');
    if (!printWin) {
      if (showToast) showToast('Please allow popups to print invoice', 'error');
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mandi Settlement Invoice - Truck ${truckNo}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #fff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #dbeafe; color: #1e40af; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
          .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
          .val { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; border-bottom: 1.5px solid #cbd5e1; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .calc-table { width: 100%; max-width: 360px; margin-left: auto; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
          .calc-row { display: flex; justify-content: space-between; padding: 7px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
          .calc-row.highlight { background: #f0fdf4; font-weight: 800; font-size: 14px; color: #15803d; border-top: 2px solid #16a34a; }
          .calc-row.minus { color: #dc2626; font-weight: 600; }
          .footer { margin-top: 36px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
          @media print { body { padding: 12px; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">AZIZ INTERNATIONAL TRADING CO.</h1>
            <div class="subtitle">Commission Agent & Wholesale Fruit Mandi, Shed 14, Azadpur, Delhi</div>
            <div class="subtitle">APMC License: APMC/AZD/2026/894 • Phone: +91 98765 43210</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">TRUCK SETTLEMENT INVOICE</span>
            <div style="font-size: 11px; margin-top: 6px; color: #475569;">Date: ${formatDisplayDate(getSystemDate())}</div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div class="label">Vyapari / Supplier</div>
            <div class="val">${supplier?.supplier_name || 'Supplier'}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Phone: ${supplier?.phone || '—'}</div>
          </div>
          <div>
            <div class="label">Bank Settlement Passbook</div>
            <div class="val">${supplier?.bank_name || 'Bank Account'}</div>
            <div style="font-size: 11px; color: #059669; font-weight: 700; font-family: monospace;">A/C: ${supplier?.account_number || '—'}</div>
            <div style="font-size: 10px; color: #64748b;">IFSC: ${supplier?.ifsc_code || '—'} • ${supplier?.branch_name || ''}</div>
          </div>
          <div>
            <div class="label">Truck Details</div>
            <div class="val" style="font-family: monospace; font-size: 14px; color: #2563eb;">${truckNo}</div>
            <div style="font-size: 11px; color: #64748b;">Produce: ${fruitName || 'Fresh Fruits'}</div>
          </div>
          <div>
            <div class="label">Total Sold (Status)</div>
            <div class="val" style="color: #15803d;">${totalBoxes} Boxes Sold (Complete)</div>
            <div style="font-size: 11px; color: #64748b;">All Stock Cleared • 0 Balance</div>
          </div>
        </div>

        <h3 style="font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; color: #334155; font-weight: 800;">Customer-wise Bikri Parchi Details</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer Name</th>
              <th>Produce</th>
              <th>Boxes & Rate</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(truckSales || []).map(s => `
              <tr>
                <td>${formatDisplayDate(s.selling_date) || '—'}</td>
                <td><strong>${s.customer_name || 'Customer'}</strong></td>
                <td>${s.product_name || fruitName || 'Fruit'}</td>
                <td><strong>${s.boxes} BX</strong> @ ₹${Number(s.rate_per_box).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 700;">₹${Number(s.total).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800;">
              <td colspan="3" style="text-align: right;">Total Bikri (${totalBoxes} Boxes):</td>
              <td>${totalBoxes} BX</td>
              <td style="text-align: right; color: #0f172a; font-size: 13px;">₹${totalSold.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: flex-end;">
          <div class="calc-table">
            <div class="calc-row">
              <span>Total Sold (Gross Bikri):</span>
              <strong style="color: #0f172a;">₹${totalSold.toLocaleString()}</strong>
            </div>
            <div class="calc-row minus">
              <span>Less: Commission (${settlement?.commissionPercent || 5}%):</span>
              <strong>- ₹${commAmount.toLocaleString()}</strong>
            </div>
            <div class="calc-row minus">
              <span>Less: Truck Fare (TF):</span>
              <strong>- ₹${fareAmount.toLocaleString()}</strong>
            </div>
            <div class="calc-row minus">
              <span>Less: Kuli (Hamali):</span>
              <strong>- ₹${kuliAmount.toLocaleString()}</strong>
            </div>
            ${cashAmount > 0 ? `
            <div class="calc-row minus">
              <span>Less: Other:</span>
              <strong>- ₹${cashAmount.toLocaleString()}</strong>
            </div>
            ` : ''}
            <div class="calc-row highlight">
              <span>NET INVOICE TOTAL (Payable):</span>
              <span>₹${invoiceTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>
            Prepared by: ${currentUser?.first_name || 'Aziz'} (Aarhtiya)
            <br>System Generated Mandi Parchi
          </div>
          <div style="text-align: right;">
            <div style="height: 35px;"></div>
            <div>Authorized Signature & Mandi Seal</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
  };

  const handleDownloadTruckInvoicePDF = (supplier, truckNo, fruitName, truckSales, totalBoxes, totalSold, settlement, commAmount, fareAmount, kuliAmount, invoiceTotal, cashAmount = 0) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const suppName = supplier?.supplier_name || supplier?.name || 'Vyapari / Supplier';
      const billDate = formatDisplayDate(getSystemDate());
      const billNo = `SETTL-${truckNo}-${String(Date.now()).slice(-5)}`;

      // Brand Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('AZIZ INTERNATIONAL TRADING CO.', 105, 18, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Commission Agent & Wholesale Fruit Mandi, Shed 14, Azadpur, Delhi', 105, 24, { align: 'center' });
      doc.text('APMC License: APMC/AZD/2026/894 • Phone: +91 98765 43210', 105, 29, { align: 'center' });

      // Badge Title
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(55, 33, 100, 7.5, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('VYAPARI SETTLEMENT BILL / INVOICE', 105, 38.2, { align: 'center' });

      // Divider line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 44, 196, 44);

      // Meta Details (Grid Box)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 47, 182, 28, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, 47, 182, 28, 2, 2, 'D');

      // Left Column: Supplier & Bank
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Vyapari: ${suppName}`, 18, 54);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Phone: ${supplier?.phone || '—'}`, 18, 59.5);
      doc.text(`Bank: ${supplier?.bank_name || 'Bank Account'} • A/C: ${supplier?.account_number || '—'}`, 18, 65);
      doc.text(`IFSC: ${supplier?.ifsc_code || '—'} • Branch: ${supplier?.branch_name || '—'}`, 18, 70.5);

      // Right Column: Truck & Meta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235);
      doc.text(`Truck No: ${truckNo}`, 192, 54, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Produce: ${fruitName || 'Fresh Fruits'}`, 192, 59.5, { align: 'right' });
      doc.text(`Date: ${billDate}`, 192, 65, { align: 'right' });
      doc.text(`Bill Ref: ${billNo}`, 192, 70.5, { align: 'right' });

      // Table Header: Customer-wise Bikri Sales
      let yPos = 81;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text('CUSTOMER-WISE BIKRI PARCHI DETAILS', 14, yPos);
      yPos += 3;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, yPos, 182, 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Date', 18, yPos + 5);
      doc.text('Customer Name', 45, yPos + 5);
      doc.text('Produce', 95, yPos + 5);
      doc.text('Boxes & Rate', 145, yPos + 5, { align: 'center' });
      doc.text('Total (Rs)', 192, yPos + 5, { align: 'right' });

      yPos += 7.5;
      doc.setFont('helvetica', 'normal');

      (truckSales || []).forEach((sale) => {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
          doc.setFillColor(241, 245, 249);
          doc.rect(14, yPos, 182, 7.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text('Date', 18, yPos + 5);
          doc.text('Customer Name', 45, yPos + 5);
          doc.text('Produce', 95, yPos + 5);
          doc.text('Boxes & Rate', 145, yPos + 5, { align: 'center' });
          doc.text('Total (Rs)', 192, yPos + 5, { align: 'right' });
          yPos += 7.5;
          doc.setFont('helvetica', 'normal');
        }

        const sBoxes = Number(sale.boxes || 0);
        const sRate = Number(sale.rate_per_box || 0);
        const sTotal = Number(sale.total || 0);
        const sDate = formatDisplayDate(sale.selling_date || sale.date || getSystemDate());

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(14, yPos, 196, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(sDate, 18, yPos + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(sale.customer_name || 'Customer').slice(0, 22), 45, yPos + 5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(String(sale.product_name || fruitName || 'Fruit').slice(0, 20), 95, yPos + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(`${sBoxes} BX @ Rs ${sRate.toLocaleString('en-IN')}`, 145, yPos + 5, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(`Rs ${sTotal.toLocaleString('en-IN')}`, 192, yPos + 5, { align: 'right' });

        yPos += 7;
      });

      // Bottom Table Border
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(14, yPos, 196, yPos);

      // Check space for settlement calculation box
      if (yPos > 215) {
        doc.addPage();
        yPos = 20;
      } else {
        yPos += 6;
      }

      // Settlement Calculation Box
      const boxWidth = 100;
      const boxX = 196 - boxWidth;
      const calcHeight = cashAmount > 0 ? 44 : 37;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(boxX, yPos, boxWidth, calcHeight, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(boxX, yPos, boxWidth, calcHeight, 2, 2, 'D');

      let cY = yPos + 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Sold (Gross Bikri):`, boxX + 4, cY);
      doc.text(`Rs ${totalSold.toLocaleString('en-IN')}`, 192, cY, { align: 'right' });

      cY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 38, 38);
      doc.text(`Less: Commission (${settlement?.commissionPercent !== undefined && settlement?.commissionPercent !== '' ? settlement.commissionPercent : 0}%):`, boxX + 4, cY);
      doc.text(`- Rs ${commAmount.toLocaleString('en-IN')}`, 192, cY, { align: 'right' });

      cY += 5.5;
      doc.text(`Less: Truck Fare (TF):`, boxX + 4, cY);
      doc.text(`- Rs ${fareAmount.toLocaleString('en-IN')}`, 192, cY, { align: 'right' });

      cY += 5.5;
      doc.text(`Less: Kuli (Hamali):`, boxX + 4, cY);
      doc.text(`- Rs ${kuliAmount.toLocaleString('en-IN')}`, 192, cY, { align: 'right' });

      if (cashAmount > 0) {
        cY += 5.5;
        doc.text(`Less: Other:`, boxX + 4, cY);
        doc.text(`- Rs ${cashAmount.toLocaleString('en-IN')}`, 192, cY, { align: 'right' });
      }

      cY += 7;
      doc.setFillColor(240, 253, 244);
      doc.rect(boxX + 0.5, cY - 4.5, boxWidth - 1, 7.5, 'F');
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.4);
      doc.line(boxX, cY - 4.5, 196, cY - 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(21, 128, 61);
      doc.text(`NET PAYABLE TOTAL:`, boxX + 4, cY + 1);
      doc.text(`Rs ${invoiceTotal.toLocaleString('en-IN')}`, 192, cY + 1, { align: 'right' });

      // Footer
      const footerY = Math.max(yPos + calcHeight + 14, 270);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, footerY, 196, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Prepared by: ${currentUser?.first_name || 'Aziz'} (Aarhtiya) • Mandi Vyapari Settlement Bill`, 14, footerY + 5);
      doc.text('Authorized Signature & Mandi Seal', 196, footerY + 5, { align: 'right' });

      const cleanName = suppName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Vyapari_Settlement_${truckNo}_${cleanName}_${billDate}.pdf`);
      if (showToast) showToast(`Vyapari Bill PDF (${truckNo}) downloaded successfully! 📄📥`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      if (showToast) showToast('Could not generate PDF directly, opening print view...', 'info');
      handlePrintTruckInvoice(supplier, truckNo, fruitName, truckSales, totalBoxes, totalSold, settlement, commAmount, fareAmount, kuliAmount, invoiceTotal, cashAmount);
    }
  };

  const [copiedBankSupplierId, setCopiedBankSupplierId] = useState(null);
  const [savedSettlementTruck, setSavedSettlementTruck] = useState(null);

  // ---------------------------------------------------------------------------
  // Cash Sale Sidebar State
  // ---------------------------------------------------------------------------
  const [isCashSaleSidebarOpen, setIsCashSaleSidebarOpen] = useState(false);
  const [cashSaleSupplier, setCashSaleSupplier] = useState(null); // active supplier for sidebar
  const [cashSaleSettlements, setCashSaleSettlements] = useState(() => {
    try {
      const fullWipe = localStorage.getItem('mandi_clean_slate_total_v2');
      if (!fullWipe) {
        localStorage.removeItem('mandi_cash_sale_settlements');
        localStorage.removeItem('mandi_cash_sale_payments');
        localStorage.removeItem('mandi_truck_settlements');
        return [];
      }
      return JSON.parse(localStorage.getItem('mandi_cash_sale_settlements')) || [];
    } catch { return []; }
  });
  const [cashSalePayments, setCashSalePayments] = useState(() => {
    try {
      const fullWipe = localStorage.getItem('mandi_clean_slate_total_v2');
      if (!fullWipe) {
        return [];
      }
      return JSON.parse(localStorage.getItem('mandi_cash_sale_payments')) || [];
    } catch { return []; }
  });
  const [cashSidebarTab, setCashSidebarTab] = useState('invoices'); // 'invoices' | 'payments'
  const [cashPaymentForm, setCashPaymentForm] = useState({
    date: getSystemDate(),
    amount: '',
    payment_method: 'CASH',
    reference: '',
    notes: '',
    truck_no: ''
  });
  const [isCashPaymentFormOpen, setIsCashPaymentFormOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  const saveCashSaleSettlements = (updated) => {
    try { localStorage.setItem('mandi_cash_sale_settlements', JSON.stringify(updated)); } catch { }
  };
  const saveCashSalePayments = (updated) => {
    try { localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updated)); } catch { }
  };

  // Saved Daily Reports State & Persistence
  const [savedReports, setSavedReports] = useState(() => {
    try {
      const raw = localStorage.getItem('mandi_daily_saved_reports');
      if (raw) return JSON.parse(raw);
    } catch { }
    return [];
  });

  const saveDailyReport = (reportData) => {
    if (!reportData || !reportData.date) return;
    const cleanDate = String(reportData.date).includes('T') ? String(reportData.date).split('T')[0] : String(reportData.date);
    const updated = [
      { ...reportData, date: cleanDate },
      ...(savedReports || []).filter(r => {
        const rDate = String(r.date).includes('T') ? String(r.date).split('T')[0] : String(r.date);
        return rDate !== cleanDate;
      })
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    setSavedReports(updated);
    try {
      localStorage.setItem('mandi_daily_saved_reports', JSON.stringify(updated));
    } catch { }

    api.post('/reports/saved-daily/', reportData).catch(() => null);
    return updated;
  };

  const handleDeleteDailyReport = (reportIdOrDate) => {
    const updated = (savedReports || []).filter(r => (r.id !== reportIdOrDate && r.date !== reportIdOrDate));
    setSavedReports(updated);
    try {
      localStorage.setItem('mandi_daily_saved_reports', JSON.stringify(updated));
    } catch { }
    api.delete(`/reports/saved-daily/?id=${reportIdOrDate}`).catch(() => null);
  };

  const handleUnlockDailyReport = (reportIdOrDate) => {
    const updated = (savedReports || []).map(r => {
      if (r.id === reportIdOrDate || r.date === reportIdOrDate) {
        return { ...r, isLocked: false };
      }
      return r;
    });
    setSavedReports(updated);
    try {
      localStorage.setItem('mandi_daily_saved_reports', JSON.stringify(updated));
    } catch { }
    const unlockedReport = updated.find(r => r.id === reportIdOrDate || r.date === reportIdOrDate);
    if (unlockedReport) {
      api.post('/reports/saved-daily/', unlockedReport).catch(() => null);
    }
  };

  // Sync saved reports from backend on load
  useEffect(() => {
    api.get('/reports/saved-daily/')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setSavedReports(prev => {
            const map = new Map();
            (prev || []).forEach(r => map.set(r.date, r));
            res.forEach(r => map.set(r.date, r));
            const merged = Array.from(map.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            try { localStorage.setItem('mandi_daily_saved_reports', JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
      })
      .catch(() => null);
  }, []);

  const handleSaveSettlementAndOpenSidebar = (supplier, tNum, invoiceTotal, totalSoldValue, commAmount, fareAmount, kuliAmount, cashAmount = 0, fruit = '', boxes = 0) => {
    const suppName = supplier?.supplier_name || '';
    const isAlreadySettled = (cashSaleSettlements || []).some(
      r => r.truck_no === tNum && (r.supplier_name || '').trim().toLowerCase() === suppName.trim().toLowerCase()
    );

    // If already saved, ask for confirmation when clicked again
    if (isAlreadySettled) {
      const confirmUpdate = window.confirm(
        `Truck ${tNum} ka settlement pehle se save hai.\n\nKya aap is settlement ko naye Total Amount (₹${invoiceTotal.toLocaleString()}) ke sath update karna chahte hain?`
      );
      if (!confirmUpdate) return;
    }

    setSavedSettlementTruck(tNum);

    // Save settlement record
    const record = {
      id: Date.now(),
      supplier_name: suppName,
      truck_no: tNum,
      saved_date: getSystemDate(),
      gross_bikri: totalSoldValue,
      total_amount: invoiceTotal,
      commission: commAmount,
      truck_fare: fareAmount,
      kuli: kuliAmount,
      cash_advance: cashAmount,
      net_invoice: invoiceTotal,
      fruit: fruit || '',
      boxes: boxes || 0,
      status: 'PENDING' // PENDING | PAID | PARTIAL
    };
    setCashSaleSettlements(prev => {
      const exists = prev.find(r => r.truck_no === tNum && (r.supplier_name || '').trim().toLowerCase() === suppName.trim().toLowerCase());
      let updated;
      if (exists) {
        updated = prev.map(r => r.truck_no === tNum && (r.supplier_name || '').trim().toLowerCase() === suppName.trim().toLowerCase() ? { ...r, ...record, id: r.id } : r);
      } else {
        updated = [record, ...prev];
      }
      saveCashSaleSettlements(updated);
      return updated;
    });

    // Only show toast message, do NOT open sidebar
    if (showToast) {
      if (isAlreadySettled) {
        showToast(`Truck ${tNum} ka settlement update ho gaya! Party Khata me Total Amount ₹${invoiceTotal.toLocaleString()} set ho gaya. ✓`, 'success');
      } else {
        showToast(`Settlement save ho gaya! Party Khata me Total Amount ₹${invoiceTotal.toLocaleString()} set ho gaya. ✓`, 'success');
      }
    }
  };

  const handleCashPaymentSave = (e) => {
    if (e) e.preventDefault();
    const amt = Number(cashPaymentForm.amount);
    if (!amt || amt <= 0) {
      if (showToast) showToast('Please enter a valid payment amount', 'error');
      return;
    }
    const suppName = cashSaleSupplier?.supplier_name || '';
    const newPay = {
      id: Date.now(),
      supplier_name: suppName,
      truck_no: cashPaymentForm.truck_no || selectedInvoiceForPayment?.truck_no || '',
      date: cashPaymentForm.date,
      amount: amt,
      payment_method: cashPaymentForm.payment_method,
      reference: cashPaymentForm.reference || `PAY-${Date.now().toString().slice(-4)}`,
      notes: cashPaymentForm.notes || 'Supplier payment'
    };
    setCashSalePayments(prev => {
      const updated = [newPay, ...prev];
      saveCashSalePayments(updated);
      return updated;
    });
    // Update invoice status
    if (selectedInvoiceForPayment) {
      setCashSaleSettlements(prev => {
        const updated = prev.map(inv => {
          if (inv.id === selectedInvoiceForPayment.id) {
            const totalPaid = cashSalePayments
              .filter(p => p.truck_no === inv.truck_no && p.supplier_name === inv.supplier_name)
              .reduce((s, p) => s + Number(p.amount), 0) + amt;
            const status = totalPaid >= inv.net_invoice ? 'PAID' : 'PARTIAL';
            return { ...inv, status };
          }
          return inv;
        });
        saveCashSaleSettlements(updated);
        return updated;
      });
    }
    setCashPaymentForm({ date: getSystemDate(), amount: '', payment_method: 'CASH', reference: '', notes: '', truck_no: '' });
    setIsCashPaymentFormOpen(false);
    setSelectedInvoiceForPayment(null);
    if (showToast) showToast(`Payment ₹${amt.toLocaleString()} saved successfully! 💵`, 'success');
  };

  // Edit passbook / supplier profile modal state (inside Supplier Profiles & Trucks)
  const [isEditPassbookOpen, setIsEditPassbookOpen] = useState(false);
  const [passbookForm, setPassbookForm] = useState({
    id: null,
    supplier_name: '',
    phone: '',
    city: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: ''
  });
  const [isSavingPassbook, setIsSavingPassbook] = useState(false);

  // Add new supplier modal state (inside Supplier Profiles & Trucks)
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [newSupplierModalForm, setNewSupplierModalForm] = useState({
    supplier_name: '',
    phone: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: ''
  });
  const [isSavingSupplierModal, setIsSavingSupplierModal] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. Supplier Entry Form State
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState({
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
    damage_boxes: ''
  });

  // Supplier Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestionRef = useRef(null);

  // Dynamic Saved Fruit Names & Varieties (User-entered, persisted in localStorage + MySQL)
  const [savedFruitNames, setSavedFruitNames] = useState(() => {
    try {
      const fullWipe = localStorage.getItem('mandi_clean_slate_total_v2');
      if (!fullWipe) {
        localStorage.removeItem('mandi_custom_fruit_names');
        localStorage.removeItem('mandi_fruit_names');
        return [];
      }
      localStorage.removeItem('mandi_fruit_names');
      const saved = localStorage.getItem('mandi_custom_fruit_names');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  });

  const [savedFruitVarieties, setSavedFruitVarieties] = useState(() => {
    try {
      const fullWipe = localStorage.getItem('mandi_clean_slate_total_v2');
      if (!fullWipe) {
        localStorage.removeItem('mandi_custom_fruit_varieties');
        localStorage.removeItem('mandi_fruit_varieties');
        return [];
      }
      localStorage.removeItem('mandi_fruit_varieties');
      const saved = localStorage.getItem('mandi_custom_fruit_varieties');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  });

  // Fruit Name Autocomplete State
  const [fruitSuggestions, setFruitSuggestions] = useState([]);
  const [showFruitSuggestions, setShowFruitSuggestions] = useState(false);
  const [activeFruitIndex, setActiveFruitIndex] = useState(-1);
  const fruitRef = useRef(null);
  const fruitInputRef = useRef(null);

  // Fruit Variety Autocomplete State
  const [varietySuggestions, setVarietySuggestions] = useState([]);
  const [showVarietySuggestions, setShowVarietySuggestions] = useState(false);
  const [activeVarietyIndex, setActiveVarietyIndex] = useState(-1);
  const varietyRef = useRef(null);
  const varietyInputRef = useRef(null);
  const boxesInputRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 2. Supplier Profiles State (persisted in localStorage)
  // ---------------------------------------------------------------------------
  const [supplierProfiles, setSupplierProfiles] = useState(() => {
    try {
      const fullWipe = localStorage.getItem('mandi_clean_slate_total_v2');
      if (!fullWipe) {
        localStorage.removeItem('dashboard_supplier_profiles');
        return [];
      }
      const saved = localStorage.getItem('dashboard_supplier_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(p => !['Maa Fruits Mandi Traders', 'Royal Kashmir Orchards'].includes(p.supplier_name))
            .map(p => ({
              ...p,
              variety: p.variety === 'Grade A' ? '' : (p.variety || ''),
              balance_box: Number(p.balance_box !== undefined ? p.balance_box : p.boxes || 0)
            }));
        }
      }
    } catch {
      // ignore
    }

    if (truckPayments && truckPayments.length > 0) {
      return truckPayments.map(tp => {
        const supp = suppliers.find(s => s.id === tp.supplier || s.supplier_name === tp.supplier_name);
        return {
          id: tp.id || Date.now() + Math.random(),
          supplier_name: tp.supplier_name || supp?.supplier_name || 'Supplier',
          phone: supp?.phone || '',
          bank_name: supp?.bank_name || '',
          account_number: supp?.account_number || '',
          ifsc_code: supp?.ifsc_code || '',
          branch_name: supp?.branch_name || '',
          truckno: tp.truck_number || '0000000',
          date: tp.payment_date || getSystemDate(),
          fruit: tp.fruit_name || '',
          variety: tp.variety === 'Grade A' ? '' : (tp.variety || ''),
          boxes: Number(tp.no_of_boxes || 0),
          balance_box: Number(tp.no_of_boxes || 0)
        };
      });
    }

    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(supplierProfiles));
    } catch {
      // ignore
    }
  }, [supplierProfiles]);

  useEffect(() => {
    try {
      localStorage.setItem('mandi_custom_fruit_names', JSON.stringify(savedFruitNames));
    } catch { }
  }, [savedFruitNames]);

  useEffect(() => {
    try {
      localStorage.setItem('mandi_custom_fruit_varieties', JSON.stringify(savedFruitVarieties));
    } catch { }
  }, [savedFruitVarieties]);

  // Clean Slate Initialization: Remove any legacy mock data and clean Grade A from current profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard_supplier_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(p => p.variety === 'Grade A')) {
          const cleaned = parsed.map(p => ({
            ...p,
            variety: p.variety === 'Grade A' ? '' : (p.variety || '')
          }));
          localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(cleaned));
          setSupplierProfiles(cleaned);
        }
      }
    } catch { }

    const isTotalCleaned = localStorage.getItem('mandi_clean_slate_total_v2');
    if (!isTotalCleaned) {
      localStorage.removeItem('dashboard_supplier_profiles');
      localStorage.removeItem('mandi_customer_profiles');
      localStorage.removeItem('mandi_truck_sales');
      localStorage.removeItem('mandi_truck_settlements');
      localStorage.removeItem('mandi_cash_sale_settlements');
      localStorage.removeItem('mandi_cash_sale_payments');
      localStorage.removeItem('mandi_party_khata_profiles');
      localStorage.removeItem('mandi_custom_fruits');
      localStorage.removeItem('mandi_custom_fruit_varieties');
      localStorage.removeItem('mandi_custom_fruit_names');
      localStorage.removeItem('mandi_fruit_names');
      localStorage.removeItem('mandi_fruit_varieties');
      localStorage.setItem('mandi_clean_slate_total_v2', 'true');
      setSupplierProfiles([]);
      setCustomerProfiles([]);
      setTruckSalesList([]);
      setCashSaleSettlements([]);
      setCashSalePayments([]);
      setSavedFruitNames([]);
      setSavedFruitVarieties([]);
    }
  }, []);


  // ---------------------------------------------------------------------------
  // 3. Unified Customer Profiles State (Single profile per customer with buy & payment history)
  // ---------------------------------------------------------------------------
  const [customerProfiles, setCustomerProfiles] = useState(() => {
    try {
      const fullWipe = localStorage.getItem('mandi_clean_slate_total_v2');
      if (!fullWipe) {
        localStorage.removeItem('mandi_customer_profiles');
        return [];
      }
      const saved = localStorage.getItem('mandi_customer_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => !['Sharma Fruits Wholesale', 'FreshMart Hypermarkets', 'Golden Tree Dry Fruits & Sweets'].includes(c.customer_name));
        }
      }
    } catch {
      // ignore
    }

    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('mandi_customer_profiles', JSON.stringify(customerProfiles));
    } catch {
      // ignore
    }
  }, [customerProfiles]);

  // Truck-wise fruit sales history (persisted in localStorage)
  const [truckSalesList, setTruckSalesList] = useState(() => {
    try {
      const fullWipe = localStorage.getItem('mandi_clean_slate_total_v2');
      if (!fullWipe) {
        localStorage.removeItem('mandi_truck_sales');
        return [];
      }
      const saved = localStorage.getItem('mandi_truck_sales');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('mandi_truck_sales', JSON.stringify(truckSalesList));
    } catch {
      // ignore
    }
  }, [truckSalesList]);

  // ---------------------------------------------------------------------------
  // 4. Sale Modal State (Triggered on clicking ANY supplier profile card)
  // ---------------------------------------------------------------------------
  const [selectedProfileForSale, setSelectedProfileForSale] = useState(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleTotalInput, setSaleTotalInput] = useState('');
  const [rateAppliedNotice, setRateAppliedNotice] = useState(false);
  const [saleForm, setSaleForm] = useState({
    date: getSystemDate(),
    customer_name: '',
    phone: '',
    city: '',
    product_name: '',
    boxes: '',
    rate_per_box: '',
    payment_mode: 'CREDIT',
    amount_paid: ''
  });

  // Customer Autocomplete in Sale Modal
  const [saleCustomerSuggestions, setSaleCustomerSuggestions] = useState([]);
  const [showSaleCustomerSuggestions, setShowSaleCustomerSuggestions] = useState(false);
  const [activeSaleCustomerIndex, setActiveSaleCustomerIndex] = useState(-1);
  const saleCustomerRef = useRef(null);
  const saleCustomerInputRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 5. Customer Directory & Unified Profile Modal State (Triggered from Top Button)
  // ---------------------------------------------------------------------------
  const [internalCustomerModalOpen, setInternalCustomerModalOpen] = useState(false);
  const isCustomerModalOpen = extIsCustomerModalOpen !== undefined ? extIsCustomerModalOpen : internalCustomerModalOpen;
  const setIsCustomerModalOpen = extSetIsCustomerModalOpen || setInternalCustomerModalOpen;
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerForView, setSelectedCustomerForView] = useState(null);
  const [isCustomerDetailPopupOpen, setIsCustomerDetailPopupOpen] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState('buy'); // 'buy' | 'payment'
  const [selectedBuyDateDetails, setSelectedBuyDateDetails] = useState(null);
  const [isBillSelectMode, setIsBillSelectMode] = useState(false);
  const [selectedBillItemIds, setSelectedBillItemIds] = useState([]);
  const [selectedItemsForBill, setSelectedItemsForBill] = useState(null);
  const [selectedItemForBill, setSelectedItemForBill] = useState(null);

  useEffect(() => {
    if (selectedCustomerForView) {
      const fresh = customerProfiles.find(c => c.id === selectedCustomerForView.id || (c.customer_name || '').toLowerCase() === (selectedCustomerForView.customer_name || '').toLowerCase());
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedCustomerForView)) {
        setSelectedCustomerForView(fresh);
      }
    }
  }, [customerProfiles, selectedCustomerForView]);
  const [billPayForm, setBillPayForm] = useState({
    amount: '',
    date: getSystemDate(),
    payment_method: 'CASH',
    reference: '',
    notes: ''
  });

  // Payment Drawer inside Customer Profile
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: getSystemDate(),
    amount: '',
    less: '',
    payment_method: 'CASH',
    reference: '',
    notes: ''
  });

  // Add New Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    customer_name: '',
    phone: '',
    address: '',
    opening_balance: ''
  });

  // Edit Existing Customer Modal
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
    id: null,
    customer_name: '',
    phone: '',
    city: '',
    address: ''
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Click outside suggestion dropdowns to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (saleCustomerRef.current && !saleCustomerRef.current.contains(e.target)) {
        setShowSaleCustomerSuggestions(false);
      }
      if (fruitRef.current && !fruitRef.current.contains(e.target)) {
        setShowFruitSuggestions(false);
      }
      if (varietyRef.current && !varietyRef.current.contains(e.target)) {
        setShowVarietySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers: Supplier Autocomplete
  // ---------------------------------------------------------------------------
  const handleSupplierNameChange = (val) => {
    setForm(prev => ({ ...prev, supplier_name: val }));

    if (!val || val.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = val.toLowerCase().trim();
    const combined = [...suppliers];
    supplierProfiles.forEach(p => {
      if (!combined.some(c => (c.supplier_name || '').toLowerCase() === (p.supplier_name || '').toLowerCase())) {
        combined.push(p);
      }
    });

    const matches = combined.filter(s => {
      const name = (s.supplier_name || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setActiveSuggestionIndex(-1);
  };

  const handleSelectSuggestion = (s) => {
    setForm(prev => ({
      ...prev,
      supplier_name: s.supplier_name || '',
      phone: s.phone || prev.phone || '',
      bank_name: s.bank_name || prev.bank_name || '',
      account_number: s.account_number || prev.account_number || '',
      ifsc_code: s.ifsc_code || prev.ifsc_code || '',
      branch_name: s.branch_name || prev.branch_name || '',
      truckno: s.truckno || prev.truckno || '',
      fruit: s.fruit || prev.fruit || '',
      variety: s.variety || prev.variety || ''
    }));
    setShowSuggestions(false);
    if (showToast) {
      showToast(`Supplier ${s.supplier_name} details auto-filled! ✨`);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] : null;
      if (target) {
        handleSelectSuggestion(target);
      } else {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Save Fruit Name & Variety to Dynamic Catalog + MySQL Database
  // ---------------------------------------------------------------------------
  const saveFruitAndVariety = async (fruitName, varietyName) => {
    const cleanFruit = (fruitName || '').trim();
    const cleanVariety = (varietyName || '').trim();

    if (cleanFruit) {
      setSavedFruitNames(prev => {
        const exists = prev.some(f => f.toLowerCase() === cleanFruit.toLowerCase());
        if (!exists) {
          const updated = [...prev, cleanFruit];
          try {
            localStorage.setItem('mandi_custom_fruit_names', JSON.stringify(updated));
          } catch { }
          // Sync new product to MySQL
          api.post('/products/', {
            name: cleanFruit,
            product_code: `FRUIT-${Date.now().toString().slice(-4)}`,
            category: 1,
            default_unit: 2,
            status: 'ACTIVE'
          }).catch(() => null);
          return updated;
        }
        return prev;
      });
    }

    if (cleanVariety) {
      setSavedFruitVarieties(prev => {
        const exists = prev.some(v => v.toLowerCase() === cleanVariety.toLowerCase());
        if (!exists) {
          const updated = [...prev, cleanVariety];
          try {
            localStorage.setItem('mandi_custom_fruit_varieties', JSON.stringify(updated));
          } catch { }
          // Sync new variety to MySQL
          api.post('/products/varieties/', {
            variety_name: cleanVariety
          }).catch(() => null);
          return updated;
        }
        return prev;
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Fruit Name Autocomplete & Keyboard Enter Selection
  // ---------------------------------------------------------------------------
  const handleFruitChange = (val) => {
    setForm(prev => ({ ...prev, fruit: val }));
    const q = (val || '').trim().toLowerCase();
    if (!q) {
      setFruitSuggestions([]);
      setShowFruitSuggestions(false);
      setActiveFruitIndex(-1);
      return;
    }
    const filtered = savedFruitNames.filter(f => f.toLowerCase().includes(q));
    setFruitSuggestions(filtered);
    setShowFruitSuggestions(filtered.length > 0);
    setActiveFruitIndex(-1);
  };

  const handleSelectFruit = (selectedFruit) => {
    const cleanFruit = (selectedFruit || '').trim();
    if (!cleanFruit) return;
    setForm(prev => ({ ...prev, fruit: cleanFruit }));
    saveFruitAndVariety(cleanFruit, '');
    setShowFruitSuggestions(false);
    setActiveFruitIndex(-1);
    if (varietyInputRef.current) {
      varietyInputRef.current.focus();
    }
  };

  const handleFruitKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showFruitSuggestions && fruitSuggestions.length > 0) {
        setShowFruitSuggestions(true);
        return;
      }
      setActiveFruitIndex(prev => (prev < fruitSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveFruitIndex(prev => (prev > 0 ? prev - 1 : fruitSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      let chosen = '';
      if (showFruitSuggestions && activeFruitIndex >= 0 && fruitSuggestions[activeFruitIndex]) {
        chosen = fruitSuggestions[activeFruitIndex];
      } else if (form.fruit && form.fruit.trim()) {
        const exact = fruitSuggestions.find(f => f.toLowerCase() === form.fruit.trim().toLowerCase());
        chosen = exact || form.fruit.trim();
      }

      if (chosen) {
        handleSelectFruit(chosen);
      } else {
        setShowFruitSuggestions(false);
        if (varietyInputRef.current) {
          varietyInputRef.current.focus();
        }
      }
    } else if (e.key === 'Escape') {
      setShowFruitSuggestions(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Fruit Variety Autocomplete & Keyboard Enter Selection
  // ---------------------------------------------------------------------------
  const handleVarietyChange = (val) => {
    setForm(prev => ({ ...prev, variety: val }));
    const q = (val || '').trim().toLowerCase();
    if (!q) {
      setVarietySuggestions([]);
      setShowVarietySuggestions(false);
      setActiveVarietyIndex(-1);
      return;
    }
    const filtered = savedFruitVarieties.filter(v => v.toLowerCase().includes(q));
    setVarietySuggestions(filtered);
    setShowVarietySuggestions(filtered.length > 0);
    setActiveVarietyIndex(-1);
  };

  const handleSelectVariety = (selectedVariety) => {
    const cleanVariety = (selectedVariety || '').trim();
    if (!cleanVariety) return;
    setForm(prev => ({ ...prev, variety: cleanVariety }));
    saveFruitAndVariety('', cleanVariety);
    setShowVarietySuggestions(false);
    setActiveVarietyIndex(-1);
    if (boxesInputRef.current) {
      boxesInputRef.current.focus();
    }
  };

  const handleVarietyKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showVarietySuggestions && varietySuggestions.length > 0) {
        setShowVarietySuggestions(true);
        return;
      }
      setActiveVarietyIndex(prev => (prev < varietySuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveVarietyIndex(prev => (prev > 0 ? prev - 1 : varietySuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      let chosen = '';
      if (showVarietySuggestions && activeVarietyIndex >= 0 && varietySuggestions[activeVarietyIndex]) {
        chosen = varietySuggestions[activeVarietyIndex];
      } else if (form.variety && form.variety.trim()) {
        const exact = varietySuggestions.find(v => v.toLowerCase() === form.variety.trim().toLowerCase());
        chosen = exact || form.variety.trim();
      }

      if (chosen) {
        handleSelectVariety(chosen);
      } else {
        setShowVarietySuggestions(false);
        if (boxesInputRef.current) {
          boxesInputRef.current.focus();
        }
      }
    } else if (e.key === 'Escape') {
      setShowVarietySuggestions(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Save Supplier & Delivery Lot
  // ---------------------------------------------------------------------------
  const handleSaveSupplier = async (e) => {
    if (e) e.preventDefault();

    if (!form.supplier_name.trim()) {
      if (showToast) showToast('Please enter Supplier Name', 'error');
      return;
    }

    if (!form.boxes || Number(form.boxes) <= 0) {
      if (showToast) showToast('Please enter valid number of boxes', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanName = form.supplier_name.trim();
      const matchedSupplier = suppliers.find(s => (s.supplier_name || '').toLowerCase() === cleanName.toLowerCase());
      let supplierId = matchedSupplier?.id;

      if (!matchedSupplier) {
        try {
          const supPayload = {
            supplier_code: `SUP-${Date.now().toString().slice(-4)}`,
            supplier_name: cleanName,
            phone: (form.phone || '').trim(),
            company_name: cleanName,
            city: (form.city || '').trim(),
            bank_name: (form.bank_name || '').trim(),
            account_number: (form.account_number || '').trim(),
            ifsc_code: (form.ifsc_code || '').trim(),
            branch_name: (form.branch_name || '').trim(),
            status: 'ACTIVE'
          };
          const createdSup = await api.post('/suppliers/', supPayload).catch(() => null);
          if (createdSup?.id) {
            supplierId = createdSup.id;
            if (setSuppliers) setSuppliers(prev => [createdSup, ...prev]);
          }
        } catch {
          // ignore
        }
      }

      const boxesCount = Number(form.boxes) || 0;
      const damageCount = Number(form.damage_boxes) || 0;
      if (damageCount > boxesCount) {
        if (showToast) showToast('Damage boxes cannot exceed total boxes!', 'error');
        setIsSubmitting(false);
        return;
      }
      const balanceCount = Math.max(0, boxesCount - damageCount);

      const finalTruckNo = (form.truckno || '').trim().toUpperCase() || '0000000';

      const lotPayload = {
        supplier: supplierId,
        supplier_name: cleanName,
        truck_number: finalTruckNo,
        payment_date: form.date,
        fruit_name: (form.fruit || '').trim(),
        variety: (form.variety || '').trim(),
        no_of_boxes: boxesCount,
        pay: boxesCount * 1200,
        rate_per_box: 1200,
        transport_charge: 0,
        loading_charge: 0,
        unloading_charge: 0,
        commission_charge: 0,
        discount: 0
      };

      await api.post('/purchases/truck-payments/', lotPayload).catch(() => null);

      const newProfile = {
        id: Date.now(),
        supplier_name: cleanName,
        phone: (form.phone || (matchedSupplier?.phone || '')).trim(),
        bank_name: (form.bank_name || (matchedSupplier?.bank_name || '')).trim(),
        account_number: (form.account_number || (matchedSupplier?.account_number || '')).trim(),
        ifsc_code: (form.ifsc_code || (matchedSupplier?.ifsc_code || '')).trim(),
        branch_name: (form.branch_name || (matchedSupplier?.branch_name || '')).trim(),
        truckno: finalTruckNo,
        date: form.date,
        fruit: (form.fruit || '').trim(),
        variety: (form.variety || '').trim(),
        boxes: boxesCount,
        damage_boxes: damageCount,
        balance_box: balanceCount
      };

      setSupplierProfiles(prev => [newProfile, ...prev]);


      // Persist newly typed fruit & variety into dynamic catalog + MySQL
      saveFruitAndVariety(form.fruit, form.variety);

      if (showToast) {
        if (damageCount > 0) {
          showToast(`Profile created for ${cleanName} with ${balanceCount} balance boxes (${boxesCount} Total - ${damageCount} Damage) & saved to MySQL! 📦💾`, 'success');
        } else {
          showToast(`Profile created for ${cleanName} with ${boxesCount} balance boxes & saved to MySQL Database! 📦💾`, 'success');
        }
      }

      setForm({
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
        damage_boxes: ''
      });

      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast('Error saving supplier lot: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Click Anywhere on Supplier Profile Card -> Open Sale Modal
  // ---------------------------------------------------------------------------
  const handleOpenSaleModal = (profile) => {
    if (Number(profile.balance_box || 0) <= 0) {
      if (showToast) {
        showToast(`Truck ${profile.truckno} ka stock complete (0 Balance) ho chuka hai. All details preserved in Supplier Profiles & Trucks Directory.`, 'info');
      }
      return;
    }
    setSelectedProfileForSale(profile);
    const prodName = `${profile.fruit || ''}${profile.variety && profile.variety.trim() ? ' — ' + profile.variety.trim() : ''}`;
    setSaleForm({
      date: getSystemDate(),
      customer_name: '',
      phone: '',
      city: '',
      product_name: prodName,
      boxes: '',
      rate_per_box: '',
      payment_mode: 'CREDIT',
      amount_paid: ''
    });
    setSaleTotalInput('');
    setRateAppliedNotice(false);
    setSaleCustomerSuggestions([]);
    setShowSaleCustomerSuggestions(false);
    setIsSaleModalOpen(true);
    setTimeout(() => {
      if (saleCustomerInputRef.current) {
        saleCustomerInputRef.current.focus();
      }
    }, 100);
  };

  // Customer Autocomplete in Sale Modal
  const handleSaleCustomerChange = (val) => {
    setSaleForm(prev => ({ ...prev, customer_name: val }));

    if (!val || !val.trim()) {
      setSaleCustomerSuggestions([]);
      setShowSaleCustomerSuggestions(false);
      return;
    }

    const query = val.toLowerCase().trim();
    const combined = [...customerProfiles];
    customers.forEach(c => {
      if (!combined.some(p => (p.customer_name || '').toLowerCase() === (c.customer_name || '').toLowerCase())) {
        combined.push({
          id: c.id,
          customer_name: c.customer_name,
          phone: c.phone || '',
          address: c.address || '',
          current_balance: c.current_balance || 0,
          total_boxes: 0,
          total_bought: 0,
          total_paid: 0,
          buy_history: [],
          payment_history: []
        });
      }
    });

    const matches = combined.filter(c =>
      (c.customer_name || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query)
    );

    setSaleCustomerSuggestions(matches);
    setShowSaleCustomerSuggestions(matches.length > 0);
    setActiveSaleCustomerIndex(-1);
  };

  const handleSelectSaleCustomer = (c) => {
    setSaleForm(prev => ({
      ...prev,
      customer_name: c.customer_name,
      phone: c.phone || prev.phone,
      city: c.city || prev.city
    }));
    setShowSaleCustomerSuggestions(false);
    if (showToast) {
      showToast(`Existing Customer "${c.customer_name}" selected! (Khata Due: ₹${Number(c.current_balance || 0).toLocaleString()}) ✨`);
    }
  };

  const handleSaleCustomerKeyDown = (e) => {
    if (!showSaleCustomerSuggestions || saleCustomerSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSaleCustomerIndex(prev => (prev < saleCustomerSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSaleCustomerIndex(prev => (prev > 0 ? prev - 1 : saleCustomerSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeSaleCustomerIndex >= 0 ? saleCustomerSuggestions[activeSaleCustomerIndex] : saleCustomerSuggestions[0];
      if (target) {
        handleSelectSaleCustomer(target);
      }
    } else if (e.key === 'Escape') {
      setShowSaleCustomerSuggestions(false);
    }
  };

  // Live sale numbers & calculations
  const saleBoxesNum = Number(saleForm.boxes) || 0;
  const saleTotalNum = Number(saleTotalInput) || 0;
  const calculatedRateFromTotal = (saleBoxesNum > 0 && saleTotalNum > 0)
    ? (saleTotalNum / saleBoxesNum)
    : null;
  const calculatedTotal = saleTotalNum > 0
    ? saleTotalNum
    : (saleBoxesNum * (Number(saleForm.rate_per_box) || 0));

  // Handle Boxes Change in Sale Form
  const handleSaleBoxesChange = (val) => {
    setSaleForm(prev => {
      const next = { ...prev, boxes: val };
      if (val && next.rate_per_box) {
        const tot = Number(val) * Number(next.rate_per_box);
        setSaleTotalInput(tot > 0 ? tot.toString() : '');
      } else if (!val && next.rate_per_box) {
        setSaleTotalInput('');
      }
      return next;
    });
  };

  // Handle Rate/Box Change in Sale Form
  const handleSaleRateChange = (val) => {
    setSaleForm(prev => {
      const next = { ...prev, rate_per_box: val };
      if (val && prev.boxes) {
        const tot = Number(prev.boxes) * Number(val);
        setSaleTotalInput(tot > 0 ? tot.toString() : '');
      } else if (!val) {
        setSaleTotalInput('');
      }
      return next;
    });
    if (rateAppliedNotice) setRateAppliedNotice(false);
  };

  // Handle Total Amount Change in Sale Form
  const handleSaleTotalAmountChange = (val) => {
    setSaleTotalInput(val);
    if (rateAppliedNotice) setRateAppliedNotice(false);
  };

  // Apply/Put the calculated Rate into Rate / Box (₹) *
  const handleApplyCalculatedRate = () => {
    if (!saleBoxesNum || saleBoxesNum <= 0) {
      if (showToast) showToast("Pehle 'Boxes to Sell' dalein taki Rate hisab put ho sake", 'error');
      return;
    }
    if (!saleTotalNum || saleTotalNum <= 0) {
      if (showToast) showToast("Pehle 'Total Sale Amount' dalein taki Rate hisab put ho sake", 'error');
      return;
    }

    const cleanRate = Number(calculatedRateFromTotal.toFixed(2));
    setSaleForm(prev => ({
      ...prev,
      rate_per_box: cleanRate.toString(),
      payment_mode: 'CASH',
      amount_paid: saleTotalNum.toString()
    }));
    setRateAppliedNotice(true);
    if (showToast) {
      showToast(`Rate ₹${cleanRate.toLocaleString()} / Box put ho gaya! Payment Mode: Cash (Rokda) & Amount Paid: ₹${Number(saleTotalNum).toLocaleString()} set ho gaya! 💵✨`, 'success');
    }
    setTimeout(() => setRateAppliedNotice(false), 3000);
  };

  // When Enter is pressed in the Total Sale Amount field
  const handleTotalAmountKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (calculatedRateFromTotal !== null) {
        handleApplyCalculatedRate();
      } else if (saleTotalNum > 0 && (!saleBoxesNum || saleBoxesNum <= 0)) {
        if (showToast) showToast("Pehle 'Boxes to Sell' dalein taki Rate hisab put ho sake", 'error');
      }
    }
  };

  // On blur of Total Amount, auto-put rate if not set yet
  const handleTotalAmountBlur = () => {
    if (calculatedRateFromTotal !== null && !saleForm.rate_per_box) {
      const cleanRate = Number(calculatedRateFromTotal.toFixed(2));
      setSaleForm(prev => ({
        ...prev,
        rate_per_box: cleanRate.toString()
      }));
      setRateAppliedNotice(true);
      setTimeout(() => setRateAppliedNotice(false), 3000);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Save Sale (Record Kharidari, Deduct Balance Box, Update Khata)
  // ---------------------------------------------------------------------------
  const handleSaveSale = async (e) => {
    if (e) e.preventDefault();
    if (!selectedProfileForSale) return;

    const cleanCustName = saleForm.customer_name.trim();
    if (!cleanCustName) {
      if (showToast) showToast('Please enter Customer Name', 'error');
      return;
    }

    const boxesToSell = Number(saleForm.boxes);
    if (!boxesToSell || boxesToSell <= 0) {
      if (showToast) showToast('Please enter valid number of boxes', 'error');
      return;
    }

    const availBoxes = Number(selectedProfileForSale.balance_box || 0);
    if (boxesToSell > availBoxes) {
      if (showToast) showToast(`Cannot sell ${boxesToSell} boxes. Only ${availBoxes} balance boxes available in this truck lot!`, 'error');
      return;
    }

    let rate = Number(saleForm.rate_per_box);
    if ((!rate || rate <= 0) && Number(saleTotalInput) > 0 && boxesToSell > 0) {
      rate = parseFloat((Number(saleTotalInput) / boxesToSell).toFixed(2));
      setSaleForm(prev => ({ ...prev, rate_per_box: rate.toString() }));
    }

    if (!rate || rate <= 0) {
      if (showToast) showToast('Please enter valid Rate/Box or Total Sale Amount', 'error');
      return;
    }

    const totalAmount = boxesToSell * rate;
    const paidAmount = saleForm.payment_mode === 'CASH'
      ? (saleForm.amount_paid !== '' ? Number(saleForm.amount_paid) : totalAmount)
      : (Number(saleForm.amount_paid) || 0);
    const unpaidAmount = Math.max(0, totalAmount - paidAmount);

    // 1. Deduct boxes from supplierProfile
    const remainingBoxes = Math.max(0, Number(selectedProfileForSale.balance_box || 0) - boxesToSell);
    setSupplierProfiles(prev => prev.map(p => {
      if (p.id === selectedProfileForSale.id) {
        return { ...p, balance_box: remainingBoxes };
      }
      return p;
    }));

    // Update active profile in sale modal so balance and max limit update live
    setSelectedProfileForSale(prev => ({
      ...prev,
      balance_box: remainingBoxes
    }));

    // 2. Buy record & Payment record & Truck Sales record
    const newBuyRecord = {
      id: Date.now(),
      date: saleForm.date,
      product_name: saleForm.product_name,
      truck_no: selectedProfileForSale.truckno,
      supplier_name: selectedProfileForSale.supplier_name,
      boxes: boxesToSell,
      rate_per_box: rate,
      total: totalAmount,
      payment_mode: saleForm.payment_mode,
      amount_paid: paidAmount
    };

    const newTruckSale = {
      id: Date.now(),
      selling_date: saleForm.date,
      customer_name: cleanCustName,
      customer_phone: saleForm.phone,
      truck_no: (selectedProfileForSale.truckno || '').trim().toUpperCase(),
      supplier_name: (selectedProfileForSale.supplier_name || '').trim(),
      product_name: saleForm.product_name,
      boxes: boxesToSell,
      rate_per_box: rate,
      total: totalAmount,
      payment_mode: saleForm.payment_mode
    };
    setTruckSalesList(prev => [newTruckSale, ...prev]);

    let newPaymentRecord = null;
    if (paidAmount > 0) {
      newPaymentRecord = {
        id: Date.now() + 1,
        date: saleForm.date,
        amount: paidAmount,
        payment_method: saleForm.payment_mode,
        reference: `LOT-${selectedProfileForSale.truckno}`,
        notes: `Immediate payment for ${boxesToSell} BX ${saleForm.product_name}`
      };
    }

    // 3. Update or create Customer Profile
    let targetCustomerObj = null;
    setCustomerProfiles(prev => {
      const existingIdx = prev.findIndex(c => (c.customer_name || '').toLowerCase() === cleanCustName.toLowerCase());
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const updated = {
          ...existing,
          phone: saleForm.phone || existing.phone,
          city: saleForm.city || existing.city,
          total_boxes: Number(existing.total_boxes || 0) + boxesToSell,
          total_bought: Number(existing.total_bought || 0) + totalAmount,
          total_paid: Number(existing.total_paid || 0) + paidAmount,
          current_balance: Number(existing.current_balance || 0) + unpaidAmount,
          buy_history: [newBuyRecord, ...(existing.buy_history || [])],
          payment_history: newPaymentRecord ? [newPaymentRecord, ...(existing.payment_history || [])] : (existing.payment_history || [])
        };
        targetCustomerObj = updated;
        const copy = [...prev];
        copy[existingIdx] = updated;
        return copy;
      } else {
        const newCust = {
          id: Date.now(),
          customer_name: cleanCustName,
          phone: (saleForm.phone || '').trim(),
          city: (saleForm.city || '').trim(),
          total_boxes: boxesToSell,
          total_bought: totalAmount,
          total_paid: paidAmount,
          current_balance: unpaidAmount,
          buy_history: [newBuyRecord],
          payment_history: newPaymentRecord ? [newPaymentRecord] : []
        };
        targetCustomerObj = newCust;
        return [newCust, ...prev];
      }
    });

    if (selectedCustomerForView && (selectedCustomerForView.customer_name || '').toLowerCase() === cleanCustName.toLowerCase()) {
      setSelectedCustomerForView(targetCustomerObj);
    }

    // API sync
    try {
      await api.post('/sales/orders/', {
        customer_name: cleanCustName,
        order_date: saleForm.date,
        truck_number: selectedProfileForSale.truckno,
        crates_sold: boxesToSell,
        rate_per_crate: rate,
        gross_amount: totalAmount,
        subtotal: totalAmount,
        grand_total: totalAmount,
        payment_terms: saleForm.payment_mode,
        status: 'DISPATCHED'
      }).catch(() => null);
    } catch {
      // ignore
    }

    if (remainingBoxes > 0) {
      // Keep modal open and refresh form for next customer sale
      const prodName = `${selectedProfileForSale.fruit || ''}${selectedProfileForSale.variety && selectedProfileForSale.variety.trim() ? ' — ' + selectedProfileForSale.variety.trim() : ''}`;
      setSaleForm({
        date: saleForm.date || getSystemDate(),
        customer_name: '',
        phone: '',
        city: '',
        product_name: prodName,
        boxes: '',
        rate_per_box: '',
        payment_mode: 'CREDIT',
        amount_paid: ''
      });
      setSaleTotalInput('');
      setRateAppliedNotice(false);
      setSaleCustomerSuggestions([]);
      setShowSaleCustomerSuggestions(false);
      setIsSaleModalOpen(true);

      if (showToast) {
        showToast(`Sale recorded! ${boxesToSell} Boxes sold to ${cleanCustName} for ₹${totalAmount.toLocaleString()} 📦 • New Sale Entry refreshed (${remainingBoxes} boxes remaining)`, 'success');
      }

      // Automatically focus back to Customer Name input for next sale
      setTimeout(() => {
        if (saleCustomerInputRef.current) {
          saleCustomerInputRef.current.focus();
        }
      }, 100);
    } else {
      // All boxes of this truck lot are sold out (0 balance)
      setIsSaleModalOpen(false);
      if (showToast) {
        showToast(`Sale recorded! All ${boxesToSell} remaining boxes sold to ${cleanCustName}. Truck lot ${selectedProfileForSale.truckno} is now 100% sold out (0 Balance)! 🚚🎉`, 'success');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Record Payment inside Customer Profile
  // ---------------------------------------------------------------------------
  const handleRecordCustomerPayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCustomerForView) return;

    const amt = Number(paymentForm.amount) || 0;
    const lessAmt = Number(paymentForm.less) || 0;
    const totalReduction = amt + lessAmt;

    if (totalReduction <= 0) {
      if (showToast) showToast('Please enter a valid payment amount or less amount', 'error');
      return;
    }

    try {
      if (amt > 0) {
        await api.post('/payments/', {
          party_type: 'CUSTOMER',
          customer: selectedCustomerForView.id,
          payment_type: 'INWARD',
          payment_date: paymentForm.date,
          amount: amt,
          payment_method: paymentForm.payment_method,
          payment_mode: paymentForm.payment_method,
          transaction_reference: paymentForm.reference || `REC-${Date.now().toString().slice(-4)}`,
          reference_number: paymentForm.reference || `REC-${Date.now().toString().slice(-4)}`,
          notes: paymentForm.notes || (lessAmt > 0 ? `Payment received (Less: ₹${lessAmt.toLocaleString()})` : 'Customer payment received'),
          description: paymentForm.notes || (lessAmt > 0 ? `Payment received (Less: ₹${lessAmt.toLocaleString()})` : 'Customer payment received')
        }).catch(() => null);
      }
    } catch {
      // offline fallback
    }

    const newPayment = {
      id: Date.now(),
      date: paymentForm.date,
      amount: amt,
      less_amount: lessAmt,
      payment_method: paymentForm.payment_method,
      reference: paymentForm.reference || `REC-${Date.now().toString().slice(-4)}`,
      notes: paymentForm.notes || (lessAmt > 0 ? (amt > 0 ? `Payment received (Less: ₹${lessAmt.toLocaleString()})` : `Less / Kasar (₹${lessAmt.toLocaleString()})`) : 'Payment received')
    };

    setCustomerProfiles(prev => {
      const updatedList = prev.map(c => {
        if (c.id === selectedCustomerForView.id) {
          const updated = {
            ...c,
            total_paid: Number(c.total_paid || 0) + amt,
            total_discount: Number(c.total_discount || 0) + lessAmt,
            current_balance: Math.max(0, Number(c.current_balance || 0) - totalReduction),
            payment_history: [newPayment, ...(c.payment_history || [])]
          };
          setSelectedCustomerForView(updated);
          return updated;
        }
        return c;
      });
      try {
        localStorage.setItem('mandi_customer_profiles', JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    if (setCustomers) {
      setCustomers(prev => prev.map(c => {
        if (c.id === selectedCustomerForView.id || (c.customer_name || c.name || '').trim().toLowerCase() === (selectedCustomerForView.customer_name || '').trim().toLowerCase()) {
          return {
            ...c,
            current_balance: Math.max(0, Number(c.current_balance || 0) - totalReduction)
          };
        }
        return c;
      }));
    }

    setPaymentForm({
      date: getSystemDate(),
      amount: '',
      less: '',
      payment_method: 'CASH',
      reference: '',
      notes: ''
    });
    setIsPaymentDrawerOpen(false);
    if (onRefresh) onRefresh();
    if (showToast) {
      showToast(`Payment of ₹${amt.toLocaleString()}${lessAmt > 0 ? ` (Less: ₹${lessAmt.toLocaleString()})` : ''} saved! 💵💾`, 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Item Selection, Bill Generation, PDF Download & Payment
  // ---------------------------------------------------------------------------
  const toggleItemSelection = (itemKey) => {
    setSelectedBillItemIds(prev =>
      prev.includes(itemKey) ? prev.filter(k => k !== itemKey) : [...prev, itemKey]
    );
  };

  const handleOpenSelectedBill = () => {
    if (!selectedBuyDateDetails || selectedBillItemIds.length === 0) return;
    const items = selectedBuyDateDetails.items.filter((it, idx) =>
      selectedBillItemIds.includes(it.id || idx)
    );
    if (items.length === 0) return;
    setSelectedItemsForBill(items);
    setSelectedItemForBill(items[0]); // backward compatibility

    // Calculate credit sum
    const creditTotal = items
      .filter(it => it.payment_mode === 'CREDIT')
      .reduce((sum, it) => sum + Number(it.total || 0), 0);

    const totalAmt = items.reduce((sum, it) => sum + Number(it.total || 0), 0);

    setBillPayForm({
      amount: creditTotal > 0 ? creditTotal : totalAmt,
      date: getSystemDate(),
      payment_method: 'CASH',
      reference: `BP-${String(items[0]?.id || Date.now()).slice(-6)}`,
      notes: `Bill payment for ${items.length} produce items (${items.map(i => i.product_name).join(', ')})`
    });
  };

  const handleOpenItemBill = (item) => {
    setSelectedItemsForBill([item]);
    setSelectedItemForBill(item);
    setBillPayForm({
      amount: item.total || '',
      date: getSystemDate(),
      payment_method: 'CASH',
      reference: `BP-${String(item.id || Date.now()).slice(-6)}`,
      notes: `Bill payment for ${item.product_name} (${item.truck_no || 'Standard'})`
    });
  };

  const handleDownloadBillPDF = (itemsToBill) => {
    const items = itemsToBill || selectedItemsForBill || (selectedItemForBill ? [selectedItemForBill] : []);
    if (!items || items.length === 0 || !selectedCustomerForView) {
      if (showToast) showToast('No items selected for bill download', 'error');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const customerName = selectedCustomerForView.customer_name || 'Customer';
      const billDate = formatDisplayDate(selectedBuyDateDetails?.date || getSystemDate());
      const billNo = `BP-${String(items[0]?.id || Date.now()).slice(-6)}`;

      // Brand Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('AZIZ INTERNATIONAL', 105, 18, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Azadpur Mandi, Delhi • Fruits & Dry Fruits Commission Agent', 105, 24, { align: 'center' });

      // Badge Title
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(65, 28, 80, 7, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('BIKRI PARCHI / SALE INVOICE', 105, 33, { align: 'center' });

      // Divider line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 38, 196, 38);

      // Meta Details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Customer: ${customerName}`, 14, 46);
      if (selectedCustomerForView.phone) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Phone: ${selectedCustomerForView.phone}`, 14, 52);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Bill No: ${billNo}`, 196, 46, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date: ${billDate}`, 196, 52, { align: 'right' });

      // Table Header: 4 Columns (Buy Date, Fruit Name, Total Box * Rate, Total)
      let yPos = 60;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, yPos, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Buy Date', 17, yPos + 5.5);
      doc.text('Fruit Name', 52, yPos + 5.5);
      doc.text('Total Box × Rate', 125, yPos + 5.5, { align: 'center' });
      doc.text('Total (Rs)', 193, yPos + 5.5, { align: 'right' });

      yPos += 8;
      doc.setFont('helvetica', 'normal');

      let totalBoxes = 0;
      let totalAmt = 0;
      let totalCash = 0;
      let totalCredit = 0;

      items.forEach((item) => {
        const boxes = Number(item.boxes || 0);
        const rate = Number(item.rate_per_box || 0);
        const total = Number(item.total || 0);
        const mode = item.payment_mode || 'CREDIT';
        const itemDate = formatDisplayDate(item.date || item.selling_date || selectedBuyDateDetails?.date || getSystemDate());

        totalBoxes += boxes;
        totalAmt += total;
        if (mode === 'CASH') totalCash += total;
        else totalCredit += total;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(14, yPos, 196, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(itemDate, 17, yPos + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const fruitText = item.truck_no ? `${item.product_name || 'Item'} (${item.truck_no})` : String(item.product_name || 'Item');
        doc.text(fruitText, 52, yPos + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.text(`${boxes} BX × Rs ${rate.toLocaleString('en-IN')}`, 125, yPos + 5.5, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.text(`${total.toLocaleString('en-IN')}`, 193, yPos + 5.5, { align: 'right' });

        yPos += 8;
      });

      // Bottom Table Border
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(14, yPos, 196, yPos);

      // Summary Box
      yPos += 6;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, yPos, 182, 22, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, yPos, 182, 22, 2, 2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Boxes: ${totalBoxes} BX`, 20, yPos + 7);
      doc.text(`Cash Paid: Rs ${totalCash.toLocaleString('en-IN')}`, 20, yPos + 14);
      doc.text(`Credit (Udhaar): Rs ${totalCredit.toLocaleString('en-IN')}`, 90, yPos + 14);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`NET TOTAL: Rs ${totalAmt.toLocaleString('en-IN')}`, 190, yPos + 10, { align: 'right' });

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Computer Generated Mandi Bikri Bill • Aziz International • Shubh Labh 🙏', 105, yPos + 32, { align: 'center' });

      doc.save(`Bill_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${billDate}.pdf`);
      if (showToast) showToast('Bill PDF downloaded successfully! 📄📥', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      if (showToast) showToast('Could not generate PDF. Opening Print view...', 'error');
      handlePrintSelectedBill(items);
    }
  };

  const handlePrintSelectedBill = (itemsToBill) => {
    const items = itemsToBill || selectedItemsForBill || (selectedItemForBill ? [selectedItemForBill] : []);
    if (!items || items.length === 0 || !selectedCustomerForView) return;
    const printWin = window.open('', '_blank', 'width=780,height=850');
    if (!printWin) return;
    const billDate = formatDisplayDate(selectedBuyDateDetails?.date || getSystemDate());
    const billNo = `BP-${String(items[0]?.id || Date.now()).slice(-6)}`;

    let totalBoxes = 0;
    let totalAmt = 0;
    let totalCash = 0;
    let totalCredit = 0;

    const rowsHtml = items.map((item) => {
      const boxes = Number(item.boxes || 0);
      const rate = Number(item.rate_per_box || 0);
      const total = Number(item.total || 0);
      const mode = item.payment_mode || 'CREDIT';
      const itemDate = formatDisplayDate(item.date || item.selling_date || selectedBuyDateDetails?.date || getSystemDate());
      totalBoxes += boxes;
      totalAmt += total;
      if (mode === 'CASH') totalCash += total;
      else totalCredit += total;

      return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px dashed #cbd5e1; font-family: monospace; color: #64748b;">${itemDate}</td>
          <td style="padding: 8px 10px; border-bottom: 1px dashed #cbd5e1; font-weight: bold; color: #0f172a;">
            ${item.product_name || 'Item'}
            ${item.truck_no ? `<span style="font-size:11px;color:#2563eb;margin-left:6px;font-family:monospace;">🚚 ${item.truck_no}</span>` : ''}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px dashed #cbd5e1; text-align: center;">
            <strong>${boxes} BX</strong> × ₹${rate.toLocaleString('en-IN')}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: bold;">
            ₹${total.toLocaleString('en-IN')}
            <div style="font-size: 10px; color: ${mode === 'CASH' ? '#16a34a' : '#d97706'}; font-weight: 700;">${mode}</div>
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill Parchi - ${selectedCustomerForView.customer_name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; background: #fff; }
          .parchi-card { border: 2px dashed #94a3b8; padding: 24px; border-radius: 12px; max-width: 650px; margin: 0 auto; }
          .hdr { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .hdr h1 { margin: 0; font-size: 22px; color: #0f172a; letter-spacing: 0.05em; font-weight: 900; }
          .hdr p { margin: 3px 0; font-size: 12px; color: #64748b; }
          .badge { display: inline-block; background: #0f172a; color: #fff; padding: 3px 12px; border-radius: 4px; font-size: 11px; font-weight: 800; margin-top: 6px; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 14px 0; }
          th { background: #f1f5f9; padding: 8px 10px; border-bottom: 2px solid #0f172a; }
          .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 14px; }
          .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; color: #0f172a; }
          .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="parchi-card">
          <div class="hdr">
            <h1>AZIZ INTERNATIONAL</h1>
            <p>Azadpur Mandi, Delhi • Commission Agent & Fruits</p>
            <span class="badge">BIKRI PARCHI / SALE INVOICE</span>
          </div>
          <div class="meta">
            <div>
              <div><strong>Customer:</strong> ${selectedCustomerForView.customer_name}</div>
              <div><strong>Phone:</strong> ${selectedCustomerForView.phone || '—'}</div>
            </div>
            <div style="text-align: right;">
              <div><strong>Bill No:</strong> ${billNo}</div>
              <div><strong>Date:</strong> ${billDate}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left; width: 22%;">Buy Date</th>
                <th style="text-align: left; width: 32%;">Fruit Name</th>
                <th style="text-align: center; width: 26%;">Total Box × Rate</th>
                <th style="text-align: right; width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary-box">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #475569;">
              <span>Total Boxes: <strong>${totalBoxes} BX</strong></span>
              <span>Cash Paid: <strong>₹${totalCash.toLocaleString('en-IN')}</strong></span>
              <span>Credit (Udhaar): <strong>₹${totalCredit.toLocaleString('en-IN')}</strong></span>
            </div>
            <div class="total-row" style="border-top: 1px solid #cbd5e1; padding-top: 6px;">
              <span>NET TOTAL AMOUNT:</span>
              <span>₹${totalAmt.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div class="footer">
            Computer Generated Bikri Bill • Shubh Labh 🙏
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  const handlePrintItemBill = (item) => {
    handlePrintSelectedBill(item ? [item] : selectedItemsForBill);
  };

  const handlePaySelectedBillItems = async (e) => {
    if (e) e.preventDefault();
    const items = selectedItemsForBill || (selectedItemForBill ? [selectedItemForBill] : []);
    if (!items || items.length === 0 || !selectedCustomerForView) return;

    const amt = Number(billPayForm.amount);
    if (!amt || amt <= 0) {
      if (showToast) showToast('Please enter a valid payment amount', 'error');
      return;
    }

    const payDate = billPayForm.date || getSystemDate();
    const payMethod = billPayForm.payment_method || 'CASH';
    const payRef = billPayForm.reference || `BP-${String(items[0]?.id || Date.now()).slice(-6)}`;
    const payNotes = billPayForm.notes || `Paid for ${items.length} items (${items.map(i => i.product_name).join(', ')})`;

    try {
      await api.post('/payments/', {
        party_type: 'CUSTOMER',
        customer: selectedCustomerForView.id,
        payment_type: 'INWARD',
        payment_date: payDate,
        amount: amt,
        payment_method: payMethod,
        payment_mode: payMethod,
        transaction_reference: payRef,
        reference_number: payRef,
        notes: payNotes,
        description: payNotes
      }).catch(() => null);
    } catch {}

    const newPayment = {
      id: Date.now(),
      date: payDate,
      amount: amt,
      payment_method: payMethod,
      reference: payRef,
      notes: payNotes
    };

    const targetCreditIds = new Set(
      items.filter(it => it.payment_mode === 'CREDIT').map(it => it.id)
    );

    const updatedBuyHistory = (selectedCustomerForView.buy_history || []).map(b => {
      const isMatch = (targetCreditIds.has(b.id)) || items.some(it =>
        it.payment_mode === 'CREDIT' &&
        b.product_name === it.product_name &&
        b.truck_no === it.truck_no &&
        Number(b.total) === Number(it.total)
      );
      if (isMatch) {
        return { ...b, payment_mode: 'CASH' };
      }
      return b;
    });

    const updatedPayments = [newPayment, ...(selectedCustomerForView.payment_history || [])];
    const updatedCustomer = {
      ...selectedCustomerForView,
      total_paid: Number(selectedCustomerForView.total_paid || 0) + amt,
      current_balance: Math.max(0, Number(selectedCustomerForView.current_balance || 0) - amt),
      buy_history: updatedBuyHistory,
      payment_history: updatedPayments
    };

    setCustomerProfiles(prev => {
      const copy = prev.map(c => c.id === selectedCustomerForView.id ? updatedCustomer : c);
      try {
        localStorage.setItem('mandi_customer_profiles', JSON.stringify(copy));
      } catch {}
      return copy;
    });
    setSelectedCustomerForView(updatedCustomer);

    if (selectedBuyDateDetails) {
      setSelectedBuyDateDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(it => {
            const isMatch = (targetCreditIds.has(it.id)) || items.some(s =>
              s.payment_mode === 'CREDIT' &&
              it.product_name === s.product_name &&
              it.truck_no === s.truck_no &&
              Number(it.total) === Number(s.total)
            );
            if (isMatch) {
              return { ...it, payment_mode: 'CASH' };
            }
            return it;
          })
        };
      });
    }

    // Update selected items in bill modal so UI reflects CASH
    setSelectedItemsForBill(prev => prev ? prev.map(it => ({ ...it, payment_mode: 'CASH' })) : null);
    setSelectedItemForBill(prev => prev ? ({ ...prev, payment_mode: 'CASH' }) : null);

    setTruckSalesList(prev => prev.map(s => {
      const isMatch = (targetCreditIds.has(s.id)) || items.some(it =>
        it.payment_mode === 'CREDIT' &&
        s.customer_name === selectedCustomerForView.customer_name &&
        s.product_name === it.product_name &&
        s.truck_no === it.truck_no &&
        Number(s.total) === Number(it.total)
      );
      if (isMatch) {
        return { ...s, payment_mode: 'CASH' };
      }
      return s;
    }));

    if (showToast) {
      showToast(`Payment of ₹${amt.toLocaleString()} recorded! Mode converted to CASH and added to Payment History ✅💵`, 'success');
    }
    if (onRefresh) onRefresh();
  };

  const handlePayBillItem = handlePaySelectedBillItems;

  // ---------------------------------------------------------------------------
  // Handlers: Add New Customer Manually (Synced to MySQL)
  // ---------------------------------------------------------------------------
  const handleAddNewCustomer = async (e) => {
    if (e) e.preventDefault();
    const name = newCustomerForm.customer_name.trim();
    if (!name) {
      if (showToast) showToast('Customer name is required', 'error');
      return;
    }

    const openBal = Number(newCustomerForm.opening_balance || 0);
    let createdCustId = Date.now();

    try {
      const custPayload = {
        customer_code: `CUST-${Date.now().toString().slice(-4)}`,
        customer_name: name,
        phone: (newCustomerForm.phone || '').trim(),
        address: (newCustomerForm.address || '').trim(),
        status: 'ACTIVE',
        current_balance: openBal
      };
      const res = await api.post('/customers/', custPayload).catch(() => null);
      if (res?.id) {
        createdCustId = res.id;
      }
      if (setCustomers && res) {
        setCustomers(prev => [res, ...prev]);
      }
    } catch {
      // offline fallback
    }

    const newCust = {
      id: createdCustId,
      customer_name: name,
      phone: (newCustomerForm.phone || '').trim(),
      address: (newCustomerForm.address || '').trim(),
      current_balance: openBal,
      total_boxes: 0,
      total_bought: openBal,
      total_paid: 0,
      buy_history: openBal > 0 ? [{
        id: Date.now(),
        date: getSystemDate(),
        product_name: 'Opening Balance (Purana Khata)',
        truck_no: 'LEGACY',
        supplier_name: 'Previous Ledger',
        boxes: 0,
        rate_per_box: 0,
        total: openBal,
        payment_mode: 'CREDIT',
        amount_paid: 0
      }] : [],
      payment_history: []
    };

    setCustomerProfiles(prev => [newCust, ...prev]);
    setSelectedCustomerForView(newCust);
    setIsAddCustomerOpen(false);
    setNewCustomerForm({ customer_name: '', phone: '', address: '', opening_balance: '' });
    if (onRefresh) onRefresh();
    if (showToast) {
      showToast(`Customer profile "${name}" saved to MySQL Database! 👤💾`, 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Edit Existing Customer Profile (Synced to MySQL & State)
  // ---------------------------------------------------------------------------
  const handleOpenEditCustomer = (cust) => {
    if (!cust) return;
    setEditCustomerForm({
      id: cust.id,
      customer_name: cust.customer_name || '',
      phone: cust.phone || '',
      address: cust.address || ''
    });
    setIsEditCustomerOpen(true);
  };

  const handleSaveEditCustomer = async (e) => {
    if (e) e.preventDefault();
    const cleanName = (editCustomerForm.customer_name || '').trim();
    if (!cleanName) {
      if (showToast) showToast('Customer name is required', 'error');
      return;
    }

    setIsSavingCustomer(true);
    const custId = editCustomerForm.id;
    const oldName = selectedCustomerForView?.customer_name;

    try {
      if (custId && typeof custId === 'number' && custId < 1000000000000) {
        await api.patch(`/customers/${custId}/`, {
          customer_name: cleanName,
          phone: (editCustomerForm.phone || '').trim(),
          address: (editCustomerForm.address || '').trim()
        }).catch(() => null);
      }

      const updatedCust = {
        customer_name: cleanName,
        phone: (editCustomerForm.phone || '').trim(),
        address: (editCustomerForm.address || '').trim()
      };

      setCustomerProfiles(prev => prev.map(c => {
        if (c.id === custId || (oldName && (c.customer_name || '').toLowerCase() === oldName.toLowerCase())) {
          return { ...c, ...updatedCust };
        }
        return c;
      }));

      setSelectedCustomerForView(prev => prev ? ({ ...prev, ...updatedCust }) : null);

      if (setCustomers) {
        setCustomers(prev => prev.map(c => {
          if (c.id === custId || (oldName && (c.customer_name || '').toLowerCase() === oldName.toLowerCase())) {
            return { ...c, ...updatedCust };
          }
          return c;
        }));
      }

      if (oldName && oldName.toLowerCase() !== cleanName.toLowerCase()) {
        setTruckSalesList(prev => prev.map(s => {
          if ((s.customer_name || '').toLowerCase() === oldName.toLowerCase()) {
            return { ...s, customer_name: cleanName, customer_phone: (editCustomerForm.phone || s.customer_phone) };
          }
          return s;
        }));
      }

      setIsEditCustomerOpen(false);
      if (showToast) showToast(`Customer profile "${cleanName}" updated successfully! 👤💾`, 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast('Failed to update customer: ' + err.message, 'error');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Supplier Profiles & Trucks Directory Computations & Handlers
  // ---------------------------------------------------------------------------
  const unifiedSuppliers = useMemo(() => {
    const map = new Map();
    suppliers.forEach(s => {
      const key = (s.supplier_name || s.name || '').trim().toLowerCase();
      if (key) {
        map.set(key, {
          id: s.id,
          supplier_name: s.supplier_name || s.name,
          phone: s.phone || '',
          bank_name: s.bank_name || '',
          account_number: s.account_number || '',
          ifsc_code: s.ifsc_code || '',
          branch_name: s.branch_name || '',
          truckno: '',
          ...s
        });
      }
    });

    supplierProfiles.forEach(sp => {
      const key = (sp.supplier_name || '').trim().toLowerCase();
      if (!key) return;
      if (map.has(key)) {
        const existing = map.get(key);
        map.set(key, {
          ...existing,
          phone: existing.phone || sp.phone,
          bank_name: existing.bank_name || sp.bank_name,
          account_number: existing.account_number || sp.account_number,
          ifsc_code: existing.ifsc_code || sp.ifsc_code,
          branch_name: existing.branch_name || sp.branch_name,
          truckno: sp.truckno || existing.truckno,
          balance_box: sp.balance_box,
          fruit: sp.fruit,
          variety: sp.variety
        });
      } else {
        map.set(key, {
          id: sp.id,
          supplier_name: sp.supplier_name,
          phone: sp.phone || '',
          bank_name: sp.bank_name || '',
          account_number: sp.account_number || '',
          ifsc_code: sp.ifsc_code || '',
          branch_name: sp.branch_name || '',
          truckno: sp.truckno || '',
          balance_box: sp.balance_box,
          fruit: sp.fruit,
          variety: sp.variety
        });
      }
    });

    return Array.from(map.values());
  }, [suppliers, supplierProfiles]);

  const activeTrucksCount = useMemo(() => {
    const activeSet = new Set();
    (supplierProfiles || []).forEach(sp => {
      if (sp.truckno && (sp.balance_box === undefined || Number(sp.balance_box) > 0)) {
        activeSet.add(sp.truckno.trim().toUpperCase());
      }
    });
    (purchasesList || []).forEach(p => {
      if (p.truck_number && (p.balance_box === undefined || Number(p.balance_box) > 0) && p.status !== 'COMPLETED' && p.status !== 'SETTLED') {
        activeSet.add(p.truck_number.trim().toUpperCase());
      }
    });
    unifiedSuppliers.forEach(s => {
      if (s.truckno && (s.balance_box === undefined || Number(s.balance_box) > 0)) {
        activeSet.add(s.truckno.trim().toUpperCase());
      }
    });
    if (activeSet.size > 0) return activeSet.size;
    // Fallback to distinct trucks in system if any exist
    return Array.from(new Set([
      ...unifiedSuppliers.map(s => s.truckno).filter(Boolean),
      ...purchasesList.map(p => p.truck_number).filter(Boolean)
    ])).length;
  }, [supplierProfiles, purchasesList, unifiedSuppliers]);

  const filteredUnifiedSuppliers = useMemo(() => {
    let list = unifiedSuppliers;

    if (supplierDirectoryFilter === 'ACTIVE_TRUCKS') {
      list = list.filter(s => {
        // 1. Balance box > 0
        if (Number(s.balance_box || 0) > 0) return true;
        // 2. Active inward purchases
        const sName = (s.supplier_name || s.name || '').trim().toLowerCase();
        const hasActiveOrder = (purchasesList || []).some(p => {
          const match = p.supplier === s.id || (p.supplier_name && p.supplier_name.toLowerCase() === sName);
          if (!match) return false;
          if (p.balance_box !== undefined && p.balance_box !== null) {
            return Number(p.balance_box) > 0;
          }
          return p.truck_number && p.status !== 'COMPLETED' && p.status !== 'SETTLED';
        });
        if (hasActiveOrder) return true;
        // 3. Active entry in supplierProfiles
        const hasActiveSp = (supplierProfiles || []).some(sp => {
          const match = (sp.supplier_name || '').trim().toLowerCase() === sName;
          return match && (sp.balance_box === undefined || Number(sp.balance_box) > 0);
        });
        if (hasActiveSp) return true;
        // 4. Has truckno with balance undefined (not set to 0)
        if (s.truckno && s.balance_box === undefined) return true;
        return false;
      });
    }

    const q = supplierTrucksSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(s => {
      const name = (s.supplier_name || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const bank = (s.bank_name || '').toLowerCase();
      const acc = (s.account_number || '').toLowerCase();
      const ifsc = (s.ifsc_code || '').toLowerCase();
      const truck = (s.truckno || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || bank.includes(q) || acc.includes(q) || ifsc.includes(q) || truck.includes(q);
    });
  }, [unifiedSuppliers, supplierTrucksSearch, supplierDirectoryFilter, purchasesList, supplierProfiles]);

  const handleCopyPassbook = (supp) => {
    const text = `🏦 Bank Passbook Details
Supplier: ${supp.supplier_name || supp.name}
Phone: ${supp.phone || 'N/A'}
Bank: ${supp.bank_name || 'N/A'}
A/C No: ${supp.account_number || 'N/A'}
IFSC: ${supp.ifsc_code || 'N/A'}
Branch: ${supp.branch_name || 'N/A'}`;
    navigator.clipboard?.writeText(text);
    setCopiedBankSupplierId(supp.id);
    if (showToast) showToast('Bank passbook details copied to clipboard!');
    setTimeout(() => setCopiedBankSupplierId(null), 3000);
  };

  const handleOpenEditPassbook = (supp) => {
    setPassbookForm({
      id: supp.id,
      supplier_name: supp.supplier_name || supp.name || '',
      phone: supp.phone || '',
      bank_name: supp.bank_name || '',
      account_number: supp.account_number || '',
      ifsc_code: supp.ifsc_code || '',
      branch_name: supp.branch_name || ''
    });
    setIsEditPassbookOpen(true);
  };

  const handleSavePassbook = async () => {
    const cleanName = (passbookForm.supplier_name || '').trim();
    if (!cleanName) {
      if (showToast) showToast('Supplier / Vyapari name is required', 'error');
      return;
    }
    setIsSavingPassbook(true);
    const oldName = selectedSupplierForDetail?.supplier_name || selectedSupplierForDetail?.name;
    const suppId = passbookForm.id;

    const payload = {
      supplier_name: cleanName,
      phone: (passbookForm.phone || '').trim(),
      bank_name: passbookForm.bank_name || '',
      account_number: passbookForm.account_number || '',
      ifsc_code: passbookForm.ifsc_code || '',
      branch_name: passbookForm.branch_name || ''
    };

    try {
      if (suppId && typeof suppId === 'number' && suppId < 1000000000000) {
        await api.patch(`/suppliers/${suppId}/`, payload).catch(() => null);
      }
      setSupplierProfiles(prev => prev.map(p => {
        if (p.id === suppId || (oldName && p.supplier_name && p.supplier_name.toLowerCase() === oldName.toLowerCase())) {
          return { ...p, ...payload };
        }
        return p;
      }));
      if (selectedSupplierForDetail) {
        setSelectedSupplierForDetail(prev => ({ ...prev, ...payload }));
      }
      if (setSuppliers) {
        setSuppliers(prev => prev.map(s => (s.id === suppId || (oldName && (s.supplier_name || s.name || '').toLowerCase() === oldName.toLowerCase())) ? { ...s, ...payload } : s));
      }
      if (showToast) showToast(`Supplier profile "${cleanName}" updated successfully! 🚛💾`, 'success');
      setIsEditPassbookOpen(false);
      if (onRefresh) onRefresh();
    } catch {
      setSupplierProfiles(prev => prev.map(p => {
        if (p.id === suppId || (oldName && p.supplier_name && p.supplier_name.toLowerCase() === oldName.toLowerCase())) {
          return { ...p, ...payload };
        }
        return p;
      }));
      if (selectedSupplierForDetail) {
        setSelectedSupplierForDetail(prev => ({ ...prev, ...payload }));
      }
      if (showToast) showToast('Supplier profile saved locally!', 'info');
      setIsEditPassbookOpen(false);
    } finally {
      setIsSavingPassbook(false);
    }
  };

  const handleSaveNewSupplierModal = async (e) => {
    e?.preventDefault();
    if (!newSupplierModalForm.supplier_name.trim()) return;
    setIsSavingSupplierModal(true);
    try {
      const payload = {
        supplier_code: `SUP-${Date.now().toString().slice(-4)}`,
        name: newSupplierModalForm.supplier_name.trim(),
        supplier_name: newSupplierModalForm.supplier_name.trim(),
        phone: newSupplierModalForm.phone.trim(),
        bank_name: newSupplierModalForm.bank_name.trim(),
        account_number: newSupplierModalForm.account_number.trim(),
        ifsc_code: newSupplierModalForm.ifsc_code.trim().toUpperCase(),
        branch_name: newSupplierModalForm.branch_name.trim()
      };
      const res = await api.post('/suppliers/', payload).catch(() => null);
      const created = res?.id ? res : { ...payload, id: Date.now() };
      if (setSuppliers) setSuppliers(prev => [created, ...prev]);
      setSupplierProfiles(prev => [created, ...prev]);
      setSelectedSupplierForDetail(created);
      if (showToast) showToast(`Supplier profile "${created.supplier_name}" created!`);
      setIsAddSupplierModalOpen(false);
      setNewSupplierModalForm({
        supplier_name: '',
        phone: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: ''
      });
      if (onRefresh) onRefresh();
    } catch {
      const fallback = {
        ...newSupplierModalForm,
        id: Date.now(),
        supplier_name: newSupplierModalForm.supplier_name.trim()
      };
      if (setSuppliers) setSuppliers(prev => [fallback, ...prev]);
      setSupplierProfiles(prev => [fallback, ...prev]);
      setSelectedSupplierForDetail(fallback);
      if (showToast) showToast(`Supplier profile "${fallback.supplier_name}" saved!`);
      setIsAddSupplierModalOpen(false);
      setNewSupplierModalForm({
        supplier_name: '',
        phone: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: ''
      });
    } finally {
      setIsSavingSupplierModal(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Profile Deletion & Clear All Handlers (Active Profiles, Customers, Suppliers)
  // ---------------------------------------------------------------------------
  const handleDeleteActiveProfile = async (profile) => {
    if (!profile) return;
    const name = profile.supplier_name || 'Supplier';
    const truck = profile.truckno ? ` (${profile.truckno})` : '';
    if (window.confirm(`Are you sure you want to delete profile for "${name}"${truck}?`)) {
      // 0. Delete from backend database if registered
      try {
        if (profile.id && typeof profile.id === 'number' && profile.id < 1000000000000) {
          await api.delete(`/purchases/orders/${profile.id}/`).catch(() => null);
          await api.delete(`/purchases/truck-payments/${profile.id}/`).catch(() => null);
        }
        const matchedPO = (purchasesList || []).find(p =>
          p.id === profile.id ||
          (profile.truckno && (p.truck_number || '').trim().toUpperCase() === (profile.truckno || '').trim().toUpperCase())
        );
        if (matchedPO?.id && typeof matchedPO.id === 'number' && matchedPO.id < 1000000000000) {
          await api.delete(`/purchases/orders/${matchedPO.id}/`).catch(() => null);
          await api.delete(`/purchases/truck-payments/${matchedPO.id}/`).catch(() => null);
        }
      } catch {
        // ignore network error
      }

      setSupplierProfiles(prev => {
        const updated = prev.filter(p => p.id !== profile.id);
        try { localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(updated)); } catch {}
        return updated;
      });
      // Synchronously clean sales from truckSalesList
      const pTruck = (profile.truckno || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const sNorm = (name || '').trim().toLowerCase();
      setTruckSalesList(prev => {
        const updated = prev.filter(s => {
          if (s.lot_id && String(s.lot_id) === String(profile.id)) return false;
          if (pTruck && (s.truck_no || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === pTruck) return false;
          return true;
        });
        try { localStorage.setItem('mandi_truck_sales', JSON.stringify(updated)); } catch {}
        return updated;
      });
      // If no other profile exists for this supplier, clean payments & settlements
      const remainingForSupp = supplierProfiles.filter(p => p.id !== profile.id && (p.supplier_name || '').trim().toLowerCase() === sNorm);
      if (remainingForSupp.length === 0) {
        setCashSalePayments(prev => {
          const updated = (prev || []).filter(p => (p.supplier_name || '').trim().toLowerCase() !== sNorm);
          try { localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updated)); } catch {}
          return updated;
        });
        setCashSaleSettlements(prev => {
          const updated = (prev || []).filter(s => (s.supplier_name || '').trim().toLowerCase() !== sNorm);
          try { localStorage.setItem('mandi_cash_sale_settlements', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
      if (showToast) showToast(`Profile for ${name}${truck} deleted!`, 'info');
    }
  };

  const handleClearAllActiveProfiles = async () => {
    if (supplierProfiles.length === 0) {
      if (showToast) showToast('No active profiles to clear!', 'info');
      return;
    }
    if (window.confirm(`Are you sure you want to clear ALL ${supplierProfiles.length} profiles from Active Supplier Profiles & Balance Boxes?`)) {
      // 0. Clear from backend database
      try {
        await api.post('/purchases/orders/clear-all/').catch(() => null);
      } catch {}

      setSupplierProfiles([]);
      try {
        localStorage.removeItem('dashboard_supplier_profiles');
      } catch { }
      // Clean truck sales as well
      setTruckSalesList([]);
      try {
        localStorage.removeItem('mandi_truck_sales');
        localStorage.setItem('mandi_truck_sales', '[]');
      } catch {}
      // Clean payments & settlements
      setCashSalePayments([]);
      if (saveCashSalePayments) saveCashSalePayments([]);
      try { localStorage.removeItem('mandi_cash_sale_payments'); } catch {}
      setCashSaleSettlements([]);
      if (saveCashSaleSettlements) saveCashSaleSettlements([]);
      try {
        localStorage.removeItem('mandi_cash_sale_settlements');
        localStorage.removeItem('mandi_truck_settlements');
      } catch {}
      if (showToast) showToast('All active supplier profiles & balance boxes cleared!', 'success');
    }
  };

  const handleDeleteSingleCustomer = async (c) => {
    if (!c) return;
    const name = c.customer_name || 'Customer';
    if (window.confirm(`Are you sure you want to delete customer profile for "${name}"?`)) {
      // 0. Delete from backend database
      try {
        let custId = (c.id && typeof c.id === 'number' && c.id < 1000000000000) ? c.id : null;
        if (!custId && name) {
          const match = (customers || []).find(item => (item.customer_name || item.name || '').trim().toLowerCase() === name.trim().toLowerCase());
          if (match?.id) custId = match.id;
        }
        if (custId) {
          await api.delete(`/customers/${custId}/`).catch(() => null);
        }
      } catch {
        // ignore network error
      }
      setCustomerProfiles(prev => prev.filter(p => p.id !== c.id));
      if (setCustomers) {
        setCustomers(prev => prev.filter(p => p.id !== c.id));
      }
      if (selectedCustomerForView?.id === c.id) {
        setSelectedCustomerForView(null);
        setIsCustomerDetailPopupOpen(false);
      }
      if (showToast) showToast(`Customer profile "${name}" deleted!`, 'info');
    }
  };

  const handleClearAllCustomers = async () => {
    if (customerProfiles.length === 0) {
      if (showToast) showToast('No customer profiles to clear!', 'info');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ALL ${customerProfiles.length} customer profiles and khata ledgers?`)) {
      // 0. Delete all customers from backend database
      try {
        await api.post('/customers/clear-all/').catch(() => null);
        await Promise.all(
          customerProfiles
            .filter(c => c.id && typeof c.id === 'number' && c.id < 1000000000000)
            .map(c => api.delete(`/customers/${c.id}/`).catch(() => null))
        );
      } catch {
        // ignore
      }
      setCustomerProfiles([]);
      if (setCustomers) setCustomers([]);
      try {
        localStorage.removeItem('mandi_customer_profiles');
      } catch { }
      setSelectedCustomerForView(null);
      setIsCustomerDetailPopupOpen(false);
      if (showToast) showToast('All customer profiles & khata ledgers cleared!', 'success');
    }
  };

  const handleDeleteSingleSupplier = async (s) => {
    if (!s) return;
    const name = s.supplier_name || s.name || 'Supplier';
    if (window.confirm(`Are you sure you want to delete supplier profile for "${name}"?`)) {
      // 0. Delete from backend database
      try {
        let suppId = (s.id && typeof s.id === 'number' && s.id < 1000000000000) ? s.id : null;
        if (!suppId && name) {
          const match = (suppliers || []).find(item => (item.supplier_name || item.name || '').trim().toLowerCase() === name.trim().toLowerCase());
          if (match?.id) suppId = match.id;
        }
        if (suppId) {
          await api.delete(`/suppliers/${suppId}/`).catch(() => null);
        }
      } catch {
        // ignore
      }
      const sNorm = (name || '').trim().toLowerCase();
      if (setSuppliers) {
        setSuppliers(prev => prev.filter(item => item.id !== s.id && (item.supplier_name || item.name || '').trim().toLowerCase() !== sNorm));
      }
      setSupplierProfiles(prev => {
        const updated = prev.filter(sp => (sp.supplier_name || '').trim().toLowerCase() !== sNorm);
        try { localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(updated)); } catch {}
        return updated;
      });
      // Synchronously clean sales from truckSalesList for this supplier
      setTruckSalesList(prev => {
        const updated = prev.filter(item => (item.supplier_name || '').trim().toLowerCase() !== sNorm);
        try { localStorage.setItem('mandi_truck_sales', JSON.stringify(updated)); } catch {}
        return updated;
      });
      // Synchronously clean payments and settlements
      setCashSalePayments(prev => {
        const updated = (prev || []).filter(p => (p.supplier_name || '').trim().toLowerCase() !== sNorm);
        if (saveCashSalePayments) saveCashSalePayments(updated);
        try { localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updated)); } catch {}
        return updated;
      });
      setCashSaleSettlements(prev => {
        const updated = (prev || []).filter(set => (set.supplier_name || '').trim().toLowerCase() !== sNorm);
        if (saveCashSaleSettlements) saveCashSaleSettlements(updated);
        try { localStorage.setItem('mandi_cash_sale_settlements', JSON.stringify(updated)); } catch {}
        return updated;
      });
      if (selectedSupplierForDetail?.id === s.id || (selectedSupplierForDetail?.supplier_name || '').trim().toLowerCase() === sNorm) {
        setSelectedSupplierForDetail(null);
        setIsSupplierDetailPopupOpen(false);
      }
      if (showToast) showToast(`Supplier profile "${name}" deleted!`, 'info');
    }
  };

  const handleClearAllSuppliers = async () => {
    if (unifiedSuppliers.length === 0) {
      if (showToast) showToast('No supplier profiles to clear!', 'info');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ALL ${unifiedSuppliers.length} supplier profiles and truck directories?`)) {
      // 0. Clear all suppliers from backend database
      try {
        await api.post('/suppliers/clear-all/').catch(() => null);
        await Promise.all(
          unifiedSuppliers
            .filter(s => s.id && typeof s.id === 'number' && s.id < 1000000000000)
            .map(s => api.delete(`/suppliers/${s.id}/`).catch(() => null))
        );
      } catch {
        // ignore
      }
      if (setSuppliers) setSuppliers([]);
      setSupplierProfiles([]);
      setTruckSalesList([]);
      setCashSalePayments([]);
      if (saveCashSalePayments) saveCashSalePayments([]);
      setCashSaleSettlements([]);
      if (saveCashSaleSettlements) saveCashSaleSettlements([]);
      try {
        localStorage.removeItem('dashboard_supplier_profiles');
        localStorage.removeItem('mandi_truck_sales');
        localStorage.setItem('mandi_truck_sales', '[]');
        localStorage.removeItem('mandi_cash_sale_payments');
        localStorage.removeItem('mandi_cash_sale_settlements');
        localStorage.removeItem('mandi_truck_settlements');
      } catch { }
      setSelectedSupplierForDetail(null);
      setIsSupplierDetailPopupOpen(false);
      if (showToast) showToast('All supplier profiles & truck directories cleared!', 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // Calculations & Filters
  // ---------------------------------------------------------------------------
  const activeProfilesCount = useMemo(() => {
    return supplierProfiles.filter(p => Number(p.balance_box || 0) > 0).length;
  }, [supplierProfiles]);

  const completedProfilesCount = useMemo(() => {
    return supplierProfiles.filter(p => Number(p.balance_box || 0) <= 0).length;
  }, [supplierProfiles]);

  const filteredProfiles = useMemo(() => {
    return supplierProfiles.filter(p => {
      const bal = Number(p.balance_box || 0);

      // Status filter: ACTIVE (default) automatically hides 0 balance trucks from dashboard
      if (profileStatusFilter === 'ACTIVE' && bal <= 0) {
        return false;
      }
      if (profileStatusFilter === 'COMPLETED' && bal > 0) {
        return false;
      }

      const q = (profileSearch || searchQuery || '').trim().toLowerCase();
      if (!q) return true;
      return (
        (p.supplier_name || '').toLowerCase().includes(q) ||
        (p.fruit || '').toLowerCase().includes(q) ||
        (p.variety || '').toLowerCase().includes(q) ||
        (p.truckno || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q)
      );
    });
  }, [supplierProfiles, profileStatusFilter, profileSearch, searchQuery]);

  const totalBalanceBoxes = useMemo(() => {
    return supplierProfiles.reduce((sum, p) => sum + Number(p.balance_box || 0), 0);
  }, [supplierProfiles]);

  const filteredCustomerDirectory = customerProfiles.filter(c => {
    const q = customerSearchQuery.toLowerCase();
    if (!q) return true;
    return (
      (c.customer_name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  });

  const totalCustomerDues = customerProfiles.reduce((sum, c) => sum + Number(c.current_balance || 0), 0);
  const totalCustomerBoxes = customerProfiles.reduce((sum, c) => sum + Number(c.total_boxes || 0), 0);
  const totalCustomerReceived = customerProfiles.reduce((sum, c) => {
    const cPaid = Number(c.total_paid ?? ((c.payment_history && c.payment_history.length > 0)
      ? c.payment_history.reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0)
      : Math.max(0, Number(c.total_bought || 0) - Number(c.current_balance || 0))));
    return sum + cPaid;
  }, 0);

  // Group selected customer buy_history date-wise
  const dateWiseBuyHistory = useMemo(() => {
    if (!selectedCustomerForView?.buy_history || !Array.isArray(selectedCustomerForView.buy_history) || selectedCustomerForView.buy_history.length === 0) {
      return [];
    }
    const map = new Map();
    selectedCustomerForView.buy_history.forEach(item => {
      const d = item.date || item.selling_date || 'Unknown Date';
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          totalBoxes: 0,
          totalAmount: 0,
          items: []
        });
      }
      const entry = map.get(d);
      const boxes = Number(item.boxes || 0);
      const tot = Number(item.total || 0);
      entry.totalBoxes += boxes;
      entry.totalAmount += tot;
      entry.items.push(item);
    });

    return Array.from(map.values()).sort((a, b) => {
      try {
        return new Date(b.date) - new Date(a.date);
      } catch {
        return b.date.localeCompare(a.date);
      }
    });
  }, [selectedCustomerForView]);

  // Helper to fetch all customer fruit sales for this supplier & specific truck (Across all dates)
  const getTruckSalesForSupplier = (activeSupp, truckNum) => {
    if (!activeSupp && !truckNum) return [];
    const suppLower = (activeSupp?.supplier_name || activeSupp?.name || '').trim().toLowerCase();
    const cleanTruck = (t) => (t || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const targetTruck = truckNum && truckNum !== 'ALL' ? cleanTruck(truckNum) : null;
    const list = [];
    const seenIds = new Set();
    const sigCounts = new Map();

    const parseDateToTime = (dStr) => {
      if (!dStr) return 0;
      const s = String(dStr).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        return new Date(s).getTime() || 0;
      }
      const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
      if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        let yyyy = m[3];
        if (yyyy.length === 2) yyyy = '20' + yyyy;
        return new Date(`${yyyy}-${mm}-${dd}`).getTime() || 0;
      }
      const t = new Date(s).getTime();
      return isNaN(t) ? 0 : t;
    };

    // Helper to generate normalized signature for duplicate detection across local & backend sources
    const makeSig = (truck, cust, dateStr, boxes, total) => {
      const t = cleanTruck(truck);
      const c = (cust || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const d = formatDisplayDate(dateStr);
      const b = Math.round(Number(boxes || 0));
      const tot = Math.round(Number(total || 0));
      return `${t}__${c}__${d}__${b}__${tot}`;
    };

    // 1. From truckSalesList (Rapid Board Sales across ALL dates - primary rich source)
    (truckSalesList || []).forEach(ts => {
      const tsTruck = cleanTruck(ts.truck_no);
      const tsSupp = (ts.supplier_name || '').trim().toLowerCase();
      const truckMatch = targetTruck ? tsTruck === targetTruck : true;
      const suppMatch = suppLower ? tsSupp === suppLower : true;

      if ((targetTruck && truckMatch) || (!targetTruck && suppMatch)) {
        const rawId = ts.id ? String(ts.id) : null;
        if (rawId && seenIds.has(rawId)) return;
        if (rawId) seenIds.add(rawId);

        const sig = makeSig(ts.truck_no, ts.customer_name, ts.selling_date || ts.date, ts.boxes, ts.total);
        sigCounts.set(sig, (sigCounts.get(sig) || 0) + 1);

        list.push({
          ...ts,
          selling_date: ts.selling_date || ts.date || getSystemDate(),
          truck_no: ts.truck_no || truckNum
        });
      }
    });

    // 2. From customerProfiles.buy_history (Customer Sales across ALL dates)
    (customerProfiles || []).forEach(cust => {
      (cust.buy_history || []).forEach(buy => {
        const buyTruck = cleanTruck(buy.truck_no);
        const buySupp = (buy.supplier_name || '').trim().toLowerCase();
        const truckMatch = targetTruck ? buyTruck === targetTruck : true;
        const suppMatch = suppLower ? buySupp === suppLower : true;

        if ((targetTruck && truckMatch) || (!targetTruck && suppMatch)) {
          const rawId = buy.id ? String(buy.id) : null;
          if (rawId && seenIds.has(rawId)) return;

          const buyDate = buy.date || buy.selling_date || (buy.created_at ? String(buy.created_at).slice(0, 10) : getSystemDate());
          const sig = makeSig(buy.truck_no, cust.customer_name, buyDate, buy.boxes, buy.total);

          // If identical sale was already recorded from truckSalesList, do not duplicate
          if ((sigCounts.get(sig) || 0) > 0) return;

          if (rawId) seenIds.add(rawId);
          sigCounts.set(sig, 1);

          list.push({
            id: buy.id || Date.now() + Math.random(),
            selling_date: buyDate,
            customer_name: cust.customer_name || 'Customer',
            customer_phone: cust.phone || '',
            truck_no: buy.truck_no || truckNum,
            supplier_name: activeSupp?.supplier_name || activeSupp?.name || buy.supplier_name,
            product_name: buy.product_name || 'Fresh Produce',
            boxes: Number(buy.boxes || 0),
            rate_per_box: Number(buy.rate_per_box || (Number(buy.boxes || 0) > 0 ? Number(buy.total || 0) / Number(buy.boxes || 0) : 0)),
            total: Number(buy.total || 0),
            payment_mode: buy.payment_mode || 'CREDIT'
          });
        }
      });
    });

    // 3. From salesList (Backend Django SalesOrders across ALL dates)
    (salesList || []).forEach(s => {
      const sTruck = cleanTruck(s.truck_number || s.truck_no || '');
      const sSupp = (s.supplier_name || s.supplier || '').trim().toLowerCase();
      const truckMatch = targetTruck ? sTruck === targetTruck : true;
      const suppMatch = suppLower ? sSupp === suppLower : true;

      if ((targetTruck && truckMatch) || (!targetTruck && suppMatch)) {
        const sDate = s.order_date || s.sale_date || s.date || (s.created_at ? String(s.created_at).slice(0, 10) : getSystemDate());

        if (Array.isArray(s.items) && s.items.length > 0) {
          s.items.forEach(it => {
            const itBoxes = Number(it.quantity_boxes || it.boxes || 0);
            const itRate = Number(it.selling_rate || it.rate || 0);
            const itTotal = Number(it.line_total || it.total || (itBoxes * itRate) || 0);
            const sig = makeSig(sTruck, s.customer_name, sDate, itBoxes, itTotal);

            // Deduplication: If this exact sale was already loaded from local truckSalesList / buy_history, consume 1 count and do NOT duplicate
            const count = sigCounts.get(sig) || 0;
            if (count > 0) {
              sigCounts.set(sig, count - 1);
              return;
            }

            const rawItemId = it.id ? `so-item-${s.id}-${it.id}` : `so-item-${s.id}-${Math.random()}`;
            if (seenIds.has(rawItemId)) return;
            seenIds.add(rawItemId);

            const prodName = [it.product_name, it.variety_name].filter(Boolean).join(' ').trim() || it.product_name || 'Fresh Produce';
            list.push({
              id: it.id || `${s.id}-${Math.random()}`,
              selling_date: sDate,
              customer_name: s.customer_name || 'Customer',
              customer_phone: s.customer_phone || '',
              truck_no: s.truck_number || s.truck_no || truckNum,
              supplier_name: activeSupp?.supplier_name || activeSupp?.name,
              product_name: prodName,
              boxes: itBoxes,
              rate_per_box: itRate,
              total: itTotal,
              payment_mode: s.payment_terms || s.payment_type || 'CREDIT'
            });
          });
        } else {
          const sBoxes = Number(s.total_boxes || s.boxes || s.crates_sold || 0);
          const sRate = Number(s.rate || s.rate_per_crate || (sBoxes > 0 ? (s.grand_total || s.total_amount || 0) / sBoxes : 0));
          const sTotal = Number(s.grand_total || s.total_amount || s.total || (sBoxes * sRate) || 0);
          const sig = makeSig(sTruck, s.customer_name, sDate, sBoxes, sTotal);

          // Deduplication: If this exact sale was already loaded from local truckSalesList / buy_history, consume 1 count and do NOT duplicate
          const count = sigCounts.get(sig) || 0;
          if (count > 0) {
            sigCounts.set(sig, count - 1);
            return;
          }

          const sKey = `so-${s.id}`;
          if (seenIds.has(sKey)) return;
          seenIds.add(sKey);

          list.push({
            id: s.id,
            selling_date: sDate,
            customer_name: s.customer_name || 'Customer',
            customer_phone: s.customer_phone || '',
            truck_no: s.truck_number || s.truck_no || truckNum,
            supplier_name: activeSupp?.supplier_name || activeSupp?.name,
            product_name: s.product_name || s.fruit || 'Fresh Produce',
            boxes: sBoxes,
            rate_per_box: sRate,
            total: sTotal,
            payment_mode: s.payment_terms || s.payment_type || 'CREDIT'
          });
        }
      }
    });

    return list.sort((a, b) => parseDateToTime(b.selling_date) - parseDateToTime(a.selling_date));
  };

  const isSalesPerson = Boolean(
    currentUser?.role_code === 'SALES_PERSON' ||
    currentUser?.profile?.role_code === 'SALES_PERSON' ||
    currentUser?.role === 'Sales Person (Spot)' ||
    currentUser?.username?.toLowerCase() === 'sales'
  );

  // If sales person is logged in, redirect any restricted tabs to dashboard
  if (isSalesPerson && activeTab !== 'dashboard') {
    if (setActiveTab) setActiveTab('dashboard');
  }

  // ---------------------------------------------------------------------------
  // Party Khata (Supplier Profiles & Transition History)
  // ---------------------------------------------------------------------------
  if (!isSalesPerson && activeTab === 'cash-sale') {
    return (
      <PartyKhataView
        unifiedSuppliers={unifiedSuppliers}
        suppliers={suppliers}
        setSuppliers={setSuppliers}
        supplierProfiles={supplierProfiles}
        setSupplierProfiles={setSupplierProfiles}
        purchasesList={purchasesList}
        truckSalesList={truckSalesList}
        setTruckSalesList={setTruckSalesList}
        salesList={salesList}
        cashSaleSettlements={cashSaleSettlements}
        setCashSaleSettlements={setCashSaleSettlements}
        saveCashSaleSettlements={saveCashSaleSettlements}
        cashSalePayments={cashSalePayments}
        setCashSalePayments={setCashSalePayments}
        saveCashSalePayments={saveCashSalePayments}
        getSystemDate={getSystemDate}
        showToast={showToast}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Cash Sell History Full Page (Rokda Bikri Byora with From/To Date Calendar)
  // ---------------------------------------------------------------------------
  if (!isSalesPerson && activeTab === 'cash-sell-history') {
    return (
      <CashSellHistoryView
        truckSalesList={truckSalesList}
        customerProfiles={customerProfiles}
        salesList={salesList}
        supplierProfiles={supplierProfiles}
        suppliers={suppliers}
        purchasesList={purchasesList}
        selectedBoardDate={getSystemDate()}
        onBack={() => setActiveTab('dashboard')}
        formatDisplayDate={formatDisplayDate}
        getSystemDate={getSystemDate}
        showToast={showToast}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Udhaar History Full Page (Khata Bikri Byora with From/To Date Calendar)
  // ---------------------------------------------------------------------------
  if (!isSalesPerson && activeTab === 'udhaar-history') {
    return (
      <UdhaarHistoryView
        truckSalesList={truckSalesList}
        customerProfiles={customerProfiles}
        salesList={salesList}
        supplierProfiles={supplierProfiles}
        suppliers={suppliers}
        purchasesList={purchasesList}
        selectedBoardDate={getSystemDate()}
        onBack={() => setActiveTab('dashboard')}
        formatDisplayDate={formatDisplayDate}
        getSystemDate={getSystemDate}
        showToast={showToast}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Daily Reports View — Saved Day-End Reports & Audits
  // ---------------------------------------------------------------------------
  if (!isSalesPerson && (activeTab === 'daily-reports' || activeTab === 'reports')) {
    return (
      <DailyReportsView
        savedReports={savedReports}
        setSavedReports={setSavedReports}
        saveDailyReport={saveDailyReport}
        onDeleteDailyReport={handleDeleteDailyReport}
        onUnlockDailyReport={handleUnlockDailyReport}
        getSystemDate={getSystemDate}
        showToast={showToast}
        currentUser={currentUser}
        onOpenTodayReport={() => {
          if (setActiveTab) setActiveTab('cash-sell-transactions');
        }}
        onBack={() => {
          if (setActiveTab) setActiveTab('dashboard');
        }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Cash Sell Transactions — Collection (Tagada) & Expenses (Paisa Diya)
  // ---------------------------------------------------------------------------
  if (!isSalesPerson && activeTab === 'cash-sell-transactions') {
    return (
      <CashSellTransactionsView
        customerProfiles={customerProfiles}
        setCustomerProfiles={setCustomerProfiles}
        customers={customers}
        setCustomers={setCustomers}
        suppliers={suppliers}
        setSuppliers={setSuppliers}
        supplierProfiles={supplierProfiles}
        setSupplierProfiles={setSupplierProfiles}
        unifiedSuppliers={unifiedSuppliers}
        cashSalePayments={cashSalePayments}
        setCashSalePayments={setCashSalePayments}
        saveCashSalePayments={saveCashSalePayments}
        truckSalesList={truckSalesList}
        salesList={salesList}
        purchasesList={purchasesList}
        getSystemDate={getSystemDate}
        showToast={showToast}
        savedReports={savedReports}
        setSavedReports={setSavedReports}
        saveDailyReport={saveDailyReport}
        onUnlockDailyReport={handleUnlockDailyReport}
        currentUser={currentUser}
        onOpenDailyReports={() => {
          if (setActiveTab) setActiveTab('daily-reports');
        }}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <BoardPageView
        supplierProfiles={supplierProfiles}
        setSupplierProfiles={setSupplierProfiles}
        truckSalesList={truckSalesList}
        setTruckSalesList={setTruckSalesList}
        salesList={salesList}
        customerProfiles={customerProfiles}
        setCustomerProfiles={setCustomerProfiles}
        suppliers={suppliers}
        setSuppliers={setSuppliers}
        customers={customers}
        setCustomers={setCustomers}
        purchasesList={purchasesList}
        setActiveTab={setActiveTab}
        showToast={showToast}
        setIsCustomerModalOpen={setIsCustomerModalOpen}
        setIsSupplierTrucksModalOpen={setIsSupplierTrucksModalOpen}
        saveFruitAndVariety={saveFruitAndVariety}
        savedFruitNames={savedFruitNames}
        savedFruitVarieties={savedFruitVarieties}
        currentUser={currentUser}
        isSalesPerson={isSalesPerson}
      />

      {/* ----------------------------------------------------------------- */}
      {/* 5. Customer Directory & Unified Profile Modal */}
      {/* (Opens from top button: shows single profile with full history) */}
      {/* ----------------------------------------------------------------- */}
      {isCustomerModalOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsCustomerModalOpen(false)}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '1050px', height: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mandi-modal-header customer-modal-header">
              <div className="customer-header-main-col">
                <div className="customer-header-icon">
                  <Users size={20} />
                </div>
                <div className="customer-header-info">
                  <div className="customer-header-title-row">
                    <h3 className="customer-header-title">
                      Customer Profiles & Khata Ledgers
                    </h3>
                    <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <ShieldCheck size={11} /> Authenticated • MySQL Live
                    </span>
                  </div>
                  <div className="customer-header-subtitle">
                    Single customer profile with complete Buy (Kharidari) and Payment (Jama) history
                  </div>
                </div>
              </div>

              <div className="customer-header-actions-col">
                <button
                  type="button"
                  className="btn btn-sm customer-btn-clear"
                  onClick={handleClearAllCustomers}
                  title="Delete all customer profiles and khata ledgers"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm customer-btn-add"
                  onClick={() => setIsAddCustomerOpen(true)}
                >
                  <Plus size={14} />
                  <span>New Customer</span>
                </button>

                <button
                  type="button"
                  className="btn-icon customer-btn-close"
                  onClick={() => setIsCustomerModalOpen(false)}
                  title="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Split Layout */}
            <div className="mandi-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Summary Stats Row */}
              <div className="khata-summary-stats-grid">
                <div className="khata-stat-card">
                  <span className="khata-stat-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Customers
                  </span>
                  <span className="khata-stat-value" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {customerProfiles.length}
                  </span>
                </div>

                <div className="khata-stat-card" style={{ borderLeft: '3px solid #ef4444' }}>
                  <span className="khata-stat-label" style={{ fontSize: '0.72rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Khata Udhaar (Pending)
                  </span>
                  <span className="khata-stat-value" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>
                    ₹{totalCustomerDues.toLocaleString()}
                  </span>
                </div>

                <div className="khata-stat-card" style={{ borderLeft: '3px solid #10b981' }}>
                  <span className="khata-stat-label" style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Received
                  </span>
                  <span className="khata-stat-value" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>
                    ₹{totalCustomerReceived.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Customer Directory Search Bar */}
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search customer by name, phone, or city..."
                  style={{ paddingLeft: '34px', fontSize: '0.88rem', height: '42px', width: '100%', boxSizing: 'border-box' }}
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                />
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchQuery('')}
                    style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Customer Profiles Directory Grid (Responsive for Mobile, Tablet & Desktop) */}
              <div className="customer-directory-grid" style={{ flex: '1 1 auto', minHeight: 0 }}>
                {filteredCustomerDirectory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                    <User size={38} color="#94a3b8" style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>No customers found</div>
                    <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try searching with a different customer name, phone number, or city.</p>
                  </div>
                ) : (
                  filteredCustomerDirectory.map(c => {
                    return (
                      <div
                        key={c.id}
                        className="customer-directory-card compact-customer-card"
                        style={{
                          height: 'auto',
                          minHeight: 'fit-content',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                        onClick={() => {
                          setSelectedCustomerForView(c);
                          setIsPaymentDrawerOpen(false);
                          setSelectedBuyDateDetails(null);
                          setIsCustomerDetailPopupOpen(true);
                        }}
                      >
                        {/* Card Header: Avatar + Customer Name/Phone (Left) & Actions (Right) */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          width: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            minWidth: 0,
                            flex: '1 1 auto',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              flexShrink: 0
                            }}>
                              {(c.customer_name || 'C')[0]?.toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <div style={{
                                fontWeight: 800,
                                fontSize: '0.94rem',
                                color: 'var(--text-main)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {c.customer_name}
                              </div>
                              <div style={{
                                fontSize: '0.72rem',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                <span>📞 {c.phone || 'No phone'}</span>
                                {c.address ? (
                                  <>
                                    <span>•</span>
                                    <span>📍 {c.address}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            flexShrink: 0
                          }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditCustomer(c);
                              }}
                              title={`Edit profile of ${c.customer_name}`}
                              style={{
                                background: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                color: '#3b82f6',
                                borderRadius: '5px',
                                width: '22px',
                                height: '22px',
                                minWidth: '22px',
                                maxWidth: '22px',
                                minHeight: '22px',
                                maxHeight: '22px',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                alignSelf: 'center',
                                lineHeight: 1,
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                e.currentTarget.style.borderColor = '#3b82f6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
                              }}
                            >
                              <Edit size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '6px',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '0.74rem',
                          color: '#3b82f6',
                          fontWeight: 700
                        }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                            {c.buy_history?.length || 0} Orders
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            View Khata Details →
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5.1 Centered Customer Detail Pop-up Page                          */}
      {/* ----------------------------------------------------------------- */}
      {isCustomerDetailPopupOpen && selectedCustomerForView && (
        <div className="centered-popup-backdrop" onClick={() => setIsCustomerDetailPopupOpen(false)}>
          <div
            className="centered-detail-popup"
            style={{ width: '100%', maxWidth: '920px', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Detail Header */}
            <div className="mandi-modal-header" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsCustomerDetailPopupOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>

                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>
                  {(selectedCustomerForView.customer_name || 'C')[0]?.toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedCustomerForView.customer_name}
                    </h2>
                    <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <ShieldCheck size={11} /> Authenticated • MySQL Live
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span>📞 {selectedCustomerForView.phone || 'No phone'}</span>
                    {selectedCustomerForView.address ? (
                      <>
                        <span>•</span>
                        <span>📍 {selectedCustomerForView.address}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleDeleteSingleCustomer(selectedCustomerForView)}
                  title={`Delete ${selectedCustomerForView.customer_name}`}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} />
                  <span className="hide-on-mobile">Delete</span>
                </button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="mandi-modal-body" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {/* Customer Stat Cards: Grid for Total Purchases, Total Paid, Total Less, Current Khata Due */}
              {(() => {
                const totalBought = Number(selectedCustomerForView.total_bought || 0);
                const totalPaid = Number(selectedCustomerForView.total_paid ?? ((selectedCustomerForView.payment_history && selectedCustomerForView.payment_history.length > 0)
                  ? selectedCustomerForView.payment_history.reduce((s, p) => s + (Number(p.amount) || 0), 0)
                  : Math.max(0, totalBought - Number(selectedCustomerForView.current_balance || 0))));
                const totalLess = (selectedCustomerForView.payment_history || []).reduce((s, p) => s + (Number(p.less_amount) || 0), 0) || Number(selectedCustomerForView.total_discount || 0);
                const currentDue = Number(selectedCustomerForView.current_balance || 0);

                return (
                  <div>
                    <div className="customer-detail-stat-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '12px'
                    }}>
                      <div className="khata-stat-card">
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                          Total Purchases
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                          ₹{totalBought.toLocaleString()}
                        </span>
                      </div>

                      <div className="khata-stat-card" style={{ borderLeft: '3px solid #10b981' }}>
                        <span style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>
                          Total Paid
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                          ₹{totalPaid.toLocaleString()}
                        </span>
                      </div>

                      <div className="khata-stat-card" style={{
                        borderLeft: currentDue > 0 ? '3px solid #ef4444' : '3px solid #10b981',
                        background: currentDue > 0 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)'
                      }}>
                        <span style={{ fontSize: '0.72rem', color: currentDue > 0 ? '#ef4444' : '#10b981', textTransform: 'uppercase', fontWeight: 800 }}>
                          Current Khata Due
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: currentDue > 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                          ₹{currentDue.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {totalLess > 0 && (
                      <div style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px dashed rgba(59, 130, 246, 0.25)',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}>
                        <span>
                          <strong>Khata Hisab:</strong> ₹{totalBought.toLocaleString()} (Purchase) − ₹{totalPaid.toLocaleString()} (Paid) − <span style={{ color: '#d97706', fontWeight: 700 }}>₹{totalLess.toLocaleString()} (Less)</span> = <strong style={{ color: currentDue > 0 ? '#ef4444' : '#10b981' }}>₹{currentDue.toLocaleString()} (Due)</strong>
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                          ✓ Less Due se successfully minus ho chuka hai
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Receive Payment Inline Drawer */}
              {isPaymentDrawerOpen && (
                <form onSubmit={handleRecordCustomerPayment} style={{
                  padding: '14px 16px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#10b981', fontSize: '0.88rem' }}>
                      <Check size={16} />
                      <span>Record Payment (Jama Karein) for {selectedCustomerForView.customer_name}</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <ShieldCheck size={11} /> Authenticated • MySQL Live
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Payment Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={paymentForm.date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder={`Max: ${selectedCustomerForView.current_balance || ''}`}
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem', color: '#ef4444' }}>Less (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="0"
                        value={paymentForm.less}
                        onChange={(e) => setPaymentForm({ ...paymentForm, less: e.target.value })}
                        style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Payment Mode</label>
                      <select
                        className="form-control"
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      >
                        <option value="CASH">Cash (Rokda)</option>
                        <option value="UPI">UPI / GPay / Paytm</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Ref / Notes</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Receipt / UTR No."
                        value={paymentForm.reference}
                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsPaymentDrawerOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      Save Payment (Jama)
                    </button>
                  </div>
                </form>
              )}

              {/* Tabs: Buy History vs Payment History */}
              <div className="khata-tabs">
                <button
                  type="button"
                  className={`khata-tab ${activeCustomerTab === 'buy' ? 'active' : ''}`}
                  onClick={() => setActiveCustomerTab('buy')}
                >
                  <ShoppingCart size={15} />
                  <span>Buy History ({selectedCustomerForView.buy_history?.length || 0})</span>
                </button>

                <button
                  type="button"
                  className={`khata-tab ${activeCustomerTab === 'payment' ? 'active' : ''}`}
                  onClick={() => setActiveCustomerTab('payment')}
                >
                  <History size={15} />
                  <span>Payment History ({selectedCustomerForView.payment_history?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Buy History Date-Wise */}
              {activeCustomerTab === 'buy' && (
                <div>
                  {dateWiseBuyHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      No purchase history recorded for this customer yet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px' }}>
                      {dateWiseBuyHistory.map(group => {
                        const avgRate = group.totalBoxes > 0 ? Math.round(group.totalAmount / group.totalBoxes) : 0;
                        return (
                          <div
                            key={group.date}
                            onClick={() => setSelectedBuyDateDetails(group)}
                            style={{
                              background: 'var(--bg-card, var(--bg-surface))',
                              border: '1.5px solid var(--border-subtle)',
                              borderRadius: '12px',
                              padding: '14px 16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                              transition: 'all 0.18s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#3b82f6';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 6px 18px rgba(59, 130, 246, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border-subtle)';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                            }}
                          >
                            {/* Card Top: Date & Total Amount */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Calendar size={15} color="#3b82f6" />
                                  <span>{formatDisplayDate(group.date)}</span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                  {group.items.length} {group.items.length === 1 ? 'Order' : 'Orders'} • Click to view →
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                                  Total
                                </div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)' }}>
                                  ₹{group.totalAmount.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {/* Card Bottom: Total Box / Per Box Price */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '9px 12px',
                              background: 'var(--bg-main)',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '0.82rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total Box:</span>
                                <strong style={{ color: '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>{group.totalBoxes} BX</strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Per Box Price:</span>
                                <strong style={{ color: 'var(--text-main)', fontWeight: 800 }}>₹{avgRate.toLocaleString()} / BX</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Payment History Table */}
              {activeCustomerTab === 'payment' && (
                <div>
                  {(!selectedCustomerForView.payment_history || selectedCustomerForView.payment_history.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      No payment entries recorded yet. Click "Receive Payment (Jama)" above to record payments.
                    </div>
                  ) : (
                    <div className="erp-table-wrapper" style={{ margin: 0, border: '1px solid var(--border-subtle)', borderRadius: '10px', overflowX: 'auto', background: 'var(--bg-surface)' }}>
                      <table className="erp-table" style={{ width: '100%', fontSize: '0.84rem', margin: 0, minWidth: '600px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '12px 14px', width: '120px' }}>Payment Date</th>
                            <th style={{ textAlign: 'right', padding: '12px 14px', width: '130px' }}>Amount Paid</th>
                            <th style={{ textAlign: 'right', padding: '12px 14px', width: '110px' }}>Less (₹)</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', width: '120px' }}>Mode</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px', width: '140px' }}>Reference No.</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px' }}>Remarks / Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomerForView.payment_history.map(p => {
                            const lessVal = Number(p.less_amount || 0);
                            return (
                              <tr key={p.id}>
                                <td style={{ textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                  {formatDisplayDate(p.date)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 800, color: '#10b981', fontSize: '0.92rem' }}>
                                  ₹{Number(p.amount || 0).toLocaleString()}
                                </td>
                                <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700 }}>
                                  {lessVal > 0 ? (
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: '5px',
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      color: '#ef4444',
                                      fontWeight: 800,
                                      fontSize: '0.82rem',
                                      border: '1px solid rgba(239, 68, 68, 0.25)'
                                    }}>
                                      ₹{lessVal.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted, #94a3b8)' }}>—</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                                  <span className="badge badge-info" style={{ fontSize: '0.72rem', padding: '3px 9px' }}>
                                    {p.payment_method || p.mode || 'CASH'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'left', padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                  {p.reference || '—'}
                                </td>
                                <td style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--text-secondary)' }}>
                                  {p.notes || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mandi-modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedBuyDateDetails(null);
                  setIsCustomerDetailPopupOpen(false);
                }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Date-Wise Buy History Detail Popup Modal */}
      {/* ----------------------------------------------------------------- */}
      {selectedBuyDateDetails && (
        <div
          className="mandi-modal-backdrop"
          style={{
            zIndex: 10500,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setSelectedBuyDateDetails(null)}
        >
          <div
            className="mandi-modal-dialog"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              margin: 'auto',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              border: '1.5px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Date Popup Header */}
            <div className="mandi-modal-header" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <Calendar size={16} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Buy History — {formatDisplayDate(selectedBuyDateDetails.date)}
                  </h3>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {selectedCustomerForView?.customer_name} • {selectedBuyDateDetails.items.length} {selectedBuyDateDetails.items.length === 1 ? 'Item' : 'Items'} • Total {selectedBuyDateDetails.totalBoxes} Boxes
                </div>
              </div>

              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setSelectedBuyDateDetails(null);
                  setIsBillSelectMode(false);
                  setSelectedBillItemIds([]);
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-bar directly under Buy History navbar: Bill Option & Selection Bar */}
            <div style={{
              padding: '10px 20px',
              background: 'var(--bg-main)',
              borderBottom: '1.5px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isBillSelectMode) {
                      setIsBillSelectMode(true);
                      setSelectedBillItemIds(selectedBuyDateDetails.items.map((it, idx) => it.id || idx));
                    } else {
                      setIsBillSelectMode(false);
                      setSelectedBillItemIds([]);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isBillSelectMode ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'var(--bg-surface)',
                    color: isBillSelectMode ? '#ffffff' : '#2563eb',
                    border: '1.5px solid #2563eb',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: isBillSelectMode ? '0 4px 12px rgba(37, 99, 235, 0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileText size={15} />
                  <span>{isBillSelectMode ? '✓ Bill Select Mode' : '🧾 Bill'}</span>
                </button>

                {isBillSelectMode && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Tick items to include in bill
                  </span>
                )}
              </div>

              {isBillSelectMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedBillItemIds.length === selectedBuyDateDetails.items.length && selectedBuyDateDetails.items.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBillItemIds(selectedBuyDateDetails.items.map((it, idx) => it.id || idx));
                        } else {
                          setSelectedBillItemIds([]);
                        }
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                    <span>Select All ({selectedBillItemIds.length}/{selectedBuyDateDetails.items.length})</span>
                  </label>

                  <button
                    type="button"
                    disabled={selectedBillItemIds.length === 0}
                    onClick={handleOpenSelectedBill}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: selectedBillItemIds.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: selectedBillItemIds.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: selectedBillItemIds.length === 0 ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Receipt size={14} />
                    <span>Generate Bill ({selectedBillItemIds.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Date Popup Body: List of all purchases for this date as horizontal rows */}
            <div className="mandi-modal-body" style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedBuyDateDetails.items.map((item, idx) => {
                const itemKey = item.id || idx;
                const isSelected = selectedBillItemIds.includes(itemKey);
                return (
                  <div
                    key={itemKey}
                    className="buy-history-item-row"
                    onClick={() => {
                      if (isBillSelectMode) {
                        toggleItemSelection(itemKey);
                      }
                    }}
                    style={{
                      background: isBillSelectMode && isSelected
                        ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, var(--bg-card) 100%)'
                        : 'var(--bg-card, var(--bg-surface))',
                      border: isBillSelectMode && isSelected
                        ? '2px solid #2563eb'
                        : '1.5px solid var(--border-subtle)',
                      boxShadow: isBillSelectMode && isSelected ? '0 4px 14px rgba(37, 99, 235, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                      cursor: isBillSelectMode ? 'pointer' : 'default'
                    }}
                  >
                    {/* Bill Select Checkbox */}
                    {isBillSelectMode && (
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(itemKey)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#2563eb'
                          }}
                        />
                      </div>
                    )}

                    {/* 1. Fruit Name (with Truck badge) */}
                    <div className="buy-item-product-col">
                      <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                        {item.product_name}
                      </span>
                      {item.truck_no && (
                        <span style={{
                          fontSize: '0.72rem',
                          color: '#2563eb',
                          background: 'rgba(37, 99, 235, 0.1)',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          🚚 {item.truck_no}
                        </span>
                      )}
                    </div>

                    {/* 2. Total Box * Per Box Price */}
                    <div className="buy-item-calc-col">
                      <span style={{ color: '#10b981', fontWeight: 800 }}>{item.boxes} BX</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>×</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>₹{Number(item.rate_per_box).toLocaleString()}</span>
                    </div>

                    {/* 3. Total with Mode */}
                    <div className="buy-item-total-col">
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                        ₹{Number(item.total).toLocaleString()}
                      </span>
                      <span
                        className={`badge ${item.payment_mode === 'CREDIT' ? 'badge-warning' : 'badge-success'}`}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          fontWeight: 800,
                          borderRadius: '6px',
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase'
                        }}
                      >
                        Mode: {item.payment_mode || 'CREDIT'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Date Popup Footer */}
            <div className="mandi-modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Day Total: <span style={{ color: '#10b981' }}>₹{selectedBuyDateDetails.totalAmount.toLocaleString()}</span> ({selectedBuyDateDetails.totalBoxes} Boxes)
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedBuyDateDetails(null);
                  setIsBillSelectMode(false);
                  setSelectedBillItemIds([]);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Particular Buy Item / Multi-Item Bill & Payment Modal             */}
      {/* ----------------------------------------------------------------- */}
      {(selectedItemsForBill || selectedItemForBill) && (() => {
        const billItems = selectedItemsForBill || (selectedItemForBill ? [selectedItemForBill] : []);
        const totalBillBoxes = billItems.reduce((acc, it) => acc + Number(it.boxes || 0), 0);
        const totalBillAmount = billItems.reduce((acc, it) => acc + Number(it.total || 0), 0);
        const totalBillCash = billItems.filter(it => it.payment_mode === 'CASH').reduce((acc, it) => acc + Number(it.total || 0), 0);
        const totalBillCredit = billItems.filter(it => it.payment_mode === 'CREDIT').reduce((acc, it) => acc + Number(it.total || 0), 0);
        const hasCreditItems = totalBillCredit > 0;

        return (
          <div
            className="mandi-modal-backdrop bill-modal-backdrop"
            style={{
              zIndex: 10600,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => {
              setSelectedItemsForBill(null);
              setSelectedItemForBill(null);
            }}
          >
            <div
              className="mandi-modal-dialog bill-modal-dialog"
              style={{
                width: '100%',
                maxWidth: '620px',
                maxHeight: '92vh',
                margin: 'auto',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
                border: '1.5px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bill Header Bar */}
              <div className="mandi-modal-header bill-modal-header" style={{
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)'
              }}>
                <div className="bill-header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                    flexShrink: 0
                  }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Bill / Bikri Parchi
                    </h3>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Bill No: BP-{String(billItems[0]?.id || Date.now()).slice(-6)} • {billItems.length} {billItems.length === 1 ? 'Item' : 'Items'}
                    </div>
                  </div>
                </div>

                <div className="bill-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleDownloadBillPDF(billItems)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                    }}
                    title="Download Bill as PDF file"
                  >
                    <Download size={14} />
                    <span className="hide-on-mobile">Download </span><span>PDF</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handlePrintSelectedBill(billItems)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 11px',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}
                    title="Print Bill / Save as PDF"
                  >
                    <Printer size={14} />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => {
                      setSelectedItemsForBill(null);
                      setSelectedItemForBill(null);
                    }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Bill Body (Scrollable) */}
              <div className="mandi-modal-body bill-modal-body" style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Printable / Realistic Bill Parchi Card */}
                <div className="bill-parchi-card" style={{
                  background: 'var(--bg-card)',
                  border: '1.5px dashed var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {/* Shop Header */}
                  <div className="bill-shop-header" style={{ textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '0.04em' }}>
                      AZIZ INTERNATIONAL
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Azadpur Mandi, Delhi • Fruits & Dry Fruits Commission Agent
                    </div>
                    <div style={{
                      display: 'inline-block',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--text-secondary)',
                      marginTop: '6px'
                    }}>
                      BIKRI PARCHI / SALE INVOICE
                    </div>
                  </div>

                  {/* Customer & Bill Meta */}
                  <div className="bill-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Customer Name
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '1px' }}>
                        {selectedCustomerForView?.customer_name}
                      </div>
                      {selectedCustomerForView?.phone && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          📞 {selectedCustomerForView.phone}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Bill Date
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '1px', fontFamily: 'monospace' }}>
                        📅 {formatDisplayDate(selectedBuyDateDetails?.date || billItems[0]?.date || billItems[0]?.selling_date)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                        Bill No: <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>BP-{String(billItems[0]?.id || Date.now()).slice(-6)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Produce Table - Fixed 100% Width (Non-Scrollable) */}
                  <div
                    className="bill-produce-table-container"
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      width: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                  >
                    <table
                      className="bill-produce-table"
                      style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.8rem' }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                          <th className="col-buy-date" style={{ padding: '8px 6px', textAlign: 'left', width: '22%' }}>Buy Date</th>
                          <th className="col-fruit-name" style={{ padding: '8px 6px', textAlign: 'left', width: '30%' }}>Fruit Name</th>
                          <th className="col-box-rate" style={{ padding: '8px 6px', textAlign: 'center', width: '28%' }}>Total Box × Rate</th>
                          <th className="col-total" style={{ padding: '8px 6px', textAlign: 'right', width: '20%' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billItems.map((item, idx) => {
                          const itemDate = formatDisplayDate(item.date || item.selling_date || selectedBuyDateDetails?.date || getSystemDate());
                          return (
                            <tr key={item.id || idx} style={{ borderBottom: '1px dashed var(--border-subtle)' }}>
                              {/* 1. Buy Date */}
                              <td className="col-buy-date" style={{
                                padding: '8px 6px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                fontSize: '0.76rem',
                                whiteSpace: 'nowrap'
                              }}>
                                {itemDate}
                              </td>

                              {/* 2. Fruit Name (No Truck Number) */}
                              <td className="col-fruit-name" style={{
                                padding: '8px 6px',
                                fontWeight: 800,
                                color: 'var(--text-main)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                <span title={item.product_name} style={{ fontWeight: 800 }}>{item.product_name}</span>
                              </td>

                              {/* 3. Total Box * Per Box Price */}
                              <td className="col-box-rate" style={{
                                padding: '8px 6px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap'
                              }}>
                                <span className="box-rate-pill" style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'var(--bg-surface)',
                                  padding: '3px 7px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-subtle)',
                                  fontSize: '0.76rem'
                                }}>
                                  <strong style={{ color: '#10b981' }}>{item.boxes} BX</strong>
                                  <span style={{ color: 'var(--text-secondary)' }}>×</span>
                                  <strong style={{ color: 'var(--text-main)' }}>₹{Number(item.rate_per_box).toLocaleString()}</strong>
                                </span>
                              </td>

                              {/* 4. Total */}
                              <td className="col-total" style={{
                                padding: '8px 6px',
                                textAlign: 'right',
                                whiteSpace: 'nowrap'
                              }}>
                                <div style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                                  ₹{Number(item.total).toLocaleString()}
                                </div>
                                {item.payment_mode && (
                                  <span
                                    className={`badge ${item.payment_mode === 'CREDIT' ? 'badge-warning' : 'badge-success'}`}
                                    style={{ fontSize: '0.62rem', padding: '1px 5px', fontWeight: 800, marginTop: '2px', display: 'inline-block' }}
                                  >
                                    {item.payment_mode}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {billItems.length > 1 && (
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border-subtle)' }}>
                            <td colSpan="2" className="col-buy-date" style={{ padding: '8px 6px', fontWeight: 800, color: 'var(--text-main)' }}>
                              Total
                            </td>
                            <td colSpan="2" className="col-total" style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 900, fontSize: '0.95rem', color: '#10b981' }}>
                              ₹{totalBillAmount.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

              </div>

              {/* Bill Footer */}
              <div className="mandi-modal-footer" style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedItemsForBill(null);
                    setSelectedItemForBill(null);
                  }}
                >
                  Close Bill
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ----------------------------------------------------------------- */}
      {/* 6. Add New Customer Sub-Modal */}
      {/* ----------------------------------------------------------------- */}
      {isAddCustomerOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsAddCustomerOpen(false)} style={{ zIndex: 10050 }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mandi-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>Add New Customer</h4>
                <span className="badge badge-success" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <ShieldCheck size={11} /> Authenticated • MySQL Live
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsAddCustomerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewCustomer}>
              <div className="mandi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Customer / Party Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Agarwal Fruit Company"
                    value={newCustomerForm.customer_name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9811223344"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Customer Address (Optional)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Enter customer / shop address (optional)"
                    value={newCustomerForm.address}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Opening Due Balance (if any ₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={newCustomerForm.opening_balance}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, opening_balance: e.target.value })}
                  />
                </div>
              </div>

              <div className="mandi-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddCustomerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
                >
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6.1 Edit Customer Profile Modal */}
      {/* ----------------------------------------------------------------- */}
      {isEditCustomerOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsEditCustomerOpen(false)} style={{ zIndex: 10050 }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mandi-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={17} color="#3b82f6" />
                <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>Edit Customer Profile</h4>
                <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <ShieldCheck size={11} /> Authenticated • MySQL Live
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsEditCustomerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer}>
              <div className="mandi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Customer / Party Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Agarwal Fruit Company"
                    value={editCustomerForm.customer_name}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone / Mobile Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9811223344"
                    value={editCustomerForm.phone}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Address / Shop Details</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Shop No. 42, D-Block, Azadpur Subzi Mandi"
                    value={editCustomerForm.address}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="mandi-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditCustomerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingCustomer}
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
                >
                  {isSavingCustomer ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 7. Supplier Profiles & Trucks Directory Modal                      */}
      {/* ================================================================= */}
      {isSupplierTrucksModalOpen && (() => {
        const activeSupp = selectedSupplierForDetail || unifiedSuppliers[0] || null;
        const suppLower = (activeSupp?.supplier_name || activeSupp?.name || '').trim().toLowerCase();

        // Inward orders for active supplier
        const suppOrders = purchasesList.filter(p =>
          activeSupp && (
            p.supplier === activeSupp.id ||
            (p.supplier_name && p.supplier_name.toLowerCase() === suppLower)
          )
        );

        // Group inward orders by truck
        const ordersByTruck = suppOrders.reduce((acc, po) => {
          const tNum = (po.truck_number || 'UNKNOWN TRUCK').trim().toUpperCase();
          if (!acc[tNum]) acc[tNum] = [];
          acc[tNum].push(po);
          return acc;
        }, {});

        // Include any truck from supplierProfiles
        supplierProfiles.forEach(sp => {
          if ((sp.supplier_name || '').trim().toLowerCase() === suppLower && sp.truckno) {
            const tNum = sp.truckno.trim().toUpperCase();
            if (!ordersByTruck[tNum] || ordersByTruck[tNum].length === 0) {
              ordersByTruck[tNum] = [{
                id: `entry-${sp.id}`,
                purchase_date: sp.date || getSystemDate(),
                truck_number: tNum,
                items: [{
                  product_name: sp.fruit || 'Apple',
                  variety_name: sp.variety || 'Standard',
                  quantity_boxes: sp.boxes || sp.balance_box || 100
                }],
                balance_box: sp.balance_box,
                status: 'RECEIVED'
              }];
            }
          }
        });

        // Helper to fetch all customer fruit sales for this supplier & specific truck
        const getTruckSales = (truckNum) => {
          return getTruckSalesForSupplier(activeSupp, truckNum);
        };

        // All distinct truck numbers (both from inward and sales)
        const allTrucksSet = new Set(Object.keys(ordersByTruck));
        (truckSalesList || []).forEach(ts => {
          if ((ts.supplier_name || '').trim().toLowerCase() === suppLower && ts.truck_no) {
            allTrucksSet.add(ts.truck_no.trim().toUpperCase());
          }
        });
        (customerProfiles || []).forEach(cust => {
          (cust.buy_history || []).forEach(b => {
            if ((b.supplier_name || '').trim().toLowerCase() === suppLower && b.truck_no) {
              allTrucksSet.add(b.truck_no.trim().toUpperCase());
            }
          });
        });

        const truckNumbers = Array.from(allTrucksSet);
        const displayedTrucks = selectedTruckFilter === 'ALL'
          ? truckNumbers
          : truckNumbers.filter(t => t === selectedTruckFilter);

        const totalSuppOrders = truckNumbers.reduce((sum, t) => sum + (ordersByTruck[t] ? ordersByTruck[t].length : 0), 0);

        return (
          <div className="mandi-modal-backdrop" onClick={() => setIsSupplierTrucksModalOpen(false)}>
            <div
              className="mandi-modal-dialog supplier-modal-dialog"
              style={{ width: '100%', maxWidth: '1100px', height: '88vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header / Nav Bar */}
              <div className="mandi-modal-header supplier-modal-header">
                {/* 1. Header Top Row: Title, Icon & Close Button */}
                <div className="supplier-header-top-row">
                  <div className="supplier-header-title-col">
                    <div className="supplier-header-icon">
                      <Truck size={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 className="supplier-header-heading">
                          Supplier Profiles & Trucks Directory
                        </h3>
                        <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <ShieldCheck size={11} /> Authenticated • MySQL Live
                        </span>
                      </div>
                      <div className="supplier-header-subtext">
                        Bank Passbooks & Inward Consignments Organized by Truck No.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-icon supplier-close-btn"
                    onClick={() => setIsSupplierTrucksModalOpen(false)}
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 2. Supplier Search Bar in Nav Bar */}
                <div className="supplier-header-search-wrap">
                  <input
                    type="text"
                    className="form-control supplier-header-search-input"
                    placeholder="Search supplier, phone, bank, truck..."
                    value={supplierTrucksSearch}
                    onChange={(e) => setSupplierTrucksSearch(e.target.value)}
                  />
                  <Search size={15} color="#94a3b8" className="supplier-header-search-icon" />
                  {supplierTrucksSearch && (
                    <button
                      type="button"
                      onClick={() => setSupplierTrucksSearch('')}
                      className="supplier-header-search-clear"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* 3. Action Buttons */}
                <div className="supplier-header-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-clear-suppliers"
                    onClick={handleClearAllSuppliers}
                    title="Delete all supplier profiles"
                  >
                    <Trash2 size={13} />
                    <span>Clear All</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-new-supplier"
                    onClick={() => setIsAddSupplierModalOpen(true)}
                  >
                    <Plus size={14} />
                    <span>+ New Supplier Profile</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="mandi-modal-body supplier-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Summary Metrics: Total Suppliers & Active Trucks (Card Format) */}
                <div className="supplier-stats-cards-grid">
                  {/* Card 1: Total Suppliers */}
                  <div
                    className={`supplier-stat-card ${supplierDirectoryFilter === 'ALL' ? 'active-all-card' : ''}`}
                    onClick={() => setSupplierDirectoryFilter('ALL')}
                    role="button"
                    tabIndex={0}
                    title="Click to view all supplier profiles"
                  >
                    <div className="supplier-stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                      <Users size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="supplier-stat-label">
                        Total Suppliers
                      </div>
                      <div className="supplier-stat-value" style={{ color: 'var(--text-main)' }}>
                        {unifiedSuppliers.length}
                      </div>
                      <div className="supplier-stat-subtext" style={{ color: supplierDirectoryFilter === 'ALL' ? '#3b82f6' : 'var(--text-secondary)' }}>
                        {supplierDirectoryFilter === 'ALL' ? '● All Profiles' : 'Click to show all'}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Active Trucks */}
                  <div
                    className={`supplier-stat-card ${supplierDirectoryFilter === 'ACTIVE_TRUCKS' ? 'active-stat-card' : ''}`}
                    onClick={() => setSupplierDirectoryFilter(prev => prev === 'ACTIVE_TRUCKS' ? 'ALL' : 'ACTIVE_TRUCKS')}
                    role="button"
                    tabIndex={0}
                    title="Click to show active truck profiles"
                  >
                    <div className="supplier-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <Truck size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="supplier-stat-label" style={{ color: '#10b981' }}>
                        Active Trucks
                      </div>
                      <div className="supplier-stat-value" style={{ color: '#10b981' }}>
                        {activeTrucksCount} Trucks
                      </div>
                      <div className="supplier-stat-subtext" style={{ color: supplierDirectoryFilter === 'ACTIVE_TRUCKS' ? '#10b981' : 'var(--text-secondary)' }}>
                        {supplierDirectoryFilter === 'ACTIVE_TRUCKS' ? '● Active Profiles Filtered' : 'Click to show active'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Filter Notice Bar */}
                {supplierDirectoryFilter === 'ACTIVE_TRUCKS' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    color: '#10b981',
                    fontWeight: 700
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Filter size={13} />
                      <span>Showing Active Profiles Only ({filteredUnifiedSuppliers.length} found)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSupplierDirectoryFilter('ALL')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        textDecoration: 'underline',
                        fontWeight: 600,
                        padding: 0
                      }}
                    >
                      Show All Profiles
                    </button>
                  </div>
                )}

                {/* Supplier Directory Grid (Responsive for Mobile, Tablet & Desktop) */}
                <div className="supplier-directory-grid" style={{ flex: '1 1 auto', minHeight: 0 }}>
                  {filteredUnifiedSuppliers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                      <Truck size={38} color="#94a3b8" style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>No suppliers found</div>
                      <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try searching with a different name, phone, bank, or truck number.</p>
                    </div>
                  ) : (
                    filteredUnifiedSuppliers.map(s => {
                      const sOrderCount = purchasesList.filter(p => p.supplier === s.id || (p.supplier_name && p.supplier_name.toLowerCase() === (s.supplier_name || '').toLowerCase())).length;

                      return (
                        <div
                          key={s.id}
                          className="supplier-directory-card"
                          style={{ height: 'auto', minHeight: 'fit-content' }}
                          onClick={() => {
                            setSelectedSupplierForDetail(s);
                            setSelectedTruckFilter('ALL');
                            setTruckStatusFilter('ACTIVE');
                            setIsSupplierDetailPopupOpen(true);
                          }}
                        >
                          {/* Card Header: Avatar + Supplier Name + Truck Badge & Actions */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: 0,
                              flex: '1 1 auto',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                flexShrink: 0
                              }}>
                                {(s.supplier_name || s.name || 'S')[0]?.toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                <div style={{
                                  fontWeight: 800,
                                  fontSize: '0.88rem',
                                  color: 'var(--text-main)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {s.supplier_name || s.name}
                                </div>
                                <div style={{
                                  fontSize: '0.7rem',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  marginTop: '1px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  <span>📞 {s.phone || 'No phone registered'}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0
                            }}>
                              <span
                                className="badge badge-success"
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '12px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                              >
                                {s.truckno || (sOrderCount > 0 ? `${sOrderCount} Orders` : 'Active')}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSingleSupplier(s);
                                }}
                                title={`Delete profile of ${s.supplier_name || s.name}`}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#ef4444',
                                  borderRadius: '6px',
                                  width: '24px',
                                  height: '24px',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease'
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
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Card Action Footer */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '6px',
                            borderTop: '1px solid var(--border-subtle)',
                            fontSize: '0.74rem',
                            color: '#10b981',
                            fontWeight: 700,
                            gap: '6px',
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box'
                          }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              A/C: {s.account_number ? `•••${s.account_number.slice(-4)}` : 'Passbook registered'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.72rem' }}>
                              View Passbook & Trucks →
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          CENTERED DETAIL POP-UP: Supplier Full Profile, Bank Passbook & Truck Sales
          ========================================================================= */}
      {isSupplierDetailPopupOpen && selectedSupplierForDetail && (() => {
        const activeSupp = selectedSupplierForDetail;
        const suppLower = (activeSupp?.supplier_name || activeSupp?.name || '').trim().toLowerCase();

        // Inward orders for active supplier
        const suppOrders = purchasesList.filter(p =>
          activeSupp && (
            p.supplier === activeSupp.id ||
            (p.supplier_name && p.supplier_name.toLowerCase() === suppLower)
          )
        );

        // Group inward orders by truck
        const ordersByTruck = suppOrders.reduce((acc, po) => {
          const tNum = (po.truck_number || 'UNKNOWN TRUCK').trim().toUpperCase();
          if (!acc[tNum]) acc[tNum] = [];
          acc[tNum].push(po);
          return acc;
        }, {});

        // Include any truck from supplierProfiles
        supplierProfiles.forEach(sp => {
          if ((sp.supplier_name || '').trim().toLowerCase() === suppLower && sp.truckno) {
            const tNum = sp.truckno.trim().toUpperCase();
            if (!ordersByTruck[tNum] || ordersByTruck[tNum].length === 0) {
              ordersByTruck[tNum] = [{
                id: `entry-${sp.id}`,
                purchase_date: sp.date || getSystemDate(),
                truck_number: tNum,
                items: [{
                  product_name: sp.fruit || 'Apple',
                  variety_name: sp.variety || 'Standard',
                  quantity_boxes: sp.boxes || sp.balance_box || 100
                }],
                balance_box: sp.balance_box,
                status: 'RECEIVED'
              }];
            }
          }
        });

        // Helper to fetch all customer fruit sales for this supplier & specific truck
        const getTruckSales = (truckNum) => {
          return getTruckSalesForSupplier(activeSupp, truckNum);
        };

        // All distinct truck numbers (both from inward and sales)
        const allTrucksSet = new Set(Object.keys(ordersByTruck));
        (truckSalesList || []).forEach(ts => {
          if ((ts.supplier_name || '').trim().toLowerCase() === suppLower && ts.truck_no) {
            allTrucksSet.add(ts.truck_no.trim().toUpperCase());
          }
        });
        (customerProfiles || []).forEach(cust => {
          (cust.buy_history || []).forEach(b => {
            if ((b.supplier_name || '').trim().toLowerCase() === suppLower && b.truck_no) {
              allTrucksSet.add(b.truck_no.trim().toUpperCase());
            }
          });
        });

        const truckNumbers = Array.from(allTrucksSet);

        // Calculate truck balance for each truck
        const getTruckBalance = (truckNum) => {
          const tUpper = (truckNum || '').trim().toUpperCase();

          // 1. Check supplierProfiles for exact match
          const matchingProfiles = supplierProfiles.filter(sp =>
            (sp.supplier_name || '').trim().toLowerCase() === suppLower &&
            (sp.truckno || '').trim().toUpperCase() === tUpper
          );

          if (matchingProfiles.length > 0) {
            return matchingProfiles.reduce((sum, sp) => {
              if (sp.balance_box !== undefined && sp.balance_box !== null) {
                return sum + Math.max(0, Number(sp.balance_box));
              }
              const initBoxes = Number(sp.boxes || 0);
              const sold = getTruckSales(tUpper).reduce((s, sl) => s + Number(sl.boxes || 0), 0);
              return sum + Math.max(0, initBoxes - sold);
            }, 0);
          }

          // 2. Check ordersByTruck
          const orders = ordersByTruck[tUpper] || [];
          if (orders.length > 0) {
            let explicitBal = 0;
            let hasExplicit = false;
            let totalInwardBoxes = 0;

            orders.forEach(po => {
              if (po.balance_box !== undefined && po.balance_box !== null) {
                hasExplicit = true;
                explicitBal += Math.max(0, Number(po.balance_box));
              }
              const itBoxes = (po.items || []).reduce((s, it) => s + Number(it.quantity_boxes || it.boxes || 0), 0);
              totalInwardBoxes += itBoxes > 0 ? itBoxes : Number(po.boxes || 0);
            });

            if (hasExplicit) return explicitBal;
            const sold = getTruckSales(tUpper).reduce((s, sl) => s + Number(sl.boxes || 0), 0);
            return Math.max(0, totalInwardBoxes - sold);
          }

          // 3. Fallback: check purchasesList
          const suppPurchases = purchasesList.filter(p =>
            (p.supplier_name && p.supplier_name.toLowerCase() === suppLower) &&
            ((p.truck_number || '').trim().toUpperCase() === tUpper)
          );
          if (suppPurchases.length > 0) {
            let totalInward = 0;
            let hasExplicit = false;
            let explicitBal = 0;
            suppPurchases.forEach(p => {
              if (p.balance_box !== undefined && p.balance_box !== null) {
                hasExplicit = true;
                explicitBal += Math.max(0, Number(p.balance_box));
              }
              const itBoxes = (p.items || []).reduce((s, it) => s + Number(it.quantity_boxes || it.boxes || 0), 0);
              totalInward += itBoxes > 0 ? itBoxes : Number(p.boxes || 0);
            });
            if (hasExplicit) return explicitBal;
            const sold = getTruckSales(tUpper).reduce((s, sl) => s + Number(sl.boxes || 0), 0);
            return Math.max(0, totalInward - sold);
          }

          return 0;
        };

        const activeTrucks = truckNumbers.filter(tNum => getTruckBalance(tNum) > 0);
        const completedTrucks = truckNumbers.filter(tNum => getTruckBalance(tNum) === 0);

        // Filter by Status: ACTIVE (balance > 0) or COMPLETE (balance === 0)
        const statusFilteredTrucks = truckStatusFilter === 'COMPLETE'
          ? completedTrucks
          : activeTrucks;

        const displayedTrucks = statusFilteredTrucks;

        return (
          <div
            className="mandi-modal-backdrop centered-popup-backdrop"
            onClick={() => setIsSupplierDetailPopupOpen(false)}
          >
            <div
              className="mandi-modal-dialog centered-detail-popup"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Scrollable Body */}
              <div className="mandi-modal-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                {/* Supplier Hero Information */}
                <div className="supplier-hero-card" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--bg-main)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm supplier-popup-back-btn"
                    onClick={() => setIsSupplierDetailPopupOpen(false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      borderRadius: '8px',
                      flexShrink: 0
                    }}
                    title="Back"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    flexShrink: 0
                  }}>
                    {(activeSupp.supplier_name || 'S').charAt(0).toUpperCase()}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                        {activeSupp.supplier_name}
                      </div>
                      <button
                        type="button"
                        className="supplier-profile-edit-btn"
                        onClick={() => handleOpenEditPassbook(activeSupp)}
                        title="Edit Supplier Profile"
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          color: '#10b981',
                          borderRadius: '5px',
                          width: '20px',
                          height: '20px',
                          minWidth: '20px',
                          maxWidth: '20px',
                          minHeight: '20px',
                          maxHeight: '20px',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          alignSelf: 'center',
                          lineHeight: 1,
                          boxSizing: 'border-box'
                        }}
                      >
                        <Edit2 size={11} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {activeSupp.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={11} color="#10b981" />
                          {activeSupp.phone}
                        </span>
                      )}
                      <span className="badge badge-success" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                        Verified Supplier
                      </span>
                    </div>
                  </div>

                  {/* Toggle Arrow for Bank Passbook Section */}
                  <button
                    type="button"
                    onClick={() => setIsPassbookSectionOpen(prev => !prev)}
                    title={isPassbookSectionOpen ? 'Hide Bank Passbook' : 'Show Bank Passbook'}
                    style={{
                      background: isPassbookSectionOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      color: '#10b981',
                      borderRadius: '8px',
                      width: '30px',
                      height: '30px',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isPassbookSectionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Bank Passbook Card - Collapsible */}
                {isPassbookSectionOpen && (
                <div className="supplier-bank-card" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 95, 70, 0.05) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={18} color="#10b981" />
                      <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#10b981' }}>
                        Bank Passbook & Settlement Account
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm supplier-bank-copy-btn"
                      onClick={() => handleCopyPassbook(activeSupp)}
                      style={{ gap: '6px' }}
                    >
                      {copiedBankSupplierId === activeSupp.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      <span>{copiedBankSupplierId === activeSupp.id ? 'Passbook Copied!' : 'Copy Bank Details'}</span>
                    </button>
                  </div>

                  <div className="supplier-bank-grid" style={{ display: 'grid', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Bank Name</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem' }}>{activeSupp.bank_name || '—'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Account Number</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.5px', color: '#10b981', fontFamily: 'monospace' }}>
                        {activeSupp.account_number || '—'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>IFSC Code</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>{activeSupp.ifsc_code || '—'}</p>
                    </div>
                    <div className="supplier-bank-grid-full">
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Branch Name</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem' }}>{activeSupp.branch_name || '—'}</p>
                    </div>
                    {activeSupp.upi_id && (
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>UPI ID</span>
                        <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem', color: '#10b981' }}>{activeSupp.upi_id}</p>
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* Truck-wise Consignments & Customer Fruit Sales */}
                <div className="supplier-trucks-card" style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', background: 'var(--bg-input)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <FileText size={16} color="#10b981" />
                        <h5 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Truck-wise Order & Sales Details ({truckStatusFilter === 'ACTIVE' ? `${activeTrucks.length} Active` : `${completedTrucks.length} Complete`})
                        </h5>
                      </div>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        Har Truck No. se customer ko sell hue fruits (Bikri Parchi) aur Inward Consignments ka pura byora
                      </span>
                    </div>

                    {/* Status Filter Buttons: Active, Complete (All Trucks removed) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        background: 'var(--bg-main)',
                        padding: '3px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border-subtle)',
                        gap: '3px'
                      }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${truckStatusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => {
                            setTruckStatusFilter('ACTIVE');
                            setSelectedTruckFilter('ALL');
                          }}
                          style={{
                            padding: '5px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: truckStatusFilter === 'ACTIVE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                            color: truckStatusFilter === 'ACTIVE' ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: truckStatusFilter === 'ACTIVE' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          title="Trucks jinka balance 0 nahi hua hai (Stock remaining)"
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: truckStatusFilter === 'ACTIVE' ? '#ffffff' : '#10b981',
                            display: 'inline-block'
                          }}></span>
                          <span>Active ({activeTrucks.length})</span>
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${truckStatusFilter === 'COMPLETE' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => {
                            setTruckStatusFilter('COMPLETE');
                            setSelectedTruckFilter('ALL');
                          }}
                          style={{
                            padding: '5px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: truckStatusFilter === 'COMPLETE' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                            color: truckStatusFilter === 'COMPLETE' ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: truckStatusFilter === 'COMPLETE' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          title="Trucks jinka balance 0 ho gaya hai (Complete / Sold Out)"
                        >
                          <Check size={14} color={truckStatusFilter === 'COMPLETE' ? '#ffffff' : '#3b82f6'} />
                          <span>Complete ({completedTrucks.length})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {displayedTrucks.length === 0 ? (
                    <div style={{
                      padding: '36px 16px',
                      textAlign: 'center',
                      background: 'var(--bg-main)',
                      borderRadius: '12px',
                      border: '1px dashed var(--border-subtle)',
                      color: 'var(--text-secondary)'
                    }}>
                      {truckStatusFilter === 'ACTIVE' ? (
                        <>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                          <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                            Koi Active Truck nahi mila (Sabhi trucks ka balance 0 ho chuka hai)
                          </strong>
                          <p style={{ fontSize: '0.84rem', margin: '0 0 14px 0' }}>
                            Is vyapari ke sabhi trucks ka fruit sell ho chuka hai aur balance 0 ho gaya hai.
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setTruckStatusFilter('COMPLETE');
                              setSelectedTruckFilter('ALL');
                            }}
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none' }}
                          >
                            View Complete Trucks ({completedTrucks.length})
                          </button>
                        </>
                      ) : truckStatusFilter === 'COMPLETE' ? (
                        <>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                          <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                            Koi Complete Truck nahi mila (Abhi kisi truck ka balance 0 nahi hua hai)
                          </strong>
                          <p style={{ fontSize: '0.84rem', margin: '0 0 14px 0' }}>
                            Sabhi trucks me abhi stock balance bacha hua hai.
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setTruckStatusFilter('ACTIVE');
                              setSelectedTruckFilter('ALL');
                            }}
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
                          >
                            View Active Trucks ({activeTrucks.length})
                          </button>
                        </>
                      ) : (
                        <div>No consignments or fruit sales recorded for this vyapari yet.</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {displayedTrucks.map(tNum => {
                        const tSales = getTruckSales(tNum);
                        const totalSoldBoxes = tSales.reduce((sum, s) => sum + Number(s.boxes || 0), 0);
                        const totalSoldValue = tSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
                        const tBalance = getTruckBalance(tNum);
                        const isComplete = tBalance === 0;
                        const isExpanded = selectedTruckNumber === tNum;

                        // Produce Name and Inward Boxes for tNum
                        const tOrders = (ordersByTruck && ordersByTruck[tNum]) || [];
                        let tInwardBoxes = 0;
                        tOrders.forEach(po => {
                          const itBoxes = (po.items || []).reduce((s, it) => s + Number(it.quantity_boxes || it.boxes || 0), 0);
                          tInwardBoxes += itBoxes > 0 ? itBoxes : Number(po.boxes || 0);
                        });
                        if (tInwardBoxes === 0 && purchasesList.length > 0) {
                          const pList = purchasesList.filter(p => ((p.truck_number || '').trim().toUpperCase() === tNum));
                          pList.forEach(p => {
                            const itBoxes = (p.items || []).reduce((s, it) => s + Number(it.quantity_boxes || it.boxes || 0), 0);
                            tInwardBoxes += itBoxes > 0 ? itBoxes : Number(p.boxes || 0);
                          });
                        }
                        if (tInwardBoxes === 0) {
                          tInwardBoxes = totalSoldBoxes + tBalance;
                        }

                        const tProduce = tSales[0]?.product_name ||
                          (tOrders[0]?.items && tOrders[0]?.items[0]?.product_name) ||
                          tOrders[0]?.produce_name ||
                          activeSupp.produce_category ||
                          'Fresh Produce';

                        // Settlement for tNum
                        const curSettlement = truckSettlements[tNum] || {};
                        const commPct = Number(curSettlement.commissionPercent !== undefined && curSettlement.commissionPercent !== null && curSettlement.commissionPercent !== '' ? curSettlement.commissionPercent : 0);
                        const fareAmount = Number(curSettlement.truckFare || 0);
                        const kuliAmount = Number(curSettlement.kuli || 0);
                        const cashAmount = Number(curSettlement.cash || 0);
                        const commAmount = Math.round((totalSoldValue * commPct) / 100);
                        const totalDeductions = commAmount + fareAmount + kuliAmount + cashAmount;
                        const invoiceTotal = Math.max(0, totalSoldValue - totalDeductions);
                        const grossMargin = commAmount;
                        const isSettled = (cashSaleSettlements || []).some(
                          r => r.truck_no === tNum && (r.supplier_name || '').trim().toLowerCase() === (activeSupp?.supplier_name || '').trim().toLowerCase()
                        );

                        return (
                          <div
                            key={tNum}
                            style={{
                              border: isExpanded
                                ? (isComplete ? '2px solid #3b82f6' : '2px solid #10b981')
                                : '1.5px solid rgba(59, 130, 246, 0.25)',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              background: 'var(--bg-surface)',
                              boxShadow: isExpanded
                                ? (isComplete ? '0 6px 20px rgba(59, 130, 246, 0.16)' : '0 6px 20px rgba(16, 185, 129, 0.16)')
                                : '0 2px 8px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {/* Horizontal Profile Card matching User Image */}
                            <div
                              onClick={() => setSelectedTruckNumber(prev => prev === tNum ? null : tNum)}
                              style={{
                                background: isExpanded
                                  ? (isComplete ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)' : 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.06) 100%)')
                                  : (isComplete ? 'rgba(239, 246, 255, 0.85)' : 'rgba(240, 253, 244, 0.85)'),
                                padding: '12px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px',
                                cursor: 'pointer',
                                borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                                userSelect: 'none',
                                transition: 'background 0.2s ease'
                              }}
                              title="Click to view/hide customer sales and details"
                            >
                              {/* Left side: Icon, Status Tag, Truck Number */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '12px',
                                  background: isComplete ? '#dbeafe' : '#d1fae5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isComplete ? '#2563eb' : '#059669',
                                  flexShrink: 0
                                }}>
                                  <Truck size={22} />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                    <span style={{
                                      fontSize: '0.72rem',
                                      color: 'var(--text-secondary)',
                                      textTransform: 'uppercase',
                                      fontWeight: 800,
                                      letterSpacing: '0.04em'
                                    }}>
                                      SELECTED TRUCK DETAILS
                                    </span>
                                    {isComplete ? (
                                      <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        background: '#dbeafe',
                                        color: '#1d4ed8',
                                        padding: '2px 9px',
                                        borderRadius: '12px'
                                      }}>
                                        Complete (0 Balance)
                                      </span>
                                    ) : (
                                      <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        background: '#d1fae5',
                                        color: '#047857',
                                        padding: '2px 9px',
                                        borderRadius: '12px'
                                      }}>
                                        Active ({tBalance} BX Left)
                                      </span>
                                    )}
                                  </div>
                                  <strong style={{
                                    fontFamily: 'monospace',
                                    fontSize: '1.25rem',
                                    color: 'var(--text-main)',
                                    fontWeight: 800,
                                    letterSpacing: '0.04em',
                                    display: 'block'
                                  }}>
                                    {tNum}
                                  </strong>
                                </div>
                              </div>

                              {/* Right side: 4 Pill Boxes + Chevron */}
                              <div className="supplier-truck-pills-wrap" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="supplier-truck-pill" style={{
                                  textAlign: 'center',
                                  padding: '5px 14px',
                                  background: 'var(--bg-main)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border-subtle)',
                                  minWidth: '70px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700, letterSpacing: '0.03em' }}>
                                    INWARD
                                  </span>
                                  <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>
                                    {tInwardBoxes} BX
                                  </strong>
                                </div>

                                <div className="supplier-truck-pill" style={{
                                  textAlign: 'center',
                                  padding: '5px 14px',
                                  background: 'var(--bg-main)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border-subtle)',
                                  minWidth: '70px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700, letterSpacing: '0.03em' }}>
                                    SOLD OUT
                                  </span>
                                  <strong style={{ fontSize: '0.94rem', color: '#2563eb' }}>
                                    {totalSoldBoxes} BX
                                  </strong>
                                </div>

                                <div className="supplier-truck-pill" style={{
                                  textAlign: 'center',
                                  padding: '5px 14px',
                                  background: 'var(--bg-main)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border-subtle)',
                                  minWidth: '70px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700, letterSpacing: '0.03em' }}>
                                    BALANCE
                                  </span>
                                  <strong style={{ fontSize: '0.94rem', color: isComplete ? '#10b981' : '#f59e0b' }}>
                                    {tBalance} BX
                                  </strong>
                                </div>

                                <div className="supplier-truck-pill" style={{
                                  textAlign: 'center',
                                  padding: '5px 14px',
                                  background: '#dcfce7',
                                  borderRadius: '10px',
                                  border: '1px solid #86efac',
                                  minWidth: '95px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#059669', display: 'block', fontWeight: 800, letterSpacing: '0.03em' }}>
                                    TOTAL BIKRI
                                  </span>
                                  <strong style={{ fontSize: '0.96rem', color: '#059669', fontWeight: 900 }}>
                                    ₹{totalSoldValue.toLocaleString()}
                                  </strong>
                                </div>

                                <div style={{
                                  marginLeft: '4px',
                                  color: isExpanded ? (isComplete ? '#2563eb' : '#059669') : 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                              </div>
                            </div>

                            {/* Details Expanded Section when Clicked */}
                            {isExpanded && (
                              <div>
                                {/* Customer Fruit Sales (Bikri Parchi) Table */}
                                <div style={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                      <ShoppingCart size={16} color="#3b82f6" />
                                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                        Fruits Sold to Customers from Truck {tNum}
                                      </span>
                                    </div>
                                    {totalSoldBoxes > 0 && (
                                      <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                                        ✓ {totalSoldBoxes} Boxes sold • ₹{totalSoldValue.toLocaleString()} Gross Bikri
                                      </span>
                                    )}
                                  </div>

                                  {tSales.length === 0 ? (
                                    <div style={{
                                      padding: '20px',
                                      textAlign: 'center',
                                      background: 'rgba(0,0,0,0.02)',
                                      borderRadius: '8px',
                                      border: '1px dashed var(--border-subtle)',
                                      fontSize: '0.84rem',
                                      color: 'var(--text-secondary)'
                                    }}>
                                      Is truck ({tNum}) se abhi tak koi customer fruit sale nahi hui hai.
                                    </div>
                                  ) : (
                                    <div className="erp-table-wrapper" style={{ margin: 0, border: '1px solid var(--border-subtle)', borderRadius: '8px', overflowX: 'auto' }}>
                                      <table className="erp-table" style={{ width: '100%', minWidth: '550px' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ width: '110px' }}>Selling Date</th>
                                            <th>Customer Name</th>
                                            <th>Fruit / Produce</th>
                                            <th style={{ width: '170px' }}>Box with Per Box Rate</th>
                                            <th style={{ width: '130px', textAlign: 'right' }}>Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {tSales.map(sale => (
                                            <tr key={sale.id}>
                                              <td>
                                                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                                                  {formatDisplayDate(sale.selling_date)}
                                                </span>
                                              </td>
                                              <td>
                                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                  {sale.customer_name}
                                                </div>
                                                {sale.customer_phone && (
                                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                    📞 {sale.customer_phone}
                                                  </span>
                                                )}
                                              </td>
                                              <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                {sale.product_name || tProduce}
                                              </td>
                                              <td>
                                                <span style={{ fontWeight: 800, color: '#3b82f6' }}>
                                                  {sale.boxes} BX
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '6px' }}>
                                                  @ ₹{Number(sale.rate_per_box).toLocaleString()} / BX
                                                </span>
                                              </td>
                                              <td style={{ textAlign: 'right' }}>
                                                <strong style={{ color: '#10b981', fontSize: '0.94rem' }}>
                                                  ₹{Number(sale.total).toLocaleString()}
                                                </strong>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr style={{ background: 'rgba(16, 185, 129, 0.06)', fontWeight: 800 }}>
                                            <td colSpan={3} style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                              Total Sold from {tNum}:
                                            </td>
                                            <td style={{ color: '#3b82f6', fontWeight: 800 }}>
                                              {totalSoldBoxes} Boxes
                                            </td>
                                            <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 900, fontSize: '0.96rem' }}>
                                              ₹{totalSoldValue.toLocaleString()}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  )}
                                </div>

                                {/* Real-time Gross Margin & Vyapari Invoice Settlement (For Complete Truck) */}
                                {isComplete && (
                                  <div
                                    className="truck-settlement-card"
                                    style={{
                                      margin: '0 16px 16px 16px',
                                      padding: '18px 20px',
                                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                      border: '1.5px solid rgba(59, 130, 246, 0.28)',
                                      borderRadius: '12px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '16px'
                                    }}
                                  >
                                    {/* Section Top Header & Actions */}
                                    <div
                                      className="truck-settlement-header"
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '10px'
                                      }}
                                    >
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                          <div style={{
                                            width: '28px',
                                            height: '28px',
                                            minWidth: '28px',
                                            borderRadius: '6px',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}>
                                            <Calculator size={16} />
                                          </div>
                                          <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)', letterSpacing: '0.02em', lineHeight: '1.3' }}>
                                             Vyapari Invoice Settlement
                                          </strong>
                                          <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontWeight: 800 }}>
                                            Live Calculation
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: '1.4' }}>
                                          Total Sold me se Commission (%), Truck Fare aur Kuli minus hokar Net Invoice Total aur Gross Margin calculate hota hai.
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="truck-settlement-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <button
                                          type="button"
                                          className="btn btn-sm truck-settlement-btn"
                                          onClick={() => handleSaveSettlementAndOpenSidebar(
                                            activeSupp, tNum, invoiceTotal,
                                            totalSoldValue, commAmount, fareAmount, kuliAmount, cashAmount,
                                            tProduce, totalSoldBoxes
                                          )}
                                          style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            background: isSettled ? '#059669' : 'transparent',
                                            color: isSettled ? '#ffffff' : 'var(--text-main)',
                                            border: isSettled ? '1.5px solid #047857' : '1.5px solid var(--border-subtle)',
                                            boxShadow: isSettled ? '0 2px 8px rgba(5, 150, 105, 0.28)' : 'none',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <Check size={14} />
                                          <span>{isSettled ? 'Settlement Saved ✓' : 'Save Settlement'}</span>
                                        </button>

                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary truck-settlement-btn"
                                          onClick={() => {
                                            handleDownloadTruckInvoicePDF(
                                              activeSupp,
                                              tNum,
                                              tProduce,
                                              tSales,
                                              totalSoldBoxes,
                                              totalSoldValue,
                                              curSettlement,
                                              commAmount,
                                              fareAmount,
                                              kuliAmount,
                                              invoiceTotal,
                                              cashAmount
                                            );
                                          }}
                                          title="Download Vyapari Settlement Bill (PDF)"
                                          style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                            border: 'none',
                                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.28)'
                                          }}
                                        >
                                          <Download size={14} />
                                          <span>Download Bill</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Live Inputs Grid */}
                                    <div
                                      className="truck-settlement-inputs"
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                        gap: '12px',
                                        background: 'var(--bg-main)',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-subtle)'
                                      }}
                                    >
                                      {/* 1. Commission Input */}
                                      <div style={{ minWidth: 0, width: '100%' }}>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                          Commission (%)
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            placeholder="0"
                                            value={curSettlement.commissionPercent ? curSettlement.commissionPercent : ''}
                                            onChange={(e) => updateTruckSettlement(tNum, 'commissionPercent', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="form-control"
                                            style={{
                                              width: '100%',
                                              maxWidth: '100%',
                                              boxSizing: 'border-box',
                                              fontWeight: 800,
                                              fontSize: '0.95rem',
                                              paddingRight: '24px',
                                              paddingLeft: '8px',
                                              background: 'var(--bg-surface)'
                                            }}
                                          />
                                          <span style={{ position: 'absolute', right: '8px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.85rem', pointerEvents: 'none' }}>
                                            %
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, marginTop: '4px', lineHeight: '1.2' }}>
                                          = ₹{commAmount.toLocaleString()} ({commPct}%)
                                        </div>
                                      </div>

                                      {/* 2. Truck Fare Input */}
                                      <div style={{ minWidth: 0, width: '100%' }}>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                          Truck Fare (₹)
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                                          <span style={{ position: 'absolute', left: '8px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.85rem', pointerEvents: 'none' }}>
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            placeholder="0"
                                            value={curSettlement.truckFare ? curSettlement.truckFare : ''}
                                            onChange={(e) => updateTruckSettlement(tNum, 'truckFare', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="form-control"
                                            style={{
                                              width: '100%',
                                              maxWidth: '100%',
                                              boxSizing: 'border-box',
                                              fontWeight: 800,
                                              fontSize: '0.95rem',
                                              paddingLeft: '22px',
                                              paddingRight: '6px',
                                              background: 'var(--bg-surface)'
                                            }}
                                          />
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.2' }}>
                                          Vyapari se deduct
                                        </div>
                                      </div>

                                      {/* 3. Kuli / Hamali Input */}
                                      <div style={{ minWidth: 0, width: '100%' }}>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                          Kuli / Hamali (₹)
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                                          <span style={{ position: 'absolute', left: '8px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.85rem', pointerEvents: 'none' }}>
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            placeholder="0"
                                            value={curSettlement.kuli ? curSettlement.kuli : ''}
                                            onChange={(e) => updateTruckSettlement(tNum, 'kuli', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="form-control"
                                            style={{
                                              width: '100%',
                                              maxWidth: '100%',
                                              boxSizing: 'border-box',
                                              fontWeight: 800,
                                              fontSize: '0.95rem',
                                              paddingLeft: '22px',
                                              paddingRight: '6px',
                                              background: 'var(--bg-surface)'
                                            }}
                                          />
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.2' }}>
                                          Mandi labor charge
                                        </div>
                                      </div>

                                      {/* 4. Other Input */}
                                      <div style={{ minWidth: 0, width: '100%' }}>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                          Other (₹)
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                                          <span style={{ position: 'absolute', left: '8px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.85rem', pointerEvents: 'none' }}>
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            placeholder="0"
                                            value={curSettlement.cash ? curSettlement.cash : ''}
                                            onChange={(e) => updateTruckSettlement(tNum, 'cash', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="form-control"
                                            style={{
                                              width: '100%',
                                              maxWidth: '100%',
                                              boxSizing: 'border-box',
                                              fontWeight: 800,
                                              fontSize: '0.95rem',
                                              paddingLeft: '22px',
                                              paddingRight: '6px',
                                              background: 'var(--bg-surface)'
                                            }}
                                          />
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.2' }}>
                                          Vyapari se deduct
                                        </div>
                                      </div>
                                    </div>

                                    {/* Mandi Parchi Settlement Formula Strip */}
                                    <div
                                      className="truck-settlement-formula"
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'var(--bg-main)',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-subtle)',
                                        fontSize: '0.76rem',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Calculation Summary:</span>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                                          Total Sold (₹{totalSoldValue.toLocaleString()}) - Commission (₹{commAmount.toLocaleString()}) - TF (₹{fareAmount.toLocaleString()}) - Kuli (₹{kuliAmount.toLocaleString()}){cashAmount > 0 ? ` - Other (₹${cashAmount.toLocaleString()})` : ''}
                                        </span>
                                      </div>
                                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                                        = Total Amount: ₹{invoiceTotal.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL 8: Edit Supplier Bank Passbook Details Modal
          ========================================================================= */}
      {isEditPassbookOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsEditPassbookOpen(false)} style={{ zIndex: 10060 }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mandi-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={17} color="#10b981" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Edit Supplier Profile & Passbook
                </h4>
                <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <ShieldCheck size={11} /> Authenticated • MySQL Live
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsEditPassbookOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mandi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Supplier / Vyapari Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Kashmir Apple Growers"
                  value={passbookForm.supplier_name}
                  onChange={(e) => setPassbookForm({ ...passbookForm, supplier_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={passbookForm.phone}
                    onChange={(e) => setPassbookForm({ ...passbookForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{
                padding: '12px 14px',
                background: 'var(--bg-input)',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '4px'
              }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bank Passbook & Settlement Account
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Bank Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. State Bank of India, HDFC Bank, J&K Bank..."
                    value={passbookForm.bank_name}
                    onChange={(e) => setPassbookForm({ ...passbookForm, bank_name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Bank Account Number (A/C No.) *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 700 }}
                    placeholder="e.g. 389201004523"
                    value={passbookForm.account_number}
                    onChange={(e) => setPassbookForm({ ...passbookForm, account_number: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>IFSC Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}
                      placeholder="e.g. SBIN0001234"
                      value={passbookForm.ifsc_code}
                      onChange={(e) => setPassbookForm({ ...passbookForm, ifsc_code: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>Branch Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Azadpur Mandi Branch"
                      value={passbookForm.branch_name}
                      onChange={(e) => setPassbookForm({ ...passbookForm, branch_name: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mandi-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditPassbookOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSavingPassbook}
                onClick={handleSavePassbook}
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                {isSavingPassbook ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 9: Add New Supplier Profile Modal
          ========================================================================= */}
      {isAddSupplierModalOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsAddSupplierModalOpen(false)} style={{ zIndex: 10060 }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveNewSupplierModal}>
              <div className="mandi-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={17} color="#10b981" />
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Add New Supplier Profile & Passbook
                  </h4>
                  <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <ShieldCheck size={11} /> Authenticated • MySQL Live
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mandi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Supplier / Vyapari Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Kashmir Apple Growers"
                    value={newSupplierModalForm.supplier_name}
                    onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, supplier_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={newSupplierModalForm.phone}
                    onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, phone: e.target.value })}
                  />
                </div>


                <div style={{
                  padding: '12px 14px',
                  background: 'var(--bg-input)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Bank Passbook Details
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. State Bank of India"
                      value={newSupplierModalForm.bank_name}
                      onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, bank_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontFamily: 'monospace', fontWeight: 700 }}
                      placeholder="e.g. 389201004523"
                      value={newSupplierModalForm.account_number}
                      onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, account_number: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>IFSC Code</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}
                        placeholder="e.g. SBIN0001234"
                        value={newSupplierModalForm.ifsc_code}
                        onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, ifsc_code: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Branch Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Mandi Branch"
                        value={newSupplierModalForm.branch_name}
                        onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, branch_name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mandi-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingSupplierModal}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  {isSavingSupplierModal ? 'Saving...' : 'Save & Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
