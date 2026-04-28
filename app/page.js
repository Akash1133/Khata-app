'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserStore } from './lib/store';
import Button from './components/Button';

export default function SplashPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const timer = setTimeout(() => {
      if (UserStore.isLoggedIn()) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
        setShow(true);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [router]);

  if (checking) {
    return (
      <div className="splash-screen">
        <div className="splash-logo-container">
          <img src="/branding/logo-light.png" alt="Profitly" className="theme-logo light-logo" style={{ maxWidth: '240px', animation: 'bounceIn 0.8s ease-out' }} />
          <img src="/branding/logo-dark.png" alt="Profitly" className="theme-logo dark-logo" style={{ maxWidth: '240px', animation: 'bounceIn 0.8s ease-out' }} />
          <div className="splash-loader">
            <div className="splash-loader-bar" />
          </div>
        </div>
        <style jsx>{`
          .splash-screen {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }
          .splash-logo-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            animation: fadeIn 0.6s ease-out;
          }
          .splash-icon {
            font-size: 72px;
            animation: bounceIn 0.8s ease-out;
          }
          .splash-title {
            font-family: var(--font-display);
            font-size: 36px;
            font-weight: 800;
            background: linear-gradient(135deg, #B68AFF, #7B42C4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .splash-loader {
            width: 120px;
            height: 3px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            overflow: hidden;
            margin-top: 8px;
          }
          .splash-loader-bar {
            width: 40%;
            height: 100%;
            background: linear-gradient(90deg, #7B42C4, #B68AFF);
            border-radius: 10px;
            animation: shimmerBar 1.2s ease-in-out infinite;
          }
          @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; } to { opacity: 1; }
          }
          @keyframes shimmerBar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="welcome-screen">
      <div className={`welcome-content ${show ? 'welcome-visible' : ''}`}>
        <div className="welcome-hero">
          <div className="welcome-glow" />
          <div style={{ position: 'relative', zIndex: 1, margin: '0 auto 12px' }}>
            <img src="/branding/logo-light.png" alt="Profitly" className="theme-logo light-logo" style={{ maxWidth: '280px', margin: '0 auto' }} />
            <img src="/branding/logo-dark.png" alt="Profitly" className="theme-logo dark-logo" style={{ maxWidth: '280px', margin: '0 auto' }} />
          </div>
          <p className="welcome-subtitle">Smart Business Ledger</p>
        </div>

        <div className="welcome-features">
          <div className="feature-item">
            <span className="feature-emoji">📦</span>
            <div>
              <p className="feature-title">Inventory Management</p>
              <p className="feature-desc">Track stock in real-time</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-emoji">📊</span>
            <div>
              <p className="feature-title">Profit & Loss</p>
              <p className="feature-desc">Auto-calculated reports</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-emoji">📒</span>
            <div>
              <p className="feature-title">Party Ledger</p>
              <p className="feature-desc">Track who owes what</p>
            </div>
          </div>
        </div>

        <div className="welcome-cta">
          <div className="cta-buttons">
            <Button
              id="get-started-btn"
              fullWidth
              size="lg"
              onClick={() => router.push('/auth/phone')}
            >
              Get Started
            </Button>
            <button 
              className="login-link-btn"
              onClick={() => router.push('/auth/phone')}
            >
              Already have an account? <span>Login</span>
            </button>
          </div>
          <p className="welcome-terms">By continuing, you agree to our Terms of Service</p>
        </div>
      </div>

      <style jsx>{`
        .welcome-screen {
          min-height: 100dvh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          padding: 0 24px;
        }
        .welcome-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 400px;
          margin: 0 auto;
          width: 100%;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease-out;
        }
        .welcome-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .welcome-hero {
          text-align: center;
          margin-bottom: 48px;
          position: relative;
        }
        .welcome-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(123,66,196,0.25) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .welcome-icon {
          font-size: 80px;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
        }
        .welcome-title {
          font-family: var(--font-display);
          font-size: 42px;
          font-weight: 800;
          background: linear-gradient(135deg, var(--text-primary), var(--text-accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
          z-index: 1;
        }
        .welcome-subtitle {
          font-size: 16px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .welcome-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 48px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          animation: fadeInUp 0.5s ease-out both;
        }
        .feature-item:nth-child(1) { animation-delay: 0.1s; }
        .feature-item:nth-child(2) { animation-delay: 0.2s; }
        .feature-item:nth-child(3) { animation-delay: 0.3s; }
        .feature-emoji { font-size: 28px; }
        .feature-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .feature-desc {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .welcome-cta {
          padding-bottom: 32px;
        }
        .cta-buttons {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .login-link-btn {
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
          padding: 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .login-link-btn span {
          color: #B68AFF;
          font-weight: 700;
        }
        .login-link-btn:hover {
          background: var(--bg-surface-hover);
          transform: translateY(-1px);
        }
        .login-link-btn:active {
          transform: translateY(0);
        }
        .welcome-terms {
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 16px;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
