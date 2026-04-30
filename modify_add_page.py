import re

with open("app/inventory/add/page.js", "r") as f:
    content = f.read()

# 1. Add manualPurchaseAmount and manualPurchaseDesc to states
state_old = "const [purchaseNote, setPurchaseNote] = useState('');"
state_new = """const [purchaseNote, setPurchaseNote] = useState('');
  const [manualPurchaseAmount, setManualPurchaseAmount] = useState('');
  const [manualPurchaseDesc, setManualPurchaseDesc] = useState('');"""
content = content.replace(state_old, state_new)

# 2. Replace handleBulkSave
handle_old = """  const handleBulkSave = async () => {
    const entries = Object.entries(bulkUpdates).filter(([, qty]) => qty > 0);
    if (entries.length === 0) return;"""

handle_new = """  const handleBulkSave = async () => {
    const totalAmount = Number(manualPurchaseAmount) || 0;
    if (totalAmount <= 0) {
      setErrors({ submit: 'Please enter a valid amount.' });
      return;
    }"""

# regex replace handleBulkSave to the end of the function
import re
content = re.sub(
    r"const handleBulkSave = async \(\) => \{.*?\n  \};\n\n  const bulkCount = Object\.values\(bulkUpdates\)\.filter",
    """const handleBulkSave = async () => {
    const totalAmount = Number(manualPurchaseAmount) || 0;
    if (totalAmount <= 0) {
      setErrors({ submit: 'Please enter a valid amount.' });
      return;
    }
    const needsSupplier = paymentStatus === 'partial' || paymentStatus === 'full_udhaar';
    if (needsSupplier && !selectedSupplier && !newSupplierName.trim()) {
      setErrors({ submit: 'Please select or enter a supplier for partial / udhaar purchase.' });
      return;
    }
    setBulkLoading(true);
    try {
      const computedAmountPaid = (selectedSupplier || newSupplierName.trim())
        ? paymentStatus === 'full_paid'
          ? totalAmount
          : paymentStatus === 'full_udhaar'
          ? 0
          : Number(amountPaid || 0)
        : totalAmount;

      const noteParts = [];
      if (invoiceNumber.trim()) noteParts.push(`Invoice: ${invoiceNumber.trim()}`);
      if (manualPurchaseDesc.trim()) noteParts.push(`Items: ${manualPurchaseDesc.trim()}`);
      if (purchaseNote.trim()) noteParts.push(purchaseNote.trim());

      const result = await TransactionStore.add({
        type: 'purchase',
        amount: totalAmount,
        date: `${purchaseDate}T12:00:00`,
        note: noteParts.join(' | ') || 'Supplier Purchase',
        partyId: selectedSupplier || null,
        newPartyName: (!selectedSupplier && (needsSupplier || newSupplierName.trim())) ? newSupplierName.trim() : null,
        newPartyType: 'supplier',
        amountPaid: computedAmountPaid,
        items: [],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save purchase.');
      }

      const supplierName = selectedSupplier
        ? (parties.find((party) => party.id === selectedSupplier)?.name || 'Selected Supplier')
        : (newSupplierName.trim() || 'Walk-in Supplier');

      setBulkSuccessData({
        supplierName,
        totalAmount,
        amountPaid: computedAmountPaid,
        dueAmount: Math.max(0, Math.round((totalAmount - computedAmountPaid) * 100) / 100),
        purchaseDate,
        invoiceNumber: invoiceNumber.trim(),
        purchaseNote: purchaseNote.trim(),
        manualPurchaseDesc: manualPurchaseDesc.trim(),
      });
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to record purchase.' });
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkCount = Object.values(bulkUpdates).filter""",
    content,
    flags=re.DOTALL
)

# 3. Update Success Screen rendering
success_old = """              <p className="bulk-success-meta">{bulkSuccessData.productCount} products · {bulkSuccessData.totalUnits} units</p>"""
success_new = """              {bulkSuccessData.manualPurchaseDesc && <p className="bulk-success-meta">{bulkSuccessData.manualPurchaseDesc}</p>}"""
content = content.replace(success_old, success_new)

reset_old = """              setBulkSuccessData(null);
              setBulkUpdates({});
              setSelectedSupplier('');
              setNewSupplierName('');
              setPaymentStatus('full_paid');
              setAmountPaid('');
              setInvoiceNumber('');
              setPurchaseNote('');"""
reset_new = """              setBulkSuccessData(null);
              setBulkUpdates({});
              setSelectedSupplier('');
              setNewSupplierName('');
              setPaymentStatus('full_paid');
              setAmountPaid('');
              setInvoiceNumber('');
              setPurchaseNote('');
              setManualPurchaseAmount('');
              setManualPurchaseDesc('');"""
content = content.replace(reset_old, reset_new)

# 4. Update the bulk JSX (Remove products list, add simple inputs)
jsx_old = r"""          <div className="bulk-section">
            <div className="bulk-helper">
              <p className="bulk-helper-title">Restock existing inventory</p>
              <p className="bulk-helper-sub">Add supplier, invoice, payment mode and purchased quantities so stock and khata stay in sync.</p>
            </div>
            {productsLoading \? \(
              <div className="loading">Loading products\.\.\.</div>
            \) : products\.length === 0 \? \(
              <div className="empty-bulk">
                <p>📦</p>
                <p>No products yet\. Add your first product in Single mode\.</p>
              </div>
            \) : \("""
