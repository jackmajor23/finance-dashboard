// ── Transactions ─────────────────────────────────────
// JS: TRANSACTIONS
// ═══════════════════════════════════════════════════

// ── State ────────────────────────────────────────────
// txFilter        : string  – single legacy filter kept for backward-compat
// txActiveTypes   : Set     – multi-type filter (replaces txFilter logic)
// txSort          : { col, dir } – active sort column and direction
// txDatePreset    : string  – 'all' | '7d' | '30d' | 'month' | 'custom'
// txDateFrom/To   : string  – ISO dates for custom range
// txAmountMin/Max : number|null

let txActiveTypes = new Set(['all']);   // 'all' means no type restriction
let txSort = { col: 'date', dir: 'desc' };
let txDatePreset = 'all';
let txDateFrom = '';
let txDateTo = '';
let txAmountMin = null;
let txAmountMax = null;
let showGeneratedTxs = true; // Show transactions generated from bills, salaries, etc.

// ── Core helpers ─────────────────────────────────────
function _addTx({ txtype, date, desc, amount, pnl, notes, source, sourceId }) {
  if (!S.transactions) S.transactions = [];
  S.transactions.unshift({
    id: Date.now(),
    txtype,
    date,
    desc,
    amount,
    pnl: pnl || 0,
    notes: notes || '',
    ...(source ? { source } : {}),
    ...(sourceId != null ? { sourceId } : {}),
  });
  if (S.transactions.length > 200) S.transactions.length = 200;
}

function _parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(+value) ? null : new Date(value);
  const s = String(value);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(value);
  return isNaN(+d) ? null : d;
}

function _formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function _daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function _dateWithDay(year, month, day) {
  return new Date(year, month, Math.min(Math.max(1, day), _daysInMonth(year, month)));
}

function _addMonthsWithDay(date, months, day) {
  return _dateWithDay(date.getFullYear(), date.getMonth() + months, day);
}

function _transactionWindow() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  from.setMonth(from.getMonth() - 12);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  to.setMonth(to.getMonth() + 1);
  return { from, to };
}

function _addGeneratedPayment(payments, date, amount, from, to) {
  if (date >= from && date <= to) {
    payments.push({ date: _formatLocalDate(date), amount });
  }
}

function _isLegacyAggregateTx(tx) {
  const desc = String(tx.desc || '').toLowerCase();
  const notes = String(tx.notes || '').toLowerCase();
  return (
    tx.txtype === 'income' &&
    desc.startsWith('salary:') &&
    (notes.includes('net/mo') || notes.includes('person'))
  ) || (
    tx.txtype === 'payment' &&
    desc.startsWith('debt:') &&
    (notes.includes('/month') || notes.includes('apr'))
  );
}

// ── Generate all transactions from across the site ─────
/**
 * Generate transaction records from all sources:
 * - Manual transactions (S.transactions)
 * - Bill payments (based on occurrence patterns)
 * - Salary payments (based on payDay)
 * - Debt payments (monthly)
 * - Property transactions (rent, mortgage)
 */
