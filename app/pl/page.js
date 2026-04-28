'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionStore } from '../lib/store';

export default function ProfitLossPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      TransactionStore.getAll().then(data => {
        setTransactions(data);
        setLoading(false);
      });
    };
    load();
    const handleVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('focus', load);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('focus', load);
    };
  }, []);

  // Margin-based calculation
  let totalSalesRevenue = 0;
  let totalCOGS = 0; // Cost of Goods Sold
  let grossProfit = 0;

  // Other cash-flow metrics
  let totalPurchases = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    if (t.type === 'sale') {
      totalSalesRevenue += t.amount;
      // Calculate COGS from items
      if (t.items) {
        t.items.forEach(item => {
          const buyPrice = item.buyPrice || 0;
          totalCOGS += (item.quantity * buyPrice);
          grossProfit += (item.quantity * (item.price - buyPrice));
        });
      }
    } else if (t.type === 'return') {
      totalSalesRevenue -= t.amount;
      if (t.items) {
        t.items.forEach(item => {
          const buyPrice = item.buyPrice || 0;
          totalCOGS -= (item.quantity * buyPrice);
          grossProfit -= (item.quantity * (item.price - buyPrice));
        });
      }
    } else if (t.type === 'purchase') {
      totalPurchases += t.amount;
    } else if (t.type === 'payment_out' && !t.partyId) {
      // If payment out has no party, it could be a general expense
      totalExpenses += t.amount;
    }
  });

  const handleDownload = () => {
    const csvContent = [
      ['Profit & Loss Report'],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['Metric', 'Amount (INR)'],
      ['Total Sales Revenue', totalSalesRevenue],
      ['Cost of Goods Sold (COGS)', totalCOGS],
      ['Gross Profit', grossProfit],
      ['Total Purchases', totalPurchases],
      ['Other Expenses', totalExpenses]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PL_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="pl-page">
      <div className="pl-content">
        <div className="header">
          <button className="back-btn" onClick={() => router.push('/dashboard')}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1>Profit & Loss</h1>
          <button className="download-btn" onClick={handleDownload} title="Download Report">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
        </div>

        <div className="report-card primary-card">
          <p className="card-label">Gross Profit (Margin-Based)</p>
          <h2 className={`card-value ${grossProfit >= 0 ? 'green' : 'red'}`}>
            {grossProfit >= 0 ? '+' : '-'}₹{Math.abs(grossProfit)}
          </h2>
          <p className="card-sub">Calculated as (Sell Price - Buy Price) × Qty Sold</p>
        </div>

        <div className="breakdown-grid">
          <div className="breakdown-card">
            <div className="bd-icon green-bg">💰</div>
            <p className="bd-label">Sales Revenue</p>
            <p className="bd-value">₹{totalSalesRevenue}</p>
          </div>
          <div className="breakdown-card">
            <div className="bd-icon red-bg">📉</div>
            <p className="bd-label">Cost of Goods Sold</p>
            <p className="bd-value">₹{totalCOGS}</p>
          </div>
          <div className="breakdown-card">
            <div className="bd-icon blue-bg">📦</div>
            <p className="bd-label">Total Purchases</p>
            <p className="bd-value">₹{totalPurchases}</p>
          </div>
        </div>

        <div className="section">
          <h3>Margin Overview</h3>
          <div className="list-card">
            <div className="list-row">
              <span>Total Revenue from Sales</span>
              <span>₹{totalSalesRevenue}</span>
            </div>
            <div className="list-row">
              <span>Less: Cost of Goods Sold (COGS)</span>
              <span className="red">- ₹{totalCOGS}</span>
            </div>
            <div className="list-row total-row">
              <span>Gross Profit</span>
              <span className={grossProfit >= 0 ? 'green' : 'red'}>₹{grossProfit}</span>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .pl-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 88px; color: var(--text-primary); }
        .pl-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-top: 8px; }
        .back-btn, .download-btn { background: rgba(255,255,255,0.05); border: none; width: 40px; height: 40px; border-radius: 12px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .back-btn:hover, .download-btn:hover { background: rgba(255,255,255,0.1); }
        .header h1 { font-size: 20px; font-weight: 700; margin: 0; flex: 1; text-align: center; }
        
        .report-card { background: var(--bg-surface-solid); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.04); }
        .primary-card { background: linear-gradient(135deg, rgba(123,66,196,0.2), rgba(91,45,142,0.1)); border-color: rgba(123,66,196,0.3); }
        .card-label { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .card-value { font-size: 36px; font-weight: 800; font-family: var(--font-display); }
        .card-value.green { color: var(--color-success); }
        .card-value.red { color: var(--color-danger); }
        .card-sub { font-size: 12px; color: var(--text-muted); margin-top: 8px; }

        .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .breakdown-card { background: var(--bg-surface-solid); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); }
        .bd-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 12px; }
        .green-bg { background: rgba(34, 197, 94, 0.2); }
        .red-bg { background: rgba(239, 68, 68, 0.2); }
        .blue-bg { background: rgba(74, 108, 247, 0.2); }
        .bd-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
        .bd-value { font-size: 18px; font-weight: 700; }

        .section h3 { font-size: 16px; margin-bottom: 12px; color: var(--text-secondary); }
        .list-card { background: var(--bg-surface-solid); border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); overflow: hidden; }
        .list-row { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 14px; }
        .list-row:last-child { border-bottom: none; }
        .total-row { font-weight: 700; font-size: 16px; background: rgba(255,255,255,0.02); }
        .green { color: var(--color-success); }
        .red { color: var(--color-danger); }

        .loading { color: var(--text-primary); text-align: center; padding: 40px; }
      `}</style>
    </div>
  );
}