jsx_new = """          <div className="bulk-section">
            <div className="bulk-helper">
              <p className="bulk-helper-title">Record Purchase Bill</p>
              <p className="bulk-helper-sub">Add supplier, invoice, payment mode and purchase amount so your khata stays in sync.</p>
            </div>
            {productsLoading ? (
              <div className="loading">Loading...</div>
            ) : ("""
content = re.sub(jsx_old, jsx_new, content, flags=re.DOTALL)

# Remove the product list map
list_old = r"""                <div className="bulk-list">
                  \{products\.map\(p => \(.*?</div>
                  \)\)}
                </div>"""
content = re.sub(list_old, "", content, flags=re.DOTALL)

# Replace the purchase-card opening
card_old = r"""                <div className=\{`purchase-card \$\{bulkCount === 0 \? 'empty-state' : ''\}`\}>
                    <div className="purchase-head">
                      <div>
                        <p className="purchase-title">Purchase Details</p>
                        <p className="purchase-sub">\{bulkCount\} products · \{bulkTotalUnits\} units · ₹\{bulkTotalAmount\.toFixed\(2\)\}</p>
                      </div>
                      <span className="purchase-chip">Buy Stock</span>
                    </div>"""
card_new = """                <div className="purchase-card">
                    <div className="purchase-head">
                      <div>
                        <p className="purchase-title">Purchase Details</p>
                      </div>
                      <span className="purchase-chip">Buy Stock</span>
                    </div>"""
content = re.sub(card_old, card_new, content, flags=re.DOTALL)

# Replace the fixed disabled amount input with editable
amt_old = """                      <Input
                        label="Amount"
                        value={bulkTotalAmount.toFixed(2)}
                        disabled
                        prefix="₹"
                      />"""
amt_new = """                      <Input
                        label="Total Bill Amount *"
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={manualPurchaseAmount}
                        onChange={(e) => setManualPurchaseAmount(normalizeDecimalInput(e.target.value))}
                        prefix="₹"
                        placeholder="0.00"
                      />"""
content = content.replace(amt_old, amt_new)

# Add description
note_old = """                    <Input
                      label="GST / Notes"
                      placeholder="GST, invoice remarks, transport note..."
                      value={purchaseNote}
                      onChange={(e) => setPurchaseNote(e.target.value)}
                    />"""
note_new = """                    <Input
                      label="Items Description (Optional)"
                      placeholder="e.g. 10x Shirts, 5x Pants"
                      value={manualPurchaseDesc}
                      onChange={(e) => setManualPurchaseDesc(e.target.value)}
                    />
                    <Input
                      label="GST / Notes"
                      placeholder="GST, invoice remarks, transport note..."
                      value={purchaseNote}
                      onChange={(e) => setPurchaseNote(e.target.value)}
                    />"""
content = content.replace(note_old, note_new)

# Update Amount Paid logic text
txt_old = """                          placeholder={`Enter paid amount (Total ₹${bulkTotalAmount.toFixed(2)})`}"""
txt_new = """                          placeholder="Enter paid amount" """
content = content.replace(txt_old, txt_new)

note1_old = """₹{Math.max(0, bulkTotalAmount - Number(amountPaid || 0)).toFixed(2)} will remain in supplier khata."""
note1_new = """₹{Math.max(0, Number(manualPurchaseAmount || 0) - Number(amountPaid || 0)).toFixed(2)} will remain in supplier khata."""
content = content.replace(note1_old, note1_new)

note2_old = """Entire ₹{bulkTotalAmount.toFixed(2)} will be added to supplier khata."""
note2_new = """Entire ₹{Number(manualPurchaseAmount || 0).toFixed(2)} will be added to supplier khata."""
content = content.replace(note2_old, note2_new)

# Remove the purchase-items loop at bottom
items_old = r"""                    <div className="purchase-items">
                      \{bulkRows\.map\(\(row\) => \(
                        <div key=\{row\.productId\} className="purchase-item-row">
                          <span>\{row\.name\} × \{row\.quantity\} \{row\.unit\}</span>
                          <strong>₹\{row\.total\.toFixed\(2\)\}</strong>
                        </div>
                      \)\)}
                    </div>"""
content = re.sub(items_old, "", content, flags=re.DOTALL)

# Update the save button
btn_old = """                <Button
                  onClick={handleBulkSave}
                  fullWidth
                  size="lg"
                  loading={bulkLoading}
                  disabled={bulkCount === 0}
                >
                  💾 Save Purchase for {bulkCount} item{bulkCount !== 1 ? 's' : ''}
                </Button>"""
btn_new = """                <Button
                  onClick={handleBulkSave}
                  fullWidth
                  size="lg"
                  loading={bulkLoading}
                  disabled={!manualPurchaseAmount || Number(manualPurchaseAmount) <= 0}
                >
                  💾 Save Purchase Bill
                </Button>"""
content = content.replace(btn_old, btn_new)

with open("app/inventory/add/page.js", "w") as f:
    f.write(content)

print("Done")