function generateAllTransactions() {
  const allTxs = [];

  // 1. Manual transactions
  S.transactions.forEach(tx => {
    if (showGeneratedTxs && _isLegacyAggregateTx(tx)) return;
    allTxs.push({ ...tx, source: 'manual' });
  });

  // 2. Bill payments
  if (S.bills && S.bills.length > 0) {
    S.bills.forEach(bill => {
      const occurrence = billOccurrenceOf(bill);
      if (occurrence === 'one-off') {
        // One-time bill
        const date = bill.paymentDate || bill.nextPaymentDate;
        if (date) {
          allTxs.push({
            id: `bill-${bill.id || Date.now()}`,
            date: date,
            txtype: 'payment',
            desc: bill.name,
            amount: -bill.amount,
            pnl: -bill.amount,
            notes: bill.company ? `${bill.company} · One-off` : 'One-off',
            source: 'bill',
            sourceId: bill.id
          });
        }
      } else {
        // Recurring bill - generate payments for last 12 months
        const payments = generateRecurringPayments(bill, occurrence, bill.amount, bill.paymentDate || bill.startDate);
        payments.forEach(p => {
          allTxs.push({
            id: `bill-${bill.id || Date.now()}-${p.date}`,
            date: p.date,
            txtype: 'payment',
            desc: bill.name,
            amount: -p.amount,
            pnl: -p.amount,
            notes: bill.company ? `${bill.company} · ${occurrence}` : occurrence,
            source: 'bill',
            sourceId: bill.id
          });
        });
      }
    });
  }

  // 3. Salary payments
  if (S.salaries && S.salaries.length > 0) {
    S.salaries.forEach(sal => {
      const calc = calcUKTax(sal.gross || 0, sal.pensionPct || 0, sal.bonus || 0, sal.studentLoan || 'none');
      const payments = generateSalaryPayments(sal, calc.takeHomeMonthly);
      payments.forEach(p => {
        const personName = S.settings.personNames[sal.person || 0] || 'Person';
        allTxs.push({
          id: `salary-${sal.id || `${sal.person || 0}-${sal.employer || 'employer'}`}-${p.date}`,
          date: p.date,
          txtype: 'income',
          desc: `Salary: ${sal.employer || 'Employer'}`,
          amount: p.amount,
          pnl: 0,
          notes: `${personName} · Net pay`,
          source: 'salary',
          sourceId: sal.id
        });
      });
    });
  }

  // 4. Debt payments
  if (S.debts && S.debts.length > 0) {
    S.debts.forEach(debt => {
      if (debt.monthly > 0) {
        const payments = generateMonthlyPayments(debt.name, debt.monthly, debt.start, debt.end);
        payments.forEach(p => {
          allTxs.push({
            id: `debt-${debt.id || Date.now()}-${p.date}`,
            date: p.date,
            txtype: 'payment',
            desc: `Debt payment: ${debt.name}`,
            amount: -p.amount,
            pnl: -p.amount,
            notes: debt.lender ? `${debt.lender} · ${debt.rate || 0}% APR` : `${debt.rate || 0}% APR`,
            source: 'debt',
            sourceId: debt.id
          });
        });
      }
    });
  }

  // 5. Property transactions (rent and mortgage)
  if (S.properties && S.properties.length > 0) {
    S.properties.forEach(prop => {
      // Rental income (if property is rented out)
      if (prop.isRented && prop.rentalMonthly > 0) {
        const payments = generateMonthlyPayments(`Rent: ${prop.nickname || prop.address}`, prop.rentalMonthly, prop.tenancyStart, prop.tenancyEnd);
        payments.forEach(p => {
          allTxs.push({
            id: `property-rent-${prop.id || Date.now()}-${p.date}`,
            date: p.date,
            txtype: 'income',
            desc: `Rental income: ${prop.nickname || prop.address}`,
            amount: p.amount,
            pnl: 0,
            notes: 'Rental income',
            source: 'property',
            sourceId: prop.id
          });
        });
      }

      // Mortgage payments
      if (prop.mortgageMonthly > 0 && prop.mortgageType !== 'none') {
        const payments = generateMonthlyPayments(`Mortgage: ${prop.nickname || prop.address}`, prop.mortgageMonthly, prop.purchaseDate);
        payments.forEach(p => {
          allTxs.push({
            id: `property-mortgage-${prop.id || Date.now()}-${p.date}`,
            date: p.date,
            txtype: 'payment',
            desc: `Mortgage: ${prop.nickname || prop.address}`,
            amount: -p.amount,
            pnl: -p.amount,
            notes: prop.mortgageLender || 'Mortgage payment',
            source: 'property',
            sourceId: prop.id
          });
        });
      }
    });
  }

  // 6. Rented properties (user is renting)
  if (S.rentedProperties && S.rentedProperties.length > 0) {
    S.rentedProperties.forEach(prop => {
      const payments = generateMonthlyPayments(`Rent: ${prop.nickname || prop.address}`, prop.monthlyRent, prop.tenancyStart, prop.hasTenancyEnd ? prop.tenancyEnd : null);
      payments.forEach(p => {
        allTxs.push({
          id: `rented-prop-${prop.id || Date.now()}-${p.date}`,
          date: p.date,
          txtype: 'payment',
          desc: `Rent payment: ${prop.nickname || prop.address}`,
          amount: -p.amount,
          pnl: -p.amount,
          notes: prop.landlordName ? `To: ${prop.landlordName}` : 'Rent payment',
          source: 'rented-property',
          sourceId: prop.id
        });
      });
    });
  }

  // Sort all transactions by date (descending)
  allTxs.sort((a, b) => new Date(b.date) - new Date(a.date));

  return allTxs;
}

