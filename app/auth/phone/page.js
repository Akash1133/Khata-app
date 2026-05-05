'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { AuthService } from '../../lib/auth';
import { UserStore } from '../../lib/store';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | signup
  const [form, setForm] = useState({ username: '', password: '', name: '', gstin: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const handleAuthSuccess = (result) => {
    UserStore.save(result.user);
    const shouldSetup =
      result.isNewUser ||
      !result.user?.name ||
      result.user?.name === 'New User' ||
      !result.user?.businessName;
    router.push(shouldSetup ? '/auth/setup' : '/dashboard');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      username: form.username.trim().toLowerCase(),
      password: form.password
    };
    const result = mode === 'login'
      ? await AuthService.login(payload.username, payload.password)
      : await AuthService.register({ ...payload, name: form.name.trim(), gstin: form.gstin.trim().toUpperCase() });

    setLoading(false);
    if (!result.success) return setError(result.message);
    handleAuthSuccess(result);
  };

  const onOtpLogin = async (e) => {
    e.preventDefault();
    setError('');
    const cleaned = otpPhone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit mobile number for OTP login.');
      return;
    }
    setOtpLoading(true);
    const res = await AuthService.sendOtp(cleaned);
    setOtpLoading(false);
    if (!res.success) {
      setError(res.message || 'Failed to send OTP.');
      return;
    }
    router.push('/auth/otp');
  };

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        const result = await AuthService.loginWithGoogle(response.credential);
        if (!result.success) return setError(result.message);
        handleAuthSuccess(result);
      }
    });
    const el = document.getElementById('google-signin-btn');
    if (el) {
      window.google.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320
      });
    }
  }, [mode]);

  return (
    <div className="auth-page">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div className="auth-container">
        <button className="auth-back" onClick={() => router.back()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Login
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <div className="auth-header">
          <div className="auth-icon">{mode === 'login' ? '🔐' : '✨'}</div>
          <h1 className="auth-title">{mode === 'login' ? 'Login to Profitly' : 'Create Account'}</h1>
          <p className="auth-desc">{mode === 'login' ? 'Use your username and password' : 'Set a unique username and password'}</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          {mode === 'signup' && (
            <>
              <Input id="name-input" label="Name *" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input id="gstin-input" label="GSTIN" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
            </>
          )}
          <Input id="username-input" label="Username *" placeholder="e.g. amit.store" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoFocus />
          <Input id="password-input" label="Password *" type="password" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

          {error && <div className="error-banner">{error}</div>}

          <Button id="auth-submit-btn" type="submit" fullWidth size="lg" loading={loading}>
            {mode === 'login' ? 'Login' : 'Create Account'}
          </Button>
        </form>

        <div className="or">or</div>
        <div id="google-signin-btn" className="google-btn-wrap" />

        <div className="or">or use OTP</div>
        <form onSubmit={onOtpLogin} className="otp-form">
          <Input
            id="otp-phone"
            label="Mobile Number (Existing Users) *"
            type="tel"
            inputMode="numeric"
            prefix="+91"
            placeholder="98765 43210"
            value={otpPhone}
            onChange={(e) => setOtpPhone(e.target.value)}
            maxLength={12}
          />
          <Button type="submit" fullWidth size="md" loading={otpLoading}>Send OTP</Button>
        </form>
      </div>

      <style jsx>{`
        .auth-page { min-height: 100dvh; background: var(--bg-primary); padding: 16px; }
        .auth-container { max-width: 400px; margin: 0 auto; }
        .auth-back {
          width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05);
          border: none; display: flex; align-items: center; justify-content: center; margin: 8px 0 32px; cursor: pointer;
        }
        .auth-header { margin-bottom: 28px; }
        .auth-icon { font-size: 46px; margin-bottom: 14px; }
        .auth-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .auth-desc { font-size: 14px; color: var(--text-muted); }
        .mode-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          padding: 4px;
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          margin-bottom: 18px;
        }
        .mode-btn {
          min-height: 42px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-secondary);
          background: transparent;
          transition: all 0.2s ease;
        }
        .mode-btn.active {
          background: var(--accent-gradient);
          color: #fff;
          box-shadow: var(--shadow-card);
        }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .error-banner {
          background: rgba(239, 68, 68, 0.1); color: #EF4444; padding: 10px 12px;
          border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 10px; font-size: 13px;
        }
        .or { text-align: center; color: var(--text-muted); margin: 16px 0 10px; font-size: 13px; }
        .google-btn-wrap { display: flex; justify-content: center; min-height: 46px; }
        .otp-form { margin-top: 4px; display: flex; flex-direction: column; gap: 12px; }
      `}</style>
    </div>
  );
}
