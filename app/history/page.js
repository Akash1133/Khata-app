'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionStore } from '../lib/store';

export default function HistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [returnMode, setReturnMode] = useState(null); // null | 'all' | 'select'
  const [selectedItems, setSelectedItems] = useState({});
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const loadData = () => TransactionStore.getAll().then(setTransactions);
  useEffect(() => {
    loadData();
    const handleVis = () => { if (document.visibilityState === 'visible') loadData(); };
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('focus', loadData);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('focus', loadData);
    };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleItem = (itemId, maxQty) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (copy[itemId]) delete copy[itemId];
      else copy[itemId] = maxQty;
      return copy;
    });
  };

  const updateReturnQty = (itemId, qty, maxQty) => {
    const val = Math.max(1, Math.min(qty, maxQty));
    setSelectedItems(prev => ({ ...prev, [itemId]: val }));
  };

  const handleReturnAll = async () => {
    if (!selectedTxn) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/transactions/${selectedTxn.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnAll: true })
      });
      if (res.ok) {
        showToast('All items returned to inventory!');
        setSelectedTxn(null);
        setReturnMode(null);
        loadData();
      } else {
        const data = await res.json();
        showToast(data.details || 'Failed to return', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
    setProcessing(false);
  };

  const handleReturnSelected = async () => {
    if (!selectedTxn) return;
    const itemIds = Object.keys(selectedItems);
    if (itemIds.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/transactions/${selectedTxn.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemIds.map(id => ({ transactionItemId: id, quantity: selectedItems[id] }))
        })
      });
      if (res.ok) {
        showToast(`${itemIds.length} item(s) returned to inventory!`);
        setSelectedTxn(null);
        setReturnMode(null);
        setSelectedItems({});
        loadData();
      } else {
        const data = await res.json();
        showToast(data.details || 'Failed to return', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
    setProcessing(false);
  };

  const closeDetail = () => {
    setSelectedTxn(null);
    setReturnMode(null);
    setSelectedItems({});
  };

  const filtered = filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'sale', label: '💰 Sales' },
    { key: 'purchase', label: '📦 Purchases' },
    { key: 'return', label: '🔄 Returns' },
    { key: 'payment_in', label: '💳 Received' },
  ];

  const getTypeColor = (type) => {
    if (type === 'sale' || type === 'payment_in') return '#22C55E';
    if (type === 'return') return '#F59E0B';
    return '#EF4444';
  };
  const getTypeIcon = (type) => {
    if (type === 'sale') return '💰';
    if (type === 'purchase') return '📦';
    if (type === 'return') return '🔄';
    return '💳';
  };

  return (
    <div className="hist-page">
      <div className="hist-content">
        <div className="hist-header">
          <h1 className="hist-title">History</h1>
          <p className="hist-sub">{transactions.length} transactions</p>
        </div>

        <div className="filter-row">
          {filters.map((f) => (
            <button key={f.key} className={`filter-chip ${filter === f.key ? 'filter-active' : ''}`}
              onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <p className="empty-icon">📜</p>
            <p className="empty-title">No transactions yet</p>
            <p className="empty-sub">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="txn-list">
            {filtered.map((t) => (
              <button key={t.id} className="txn-card" onClick={() => setSelectedTxn(t)}>
                <div className="txn-left">
                  <span className="txn-emoji">{getTypeIcon(t.type)}</span>
                  <div className="txn-text">
                    <p className="txn-name">{t.party?.name || t.note || t.type}</p>
                    <p className="txn-date">{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    {t.items && t.items.length > 0 && (
                      <p className="txn-item-count">{t.items.length} item{t.items.length > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
                <div className="txn-right">
                  <p className="txn-amt" style={{ color: getTypeColor(t.type) }}>
                    {t.type === 'sale' || t.type === 'payment_in' ? '+' : t.type === 'return' ? '↩' : '-'}₹{t.amount}
                  </p>
                  <svg className="txn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A4A60" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Detail Sheet */}
      {selectedTxn && (
        <div className="sheet-overlay" onClick={closeDetail}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            
            <div className="sheet-header">
              <span className="sheet-icon">{getTypeIcon(selectedTxn.type)}</span>
              <div>
                <h2 className="sheet-title">{selectedTxn.type === 'sale' ? 'Sale' : selectedTxn.type === 'return' ? 'Return' : selectedTxn.type}</h2>
                <p className="sheet-date">{new Date(selectedTxn.date).toLocaleString('en-IN')}</p>
              </div>
              <p className="sheet-amount" style={{ color: getTypeColor(selectedTxn.type) }}>₹{selectedTxn.amount}</p>
            </div>

            {selectedTxn.party && (
              <div className="sheet-info-row">
                <span>Customer</span>
                <span className="sheet-info-val">{selectedTxn.party.name}</span>
              </div>
            )}
            {selectedTxn.note && (
              <div className="sheet-info-row">
                <span>Note</span>
                <span className="sheet-info-val">{selectedTxn.note}</span>
              </div>
            )}

            {/* Items List */}
            {selectedTxn.items && selectedTxn.items.length > 0 && (
              <div className="sheet-items">
                <h3>Items</h3>
                {selectedTxn.items.map(item => (
                  <div key={item.id} className={`sheet-item ${returnMode === 'select' ? 'selectable' : ''} ${selectedItems[item.id] ? 'selected' : ''}`}>
                    {returnMode === 'select' && (
                      <div className={`checkbox ${selectedItems[item.id] ? 'checked' : ''}`}
                        onClick={() => toggleItem(item.id, item.quantity)}>
                        {selectedItems[item.id] ? '✓' : ''}
                      </div>
                    )}
                    <div className="sheet-item-info">
                      <p className="sheet-item-name">{item.product?.name || 'Unknown'}</p>
                      <p className="sheet-item-meta">Sold: {item.quantity} × ₹{item.price}</p>
                    </div>
                    {returnMode === 'select' && selectedItems[item.id] ? (
                      <div className="qty-controls">
                        <button className="qty-btn" onClick={() => updateReturnQty(item.id, selectedItems[item.id] - 1, item.quantity)}>−</button>
                        <span className="qty-val">{selectedItems[item.id]}</span>
                        <button className="qty-btn" onClick={() => updateReturnQty(item.id, selectedItems[item.id] + 1, item.quantity)}>+</button>
                      </div>
                    ) : (
                      <p className="sheet-item-total">₹{item.quantity * item.price}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {selectedTxn.type === 'sale' && !returnMode && (
              <div className="sheet-actions">
                <button className="action-btn return-all" onClick={() => setReturnMode('confirm-all')}>
                  <span>🔄</span> Return All Items
                </button>
                <button className="action-btn return-select" onClick={() => { setReturnMode('select'); setSelectedItems({}); }}>
                  <span>☑️</span> Select Items to Return
                </button>
              </div>
            )}

            {/* Confirm Return All */}
            {returnMode === 'confirm-all' && (
              <div className="confirm-section">
                <p className="confirm-text">All items will be returned to inventory and ₹{selectedTxn.amount} will be adjusted.</p>
                <div className="confirm-btns">
                  <button className="confirm-btn cancel" onClick={() => setReturnMode(null)}>Cancel</button>
                  <button className="confirm-btn proceed" onClick={handleReturnAll} disabled={processing}>
                    {processing ? 'Processing...' : 'Confirm Return'}
                  </button>
                </div>
              </div>
            )}

            {/* Select Mode Footer */}
            {returnMode === 'select' && (
              <div className="confirm-section">
                <p className="confirm-text">{Object.keys(selectedItems).length} item(s) selected — {Object.values(selectedItems).reduce((a,b) => a+b, 0)} units to return</p>
                <div className="confirm-btns">
                  <button className="confirm-btn cancel" onClick={() => { setReturnMode(null); setSelectedItems({}); }}>Cancel</button>
                  <button className="confirm-btn proceed" onClick={handleReturnSelected} disabled={processing || Object.keys(selectedItems).length === 0}>
                    {processing ? 'Processing...' : 'Return Selected'}
                  </button>
                </div>
              </div>
            )}

            <button className="sheet-close" onClick={closeDetail}>Close</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}

      <style jsx>{`
        .hist-page { min-height:100dvh; background:var(--bg-primary); padding-bottom:88px; }
        .hist-content { max-width:480px; margin:0 auto; padding:16px; }
        .hist-header { padding:12px 0 20px; }
        .hist-title { font-size:24px; font-weight:800; color:white; }
        .hist-sub { font-size:13px; color:#6B6B80; margin-top:4px; }
        .filter-row { display:flex; gap:8px; margin-bottom:20px; overflow-x:auto; -ms-overflow-style:none; scrollbar-width:none; }
        .filter-row::-webkit-scrollbar { display:none; }
        .filter-chip {
          padding:7px 14px; border-radius:20px; font-size:12px; font-weight:500;
          background:rgba(255,255,255,.05); color:#A0A0B8;
          border:1px solid rgba(255,255,255,.06); cursor:pointer;
          white-space:nowrap; transition:all .2s;
        }
        .filter-active { background:rgba(123,66,196,.2); color:#B68AFF; border-color:rgba(123,66,196,.3); }

        .empty { text-align:center; padding:60px 16px; }
        .empty-icon { font-size:48px; margin-bottom:12px; }
        .empty-title { font-size:16px; font-weight:600; color:white; margin-bottom:6px; }
        .empty-sub { font-size:13px; color:#6B6B80; }

        .txn-list { display:flex; flex-direction:column; gap:8px; }
        .txn-card {
          display:flex; justify-content:space-between; align-items:center;
          padding:14px 16px; background:#252540; border-radius:14px;
          border:1px solid rgba(255,255,255,.04); cursor:pointer;
          transition:all .15s; width:100%; text-align:left;
        }
        .txn-card:active { transform:scale(0.98); background:#2A2A4A; }
        .txn-left { display:flex; gap:12px; align-items:center; flex:1; min-width:0; }
        .txn-emoji { font-size:28px; flex-shrink:0; }
        .txn-text { min-width:0; }
        .txn-name { font-size:14px; font-weight:600; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .txn-date { font-size:11px; color:#4A4A60; margin-top:2px; }
        .txn-item-count { font-size:11px; color:#6B6B80; margin-top:2px; }
        .txn-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .txn-amt { font-size:16px; font-weight:700; }
        .txn-arrow { flex-shrink:0; }

        /* Detail Sheet */
        .sheet-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:2000; display:flex; align-items:flex-end; justify-content:center; animation:fadeIn .2s; }
        .sheet {
          background:#1E1E38; border-radius:24px 24px 0 0; width:100%; max-width:480px;
          max-height:85vh; overflow-y:auto; padding:12px 20px 24px;
          animation:slideUp .3s ease-out;
        }
        .sheet-handle { width:40px; height:4px; border-radius:2px; background:rgba(255,255,255,.15); margin:0 auto 16px; }
        .sheet-header { display:flex; align-items:center; gap:14px; margin-bottom:20px; }
        .sheet-icon { font-size:36px; }
        .sheet-title { font-size:18px; font-weight:700; color:white; text-transform:capitalize; }
        .sheet-date { font-size:12px; color:#6B6B80; margin-top:2px; }
        .sheet-amount { font-size:24px; font-weight:800; margin-left:auto; }

        .sheet-info-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.04); font-size:14px; color:#6B6B80; }
        .sheet-info-val { color:white; font-weight:500; }

        .sheet-items { margin-top:16px; }
        .sheet-items h3 { font-size:13px; color:#6B6B80; text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; }
        .sheet-item {
          display:flex; align-items:center; gap:12px;
          padding:12px; background:rgba(255,255,255,.03); border-radius:10px;
          margin-bottom:6px; border:1.5px solid transparent; transition:all .15s;
        }
        .sheet-item.selectable { cursor:pointer; }
        .sheet-item.selectable:hover { background:rgba(255,255,255,.06); }
        .sheet-item.selected { border-color:rgba(245,158,11,.4); background:rgba(245,158,11,.06); }
        .sheet-item-info { flex:1; }
        .sheet-item-name { font-size:14px; font-weight:600; color:white; }
        .sheet-item-meta { font-size:12px; color:#6B6B80; margin-top:2px; }
        .sheet-item-total { font-size:14px; font-weight:700; color:white; }

        .qty-controls { display:flex; align-items:center; gap:6px; }
        .qty-btn {
          width:28px; height:28px; border-radius:8px;
          background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.25);
          color:#F59E0B; font-size:16px; font-weight:700; cursor:pointer;
          display:flex; align-items:center; justify-content:center; transition:all .15s;
        }
        .qty-btn:active { background:rgba(245,158,11,.25); }
        .qty-val { font-size:16px; font-weight:800; color:white; min-width:24px; text-align:center; }

        .checkbox {
          width:22px; height:22px; border-radius:6px; border:2px solid rgba(255,255,255,.15);
          display:flex; align-items:center; justify-content:center;
          font-size:12px; color:#F59E0B; font-weight:700; transition:all .15s; flex-shrink:0;
        }
        .checkbox.checked { border-color:#F59E0B; background:rgba(245,158,11,.15); }

        .sheet-actions { display:flex; flex-direction:column; gap:8px; margin-top:20px; }
        .action-btn {
          display:flex; align-items:center; gap:10px; width:100%;
          padding:14px 16px; border-radius:12px; font-size:15px; font-weight:600;
          cursor:pointer; transition:all .15s; border:none;
        }
        .action-btn span { font-size:18px; }
        .return-all { background:rgba(245,158,11,.1); color:#F59E0B; border:1px solid rgba(245,158,11,.2); }
        .return-all:hover { background:rgba(245,158,11,.15); }
        .return-select { background:rgba(74,108,247,.1); color:#4A6CF7; border:1px solid rgba(74,108,247,.2); }
        .return-select:hover { background:rgba(74,108,247,.15); }

        .confirm-section { margin-top:16px; padding:16px; background:rgba(245,158,11,.05); border:1px solid rgba(245,158,11,.15); border-radius:14px; }
        .confirm-text { font-size:14px; color:#A0A0B8; margin-bottom:14px; text-align:center; }
        .confirm-btns { display:flex; gap:10px; }
        .confirm-btn { flex:1; padding:12px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; border:none; transition:all .15s; }
        .confirm-btn.cancel { background:rgba(255,255,255,.06); color:#A0A0B8; }
        .confirm-btn.proceed { background:rgba(245,158,11,.15); color:#F59E0B; }
        .confirm-btn.proceed:hover { background:rgba(245,158,11,.25); }
        .confirm-btn:disabled { opacity:.5; cursor:not-allowed; }

        .sheet-close { width:100%; padding:14px; margin-top:16px; border-radius:12px; background:rgba(255,255,255,.04); color:#6B6B80; border:none; font-size:14px; font-weight:600; cursor:pointer; transition:all .15s; }
        .sheet-close:hover { background:rgba(255,255,255,.08); color:white; }

        .toast {
          position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
          padding:12px 24px; border-radius:12px; font-size:14px; font-weight:600;
          z-index:3000; animation:slideUp .3s ease-out;
        }
        .toast.success { background:rgba(34,197,94,.15); color:#22C55E; border:1px solid rgba(34,197,94,.2); }
        .toast.error { background:rgba(239,68,68,.15); color:#EF4444; border:1px solid rgba(239,68,68,.2); }

        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  );
}
