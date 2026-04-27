'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStore, CATEGORIES, UNITS } from '../../lib/store';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function AddProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', category: 'Grocery', unit: 'pcs',
    quantity: '', buyPrice: '', sellPrice: '', lowStockThreshold: '5',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const update = (key, val) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      // Auto-calculate sell price when buy price changes (10% default margin)
      if (key === 'buyPrice' && val) {
        const buyVal = parseFloat(val);
        if (!isNaN(buyVal) && buyVal > 0) {
          next.sellPrice = String(Math.round(buyVal * 1.1));
        }
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.quantity || Number(form.quantity) < 0) e.quantity = 'Enter valid quantity';
    if (!form.buyPrice || Number(form.buyPrice) < 0) e.buyPrice = 'Enter buying price';
    if (!form.sellPrice || Number(form.sellPrice) < 0) e.sellPrice = 'Enter selling price';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const result = await ProductStore.add(form);
      if (result.error) {
        setErrors({ submit: result.error });
      } else {
        setSuccess(true);
        await new Promise((r) => setTimeout(r, 800));
        router.push('/inventory');
      }
    } catch (err) {
      setErrors({ submit: 'Failed to add product. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const profit = (Number(form.sellPrice) || 0) - (Number(form.buyPrice) || 0);
  const margin = Number(form.buyPrice) > 0 ? ((profit / Number(form.buyPrice)) * 100).toFixed(1) : 0;

  if (success) {
    return (
      <div className="success-screen">
        <div className="success-content">
          <div className="success-icon">✅</div>
          <h2>Product Added!</h2>
          <p>{form.name} has been added to your inventory</p>
        </div>
        <style jsx>{`
          .success-screen {
            min-height: 100dvh; background: var(--bg-primary);
            display: flex; align-items: center; justify-content: center;
          }
          .success-content { text-align: center; animation: bounceIn 0.6s ease-out; }
          .success-icon { font-size: 64px; margin-bottom: 16px; }
          h2 { font-size: 22px; color: white; margin-bottom: 8px; }
          p { color: #A0A0B8; font-size: 15px; }
          @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="add-page">
      <div className="add-content">
        <div className="add-header">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="add-title">Add Product</h1>
          <div style={{ width: 40 }} />
        </div>

        <form onSubmit={handleSubmit} className="add-form">
          <Input id="prod-name" label="Product Name *" placeholder="e.g. Tata Salt 1kg" value={form.name} onChange={(e) => update('name', e.target.value)} error={errors.name} autoFocus />

          <div className="row-2">
            <div className="select-group">
              <label className="select-label">Category</label>
              <select className="select-field" value={form.category} onChange={(e) => update('category', e.target.value)} id="prod-category">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="select-group">
              <label className="select-label">Unit</label>
              <select className="select-field" value={form.unit} onChange={(e) => update('unit', e.target.value)} id="prod-unit">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <Input id="prod-qty" label="Quantity *" type="number" step="any" inputMode="decimal" placeholder="0" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} error={errors.quantity} />

          <div className="row-2">
            <Input id="prod-buy" label="Buy Price (₹) *" type="number" inputMode="decimal" prefix="₹" placeholder="0" value={form.buyPrice} onChange={(e) => update('buyPrice', e.target.value)} error={errors.buyPrice} />
            <Input id="prod-sell" label="Sell Price (₹) *" type="number" inputMode="decimal" prefix="₹" placeholder="0" value={form.sellPrice} onChange={(e) => update('sellPrice', e.target.value)} error={errors.sellPrice} />
          </div>

          {/* Profit Preview */}
          {Number(form.buyPrice) > 0 && Number(form.sellPrice) > 0 && (
            <div className="profit-preview">
              <div className="profit-item">
                <span className="profit-label">Profit per unit</span>
                <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>
                  {profit >= 0 ? '+' : ''}₹{profit}
                </span>
              </div>
              <div className="profit-item">
                <span className="profit-label">Margin</span>
                <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>{margin}%</span>
              </div>
              <div className="profit-item">
                <span className="profit-label">Total profit</span>
                <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>
                  ₹{(profit * (Number(form.quantity) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          <Input id="prod-threshold" label="Low Stock Alert (qty)" type="number" inputMode="numeric" placeholder="5" value={form.lowStockThreshold} onChange={(e) => update('lowStockThreshold', e.target.value)} />

          {errors.submit && <div className="error-alert">{errors.submit}</div>}

          <Button id="save-product-btn" type="submit" fullWidth size="lg" loading={loading}>
            Save Product
          </Button>
        </form>
      </div>

      <style jsx>{`
        .error-alert {
          padding: 12px; background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px; color: #EF4444;
          font-size: 14px; text-align: center; margin-bottom: 8px;
        }
        .add-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 32px; }
        .add-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .add-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 0 24px;
        }
        .back-btn {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(255,255,255,0.05); border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.2s;
        }
        .back-btn:hover { background: rgba(255,255,255,0.1); }
        .add-title { font-size: 18px; font-weight: 700; color: white; }
        .add-form { display: flex; flex-direction: column; gap: 18px; }
        .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .select-group { display: flex; flex-direction: column; gap: 6px; }
        .select-label { font-size: 13px; font-weight: 500; color: #A0A0B8; padding-left: 2px; }
        .select-field {
          height: 52px; padding: 0 14px; font-size: 15px;
          background: #1A1A30; color: white;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 12px; appearance: none;
          cursor: pointer; transition: border-color 0.2s;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B6B80' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }
        .select-field:focus {
          border-color: rgba(123,66,196,0.5);
          outline: none;
        }
        .select-field option { background: #1A1A30; color: white; }
        .profit-preview {
          display: flex; gap: 0;
          padding: 14px; background: rgba(34,197,94,0.06);
          border: 1px solid rgba(34,197,94,0.15);
          border-radius: 12px; animation: fadeIn 0.3s ease-out;
        }
        .profit-item { flex: 1; text-align: center; }
        .profit-label { display: block; font-size: 11px; color: #6B6B80; margin-bottom: 4px; }
        .profit-value { font-size: 15px; font-weight: 700; }
        .green { color: #22C55E; }
        .red { color: #EF4444; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
