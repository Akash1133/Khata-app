'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProductStore, CATEGORIES, UNITS } from '../../lib/store';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const normalizeProduct = (p) => ({
    ...p,
    quantity: toNum(p.quantity),
    buyPrice: toNum(p.buyPrice),
    sellPrice: toNum(p.sellPrice),
    lowStockThreshold: toNum(p.lowStockThreshold),
  });

  useEffect(() => {
    ProductStore.getById(params.id).then((p) => {
      if (!p) { router.replace('/inventory'); return; }
      const normalized = normalizeProduct(p);
      setProduct(normalized);
      setForm(normalized);
    });
  }, [params.id, router]);

  const update = (key, val) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      // Auto-calculate sell price when buy price changes (10% default margin)
      if (key === 'buyPrice' && val) {
        const buyVal = parseFloat(val);
        if (!isNaN(buyVal) && buyVal > 0) {
          next.sellPrice = (Math.round(buyVal * 1.1 * 100) / 100).toFixed(2);
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      ...form,
      quantity: toNum(form.quantity),
      buyPrice: toNum(form.buyPrice),
      sellPrice: toNum(form.sellPrice),
      lowStockThreshold: toNum(form.lowStockThreshold),
    };
    const updated = await ProductStore.update(product.id, payload);
    const next = normalizeProduct(updated || { ...product, ...payload });
    setProduct(next);
    setForm(next);
    setEditing(false);
    setLoading(false);
  };

  const handleDelete = async () => {
    await ProductStore.delete(product.id);
    router.push('/inventory');
  };

  if (!product) return null;

  const quantity = toNum(product.quantity);
  const buyPrice = toNum(product.buyPrice);
  const sellPrice = toNum(product.sellPrice);
  const lowStockThreshold = toNum(product.lowStockThreshold);
  const profit = Math.round((sellPrice - buyPrice) * 100) / 100;
  const margin = buyPrice > 0 ? ((profit / buyPrice) * 100).toFixed(2) : '0.00';
  const totalProfit = Math.round(profit * quantity * 100) / 100;

  const stockStatus = quantity === 0
    ? { label: 'Out of Stock', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' }
    : quantity <= lowStockThreshold
    ? { label: 'Low Stock', color: '#F97316', bg: 'rgba(249,115,22,0.12)' }
    : { label: 'In Stock', color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' };

  return (
    <div className="detail-page">
      <div className="detail-content">
        <div className="detail-header">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="detail-title">{editing ? 'Edit Product' : 'Product Details'}</h1>
          {!editing ? (
            <button className="edit-btn" onClick={() => setEditing(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B42C4" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          ) : (
            <button className="cancel-btn" onClick={() => { setEditing(false); setForm(product); }}>Cancel</button>
          )}
        </div>

        {!editing ? (
          /* View Mode */
          <div className="view-mode">
            <div className="prod-hero">
              <h2 className="prod-name">{product.name}</h2>
              <div className="prod-meta">
                <span className="prod-cat">{product.category}</span>
                <span className="prod-dot">·</span>
                <span className="prod-unit">{product.unit}</span>
                <span className="stock-badge" style={{ color: stockStatus.color, background: stockStatus.bg }}>
                  {stockStatus.label}
                </span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <p className="stat-l">Quantity</p>
                <p className="stat-v">{quantity} <small>{product.unit}</small></p>
              </div>
              <div className="stat-card">
                <p className="stat-l">Buy Price</p>
                <p className="stat-v">₹{buyPrice.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <p className="stat-l">Sell Price</p>
                <p className="stat-v">₹{sellPrice.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <p className="stat-l">Margin</p>
                <p className="stat-v" style={{ color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{margin}%</p>
              </div>
            </div>

            <div className="profit-card">
              <div className="profit-row">
                <span>Profit per unit</span>
                <span style={{ color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                  {profit >= 0 ? '+' : ''}₹{profit.toFixed(2)}
                </span>
              </div>
              <div className="profit-row">
                <span>Total stock profit</span>
                <span style={{ color: totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                  ₹{totalProfit.toFixed(2)}
                </span>
              </div>
              <div className="profit-row">
                <span>Stock value (buy)</span>
                <span style={{ fontWeight: 600 }}>₹{(buyPrice * quantity).toFixed(2)}</span>
              </div>
              <div className="profit-row">
                <span>Stock value (sell)</span>
                <span style={{ fontWeight: 600 }}>₹{(sellPrice * quantity).toFixed(2)}</span>
              </div>
            </div>

            <div className="info-row">
              <span>Low stock alert at</span>
              <span>{lowStockThreshold} {product.unit}</span>
            </div>
            <div className="info-row">
              <span>Added on</span>
              <span>{new Date(product.createdAt).toLocaleDateString()}</span>
            </div>

            <Button variant="danger" fullWidth onClick={() => setShowDelete(true)} id="delete-product-btn">
              Delete Product
            </Button>
          </div>
        ) : (
          /* Edit Mode */
          <div className="edit-mode">
            <Input id="edit-name" label="Product Name *" value={form.name} onChange={(e) => update('name', e.target.value)} />
            <div className="row-2">
              <div className="sel-grp">
                <label className="sel-l">Category</label>
                <select className="sel-f" value={form.category} onChange={(e) => update('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="sel-grp">
                <label className="sel-l">Unit</label>
                <select className="sel-f" value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <Input id="edit-qty" label="Quantity *" type="number" step="any" value={String(form.quantity)} onChange={(e) => update('quantity', e.target.value)} />
            <div className="row-2">
              <Input id="edit-buy" label="Buy Price (₹) *" type="number" prefix="₹" value={String(form.buyPrice)} onChange={(e) => update('buyPrice', e.target.value)} />
              <Input id="edit-sell" label="Sell Price (₹) *" type="number" prefix="₹" value={String(form.sellPrice)} onChange={(e) => update('sellPrice', e.target.value)} />
            </div>
            <Input id="edit-threshold" label="Low Stock Alert" type="number" value={String(form.lowStockThreshold)} onChange={(e) => update('lowStockThreshold', e.target.value)} />
            <Button fullWidth size="lg" loading={loading} onClick={handleSave} id="save-edit-btn">Save Changes</Button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDelete && (
          <div className="modal-overlay" onClick={() => setShowDelete(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <p className="modal-icon">⚠️</p>
              <h3 className="modal-title">Delete {product.name}?</h3>
              <p className="modal-desc">This action cannot be undone.</p>
              <div className="modal-actions">
                <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .detail-page { min-height:100dvh; background:var(--bg-primary); padding-bottom:32px; }
        .detail-content { max-width:480px; margin:0 auto; padding:16px; }
        .detail-header { display:flex; align-items:center; justify-content:space-between; padding:8px 0 24px; }
        .back-btn, .edit-btn {
          width:40px; height:40px; border-radius:12px;
          background:rgba(255,255,255,.05); border:none;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:background .2s;
        }
        .back-btn:hover, .edit-btn:hover { background:rgba(255,255,255,.1); }
        .detail-title { font-size:18px; font-weight:700; color: var(--text-primary); }
        .cancel-btn { font-size:14px; font-weight:600; color:#7B42C4; background:none; border:none; cursor:pointer; padding:8px 12px; border-radius:8px; }
        .cancel-btn:hover { background:rgba(123,66,196,.1); }

        .prod-hero { margin-bottom:24px; animation:fadeIn .4s ease-out; }
        .prod-name { font-size:24px; font-weight:800; color: var(--text-primary); margin-bottom:8px; }
        .prod-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .prod-cat, .prod-unit { font-size:13px; color: var(--text-secondary); }
        .prod-dot { color:#4A4A60; }
        .stock-badge { font-size:12px; font-weight:600; padding:4px 10px; border-radius:8px; margin-left:4px; }

        .stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
        .stat-card { padding:14px; background: var(--bg-surface-solid); border-radius:12px; border:1px solid rgba(255,255,255,.04); }
        .stat-l { font-size:12px; color: var(--text-muted); margin-bottom:4px; }
        .stat-v { font-size:20px; font-weight:700; color: var(--text-primary); }
        .stat-v small { font-size:12px; color: var(--text-muted); font-weight:400; }

        .profit-card {
          padding:16px; background:rgba(34,197,94,.05); border:1px solid rgba(34,197,94,.12);
          border-radius:14px; margin-bottom:16px;
        }
        .profit-row { display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color: var(--text-secondary); }
        .profit-row:not(:last-child) { border-bottom:1px solid rgba(255,255,255,.04); }

        .info-row {
          display:flex; justify-content:space-between; padding:12px 0;
          font-size:14px; color: var(--text-secondary); border-bottom:1px solid rgba(255,255,255,.04);
        }
        .info-row:last-of-type { margin-bottom:24px; }

        .edit-mode { display:flex; flex-direction:column; gap:18px; animation:fadeIn .3s ease-out; }
        .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .sel-grp { display:flex; flex-direction:column; gap:6px; }
        .sel-l { font-size:13px; font-weight:500; color: var(--text-secondary); }
        .sel-f {
          height:52px; padding:0 14px; font-size:15px;
          background: var(--bg-input-alt); color: var(--text-primary);
          border:1.5px solid rgba(255,255,255,.08);
          border-radius:12px; appearance:none; cursor:pointer;
        }
        .sel-f:focus { border-color:rgba(123,66,196,.5); outline:none; }
        .sel-f option { background: var(--bg-input-alt); }

        .modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,.6);
          display:flex; align-items:center; justify-content:center;
          z-index:2000; padding:16px; animation:fadeIn .2s ease-out;
        }
        .modal {
          background: var(--bg-surface-solid); border-radius:20px; padding:28px 24px;
          max-width:320px; width:100%; text-align:center;
          border:1px solid rgba(255,255,255,.08); animation:scaleIn .3s ease-out;
        }
        .modal-icon { font-size:40px; margin-bottom:12px; }
        .modal-title { font-size:18px; font-weight:700; color: var(--text-primary); margin-bottom:6px; }
        .modal-desc { font-size:14px; color: var(--text-muted); margin-bottom:20px; }
        .modal-actions { display:flex; gap:10px; justify-content:center; }

        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}
