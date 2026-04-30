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
    }
    setCanResend(true);
  }, [timer]);

  useEffect(() => {
    if (otp.length === 6) handleVerify();
  }, [otp]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    const result = await AuthService.verifyOtp(otp);
    setLoading(false);
    if (!result.success) {
      setError(result.message || 'Invalid OTP');
      setOtp('');
      return;
    }
    UserStore.save(result.user);
    const shouldSetup =
      result.isNewUser ||
      !result.user?.name ||
      result.user?.name === 'New User' ||
      !result.user?.businessName;
    router.push(shouldSetup ? '/auth/setup' : '/dashboard');
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h1 className="auth-title">Verify OTP</h1>
          <p className="auth-desc">Enter code sent to <strong style={{ color: '#B68AFF' }}>{maskedPhone}</strong></p>
        </div>

        <div className="otp-section">
          <OtpInput length={6} value={otp} onChange={setOtp} error={error} />
          <div className="resend-row">
            {canResend ? (
              <button className="resend-btn" onClick={handleResend}>Resend OTP</button>
            ) : (
              <span className="resend-timer">Resend in <strong>{timer}s</strong></span>
            )}
          </div>
          <Button fullWidth size="lg" loading={loading} disabled={otp.length < 6} onClick={handleVerify}>
            Verify & Continue
          </Button>
        </div>
      </div>

      <style jsx>{`
        .auth-page { min-height: 100dvh; background: var(--bg-primary); padding: 16px; }
        .auth-container { max-width: 400px; margin: 0 auto; }
        .auth-back {
          width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05);
          border: none; margin: 8px 0 32px; display: flex; align-items: center; justify-content: center;
        }
        .auth-header { margin-bottom: 34px; }
        .auth-icon { font-size: 48px; margin-bottom: 16px; }
        .auth-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .auth-desc { color: var(--text-muted); font-size: 15px; }
        .otp-section { display: flex; flex-direction: column; gap: 22px; }
        .resend-row { text-align: center; }
        .resend-timer { font-size: 14px; color: var(--text-muted); }
        .resend-btn { font-size: 14px; font-weight: 600; color: #7B42C4; }
      `}</style>
    </div>
  );
}
