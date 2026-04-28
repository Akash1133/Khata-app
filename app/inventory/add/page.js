'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStore, CATEGORIES, UNITS } from '../../lib/store';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function AddProductPage() {
  const router = useRouter();
  const [mode, setMode] = useState('single'); // 'single' | 'bulk'
  
  // === SINGLE MODE STATE ===
  const [form, setForm] = useState({
    name: '', category: 'Grocery', unit: 'pcs',
    quantity: '', buyPrice: '', sellPrice: '', lowStockThreshold: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // === BULK MODE STATE ===
  const [products, setProducts] = useState([]);
  const [bulkUpdates, setBulkUpdates] = useState({}); // { productId: addQty }
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    ProductStore.getAll().then(prods => {
      setProducts(prods);
      setProductsLoading(false);
    });
  }, []);

  // === SINGLE MODE LOGIC ===
  const update = (key, val) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
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
      if (!result?.success) {
        const friendly = (result?.status === 409)
          ? 'Item already present in inventory. You can edit existing item instead.'
          : (result?.status === 400)
          ? 'Please enter valid values. Negative values are not allowed.'
          : (result?.error || 'Could not save product right now. Please try again.');
        setErrors({ submit: friendly });
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

  // === BULK MODE LOGIC ===
  const updateBulkQty = (productId, val) => {
    if (val === '') {
      setBulkUpdates(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    const qty = parseFloat(val);
    setBulkUpdates(prev => {
      const copy = { ...prev };
      if (isNaN(qty) || qty <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = qty;
      }
      return copy;
    });
  };

  const handleBulkSave = async () => {
    const entries = Object.entries(bulkUpdates).filter(([, qty]) => qty > 0);
    if (entries.length === 0) return;
    setBulkLoading(true);
    try {
      // Update each product's quantity
      for (const [productId, addQty] of entries) {
        const product = products.find(p => p.id === productId);
        if (product) {
          await ProductStore.update(productId, {
            quantity: product.quantity + addQty
          });
        }
      }
      setBulkSuccess(true);
      await new Promise(r => setTimeout(r, 800));
      router.push('/inventory');
    } catch (err) {
      setErrors({ submit: 'Failed to update stock.' });
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkCount = Object.values(bulkUpdates).filter(v => v > 0).length;

  const profit = Math.round(((Number(form.sellPrice) || 0) - (Number(form.buyPrice) || 0)) * 100) / 100;
  const margin = Number(form.buyPrice) > 0 ? ((profit / Number(form.buyPrice)) * 100).toFixed(2) : '0.00';

  // === SUCCESS SCREENS ===
  if (success || bulkSuccess) {
    return (
      <div className="success-screen">
        <div className="success-content">
          <div className="success-icon">✅</div>
          <h2>{success ? 'Product Added!' : 'Stock Updated!'}</h2>
          <p>{success ? `${form.name} has been added to your inventory` : `${bulkCount} product(s) updated`}</p>
        </div>
        <style jsx>{`
          .success-screen { min-height: 100dvh; background: var(--bg-primary); display: flex; align-items: center; justify-content: center; }
          .success-content { text-align: center; animation: bounceIn 0.6s ease-out; }
          .success-icon { font-size: 64px; margin-bottom: 16px; }
          h2 { font-size: 22px; color: var(--text-primary); margin-bottom: 8px; }
          p { color: var(--text-secondary); font-size: 15px; }
          @keyframes bounceIn { 0%{transform:scale(.3);opacity:0} 50%{transform:scale(1.05)} 70%{transform:scale(.9)} 100%{transform:scale(1);opacity:1} }
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
          <h1 className="add-title">{mode === 'single' ? 'Add Product' : 'Bulk Stock Update'}</h1>
          <div style={{ width: 40 }} />
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>
            ➕ New Product
          </button>
          <button className={`mode-btn ${mode === 'bulk' ? 'active' : ''}`} onClick={() => setMode('bulk')}>
            📦 Bulk Update
          </button>
        </div>

        {mode === 'single' ? (
          /* === SINGLE PRODUCT FORM === */
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

            <Input id="prod-qty" label="Quantity *" type="number" step="any" min="0" inputMode="decimal" placeholder="0" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} error={errors.quantity} />

            <div className="row-2">
              <Input id="prod-buy" label="Buy Price (₹) *" type="number" min="0" inputMode="decimal" prefix="₹" placeholder="0" value={form.buyPrice} onChange={(e) => update('buyPrice', e.target.value)} error={errors.buyPrice} />
              <Input id="prod-sell" label="Sell Price (₹) *" type="number" min="0" inputMode="decimal" prefix="₹" placeholder="0" value={form.sellPrice} onChange={(e) => update('sellPrice', e.target.value)} error={errors.sellPrice} />
            </div>

            {Number(form.buyPrice) > 0 && Number(form.sellPrice) > 0 && (
              <div className="profit-preview">
                <div className="profit-item">
                  <span className="profit-label">Profit/unit</span>
                  <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>{profit >= 0 ? '+' : ''}₹{profit.toFixed(2)}</span>
                </div>
                <div className="profit-item">
                  <span className="profit-label">Margin</span>
                  <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>{margin}%</span>
                </div>
                <div className="profit-item">
                  <span className="profit-label">Total profit</span>
                  <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>₹{(profit * (Number(form.quantity) || 0)).toFixed(2)}</span>
                </div>
              </div>
            )}

            <Input id="prod-threshold" label="Low Stock Alert (qty)" type="number" min="0" inputMode="numeric" placeholder="Enter threshold" value={form.lowStockThreshold} onChange={(e) => update('lowStockThreshold', e.target.value)} />


            {errors.submit && <div className="error-alert">{errors.submit}</div>}

            <Button id="save-product-btn" type="submit" fullWidth size="lg" loading={loading}>Save Product</Button>
          </form>
        ) : (
          /* === BULK UPDATE MODE === */
          <div className="bulk-section">
            {productsLoading ? (
              <div className="loading">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="empty-bulk">
                <p>📦</p>
                <p>No products yet. Add your first product in Single mode.</p>
              </div>
            ) : (
              <>
                <div className="bulk-list">
                  {products.map(p => (
                    <div key={p.id} className={`bulk-row ${bulkUpdates[p.id] > 0 ? 'has-update' : ''}`}>
                      <div className="bulk-info">
                        <p className="bulk-name">{p.name}</p>
                        <p className="bulk-stock">{p.quantity} {p.unit} in stock</p>
                      </div>
                      <div className="bulk-controls">
                        <span className="bulk-plus">+</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="bulk-input"
                          placeholder="0"
                          value={bulkUpdates[p.id] || ''}
                          onChange={(e) => updateBulkQty(p.id, e.target.value)}
                        />
                        <span className="bulk-unit">{p.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.submit && <div className="error-alert">{errors.submit}</div>}

                <Button
                  onClick={handleBulkSave}
                  fullWidth
                  size="lg"
                  loading={bulkLoading}
                  disabled={bulkCount === 0}
                >
                  💾 Update Stock for {bulkCount} item{bulkCount !== 1 ? 's' : ''}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .error-alert { padding: 12px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 12px; color: var(--color-danger); font-size: 14px; text-align: center; margin-bottom: 8px; }
        .add-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 32px; }
        .add-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .add-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 0 16px; }
        .back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .back-btn:hover { background: rgba(255,255,255,0.1); }
        .add-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

        .mode-toggle { display: flex; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
        .mode-btn { flex: 1; padding: 10px; border: none; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .mode-btn.active { background: #7B42C4; color: var(--text-primary); }

        .add-form { display: flex; flex-direction: column; gap: 18px; }
        .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
        .profit-preview { display: flex; padding: 14px; background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.15); border-radius: 12px; }
        .profit-item { flex: 1; text-align: center; }
        .profit-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
        .profit-value { font-size: 15px; font-weight: 700; }
        .green { color: var(--color-success); }
        .red { color: var(--color-danger); }

        /* Bulk Mode Styles */
        .bulk-section { display: flex; flex-direction: column; gap: 16px; }
        .bulk-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
        .bulk-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 12px 14px; background: var(--bg-surface-solid); border-radius: 12px;
          border: 1.5px solid rgba(255,255,255,0.04); transition: all 0.2s;
        }
        .bulk-row.has-update { border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.04); }
        .bulk-info { flex: 1; min-width: 0; }
        .bulk-name { font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bulk-stock { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .bulk-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .bulk-plus { color: var(--color-success); font-size: 16px; font-weight: 700; }
        .bulk-input {
          width: 64px; height: 36px; text-align: center; font-size: 15px; font-weight: 700;
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          color: var(--text-primary); outline: none;
        }
        .bulk-input:focus { border-color: #7B42C4; }
        .bulk-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .bulk-unit { font-size: 12px; color: var(--text-muted); min-width: 24px; }
        .empty-bulk { text-align: center; padding: 40px; color: var(--text-secondary); }
        .empty-bulk p:first-child { font-size: 40px; margin-bottom: 12px; }
        .loading { color: var(--text-secondary); text-align: center; padding: 40px; }
      `}</style>
    </div>
  );
}
