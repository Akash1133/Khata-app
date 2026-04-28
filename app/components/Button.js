'use client';

export default function Button({
  children,
  onClick,
  variant = 'primary', // primary, secondary, outline, danger, ghost
  size = 'md', // sm, md, lg
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  id,
  type = 'button',
}) {
  return (
    <>
      <button
        id={id}
        type={type}
        className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${loading ? 'btn-loading' : ''}`}
        onClick={onClick}
        disabled={disabled || loading}
      >
        {loading ? (
          <div className="btn-spinner" />
        ) : (
          <>
            {icon && <span className="btn-icon">{icon}</span>}
            {children}
          </>
        )}
      </button>

      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
          border-radius: 12px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          user-select: none;
        }

        .btn:active:not(:disabled) {
          transform: scale(0.97);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Sizes */
        .btn-sm {
          padding: 8px 16px;
          font-size: 13px;
          border-radius: 8px;
        }

        .btn-md {
          padding: 14px 24px;
          font-size: 15px;
        }

        .btn-lg {
          padding: 16px 32px;
          font-size: 16px;
          border-radius: 14px;
        }

        .btn-full {
          width: 100%;
        }

        /* Variants */
        .btn-primary {
          background: linear-gradient(135deg, #7B42C4, #5B2D8E);
          color: var(--text-primary);
          box-shadow: 0 4px 16px rgba(123, 66, 196, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #8B52D4, #6B3D9E);
          box-shadow: 0 6px 24px rgba(123, 66, 196, 0.4);
        }

        .btn-secondary {
          background: rgba(123, 66, 196, 0.15);
          color: #B68AFF;
          border: 1px solid rgba(123, 66, 196, 0.2);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(123, 66, 196, 0.25);
        }

        .btn-outline {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .btn-outline:hover:not(:disabled) {
          background: var(--bg-card-hover);
          border-color: var(--border-color);
          color: var(--text-primary);
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .btn-danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
        }

        .btn-ghost {
          background: transparent;
          color: var(--text-secondary);
        }

        .btn-ghost:hover:not(:disabled) {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }

        /* Icon */
        .btn-icon {
          display: flex;
          align-items: center;
        }

        /* Loading spinner */
        .btn-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: var(--text-primary);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
