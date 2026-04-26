'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserStore } from '../../lib/store';
import { AuthService } from '../../lib/auth';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setLoading(true);
    const phone = AuthService.getPendingPhone() || '';
    UserStore.save({ name: name.trim(), phone, email: email.trim(), businessName: businessName.trim() });

    // Brief success animation delay
    await new Promise((r) => setTimeout(r, 600));
    router.replace('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-icon">✨</div>
          <h1 className="auth-title">Set up your profile</h1>
          <p className="auth-desc">Tell us about you and your business</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <Input
            id="setup-name"
            label="Your Name *"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors({}); }}
            error={errors.name}
            autoFocus
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          />

          <Input
            id="setup-business"
            label="Business / Shop Name"
            placeholder="e.g. Sharma General Store"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
          />

          <Input
            id="setup-email"
            label="Email (for recovery)"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
          />

          <div className="setup-info">
            <p>📱 You can always update these later from your profile</p>
          </div>

          <Button id="complete-setup-btn" type="submit" fullWidth size="lg" loading={loading}>
            Complete Setup
          </Button>
        </form>
      </div>

      <style jsx>{`
        .auth-page { min-height: 100dvh; background: var(--bg-primary); padding: 16px; }
        .auth-container { max-width: 400px; margin: 0 auto; }
        .auth-header { margin-bottom: 32px; margin-top: 40px; animation: fadeInUp 0.5s ease-out; }
        .auth-icon { font-size: 48px; margin-bottom: 16px; }
        .auth-title { font-size: 24px; font-weight: 700; color: white; margin-bottom: 8px; }
        .auth-desc { font-size: 15px; color: #6B6B80; }
        .setup-form {
          display: flex; flex-direction: column; gap: 20px;
          animation: fadeInUp 0.5s ease-out 0.1s both;
        }
        .setup-info {
          font-size: 13px; color: #6B6B80;
          padding: 12px 14px; background: rgba(255,255,255,0.03);
          border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
