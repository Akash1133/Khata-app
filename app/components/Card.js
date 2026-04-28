'use client';

export default function Card({
  children,
  onClick,
  className = '',
  variant = 'default', // default, gradient, glow
  padding = 'md', // sm, md, lg
  animate = false,
  id,
}) {
  return (
    <>
      <div
        id={id}
        className={`card card-${variant} card-pad-${padding} ${animate ? 'card-animate' : ''} ${onClick ? 'card-clickable' : ''} ${className}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </div>

      <style jsx>{`
        .card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          transition: all 0.25s ease;
        }

        .card-pad-sm { padding: 12px; }
        .card-pad-md { padding: 16px; }
        .card-pad-lg { padding: 20px; }

        .card-clickable {
          cursor: pointer;
        }

        .card-clickable:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-color);
          transform: translateY(-1px);
        }

        .card-clickable:active {
          transform: scale(0.98);
        }

        .card-gradient {
          background: linear-gradient(135deg, rgba(123, 66, 196, 0.2), rgba(91, 45, 142, 0.1));
          border-color: rgba(123, 66, 196, 0.2);
        }

        .card-glow {
          background: var(--bg-card);
          box-shadow: 0 0 30px rgba(123, 66, 196, 0.15);
          border-color: rgba(123, 66, 196, 0.3);
        }

        .card-animate {
          animation: fadeInUp 0.5s ease-out both;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
