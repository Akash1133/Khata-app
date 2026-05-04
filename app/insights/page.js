'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionStore, ProductStore, UserStore } from '../lib/store';
import { computeBusinessScore, getScoreLabel } from '../lib/scoreEngine';

// Animated counter hook
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    let start = null;
    const from = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

const COMPONENT_ICONS = {
  profitGrowth: '📈',
  margin: '💰',
  consistency: '📅',
  diversity: '🎯',
  expenseRatio: '🏭',
};

const PRIORITY_COLORS = {
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  low: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
};

export default function InsightsPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedComp, setExpandedComp] = useState(null);

  useEffect(() => {
    const u = UserStore.get();
    if (!u) { router.replace('/'); return; }

    Promise.all([TransactionStore.getAll(), ProductStore.getAll()]).then(([txns, prods]) => {
      const r = computeBusinessScore(txns, prods);
      setResult(r);
      setLoading(false);
    });
  }, [router]);

  const animatedScore = useCountUp(result?.score ?? 0, 1400);
  const score = result?.score ?? 0;
  const grade = result?.grade ?? getScoreLabel(0);

  // Arc gauge: 270-degree sweep (starts bottom-left, ends bottom-right)
  const RADIUS = 80;
  const SWEEP = 270;
  const GAP = 360 - SWEEP;
  const startAngle = 90 + GAP / 2; // degrees from top
  const fraction = score / 100;
  const circumference = 2 * Math.PI * RADIUS;
  const arcLen = (SWEEP / 360) * circumference;
  const fillLen = fraction * arcLen;
  const emptyLen = circumference - fillLen;

  // SVG arc path helper
  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  if (loading) {
    return (
      <div className="ins-page">
        <div className="ins-loading">
          <div className="spinner" />
          <p>Analysing your business...</p>
        </div>
        <style jsx>{`
          .ins-page { min-height:100dvh; background:var(--bg-primary); display:flex; align-items:center; justify-content:center; }
          .ins-loading { text-align:center; color:var(--text-secondary); }
          .ins-loading p { margin-top:16px; font-size:14px; }
          .spinner { width:40px; height:40px; border:3px solid rgba(123,66,196,0.2); border-top-color:#7B42C4; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto; }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const { components, topProducts, recommendations, meta } = result;

  return (
    <div className="ins-page">
      {/* Header */}
      <div className="ins-header">
        <button className="back-btn" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="ins-title">Business Insights</h1>
          <p className="ins-sub">AI-powered score & recommendations</p>
        </div>
        <div style={{width:40}}/>
      </div>

      <div className="ins-content">

        {/* ── SCORE CARD ── */}
        <div className="score-card" style={{ '--grade-color': grade.color, '--grade-bg': grade.bg }}>
          <div className="score-bg-glow" />

          {/* SVG Arc Gauge */}
          <div className="gauge-wrap">
            <svg width="200" height="200" viewBox="0 0 200 200">
              {/* Track */}
              <circle
                cx="100" cy="100" r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="14"
                strokeDasharray={`${arcLen} ${circumference - arcLen}`}
                strokeDashoffset={-(GAP / 360) * circumference}
                strokeLinecap="round"
                transform="rotate(0 100 100)"
              />
              {/* Fill */}
              <circle
                cx="100" cy="100" r={RADIUS}
                fill="none"
                stroke={grade.color}
                strokeWidth="14"
                strokeDasharray={`${(animatedScore / 100) * arcLen} ${circumference - (animatedScore / 100) * arcLen}`}
                strokeDashoffset={-(GAP / 360) * circumference}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px ${grade.color}88)`, transition: 'none' }}
              />
              {/* Score text */}
              <text x="100" y="90" textAnchor="middle" fill="white" fontSize="42" fontWeight="800" fontFamily="Inter, sans-serif">{animatedScore}</text>
              <text x="100" y="112" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12" fontFamily="Inter, sans-serif">OUT OF 100</text>
            </svg>
          </div>

          {/* Grade badge */}
          <div className="grade-badge">
            <span className="grade-emoji">{grade.emoji}</span>
            <span className="grade-label">{grade.label}</span>
          </div>

          {/* Quick stats */}
          <div className="score-stats">
            <div className="score-stat">
              <span className="score-stat-label">Last 7d Sales</span>
              <span className="score-stat-value">₹{meta.last7revenue.toFixed(0)}</span>
            </div>
            <div className="score-stat-divider"/>
            <div className="score-stat">
              <span className="score-stat-label">Avg Margin</span>
              <span className="score-stat-value" style={{ color: meta.avgMargin > 20 ? '#22c55e' : '#ef4444' }}>
                {meta.avgMargin.toFixed(1)}%
              </span>
            </div>
            <div className="score-stat-divider"/>
            <div className="score-stat">
              <span className="score-stat-label">Active Days</span>
              <span className="score-stat-value">{meta.activeDays}/14</span>
            </div>
          </div>
        </div>

        {/* ── SCORE BREAKDOWN ── */}
        <div className="section">
          <h2 className="section-title">Score Breakdown</h2>
          <div className="components-list">
            {components.map((c) => (
              <div key={c.key} className="component-card" onClick={() => setExpandedComp(expandedComp === c.key ? null : c.key)}>
                <div className="comp-header">
                  <div className="comp-left">
                    <span className="comp-icon">{COMPONENT_ICONS[c.key]}</span>
                    <div>
                      <p className="comp-name">{c.label}</p>
                      <p className="comp-weight">{c.weight}% weight</p>
                    </div>
                  </div>
                  <div className="comp-right">
                    <span className="comp-score" style={{ color: c.score >= 70 ? '#22c55e' : c.score >= 45 ? '#f59e0b' : '#ef4444' }}>
                      {c.score}
                    </span>
                    <svg className={`comp-chevron ${expandedComp === c.key ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="comp-bar-track">
                  <div
                    className="comp-bar-fill"
                    style={{
                      width: `${c.score}%`,
                      background: c.score >= 70 ? 'var(--color-success)' : c.score >= 45 ? '#f59e0b' : 'var(--color-danger)',
                    }}
                  />
                </div>

                {/* Expanded insight */}
                {expandedComp === c.key && (
                  <div className="comp-insight">
                    <p>{c.insight}</p>
                    <span className="comp-contribution">Contributes {c.contribution} pts to your score</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── RECOMMENDATIONS ── */}
        {recommendations.length > 0 && (
          <div className="section">
            <h2 className="section-title">Smart Recommendations</h2>
            <div className="recs-list">
              {recommendations.map((r, i) => {
                const style = PRIORITY_COLORS[r.priority];
                return (
                  <div key={i} className="rec-card" style={{ '--rec-color': style.color, '--rec-bg': style.bg, '--rec-border': style.border }}>
                    <span className="rec-icon">{r.icon}</span>
                    <p className="rec-text">{r.text}</p>
                    <span className="rec-priority">{r.priority}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TOP PRODUCTS ── */}
        {topProducts.length > 0 && (
          <div className="section">
            <h2 className="section-title">Top Products to Push</h2>
            <p className="section-sub">Ranked by profit × sales velocity (last 30 days)</p>
            <div className="products-list">
              {topProducts.map((p, i) => {
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                const isTop = i === 0;
                return (
                  <div key={p.name} className={`prod-card ${isTop ? 'prod-card-top' : ''}`}>
                    <div className="prod-rank">{medals[i]}</div>
                    <div className="prod-info">
                      <p className="prod-name">{p.name}</p>
                      <p className="prod-meta">{p.qtySold} sold · ₹{p.totalProfit.toFixed(0)} profit · {p.margin.toFixed(1)}% margin</p>
                      {p.category && <span className="prod-cat">{p.category}</span>}
                    </div>
                    <div className="prod-opp">
                      <div className="opp-ring" style={{ '--opp': p.opportunityScore }}>
                        <span>{p.opportunityScore}</span>
                      </div>
                      <p className="opp-label">Score</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {topProducts.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">🌱</p>
            <p className="empty-title">Not enough data yet</p>
            <p className="empty-sub">Make a few sales and check back for insights & product rankings.</p>
          </div>
        )}

      </div>

      <style jsx>{`
        .ins-page { min-height:100dvh; background:var(--bg-primary); padding-bottom:88px; color:var(--text-primary); }

        /* Header */
        .ins-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 16px 10px;
          position:sticky; top:0; z-index:100;
          background:var(--bg-primary);
          border-bottom:1px solid rgba(255,255,255,0.05);
        }
        .back-btn {
          width:40px; height:40px; border-radius:12px;
          background:rgba(255,255,255,0.06); border:none; color:var(--text-primary);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:background 0.2s;
        }
        .back-btn:hover { background:rgba(255,255,255,0.1); }
        .ins-title { font-size:18px; font-weight:800; margin:0; }
        .ins-sub { font-size:11px; color:var(--text-muted); margin:0; }

        /* Content */
        .ins-content { max-width:480px; margin:0 auto; padding:20px 16px; display:flex; flex-direction:column; gap:28px; }

        /* Score Card */
        .score-card {
          position:relative; overflow:hidden;
          background:linear-gradient(145deg, rgba(20,12,40,0.95), rgba(10,6,26,0.98));
          border:1px solid rgba(255,255,255,0.08);
          border-radius:24px; padding:28px 20px 20px;
          display:flex; flex-direction:column; align-items:center;
          box-shadow:0 20px 60px rgba(0,0,0,0.4);
        }
        .score-bg-glow {
          position:absolute; top:-40px; left:50%; transform:translateX(-50%);
          width:240px; height:240px; border-radius:50%;
          background:radial-gradient(circle, var(--grade-color, #7B42C4) 0%, transparent 70%);
          opacity:0.12; pointer-events:none;
        }

        /* Gauge */
        .gauge-wrap { position:relative; margin-bottom:4px; }

        /* Grade badge */
        .grade-badge {
          display:inline-flex; align-items:center; gap:8px;
          padding:8px 18px; border-radius:99px;
          background:var(--grade-bg, rgba(123,66,196,0.12));
          border:1px solid rgba(255,255,255,0.08);
          margin-bottom:20px;
        }
        .grade-emoji { font-size:16px; }
        .grade-label { font-size:13px; font-weight:700; color:var(--grade-color, #B68AFF); }

        /* Score stats strip */
        .score-stats { display:flex; align-items:center; justify-content:center; gap:0; width:100%; background:rgba(255,255,255,0.04); border-radius:14px; padding:14px 0; }
        .score-stat { flex:1; text-align:center; }
        .score-stat-divider { width:1px; height:32px; background:rgba(255,255,255,0.08); }
        .score-stat-label { display:block; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
        .score-stat-value { font-size:16px; font-weight:800; color:var(--text-primary); }

        /* Sections */
        .section { display:flex; flex-direction:column; gap:12px; }
        .section-title { font-size:16px; font-weight:800; color:var(--text-primary); margin:0; }
        .section-sub { font-size:12px; color:var(--text-muted); margin:0; }

        /* Component cards */
        .components-list { display:flex; flex-direction:column; gap:10px; }
        .component-card {
          background:var(--bg-surface-solid); border:1px solid var(--border-color);
          border-radius:16px; padding:14px 16px; cursor:pointer;
          transition:border-color 0.2s;
        }
        .component-card:hover { border-color:rgba(123,66,196,0.3); }
        .comp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .comp-left { display:flex; align-items:center; gap:10px; }
        .comp-icon { font-size:20px; }
        .comp-name { font-size:14px; font-weight:600; color:var(--text-primary); margin:0; }
        .comp-weight { font-size:11px; color:var(--text-muted); margin:0; }
        .comp-right { display:flex; align-items:center; gap:8px; }
        .comp-score { font-size:18px; font-weight:800; }
        .comp-chevron { color:var(--text-muted); transition:transform 0.2s; }
        .comp-chevron.open { transform:rotate(180deg); }

        /* Bar */
        .comp-bar-track { height:6px; background:rgba(255,255,255,0.06); border-radius:99px; overflow:hidden; }
        .comp-bar-fill { height:100%; border-radius:99px; transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1); }

        /* Insight */
        .comp-insight { margin-top:12px; padding:10px 12px; background:rgba(255,255,255,0.04); border-radius:10px; animation:fadeSlide 0.2s ease; }
        .comp-insight p { font-size:13px; color:var(--text-secondary); margin:0 0 6px; }
        .comp-contribution { font-size:11px; color:var(--text-muted); font-weight:600; }

        /* Recommendations */
        .recs-list { display:flex; flex-direction:column; gap:10px; }
        .rec-card {
          display:flex; align-items:flex-start; gap:12px;
          padding:14px; border-radius:14px;
          background:var(--rec-bg); border:1px solid var(--rec-border);
          animation:fadeSlide 0.3s ease;
        }
        .rec-icon { font-size:20px; flex-shrink:0; margin-top:1px; }
        .rec-text { flex:1; font-size:13px; color:var(--text-primary); line-height:1.5; margin:0; }
        .rec-priority {
          font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;
          color:var(--rec-color); background:rgba(255,255,255,0.06);
          padding:3px 8px; border-radius:6px; flex-shrink:0; margin-top:2px;
        }

        /* Products */
        .products-list { display:flex; flex-direction:column; gap:10px; }
        .prod-card {
          display:flex; align-items:center; gap:14px;
          padding:14px 16px; border-radius:16px;
          background:var(--bg-surface-solid); border:1px solid var(--border-color);
          transition:transform 0.15s, border-color 0.15s;
        }
        .prod-card:hover { transform:translateY(-1px); border-color:rgba(123,66,196,0.3); }
        .prod-card-top {
          background:linear-gradient(135deg, rgba(123,66,196,0.15), rgba(74,108,247,0.08));
          border-color:rgba(123,66,196,0.35);
          box-shadow:0 4px 20px rgba(123,66,196,0.15);
        }
        .prod-rank { font-size:24px; flex-shrink:0; }
        .prod-info { flex:1; min-width:0; }
        .prod-name { font-size:14px; font-weight:700; color:var(--text-primary); margin:0 0 3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .prod-meta { font-size:11px; color:var(--text-muted); margin:0 0 5px; }
        .prod-cat { font-size:10px; font-weight:600; color:#B68AFF; background:rgba(123,66,196,0.15); padding:2px 8px; border-radius:6px; }
        .prod-opp { text-align:center; flex-shrink:0; }
        .opp-ring {
          width:44px; height:44px; border-radius:50%;
          background:conic-gradient(#7B42C4 calc(var(--opp) * 3.6deg), rgba(255,255,255,0.06) 0deg);
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:800; color:#B68AFF;
          position:relative; box-shadow:inset 0 0 0 6px var(--bg-surface-solid);
        }
        .opp-ring span { position:relative; z-index:1; }
        .opp-label { font-size:10px; color:var(--text-muted); margin-top:4px; }

        /* Empty */
        .empty-state { text-align:center; padding:40px 20px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.08); border-radius:20px; }
        .empty-icon { font-size:48px; margin-bottom:12px; }
        .empty-title { font-size:16px; font-weight:700; color:var(--text-primary); margin-bottom:6px; }
        .empty-sub { font-size:13px; color:var(--text-muted); line-height:1.5; }

        @keyframes fadeSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
