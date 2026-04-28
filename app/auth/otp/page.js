'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '../../lib/auth';
import { UserStore } from '../../lib/store';
import Button from '../../components/Button';
import OtpInput from '../../components/OtpInput';

export default function OtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const p = AuthService.getPendingPhone();
    if (!p) { router.replace('/auth/phone'); return; }
    setPhone(p);
  }, [router]);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Auto-verify when all digits entered
  useEffect(() => {
    if (otp.length === 6) handleVerify();
  }, [otp]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await AuthService.verifyOtp(otp);
      if (result.success) {
        UserStore.save(result.user);
        const shouldSetup =
          result.isNewUser ||
          !result.user?.name ||
          result.user?.name === 'New User' ||
          !result.user?.businessName;
        if (shouldSetup) {
          router.push('/auth/setup');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(result.message);
        setOtp('');
      }
    } catch {
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setTimer(30);
    setError('');
    await AuthService.sendOtp(phone);
  };

  const maskedPhone = phone ? `+91 ${phone.slice(0, 2)}****${phone.slice(-4)}` : '';

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button className="auth-back" onClick={() => router.back()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h1 className="auth-title">Verify OTP</h1>
          <p className="auth-desc">
            Enter the 6-digit code sent to<br />
            <strong style={{ color: '#B68AFF' }}>{maskedPhone}</strong>
          </p>
        </div>

        <div className="otp-section">
          <OtpInput length={6} value={otp} onChange={setOtp} error={error} />

          <div className="resend-row">
            {canResend ? (
              <button className="resend-btn" onClick={handleResend}>
                Resend OTP
              </button>
            ) : (
              <span className="resend-timer">
                Resend in <strong>{timer}s</strong>
              </span>
            )}
          </div>

          <Button
            id="verify-otp-btn"
            fullWidth
            size="lg"
            loading={loading}
            disabled={otp.length < 6}
            onClick={handleVerify}
          >
            Verify & Continue
          </Button>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100dvh;
          background: var(--bg-primary);
          padding: 16px;
        }
        .auth-container { max-width: 400px; margin: 0 auto; }
        .auth-back {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(255,255,255,0.05); border: none;
          cursor: pointer; margin-bottom: 32px; margin-top: 8px;
          transition: background 0.2s;
        }
        .auth-back:hover { background: rgba(255,255,255,0.1); }
        .auth-header {
          margin-bottom: 40px;
          animation: fadeInUp 0.5s ease-out;
        }
        .auth-icon { font-size: 48px; margin-bottom: 16px; }
        .auth-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .auth-desc { font-size: 15px; color: var(--text-muted); line-height: 1.6; }
        .otp-section {
          display: flex; flex-direction: column; gap: 24px;
          animation: fadeInUp 0.5s ease-out 0.1s both;
        }
        .resend-row { text-align: center; }
        .resend-timer { font-size: 14px; color: var(--text-muted); }
        .resend-timer strong { color: #B68AFF; }
        .resend-btn {
          font-size: 14px; font-weight: 600; color: #7B42C4;
          background: none; border: none; cursor: pointer;
          padding: 8px 16px; border-radius: 8px;
          transition: background 0.2s;
        }
        .resend-btn:hover { background: rgba(123,66,196,0.1); }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
