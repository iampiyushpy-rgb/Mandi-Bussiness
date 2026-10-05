import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';

export default function ExcelImportModal({ isOpen, onClose, onImportSuccess, showToast }) {
  const [parsedData, setParsedData] = useState([]);
  const [rowValidation, setRowValidation] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);

  if (!isOpen) return null;

  const validateRows = (rawRows) => {
    const validated = rawRows.map((r, i) => {
      const sup = (r.Supplier || r.supplier || '').toString().trim();
      const fruit = (r.Fruit || r.fruit || '').toString().trim();
      const variety = (r.Variety || r.variety || 'Standard').toString().trim();
      const truck = (r.Truck || r.truck || '').toString().trim().toUpperCase();
      const boxes = Number(r.Boxes || r.boxes || 0);
      const netWeight = Number(r.NetWeight || r.net_weight || 0);
      const rate = Number(r.PurchaseRate || r.purchase_rate || 0);

      const errors = [];
      if (!sup) errors.push('Missing Supplier');
      if (!fruit) errors.push('Missing Fruit');
      if (boxes <= 0) errors.push('Boxes must be > 0');
      if (rate <= 0) errors.push('Rate must be > 0');

      return {
        original: r,
        clean: {
          Supplier: sup,
          Truck: truck,
          Fruit: fruit,
          Variety: variety,
          Boxes: boxes,
          NetWeight: netWeight,
          PurchaseRate: rate
        },
        isValid: errors.length === 0,
        errors
      };
    });

    setRowValidation(validated);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setServerErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setParsedData(data);
        validateRows(data);
      } catch (err) {
        if (showToast) showToast('Failed to parse file: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadSampleTemplate = () => {
    const sample = [
      { Supplier: 'Kashmir Orchards Co', Truck: 'JK02AB1234', Fruit: 'Apple', Variety: 'Royal Gala', Boxes: 100, NetWeight: 1850, PurchaseRate: 110 },
      { Supplier: 'Nagpur Citrus Farm', Truck: 'MH31CD5678', Fruit: 'Orange', Variety: 'Nagpur Santra', Boxes: 80, NetWeight: 1200, PurchaseRate: 75 },
      { Supplier: 'California Dry Fruits Exim', Truck: 'DL12EF9012', Fruit: 'Almond', Variety: 'California Almond', Boxes: 50, NetWeight: 500, PurchaseRate: 810 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PurchaseImportTemplate');
    XLSX.writeFile(wb, 'Fruit_ERP_Purchase_Import_Template.xlsx');
  };

  const handleConfirmImport = async () => {
    const validRows = rowValidation.filter(r => r.isValid).map(r => r.clean);
    if (validRows.length === 0) {
      if (showToast) showToast('No valid rows to import.', 'error');
      return;
    }

    setIsProcessing(true);
    setServerErrors([]);
    try {
      const response = await api.post('/purchases/import_excel/', { rows: validRows });
      if (response && response.success > 0) {
        if (showToast) {
          showToast(`✓ Successfully imported ${response.success} purchase orders with real inventory lots!`, 'success');
        }
        if (onImportSuccess) onImportSuccess();
        onClose();
      } else {
        throw new Error('Import failed to create orders.');
      }
    } catch (err) {
      if (showToast) showToast('Error importing Excel: ' + err.message, 'error');
      setServerErrors([err.message]);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = rowValidation.filter(r => r.isValid).length;
  const invalidCount = rowValidation.filter(r => !r.isValid).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileSpreadsheet size={20} color="#10b981" />
            <span>Excel Bulk Purchase Import & Inventory Sync</span>
          </div>
          <button
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Action Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: 0 }}>
              Upload your supplier delivery Excel sheet (.xlsx, .csv) with columns: Supplier, Truck, Fruit, Variety, Boxes, NetWeight, PurchaseRate
            </p>
            <button className="btn btn-secondary btn-sm" onClick={downloadSampleTemplate}>
              <Download size={14} />
              <span>Download Excel Template</span>
            </button>
          </div>

          {/* Upload Drop Area */}
          <div style={{
            border: '2px dashed var(--border-light)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            background: 'var(--bg-main)',
            cursor: 'pointer',
            marginBottom: '16px'
          }}>
            <Upload size={30} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700, margin: 0 }}>
              {fileName ? fileName : 'Choose or Drag Excel File to Upload'}
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Standard Mandi Manifest format supported (.xlsx, .xls, .csv)
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ marginTop: '10px' }}
              onChange={handleFileUpload}
            />
          </div>

          {/* Server Errors Alert */}
          {serverErrors.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              fontSize: '0.84rem',
              color: '#ef4444'
            }}>
              <strong>Import Errors:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {serverErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {rowValidation.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Preview: {validCount} Valid Row{validCount !== 1 ? 's' : ''} {invalidCount > 0 && `(${invalidCount} Invalid)`}
                </span>
                <span className={`badge ${invalidCount === 0 ? 'badge-success' : 'badge-warning'}`}>
                  {invalidCount === 0 ? 'All Rows Valid' : `${invalidCount} Needs Attention`}
                </span>
              </div>

              <div className="erp-table-wrapper" style={{ maxHeight: '220px' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Supplier</th>
                      <th>Truck</th>
                      <th>Fruit</th>
                      <th>Variety</th>
                      <th>Boxes</th>
                      <th>Net Wt (KG)</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowValidation.map((row, idx) => (
                      <tr key={idx} style={{ opacity: row.isValid ? 1 : 0.65 }}>
                        <td>
                          {row.isValid ? (
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>✓ OK</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }} title={row.errors.join(', ')}>
                              ⚠️ {row.errors[0]}
                            </span>
                          )}
                        </td>
                        <td>{row.clean.Supplier || '-'}</td>
                        <td>{row.clean.Truck || '-'}</td>
                        <td><strong>{row.clean.Fruit || '-'}</strong></td>
                        <td>{row.clean.Variety || 'Standard'}</td>
                        <td>{row.clean.Boxes}</td>
                        <td>{row.clean.NetWeight}</td>
                        <td>₹{row.clean.PurchaseRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={validCount === 0 || isProcessing}
            onClick={handleConfirmImport}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Ingesting to MySQL...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Confirm Import ({validCount} Rows)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
