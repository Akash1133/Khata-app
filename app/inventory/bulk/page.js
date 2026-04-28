'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStore, CATEGORIES, UNITS } from '../../lib/store';
import Button from '../../components/Button';

const emptyRow = () => ({ name: '', category: 'Grocery', unit: 'pcs', quantity: '', buyPrice: '', sellPrice: '' });

export default function BulkAddPage() {
  const router = useRouter();
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const preventNegativeKey = (e) => {
    if (e.key === '-' || e.key === 'Minus') e.preventDefault();
  };

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((r, i) => {
      if (i !== index) return r;
      return { ...r, [key]: value };
    }));
  };

  const addRows = () => {
    setRows((prev) => [...prev, emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const valid = rows.filter((r) => {
      if (!r.name.trim()) return false;
      const qty = Number(r.quantity);
      const buy = Number(r.buyPrice || 0);
      const sell = Number(r.sellPrice || 0);
      return Number.isFinite(qty) && qty >= 0 && buy >= 0 && sell >= 0;
    });
    if (valid.length === 0) return;

    setLoading(true);
    setError('');
    const result = await ProductStore.addBulk(valid);
    if (!result?.success) {
      const friendly = (result?.status === 409)
        ? 'One or more items are already present in inventory. Remove duplicates and try again.'
        : (result?.status === 400)
        ? 'Please check values. Negative numbers are not allowed.'
        : (result?.error || 'Could not save bulk products right now. Please try again.');
      setError(friendly);
      setLoading(false);
      return;
    }
    setSaved(true);
    await new Promise((r) => setTimeout(r, 800));
    router.push('/inventory');
  };

  const filledCount = rows.filter((r) => r.name.trim()).length;

  if (saved) {
    return (
      <div className="success-screen">
        <div className="success-content">
          <div className="success-icon">🎉</div>
          <h2>{filledCount} Products Added!</h2>
          <p>Your inventory has been updated</p>
        </div>
        <style jsx>{`
          .success-screen { min-height:100dvh; background:var(--bg-primary); display:flex; align-items:center; justify-content:center; }
          .success-content { text-align:center; animation:bounceIn 0.6s ease-out; }
          .success-icon { font-size:64px; margin-bottom:16px; }
          h2 { font-size:22px; color: var(--text-primary); margin-bottom:8px; }
          p { color: var(--text-secondary); font-size:15px; }
          @keyframes bounceIn { 0%{transform:scale(.3);opacity:0} 50%{transform:scale(1.05)} 70%{transform:scale(.9)} 100%{transform:scale(1);opacity:1} }
        `}</style>
      </div>
    );
  }

  return (
    <div className="bulk-page">
      <div className="bulk-content">
        <div className="bulk-header">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h1 className="bulk-title">Bulk Add Products</h1>
            <p className="bulk-sub">{filledCount} of {rows.length} rows filled</p>
          </div>
        </div>

        <div className="table-scroll">
          <div className="table-header">
            <span className="th th-name">Name *</span>
            <span className="th th-cat">Category</span>
            <span className="th th-num">Qty</span>
            <span className="th th-num">Buy ₹</span>
            <span className="th th-num">Sell ₹</span>
            <span className="th th-act"></span>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="table-row">
              <input className="cell cell-name" placeholder="Product name" value={row.name}
                onChange={(e) => updateRow(i, 'name', e.target.value)} />
              <select className="cell cell-cat" value={row.category}
                onChange={(e) => updateRow(i, 'category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input className="cell cell-num" type="number" inputMode="numeric" placeholder="0"
                min="0"
                value={row.quantity}
                onKeyDown={preventNegativeKey}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') return updateRow(i, 'quantity', '');
                  updateRow(i, 'quantity', String(Math.max(0, Number(v) || 0)));
                }} />
              <input className="cell cell-num" type="number" inputMode="decimal" placeholder="0"
                min="0"
                value={row.buyPrice}
                onKeyDown={preventNegativeKey}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') return updateRow(i, 'buyPrice', '');
                  updateRow(i, 'buyPrice', String(Math.max(0, Number(v) || 0)));
                }} />
              <input className="cell cell-num" type="number" inputMode="decimal" placeholder="0"
                min="0"
                value={row.sellPrice}
                onKeyDown={preventNegativeKey}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') return updateRow(i, 'sellPrice', '');
                  updateRow(i, 'sellPrice', String(Math.max(0, Number(v) || 0)));
                }} />
              <button className="cell-del" onClick={() => removeRow(i)} title="Remove">✕</button>
            </div>
          ))}
        </div>

        <div className="bulk-actions">
          {error && <p className="error-msg">{error}</p>}
          <Button variant="outline" size="sm" onClick={addRows} id="add-more-rows">+ Add 5 Rows</Button>
          <Button size="lg" fullWidth onClick={handleSave} loading={loading} disabled={filledCount === 0} id="save-bulk-btn">
            Save {filledCount} Product{filledCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .bulk-page { min-height:100dvh; background:var(--bg-primary); padding-bottom:32px; }
        .bulk-content { max-width:600px; margin:0 auto; padding:16px; }
        .bulk-header { display:flex; align-items:center; gap:14px; padding:8px 0 24px; }
        .back-btn {
          width:40px; height:40px; border-radius:12px; flex-shrink:0;
          background:rgba(255,255,255,.05); border:none;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:background .2s;
        }
        .back-btn:hover { background:rgba(255,255,255,.1); }
        .bulk-title { font-size:18px; font-weight:700; color: var(--text-primary); }
        .bulk-sub { font-size:13px; color: var(--text-muted); margin-top:2px; }

        .table-scroll { overflow-x:auto; margin-bottom:20px; }
        .table-header {
          display:flex; gap:6px; padding:10px 8px;
          border-bottom:1px solid rgba(255,255,255,.06);
          position:sticky; top:0; background:var(--bg-primary); z-index:1;
        }
        .th { font-size:11px; font-weight:600; color: var(--text-muted); text-transform:uppercase; letter-spacing:.5px; }
        .th-name { flex:2; min-width:120px; }
        .th-cat { flex:1.2; min-width:90px; }
        .th-num { flex:0.8; min-width:60px; }
        .th-act { width:28px; }

        .table-row {
          display:flex; gap:6px; padding:4px 0;
          border-bottom:1px solid rgba(255,255,255,.03);
          animation:fadeIn .3s ease-out;
        }
        .cell {
          height:42px; padding:0 10px; font-size:13px;
          background: var(--bg-input-alt); color: var(--text-primary);
          border:1px solid rgba(255,255,255,.06);
          border-radius:8px; transition:border-color .2s;
        }
        .cell:focus { border-color:rgba(123,66,196,.5); outline:none; }
        .cell-name { flex:2; min-width:120px; }
        .cell-cat { flex:1.2; min-width:90px; appearance:none; cursor:pointer; }
        .cell-cat option { background: var(--bg-input-alt); }
        .cell-num { flex:0.8; min-width:60px; }
        .cell-num::-webkit-inner-spin-button { -webkit-appearance:none; }
        .cell-del {
          width:28px; height:42px; border:none; background:none;
          color: var(--text-muted); cursor:pointer; font-size:12px;
          display:flex; align-items:center; justify-content:center;
          border-radius:6px; transition:all .2s;
        }
        .cell-del:hover { background:rgba(239,68,68,.1); color:var(--color-danger); }

        .bulk-actions { display:flex; flex-direction:column; gap:12px; }
        .error-msg { color:var(--color-danger); font-size:13px; text-align:center; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}
