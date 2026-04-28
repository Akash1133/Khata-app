'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserStore, TransactionStore } from '../lib/store';

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // 7 Days State
  const [dailySeries, setDailySeries] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(-1);
  const [daysOffset, setDaysOffset] = useState(0); // 0 = ending today, 1 = ending 7 days ago, etc.

  // Month State
  const [monthCalendarStats, setMonthCalendarStats] = useState([]);
  const [selectedMonthDayIndex, setSelectedMonthDayIndex] = useState(-1);
  const [firstDayOffset, setFirstDayOffset] = useState(0);
  
  // 0 = current month, 1 = last month, etc.
  const [monthOffset, setMonthOffset] = useState(0);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  useEffect(() => {
    const u = UserStore.get();
    if (!u) { router.replace('/'); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    const loadDaily = async () => {
      const targetEndDate = new Date();
      targetEndDate.setDate(targetEndDate.getDate() - (daysOffset * 7));
      const stats = await TransactionStore.getDailyStats(7, targetEndDate);
      setDailySeries(stats.reverse());
      setSelectedDayIndex(stats.length - 1);
    };
    if (user) loadDaily();
  }, [user, daysOffset]);

  useEffect(() => {
    const loadMonth = async () => {
      const now = new Date();
      now.setMonth(now.getMonth() - monthOffset);
      setCurrentMonthDate(now);
      
      const stats = await TransactionStore.getMonthStats(now.getFullYear(), now.getMonth());
      setFirstDayOffset(new Date(now.getFullYear(), now.getMonth(), 1).getDay());
      setMonthCalendarStats(stats);
      setSelectedMonthDayIndex(-1);
    };
    if (user) loadMonth();
  }, [user, monthOffset]);

  if (!user) return null;

  const maxSales = Math.max(...dailySeries.map((d) => d.totalSale), 1);
  const maxMonthSales = Math.max(...monthCalendarStats.map((d) => d.totalSale), 1);

  const prevWeek = () => setDaysOffset(o => o + 1);
  const nextWeek = () => setDaysOffset(o => Math.max(0, o - 1));

  const prevMonth = () => setMonthOffset(o => o + 1);
  const nextMonth = () => setMonthOffset(o => Math.max(0, o - 1));

  return (
    <div className="analytics-page">
      <div className="header">
        <button className="back-btn" onClick={() => router.back()}>←</button>
        <h1 className="title">Analytics</h1>
        <div style={{ width: 40 }} /> {/* Spacer */}
      </div>

      <div className="content">
        {/* 7 Day Analytics */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">7 Days Analytics</h2>
            <div className="pagination">
              <button className="page-btn" onClick={prevWeek}>←</button>
              <span className="page-label">{daysOffset === 0 ? 'This Week' : `${daysOffset}w ago`}</span>
              <button className="page-btn" onClick={nextWeek} disabled={daysOffset === 0}>→</button>
            </div>
          </div>
          <div className="chart-card">
            <div className="bars-wrap">
              {dailySeries.map((d, i) => {
                const h = Math.max(8, Math.round((d.totalSale / maxSales) * 92));
                const active = selectedDayIndex === i;
                return (
                  <button
                    key={i}
                    className={`bar-col ${active ? 'bar-active' : ''}`}
                    onClick={() => setSelectedDayIndex(i)}
                    title={`${d.label}: ₹${d.totalSale.toFixed(2)}`}
                  >
                    <div className="bar" style={{ height: `${h}px` }} />
                    <span className="bar-day">{d.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedDayIndex !== -1 && dailySeries[selectedDayIndex] && (
              <div className="day-summary">
                <p className="day-title">{dailySeries[selectedDayIndex].dateStr}</p>
                <div className="day-grid">
                  <div>
                    <p className="day-k">Sales</p>
                    <p className="day-v">₹{dailySeries[selectedDayIndex].totalSale.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="day-k">Profit</p>
                    <p className={`day-v ${dailySeries[selectedDayIndex].totalProfit >= 0 ? 'txn-green' : 'txn-red'}`}>
                      ₹{dailySeries[selectedDayIndex].totalProfit.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="day-k">Items</p>
                    <p className="day-v">{dailySeries[selectedDayIndex].itemsSold}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* This Month Calendar */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Monthly View</h2>
            <div className="pagination">
              <button className="page-btn" onClick={prevMonth}>←</button>
              <span className="page-label">
                {currentMonthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
              <button className="page-btn" onClick={nextMonth} disabled={monthOffset === 0}>→</button>
            </div>
          </div>
          <div className="chart-card">
            <div className="calendar-grid">
               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                 <div key={`header-${i}`} className="cal-header">{day}</div>
               ))}
               {Array.from({ length: firstDayOffset }).map((_, i) => (
                 <div key={`empty-${i}`} className="cal-cell empty"></div>
               ))}
               {monthCalendarStats.map((d, i) => {
                 const intensity = maxMonthSales > 0 ? d.totalSale / maxMonthSales : 0;
                 const active = selectedMonthDayIndex === i;
                 return (
                   <button 
                     key={`day-${d.day}`}
                     className={`cal-cell ${active ? 'cal-active' : ''} ${d.totalSale > 0 ? 'has-data' : ''}`}
                     onClick={() => setSelectedMonthDayIndex(i)}
                     style={{ '--intensity': intensity }}
                   >
                     {d.day}
                   </button>
                 );
               })}
            </div>
            {selectedMonthDayIndex !== -1 && monthCalendarStats[selectedMonthDayIndex] && (
               <div className="day-summary">
                <p className="day-title">{monthCalendarStats[selectedMonthDayIndex].dateStr}</p>
                <div className="day-grid">
                  <div>
                    <p className="day-k">Sales</p>
                    <p className="day-v">₹{monthCalendarStats[selectedMonthDayIndex].totalSale.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="day-k">Profit</p>
                    <p className={`day-v ${monthCalendarStats[selectedMonthDayIndex].totalProfit >= 0 ? 'txn-green' : 'txn-red'}`}>
                      ₹{monthCalendarStats[selectedMonthDayIndex].totalProfit.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="day-k">Items</p>
                    <p className="day-v">{monthCalendarStats[selectedMonthDayIndex].itemsSold}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .analytics-page {
          min-height: 100dvh;
          background: var(--bg-primary);
          padding-bottom: 88px;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .back-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: var(--bg-surface-hover);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .content {
          max-width: 480px;
          margin: 0 auto;
          padding: 24px 16px;
        }
        
        .section { margin-bottom: 32px; }
        .section-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 16px;
        }
        .section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
        
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
          opacity: 0.3;
          cursor: not-allowed;
        }
        .page-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          min-width: 70px;
          text-align: center;
        }

        .chart-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        
        /* Bar Chart Styles */
        .bars-wrap {
          height: 130px;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          align-items: end;
          padding-bottom: 4px;
        }
        .bar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          background: transparent;
          border: none;
          min-width: 10px;
          cursor: pointer;
        }
        .bar {
          width: 100%;
          border-radius: 6px;
          background: rgba(74,108,247,.35);
          transition: all .2s ease;
        }
        .bar-active .bar {
          background: #4A6CF7;
          box-shadow: 0 0 0 3px rgba(74,108,247,.2);
        }
        .bar-day {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1;
        }
        .bar-active .bar-day {
          color: var(--text-primary);
          font-weight: 700;
        }

        /* Calendar Styles */
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 8px;
        }
        .cal-header {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          padding-bottom: 6px;
        }
        .cal-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-surface-subtle);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s;
        }
        .cal-cell.empty {
          background: transparent;
          border-color: transparent;
          pointer-events: none;
        }
        .cal-cell.has-data {
          background: rgba(123, 66, 196, calc(0.15 + var(--intensity) * 0.4));
          color: var(--text-primary);
          font-weight: 600;
        }
        .cal-cell.cal-active {
          box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 3px var(--icon-active);
          border-color: var(--icon-active);
          font-weight: 700;
          transform: scale(1.05);
          z-index: 10;
        }

        /* Summary Panel */
        .day-summary {
          margin-top: 16px;
          border-top: 1px dashed var(--border-color);
          padding-top: 16px;
          animation: fadeIn 0.3s ease;
        }
        .day-title {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          font-weight: 500;
        }
        .day-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .day-k {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .day-v {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .txn-green { color: var(--color-success); }
        .txn-red { color: var(--color-danger); }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