/**
 * Generate recurring payments based on occurrence pattern
 */
function generateRecurringPayments(item, occurrence, amount, startDate) {
  const payments = [];
  const { from, to } = _transactionWindow();
  const explicitAnchor = _parseLocalDate(startDate || item.paymentDate || item.nextPaymentDate || item.startDate);
  const anchor = explicitAnchor || _parseLocalDate(item.createdDate);
  const day = Math.min(Math.max(1, parseInt(item.paymentDay, 10) || (anchor ? anchor.getDate() : 1)), 31);

  if (occurrence === 'weekly') {
    const parsedWeekday = parseInt(item.paymentDayOfWeek, 10);
    const target = Number.isFinite(parsedWeekday) && parsedWeekday >= 0 && parsedWeekday <= 6 ? parsedWeekday : 0;
    let currentDate = explicitAnchor ? new Date(explicitAnchor) : new Date(from);
    if (!explicitAnchor) currentDate.setDate(currentDate.getDate() + ((target - currentDate.getDay() + 7) % 7));
    while (currentDate > from) currentDate.setDate(currentDate.getDate() - 7);
    while (currentDate <= to) {
      _addGeneratedPayment(payments, currentDate, amount, from, to);
      currentDate.setDate(currentDate.getDate() + 7);
    }
    return payments;
  }

  if (occurrence === 'fortnightly') {
    let currentDate = explicitAnchor ? new Date(explicitAnchor) : new Date(from);
    while (currentDate > from) currentDate.setDate(currentDate.getDate() - 14);
    while (currentDate <= to) {
      _addGeneratedPayment(payments, currentDate, amount, from, to);
      currentDate.setDate(currentDate.getDate() + 14);
    }
    return payments;
  }

  if (occurrence === 'annually') {
    const month = item.paymentMonth != null ? parseInt(item.paymentMonth, 10) || 0 : (anchor ? anchor.getMonth() : from.getMonth());
    for (let y = from.getFullYear() - 1; y <= to.getFullYear() + 1; y++) {
      _addGeneratedPayment(payments, _dateWithDay(y, month, day), amount, from, to);
    }
    return payments;
  }

  const stepMonths = occurrence === 'quarterly' ? 3 : 1;
  let currentDate = anchor ? new Date(anchor) : _dateWithDay(from.getFullYear(), from.getMonth(), day);
  currentDate = _dateWithDay(currentDate.getFullYear(), currentDate.getMonth(), day);
  while (currentDate > from) currentDate = _addMonthsWithDay(currentDate, -stepMonths, day);
  while (currentDate <= to) {
    _addGeneratedPayment(payments, currentDate, amount, from, to);
    currentDate = _addMonthsWithDay(currentDate, stepMonths, day);
  }

  return payments;
}

/**
 * Generate salary payments based on payDay
 */
