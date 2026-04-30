'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProductStore, PartyStore, TransactionStore, CATEGORIES, UNITS } from '../../lib/store';
import Button from '../../components/Button';
import Input from '../../components/Input';

const numberToWords = (num) => {
  if (!num || isNaN(num) || num <= 0) return '';
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'overflow';
    let str = '';
    n = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
  };

  const [intPart, decPart] = num.toString().split('.');
  let res = inWords(parseInt(intPart));
  if (!res) return '';
  res += ' Rupees';
  if (decPart && parseInt(decPart) > 0) {
     const decStr = inWords(parseInt(decPart.padEnd(2, '0').substring(0, 2)));
     if (decStr) res += ' and ' + decStr + ' Paise';
  }
  return res;
};

export default function AddProductPage() {
  const router = useRouter();
  const [mode, setMode] = useState('single'); // 'single' | 'bulk'
  
  // === SINGLE MODE STATE ===
  const [form, setForm] = useState({
    name: '', category: 'Grocery', unit: 'pcs',
    quantity: '', buyPrice: '', sellPrice: '', lowStockThreshold: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // === BULK MODE STATE ===
  const [products, setProducts] = useState([]);
  const [defaultCategory, setDefaultCategory] = useState('Grocery');
  const [touchedCategories, setTouchedCategories] = useState(new Set());
  const emptyRow = (cat = 'Grocery') => ({ name: '', category: cat, quantity: '0', buyPrice: '0', sellPrice: '0' });
  const [bulkRows, setBulkRows] = useState(() => Array.from({ length: 10 }, () => emptyRow('Grocery')));
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccessData, setBulkSuccessData] = useState(null);

  // === UPDATE MODE STATE ===
  const emptyUpdateRow = (cat = 'Grocery') => ({ name: '', category: cat, quantity: '0', buyPrice: '0', sellPrice: '0' });
  const [updateRows, setUpdateRows] = useState(() => Array.from({ length: 5 }, () => emptyUpdateRow('Grocery')));
  const [updateTouchedCategories, setUpdateTouchedCategories] = useState(new Set());
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccessData, setUpdateSuccessData] = useState(null);
  const normalizeDecimalInput = (v, decimals = 2) => {
    if (v === '') return '';
    if (v.startsWith('.')) return `0${v}`;
    if (v.includes('.')) {
      const [intPart, fracPart] = v.split('.');
      const cleanInt = intPart.replace(/^0+(?=\d)/, '') || '0';
      return `${cleanInt}.${(fracPart ?? '').slice(0, decimals)}`;
    }
    return v.replace(/^0+(?=\d)/, '');
  };

  useEffect(() => {
    ProductStore.getAll().then(setProducts);
    
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get('mode');
    if (nextMode === 'bulk' || nextMode === 'single' || nextMode === 'update') {
      setMode(nextMode);
    }
  }, []);

  // === SINGLE MODE LOGIC ===
  const update = (key, val) => {
    const numericFields = new Set(['quantity', 'buyPrice', 'sellPrice', 'lowStockThreshold']);
    const nextValue = numericFields.has(key) ? normalizeDecimalInput(val) : val;
    setForm((prev) => {
      const next = { ...prev, [key]: nextValue };
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.quantity || Number(form.quantity) < 0) e.quantity = 'Enter valid quantity';
    if (!form.buyPrice || Number(form.buyPrice) < 0) e.buyPrice = 'Enter buying price';
    if (!form.sellPrice || Number(form.sellPrice) < 0) e.sellPrice = 'Enter selling price';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const result = await ProductStore.add(form);
      if (!result?.success) {
        const friendly = (result?.status === 409)
          ? 'Item already present in inventory. You can edit existing item instead.'
          : (result?.status === 400)
          ? 'Please enter valid values. Negative values are not allowed.'
          : (result?.error || 'Could not save product right now. Please try again.');
        setErrors({ submit: friendly });
      } else {
        setSuccess(true);
        await new Promise((r) => setTimeout(r, 800));
        router.push('/inventory');
      }
    } catch (err) {
      setErrors({ submit: 'Failed to add product. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // === BULK ADD LOGIC ===
  const updateBulkRow = (index, field, value) => {
    if (field === 'category') {
      setTouchedCategories(prev => new Set(prev).add(index));
    }
    setBulkRows(prev => {
      const copy = [...prev];
      let rowUpdates = { [field]: value };
      
      if (field === 'name') {
        const existingMatch = products.find(p => p.name.toLowerCase() === value.toLowerCase().trim());
        if (existingMatch) {
          rowUpdates = {
            ...rowUpdates,
            category: existingMatch.category,
            buyPrice: existingMatch.buyPrice?.toString() || '0',
            sellPrice: existingMatch.sellPrice?.toString() || '0',
          };
          setTouchedCategories(prevSets => new Set(prevSets).add(index));
        }
      }

      copy[index] = { ...copy[index], ...rowUpdates };
      return copy;
    });
  };

  const removeBulkRow = (index) => {
    setBulkRows(prev => prev.filter((_, i) => i !== index));
    setTouchedCategories(prev => {
      const next = new Set();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const addMoreRows = () => {
    setBulkRows(prev => [...prev, ...Array.from({ length: 5 }, () => emptyRow(defaultCategory))]);
  };

  const handleDefaultCategoryChange = (newCat) => {
    setDefaultCategory(newCat);
    setBulkRows(prev => prev.map((row, i) => {
      if (touchedCategories.has(i)) return row;
      return { ...row, category: newCat };
    }));
    setUpdateRows(prev => prev.map((row, i) => {
      if (updateTouchedCategories.has(i)) return row;
      return { ...row, category: newCat };
    }));
  };

  const filledRows = bulkRows.filter(r => r.name.trim() !== '');

  const handleBulkSave = async () => {
    if (filledRows.length === 0) {
      setErrors({ submit: 'Please fill at least one product name.' });
      return;
    }
    setBulkLoading(true);
    setErrors({});
    try {
      const productsToAdd = filledRows.map(r => ({
        name: r.name.trim(),
        category: r.category,
        unit: 'pcs',
        quantity: normalizeDecimalInput(String(r.quantity)) || '0',
        buyPrice: normalizeDecimalInput(String(r.buyPrice)) || '0',
        sellPrice: normalizeDecimalInput(String(r.sellPrice)) || '0',
        lowStockThreshold: '0',
      }));
      const result = await ProductStore.addBulk(productsToAdd);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to add products.');
      }
      setBulkSuccessData({ count: productsToAdd.length });
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to add products.' });
    } finally {
      setBulkLoading(false);
    }
  };

  // === UPDATE MODE LOGIC ===
  const updateUpdateRow = (index, field, value) => {
    if (field === 'category') setUpdateTouchedCategories(prev => new Set(prev).add(index));
    setUpdateRows(prev => {
      const copy = [...prev];
      let rowUpdates = { [field]: value };
      
      if (field === 'name') {
        const existingMatch = products.find(p => p.name.toLowerCase() === value.toLowerCase().trim());
        if (existingMatch) {
          rowUpdates = {
            ...rowUpdates,
            category: existingMatch.category,
            buyPrice: existingMatch.buyPrice?.toString() || '0',
            sellPrice: existingMatch.sellPrice?.toString() || '0',
          };
          setUpdateTouchedCategories(prevSets => new Set(prevSets).add(index));
        }
      }

      copy[index] = { ...copy[index], ...rowUpdates };
      return copy;
    });
  };

  const adjustUpdateQty = (index, delta) => {
    setUpdateRows(prev => {
      const copy = [...prev];
      const current = parseFloat(copy[index].quantity) || 0;
      copy[index] = { ...copy[index], quantity: Math.max(0, current + delta).toString() };
      return copy;
    });
  };

  const removeUpdateRow = (index) => {
    setUpdateRows(prev => prev.filter((_, i) => i !== index));
    setUpdateTouchedCategories(prev => {
      const next = new Set();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const addMoreUpdateRows = () => {
    setUpdateRows(prev => [...prev, ...Array.from({ length: 5 }, () => emptyUpdateRow(defaultCategory))]);
  };

  const filledUpdateRows = updateRows.filter(r => r.name.trim() !== '');

  const handleUpdateSave = async () => {
    // Only send products that exactly match existing ones, as per rules "this should not create a new entry"
    const validRows = filledUpdateRows.filter(r => 
      products.some(p => p.name.toLowerCase() === r.name.trim().toLowerCase())
    );
    
    if (validRows.length === 0) {
      if (filledUpdateRows.length > 0) {
        setErrors({ submit: 'None of the selected rows match existing products. Update mode only modifies existing inventory.' });
      }
      return;
    }
    
    setUpdateLoading(true);
    setErrors({});
    try {
      const productsToUpdate = validRows.map(r => {
        const existing = products.find(p => p.name.toLowerCase() === r.name.trim().toLowerCase());
        return {
          name: r.name.trim(),
          category: existing.category,
          unit: 'pcs',
          quantity: normalizeDecimalInput(String(r.quantity)) || '0',
          buyPrice: existing.buyPrice,
          sellPrice: existing.sellPrice,
          lowStockThreshold: existing.lowStockThreshold || '0'
        };
      });
      
      const result = await ProductStore.addBulk(productsToUpdate);
      if (!result?.success) throw new Error(result?.error || 'Failed to update stock.');
      
      const totalUnits = productsToUpdate.reduce((sum, p) => sum + parseFloat(p.quantity), 0);
      setUpdateSuccessData({ productCount: productsToUpdate.length, totalUnits });
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      setErrors({ submit: e.message || 'Failed to update stock.' });
    } finally {
      setUpdateLoading(false);
    }
  };

  const profit = Math.round(((Number(form.sellPrice) || 0) - (Number(form.buyPrice) || 0)) * 100) / 100;
  const margin = Number(form.buyPrice) > 0 ? ((profit / Number(form.buyPrice)) * 100).toFixed(2) : '0.00';

  // === SUCCESS SCREENS ===
  if (success || bulkSuccessData || updateSuccessData) {
    return (
      <div className="success-screen">
        <div className="success-content">
          <div className="success-icon">✅</div>
          <h2>
            {success ? 'Product Added!' : 
             bulkSuccessData ? `${bulkSuccessData.count} Products Added!` : 
             'Stock Updated!'}
          </h2>
          {success ? (
            <p>{form.name} has been added to your inventory</p>
          ) : bulkSuccessData ? (
            <p>{bulkSuccessData.count} new products have been added to your inventory</p>
          ) : (
            <p>{updateSuccessData.productCount} products · {updateSuccessData.totalUnits} units added to stock</p>
          )}
          <Button onClick={() => {
            if (success) {
              setSuccess(false);
            } else if (bulkSuccessData) {
              setBulkSuccessData(null);
              setBulkRows(Array.from({ length: 10 }, () => emptyRow(defaultCategory)));
              setTouchedCategories(new Set());
            } else {
              setUpdateSuccessData(null);
              setUpdateRows(Array.from({ length: 5 }, () => emptyUpdateRow(defaultCategory)));
              setUpdateTouchedCategories(new Set());
            }
          }} fullWidth size="lg" style={{ marginTop: 20 }}>
            {success ? 'Add Another Product' : bulkSuccessData ? 'Add More Products' : 'Update More Stock'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/inventory')} fullWidth style={{ marginTop: 12 }}>
            Back to Inventory
          </Button>
        </div>
        <style jsx>{`
          .success-screen { min-height: 100dvh; background: var(--bg-primary); display: flex; align-items: center; justify-content: center; }
          .success-content { text-align: center; animation: bounceIn 0.6s ease-out; max-width: 420px; width: 100%; padding: 24px; }
          .success-icon { font-size: 64px; margin-bottom: 16px; }
          h2 { font-size: 22px; color: var(--text-primary); margin-bottom: 8px; }
          p { color: var(--text-secondary); font-size: 15px; }
          @keyframes bounceIn { 0%{transform:scale(.3);opacity:0} 50%{transform:scale(1.05)} 70%{transform:scale(.9)} 100%{transform:scale(1);opacity:1} }
        `}</style>
      </div>
    );
  }

  return (
    <div className="add-page">
      <div className="add-content">
        <div className="add-header">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0B8" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="add-title">
            {mode === 'single' ? 'Add Product' : mode === 'bulk' ? 'Bulk Add' : 'Bulk Update'}
          </h1>
          <div style={{ width: 40 }} />
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>
            ➕ Single
          </button>
          <button className={`mode-btn ${mode === 'bulk' ? 'active' : ''}`} onClick={() => setMode('bulk')}>
            📦 Bulk Add
          </button>
          <button className={`mode-btn ${mode === 'update' ? 'active' : ''}`} onClick={() => setMode('update')}>
            🔄 Bulk Update
          </button>
        </div>

        {mode === 'single' ? (
          /* === SINGLE PRODUCT FORM === */
          <form onSubmit={handleSubmit} className="add-form">
            <Input id="prod-name" label="Product Name *" placeholder="e.g. Tata Salt 1kg" value={form.name} onChange={(e) => update('name', e.target.value)} error={errors.name} autoFocus />

            <div className="row-2">
              <div className="select-group">
                <label className="select-label">Category</label>
                <select className="select-field" value={form.category} onChange={(e) => update('category', e.target.value)} id="prod-category">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="select-group">
                <label className="select-label">Unit</label>
                <select className="select-field" value={form.unit} onChange={(e) => update('unit', e.target.value)} id="prod-unit">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <Input id="prod-qty" label="Quantity *" type="number" step="any" min="0" inputMode="decimal" placeholder="0" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} error={errors.quantity} />

            <div className="row-2">
              <Input id="prod-buy" label="Buy Price (₹) *" type="number" min="0" inputMode="decimal" prefix="₹" placeholder="0" value={form.buyPrice} onChange={(e) => update('buyPrice', e.target.value)} error={errors.buyPrice} />
              <Input id="prod-sell" label="Sell Price (₹) *" type="number" min="0" inputMode="decimal" prefix="₹" placeholder="0" value={form.sellPrice} onChange={(e) => update('sellPrice', e.target.value)} error={errors.sellPrice} />
            </div>

            {Number(form.buyPrice) > 0 && Number(form.sellPrice) > 0 && (
              <div className="profit-preview">
                <div className="profit-item">
                  <span className="profit-label">Profit/unit</span>
                  <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>{profit >= 0 ? '+' : ''}₹{profit.toFixed(2)}</span>
                </div>
                <div className="profit-item">
                  <span className="profit-label">Margin</span>
                  <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>{margin}%</span>
                </div>
                <div className="profit-item">
                  <span className="profit-label">Total profit</span>
                  <span className={`profit-value ${profit >= 0 ? 'green' : 'red'}`}>₹{(profit * (Number(form.quantity) || 0)).toFixed(2)}</span>
                </div>
              </div>
            )}

            <Input id="prod-threshold" label="Low Stock Alert (qty)" type="number" min="0" inputMode="numeric" placeholder="Enter threshold" value={form.lowStockThreshold} onChange={(e) => update('lowStockThreshold', e.target.value)} />


            {errors.submit && <div className="error-alert">{errors.submit}</div>}

            <Button id="save-product-btn" type="submit" fullWidth size="lg" loading={loading}>Save Product</Button>
          </form>
        ) : mode === 'bulk' ? (
          /* === BULK ADD MODE === */
          <div className="bulk-section">
            {/* Default Category Picker */}
            <div className="default-cat-bar">
              <label className="default-cat-label">Default Category</label>
              <select
                className="default-cat-select"
                value={defaultCategory}
                onChange={(e) => handleDefaultCategoryChange(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Table Header */}
            <div className="bulk-table-header">
              <span className="col-name">NAME *</span>
              <span className="col-cat">CATEGORY</span>
              <span className="col-num">QTY</span>
              <span className="col-num">BUY ₹</span>
              <span className="col-num">SELL ₹</span>
              <span className="col-x"></span>
            </div>

            {/* Table Rows */}
            <datalist id="bulk-product-list">
              {products.map(p => <option key={p.id} value={p.name} />)}
            </datalist>

            <div className="bulk-table-body">
              {bulkRows.map((row, i) => (
                <div key={i} className={`bulk-table-row ${row.name.trim() ? 'filled' : ''}`}>
                  <input
                    className="bulk-cell col-name"
                    placeholder="Product name"
                    value={row.name}
                    onChange={(e) => updateBulkRow(i, 'name', e.target.value)}
                  />
                  <select
                    className="bulk-cell-select col-cat"
                    value={row.category}
                    onChange={(e) => updateBulkRow(i, 'category', e.target.value)}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    className="bulk-cell col-num"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder="0"
                    value={row.quantity}
                    onChange={(e) => updateBulkRow(i, 'quantity', e.target.value)}
                  />
                  <input
                    className="bulk-cell col-num"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder="0"
                    value={row.buyPrice}
                    onChange={(e) => updateBulkRow(i, 'buyPrice', e.target.value)}
                  />
                  <input
                    className="bulk-cell col-num"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder="0"
                    value={row.sellPrice}
                    onChange={(e) => updateBulkRow(i, 'sellPrice', e.target.value)}
                  />
                  <button className="bulk-cell-x" onClick={() => removeBulkRow(i)}>×</button>
                </div>
              ))}
            </div>

            <button className="add-rows-btn" onClick={addMoreRows}>+ Add 5 more rows</button>

            {errors.submit && <div className="error-alert">{errors.submit}</div>}

            <Button
              onClick={handleBulkSave}
              fullWidth
              size="lg"
              loading={bulkLoading}
              disabled={filledRows.length === 0}
            >
              💾 Save {filledRows.length} product{filledRows.length !== 1 ? 's' : ''}
            </Button>
          </div>
        ) : (
          /* === UPDATE MODE === */
          <div className="bulk-section">
            {/* Table Header */}
            <div className="update-mode-header">
              <span className="col-name">NAME *</span>
              <span className="col-num">QTY</span>
              <span className="col-x"></span>
            </div>

            {/* Table Rows */}
            <div className="bulk-table-body">
              {updateRows.map((row, i) => (
                <div key={i} className={`update-mode-row ${row.name.trim() ? 'filled' : ''}`}>
                  <input
                    className="bulk-cell col-name"
                    placeholder="Product name"
                    value={row.name}
                    onChange={(e) => updateUpdateRow(i, 'name', e.target.value)}
                    list="bulk-product-list"
                  />
                  <div className="qty-control-cell">
                    <button className="qty-btn" onClick={() => adjustUpdateQty(i, -1)}>−</button>
                    <input
                      className="qty-input"
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="0"
                      value={row.quantity}
                      onChange={(e) => updateUpdateRow(i, 'quantity', e.target.value)}
                    />
                    <button className="qty-btn" onClick={() => adjustUpdateQty(i, 1)}>+</button>
                  </div>
                  <button className="bulk-cell-x" onClick={() => removeUpdateRow(i)}>×</button>
                </div>
              ))}
            </div>

            <button className="add-rows-btn" onClick={addMoreUpdateRows}>+ Add 5 more rows</button>

            {errors.submit && <div className="error-alert">{errors.submit}</div>}

            <Button
              onClick={handleUpdateSave}
              fullWidth
              size="lg"
              loading={updateLoading}
              disabled={filledUpdateRows.length === 0}
            >
              💾 Update {filledUpdateRows.length} product{filledUpdateRows.length !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        .error-alert { padding: 12px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 12px; color: var(--color-danger); font-size: 14px; text-align: center; margin-bottom: 8px; }
        .add-page { min-height: 100dvh; background: var(--bg-primary); padding-bottom: 32px; }
        .add-content { max-width: 680px; margin: 0 auto; padding: 16px; }
        .add-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 0 16px; }
        .back-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .back-btn:hover { background: rgba(255,255,255,0.1); }
        .add-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

        .mode-toggle { display: flex; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
        .mode-btn { flex: 1; padding: 10px; border: none; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .mode-btn.active { background: #7B42C4; color: var(--text-primary); }

        .add-form { display: flex; flex-direction: column; gap: 18px; }
        .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .select-group { display: flex; flex-direction: column; gap: 6px; }
        .select-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); padding-left: 2px; }
        .select-field {
          height: 52px; padding: 0 14px; font-size: 15px; background: var(--bg-input-alt); color: var(--text-primary);
          border: 1.5px solid rgba(255,255,255,0.08); border-radius: 12px; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B6B80' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px;
        }
        .select-field:focus { border-color: rgba(123,66,196,0.5); outline: none; }
        .select-field option { background: var(--bg-input-alt); color: var(--text-primary); }
        .profit-preview { display: flex; padding: 14px; background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.15); border-radius: 12px; }
        .profit-item { flex: 1; text-align: center; }
        .profit-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
        .profit-value { font-size: 15px; font-weight: 700; }
        .green { color: var(--color-success); }
        .red { color: var(--color-danger); }

        /* Bulk Add Table Styles */
        .bulk-section { display: flex; flex-direction: column; gap: 12px; overflow-x: auto; }
        .default-cat-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--bg-surface-solid);
          border: 1px solid var(--border-color);
          border-radius: 12px;
        }
        .default-cat-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
        }
        .default-cat-select {
          flex: 1;
          height: 40px;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 600;
          background: var(--bg-input-alt);
          color: var(--text-primary);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          appearance: none;
          cursor: pointer;
          outline: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B6B80' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px;
        }
        .default-cat-select:focus { border-color: rgba(123,66,196,0.5); }
        .default-cat-select option { background: var(--bg-input-alt); color: var(--text-primary); }
        .bulk-table-header {
          display: grid;
          grid-template-columns: 2fr 1.2fr 0.8fr 0.8fr 0.8fr 30px;
          gap: 6px;
          padding: 0 4px 8px;
        }
        .bulk-table-header span {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .bulk-table-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bulk-table-row {
          display: grid;
          grid-template-columns: 2fr 1.2fr 0.8fr 0.8fr 0.8fr 30px;
          gap: 6px;
          align-items: center;
        }
        .bulk-table-row.filled .bulk-cell,
        .bulk-table-row.filled .bulk-cell-select,
        .update-mode-row.filled .bulk-cell,
        .update-mode-row.filled .qty-control-cell {
          border-color: rgba(123,66,196,0.3);
        }
        .bulk-cell {
          height: 44px;
          padding: 0 10px;
          font-size: 13px;
          background: var(--bg-input-alt);
          color: var(--text-primary);
          border: 1.5px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          outline: none;
          width: 100%;
          min-width: 0;
        }
        .bulk-cell:focus {
          border-color: rgba(123,66,196,0.5);
        }
        .bulk-cell::placeholder {
          color: var(--text-muted);
          opacity: 0.5;
        }
        .bulk-cell-select {
          height: 44px;
          padding: 0 6px;
          font-size: 12px;
          background: var(--bg-input-alt);
          color: var(--text-primary);
          border: 1.5px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          appearance: none;
          cursor: pointer;
          outline: none;
          width: 100%;
          min-width: 0;
        }
        .bulk-cell-select:focus {
          border-color: rgba(123,66,196,0.5);
        }
        .bulk-cell-select option {
          background: var(--bg-input-alt);
          color: var(--text-primary);
        }
        .bulk-cell-x {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 18px;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .bulk-cell-x:hover {
          background: rgba(239,68,68,0.1);
          color: var(--color-danger);
        }
        .bulk-cell::-webkit-inner-spin-button { -webkit-appearance: none; }
        .add-rows-btn {
          padding: 12px;
          border: 1.5px dashed rgba(255,255,255,0.1);
          border-radius: 12px;
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-rows-btn:hover {
          border-color: rgba(123,66,196,0.4);
          color: var(--text-primary);
        }
        .loading { color: var(--text-secondary); text-align: center; padding: 40px; }
        
        .qty-control-cell {
          display: flex;
          align-items: center;
          background: var(--bg-input-alt);
          border: 1.5px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          height: 44px;
          overflow: hidden;
          width: 100%;
        }
        .qty-control-cell:focus-within {
          border-color: rgba(123,66,196,0.5);
        }
        .qty-btn {
          width: 28px;
          height: 100%;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .qty-btn:hover {
          background: rgba(255,255,255,0.05);
        }
        .qty-input {
          flex: 1;
          height: 100%;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 13px;
          text-align: center;
          min-width: 0;
          outline: none;
        }
        .qty-input::-webkit-inner-spin-button { -webkit-appearance: none; }

        
        /* Update Mode Specific */
        .update-mode-header {
          display: grid;
          grid-template-columns: 1fr 140px 44px;
          gap: 6px;
          padding: 0 4px 8px;
        }
        .update-mode-header span {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .update-mode-row {
          display: grid;
          grid-template-columns: 1fr 140px 44px;
          gap: 6px;
          margin-bottom: 6px;
        }
        .update-mode-row.filled .qty-control-cell {
          border-color: rgba(34,197,94,0.5);
          background: rgba(34,197,94,0.04);
        }
        .bulk-plus { color: var(--color-success); font-size: 16px; font-weight: 700; }
        .bulk-input {
          width: 64px; height: 36px; text-align: center; font-size: 15px; font-weight: 700;
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          color: var(--text-primary); outline: none;
        }
        .bulk-input:focus { border-color: #7B42C4; }
        .bulk-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .bulk-unit { font-size: 12px; color: var(--text-muted); min-width: 24px; }
        .empty-bulk { text-align: center; padding: 40px; color: var(--text-secondary); }
        .empty-bulk p:first-child { font-size: 40px; margin-bottom: 12px; }
        .loading { color: var(--text-secondary); text-align: center; padding: 40px; }
        @media (max-width: 420px) {
          .purchase-grid,
          .payment-modes {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
