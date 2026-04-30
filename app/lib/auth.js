'use client';

export const AuthService = {
  async sendOtp(phoneNumber) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('khata_pending_phone', phoneNumber);
    }
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error || 'OTP sent successfully' };
    } catch {
      return { success: false, message: 'Network error sending OTP' };
    }
  },

  async verifyOtp(enteredOtp) {
    if (typeof window === 'undefined') return { success: false, message: 'Session unavailable' };
    const phone = sessionStorage.getItem('khata_pending_phone');
    if (!phone) return { success: false, message: 'Session expired' };

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp: enteredOtp })
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, message: data.error || 'Invalid OTP' };
      sessionStorage.removeItem('khata_pending_phone');
      return { success: true, user: data.user, isNewUser: data.isNewUser };
    } catch {
      return { success: false, message: 'Network error verifying OTP' };
    }
  },

  getPendingPhone() {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('khata_pending_phone');
  },

  async login(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Login failed' };
      return { success: true, user: data.user, isNewUser: data.isNewUser };
    } catch {
      return { success: false, message: 'Network error while logging in' };
    }
  },

  async register({ username, password, name }) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Signup failed' };
      return { success: true, user: data.user, isNewUser: data.isNewUser };
    } catch {
      return { success: false, message: 'Network error while creating account' };
    }
  },

  async loginWithGoogle(credential) {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Google sign-in failed' };
      return { success: true, user: data.user, isNewUser: data.isNewUser };
    } catch {
      return { success: false, message: 'Network error with Google sign-in' };
    }
  }
};
