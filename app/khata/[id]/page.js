'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PartyStore, TransactionStore } from '../../lib/store';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function PartyDetailsPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentType, setPaymentType] = useState('payment_in');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  useEffect(() => {
    loadParty();
  }, []);

  const loadParty = async () => {
    const data = await PartyStore.getById(unwrappedParams.id);
    if (!data) router.push('/khata');
    setParty(data);
    setLoading(false);
  };

  const getNoteForType = (type) => {
    switch(type) {
      case 'payment_in': return 'Payment Received';
      case 'payment_out': return 'Payment Given';
      case 'sale': return 'Manual Due / Bill Added';
      case 'purchase': return 'Manual Purchase / Bill Added';
      default: return 'Manual Entry';
    }
  };
  const isYouGot = (type) => type === 'purchase' || type === 'payment_in';

  const handlePayment = async (e) => {
    e.preventDefault();
    if (savingEntry) return;
    if (!amount || Number(amount) <= 0) return;

    setSavingEntry(true);
    const result = await TransactionStore.add({
      type: paymentType,
      amount: Number(amount),
      note: note || getNoteForType(paymentType),
      partyId: party.id,
      items: [] // Manual entries don't involve inventory items directly
    });

    if (result?.success) {
      setShowPayment(false);
      setAmount('');
      setNote('');
      await loadParty(); // Reload to get updated balance and history
    }
    setSavingEntry(false);
  };

  const getEntryTitle = () => {
    if (paymentType === 'sale') return 'Add Due';
    if (paymentType === 'purchase') return 'Add Bill';
    if (paymentType === 'payment_in') return 'Payment Received';
    if (paymentType === 'payment_out') return 'Payment Given';
    return 'Ledger Entry';
  };

  if (loading || !party) return <div className="loading">Loading...</div>;

  return (
    <div className="party-page">
      <div className="party-content">
        <div className="header">
          <button className="back-btn" onClick={() => router.push('/khata')}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="header-info">
            <h1>{party.name}</h1>
            <p>{party.phone || 'No phone'}</p>
          </div>
        </div>

        <div className="balance-card">
          <p className="bal-label">Net Balance</p>
          {party.balance === 0 ? (
             <h2 className="bal-settled">₹0 (Settled)</h2>
          ) : party.balance > 0 ? (
             <h2 className="bal-get">₹{party.balance} <small>You will get</small></h2>
          ) : (
             <h2 className="bal-give">₹{Math.abs(party.balance)} <small>You will give</small></h2>
          )}
        </div>

        <div className="action-row">
          {party.type === 'customer' ? (
            <>
              <button className="action-btn green-btn" onClick={() => { setPaymentType('sale'); setShowPayment(true); }}>
                Add Due<br/><small>(To Take)</small>
              </button>
              <button className="action-btn green-btn" onClick={() => { setPaymentType('payment_in'); setShowPayment(true); }}>
                Payment<br/><small>(Received)</small>
              </button>
            </>
          ) : (
            <>
              <button className="action-btn red-btn" onClick={() => { setPaymentType('purchase'); setShowPayment(true); }}>
                Add Bill<br/><small>(To Give)</small>
              </button>
              <button className="action-btn red-btn" onClick={() => { setPaymentType('payment_out'); setShowPayment(true); }}>
                Payment<br/><small>(Given)</small>
              </button>
            </>
          )}
        </div>

        <div className="history-section">
          <h3>Recent Transactions</h3>
          {party.transactions?.length === 0 ? (
            <p className="empty">No transactions with this party.</p>
          ) : (
            <div className="txn-list">
              {party.transactions?.map(t => (
                <div key={t.id} className="txn-card">
                  <div className="txn-info">
                    <p className="txn-type">{t.type.replace('_', ' ').toUpperCase()}</p>
                    <p className="txn-date">{new Date(t.date).toLocaleString()}</p>
                    {t.note && <p className="txn-note">{t.note}</p>}
                  </div>
                  <div className={`txn-amt ${t.type === 'purchase' || t.type === 'payment_in' ? 'green' : 'red'}`}>
                  {t.type === 'purchase' || t.type === 'payment_in' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPayment && (
          <div className="modal-overlay" onClick={() => setShowPayment(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2 className={isYouGot(paymentType) ? 'green' : 'red'}>
                {getEntryTitle()}
              </h2>
              <form onSubmit={handlePayment}>
                <Input 
                  label="Amount *" 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  autoFocus 
                  prefix="₹"
                />
                <Input 
                  label="Note (Optional)" 
                  value={note} 
                  onChange={e => setNote(e.target.value)} 
                />
                
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowPayment(false)} disabled={savingEntry}>Cancel</button>
                  <Button type="submit" loading={savingEntry} disabled={savingEntry}>Save Entry</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .party-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 88px; color: var(--text-primary); }
        .party-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-top: 8px; }
        .back-btn { background: rgba(255,255,255,0.05); border: none; width: 40px; height: 40px; border-radius: 12px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .header h1 { font-size: 20px; font-weight: 700; margin: 0; }
        .header p { font-size: 13px; color: var(--text-secondary); margin: 0; }
        
        .balance-card { background: var(--bg-surface-solid); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.04); }
        .bal-label { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
        .bal-settled { font-size: 28px; color: var(--text-secondary); }
        .bal-get { font-size: 28px; color: var(--color-success); }
        .bal-give { font-size: 28px; color: var(--color-danger); }
        .balance-card small { font-size: 14px; opacity: 0.8; font-weight: 500; display: block; margin-top: 4px; }

        .action-row { display: flex; gap: 12px; margin-bottom: 32px; }
        .action-btn { flex: 1; padding: 12px; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; color: var(--text-primary); cursor: pointer; transition: transform 0.2s; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .action-btn small { font-size: 11px; font-weight: 500; opacity: 0.9; }
        .action-btn:active { transform: scale(0.95); }
        .red-btn { background: var(--color-danger); }
        .green-btn { background: var(--color-success); }

        .history-section h3 { font-size: 16px; margin-bottom: 16px; color: var(--text-secondary); }
        .txn-list { display: flex; flex-direction: column; gap: 10px; }
        .txn-card { display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--bg-surface-solid); border-radius: 12px; border: 1px solid rgba(255,255,255,0.04); }
        .txn-type { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
        .txn-date { font-size: 12px; color: var(--text-muted); }
        .txn-note { font-size: 12px; color: var(--text-secondary); margin-top: 4px; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; display: inline-block; }
        .txn-amt { font-size: 16px; font-weight: 700; }
        .txn-amt.green { color: var(--color-success); }
        .txn-amt.red { color: var(--color-danger); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; backdrop-filter: blur(4px); }
        .modal-content { background: var(--bg-surface-solid); width: 100%; max-width: 400px; border-radius: 20px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); }
        .modal-content h2 { font-size: 20px; margin-bottom: 20px; }
        .modal-content h2.green { color: var(--color-success); }
        .modal-content h2.red { color: var(--color-danger); }
        
        .modal-actions { display: flex; gap: 12px; margin-top: 24px; }
        .modal-actions > * { flex: 1; }
        .cancel-btn { background: rgba(255,255,255,0.05); color: var(--text-primary); border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
        .loading { color: var(--text-primary); text-align: center; padding: 40px; }
      `}</style>
    </div>
  );
}
