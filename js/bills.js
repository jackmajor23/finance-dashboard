// ── Utilities: formatting, helpers ─────────────────
// JS: BILLS & UTILITIES
// ═══════════════════════════════════════════════════
function renderBills(){
  const grid=document.getElementById('billsGrid');
  if(!S.bills.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">⧗</div>`; return; }

// Money formatting utilities
function formatMoney(input) {
  let value = input.value.replace(/[^0-9.]/g, ''); // Remove non-numeric except decimal
  if (value) {
    // Format with commas
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    value = parts.join('.');
  }
  input.value = value;
}

function parseMoney(value) {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

let editingBillIdx = null;
