'use client';

import { useRef, useEffect } from 'react';

export default function OtpInput({ length = 6, value, onChange, error }) {
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (val && !/^\d$/.test(val)) return;
    const newOtp = value.split('');
    newOtp[index] = val;
    onChange(newOtp.join(''));
    if (val && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = value.split('');
      newOtp[index - 1] = '';
      onChange(newOtp.join(''));
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="otp-container">
      <div className="otp-inputs">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`otp-digit ${value[i] ? 'otp-filled' : ''} ${error ? 'otp-error' : ''}`}
            id={`otp-digit-${i}`}
          />
        ))}
      </div>
      {error && <p className="otp-error-msg">{error}</p>}
    </div>
  );
}
