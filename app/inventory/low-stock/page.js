'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStore } from '../../lib/store';
import Card from '../../components/Card';

export default function LowStockPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductStore.getAll().then((all) => {
      setProducts(all || []);
      setLoading(false);
    });
  }, []);

  const lowStockItems = useMemo(
    () => products.filter((p) => Number(p.quantity) <= Number(p.lowStockThreshold)),
    [products]
  );

  const totalBuyValue = lowStockItems.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.buyPrice || 0), 0);
  const totalSellValue = lowStockItems.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.sellPrice || 0), 0);

  if (loading) {
    return <div className="loading">Loading low stock items...</div>;
  }

  return (
    <div className="low-page">
      <div className="low-content">
        <div className="low-header">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="title">Low Stock</h1>
          <div style={{ width: 40 }} />
        </div>

        <div className="summary-grid">
          <Card padding="md">
            <p className="s-label">Items</p>
            <p className="s-value">{lowStockItems.length}</p>
          </Card>
          <Card padding="md">
            <p className="s-label">Buy Value</p>
            <p className="s-value">₹{totalBuyValue.toFixed(2)}</p>
          </Card>
          <Card padding="md">
            <p className="s-label">Sell Value</p>
            <p className="s-value">₹{totalSellValue.toFixed(2)}</p>
          </Card>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="empty">No low-stock items right now.</div>
        ) : (
          <div className="list">
            {lowStockItems.map((p) => (
              <Card key={p.id} padding="md" onClick={() => router.push(`/inventory/${p.id}`)}>
                <div className="row">
                  <div>
                    <p className="name">{p.name}</p>
                    <p className="meta">{p.category} · {p.unit}</p>
                  </div>
                  <span className="badge">{Number(p.quantity)} / {Number(p.lowStockThreshold)}</span>
                </div>
                <div className="vals">
                  <span>Buy: ₹{(Number(p.buyPrice || 0) * Number(p.quantity || 0)).toFixed(2)}</span>
                  <span>Sell: ₹{(Number(p.sellPrice || 0) * Number(p.quantity || 0)).toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .low-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 88px; }
        .low-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .low-header { display:flex; align-items:center; justify-content:space-between; padding: 8px 0 20px; }
        .back-btn { width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,.05); border:none; display:flex; align-items:center; justify-content:center; }
        .title { color:#fff; font-size:20px; font-weight:700; }
        .summary-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-bottom:16px; }
        .s-label { font-size:12px; color: var(--text-muted); }
        .s-value { font-size:16px; font-weight:700; color:#fff; margin-top:4px; }
        .list { display:flex; flex-direction:column; gap:10px; }
        .row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        .name { font-size:15px; color:#fff; font-weight:600; }
        .meta { font-size:12px; color: var(--text-muted); margin-top:2px; }
        .badge { font-size:11px; font-weight:700; color:#F97316; background:rgba(249,115,22,.14); padding:4px 8px; border-radius:8px; }
        .vals { display:flex; justify-content:space-between; font-size:12px; color: var(--text-secondary); }
        .empty { text-align:center; color: var(--text-secondary); padding:28px 12px; background: rgba(37,37,64,.35); border-radius:14px; }
      `}</style>
    </div>
  );
}
