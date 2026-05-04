/**
 * pdfUtils.js — Pure client-side PDF generation via hidden iframe + print dialog.
 * No libraries, no server. PDFs are generated in-memory and printed/saved locally.
 */

const BRAND_COLOR = '#7B42C4';
const BRAND_LIGHT = '#B68AFF';

function baseStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #111; font-size: 13px; }
    .page { max-width: 720px; margin: 0 auto; padding: 36px 32px; }

    /* Header */
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid ${BRAND_COLOR}; padding-bottom: 18px; }
    .brand { font-size: 22px; font-weight: 800; color: ${BRAND_COLOR}; }
    .brand-sub { font-size: 11px; color: #666; margin-top: 2px; }
    .inv-meta { text-align: right; }
    .inv-meta .inv-no { font-size: 16px; font-weight: 700; color: #111; }
    .inv-meta .inv-date { font-size: 12px; color: #555; margin-top: 4px; }

    /* Badges */
    .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
    .badge-paid { background: #d1fae5; color: #065f46; }
    .badge-partial { background: #fef3c7; color: #92400e; }
    .badge-udhaar { background: #fee2e2; color: #991b1b; }

    /* Party section */
    .party-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .party-block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 6px; }
    .party-block p { font-size: 14px; font-weight: 600; color: #111; }
    .party-block .sub { font-size: 12px; color: #555; font-weight: 400; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: ${BRAND_COLOR}; color: #fff; }
    thead th { padding: 10px 12px; font-size: 12px; font-weight: 700; text-align: left; }
    thead th:last-child { text-align: right; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody td { padding: 9px 12px; font-size: 13px; color: #222; }
    tbody td:last-child { text-align: right; font-weight: 600; }

    /* Totals */
    .totals { margin-left: auto; width: 260px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 9px 14px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.total-final { background: ${BRAND_COLOR}; color: #fff; font-weight: 800; font-size: 14px; }
    .totals-row.udhaar { background: #fee2e2; color: #991b1b; font-weight: 700; }

    /* Summary boxes */
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
    .summary-box { padding: 14px; border: 1px solid #eee; border-radius: 10px; text-align: center; }
    .summary-box .sb-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .summary-box .sb-val { font-size: 18px; font-weight: 800; color: #111; }
    .summary-box.green { border-color: #a7f3d0; background: #f0fdf4; }
    .summary-box.green .sb-val { color: #065f46; }
    .summary-box.red { border-color: #fecaca; background: #fff5f5; }
    .summary-box.red .sb-val { color: #991b1b; }

    /* Product table for reports */
    .section-title { font-size: 14px; font-weight: 700; color: #111; margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }

    /* Footer */
    .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  `;
}

function openPrintWindow(html) {
  const w = window.open('', '_blank', 'width=800,height=700');
  if (!w) { alert('Please allow popups for this site to download PDFs.'); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };
}

/** ──────────────────────────────────────────────
 * 1. INVOICE — for a single sale transaction
 * ────────────────────────────────────────────── */
export function downloadInvoicePDF(txn) {
  const date = new Date(txn.date).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const shortId = txn.id?.slice(-8)?.toUpperCase() ?? 'N/A';
  const partyName = txn.party?.name || 'Walk-in Customer';
  const isWalkin = !txn.party?.name;
  const totalAmt = Number(txn.amount) || 0;
  const amtPaid = txn.amountPaid != null ? Number(txn.amountPaid) : totalAmt;
  const udhaar = totalAmt - amtPaid;

  let paymentBadge = '';
  if (udhaar <= 0) paymentBadge = '<span class="badge badge-paid">Fully Paid</span>';
  else if (amtPaid > 0) paymentBadge = '<span class="badge badge-partial">Partial Payment</span>';
  else paymentBadge = '<span class="badge badge-udhaar">Full Udhaar</span>';

  const itemsHTML = (txn.items || []).map((item, i) => {
    const name = item.product?.name || item.name || 'Item';
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const total = qty * price;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${name}</td>
        <td>${qty}</td>
        <td>₹${price.toFixed(2)}</td>
        <td>₹${total.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const totalsHTML = `
    <div class="totals-row"><span>Subtotal</span><span>₹${totalAmt.toFixed(2)}</span></div>
    ${!isWalkin ? `<div class="totals-row"><span>Amount Paid</span><span>₹${amtPaid.toFixed(2)}</span></div>` : ''}
    ${udhaar > 0 ? `<div class="totals-row udhaar"><span>Udhaar (Pending)</span><span>₹${udhaar.toFixed(2)}</span></div>` : ''}
    <div class="totals-row total-final"><span>Total</span><span>₹${totalAmt.toFixed(2)}</span></div>
  `;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${shortId}</title>
  <style>${baseStyles()}</style></head><body><div class="page">
    <div class="inv-header">
      <div>
        <div class="brand">Profitly</div>
        <div class="brand-sub">Smart Business Ledger</div>
      </div>
      <div class="inv-meta">
        <div class="inv-no">Invoice #${shortId}</div>
        <div class="inv-date">${date}</div>
        <div style="margin-top:8px">${paymentBadge}</div>
      </div>
    </div>

    <div class="party-section">
      <div class="party-block">
        <h4>Bill To</h4>
        <p>${partyName}</p>
        ${txn.note ? `<p class="sub">${txn.note}</p>` : ''}
      </div>
      <div class="party-block">
        <h4>Sale Details</h4>
        <p>${(txn.items || []).length} item${(txn.items || []).length !== 1 ? 's' : ''}</p>
        <p class="sub">Ref: ${shortId}</p>
      </div>
    </div>

    <table>
      <thead><tr>
        <th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Amount</th>
      </tr></thead>
      <tbody>${itemsHTML}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end">
      <div class="totals">${totalsHTML}</div>
    </div>

    <div class="footer">
      Generated by Profitly · ${new Date().toLocaleDateString('en-IN')} · Thank you for your business!
    </div>
  </div></body></html>`;

  openPrintWindow(html);
}

/** ──────────────────────────────────────────────
 * 2. MONTHLY P&L REPORT
 * ────────────────────────────────────────────── */
export function downloadPLReportPDF({ monthLabel, monthTotals, monthCalendarStats, productSalesList }) {
  const generatedOn = new Date().toLocaleString('en-IN');
  const profitColor = monthTotals.profit >= 0 ? '#065f46' : '#991b1b';

  const calRows = monthCalendarStats
    .filter(d => d.sales > 0 || d.profit !== 0)
    .map(d => `
      <tr>
        <td>${d.dateStr || d.day}</td>
        <td>₹${Number(d.sales).toFixed(2)}</td>
        <td style="color:${Number(d.profit)>=0?'#065f46':'#991b1b'};font-weight:700">${Number(d.profit)>=0?'+':''}₹${Number(d.profit).toFixed(2)}</td>
        <td>${Number(d.profitPercent).toFixed(2)}%</td>
        <td>${d.items}</td>
      </tr>`).join('');

  const productRows = (productSalesList || []).map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.qtySold}</td>
      <td>₹${Number(p.buyPrice).toFixed(2)}</td>
      <td>₹${Number(p.sellPrice).toFixed(2)}</td>
      <td style="color:${Number(p.profit)>=0?'#065f46':'#991b1b'};font-weight:700">${Number(p.profit)>=0?'+':''}₹${Number(p.profit).toFixed(2)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>P&L Report — ${monthLabel}</title>
  <style>${baseStyles()}</style></head><body><div class="page">
    <div class="inv-header">
      <div>
        <div class="brand">Profitly</div>
        <div class="brand-sub">Profit &amp; Loss Report</div>
      </div>
      <div class="inv-meta">
        <div class="inv-no">${monthLabel}</div>
        <div class="inv-date">Generated: ${generatedOn}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-box">
        <div class="sb-label">Total Sales</div>
        <div class="sb-val">₹${Number(monthTotals.sales).toFixed(2)}</div>
      </div>
      <div class="summary-box ${monthTotals.profit >= 0 ? 'green' : 'red'}">
        <div class="sb-label">Net Profit</div>
        <div class="sb-val">${monthTotals.profit >= 0 ? '+' : ''}₹${Number(monthTotals.profit).toFixed(2)}</div>
      </div>
      <div class="summary-box">
        <div class="sb-label">Items Sold</div>
        <div class="sb-val">${monthTotals.items}</div>
      </div>
    </div>

    ${calRows ? `
    <div class="section-title">Day-wise Breakdown</div>
    <table>
      <thead><tr>
        <th>Date</th><th>Sales</th><th>Profit / Loss</th><th>Margin %</th><th>Items</th>
      </tr></thead>
      <tbody>${calRows}</tbody>
    </table>` : '<p style="color:#888;font-size:13px;margin-bottom:20px">No active days this month.</p>'}

    ${productRows ? `
    <div class="section-title">Products Sold — Buy · Sell · Profit</div>
    <table>
      <thead><tr>
        <th>#</th><th>Product</th><th>Qty Sold</th><th>Buy Price</th><th>Sell Price</th><th>Total Profit</th>
      </tr></thead>
      <tbody>${productRows}</tbody>
    </table>` : ''}

    <div class="footer">
      Profitly · Monthly P&amp;L Report · ${monthLabel} · Printed on ${new Date().toLocaleDateString('en-IN')}
    </div>
  </div></body></html>`;

  openPrintWindow(html);
}