function generateSalaryPayments(salary, monthlyAmount) {
  const payments = [];
  const { from: windowFrom, to: windowTo } = _transactionWindow();
  const start = _parseLocalDate(salary.startDate) || windowFrom;
  const ended = salary.ongoing === false ? _parseLocalDate(salary.endDate) : null;
  const from = start > windowFrom ? start : windowFrom;
  const to = ended && ended < windowTo ? ended : windowTo;
  if (from > to) return payments;

  const payDay = salary.payDay || '';
  if (payDay === 'weekly' || payDay === 'bi_weekly' || payDay === 'four_weekly') {
    const intervalDays = payDay === 'weekly' ? 7 : payDay === 'bi_weekly' ? 14 : 28;
    const annualPeriods = payDay === 'weekly' ? 52 : payDay === 'bi_weekly' ? 26 : 13;
    let currentDate = new Date(start);
    while (currentDate.getDay() !== 5) currentDate.setDate(currentDate.getDate() + 1);
    while (currentDate > from) currentDate.setDate(currentDate.getDate() - intervalDays);
    while (currentDate <= to) {
      _addGeneratedPayment(payments, currentDate, (monthlyAmount * 12) / annualPeriods, from, to);
      currentDate.setDate(currentDate.getDate() + intervalDays);
    }
    return payments;
  }

  const payDayNum = parseInt(payDay, 10);
  const fallbackDay = start.getDate();
  let day = Number.isFinite(payDayNum) ? payDayNum : fallbackDay;
  if (payDay === 'first_day') day = 1;

  let currentDate = payDay === 'last_day'
    ? _dateWithDay(start.getFullYear(), start.getMonth(), 31)
    : _dateWithDay(start.getFullYear(), start.getMonth(), day);
  while (currentDate < start) {
    currentDate = _addMonthsWithDay(currentDate, 1, payDay === 'last_day' ? 31 : day);
  }
  while (currentDate > from) {
    currentDate = _addMonthsWithDay(currentDate, -1, payDay === 'last_day' ? 31 : day);
  }
  while (currentDate <= to) {
    _addGeneratedPayment(payments, currentDate, monthlyAmount, from, to);
    currentDate = _addMonthsWithDay(currentDate, 1, payDay === 'last_day' ? 31 : day);
  }

  return payments;
}

/**
 * Generate monthly payments between two dates
 */
function generateMonthlyPayments(name, amount, startDate, endDate = null) {
  const payments = [];
  const { from: windowFrom, to: windowTo } = _transactionWindow();
  const start = _parseLocalDate(startDate) || windowFrom;
  const end = _parseLocalDate(endDate);
  const from = start > windowFrom ? start : windowFrom;
  const to = end && end < windowTo ? end : windowTo;
  if (from > to) return payments;

  let currentDate = new Date(start);
  const day = start.getDate();
  while (currentDate < from) {
    currentDate = _addMonthsWithDay(currentDate, 1, day);
  }

  while (currentDate <= to) {
    _addGeneratedPayment(payments, currentDate, amount, from, to);
    currentDate = _addMonthsWithDay(currentDate, 1, day);
  }

  return payments;
}

// ── Type filter (multi-select) ────────────────────────
/**
 * Toggle a txtype in the active-types set.
 * Passing 'all' clears all type restrictions.
 * Clicking an already-active specific type toggles it off; if nothing remains
 * active the filter falls back to 'all'.
 */
function setTxFilter(f, el) {
  // Legacy single-filter path kept so existing HTML onclick="setTxFilter('income', this)" still works
  if (f === 'all') {
    txActiveTypes = new Set(['all']);
  } else {
    txActiveTypes.delete('all');
    if (txActiveTypes.has(f)) {
      txActiveTypes.delete(f);
      if (txActiveTypes.size === 0) txActiveTypes = new Set(['all']);
    } else {
      txActiveTypes.add(f);
    }
  }

  // Sync button active states
  document.querySelectorAll('#page-transactions .filter-btn').forEach(b => {
    const bf = b.dataset.filter || b.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (!bf) return;
    if (txActiveTypes.has('all')) {
      b.classList.toggle('active', bf === 'all');
    } else {
      b.classList.toggle('active', txActiveTypes.has(bf));
    }
  });

  renderTransactions();
}

