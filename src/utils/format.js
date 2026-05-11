/**
 * FORMATTING UTILITIES
 * Currency, percentage, date, and display formatting
 */

const CUR = () => S.settings.currency || '£';

function fmt(n) {
  return CUR() + Math.abs(Math.round(n)).toLocaleString('en-GB');
}

function fmtS(n) {
  return (n >= 0 ? '+' : '-') + CUR() + Math.abs(Math.round(n)).toLocaleString('en-GB');
}

function fmtP(n) {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtDate(s) {
  if(!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
}

function monthYear(m, y) {
  const d = new Date(y, m - 1);
  return d.toLocaleDateString('en-GB', {month:'long', year:'numeric'});
}

/**
 * Format money input: add commas, preserve decimals
 */
function formatMoney(input) {
  let value = input.value.replace(/[^0-9.]/g, '');
  if (value) {
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    value = parts.join('.');
  }
  input.value = value;
}

/**
 * Parse money string to number: remove commas
 */
function parseMoney(value) {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

/**
 * Utility: clamp value between min and max
 */
function clamp(v, mn, mx) {
  return Math.min(Math.max(v, mn), mx);
}

/**
 * Utility: return class name for positive/negative values
 */
function cls(n) {
  return n >= 0 ? 'pos' : 'neg';
}

/**
 * Calculate percentage change
 */
function pct(cur, inv) {
  return inv === 0 ? 0 : ((cur - inv) / inv * 100);
}

/**
 * Display toast notification
 */
function toast(msg) {
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3200);
}

/**
 * Close modal dialog
 */
function closeModal(id) {
  const modal = document.getElementById(id);
  if(modal) modal.classList.add('hidden');
  editingId = null;
  editingDebtIdx = null;
  editingSalaryIdx = null;
}

/**
 * Toggle hidden values visibility
 */
function toggleHide() {
  document.body.classList.toggle('hidden-vals');
  const eyeBtn = document.getElementById('eyeBtn');
  if(eyeBtn) {
    eyeBtn.textContent = document.body.classList.contains('hidden-vals') ? '🙈' : '👁';
  }
}
