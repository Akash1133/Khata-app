'use client';

import { useState } from 'react';

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  id,
  name,
  required = false,
  disabled = false,
  error,
  icon,
  prefix,
  maxLength,
  autoFocus = false,
  inputMode,
  pattern,
  step,
  min,
  max,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <>
      <div className={`input-group ${focused ? 'input-focused' : ''} ${error ? 'input-error' : ''}`}>
        {label && (
          <label className="input-label" htmlFor={id}>
            {label}
          </label>
        )}
        <div className="input-wrapper">
          {prefix && <span className="input-prefix">{prefix}</span>}
          {icon && <span className="input-icon">{icon}</span>}
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            autoFocus={autoFocus}
            inputMode={inputMode}
            pattern={pattern}
            step={step}
            min={min}
            max={max}
            className="input-field"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
          />
        </div>
        {error && <span className="input-error-msg">{error}</span>}
      </div>

      <style jsx>{`
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .input-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          padding-left: 2px;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-input);
          border: 1.5px solid var(--border-color);
          border-radius: 12px;
          padding: 0 16px;
          transition: all 0.2s ease;
          height: 52px;
        }

        .input-focused .input-wrapper {
          border-color: rgba(123, 66, 196, 0.6);
          box-shadow: 0 0 0 3px rgba(123, 66, 196, 0.15);
          background: var(--bg-card-hover);
        }

        .input-error .input-wrapper {
          border-color: rgba(239, 68, 68, 0.6);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .input-prefix {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-right: 8px;
          padding-right: 8px;
          border-right: 1px solid var(--border-color);
          white-space: nowrap;
        }

        .input-icon {
          display: flex;
          align-items: center;
          margin-right: 10px;
          color: var(--text-muted);
        }

        .input-field {
          flex: 1;
          height: 100%;
          font-size: 16px;
          color: var(--text-primary);
          background: transparent;
          min-width: 0;
        }

        .input-field::placeholder {
          color: var(--text-muted);
        }

        .input-field:disabled {
          opacity: 0.5;
        }

        .input-error-msg {
          font-size: 12px;
          color: var(--color-danger);
          padding-left: 2px;
        }

        .input-focused .input-label {
          color: var(--text-accent);
        }
      `}</style>
    </>
  );
}
