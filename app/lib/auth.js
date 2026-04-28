'use client';

// ========== MOCK AUTH HELPERS ==========
// Simulates OTP authentication until Supabase integration

const OTP_KEY = 'khata_pending_otp';
const PHONE_KEY = 'khata_pending_phone';

export const AuthService = {
  // Send OTP
  async sendOtp(phoneNumber) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PHONE_KEY, phoneNumber);
    }
    
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error || 'OTP sent successfully' };
    } catch (error) {
      return { success: false, message: 'Network error sending OTP' };
    }
  },

  // Verify OTP
  async verifyOtp(enteredOtp) {
    if (typeof window === 'undefined') return { success: false };

    const phone = sessionStorage.getItem(PHONE_KEY);
    if (!phone) return { success: false, message: 'Session expired' };

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp: enteredOtp })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Clear pending phone
        sessionStorage.removeItem(PHONE_KEY);
        // Return server flags so caller can route new users to setup flow
        return { success: true, phone, user: data.user, isNewUser: data.isNewUser };
      }
      return { success: false, message: data.error || 'Invalid OTP' };
    } catch (error) {
      return { success: false, message: 'Network error verifying OTP' };
    }
  },

  // Get pending phone number
  getPendingPhone() {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(PHONE_KEY);
  },
};
