'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PartyStore } from '../lib/store';
import Button from '../components/Button';
import Input from '../components/Input';

export default function KhataPage() {
  const router = useRouter();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'give' | 'get'
  
  // Add Party Modal
  const [showAdd, setShowAdd] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newParty, setNewParty] = useState({ name: '', phone: '', type: 'customer' });
  const [editingParty, setEditingParty] = useState(null);
  const [editPhone, setEditPhone] = useState('');
  const [isPhoneSaving, setIsPhoneSaving] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    const data = await PartyStore.getAll();
    setParties(data);
    setLoading(false);
  };

  const handleAddParty = async (e) => {
    e.preventDefault();
    if (!newParty.name || isSaving) return;
    setIsSaving(true);
    try {
      await PartyStore.add(newParty);
      setShowAdd(false);
      setNewParty({ name: '', phone: '', type: 'customer' });
      loadParties();
    } finally {
      setIsSaving(false);
    }
  };

  const normalizePhoneForStorage = (rawPhone) => {
    const input = String(rawPhone || '').trim();
    if (!input) return '';
    const digits = input.replace(/\D/g, '');
    if (input.startsWith('+')) return `+${digits}`;
    return digits;
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    if (!editingParty || isPhoneSaving) return;
    const phone = normalizePhoneForStorage(editPhone);
    if (!phone) return;
    setIsPhoneSaving(true);
    try {
      await PartyStore.update(editingParty.id, { phone });
      setEditingParty(null);
      setEditPhone('');
      await loadParties();
    } finally {
      setIsPhoneSaving(false);
    }
  };

  const totalOwedToUs = parties.filter(p => p.balance > 0).reduce((sum, p) => sum + p.balance, 0);
  const totalWeOwe = parties.filter(p => p.balance < 0).reduce((sum, p) => sum + Math.abs(p.balance), 0);

  const filteredParties = parties.filter(p => {
    if (filter === 'give') return p.balance < 0;
    if (filter === 'get') return p.balance > 0;
    return true;
  });

  return (
    <div className="khata-page">
      <div className="khata-content">
        <div className="header">
          <button className="back-btn" onClick={() => router.push('/dashboard')}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1>Profitly Ledger</h1>
          <button className="add-btn" onClick={() => setShowAdd(true)}>+</button>
        </div>

        <div className="summary-cards">
          <div 
            className={`sum-card red ${filter === 'give' ? 'active-filter' : ''}`}
            onClick={() => setFilter(filter === 'give' ? 'all' : 'give')}
          >
            <p>You will give</p>
            <h3>₹{totalWeOwe}</h3>
          </div>
          <div 
            className={`sum-card green ${filter === 'get' ? 'active-filter' : ''}`}
            onClick={() => setFilter(filter === 'get' ? 'all' : 'get')}
          >
            <p>You will get</p>
            <h3>₹{totalOwedToUs}</h3>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : parties.length === 0 ? (
          <div className="empty">
            <p className="empty-icon">📒</p>
            <p>No parties added yet.</p>
            <Button onClick={() => setShowAdd(true)} style={{ marginTop: 16 }}>Add First Party</Button>
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="empty">
            <p className="empty-icon">🔍</p>
            <p>No parties match this filter.</p>
            <Button onClick={() => setFilter('all')} style={{ marginTop: 16 }}>Show All</Button>
          </div>
        ) : (
          <div className="party-list">
            {filteredParties.map(p => (
              <div key={p.id} className="party-card" onClick={() => router.push(`/khata/${p.id}`)}>
                <div className="party-avatar">{p.name.charAt(0).toUpperCase()}</div>
                <div className="party-info">
                  <p className="party-name">{p.name}</p>
                  <p className="party-type">{p.type === 'customer' ? 'Customer' : 'Supplier'}</p>
                </div>
                <button
                  className="phone-chip"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingParty(p);
                    setEditPhone(p.phone || '');
                  }}
                >
                  {p.phone ? 'Edit Phone' : 'Add Phone'}
                </button>
                <div className="party-bal">
                  {p.balance === 0 ? (
                    <span className="bal-settled">Settled</span>
                  ) : p.balance > 0 ? (
                    <span className="bal-get">₹{p.balance} <small>You will get</small></span>
                  ) : (
                    <span className="bal-give">₹{Math.abs(p.balance)} <small>You will give</small></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAdd && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Add New Party</h2>
              <form onSubmit={handleAddParty}>
                <div className="form-group">
                  <label>Type</label>
                  <div className="type-toggle">
                    <button type="button" className={newParty.type === 'customer' ? 'active' : ''} onClick={() => setNewParty({...newParty, type: 'customer'})}>Customer</button>
                    <button type="button" className={newParty.type === 'supplier' ? 'active' : ''} onClick={() => setNewParty({...newParty, type: 'supplier'})}>Supplier</button>
                  </div>
                </div>
                <Input label="Name *" value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} autoFocus />
                <Input label="Phone (Optional)" value={newParty.phone} onChange={e => setNewParty({...newParty, phone: e.target.value})} />
                
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowAdd(false)}>Cancel</button>
                  <Button type="submit" loading={isSaving}>Save</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingParty && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Update Phone Number</h2>
              <form onSubmit={handleSavePhone}>
                <Input label="Phone *" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="10-digit or +91 format" autoFocus />
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setEditingParty(null)} disabled={isPhoneSaving}>Cancel</button>
                  <Button type="submit" loading={isPhoneSaving} disabled={isPhoneSaving || !normalizePhoneForStorage(editPhone)}>Save Phone</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .khata-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 88px; color: var(--text-primary); }
        .khata-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-top: 8px; }
        .back-btn, .add-btn { background: rgba(255,255,255,0.05); border: none; width: 40px; height: 40px; border-radius: 12px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .header h1 { font-size: 24px; font-weight: 700; margin: 0; }
        
        .summary-cards { display: flex; gap: 12px; margin-bottom: 24px; }
        .sum-card { flex: 1; padding: 16px; border-radius: 16px; background: var(--bg-surface-solid); border: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: all 0.2s; }
        .sum-card:active { transform: scale(0.97); }
        .sum-card.green { border-left: 4px solid var(--color-success); }
        .sum-card.green.active-filter { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-left: 4px solid var(--color-success); }
        .sum-card.red { border-left: 4px solid var(--color-danger); }
        .sum-card.red.active-filter { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-left: 4px solid var(--color-danger); }
        .sum-card p { font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
        .sum-card h3 { font-size: 22px; font-weight: 800; }
        .sum-card.green h3 { color: var(--color-success); }
        .sum-card.red h3 { color: var(--color-danger); }

        .party-list { display: flex; flex-direction: column; gap: 10px; }
        .party-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--bg-surface-solid); border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.04); }
        .party-avatar { width: 40px; height: 40px; border-radius: 50%; background: #7B42C4; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
        .party-info { flex: 1; }
        .party-name { font-size: 15px; font-weight: 600; }
        .party-type { font-size: 12px; color: var(--text-muted); text-transform: capitalize; }
        .phone-chip {
          margin-right: 10px;
          min-width: 82px;
          height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: var(--bg-surface-subtle);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }
        .party-bal { text-align: right; }
        .bal-settled { color: var(--text-secondary); font-size: 13px; font-weight: 500; }
        .bal-get { color: var(--color-success); font-size: 15px; font-weight: 700; display: flex; flex-direction: column; }
        .bal-give { color: var(--color-danger); font-size: 15px; font-weight: 700; display: flex; flex-direction: column; }
        .party-bal small { font-size: 10px; font-weight: 500; opacity: 0.8; }

        .loading, .empty { text-align: center; padding: 40px; color: var(--text-secondary); }
        .empty-icon { font-size: 40px; margin-bottom: 12px; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; backdrop-filter: blur(4px); }
        .modal-content { background: var(--bg-surface-solid); width: 100%; max-width: 400px; border-radius: 20px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); }
        .modal-content h2 { font-size: 20px; margin-bottom: 20px; }
        
        .type-toggle { display: flex; background: rgba(0,0,0,0.2); border-radius: 10px; padding: 4px; margin-bottom: 16px; }
        .type-toggle button { flex: 1; padding: 10px; border: none; background: transparent; color: var(--text-secondary); font-weight: 600; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .type-toggle button.active { background: #7B42C4; color: var(--text-primary); }
        
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
        
        .modal-actions { display: flex; gap: 12px; margin-top: 24px; }
        .modal-actions > * { flex: 1; }
        .cancel-btn { background: rgba(255,255,255,0.05); color: var(--text-primary); border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
      `}</style>
    </div>
  );
}
