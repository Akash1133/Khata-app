'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PartyStore, TransactionStore } from '../lib/store';
import Button from '../components/Button';
import Input from '../components/Input';

const numberToWords = (num) => {
  if (!num || isNaN(num) || num <= 0) return '';
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'overflow';
    let str = '';
    n = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
  };

  const [intPart, decPart] = num.toString().split('.');
  let res = inWords(parseInt(intPart));
  if (!res) return '';
  res += ' Rupees';
  if (decPart && parseInt(decPart) > 0) {
     const decStr = inWords(parseInt(decPart.padEnd(2, '0').substring(0, 2)));
     if (decStr) res += ' and ' + decStr + ' Paise';
  }
  return res;
};

export default function PurchasePage() {
  const router = useRouter();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successData, setSuccessData] = useState(null);

  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [itemsDesc, setItemsDesc] = useState('');
  const [purchaseNote, setPurchaseNote] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('full_paid');
  const [amountPaid, setAmountPaid] = useState('');

  const normalizeDecimalInput = (v, decimals = 2) => {
    if (v === '') return '';
    if (v.startsWith('.')) return `0${v}`;
    if (v.includes('.')) {
      const [intPart, fracPart] = v.split('.');
      const cleanInt = intPart.replace(/^0+(?=\d)/, '') || '0';
      return `${cleanInt}.${(fracPart ?? '').slice(0, decimals)}`;
    }
    return v.replace(/^0+(?=\d)/, '');
  };

  useEffect(() => {
    PartyStore.getAll().then(setParties);
    const now = new Date();
    setPurchaseDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  }, []);

  const supplierOptions = parties.filter(p => p.type === 'supplier');

  const handleSave = async () => {
    const totalAmount = Number(purchaseAmount) || 0;
    if (totalAmount <= 0) {
      setErrors({ submit: 'Please enter a valid amount.' });
      return;
    }
    if (!selectedSupplier && !newSupplierName.trim()) {
      setErrors({ submit: 'Please select or enter a supplier.' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const computedAmountPaid = paymentStatus === 'full_paid'
        ? totalAmount
        : paymentStatus === 'full_udhaar'
        ? 0
        : Number(amountPaid || 0);

      const noteParts = [];
      if (invoiceNumber.trim()) noteParts.push(`Invoice: ${invoiceNumber.trim()}`);
      if (itemsDesc.trim()) noteParts.push(`Items: ${itemsDesc.trim()}`);
      if (purchaseNote.trim()) noteParts.push(purchaseNote.trim());

      const result = await TransactionStore.add({
        type: 'purchase',
        amount: totalAmount,
        date: `${purchaseDate}T12:00:00`,
        note: noteParts.join(' | ') || 'Supplier Purchase',
        partyId: selectedSupplier || null,
        newPartyName: (!selectedSupplier && newSupplierName.trim()) ? newSupplierName.trim() : null,
        newPartyType: 'supplier',
        amountPaid: computedAmountPaid,
        items: [],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save purchase.');
      }

      const supplierName = selectedSupplier
        ? (parties.find(p => p.id === selectedSupplier)?.name || 'Supplier')
        : (newSupplierName.trim() || 'Walk-in Supplier');

      setSuccessData({
        supplierName,
        totalAmount,
        amountPaid: computedAmountPaid,
        dueAmount: Math.max(0, Math.round((totalAmount - computedAmountPaid) * 100) / 100),
        purchaseDate,
        invoiceNumber: invoiceNumber.trim(),
        purchaseNote: purchaseNote.trim(),
        itemsDesc: itemsDesc.trim(),
      });
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to record purchase.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setSelectedSupplier('');
    setNewSupplierName('');
    setPurchaseAmount('');
    setInvoiceNumber('');
    setItemsDesc('');
    setPurchaseNote('');
    setPaymentStatus('full_paid');
    setAmountPaid('');
    const now = new Date();
    setPurchaseDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  };

  // === SUCCESS SCREEN ===
  if (successData) {
    return (
      <div className="success-screen">
        <div className="success-content">
          <div className="success-icon">✅</div>
          <h2>Purchase Saved!</h2>
          <div className="success-card">
            <p className="success-supplier">{successData.supplierName}</p>
            <p className="success-amt">₹{successData.totalAmount.toFixed(2)}</p>
            {successData.itemsDesc && <p className="success-desc">{successData.itemsDesc}</p>}
            <div className="success-grid">
              <div><span>Paid</span><strong>₹{successData.amountPaid.toFixed(2)}</strong></div>
              <div><span>Due</span><strong className={successData.dueAmount > 0 ? 'red' : ''}>₹{successData.dueAmount.toFixed(2)}</strong></div>
              <div><span>Date</span><strong>{new Date(`${successData.purchaseDate}T00:00:00`).toLocaleDateString('en-IN')}</strong></div>
              <div><span>Invoice</span><strong>{successData.invoiceNumber || 'N/A'}</strong></div>
            </div>
            {successData.purchaseNote && <p className="success-note">{successData.purchaseNote}</p>}
          </div>
          <Button onClick={resetForm} fullWidth size="lg">
            Add Another Purchase
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')} fullWidth style={{ marginTop: 12 }}>
            Back to Home
          </Button>
        </div>
        <style jsx>{`
          .success-screen { min-height: 100dvh; background: var(--bg-primary); display: flex; align-items: center; justify-content: center; }
          .success-content { text-align: center; animation: bounceIn 0.6s ease-out; max-width: 420px; width: 100%; padding: 24px; }
          .success-icon { font-size: 64px; margin-bottom: 16px; }
          h2 { font-size: 22px; color: var(--text-primary); margin-bottom: 8px; }
          .success-card { background: var(--bg-surface-solid); border-radius: 18px; padding: 20px; border: 1px solid var(--border-color); text-align: left; margin: 20px 0; }
          .success-supplier { font-size: 14px; color: var(--text-secondary); margin-bottom: 6px; }
          .success-amt { font-size: 30px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
          .success-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
          .success-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .success-grid div { padding: 10px 12px; border-radius: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); }
          .success-grid span { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
          .success-grid strong { font-size: 13px; color: var(--text-primary); }
          .success-grid strong.red { color: var(--color-danger); }
          .success-note { margin-top: 14px; font-size: 13px; color: var(--text-secondary); }
          @keyframes bounceIn { 0%{transform:scale(.3);opacity:0} 50%{transform:scale(1.05)} 70%{transform:scale(.9)} 100%{transform:scale(1);opacity:1} }
        `}</style>
      </div>
    );
  }

  return (
    <div className="purchase-page">
      <div className="purchase-content">
        <div className="purchase-header">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="page-title">Buy Stock</h1>
          <div style={{ width: 40 }} />
        </div>

        <div className="helper-banner">
          <p className="helper-title">📋 Record Purchase Bill</p>
          <p className="helper-sub">Add supplier, invoice, payment mode and purchase amount so your khata stays in sync.</p>
        </div>

        <div className="form-card">
          <div className="card-head">
            <p className="card-title">Purchase Details</p>
            <span className="card-chip">Buy Stock</span>
          </div>

          <div className="form-grid">
            <div className="select-group">
              <label className="select-label">Supplier *</label>
              <select
                className="select-field"
                value={selectedSupplier}
                onChange={(e) => {
                  setSelectedSupplier(e.target.value);
                  if (e.target.value) setNewSupplierName('');
                }}
              >
                <option value="">Walk-in / New Supplier</option>
                {supplierOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Purchase Date *"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          {!selectedSupplier && (
            <Input
              label="New Supplier Name *"
              placeholder="Enter supplier name"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Input
              label="Total Bill Amount *"
              type="number"
              min="0"
              inputMode="decimal"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(normalizeDecimalInput(e.target.value))}
              prefix="₹"
              placeholder="0.00"
            />
            {purchaseAmount && Number(purchaseAmount) > 0 && (
              <p className="amount-words">{numberToWords(purchaseAmount)}</p>
            )}
          </div>

          <Input
            label="Invoice Number"
            placeholder="Invoice / bill no."
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />

          <Input
            label="Items Description (Optional)"
            placeholder="e.g. 10x Shirts, 5x Pants"
            value={itemsDesc}
            onChange={(e) => setItemsDesc(e.target.value)}
          />

          <Input
            label="GST / Notes"
            placeholder="GST, invoice remarks, transport note..."
            value={purchaseNote}
            onChange={(e) => setPurchaseNote(e.target.value)}
          />

          <div className="payment-section">
            <label className="select-label">Payment Mode</label>
            <div className="payment-modes">
              <button type="button" className={`pmode-btn ${paymentStatus === 'full_paid' ? 'active' : ''}`} onClick={() => setPaymentStatus('full_paid')}>
                Fully Paid
              </button>
              <button type="button" className={`pmode-btn ${paymentStatus === 'partial' ? 'active' : ''}`} onClick={() => setPaymentStatus('partial')}>
                Custom Paid
              </button>
              <button type="button" className={`pmode-btn ${paymentStatus === 'full_udhaar' ? 'active' : ''}`} onClick={() => setPaymentStatus('full_udhaar')}>
                Full Udhaar
              </button>
            </div>

            {paymentStatus === 'partial' && (
              <Input
                label="Amount Paid Now *"
                type="number"
                min="0"
                inputMode="decimal"
                prefix="₹"
                placeholder="Enter paid amount"
                value={amountPaid}
                onChange={(e) => setAmountPaid(normalizeDecimalInput(e.target.value))}
              />
            )}

            {paymentStatus === 'partial' && amountPaid !== '' && (
              <p className="payment-note">
                ₹{Math.max(0, Number(purchaseAmount || 0) - Number(amountPaid || 0)).toFixed(2)} will remain in supplier khata.
              </p>
            )}

            {paymentStatus === 'full_udhaar' && (
              <p className="payment-note">Entire ₹{Number(purchaseAmount || 0).toFixed(2)} will be added to supplier khata.</p>
            )}
          </div>
        </div>

        {errors.submit && <div className="error-alert">{errors.submit}</div>}

        <Button
          onClick={handleSave}
          fullWidth
          size="lg"
          loading={loading}
          disabled={!purchaseAmount || Number(purchaseAmount) <= 0}
        >
          💾 Save Purchase Bill
        </Button>
      </div>

      <style jsx>{`
        .purchase-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 32px; }
        .purchase-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .purchase-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 0 16px; }
        .back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .back-btn:hover { background: rgba(255,255,255,0.1); }
        .page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

        .helper-banner {
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.16);
          margin-bottom: 16px;
        }
        .helper-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .helper-sub { font-size: 12px; color: var(--text-secondary); }

        .form-card {
          padding: 16px;
          border-radius: 16px;
          background: var(--bg-surface-solid);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 16px;
        }
        .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .card-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
        .card-chip {
          font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;
          background: rgba(16,185,129,0.12); color: #10B981;
        }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .select-group { display: flex; flex-direction: column; gap: 6px; }
        .select-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); padding-left: 2px; }
        .select-field {
          height: 52px; padding: 0 14px; font-size: 15px; background: var(--bg-input-alt); color: var(--text-primary);
          border: 1.5px solid rgba(255,255,255,0.08); border-radius: 12px; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B6B80' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px;
        }
        .select-field:focus { border-color: rgba(123,66,196,0.5); outline: none; }
        .select-field option { background: var(--bg-input-alt); color: var(--text-primary); }

        .amount-words { font-size: 12px; color: var(--color-success); font-weight: 600; margin-top: 4px; padding-left: 2px; }

        .payment-section { display: flex; flex-direction: column; gap: 12px; }
        .payment-modes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .pmode-btn {
          padding: 10px 6px; min-height: 40px; border-radius: 10px;
          background: var(--bg-input-alt); border: 1px solid var(--border-color);
          color: var(--text-secondary); font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.2s ease;
        }
        .pmode-btn.active { background: var(--accent-gradient); color: #fff; border-color: transparent; }
        .payment-note { font-size: 12px; color: var(--text-secondary); }

        .error-alert { padding: 12px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 12px; color: var(--color-danger); font-size: 14px; text-align: center; margin-bottom: 8px; }

        @media (max-width: 420px) {
          .form-grid, .payment-modes { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
