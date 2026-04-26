'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '../../lib/auth';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function PhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      await AuthService.sendOtp(cleaned);
      router.push('/auth/otp');
    } catch {
      setError('Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button className="auth-back" onClick={() => router.back()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="auth-header">
          <div className="auth-icon">📱</div>
          <h1 className="auth-title">Enter your mobile number</h1>
          <p className="auth-desc">We&apos;ll send you a 6-digit verification code</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            id="phone-input"
            label="Mobile Number"
            type="tel"
            inputMode="numeric"
            prefix="+91"
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={12}
            error={error}
            autoFocus
          />

          <div className="auth-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6B80" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span>For testing, use OTP: <strong>123456</strong></span>
          </div>

          <Button
            id="send-otp-btn"
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={phone.replace(/\D/g, '').length < 10}
          >
            Send OTP
          </Button>
        </form>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100dvh;
          background: var(--bg-primary);
          padding: 16px;
        }
        .auth-container {
          max-width: 400px;
          margin: 0 auto;
        }
        .auth-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: none;
          cursor: pointer;
          margin-bottom: 32px;
          margin-top: 8px;
          transition: background 0.2s;
        }
        .auth-back:hover { background: rgba(255,255,255,0.1); }
        .auth-header {
          margin-bottom: 32px;
          animation: fadeInUp 0.5s ease-out;
        }
        .auth-icon { font-size: 48px; margin-bottom: 16px; }
        .auth-title {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }
        .auth-desc {
          font-size: 15px;
          color: #6B6B80;
          line-height: 1.5;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: fadeInUp 0.5s ease-out 0.1s both;
        }
        .auth-note {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #6B6B80;
          padding: 10px 14px;
          background: rgba(123,66,196,0.08);
          border-radius: 10px;
          border: 1px solid rgba(123,66,196,0.15);
        }
        .auth-note strong { color: #B68AFF; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
