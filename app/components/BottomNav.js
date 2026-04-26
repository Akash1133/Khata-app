'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#7B42C4' : '#6B6B80'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#7B42C4' : '#6B6B80'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    label: 'History',
    href: '/history',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#7B42C4' : '#6B6B80'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#7B42C4' : '#6B6B80'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on auth pages and splash
  const hideOn = ['/', '/auth/phone', '/auth/otp', '/auth/setup'];
  if (hideOn.includes(pathname)) return null;

  return (
    <nav className="bottom-nav" id="bottom-navigation">
      <div className="bottom-nav-inner">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <div className="nav-icon">
                {item.icon(isActive)}
                {isActive && <div className="nav-active-dot" />}
              </div>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(13, 13, 26, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .bottom-nav-inner {
          display: flex;
          justify-content: space-around;
          align-items: center;
          max-width: 480px;
          margin: 0 auto;
          padding: 8px 0 6px;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 4px 16px;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
        }

        .nav-item:active {
          transform: scale(0.92);
        }

        .nav-icon {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
        }

        .nav-active-dot {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #7B42C4;
          animation: scaleIn 0.3s ease-out;
        }

        .nav-label {
          font-size: 11px;
          font-weight: 500;
          color: #6B6B80;
          transition: color 0.2s ease;
        }

        .nav-item-active .nav-label {
          color: #B68AFF;
          font-weight: 600;
        }

        @keyframes scaleIn {
          from { transform: translateX(-50%) scale(0); }
          to { transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </nav>
  );
}
