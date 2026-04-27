'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStore, PartyStore, TransactionStore } from '../lib/store';
import Button from '../components/Button';
import Input from '../components/Input';

export default function SalePage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

  // Sale items list
  const [cart, setCart] = useState([]);
  
  // Checkout State
  const [selectedParty, setSelectedParty] = useState('');
  const [newPartyName, setNewPartyName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('full_paid'); // full_paid, partial, full_udhaar
  const [amountPaid, setAmountPaid] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([ProductStore.getAll(), PartyStore.getAll()]).then(([prods, parts]) => {
      setProducts(prods);
      setParties(parts);
      setLoading(false);
    });
  }, []);

  // When user selects a product, immediately add it to the list with qty 1
  const handleProductSelect = (productId) => {
    if (!productId) return;
    const prod = products.find(p => p.id === productId);
    if (!prod || prod.quantity <= 0) return;

    const existingIndex = cart.findIndex(c => c.product.id === prod.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      const maxStock = newCart[existingIndex].product.quantity;
      if (newCart[existingIndex].quantity < maxStock) {
        newCart[existingIndex].quantity += 1;
        setCart(newCart);
      }
    } else {
      setCart([...cart, { product: prod, quantity: 1, price: prod.sellPrice, customTotal: null }]);
    }
    setError(null);
  };

  const updateQuantity = (index, newQty) => {
    const qty = Number(newQty);
    if (isNaN(qty) || qty <= 0) return;
    const maxStock = cart[index].product.quantity;
    const clampedQty = Math.min(qty, maxStock);
    const newCart = [...cart];
    newCart[index].quantity = clampedQty;
    newCart[index].customTotal = null;
    setCart(newCart);
  };

  const updateTotalPrice = (index, newTotal) => {
    const total = Number(newTotal);
    if (isNaN(total) || total < 0) return;
    const newCart = [...cart];
    newCart[index].customTotal = total;
    if (newCart[index].quantity > 0) {
      newCart[index].price = Math.round((total / newCart[index].quantity) * 100) / 100;
    }
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getLineTotal = (item) => item.customTotal != null ? item.customTotal : item.price * item.quantity;
  const totalAmount = cart.reduce((sum, item) => sum + getLineTotal(item), 0);

  // Search filter
  const filteredProducts = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);

    const isUdhaar = paymentStatus === 'partial' || paymentStatus === 'full_udhaar';
    if (!selectedParty && isUdhaar && !newPartyName.trim()) {
      setError("Please enter Customer Name for Udhaar.");
      setSubmitting(false);
      return;
    }

    const computedAmountPaid = (selectedParty || newPartyName) ? (
      paymentStatus === 'full_paid' ? totalAmount : 
      paymentStatus === 'full_udhaar' ? 0 : 
      Number(amountPaid)
    ) : totalAmount;

    const transactionData = {
      type: 'sale',
      amount: totalAmount,
      note: note || 'Point of Sale',
      partyId: selectedParty || null,
      newPartyName: (!selectedParty && isUdhaar) ? newPartyName.trim() : null,
      amountPaid: computedAmountPaid,
      items: cart.map(c => ({
        productId: c.product.id,
        quantity: c.quantity,
        price: c.price
      }))
    };

    const res = await TransactionStore.add(transactionData);
    if (res.success) {
      setSuccessData({
        totalAmount,
        totalItems: totalItemsCount,
        amountPaid: computedAmountPaid,
        items: cart.map(c => ({ name: c.product.name, qty: c.quantity, price: c.price })),
        partyName: selectedParty ? parties.find(p => p.id === selectedParty)?.name : (newPartyName || 'Walk-in Customer')
      });
      setCart([]);
      setNote('');
      setSelectedParty('');
      setNewPartyName('');
      setAmountPaid('');
      setPaymentStatus('full_paid');
    } else {
      setError(res.error);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (successData) {
    return (
      <div className="sale-page">
        <div className="sale-content success-view">
          <div className="success-icon">✅</div>
          <h1>Sale Completed!</h1>
          <div className="success-card">
            <div className="success-row highlight">
              <span>Total Bill</span>
              <span className="success-val green">₹{successData.totalAmount}</span>
            </div>
            {successData.partyName !== 'Walk-in Customer' && (
              <div className="success-row highlight-sub">
                <span>Amount Paid Now</span>
                <span className="success-val">₹{successData.amountPaid}</span>
              </div>
            )}
            {successData.partyName !== 'Walk-in Customer' && successData.amountPaid < successData.totalAmount && (
              <div className="success-row highlight-sub red">
                <span>Added to Udhaar</span>
                <span className="success-val">₹{successData.totalAmount - successData.amountPaid}</span>
              </div>
            )}
            <div className="success-row">
              <span>Total Items</span>
              <span className="success-val">{successData.totalItems}</span>
            </div>
            <div className="success-row">
              <span>Customer</span>
              <span className="success-val">{successData.partyName}</span>
            </div>
            <div className="success-divider" />
            {successData.items.map((item, i) => (
              <div key={i} className="success-row item-row">
                <span>{item.name} × {item.qty}</span>
                <span className="success-val">₹{item.qty * item.price}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => setSuccessData(null)} fullWidth size="lg">New Sale</Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')} fullWidth style={{ marginTop: 12 }}>Back to Dashboard</Button>
        </div>
        <style jsx>{`
          .sale-page { min-height: 100dvh; background: var(--bg-primary); display: flex; align-items: center; justify-content: center; }
          .success-view { text-align: center; max-width: 400px; width: 100%; padding: 24px; }
          .success-icon { font-size: 64px; margin-bottom: 16px; animation: bounceIn 0.5s ease-out; }
          .success-card { background: #252540; border-radius: 20px; padding: 24px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.06); text-align: left; }
          .success-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #A0A0B8; }
          .success-row.highlight { font-size: 16px; padding: 12px 0 4px; }
          .success-row.highlight-sub { font-size: 14px; padding: 4px 0; color: #A0A0B8; }
          .success-row.highlight-sub.red { color: #EF4444; }
          .success-val { color: white; font-weight: 700; }
          .success-val.green { color: #22C55E; font-size: 20px; }
          .success-divider { border-top: 1px dashed rgba(255,255,255,0.08); margin: 8px 0; }
          .item-row { font-size: 13px; }
          h1 { color: white; font-weight: 800; margin-bottom: 8px; }
          @keyframes bounceIn { 0%{transform:scale(.3);opacity:0} 50%{transform:scale(1.05)} 70%{transform:scale(.9)} 100%{transform:scale(1);opacity:1} }
        `}</style>
      </div>
    );
  }

  return (
    <div className="sale-page">
      <div className="sale-content">
        <div className="header">
          <button className="back-btn" onClick={() => router.back()}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1>New Sale</h1>
          {cart.length > 0 && (
            <div className="header-total">
              <span className="header-total-label">{totalItemsCount} items</span>
              <span className="header-total-amount">₹{totalAmount}</span>
            </div>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Product Selector - tap to add */}
        <div className="card">
          <h2>Tap a product to add</h2>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="product-grid">
            {filteredProducts.map(p => {
              const inCart = cart.find(c => c.product.id === p.id);
              const outOfStock = p.quantity <= 0;
              return (
                <button 
                  key={p.id} 
                  className={`product-chip ${inCart ? 'in-cart' : ''} ${outOfStock ? 'out-of-stock' : ''}`}
                  onClick={() => handleProductSelect(p.id)}
                  disabled={outOfStock}
                >
                  <span className="chip-name">{p.name}</span>
                  <span className="chip-price">₹{p.sellPrice}</span>
                  <span className="chip-stock">{p.quantity} {p.unit}</span>
                  {inCart && <span className="chip-badge">{inCart.quantity}</span>}
                </button>
              );
            })}
            {filteredProducts.length === 0 && <p className="no-results">No products found</p>}
          </div>
        </div>

        {/* Sale Items List */}
        {cart.length > 0 && (
          <div className="card">
            <h2>Items Sold</h2>
            <div className="cart-list">
              {cart.map((item, index) => {
                const isCustomPrice = item.price !== item.product.sellPrice;
                const maxStock = item.product.quantity;
                const lineTotal = getLineTotal(item);
                return (
                  <div key={index} className="cart-item">
                    <div className="cart-item-row1">
                      <div className="cart-item-info">
                        <p className="item-name">{item.product.name}</p>
                        <p className="item-stock">{maxStock} {item.product.unit} in stock</p>
                      </div>
                      <button className="remove-btn" onClick={() => removeFromCart(index)}>✕</button>
                    </div>
                    <div className="cart-item-row2">
                      <div className="qty-section">
                        <span className="field-label">Qty</span>
                        <div className="cart-item-controls">
                          <button className="qty-btn" onClick={() => updateQuantity(index, item.quantity - 1)}>−</button>
                          <input
                            type="number"
                            step="any"
                            className="qty-input"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, e.target.value)}
                            min="1"
                            max={maxStock}
                          />
                          <button
                            className="qty-btn"
                            disabled={item.quantity >= maxStock}
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                          >+</button>
                        </div>
                      </div>
                      <div className="total-section">
                        <span className="field-label">
                          Total {isCustomPrice && <span className="orig-price">was ₹{item.product.sellPrice * item.quantity}</span>}
                        </span>
                        <input
                          type="number"
                          step="any"
                          className="price-input total-input"
                          value={lineTotal}
                          onChange={(e) => updateTotalPrice(index, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="cart-total">
              <div className="total-label">
                <p>Total Items</p>
                <span>{totalItemsCount}</span>
              </div>
              <div className="total-label text-right">
                <p>Total Amount</p>
                <span className="total-value">₹{totalAmount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Checkout Section */}
        {cart.length > 0 && (
          <div className="card">
            <h2>Checkout</h2>
            <div className="input-group">
              <label>Customer (Party)</label>
              <select 
                value={selectedParty} 
                onChange={(e) => {
                  setSelectedParty(e.target.value);
                  setNewPartyName('');
                  if (!e.target.value) { setAmountPaid(''); setPaymentStatus('full_paid'); }
                }}
                className="custom-select"
              >
                <option value="">Walk-in Customer</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group highlight-box">
              <label>Payment Mode</label>
              <div className="payment-modes">
                <button type="button" className={`pmode-btn ${paymentStatus === 'full_paid' ? 'active' : ''}`} onClick={() => setPaymentStatus('full_paid')}>
                  Fully Paid
                </button>
                <button type="button" className={`pmode-btn ${paymentStatus === 'partial' ? 'active' : ''}`} onClick={() => setPaymentStatus('partial')}>
                  Custom Amount
                </button>
                <button type="button" className={`pmode-btn ${paymentStatus === 'full_udhaar' ? 'active' : ''}`} onClick={() => setPaymentStatus('full_udhaar')}>
                  Full Udhaar
                </button>
              </div>
              
              {!selectedParty && (paymentStatus === 'partial' || paymentStatus === 'full_udhaar') && (
                <div style={{ marginTop: 12 }}>
                  <input 
                    type="text" 
                    value={newPartyName} 
                    onChange={(e) => setNewPartyName(e.target.value)}
                    placeholder="Customer Name (Required to save Udhaar)"
                    className="custom-select"
                  />
                  <p className="udhaar-hint" style={{ color: '#A0A0B8', marginTop: 4 }}>A new Khata will be created automatically.</p>
                </div>
              )}
              
              {paymentStatus === 'partial' && (
                <input 
                  type="number" 
                  value={amountPaid} 
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`Enter amount paid (Total: ₹${totalAmount})`}
                  className="custom-select"
                  style={{ marginTop: 12 }}
                />
              )}
              
              {paymentStatus === 'partial' && amountPaid !== '' && Number(amountPaid) < totalAmount && (
                <p className="udhaar-hint">₹{totalAmount - Number(amountPaid)} will be added to Khata.</p>
              )}
              
              {paymentStatus === 'partial' && amountPaid !== '' && Number(amountPaid) > totalAmount && (
                <p className="udhaar-hint" style={{ color: '#22C55E' }}>₹{Number(amountPaid) - totalAmount} Excess (Advance) will be credited to Khata.</p>
              )}
              
              {paymentStatus === 'full_udhaar' && (
                <p className="udhaar-hint" style={{ marginTop: 8 }}>Entire ₹{totalAmount} will be added to Khata.</p>
              )}
            </div>
            
            <Input
              label="Note (Optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via UPI"
            />

            <Button 
              onClick={handleCompleteSale} 
              loading={submitting} 
              fullWidth 
              size="lg"
              style={{ marginTop: 16 }}
            >
              Complete Sale (₹{totalAmount})
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        .sale-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 88px; color: white; }
        .sale-content { max-width: 480px; margin: 0 auto; padding: 16px; }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-top: 8px; }
        .back-btn { background: rgba(255,255,255,0.05); border: none; width: 40px; height: 40px; border-radius: 12px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .header h1 { font-size: 24px; font-weight: 700; margin: 0; flex: 1; }
        .header-total { text-align: right; }
        .header-total-label { font-size: 11px; color: #A0A0B8; display: block; }
        .header-total-amount { font-size: 18px; font-weight: 800; color: #22C55E; }
        
        .error-banner { background: rgba(239, 68, 68, 0.1); color: #EF4444; padding: 12px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2); margin-bottom: 16px; font-size: 14px; text-align: center; }

        .card { background: #252540; border-radius: 16px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.04); }
        .card h2 { font-size: 14px; margin-top: 0; margin-bottom: 14px; color: #6B6B80; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .product-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .product-chip {
          position: relative;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 12px 14px; min-width: 80px;
          background: rgba(0,0,0,0.2); border: 1.5px solid rgba(255,255,255,0.06);
          border-radius: 12px; color: white; cursor: pointer;
          transition: all 0.15s ease;
        }
        .product-chip:active { transform: scale(0.95); }
        .product-chip.in-cart { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.08); }
        .product-chip.out-of-stock { opacity: 0.4; cursor: not-allowed; }
        .chip-name { font-size: 13px; font-weight: 600; text-align: center; }
        .chip-price { font-size: 11px; color: #A0A0B8; }
        .chip-stock { font-size: 10px; color: #6B6B80; }
        .chip-badge {
          position: absolute; top: -6px; right: -6px;
          width: 22px; height: 22px; border-radius: 50%;
          background: #22C55E; color: white;
          font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .search-input {
          width: 100%; padding: 10px 14px; margin-bottom: 12px;
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: white; font-size: 14px; outline: none;
        }
        .search-input:focus { border-color: #7B42C4; }
        .search-input::placeholder { color: #6B6B80; }
        .no-results { color: #6B6B80; font-size: 13px; text-align: center; padding: 16px; width: 100%; }
        
        .input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .input-group label { font-size: 13px; color: #A0A0B8; }

        .custom-select { 
          width: 100%; padding: 12px 14px; background: rgba(0,0,0,0.2); 
          border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; 
          color: white; font-size: 15px; outline: none; transition: border-color 0.2s;
        }
        .custom-select:focus { border-color: #7B42C4; }
        
        .highlight-box { background: rgba(123,66,196,0.1); padding: 12px; border-radius: 12px; border: 1px dashed rgba(123,66,196,0.3); }
        .payment-modes { display: flex; gap: 8px; margin-top: 4px; }
        .pmode-btn { flex: 1; padding: 10px 4px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #A0A0B8; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .pmode-btn.active { background: #7B42C4; color: white; border-color: #7B42C4; }
        .udhaar-hint { font-size: 12px; color: #EF4444; margin-top: 6px; font-weight: 600; }
        
        .cart-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
        .cart-item { padding: 12px; background: rgba(0,0,0,0.2); border-radius: 12px; }
        .cart-item-row1 { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
        .cart-item-info { flex: 1; min-width: 0; }
        .item-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-stock { font-size: 11px; color: #6B6B80; }
        .cart-item-row2 { display: flex; gap: 10px; align-items: flex-end; }
        .qty-section { flex: 1; }
        .total-section { flex: 1; }
        .field-label { display: block; font-size: 10px; color: #6B6B80; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .orig-price { text-decoration: line-through; color: #EF4444; font-size: 10px; margin-left: 4px; }
        .cart-item-controls { display: flex; align-items: center; gap: 2px; }
        .qty-btn {
          width: 28px; height: 32px; border-radius: 8px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: white; font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s; flex-shrink: 0;
        }
        .qty-btn:active { background: rgba(255,255,255,0.15); }
        .qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .qty-input {
          width: 40px; height: 32px; text-align: center; font-size: 14px; font-weight: 700;
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
          color: white; outline: none;
        }
        .qty-input:focus { border-color: #7B42C4; }
        .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .price-input {
          width: 100%; height: 32px; text-align: center; font-size: 14px; font-weight: 700;
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
          color: white; outline: none;
        }
        .price-input:focus { border-color: #7B42C4; }
        .price-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .total-input { color: #22C55E; }
        .remove-btn { background: rgba(239,68,68,0.1); color: #EF4444; border: none; cursor: pointer; font-size: 12px; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .remove-btn:hover { background: rgba(239,68,68,0.2); }
        
        .cart-total { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px dashed rgba(255,255,255,0.1); }
        .total-label p { font-size: 12px; color: #A0A0B8; margin-bottom: 4px; }
        .total-label span { font-size: 18px; font-weight: 700; color: white; }
        .total-value { color: #22C55E !important; font-size: 22px !important; font-weight: 800 !important; }
        .text-right { text-align: right; }

        .loading { color: white; text-align: center; padding: 40px; }
      `}</style>
    </div>
  );
}
