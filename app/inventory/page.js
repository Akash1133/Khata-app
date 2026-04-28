'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStore, CATEGORIES } from '../lib/store';
import Card from '../components/Card';
import Button from '../components/Button';

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    ProductStore.getAll().then(setProducts);
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const totalValue = products.reduce((s, p) => s + toNum(p.quantity) * toNum(p.sellPrice), 0);

  const getStockBadge = (p) => {
    const qty = toNum(p.quantity);
    const threshold = toNum(p.lowStockThreshold);
    if (qty === 0) return { label: 'Out', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' };
    if (qty <= threshold) return { label: 'Low', color: '#F97316', bg: 'rgba(249,115,22,0.12)' };
    return { label: 'In Stock', color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' };
  };

  return (
    <div className="inv-page">
      <div className="inv-content">
        {/* Header */}
        <div className="inv-header">
          <div>
            <h1 className="inv-title">Inventory</h1>
            <p className="inv-subtitle">{products.length} products · ₹{totalValue.toFixed(2)} value</p>
          </div>
          <div className="inv-header-actions">
            <button className="add-btn-icon" onClick={() => router.push('/inventory/bulk')} title="Bulk Add">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            <Button size="sm" onClick={() => router.push('/inventory/add')} id="add-product-btn"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" placeholder="Search products..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="search-input" id="search-products"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Category Filter */}
        <div className="cat-scroll">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              className={`cat-chip ${activeCategory === c ? 'cat-active' : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product List */}
        {filtered.length === 0 ? (
          <div className="empty-inv">
            <p className="empty-icon">📦</p>
            <p className="empty-title">{products.length === 0 ? 'No products yet' : 'No matching products'}</p>
            <p className="empty-sub">{products.length === 0 ? 'Add your first product to get started' : 'Try a different search or category'}</p>
            {products.length === 0 && (
              <div className="empty-actions">
                <Button size="sm" onClick={() => router.push('/inventory/add')}>Add Product</Button>
                <Button size="sm" variant="secondary" onClick={() => router.push('/inventory/bulk')}>Bulk Add</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="product-list">
            {filtered.map((p) => {
              const badge = getStockBadge(p);
              const qty = toNum(p.quantity);
              const buyPrice = toNum(p.buyPrice);
              const sellPrice = toNum(p.sellPrice);
              const profit = sellPrice - buyPrice;
              const margin = buyPrice > 0 ? ((profit / buyPrice) * 100).toFixed(2) : '0.00';
              return (
                <Card key={p.id} padding="md" onClick={() => router.push(`/inventory/${p.id}`)} className="product-card">
                  <div className="prod-top">
                    <div className="prod-info">
                      <p className="prod-name">{p.name}</p>
                      <p className="prod-cat">{p.category} · {p.unit}</p>
                    </div>
                    <span className="stock-badge" style={{ color: badge.color, background: badge.bg }}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="prod-bottom">
                    <div className="prod-stat">
                      <span className="prod-stat-label">Qty</span>
                      <span className="prod-stat-value">{qty}</span>
                    </div>
                    <div className="prod-stat">
                      <span className="prod-stat-label">Buy</span>
                      <span className="prod-stat-value">₹{buyPrice.toFixed(2)}</span>
                    </div>
                    <div className="prod-stat">
                      <span className="prod-stat-label">Sell</span>
                      <span className="prod-stat-value">₹{sellPrice.toFixed(2)}</span>
                    </div>
                    <div className="prod-stat">
                      <button 
                        className="card-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/inventory/${p.id}`);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .inv-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 88px; }
        .inv-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .inv-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 12px 0 20px; animation: fadeIn 0.4s ease-out;
        }
        .inv-title { font-size: 24px; font-weight: 800; color: var(--text-primary); }
        .inv-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
        .inv-header-actions { display: flex; gap: 8px; align-items: center; }
        .add-btn-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
        }
        .add-btn-icon:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }

        .search-bar {
          display: flex; align-items: center; gap: 10px;
          background: var(--bg-input-alt); border: 1.5px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 0 14px; height: 46px;
          margin-bottom: 16px; transition: border-color 0.2s;
        }
        .search-bar:focus-within { border-color: rgba(123,66,196,0.5); }
        .search-input {
          flex: 1; height: 100%; font-size: 14px; color: var(--text-primary); background: transparent;
        }
        .search-input::placeholder { color: #4A4A60; }
        .search-clear {
          font-size: 14px; color: var(--text-muted); background: none; border: none;
          cursor: pointer; padding: 4px; transition: color 0.2s;
        }
        .search-clear:hover { color: var(--text-primary); }

        .cat-scroll {
          display: flex; gap: 8px; overflow-x: auto;
          padding-bottom: 16px; margin-bottom: 8px;
          -ms-overflow-style: none; scrollbar-width: none;
        }
        .cat-scroll::-webkit-scrollbar { display: none; }
        .cat-chip {
          padding: 6px 14px; border-radius: 20px; font-size: 13px;
          font-weight: 500; white-space: nowrap;
          background: rgba(255,255,255,0.05); color: var(--text-secondary);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer; transition: all 0.2s;
        }
        .cat-chip:hover { background: rgba(255,255,255,0.08); }
        .cat-active {
          background: rgba(123,66,196,0.2); color: #B68AFF;
          border-color: rgba(123,66,196,0.3);
        }

        .product-list { display: flex; flex-direction: column; gap: 10px; }
        .prod-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .prod-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
        .prod-cat { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
        .stock-badge {
          font-size: 11px; font-weight: 600; padding: 3px 8px;
          border-radius: 6px; white-space: nowrap;
        }
        .prod-bottom { display: flex; gap: 0; }
        .prod-stat {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
        }
        .prod-stat-label { font-size: 11px; color: var(--text-muted); }
        .prod-stat-value { font-size: 14px; font-weight: 700; color: var(--text-primary); }
        .card-edit-btn {
          margin-top: 4px;
          background: rgba(123, 66, 196, 0.15);
          color: #B68AFF;
          border: 1px solid rgba(123, 66, 196, 0.3);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-edit-btn:hover { background: rgba(123, 66, 196, 0.25); border-color: rgba(123, 66, 196, 0.5); }

        .empty-inv {
          text-align: center; padding: 48px 16px;
          background: rgba(37,37,64,0.3); border-radius: 16px;
          border: 1px dashed rgba(255,255,255,0.08);
        }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
        .empty-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
        .empty-actions { display: flex; gap: 10px; justify-content: center; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
