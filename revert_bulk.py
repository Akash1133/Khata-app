import re

with open("app/inventory/add/page.js", "r") as f:
    content = f.read()

# 1. Revert handleBulkSave
handle_old_pattern = r"const handleBulkSave = async \(\) => \{.*?\n  \};\n\n  const bulkCount = Object\.values\(bulkUpdates\)\.filter"
handle_new = """const handleBulkSave = async () => {
    const entries = Object.entries(bulkUpdates).filter(([, qty]) => qty > 0);
    if (entries.length === 0) return;
    setBulkLoading(true);
    try {
      await ProductStore.bulkUpdate(bulkUpdates);
      const totalUnits = entries.reduce((sum, [, qty]) => sum + qty, 0);
      setBulkSuccessData({ productCount: entries.length, totalUnits });
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      setErrors({ submit: e.message || 'Failed to update stock.' });
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkCount = Object.values(bulkUpdates).filter"""

content = re.sub(handle_old_pattern, handle_new, content, flags=re.DOTALL)

# 2. Revert Bulk Section JSX
jsx_old_pattern = r"<div className=\"bulk-helper\">.*?</div>\n            \{productsLoading \? \(\n              <div className=\"loading\">Loading\.\.\.</div>\n            \) : \(\n              <>\n\n\n                <div className=\"purchase-card\">.*?💾 Save Purchase Bill\n                </Button>\n              </>"
jsx_new = """<div className="bulk-helper">
              <p className="bulk-helper-title">Restock existing inventory</p>
              <p className="bulk-helper-sub">Update quantities for multiple products quickly.</p>
            </div>
            {productsLoading ? (
              <div className="loading">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="empty-bulk">
                <p>📦</p>
                <p>No products yet. Add your first product in Single mode.</p>
              </div>
            ) : (
              <>
                <div className="bulk-list">
                  {products.map(p => (
                    <div key={p.id} className="bulk-item">
                      <div className="bulk-info">
                        <p className="bulk-name">{p.name}</p>
                        <p className="bulk-stock">Current: {p.quantity} {p.unit}</p>
                      </div>
                      <div className="bulk-actions">
                        <button className="bulk-btn" onClick={() => {
                          const val = Math.max(0, (bulkUpdates[p.id] || 0) - 1);
                          setBulkUpdates(prev => {
                            const next = { ...prev };
                            if (val === 0) delete next[p.id];
                            else next[p.id] = val;
                            return next;
                          });
                        }}>-</button>
                        <input className="bulk-input" type="number" min="0" value={bulkUpdates[p.id] || ''} onChange={(e) => handleBulkUpdateChange(p.id, e.target.value)} placeholder="0" />
                        <button className="bulk-btn" onClick={() => {
                          setBulkUpdates(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }));
                        }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.submit && <div className="error-alert">{errors.submit}</div>}

                <Button
                  onClick={handleBulkSave}
                  fullWidth
                  size="lg"
                  loading={bulkLoading}
                  disabled={bulkCount === 0}
                >
                  💾 Save {bulkCount} item{bulkCount !== 1 ? 's' : ''}
                </Button>
              </>"""

content = re.sub(jsx_old_pattern, jsx_new, content, flags=re.DOTALL)

# 3. Update Success Screen
success_pattern = r"\{bulkSuccessData\.manualPurchaseDesc && <p className=\"bulk-success-meta\">\{bulkSuccessData\.manualPurchaseDesc\}</p>\}"
success_new = """<p className="bulk-success-meta">{bulkSuccessData.productCount} products · {bulkSuccessData.totalUnits} units added</p>"""
content = re.sub(success_pattern, success_new, content, flags=re.DOTALL)

# 4. Success Card reset
reset_pattern = r"setBulkSuccessData\(null\);\n              setBulkUpdates\(\{\}\);\n              setSelectedSupplier\(''\);\n              setNewSupplierName\(''\);\n              setPaymentStatus\('full_paid'\);\n              setAmountPaid\(''\);\n              setInvoiceNumber\(''\);\n              setPurchaseNote\(''\);\n              setManualPurchaseAmount\(''\);\n              setManualPurchaseDesc\(''\);"
reset_new = """setBulkSuccessData(null);
              setBulkUpdates({});"""
content = re.sub(reset_pattern, reset_new, content, flags=re.DOTALL)


with open("app/inventory/add/page.js", "w") as f:
    f.write(content)

print("Add page updated.")

# Update inventory/page.js
with open("app/inventory/page.js", "r") as f:
    inv_content = f.read()

cta_pattern = r"<button className=\"stock-cta\" onClick=\{\(\) => router\.push\('/inventory/add\?mode=bulk'\)\}>\n          <div className=\"stock-cta-copy\">\n            <p className=\"stock-cta-title\">Buy Stock</p>\n            <p className=\"stock-cta-sub\">Record supplier purchase bills & manage udhaar</p>\n          </div>\n          <div className=\"stock-cta-meta\">\n            <span className=\"stock-cta-pill\">Bulk Update</span>\n            <span className=\"stock-cta-arrow\">→</span>\n          </div>\n        </button>"
cta_new = """<button className="stock-cta" onClick={() => router.push('/inventory/add?mode=bulk')}>
          <div className="stock-cta-copy">
            <p className="stock-cta-title">Bulk Stock Update</p>
            <p className="stock-cta-sub">Quickly update stock for multiple products</p>
          </div>
          <div className="stock-cta-meta">
            <span className="stock-cta-arrow">→</span>
          </div>
        </button>"""

inv_content = re.sub(cta_pattern, cta_new, inv_content, flags=re.DOTALL)

with open("app/inventory/page.js", "w") as f:
    f.write(inv_content)

print("Inventory page updated.")