// ── Date preset filter ────────────────────────────────
function setTxDatePreset(preset) {
  txDatePreset = preset;
  const customRow = document.getElementById('txCustomDateRow');
  if (customRow) customRow.style.display = preset === 'custom' ? 'flex' : 'none';

  document.querySelectorAll('.date-preset-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.preset === preset);
  });
  renderTransactions();
}

function setTxCustomDate(which, val) {
  if (which === 'from') txDateFrom = val;
  if (which === 'to') txDateTo = val;
  renderTransactions();
}

// ── Amount range filter ───────────────────────────────
function setTxAmountRange() {
  const minEl = document.getElementById('txAmountMin');
  const maxEl = document.getElementById('txAmountMax');
  txAmountMin = minEl && minEl.value !== '' ? parseFloat(minEl.value) : null;
  txAmountMax = maxEl && maxEl.value !== '' ? parseFloat(maxEl.value) : null;
  renderTransactions();
}

function clearTxAmountRange() {
  txAmountMin = null;
  txAmountMax = null;
  const minEl = document.getElementById('txAmountMin');
  const maxEl = document.getElementById('txAmountMax');
  if (minEl) minEl.value = '';
  if (maxEl) maxEl.value = '';
  renderTransactions();
}

// ── Sorting ───────────────────────────────────────────
const TX_SORT_COLS = ['date', 'txtype', 'desc', 'amount', 'pnl'];

function setTxSort(col) {
  if (!TX_SORT_COLS.includes(col)) return;
  if (txSort.col === col) {
    txSort.dir = txSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    txSort = { col, dir: col === 'date' ? 'desc' : 'asc' };
  }
  _syncSortHeaders();
  renderTransactions();
}

function _syncSortHeaders() {
  document.querySelectorAll('#page-transactions th[data-sort]').forEach(th => {
    const col = th.dataset.sort;
    th.classList.toggle('sort-active', col === txSort.col);
    th.dataset.dir = col === txSort.col ? txSort.dir : '';
    // Update arrow indicator
    const arrow = th.querySelector('.sort-arrow');
    if (arrow) {
      arrow.textContent = col !== txSort.col ? '↕' : txSort.dir === 'asc' ? '↑' : '↓';
    }
  });
}

