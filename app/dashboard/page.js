'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserStore, ProductStore, TransactionStore } from '../lib/store';
import Card from '../components/Card';
import { computeBusinessScore, getScoreLabel } from '../lib/scoreEngine';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ todaySales: 0, monthSales: 0, totalProducts: 0, lowStock: 0 });
  const [transactions, setTransactions] = useState([]);
  const [showBalances, setShowBalances] = useState(false);
  const [bizScore, setBizScore] = useState(null);


  // Replaced manual month series with getDailyStats from store

  useEffect(() => {
    const u = UserStore.get();
    if (!u) { router.replace('/'); return; }
    setUser(u);

    const loadStats = () => {
      Promise.all([
        TransactionStore.getTodayTotal(),
        TransactionStore.getMonthTotal(),
        ProductStore.getAll(),
        TransactionStore.getAll(),
      ]).then(([todaySales, monthSales, allProducts, allTxns]) => {
        setStats({
          todaySales,
          monthSales,
          totalProducts: allProducts.length,
          lowStock: allProducts.filter(p => p.quantity <= p.lowStockThreshold).length,
        });
        setTransactions(
          allTxns
            .filter((t) => t.type === 'sale')
            .slice(0, 5)
        );
        // Compute business score
        const scoreResult = computeBusinessScore(allTxns, allProducts);
        setBizScore(scoreResult);
      });
    };

    loadStats();

    // Refresh stats when user navigates back to this page
    const handleFocus = () => loadStats();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') loadStats();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  if (!user) return null;

  const quickActions = [
    { emoji: '➕', label: 'Add Sale', color: 'var(--icon-active)', href: '/sale' },
    { emoji: '📦', label: 'Inventory', color: '#4A6CF7', href: '/inventory' },
    { emoji: '🛒', label: 'Buy Stock', color: '#10B981', href: '/purchase' },
    { emoji: '📒', label: 'Ledger', color: '#F97316', href: '/khata' },
    { emoji: '📊', label: 'P&L', color: '#EC4899', href: '/pl' },
    { emoji: '🧠', label: 'Insights', color: '#8B5CF6', href: '/insights' },
  ];

  const formatCurrency = (n) => {
    if (!showBalances) return '₹ ****';
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(2)}K`;
    return `₹${Number(n).toFixed(2)}`;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-content">
        {/* Header */}
        <div className="dash-header">
          <div className="dash-greeting">
            <p className="dash-hello">👋 Hello, {user.name?.split(' ')[0]}</p>
            <h1 className="dash-business">{user.businessName || 'My Business'}</h1>
          </div>
          <div className="dash-avatar" onClick={() => router.push('/profile')}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <Card
            variant="gradient"
            padding="md"
            animate
            onClick={() => router.push('/history?filter=sale&period=today')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="stat-label">Today&apos;s Sales</p>
              <span onClick={(e) => { e.stopPropagation(); setShowBalances(!showBalances); }} style={{cursor: 'pointer', opacity: 0.7, display: 'flex', alignItems: 'center'}}>
                {showBalances ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
              </span>
            </div>
            <p className="stat-value stat-green">{formatCurrency(stats.todaySales)}</p>
          </Card>
          <Card variant="gradient" padding="md" animate onClick={() => router.push('/analytics')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="stat-label">This Month <span style={{fontSize:'10px'}}>▼</span></p>
              <span onClick={(e) => { e.stopPropagation(); setShowBalances(!showBalances); }} style={{cursor: 'pointer', opacity: 0.7, display: 'flex', alignItems: 'center'}}>
                {showBalances ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
              </span>
            </div>
            <p className="stat-value stat-blue">{formatCurrency(stats.monthSales)}</p>
          </Card>
          <Card padding="md" animate onClick={() => router.push('/inventory')}>
            <p className="stat-label">Products</p>
            <p className="stat-value">{stats.totalProducts}</p>
          </Card>
          <Card padding="md" animate onClick={() => router.push('/inventory/low-stock')}>
            <p className="stat-label">Low Stock</p>
            <p className="stat-value stat-red">{stats.lowStock}</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((a, i) => (
              <button
                key={i}
                className="action-btn"
                onClick={() => router.push(a.href)}
                style={{ '--ac': a.color }}
                id={`action-${a.label.toLowerCase().replace(' ', '-')}`}
              >
                <div className="action-icon">{a.emoji}</div>
                <span className="action-label">{a.label}</span>
              </button>
            ))}
          </div>
        </div>



        {/* Insights Score Banner */}
        {bizScore && (
          <button className="score-banner" onClick={() => router.push('/insights')}>
            <div className="score-banner-left">
              <span className="score-banner-emoji">{bizScore.grade.emoji}</span>
              <div>
                <p className="score-banner-label">Business Health Score</p>
                <p className="score-banner-grade" style={{ color: bizScore.grade.color }}>{bizScore.grade.label}</p>
              </div>
            </div>
            <div className="score-banner-right">
              <div className="score-banner-ring" style={{ '--sc': bizScore.grade.color }}>
                <span className="score-banner-num">{bizScore.score}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color:'var(--text-muted)'}}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        )}

        {/* Recent Transactions */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <button className="see-all" onClick={() => router.push('/history')}>See All</button>
          </div>
          {transactions.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">📋</p>
              <p className="empty-text">No transactions yet</p>
              <p className="empty-sub">Start by adding your inventory</p>
              <button className="empty-cta" onClick={() => router.push('/inventory')}>
                Add Inventory →
              </button>
            </div>
          ) : (
            <div className="txn-list">
              {transactions.map((t) => (
                <div key={t.id} className="txn-item">
                  <div className="txn-icon">
                    {t.type === 'sale' ? '💰' : t.type === 'purchase' ? '📦' : '💳'}
                  </div>
                  <div className="txn-info">
                    <p className="txn-name">{t.partyName || t.type}</p>
                    <p className="txn-date">{new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <p className={`txn-amount ${t.type === 'sale' ? 'txn-green' : 'txn-red'}`}>
                    {t.type === 'sale' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard-page {
          min-height: 100dvh;
          background: var(--bg-primary);
          padding-bottom: 88px;
        }
        .dashboard-content {
          max-width: 480px;
          margin: 0 auto;
          padding: 16px;
        }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0 24px;
          animation: fadeInDown 0.5s ease-out;
        }
        .dash-hello { font-size: 14px; color: var(--text-secondary); margin-bottom: 4px; }
        .dash-business { font-size: 20px; font-weight: 700; color: var(--text-primary); }
        .dash-avatar {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7B42C4, #5B2D8E);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; color: var(--text-primary);
          cursor: pointer; transition: transform 0.2s;
        }
        .dash-avatar:active { transform: scale(0.9); }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 28px;
        }
        .stat-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
        .stat-value { font-size: 24px; font-weight: 800; color: var(--text-primary); font-family: var(--font-display); }
        .stat-green { color: var(--text-primary); }
        .stat-blue { color: var(--text-primary); }
        .stat-red { color: var(--text-primary); }

        .section { margin-bottom: 28px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; }
        .section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; }
        .section-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
        .see-all {
          font-size: 13px; color: #7B42C4; font-weight: 600;
          background: none; border: none; cursor: pointer;
          padding: 4px 8px; border-radius: 6px; transition: background 0.2s;
        }
        .see-all:hover { background: var(--bg-purple-subtle); }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .action-btn {
          display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          padding: 16px 8px;
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          cursor: pointer; transition: all 0.2s;
        }
        .action-btn:hover { background: var(--bg-surface-hover); transform: translateY(-2px); }
        .action-btn:active { transform: scale(0.95); }
        .action-icon { font-size: 28px; }
        .action-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }

        /* Score Banner */
        .score-banner {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 16px 18px; margin-bottom: 24px;
          background: linear-gradient(135deg, rgba(123,66,196,0.14), rgba(74,108,247,0.08));
          border: 1px solid rgba(123,66,196,0.25);
          border-radius: 18px; cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease;
          text-align: left;
        }
        .score-banner:hover { transform: translateY(-2px); border-color: rgba(123,66,196,0.4); }
        .score-banner-left { display: flex; align-items: center; gap: 12px; }
        .score-banner-emoji { font-size: 28px; }
        .score-banner-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
        .score-banner-grade { font-size: 14px; font-weight: 700; }
        .score-banner-right { display: flex; align-items: center; gap: 10px; }
        .score-banner-ring {
          width: 52px; height: 52px; border-radius: 50%;
          background: conic-gradient(var(--sc, #7B42C4) calc(var(--score-pct, 0.7) * 360deg), rgba(255,255,255,0.06) 0);
          display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 0 0 7px var(--bg-primary);
          position: relative;
        }
        .score-banner-num { font-size: 14px; font-weight: 800; color: var(--text-primary); }



        .empty-state {
          text-align: center;
          padding: 32px 16px;
          background: var(--bg-surface-subtle);
          border-radius: 16px;
          border: 1px dashed var(--border-color);
        }
        .empty-icon { font-size: 40px; margin-bottom: 12px; }
        .empty-text { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
        .empty-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
        .empty-cta {
          font-size: 14px; font-weight: 600; color: #7B42C4;
          background: rgba(123,66,196,0.12); border: none;
          padding: 10px 20px; border-radius: 10px; cursor: pointer;
          transition: background 0.2s;
        }
        .empty-cta:hover { background: rgba(123,66,196,0.2); }

        .txn-list { display: flex; flex-direction: column; gap: 8px; }
        .txn-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: var(--bg-surface-solid); border-radius: 12px;
          border: 1px solid var(--border-color);
        }
        .txn-icon { font-size: 24px; }
        .txn-info { flex: 1; }
        .txn-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .txn-date { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .txn-amount { font-size: 15px; font-weight: 700; }
        .txn-green { color: var(--color-success); }
        .txn-red { color: var(--color-danger); }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
