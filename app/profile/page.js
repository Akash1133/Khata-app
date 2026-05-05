'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserStore, ProductStore, TransactionStore } from '../lib/store';
import Card from '../components/Card';
import Button from '../components/Button';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ur', label: 'Urdu' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'id', label: 'Indonesian' },
];

const THEMES = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System Default' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [showPreferences, setShowPreferences] = useState(false);
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [stats, setStats] = useState([
    { label: 'Products', value: '...', emoji: '📦' },
    { label: 'Transactions', value: '...', emoji: '📜' },
    { label: 'Inventory Value', value: '...', emoji: '💰' },
  ]);

  const applyTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('khata_pref_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    setShowThemeOptions(false);
  };


  const applyLanguage = (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('khata_pref_language', langCode);
    const value = `/en/${langCode}`;
    document.cookie = `googtrans=${value};path=/;max-age=31536000`;
    if (window.location.hostname.includes('.')) {
      document.cookie = `googtrans=${value};path=/;domain=${window.location.hostname};max-age=31536000`;
    }
    window.location.reload();
  };

  const handleLogout = () => {
    UserStore.logout();
    router.replace('/');
  };

  useEffect(() => {
    const u = UserStore.get();
    if (!u) {
      router.replace('/');
      return;
    }
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

    setTheme(localStorage.getItem('khata_pref_theme') || 'light');
    setLanguage(localStorage.getItem('khata_pref_language') || 'en');
  }, [router]);

  if (!user) return null;

  const currentLanguage = LANGUAGES.find((l) => l.code === language)?.label || 'English';
  const currentTheme = THEMES.find((t) => t.key === theme)?.label || 'Light';
  return (
    <div className="profile-page">
      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
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
          <button className="menu-item" onClick={() => router.push('/auth/setup')}>
            <span className="menu-icon">✏️</span><span className="menu-text">Edit Profile</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="menu-item" onClick={() => router.push('/inventory')}>
            <span className="menu-icon">📦</span><span className="menu-text">Manage Inventory</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button
            className="menu-item"
            onClick={() => setShowPreferences((v) => !v)}
            aria-expanded={showPreferences}
          >
            <span className="menu-icon">⚙️</span><span className="menu-text">Preferences</span>
            <svg className={`menu-chevron ${showPreferences ? 'menu-chevron-open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div className={`pref-expand ${showPreferences ? 'pref-expand-open' : ''}`}>
            <button className="pref-parent-row" onClick={() => setShowLanguageOptions((v) => !v)}>
              <span>Language</span>
              <span className="pref-current">{currentLanguage}</span>
            </button>
            <div className={`pref-options ${showLanguageOptions ? 'pref-options-open' : ''}`}>
              {LANGUAGES.map((l) => (
                <button key={l.code} className={`pref-option ${language === l.code ? 'selected' : ''}`} onClick={() => applyLanguage(l.code)}>
                  <span>{l.label}</span>
                  <span>{language === l.code ? '✓' : ''}</span>
                </button>
              ))}
            </div>

            <button className="pref-parent-row" onClick={() => setShowThemeOptions((v) => !v)}>
              <span>Theme</span>
              <span className="pref-current">{currentTheme}</span>
            </button>
            <div className={`pref-options ${showThemeOptions ? 'pref-options-open' : ''}`}>
              {THEMES.map((t) => (
                <button key={t.key} className={`pref-option ${theme === t.key ? 'selected' : ''}`} onClick={() => applyTheme(t.key)}>
                  <span>{t.label}</span>
                  <span>{theme === t.key ? '✓' : ''}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="menu-item" onClick={() => router.push('/history')}>
            <span className="menu-icon">📜</span><span className="menu-text">Transaction History</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div className="logout-section">
          <Button variant="danger" fullWidth onClick={handleLogout} id="logout-btn">
            Logout
          </Button>
          <p className="version">Profitly v1.0.0</p>
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
          font-size:32px; font-weight:800; color:#fff;
          box-shadow:0 0 30px rgba(123,66,196,.3);
        }
        .profile-name { font-size:22px; font-weight:700; color:var(--text-primary); }
        .profile-business { font-size:14px; color:var(--text-secondary); margin-top:4px; }
        .profile-phone, .profile-email { font-size:13px; color:var(--text-muted); margin-top:6px; }
        .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:24px; }
        .mini-stat-emoji { font-size:20px; margin-bottom:6px; }
        .mini-stat-value { font-size:16px; font-weight:700; color:var(--text-primary); }
        .mini-stat-label { font-size:11px; color:var(--text-muted); margin-top:2px; }
        .menu-list { display:flex; flex-direction:column; gap:6px; margin-bottom:28px; }
        .menu-item {
          display:flex; align-items:center; gap:12px;
          padding:14px 16px; background:var(--bg-card); border-radius:12px;
          border:1px solid var(--border-color); cursor:pointer;
          font-size:14px; font-weight:500; color:var(--text-primary); transition:background .2s;
          min-height: 52px;
        }
        .menu-icon {
          width: 22px;
          font-size:20px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .menu-text {
          flex:1;
          text-align:left;
          line-height: 1.2;
          display: inline-flex;
          align-items: center;
          min-height: 20px;
        }
        .menu-item svg {
          display: block;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .menu-chevron { transition: transform .22s ease; }
        .menu-chevron-open { transform: rotate(90deg); }
        .menu-item:hover { background:var(--bg-card-hover); }
        .menu-value { font-size:12px; color:var(--text-secondary); }
        .pref-expand {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transform: translateY(-3px);
          transition: max-height .3s ease, opacity .24s ease, transform .24s ease;
        }
        .pref-expand-open {
          max-height: 560px;
          opacity: 1;
          transform: translateY(0);
          margin: 2px 0 8px;
        }
        .pref-parent-row {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border-radius: 10px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 600;
        }
        .pref-current { color: var(--text-secondary); font-weight: 500; }
        .pref-options {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height .24s ease, opacity .2s ease;
        }
        .pref-options-open {
          max-height: 360px;
          opacity: 1;
          margin-bottom: 8px;
        }
        .pref-option {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border-radius: 8px;
          margin-bottom: 4px;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
        }
        .pref-option.selected {
          border-color: rgba(123,66,196,.45);
          color: var(--text-accent);
          font-weight: 700;
        }
        .logout-section { margin-top:16px; }
        .version { text-align:center; font-size:12px; color:var(--text-muted); margin-top:16px; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}