function _applySort(arr) {
  const { col, dir } = txSort;
  return [...arr].sort((a, b) => {
    let va, vb;
    switch (col) {
      case 'date': va = new Date(a.date); vb = new Date(b.date); break;
      case 'amount': va = Math.abs(a.amount); vb = Math.abs(b.amount); break;
      case 'pnl': va = a.pnl || 0; vb = b.pnl || 0; break;
      case 'txtype': va = a.txtype || ''; vb = b.txtype || ''; break;
      case 'desc': va = a.desc || ''; vb = b.desc || ''; break;
      default: return 0;
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── Date range helper ─────────────────────────────────
function _inDateRange(t) {
  const d = new Date(t.date);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (txDatePreset) {
    case '7d': {
      const cutoff = new Date(startOfToday);
      cutoff.setDate(cutoff.getDate() - 6);
      return d >= cutoff;
    }
    case '30d': {
      const cutoff = new Date(startOfToday);
      cutoff.setDate(cutoff.getDate() - 29);
      return d >= cutoff;
    }
    case 'month': {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    case 'custom': {
      if (txDateFrom && d < new Date(txDateFrom)) return false;
      if (txDateTo && d > new Date(txDateTo + 'T23:59:59')) return false;
      return true;
    }
    default: return true; // 'all'
  }
}

// ── Main render ───────────────────────────────────────
function renderTransactions() {
  const q = (document.getElementById('txSearch') || {}).value || '';

  // Get all transactions (manual + generated)
  let T = showGeneratedTxs ? generateAllTransactions() : S.transactions.map(tx => ({ ...tx, source: 'manual' }));

  // 1. Type filter (multi)
  if (!txActiveTypes.has('all')) {
    T = T.filter(t => txActiveTypes.has(t.txtype));
  }

  // 2. Text search
  if (q) {
    const ql = q.toLowerCase();
    T = T.filter(t =>
      (t.desc || '').toLowerCase().includes(ql) ||
      (t.notes || '').toLowerCase().includes(ql)
    );
  }

  // 3. Date range
  T = T.filter(_inDateRange);

  // 4. Amount range (operates on absolute value)
  if (txAmountMin !== null) T = T.filter(t => Math.abs(t.amount) >= txAmountMin);
  if (txAmountMax !== null) T = T.filter(t => Math.abs(t.amount) <= txAmountMax);

  // 5. Sort
  T = _applySort(T);

  // 6. Result count
  const totalCount = showGeneratedTxs ? generateAllTransactions().length : S.transactions.length;
  const filteredCount = T.length;
  const countEl = document.getElementById('txResultCount');
  if (countEl) {
    const isFiltered = filteredCount !== totalCount;
    const sourceLabel = showGeneratedTxs ? 'all payments' : 'manual transactions';
    countEl.textContent = isFiltered
      ? `Showing ${filteredCount} of ${totalCount} ${sourceLabel}`
      : `${totalCount} ${sourceLabel}`;
    countEl.style.display = totalCount === 0 ? 'none' : '';
  }

  // 7. Render rows
  const tb = document.getElementById('txBody');
  if (!tb) return;

  if (!T.length) {
    const reason = totalCount === 0 ? 'No transactions yet.' : 'No transactions match the current filters.';
    tb.innerHTML = `<tr><td colspan="8"><div class="empty"><div class="ei">≡</div><p>${reason}</p></div></td></tr>`;
    updateTxUndoButton();
    return;
  }

  tb.innerHTML = T.map(t => {
    const originalIndex = S.transactions.findIndex(tx => tx.id === t.id);
    const isGenerated = t.source !== 'manual';
    const sourceIcon = isGenerated ? '<span title="Auto-generated from bills, salary, etc." style="font-size:10px;margin-left:4px;opacity:0.6;">⚙</span>' : '';
    const rowDataJson = encodeURIComponent(JSON.stringify({
      date: t.date, txtype: t.txtype, desc: t.desc, amount: t.amount, pnl: t.pnl, notes: t.notes
    }));
    return `
    <tr class="${isGenerated ? 'tx-generated' : ''}">
      <td>${fmtDate(t.date)}</td>
      <td><span class="pill p-${t.txtype}">${t.txtype}${sourceIcon}</span></td>
      <td>${t.desc || '—'}</td>
      <td class="${t.amount >= 0 ? 'pos' : 'neg'} val">${fmt(Math.abs(t.amount))}</td>
      <td class="${t.pnl ? cls(t.pnl) : ''} val">${t.pnl ? fmtS(t.pnl) : '—'}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px;">${t.notes || '—'}</td>
      <td>
        ${!isGenerated ? `<button class="icon-btn del"  title="Delete"   onclick="deleteTransaction(${originalIndex})">✕</button>` : '<span style="opacity:0.3;font-size:12px;">—</span>'}
      </td>
    </tr>`;
  }).join('');

  updateTxUndoButton();
  _syncSortHeaders();
}

// ── Export ────────────────────────────────────────────
/**
 * Build the currently-filtered transaction array (same pipeline as renderTransactions,
 * without touching the DOM) and return it.
 */
function _getFilteredTx() {
  const q = (document.getElementById('txSearch') || {}).value || '';
  let T = showGeneratedTxs ? generateAllTransactions() : S.transactions.map(tx => ({ ...tx, source: 'manual' }));
  if (!txActiveTypes.has('all')) T = T.filter(t => txActiveTypes.has(t.txtype));
  if (q) {
    const ql = q.toLowerCase();
    T = T.filter(t => (t.desc || '').toLowerCase().includes(ql) || (t.notes || '').toLowerCase().includes(ql));
  }
  T = T.filter(_inDateRange);
  if (txAmountMin !== null) T = T.filter(t => Math.abs(t.amount) >= txAmountMin);
  if (txAmountMax !== null) T = T.filter(t => Math.abs(t.amount) <= txAmountMax);
  return _applySort(T);
}

/** Export filtered transactions as a CSV file download */
function exportTxCSV() {
  const T = _getFilteredTx();
  if (!T.length) { toast('Nothing to export'); return; }

  const headers = ['Date', 'Type', 'Description', 'Amount', 'P&L', 'Notes'];
  const rows = T.map(t => [
    t.date,
    t.txtype,
    _csvEsc(t.desc || ''),
    t.amount,
    t.pnl != null ? t.pnl : '',
    _csvEsc(t.notes || '')
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\r\n');
  _downloadText(csv, `transactions_${_isoDate()}.csv`, 'text/csv');
  toast(`Exported ${T.length} row${T.length !== 1 ? 's' : ''}`);
}

/**
 * Export filtered transactions as an Excel-compatible file.
 * Uses a simple XML-based SpreadsheetML format (no external library needed).
 * Opens natively in Excel / LibreOffice Calc.
 */
function exportTxExcel() {
  const T = _getFilteredTx();
  if (!T.length) { toast('Nothing to export'); return; }

  const headers = ['Date', 'Type', 'Description', 'Amount', 'P&L', 'Notes'];
  const allRows = [headers, ...T.map(t => [
    t.date,
    t.txtype || '',
    t.desc || '',
    t.amount,
    t.pnl != null ? t.pnl : '',
    t.notes || ''
  ])];

  const xmlRows = allRows.map((row, ri) =>
    `<Row ss:Index="${ri + 1}">${row.map((cell, ci) => {
      const isNum = ri > 0 && (ci === 3 || ci === 4) && cell !== '';
      const type = isNum ? 'Number' : 'String';
      const val = String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
    }).join('')}</Row>`
  ).join('\n');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Transactions">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`;

  _downloadText(xml, `transactions_${_isoDate()}.xls`, 'application/vnd.ms-excel');
  toast(`Exported ${T.length} row${T.length !== 1 ? 's' : ''}`);
}

// ── Export helpers ────────────────────────────────────
function _csvEsc(s) {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function _isoDate() {
  return new Date().toISOString().slice(0, 10);
}

function _downloadText(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Delete / Undo (unchanged logic, preserved) ────────
function deleteTransaction(i) {
  const deleted = S.transactions.splice(i, 1)[0];
  window._lastDeletedTx = { item: deleted, index: i };
  updateUndoButton('txUndoBtn', window._lastDeletedTx);
  save(); renderTransactions(); toast('Removed');
}

function undoLastTxDelete() {
  if (!window._lastDeletedTx) return;
  const { item, index } = window._lastDeletedTx;
  S.transactions.splice(index, 0, item);
  window._lastDeletedTx = null;
  updateUndoButton('txUndoBtn', null);
  save(); renderTransactions(); toast('Restored');
}

function updateUndoButton(btnId, deletedItem) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  deletedItem ? btn.classList.add('visible') : btn.classList.remove('visible');
}

function updateTxUndoButton() {
  updateUndoButton('txUndoBtn', window._lastDeletedTx);
}

// ── Toggle generated transactions ─────────────────────
function toggleGeneratedTxs() {
  showGeneratedTxs = !showGeneratedTxs;
  const btn = document.getElementById('toggleGeneratedTxs');
  if (btn) {
    btn.classList.toggle('active', showGeneratedTxs);
    btn.textContent = showGeneratedTxs ? '🔄 All payments' : '📝 Manual only';
  }
  renderTransactions();
}
