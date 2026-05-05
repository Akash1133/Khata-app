'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserStore } from '../../lib/store';
import { AuthService } from '../../lib/auth';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function SetupPage() {
  const router = useRouter();
  const existingUser = UserStore.get() || {};

  useEffect(() => {
    if (!existingUser.id) {
      router.replace('/auth/phone');
    }
  }, []);
  
  const [name, setName] = useState(existingUser.name && existingUser.name !== 'New User' ? existingUser.name : '');
  const [username, setUsername] = useState(existingUser.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(existingUser.email || '');
  const [businessName, setBusinessName] = useState(existingUser.businessName || '');
  const [gstin, setGstin] = useState(existingUser.gstin || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!username.trim()) newErrors.username = 'Username is required';
    if (password || confirmPassword) {
      if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const updated = await UserStore.updateProfile({ 
        name: name.trim(), 
        username: username.trim().toLowerCase(),
        password: password || undefined,
        email: email.trim(), 
        businessName: businessName.trim(),
        gstin: gstin.trim().toUpperCase()
      });

      if (updated) {
        // Brief success animation delay
        await new Promise((r) => setTimeout(r, 600));
        router.replace('/dashboard');
      } else {
        setErrors({ submit: 'Failed to save profile. Please try again.' });
      }
    } catch (err) {
      setErrors({ submit: 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
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
            id="setup-username"
            label="Username *"
            placeholder="unique username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>}
          />

          <Input
            id="setup-password"
            label="Password"
            type="password"
            placeholder="Leave blank to keep current"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
          />

          <Input
            id="setup-confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
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

          <Input
            id="setup-gstin"
            label="GSTIN"
            placeholder="22AAAAA0000A1Z5"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
          />

        <div className="setup-info">
          <p>Username can be changed later from your profile. Password is optional unless you want to update it.</p>
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
        .auth-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .auth-desc { font-size: 15px; color: var(--text-muted); }
        .setup-form {
          display: flex; flex-direction: column; gap: 20px;
          animation: fadeInUp 0.5s ease-out 0.1s both;
        }
        .setup-info {
          font-size: 13px; color: var(--text-muted);
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
