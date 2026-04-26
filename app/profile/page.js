'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserStore, ProductStore, TransactionStore } from '../lib/store';
import Card from '../components/Card';
import Button from '../components/Button';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState([
    { label: 'Products', value: '...', emoji: '📦' },
    { label: 'Transactions', value: '...', emoji: '📜' },
    { label: 'Inventory Value', value: '...', emoji: '💰' },
  ]);

  const handleLogout = () => {
    UserStore.logout();
    router.replace('/');
  };

  useEffect(() => {
    const u = UserStore.get();
    if (!u) { router.replace('/'); return; }
    setUser(u);

    Promise.all([
      ProductStore.getTotalItems(),
      TransactionStore.getAll(),
      ProductStore.getTotalValue(),
    ]).then(([totalItems, allTxns, totalValue]) => {
      setStats([
        { label: 'Products', value: totalItems, emoji: '📦' },
        { label: 'Transactions', value: allTxns.length, emoji: '📜' },
        { label: 'Inventory Value', value: `₹${totalValue.toLocaleString('en-IN')}`, emoji: '💰' },
      ]);
    });
  }, [router]);

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <h1 className="profile-name">{user.name}</h1>
          <p className="profile-business">{user.businessName || 'My Business'}</p>
          <p className="profile-phone">📱 +91 {user.phone}</p>
          {user.email && <p className="profile-email">✉️ {user.email}</p>}
        </div>

        <div className="stats-row">
          {stats.map((s, i) => (
            <Card key={i} padding="sm">
              <p className="mini-stat-emoji">{s.emoji}</p>
              <p className="mini-stat-value">{s.value}</p>
              <p className="mini-stat-label">{s.label}</p>
            </Card>
          ))}
        </div>

        <div className="menu-list">
          <button className="menu-item" onClick={() => router.push('/inventory')}>
            <span>📦</span> <span>Manage Inventory</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="menu-item" onClick={() => router.push('/history')}>
            <span>📜</span> <span>Transaction History</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div className="logout-section">
          <Button variant="danger" fullWidth onClick={handleLogout} id="logout-btn">
            Logout
          </Button>
          <p className="version">Khata v1.0.0 · Made with ❤️</p>
        </div>
      </div>

      <style jsx>{`
        .profile-page { min-height:100dvh; background:var(--bg-primary); padding-bottom:88px; }
        .profile-content { max-width:480px; margin:0 auto; padding:16px; }
        .profile-header { text-align:center; padding:32px 0 28px; animation:fadeIn .5s ease-out; }
        .profile-avatar {
          width:80px; height:80px; border-radius:50%; margin:0 auto 16px;
          background:linear-gradient(135deg,#7B42C4,#5B2D8E);
          display:flex; align-items:center; justify-content:center;
          font-size:32px; font-weight:800; color:white;
          box-shadow:0 0 30px rgba(123,66,196,.3);
        }
        .profile-name { font-size:22px; font-weight:700; color:white; }
        .profile-business { font-size:14px; color:#A0A0B8; margin-top:4px; }
        .profile-phone { font-size:13px; color:#6B6B80; margin-top:8px; }
        .profile-email { font-size:13px; color:#6B6B80; margin-top:4px; }
        .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:28px; }
        .mini-stat-emoji { font-size:20px; margin-bottom:6px; }
        .mini-stat-value { font-size:16px; font-weight:700; color:white; }
        .mini-stat-label { font-size:11px; color:#6B6B80; margin-top:2px; }
        .menu-list { display:flex; flex-direction:column; gap:6px; margin-bottom:32px; }
        .menu-item {
          display:flex; align-items:center; gap:12px;
          padding:14px 16px; background:#252540; border-radius:12px;
          border:1px solid rgba(255,255,255,.04); cursor:pointer;
          font-size:14px; font-weight:500; color:white; transition:background .2s;
        }
        .menu-item span:first-child { font-size:20px; }
        .menu-item span:nth-child(2) { flex:1; }
        .menu-item:hover { background:#2D2D4A; }
        .logout-section { margin-top:16px; }
        .version { text-align:center; font-size:12px; color:#4A4A60; margin-top:16px; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}
