'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionStore } from '../lib/store';

function getDayProfitMetrics(entry) {
  const sales = Number(entry?.totalSale) || 0;
  const profit = Number(entry?.totalProfit) || 0;
  const items = Number(entry?.itemsSold) || 0;
  const profitPercent = sales > 0 ? (profit / sales) * 100 : 0;

  return { sales, profit, items, profitPercent };
}

function formatSignedCurrency(value, showBalances = true) {
  if (!showBalances) return '₹ ****';
  const amount = Math.abs(Number(value) || 0).toFixed(2);
  return `${value >= 0 ? '+' : '-'}₹${amount}`;
}

function formatCurrency(value, showBalances = true) {
  if (!showBalances) return '₹ ****';
  return `₹${(Number(value) || 0).toFixed(2)}`;
}

export default function ProfitLossPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayMetrics, setTodayMetrics] = useState({ sales: 0, profit: 0, items: 0, profitPercent: 0 });
  const [monthCalendarStats, setMonthCalendarStats] = useState([]);
  const [selectedMonthDayIndex, setSelectedMonthDayIndex] = useState(-1);
  const [firstDayOffset, setFirstDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [showBalances, setShowBalances] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const today = new Date();
      const baseMonthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
      const [dailyStats, monthStats] = await Promise.all([
        TransactionStore.getDailyStats(7, today),
        TransactionStore.getMonthStats(baseMonthDate.getFullYear(), baseMonthDate.getMonth()),
      ]);

      const normalizedDailyStats = dailyStats.map((entry) => ({
        ...entry,
        ...getDayProfitMetrics(entry),
      }));
      const todayEntry = normalizedDailyStats[normalizedDailyStats.length - 1] || null;

      const normalizedMonthStats = monthStats.map((entry) => ({
        ...entry,
        ...getDayProfitMetrics(entry),
      }));

      setTodayMetrics(todayEntry ? getDayProfitMetrics(todayEntry) : { sales: 0, profit: 0, items: 0, profitPercent: 0 });
      setCurrentMonthDate(baseMonthDate);
      setFirstDayOffset(new Date(baseMonthDate.getFullYear(), baseMonthDate.getMonth(), 1).getDay());
      setMonthCalendarStats(normalizedMonthStats);

      const todayDate = today.getDate();
      setSelectedMonthDayIndex(-1);
      setLoading(false);
    };

    load();

    const handleVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', load);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', load);
    };
  }, [monthOffset]);

  const selectedMonthDay = selectedMonthDayIndex >= 0 ? monthCalendarStats[selectedMonthDayIndex] : null;
  const monthTotals = monthCalendarStats.reduce((acc, entry) => {
    acc.sales += entry.sales;
    acc.profit += entry.profit;
    acc.items += entry.items;
    if (entry.sales > 0 || entry.profit !== 0 || entry.items > 0) acc.activeDays += 1;
    return acc;
  }, { sales: 0, profit: 0, items: 0, activeDays: 0 });
  const monthProfitPercent = monthTotals.sales > 0 ? (monthTotals.profit / monthTotals.sales) * 100 : 0;
  const summaryMetrics = selectedMonthDay || {
    sales: monthTotals.sales,
    profit: monthTotals.profit,
    items: monthTotals.items,
    profitPercent: monthProfitPercent,
    activeDays: monthTotals.activeDays,
    title: currentMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    label: 'Monthly Profit',
    subLabel: `${monthTotals.activeDays} active days`,
    note: 'Use calendar below to inspect profit day by day.',
  };
  const ringProgress = Math.min(Math.abs(monthProfitPercent), 100);
  const summaryRingProgress = Math.min(Math.abs(summaryMetrics.profitPercent), 100);
  const ringAccent = summaryMetrics.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
  const ringTrack = 'color-mix(in srgb, var(--border-color) 72%, transparent)';
  const ringFill = `conic-gradient(${ringAccent} 0deg ${(summaryRingProgress / 100) * 360}deg, ${ringTrack} ${(summaryRingProgress / 100) * 360}deg 360deg)`;

  const handleDownload = () => {
    const csvContent = [
      ['Profit & Loss Report'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      [],
      ['Metric', 'Value'],
      ['Today Sales', todayMetrics.sales.toFixed(2)],
      ['Today Profit', todayMetrics.profit.toFixed(2)],
      ['Today Profit %', todayMetrics.profitPercent.toFixed(2)],
      ['Today Items Sold', todayMetrics.items],
      [],
      ['Monthly Summary'],
      ['Month', currentMonthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })],
      ['Monthly Sales', monthTotals.sales.toFixed(2)],
      ['Monthly Profit', monthTotals.profit.toFixed(2)],
      ['Monthly Profit %', monthProfitPercent.toFixed(2)],
      ['Monthly Items Sold', monthTotals.items],
      ['Active Days', monthTotals.activeDays],
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PL_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="pl-page">
      <div className="pl-content">
        <div className="header">
          <button className="back-btn" onClick={() => router.push('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1>Profit & Loss</h1>
          <button className="download-btn" onClick={handleDownload} title="Download Report">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
        </div>

        <button
          className="today-card"
          onClick={() => {
            setMonthOffset(0);
            setSelectedMonthDayIndex(new Date().getDate() - 1);
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <p className="card-label" style={{ margin: 0 }}>Today&apos;s Profit</p>
            <span onClick={(e) => { e.stopPropagation(); setShowBalances(!showBalances); }} style={{cursor: 'pointer', opacity: 0.7, display: 'flex', alignItems: 'center'}}>
              {showBalances ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              )}
            </span>
          </div>
          <h2 className={`card-value ${todayMetrics.profit >= 0 ? 'green' : 'red'}`}>
            {formatSignedCurrency(todayMetrics.profit, showBalances)}
          </h2>
          <div className="today-meta">
            <span>{formatCurrency(todayMetrics.sales, showBalances)} sales</span>
            <span>{todayMetrics.items} items</span>
            <span>{todayMetrics.profitPercent >= 0 ? '+' : ''}{todayMetrics.profitPercent.toFixed(2)}%</span>
          </div>
          <p className="card-sub">Tap to jump to today in month-wise analytics</p>
        </button>

        <div className="section">
          <div className="section-head">
            <h3>{selectedMonthDay ? 'Selected Day' : 'Monthly Profit'}</h3>
            <p>{selectedMonthDay ? selectedMonthDay.dateStr : currentMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="month-ring-card">
            <div className="month-ring-layout">
              <div className="month-ring-wrap">
                <div className="month-ring" style={{ background: ringFill }}>
                  <div className="month-ring-inner">
                    <p className="month-ring-label">{selectedMonthDay ? 'Profit %' : 'Margin'}</p>
                    <p className={`month-ring-value ${summaryMetrics.profitPercent >= 0 ? 'green' : 'red'}`}>
                      {summaryMetrics.profitPercent >= 0 ? '+' : ''}{summaryMetrics.profitPercent.toFixed(2)}%
                    </p>
                    <p className="month-ring-sub">{selectedMonthDay ? 'for selected date' : `${monthTotals.activeDays} active days`}</p>
                  </div>
                </div>
              </div>
              <div className="month-metrics">
                <div className="month-metric">
                  <p className="month-metric-k">{selectedMonthDay ? 'Profit / Loss' : 'Monthly Profit'}</p>
                  <p className={`month-metric-v ${summaryMetrics.profit >= 0 ? 'green' : 'red'}`}>{formatSignedCurrency(summaryMetrics.profit, showBalances)}</p>
                </div>
                <div className="month-metric">
                  <p className="month-metric-k">{selectedMonthDay ? 'Sales' : 'Monthly Sales'}</p>
                  <p className="month-metric-v">{formatCurrency(summaryMetrics.sales, showBalances)}</p>
                </div>
                <div className="month-metric">
                  <p className="month-metric-k">Items Sold</p>
                  <p className="month-metric-v">{summaryMetrics.items}</p>
                </div>
                <div className="month-metric">
                  <p className="month-metric-k">{selectedMonthDay ? 'View Mode' : 'Best Use'}</p>
                  {selectedMonthDay ? (
                    <button className="summary-reset-btn" onClick={() => setSelectedMonthDayIndex(-1)}>
                      Show Monthly Summary
                    </button>
                  ) : (
                    <p className="month-metric-note">Use calendar below to inspect profit day by day.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <h3>Day-wise Profit</h3>
            <div className="pagination">
              <button className="page-btn" onClick={() => setMonthOffset((value) => value + 1)}>←</button>
              <span className="page-label">
                {currentMonthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
              <button className="page-btn" onClick={() => setMonthOffset((value) => Math.max(0, value - 1))} disabled={monthOffset === 0}>→</button>
            </div>
          </div>
          <div className="chart-card">
            <div className="calendar-grid">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={`header-${index}`} className="cal-header">{day}</div>
              ))}
              {Array.from({ length: firstDayOffset }).map((_, index) => (
                <div key={`empty-${index}`} className="cal-cell empty"></div>
              ))}
              {monthCalendarStats.map((entry, index) => {
                const active = selectedMonthDayIndex === index;
                const intensity = Math.min(Math.abs(entry.profitPercent) / 50, 1);
                return (
                  <button
                    key={`day-${entry.day}`}
                    className={`cal-cell ${active ? 'cal-active' : ''} ${entry.sales > 0 || entry.profit !== 0 ? 'has-data' : ''}`}
                    onClick={() => setSelectedMonthDayIndex((current) => current === index ? -1 : index)}
                    style={{
                      '--profit-glow': entry.profit >= 0 ? `rgba(34,197,94,${0.18 + intensity * 0.42})` : `rgba(239,68,68,${0.18 + intensity * 0.42})`,
                    }}
                  >
                    {entry.day}
                  </button>
                );
              })}
            </div>

            {selectedMonthDay && (
              <div className="day-summary">
                <p className="day-title">{selectedMonthDay.dateStr}</p>
                <div className="day-grid day-grid-4">
                  <div>
                    <p className="day-k">Profit</p>
                    <p className={`day-v ${selectedMonthDay.profit >= 0 ? 'green' : 'red'}`}>{formatSignedCurrency(selectedMonthDay.profit, showBalances)}</p>
                  </div>
                  <div>
                    <p className="day-k">Profit %</p>
                    <p className={`day-v ${selectedMonthDay.profitPercent >= 0 ? 'green' : 'red'}`}>
                      {selectedMonthDay.profitPercent >= 0 ? '+' : ''}{selectedMonthDay.profitPercent.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="day-k">Sales</p>
                    <p className="day-v">{formatCurrency(selectedMonthDay.sales, showBalances)}</p>
                  </div>
                  <div>
                    <p className="day-k">Items</p>
                    <p className="day-v">{selectedMonthDay.items}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .pl-page {
          min-height: 100dvh;
          background: var(--bg-primary);
          padding-bottom: 88px;
          color: var(--text-primary);
        }
        .pl-content {
          max-width: 480px;
          margin: 0 auto;
          padding: 16px;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-top: 8px;
        }
        .back-btn, .download-btn {
          background: rgba(255,255,255,0.05);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .back-btn:hover, .download-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .header h1 {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
          flex: 1;
          text-align: center;
        }

        .today-card {
          width: 100%;
          text-align: left;
          background: linear-gradient(135deg, rgba(34,197,94,0.16), rgba(16,185,129,0.08));
          border: 1px solid rgba(34,197,94,0.18);
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 24px;
          cursor: pointer;
          color: var(--text-primary);
        }
        .card-label {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .card-value {
          font-size: 34px;
          font-weight: 800;
          font-family: var(--font-display);
          line-height: 1.1;
        }
        .card-sub {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 10px;
        }
        .today-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .today-meta span {
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          font-size: 12px;
          color: var(--text-secondary);
        }

        .section {
          margin-bottom: 26px;
        }
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .section-head h3 {
          font-size: 16px;
          margin: 0;
        }
        .section-head p {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted);
        }
        .chart-card {
          background: var(--bg-surface-solid);
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.05);
          padding: 16px;
        }
        .month-ring-card {
          background:
            radial-gradient(circle at top left, color-mix(in srgb, var(--bg-purple-subtle) 88%, transparent), transparent 45%),
            var(--bg-surface-solid);
          border-radius: 18px;
          border: 1px solid var(--border-color);
          padding: 18px;
        }
        .month-ring-layout {
          display: grid;
          grid-template-columns: 168px 1fr;
          gap: 18px;
          align-items: center;
        }
        .month-ring-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .month-ring {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-color) 90%, transparent);
        }
        .month-ring-inner {
          width: 116px;
          height: 116px;
          border-radius: 50%;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          box-shadow: var(--shadow-card);
        }
        .month-ring-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }
        .month-ring-value {
          font-size: 24px;
          font-weight: 800;
          line-height: 1.1;
          margin: 6px 0 4px;
        }
        .month-ring-sub {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .month-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .month-metric {
          padding: 12px 14px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
          border: 1px solid var(--border-color);
          min-height: 76px;
        }
        .month-metric-k {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .month-metric-v {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .month-metric-note {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .summary-reset-btn {
          min-height: 38px;
          width: 100%;
          border-radius: 10px;
          background: var(--bg-surface-hover);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 700;
        }

        .day-summary {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .day-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .day-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .day-grid-4 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .day-k {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .day-v {
          font-size: 15px;
          font-weight: 700;
        }

        .pagination {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-surface);
          padding: 4px;
          border-radius: 20px;
          border: 1px solid var(--border-color);
        }
        .page-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: var(--bg-surface-hover);
          color: var(--text-primary);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .page-label {
          font-size: 12px;
          color: var(--text-secondary);
          min-width: 88px;
          text-align: center;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        .cal-header {
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 700;
        }
        .cal-cell {
          aspect-ratio: 1;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.03);
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .cal-cell.empty {
          background: transparent;
          border-color: transparent;
          cursor: default;
        }
        .cal-cell.has-data {
          background: radial-gradient(circle at top, var(--profit-glow), rgba(255,255,255,0.03) 72%);
        }
        .cal-cell.cal-active {
          border-color: rgba(123,66,196,0.45);
          transform: translateY(-1px);
          color: var(--text-primary);
        }

        .green {
          color: var(--color-success);
        }
        .red {
          color: var(--color-danger);
        }
        .loading {
          color: var(--text-primary);
          text-align: center;
          padding: 40px;
        }
        @media (max-width: 420px) {
          .month-ring-layout {
            grid-template-columns: 1fr;
          }
          .month-metrics {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
