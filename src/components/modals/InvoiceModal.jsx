import React from 'react';
import { Printer, Download, CheckCircle, Apple, ShieldCheck } from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils';

export default function InvoiceModal({ isOpen, onClose, salesOrder }) {
  if (!isOpen || !salesOrder) return null;

  const so = salesOrder;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ background: '#f8fafc' }}>
        <div className="modal-header" style={{ background: '#0f172a' }}>
          <div className="modal-title" style={{ color: '#fff' }}>
            <Printer size={18} color="#38bdf8" />
            <span>Tax Invoice — {so.sales_order_no}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={14} />
              <span>Print Invoice</span>
            </button>
            <button
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: 'clamp(12px, 3vw, 32px)' }}>
          {/* Printable Invoice Paper */}
          <div className="invoice-container">
            {/* Header */}
            <div className="invoice-header">
              <div className="invoice-title-block">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', background: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Apple size={22} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>AZIZ INTERNATIONAL TRADING CO.</h2>
                </div>
                <p style={{ margin: '2px 0', fontSize: '0.82rem', color: '#475569' }}>
                  Central Cold Hub, Shed 14, Azadpur Mandi, Delhi - 110033
                </p>
                <p style={{ margin: '2px 0', fontSize: '0.82rem', color: '#475569' }}>
                  GSTIN: 07AABCF1234F1Z8 • Mandi License: APMC/AZD/2026/894
                </p>
              </div>

              <div className="invoice-meta">
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>TAX INVOICE</div>
                <div style={{ fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                  Invoice No: INV-{so.sales_order_no?.replace('SO-', '')}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '2px' }}>
                  Date: {formatDisplayDate(so.order_date)}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  Truck No: {so.truck_number || 'WB24CD5678'}
                </div>
              </div>
            </div>

            {/* Bill To & Dispatch */}
            <div className="invoice-parties-grid">
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Billed To (Customer):
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {so.customer_name}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '2px' }}>
                  Wholesale Mandi Buyer • Destination: Kolkata / Delhi NCR
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  Terms: {so.payment_terms || 'Credit (7 Days)'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Dispatch Details:
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  Dispatched from: {so.warehouse_name || 'Central Cold Hub Azadpur'}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '2px' }}>
                  Time Slot: {so.time_slot || '11:00 AM - 12:00 PM'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                  Status: {so.status} • Quality Verified
                </div>
              </div>
            </div>

            {/* Items Table with horizontal scroll */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '18px 0' }}>
              <table className="invoice-table" style={{ minWidth: '550px' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produce Item & Variety</th>
                    <th>Batch / Lot</th>
                    <th>Boxes</th>
                    <th>Net Weight (KG)</th>
                    <th>Selling Rate (₹/KG)</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(so.items || [
                    { product_name: 'Apple', variety_name: 'Royal Gala', batch_number: 'BAT-APPLE-20260916-001', quantity_boxes: 40, net_weight: 740, selling_rate: 135, line_total: 99400 },
                    { product_name: 'Orange', variety_name: 'Nagpur Santra', batch_number: 'BAT-ORANG-20260916-002', quantity_boxes: 20, net_weight: 300, selling_rate: 95, line_total: 28000 }
                  ]).map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 700 }}>{item.product_name} - {item.variety_name}</td>
                      <td style={{ fontFamily: 'monospace', color: '#047857' }}>{item.batch_number || 'BAT-LOT-01'}</td>
                      <td style={{ fontWeight: 700 }}>{item.quantity_boxes} Bx</td>
                      <td style={{ fontWeight: 700 }}>{Number(item.net_weight).toLocaleString()} KG</td>
                      <td>₹{Number(item.selling_rate).toFixed(2)}</td>
                      <td style={{ fontWeight: 800, textAlign: 'right' }}>
                        ₹{Number(item.line_total || (item.net_weight * item.selling_rate)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Produce Subtotal:</span>
                  <strong style={{ color: '#0f172a' }}>₹{Number(so.subtotal).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Transport Freight:</span>
                  <span>+₹{Number(so.transport_charge || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Loading Charges:</span>
                  <span>+₹{Number(so.loading_charge || 0).toLocaleString()}</span>
                </div>
                {Number(so.discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                    <span>Trade Discount:</span>
                    <span>-₹{Number(so.discount).toLocaleString()}</span>
                  </div>
                )}
                <div style={{ height: '1px', background: '#cbd5e1', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  <span>Grand Total:</span>
                  <span style={{ color: '#059669' }}>₹{Number(so.grand_total).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', fontSize: '0.82rem', color: '#64748b', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <p>Receiver's Signature & Stamp</p>
                <div style={{ marginTop: '30px', borderBottom: '1px solid #94a3b8', width: '180px' }}></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p>For AZIZ INTERNATIONAL TRADING CO.</p>
                <div style={{ marginTop: '30px', borderBottom: '1px solid #94a3b8', width: '180px' }}></div>
                <span style={{ fontSize: '0.74rem' }}>Authorized Dispatch In-Charge</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
