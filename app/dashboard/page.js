'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserStore, ProductStore, TransactionStore } from '../lib/store';
import Card from '../components/Card';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ todaySales: 0, monthSales: 0, totalProducts: 0, lowStock: 0 });
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const u = UserStore.get();
    if (!u) { router.replace('/'); return; }
    setUser(u);

    const loadStats = () => {
      Promise.all([
        TransactionStore.getTodayTotal(),
        TransactionStore.getMonthTotal(),
        ProductStore.getAll(),
      ]).then(([todaySales, monthSales, allProducts]) => {
        setStats({
          todaySales,
          monthSales,
          totalProducts: allProducts.length,
          lowStock: allProducts.filter(p => p.quantity <= p.lowStockThreshold).length,
        });
      });
      TransactionStore.getRecent(5).then(setTransactions);
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
    { emoji: '➕', label: 'Add Sale', color: '#22C55E', href: '/sale' },
    { emoji: '📦', label: 'Stock', color: '#4A6CF7', href: '/inventory' },
    { emoji: '📒', label: 'Khata', color: '#F97316', href: '/khata' },
    { emoji: '📊', label: 'P&L', color: '#EC4899', href: '/pl' },
  ];

  const formatCurrency = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
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
          <Card variant="gradient" padding="md" animate>
            <p className="stat-label">Today&apos;s Sales</p>
            <p className="stat-value stat-green">{formatCurrency(stats.todaySales)}</p>
          </Card>
          <Card variant="gradient" padding="md" animate>
            <p className="stat-label">This Month</p>
            <p className="stat-value stat-blue">{formatCurrency(stats.monthSales)}</p>
          </Card>
          <Card padding="md" animate>
            <p className="stat-label">Products</p>
            <p className="stat-value">{stats.totalProducts}</p>
          </Card>
          <Card padding="md" animate>
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
                    {t.type === 'sale' ? '+' : '-'}₹{t.amount}
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
        .dash-hello { font-size: 14px; color: #A0A0B8; margin-bottom: 4px; }
        .dash-business { font-size: 20px; font-weight: 700; color: white; }
        .dash-avatar {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7B42C4, #5B2D8E);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; color: white;
          cursor: pointer; transition: transform 0.2s;
        }
        .dash-avatar:active { transform: scale(0.9); }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 28px;
        }
        .stat-label { font-size: 12px; color: #A0A0B8; margin-bottom: 6px; font-weight: 500; }
        .stat-value { font-size: 24px; font-weight: 800; color: white; font-family: var(--font-display); }
        .stat-green { color: #22C55E; }
        .stat-blue { color: #4A6CF7; }
        .stat-red { color: #EF4444; }

        .section { margin-bottom: 28px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; }
        .section-title { font-size: 16px; font-weight: 700; color: white; margin-bottom: 14px; }
        .see-all {
          font-size: 13px; color: #7B42C4; font-weight: 600;
          background: none; border: none; cursor: pointer;
          padding: 4px 8px; border-radius: 6px; transition: background 0.2s;
        }
        .see-all:hover { background: rgba(123,66,196,0.1); }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .action-btn {
          display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          padding: 16px 8px;
          background: rgba(37, 37, 64, 0.5);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          cursor: pointer; transition: all 0.2s;
        }
        .action-btn:hover { background: rgba(37, 37, 64, 0.8); transform: translateY(-2px); }
        .action-btn:active { transform: scale(0.95); }
        .action-icon { font-size: 28px; }
        .action-label { font-size: 12px; font-weight: 600; color: #A0A0B8; }

        .empty-state {
          text-align: center;
          padding: 32px 16px;
          background: rgba(37, 37, 64, 0.3);
          border-radius: 16px;
          border: 1px dashed rgba(255,255,255,0.08);
        }
        .empty-icon { font-size: 40px; margin-bottom: 12px; }
        .empty-text { font-size: 15px; font-weight: 600; color: white; margin-bottom: 4px; }
        .empty-sub { font-size: 13px; color: #6B6B80; margin-bottom: 16px; }
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
          background: #252540; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .txn-icon { font-size: 24px; }
        .txn-info { flex: 1; }
        .txn-name { font-size: 14px; font-weight: 600; color: white; }
        .txn-date { font-size: 12px; color: #6B6B80; margin-top: 2px; }
        .txn-amount { font-size: 15px; font-weight: 700; }
        .txn-green { color: #22C55E; }
        .txn-red { color: #EF4444; }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
