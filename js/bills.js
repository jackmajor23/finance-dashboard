// ══════════════════════════════════════════════════
// BILLS MODULE
// ══════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────

const BILL_CATEGORIES = ['Utilities', 'Subscriptions', 'Insurance', 'Transport', 'Other'];
const BILL_TABS = ['All', ...BILL_CATEGORIES];

/** Monthly multiplier for each occurrence type */
const MONTHLY_FACTOR = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  quarterly: 4 / 12,
  annually: 1 / 12,
  'one-off': 0,   // excluded from recurring totals
};

/** Short frequency labels shown after the price on each card */
const FREQ_LABEL = {
  weekly: '/wk',
  fortnightly: '/2wk',
  monthly: '/mo',
  quarterly: '/qtr',
  annually: '/yr',
  'one-off': '',
};

/** Ordered list of [keyword, emoji] — first match wins */
const EMOJI_KEYWORDS = [
  // Utilities — specifics first
  ['council tax', '🏛️'], ['council', '🏛️'],
  ['tv licence', '📺'], ['tv license', '📺'], ['television', '📺'],
  ['broadband', '📡'], ['internet', '📡'], ['wifi', '📡'],
  ['electricity', '⚡'], ['electric', '⚡'], ['power', '⚡'], ['energy', '⚡'],
  ['gas', '🔥'], ['heating', '🔥'],
  ['water', '💧'],
  ['landline', '☎️'],
  ['mobile', '📱'], ['phone', '📱'],
  // Subscriptions
  ['netflix', '🎬'], ['disney', '✨'], ['hbo', '🎬'],
  ['amazon prime', '📦'], ['prime video', '📦'], ['amazon', '📦'],
  ['youtube premium', '▶️'], ['youtube', '▶️'],
  ['spotify', '🎵'], ['apple music', '🎵'], ['tidal', '🎵'], ['music', '🎵'],
  ['icloud', '☁️'], ['google one', '☁️'], ['dropbox', '☁️'], ['cloud', '☁️'],
  ['adobe', '🎨'], ['microsoft 365', '💻'], ['office 365', '💻'],
  ['gym', '💪'], ['fitness', '💪'],
  // Insurance
  ['car insurance', '🚗'], ['car tax', '🚗'],
  ['home insurance', '🏠'],
  ['life insurance', '❤️'],
  ['health insurance', '🏥'], ['dental', '🦷'],
  ['pet insurance', '🐾'],
  ['travel insurance', '✈️'],
  ['insurance', '🛡️'],
  // Transport
  ['fuel', '⛽'], ['petrol', '⛽'], ['diesel', '⛽'],
  ['train', '🚆'], ['rail', '🚆'],
  ['bus pass', '🚌'], ['bus', '🚌'],
  ['parking', '🅿️'], ['congestion', '🏙️'],
  ['ulez', '🏙️'],
  ['car', '🚗'],
  // Other
  ['mortgage', '🏦'], ['rent', '🏠'],
  ['childcare', '👶'], ['nursery', '👶'],
  ['school', '🎓'], ['education', '🎓'],
  ['loan', '💰'], ['credit', '💳'],
];

/** Emoji fallbacks by category */
const CAT_EMOJI = {
  Utilities: '🔌',
  Subscriptions: '💳',
  Insurance: '🛡️',
  Transport: '🚌',
  Other: '📋',
};

/** Map legacy / sample `S.bills` rows to canonical occurrence (matches `billOccurrence` select). */
function billOccurrenceOf(b) {
  if (b.occurrence) return b.occurrence;
  const rec = String(b.recurring || '').toLowerCase();
  if (rec === 'never') return 'one-off';
  const fr = String(b.frequency || '').toLowerCase();
  const map = {
    weekly: 'weekly',
    fortnightly: 'fortnightly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'annually',
    annually: 'annually',
  };
  return map[fr] || 'monthly';
}

/** Normalise category for tabs, templates, and emoji fallbacks. */
function billCategoryDisplay(b) {
  const c0 = b.category;
  if (c0 && BILL_CATEGORIES.includes(c0)) return c0;
  const c = String(c0 || '').toLowerCase();
  if (c === 'utilities' || c === 'housing' || c === 'taxes') return 'Utilities';
  if (c === 'subscription' || c === 'subscriptions') return 'Subscriptions';
  if (c === 'insurance') return 'Insurance';
  if (c === 'transport') return 'Transport';
  return 'Other';
}

function billPaymentDayFrom(b) {
  if (b.paymentDay != null && b.paymentDay !== '') {
    return Math.min(Math.max(1, parseInt(b.paymentDay, 10) || 1), 28);
  }
  if (b.nextPaymentDate) {
    const d = new Date(b.nextPaymentDate);
    if (!isNaN(+d)) return Math.min(d.getDate(), 28);
  }
  return 1;
}

/** Quick-add template library */
const BILL_TEMPLATES = [
  // Utilities
  { name: 'Electricity', category: 'Utilities', emoji: '⚡', occurrence: 'monthly' },
  { name: 'Gas', category: 'Utilities', emoji: '🔥', occurrence: 'monthly' },
  { name: 'Water', category: 'Utilities', emoji: '💧', occurrence: 'monthly' },
  { name: 'Internet', category: 'Utilities', emoji: '🛜', occurrence: 'monthly' },
  { name: 'Mobile Phone', category: 'Utilities', emoji: '📱', occurrence: 'monthly' },
  { name: 'Council Tax', category: 'Utilities', emoji: '🏛️', occurrence: 'monthly' },
  { name: 'TV Licence', category: 'Utilities', emoji: '📺', occurrence: 'annually' },
  // Subscriptions
  { name: 'Spotify', category: 'Subscriptions', emoji: '🎵', occurrence: 'monthly' },
  { name: 'Apple Music', category: 'Subscriptions', emoji: '🎵', occurrence: 'monthly' },
  { name: 'Sky', category: 'Subscriptions', emoji: '🎬', occurrence: 'monthly' },
  { name: 'Netflix', category: 'Subscriptions', emoji: '🎬', occurrence: 'monthly' },
  { name: 'Disney+', category: 'Subscriptions', emoji: '🎬', occurrence: 'monthly' },
  { name: 'Apple TV+', category: 'Subscriptions', emoji: '🎬', occurrence: 'monthly' },
  { name: 'Amazon Prime', category: 'Subscriptions', emoji: '📦', occurrence: 'annually' },
  { name: 'YouTube Premium', category: 'Subscriptions', emoji: '▶️', occurrence: 'monthly' },
  { name: 'iCloud', category: 'Subscriptions', emoji: '☁️', occurrence: 'monthly' },
  { name: 'Google One', category: 'Subscriptions', emoji: '☁️', occurrence: 'monthly' },
  { name: 'Adobe Creative Cloud', category: 'Subscriptions', emoji: '🎨', occurrence: 'monthly' },
  { name: 'Gym Membership', category: 'Subscriptions', emoji: '💪', occurrence: 'monthly' },
  // Insurance
  { name: 'Car Insurance', category: 'Insurance', emoji: '🚗', occurrence: 'annually' },
  { name: 'Home Insurance', category: 'Insurance', emoji: '🏠', occurrence: 'annually' },
  { name: 'Life Insurance', category: 'Insurance', emoji: '❤️', occurrence: 'monthly' },
  { name: 'Pet Insurance', category: 'Insurance', emoji: '🐾', occurrence: 'monthly' },
  { name: 'Health Insurance', category: 'Insurance', emoji: '🏥', occurrence: 'monthly' },
  { name: 'Travel Insurance', category: 'Insurance', emoji: '✈️', occurrence: 'annually' },
  // Transport
  { name: 'Car Tax', category: 'Transport', emoji: '🚗', occurrence: 'annually' },
  { name: 'Train Season Ticket', category: 'Transport', emoji: '🚆', occurrence: 'annually' },
  { name: 'Bus Pass', category: 'Transport', emoji: '🚌', occurrence: 'monthly' },
  { name: 'Parking Permit', category: 'Transport', emoji: '🅿️', occurrence: 'annually' },
  // Other
  { name: 'Childcare', category: 'Other', emoji: '👶', occurrence: 'monthly' },
  { name: 'School Fees', category: 'Other', emoji: '🎓', occurrence: 'monthly' },
];

/** Curated emoji grid for the picker (5 rows × 14 cols) */
const EMOJI_GRID = [
  '⚡', '🔥', '💧', '📡', '📺', '📱', '☎️', '🏛️', '🔌', '💡', '🌡️', '🚰', '🛁', '🪟',
  '🎬', '🎵', '📦', '✨', '▶️', '☁️', '🎮', '📚', '🎯', '🎸', '🎤', '🎧', '🎨', '🖼️',
  '🛡️', '❤️', '🏥', '🦷', '🐾', '🏠', '🚗', '🚆', '🚌', '⛽', '✈️', '🅿️', '🏙️', '🚲',
  '💳', '💰', '💸', '🏦', '💼', '🧾', '📊', '📈', '🔑', '🗝️', '🏢', '🏗️', '🧹', '⚙️',
  '👶', '🎓', '🛒', '🍔', '☕', '🎪', '⚽', '🏋️', '🌍', '🐶', '🐱', '🪴', '💊', '🧴',
];

// ── Module state ────────────────────────────────────
let billsActiveTab = 'All';
let editingBillIdx = null;
let billEmojiTarget = null; // 'add' | 'edit'

// ── Utility helpers ─────────────────────────────────

function autoEmoji(name, category) {
  const lower = (name || '').toLowerCase();
  for (const [key, emoji] of EMOJI_KEYWORDS) {
    if (lower.includes(key)) return emoji;
  }
  return CAT_EMOJI[category] || '📋';
}

function ordinal(n) {
  const v = n % 100;
  const s = ['th', 'st', 'nd', 'rd'];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function fmtOccurrence(bill) {
  const o = billOccurrenceOf(bill);
  const day = billPaymentDayFrom(bill);
  if (o === 'one-off') return 'One-off';
  if (o === 'weekly') return `Weekly · ${WEEK_DAYS[bill.paymentDayOfWeek || 0]}s`;
  if (o === 'fortnightly') return 'Fortnightly';
  if (o === 'monthly') return `Monthly · ${ordinal(day)}`;
  if (o === 'quarterly') return `Quarterly · ${ordinal(day)}`;
  if (o === 'annually') return `Annually · ${MONTH_NAMES[bill.paymentMonth || 0]} ${ordinal(day)}`;
  return o;
}

/** Convert a bill's stated amount to its monthly equivalent */
function toMonthlyAmount(bill) {
  const o = billOccurrenceOf(bill);
  const factor = MONTHLY_FACTOR[o] ?? 1;
  return bill.amount * factor;
}

/** Total amount of bills whose next payment falls in the current calendar month */
function getDueThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59);
  return S.bills.reduce((sum, b) => {
    const next = getNextPaymentDate(b);
    return (next >= start && next <= end) ? sum + b.amount : sum;
  }, 0);
}

/** Bills (with their next date) due within the next N days inclusive of today */
function getBillsDueSoon(days = 7) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() + days);
  return S.bills
    .map(b => ({ bill: b, next: getNextPaymentDate(b) }))
    .filter(({ next }) => next >= now && next <= cutoff)
    .sort((a, b) => a.next - b.next);
}

function getNextPaymentDate(bill) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const o = billOccurrenceOf(bill);

  if (o === 'one-off') {
    const raw = bill.paymentDate || bill.nextPaymentDate;
    return raw ? new Date(raw) : now;
  }

  if (o === 'weekly') {
    const target = bill.paymentDayOfWeek || 0;
    const diff = ((target - now.getDay() + 7) % 7) || 7;
    const d = new Date(now); d.setDate(d.getDate() + diff);
    return d;
  }

  if (o === 'fortnightly') {
    if (bill.paymentDate) {
      let anchor = new Date(bill.paymentDate);
      while (anchor <= now) anchor.setDate(anchor.getDate() + 14);
      return anchor;
    }
    if (bill.nextPaymentDate) {
      let anchor = new Date(bill.nextPaymentDate);
      anchor.setHours(0, 0, 0, 0);
      if (!isNaN(+anchor)) {
        while (anchor < now) anchor.setDate(anchor.getDate() + 14);
        return anchor;
      }
    }
    const d = new Date(now); d.setDate(d.getDate() + 14);
    return d;
  }

  const hasPaymentDay = bill.paymentDay != null && bill.paymentDay !== '';
  if (
    bill.nextPaymentDate &&
    !hasPaymentDay &&
    ['monthly', 'quarterly', 'annually'].includes(o)
  ) {
    let d = new Date(bill.nextPaymentDate);
    d.setHours(0, 0, 0, 0);
    if (!isNaN(+d)) {
      while (d < now) {
        if (o === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (o === 'quarterly') d.setMonth(d.getMonth() + 3);
        else if (o === 'annually') d.setFullYear(d.getFullYear() + 1);
        else break;
      }
      return d;
    }
  }

  const day = Math.min(billPaymentDayFrom(bill), 28);

  if (o === 'monthly') {
    let d = new Date(now.getFullYear(), now.getMonth(), day);
    if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
    return d;
  }

  if (o === 'quarterly') {
    for (let i = 0; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, day);
      if (d > now) return d;
    }
  }

  if (o === 'annually') {
    const month = bill.paymentMonth || 0;
    let d = new Date(now.getFullYear(), month, day);
    if (d <= now) d = new Date(now.getFullYear() + 1, month, day);
    return d;
  }

  let d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return d;
}

// ── Stats panel ─────────────────────────────────────
// Call this to populate #billStatsPanel in your HTML.
// Expected markup: <div id="billStatsPanel" class="bill-stats-panel"></div>

function renderBillStats() {
  const el = document.getElementById('billStatsPanel');
  if (!el) return;

  if (!S.bills.length) { el.innerHTML = ''; return; }

  const recurring = S.bills.filter(b => billOccurrenceOf(b) !== 'one-off');
  const oneOffs = S.bills.filter(b => billOccurrenceOf(b) === 'one-off');
  const monthlyTotal = recurring.reduce((s, b) => s + toMonthlyAmount(b), 0);
  const annualTotal = monthlyTotal * 12;
  const dailyCost = annualTotal / 365;
  const dueThisMonth = getDueThisMonth();
  const dueSoon = getBillsDueSoon(7);
  const dueSoonTotal = dueSoon.reduce((s, { bill }) => s + bill.amount, 0);
  const biggest = recurring.length
    ? recurring.reduce((a, b) => toMonthlyAmount(b) > toMonthlyAmount(a) ? b : a)
    : null;

  el.innerHTML = `
    <div class="stat-card clickable-card" data-modal="monthly" style="cursor:pointer;">
      <div class="stat-label">Monthly total</div>
      <div class="stat-val" style="color: var(--red);">${fmt(monthlyTotal)}</div>
      <div class="stat-sub">${recurring.length} recurring bill${recurring.length !== 1 ? 's' : ''}</div>
      <div class="card-expand-hint">↗ breakdown</div>
    </div>
    <div class="stat-card clickable-card" data-modal="annual" style="cursor:pointer;">
      <div class="stat-label">Annual total</div>
      <div class="stat-val" style="color: var(--red);">${fmt(annualTotal)}</div>
      <div class="stat-sub">${fmt(dailyCost)} / day</div>
      <div class="card-expand-hint">↗ breakdown</div>
    </div>
    <div class="stat-card clickable-card" data-modal="due-month" style="cursor:pointer;">
      <div class="stat-label">Due this month</div>
      <div class="stat-val" style="color: var(--red);">${fmt(dueThisMonth)}</div>
      <div class="stat-sub">${MONTH_NAMES[new Date().getMonth()]}</div>
      <div class="card-expand-hint">↗ details</div>
    </div>
    <div class="stat-card${dueSoon.length ? ' stat-alert' : ''} clickable-card" data-modal="due-soon" style="cursor:pointer;">
      <div class="stat-label">Due next 7 days</div>
      <div class="stat-val" style="color: var(--red);">${dueSoon.length ? fmt(dueSoonTotal) : '—'}</div>
      <div class="stat-sub">${dueSoon.length
      ? `${dueSoon.length} payment${dueSoon.length !== 1 ? 's' : ''}`
      : 'Nothing due'}</div>
      <div class="card-expand-hint">↗ details</div>
    </div>
    ${biggest ? `
    <div class="stat-card clickable-card" data-modal="biggest" style="cursor:pointer;">
      <div class="stat-label">Biggest bill</div>
      <div class="stat-val stat-val-compact">
        ${biggest.emoji || autoEmoji(biggest.name, billCategoryDisplay(biggest))} ${biggest.name}
      </div>
      <div class="stat-sub" style="color: var(--red);">${fmt(toMonthlyAmount(biggest))} / mo</div>
      <div class="card-expand-hint">↗ details</div>
    </div>` : ''}
    ${oneOffs.length ? `
    <div class="stat-card clickable-card" data-modal="oneoff" style="cursor:pointer;">
      <div class="stat-label">One-off payments</div>
      <div class="stat-val" style="color: var(--red);">${fmt(oneOffs.reduce((s, b) => s + b.amount, 0))}</div>
      <div class="stat-sub">${oneOffs.length} item${oneOffs.length !== 1 ? 's' : ''}</div>
      <div class="card-expand-hint">↗ breakdown</div>
    </div>` : ''}
  `;

  // Attach click handlers for modals
  document.querySelectorAll('#billStatsPanel .clickable-card').forEach(card => {
    card.addEventListener('click', () => _openBillStatModal(card.dataset.modal, { monthlyTotal, annualTotal, dailyCost, dueThisMonth, dueSoon, dueSoonTotal, biggest, oneOffs }));
  });
}

// ══════════════════════════════════════════════════
// BILL STAT CARD MODAL
// ══════════════════════════════════════════════════

function _openBillStatModal(type, data) {
  // Remove existing modal if any
  const existing = document.getElementById('billStatModal');
  if (existing) existing.remove();

  let title = '', rows = [];

  if (type === 'monthly') {
    title = 'Monthly Bill Breakdown';
    const recurring = S.bills.filter(b => billOccurrenceOf(b) !== 'one-off');
    recurring.forEach(b => {
      const monthly = toMonthlyAmount(b);
      const cat = billCategoryDisplay(b);
      const emoji = b.emoji || autoEmoji(b.name, cat);
      rows.push({ label: `${emoji} ${b.name} <span style="opacity:.5;font-size:11px;">${cat}</span>`, value: monthly, sub: `${fmt(b.amount)} · ${billOccurrenceOf(b)}`, color: 'neg' });
    });
    rows.push({ divider: true });
    rows.push({ label: '<strong>Total Monthly</strong>', value: data.monthlyTotal, color: 'neg', bold: true });
  }

  else if (type === 'annual') {
    title = 'Annual Bill Breakdown';
    const recurring = S.bills.filter(b => billOccurrenceOf(b) !== 'one-off');
    recurring.forEach(b => {
      const monthly = toMonthlyAmount(b);
      const annual = monthly * 12;
      const cat = billCategoryDisplay(b);
      const emoji = b.emoji || autoEmoji(b.name, cat);
      rows.push({ label: `${emoji} ${b.name} <span style="opacity:.5;font-size:11px;">${cat}</span>`, value: annual, sub: `${fmt(monthly)}/mo · ${billOccurrenceOf(b)}`, color: 'neg' });
    });
    rows.push({ divider: true });
    rows.push({ label: '<strong>Total Annual</strong>', value: data.annualTotal, color: 'neg', bold: true });
    rows.push({ label: 'Daily cost', value: data.dailyCost, sub: 'average per day', color: 'neg' });
  }

  else if (type === 'due-month') {
    title = 'Bills Due This Month';
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59);
    S.bills.forEach(b => {
      const next = getNextPaymentDate(b);
      if (next >= start && next <= end) {
        const cat = billCategoryDisplay(b);
        const emoji = b.emoji || autoEmoji(b.name, cat);
        rows.push({ label: `${emoji} ${b.name} <span style="opacity:.5;font-size:11px;">${cat}</span>`, value: b.amount, sub: `${fmtDate(next.toISOString().split('T')[0])}`, color: 'neg' });
      }
    });
    rows.push({ divider: true });
    rows.push({ label: '<strong>Total Due This Month</strong>', value: data.dueThisMonth, color: 'neg', bold: true });
  }

  else if (type === 'due-soon') {
    title = 'Bills Due Next 7 Days';
    data.dueSoon.forEach(({ bill, next }) => {
      const cat = billCategoryDisplay(bill);
      const emoji = bill.emoji || autoEmoji(bill.name, cat);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const daysLeft = Math.floor((next - now) / 86400000);
      const label = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`;
      rows.push({ label: `${emoji} ${bill.name} <span style="opacity:.5;font-size:11px;">${cat}</span>`, value: bill.amount, sub: label, color: 'neg' });
    });
    if (!data.dueSoon.length) {
      rows.push({ label: 'No bills due in the next 7 days', value: 0, sub: '', color: 'neu' });
    }
    rows.push({ divider: true });
    rows.push({ label: '<strong>Total Due Next 7 Days</strong>', value: data.dueSoonTotal, color: 'neg', bold: true });
  }

  else if (type === 'biggest' && data.biggest) {
    title = 'Biggest Bill Details';
    const b = data.biggest;
    const cat = billCategoryDisplay(b);
    const emoji = b.emoji || autoEmoji(b.name, cat);
    const monthly = toMonthlyAmount(b);
    rows.push({ label: `${emoji} ${b.name}`, value: monthly, sub: `${cat} · ${billOccurrenceOf(b)}`, color: 'neg', bold: true });
    rows.push({ label: 'Monthly amount', value: monthly, color: 'neg' });
    rows.push({ label: 'Annual amount', value: monthly * 12, color: 'neg' });
    rows.push({ label: 'Payment amount', value: b.amount, color: 'neg' });
    if (b.company) rows.push({ label: 'Company', value: b.company, sub: '', color: 'neu', isText: true });
  }

  else if (type === 'oneoff') {
    title = 'One-off Payments';
    data.oneOffs.forEach(b => {
      const cat = billCategoryDisplay(b);
      const emoji = b.emoji || autoEmoji(b.name, cat);
      const date = b.paymentDate || b.nextPaymentDate || '';
      rows.push({ label: `${emoji} ${b.name} <span style="opacity:.5;font-size:11px;">${cat}</span>`, value: b.amount, sub: date ? fmtDate(date) : 'No date set', color: 'neg' });
    });
    rows.push({ divider: true });
    rows.push({ label: '<strong>Total One-off</strong>', value: data.oneOffs.reduce((s, b) => s + b.amount, 0), color: 'neg', bold: true });
  }

  // Build HTML
  const rowsHTML = rows.map(r => {
    if (r.divider) return `<div style="border-top:1px solid var(--border);margin:8px 0;"></div>`;
    if (r.isText) {
      return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.04);">
          <div>
            <div style="font-size:13px;color:var(--text);">${r.label}</div>
            ${r.sub ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${r.sub}</div>` : ''}
          </div>
          <div style="font-size:13px;color:var(--text);">${r.value}</div>
        </div>`;
    }
    const valDisplay = `<span class="val ${r.color}" style="${r.bold ? 'font-size:15px;font-variation-settings:\'wght\' 700;' : ''}">${fmt(r.value)}</span>`;
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.04);">
        <div>
          <div style="font-size:13px;color:var(--text);">${r.label}</div>
          ${r.sub ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${r.sub}</div>` : ''}
        </div>
        ${valDisplay}
      </div>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'billStatModal';
  modal.innerHTML = `
    <div id="billStatOverlay" style="
      position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;
      display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(4px);animation:fadeInModal .18s ease;">
      <div style="
        background:var(--card,#fff);border-radius:16px;
        box-shadow:0 24px 60px rgba(0,0,0,.22);
        width:min(480px,92vw);max-height:80vh;
        display:flex;flex-direction:column;
        animation:slideUpModal .22s cubic-bezier(.34,1.56,.64,1);">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 22px 14px;border-bottom:1px solid var(--border);">
          <div style="font-size:16px;font-variation-settings:'wght' 700;color:var(--text);">${title}</div>
          <button id="billStatModalClose" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);line-height:1;padding:2px 6px;border-radius:6px;" aria-label="Close">×</button>
        </div>
        <!-- Body -->
        <div style="overflow-y:auto;padding:4px 22px 20px;flex:1;">
          ${rowsHTML}
        </div>
      </div>
    </div>`;

  // Inject animation keyframes once
  if (!document.getElementById('billModalKeyframes')) {
    const s = document.createElement('style');
    s.id = 'billModalKeyframes';
    s.textContent = `
      @keyframes fadeInModal { from{opacity:0} to{opacity:1} }
      @keyframes slideUpModal { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      .card-expand-hint { font-size:10px;color:var(--muted);margin-top:6px;opacity:.6; }
      .clickable-card:hover .card-expand-hint { opacity:1; }
      .clickable-card { transition:transform .15s,box-shadow .15s; }
      .clickable-card:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.12); }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(modal);

  // Close handlers
  const close = () => modal.remove();
  document.getElementById('billStatModalClose').addEventListener('click', close);
  document.getElementById('billStatOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
}

// ── Upcoming alert strip ─────────────────────────────
// Call this to populate #billsUpcomingStrip in your HTML.
// Expected markup: <div id="billsUpcomingStrip" class="upcoming-strip"></div>

function renderUpcomingStrip() {
  const el = document.getElementById('billsUpcomingStrip');
  if (!el) return;
  const dueSoon = getBillsDueSoon(7);
  if (!dueSoon.length) { el.style.display = 'none'; return; }

  el.style.display = '';
  const now = new Date(); now.setHours(0, 0, 0, 0);

  el.innerHTML = `
    <div class="upcoming-header">Due in the next 7 days</div>
    <div class="upcoming-list">
      ${dueSoon.map(({ bill, next }) => {
    const daysLeft = Math.floor((next - now) / 86400000);
    const cat = billCategoryDisplay(bill);
    const emoji = bill.emoji || autoEmoji(bill.name, cat);
    const label = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`;
    return `<div class="upcoming-item">
          <span class="upcoming-left">
            <span class="upcoming-emoji" aria-hidden="true">${emoji}</span>
            <span>
              <strong>${bill.name}</strong>
              ${bill.company ? `<span class="upcoming-co">${bill.company}</span>` : ''}
            </span>
          </span>
          <span class="upcoming-right">
            <span class="upcoming-amt val">${fmt(bill.amount)}</span>
            <span class="upcoming-badge${daysLeft === 0 ? ' today' : ''}">${label}</span>
          </span>
        </div>`;
  }).join('')}
    </div>`;
}

// ── Bills ticker tape (similar to overview page) ─────────────────────────────
// Call this to populate #billsTicker in your HTML.
// Expected markup: <div id="billsTicker" class="bills-upcoming-strip"></div>

function renderBillsTicker() {
  const wrapper = document.getElementById('billsTickerWrapper');
  const el = document.getElementById('billsTicker');
  if (!wrapper || !el) return;

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dueSoon = getBillsDueSoon(30); // Show next 30 days

  if (!dueSoon.length) {
    wrapper.style.display = '';
    el.innerHTML = `
      <div class="bills-ticker-chips">
        <div class="bills-ticker-chip normal">
          <span class="bills-ticker-emoji">🙌</span>
          <span class="bills-ticker-label">No upcoming bills</span>
          <span class="bills-ticker-days">You're all caught up!</span>
        </div>
      </div>
    `;
    return;
  }

  wrapper.style.display = '';

  const chips = dueSoon.slice(0, 8).map(({ bill, next }) => {
    const daysLeft = Math.floor((next - now) / 86400000);
    const cat = billCategoryDisplay(bill);
    const emoji = bill.emoji || autoEmoji(bill.name, cat);

    let urgencyClass = 'normal';
    let daysText = `in ${daysLeft}d`;

    if (daysLeft === 0) {
      urgencyClass = 'urgent';
      daysText = 'today';
    } else if (daysLeft === 1) {
      urgencyClass = 'urgent';
      daysText = 'tomorrow';
    } else if (daysLeft <= 3) {
      urgencyClass = 'urgent';
    } else if (daysLeft <= 7) {
      urgencyClass = 'soon';
    }

    return `<div class="bills-ticker-chip ${urgencyClass}">
      <span class="bills-ticker-emoji">${emoji}</span>
      <span class="bills-ticker-label">${bill.name}</span>
      <span class="bills-ticker-days">${daysText}</span>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="bills-ticker-chips">${chips}</div>`;
}

// ── Tabs ─────────────────────────────────────────────

function switchBillTab(tab) {
  billsActiveTab = tab;
  document.querySelectorAll('#page-bills .tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tab)
  );
  renderBills();
}

// ── Emoji picker ──────────────────────────────────────

function openEmojiPicker(target) {
  billEmojiTarget = target;
  const modal = document.getElementById('emojiPickerModal');
  if (!modal) return;
  const search = document.getElementById('emojiSearch');
  if (search) search.value = '';
  renderEmojiGrid('');
  modal.classList.remove('hidden');
}

function renderEmojiGrid(search) {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  const q = (search || '').trim();
  const list = q.length
    ? EMOJI_GRID.filter(e => e.includes(q))
    : EMOJI_GRID;
  const show = list.length ? list : EMOJI_GRID;
  grid.innerHTML = show
    .map(e => `<button type="button" class="emoji-opt" onclick="selectEmoji('${e}')">${e}</button>`)
    .join('');
}

function selectEmoji(emoji) {
  const id = billEmojiTarget === 'add' ? 'billEmojiBtn' : 'eb-emoji';
  const btn = document.getElementById(id);
  if (btn) { btn.textContent = emoji; btn.dataset.emoji = emoji; }
  closeModal('emojiPickerModal');
}

// ── Render bills grid ─────────────────────────────────

function renderBills() {
  const grid = document.getElementById('billsGrid');
  if (!grid) return;

  const filtered = billsActiveTab === 'All'
    ? S.bills
    : S.bills.filter(b => billCategoryDisplay(b) === billsActiveTab);

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="ei">⧗</div>
      <p>${billsActiveTab === 'All' ? 'No bills tracked yet.' : `No ${billsActiveTab} bills.`}</p>
    </div>`;
    renderBillStats();
    renderBillsTicker();
    renderBillTemplates();
    toggleOccurrenceFields();
    return;
  }

  const now = new Date(); now.setHours(0, 0, 0, 0);

  grid.innerHTML = filtered.map(b => {
    const origIdx = S.bills.indexOf(b);
    const nextDate = getNextPaymentDate(b);
    const daysLeft = Math.max(0, Math.floor((nextDate - now) / 86400000));
    const isOneOff = billOccurrenceOf(b) === 'one-off';
    const overdue = !isOneOff && nextDate < now;
    const dueSoon = !overdue && daysLeft <= 7;
    const cat = billCategoryDisplay(b);
    const emoji = b.emoji || autoEmoji(b.name, cat);
    const freqLabel = FREQ_LABEL[billOccurrenceOf(b)] || '';

    let dueLabel = '';
    if (overdue) dueLabel = ` · <span class="neg">Overdue</span>`;
    else if (dueSoon) dueLabel = ` · <span class="neg">${daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`
      }</span>`;

    const subtitleParts = [];
    if (b.company) subtitleParts.push(b.company);
    subtitleParts.push(fmtOccurrence(b));
    const metaLine = subtitleParts.join(' · ');

    return `<div class="bill-card${overdue ? ' bill-overdue' : ''}${dueSoon && !overdue ? ' bill-due-soon' : ''}">
      <div class="bill-top">
        <div class="bill-title-row">
          <span class="bill-emoji" aria-hidden="true">${emoji}</span>
          <div class="bill-title-block">
            <div class="bill-title">${b.name}</div>
            <div class="bill-meta"><span class="bill-cat-pill">${cat}</span>${metaLine}</div>
          </div>
        </div>
        <div class="bill-actions">
          <button type="button" class="icon-btn edit" onclick="openEditBill(${origIdx})" aria-label="Edit bill">✎</button>
          <button type="button" class="icon-btn del"  onclick="deleteBill(${origIdx})" aria-label="Delete bill">✕</button>
        </div>
      </div>

      <div class="bill-amt-row">
        <div class="bill-amt val" style="color: var(--red);">${fmt(b.amount)}</div>
        ${freqLabel ? `<div class="bill-freq">${freqLabel}</div>` : ''}
      </div>

      ${b.firstPaymentAmount
        ? `<div class="bill-first-pay">First payment: ${fmt(b.firstPaymentAmount)}</div>`
        : ''}

      <div class="bill-date-line">
        ${isOneOff ? 'Date' : 'Next'}: ${fmtDate(nextDate.toISOString().split('T')[0])}${dueLabel}
      </div>
      ${b.notes ? `<div class="bill-notes">📝 ${b.notes}</div>` : ''}
    </div>`;
  }).join('');

  renderBillStats();
  renderBillsTicker();
  renderBillTemplates();
  toggleOccurrenceFields();
}

// ── Template chips ─────────────────────────────────

function renderBillTemplates() {
  const container = document.getElementById('billTemplates');
  const heading = document.getElementById('billTemplatesHeading');
  if (!container) return;
  const existingNames = new Set(S.bills.map(b => b.name.toLowerCase()));
  container.innerHTML = BILL_TEMPLATES
    .filter(t => !existingNames.has(t.name.toLowerCase()))
    .map(t => {
      const safe = t.name.replace(/'/g, "\\'");
      return `<button type="button" class="template-chip"
        onclick="quickAddBill('${safe}','${t.category}','${t.emoji}','${t.occurrence}')">
        ${t.emoji} ${t.name}
      </button>`;
    }).join('');
  if (heading) {
    heading.style.display = container.innerHTML.trim() ? '' : 'none';
  }
}

function quickAddBill(name, category, emoji, occurrence) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('billName', name);
  set('billCategory', category);
  set('billOccurrence', occurrence);
  const emojiBtn = document.getElementById('billEmojiBtn');
  if (emojiBtn) { emojiBtn.textContent = emoji; emojiBtn.dataset.emoji = emoji; }
  toggleOccurrenceFields();
  document.getElementById('billName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('billAmount')?.focus();
}

// ── Form field toggling ─────────────────────────────

function toggleOccurrenceFields() {
  const occ = document.getElementById('billOccurrence')?.value;
  const show = (id, cond) => { const el = document.getElementById(id); if (el) el.style.display = cond ? '' : 'none'; };
  show('billPaymentDayField', ['monthly', 'quarterly', 'annually'].includes(occ));
  show('billPaymentDateField', ['one-off', 'fortnightly'].includes(occ));
  show('billPaymentMonthField', occ === 'annually');
  show('billPaymentWeekDayField', occ === 'weekly');
  const dateLbl = document.getElementById('billPaymentDateLabel');
  if (dateLbl) dateLbl.textContent = occ === 'one-off' ? 'Payment date' : 'Fortnight start date';
}

function toggleFirstPayment(checked) {
  const fp = document.getElementById('billFirstPaymentField');
  if (fp) fp.style.display = checked ? '' : 'none';
}

// ── Add bill ────────────────────────────────────────

function addBill() {
  const name = (document.getElementById('billName').value || '').trim();
  const category = document.getElementById('billCategory').value;
  const emojiBtn = document.getElementById('billEmojiBtn');
  const emoji = emojiBtn?.dataset.emoji || autoEmoji(name, category);
  const company = (document.getElementById('billCompany')?.value || '').trim();
  const amount = parseMoney(document.getElementById('billAmount').value);
  const occurrence = document.getElementById('billOccurrence').value;
  const notes = (document.getElementById('billNotes').value || '').trim();

  const paymentDay = parseInt(document.getElementById('billPaymentDay')?.value) || 1;
  const paymentMonth = parseInt(document.getElementById('billPaymentMonth')?.value) || 0;
  const paymentDate = document.getElementById('billPaymentDate')?.value || '';
  const paymentDayOfWeek = parseInt(document.getElementById('billPaymentWeekDay')?.value) || 0;

  const hasDiffFirst = document.getElementById('billDiffFirst')?.checked;
  const firstPaymentAmount = hasDiffFirst
    ? (parseMoney(document.getElementById('billFirstPayment')?.value) || null)
    : null;

  if (!name || !amount) {
    toast('Please fill in the bill name and amount');
    return;
  }
  if (occurrence === 'one-off' && !paymentDate) {
    toast('Please set a payment date');
    return;
  }

  S.bills.push({
    id: Date.now(),
    name, category, emoji, company, amount, occurrence,
    paymentDay, paymentMonth, paymentDate, paymentDayOfWeek,
    firstPaymentAmount, notes,
    createdDate: new Date().toISOString().split('T')[0],
  });

  save();
  toast(`Added: ${emoji} ${name}`);
  renderBills();

  // Reset add form
  ['billName', 'billAmount', 'billNotes', 'billCompany'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const occSel = document.getElementById('billOccurrence');
  if (occSel) occSel.value = 'monthly';
  const dayIn = document.getElementById('billPaymentDay');
  if (dayIn) dayIn.value = '1';
  const pDate = document.getElementById('billPaymentDate');
  if (pDate) pDate.value = '';
  if (emojiBtn) { emojiBtn.textContent = '🔖'; delete emojiBtn.dataset.emoji; }
  const diffFirst = document.getElementById('billDiffFirst');
  if (diffFirst) { diffFirst.checked = false; toggleFirstPayment(false); }
  const firstPay = document.getElementById('billFirstPayment');
  if (firstPay) firstPay.value = '';
  toggleOccurrenceFields();
}

// ── Delete bill ─────────────────────────────────────

function deleteBill(i) {
  if (i == null || i < 0 || i >= S.bills.length) return;
  const deleted = S.bills.splice(i, 1)[0];
  window._lastDeletedBill = { item: deleted, index: i };
  updateUndoButton('billsUndoBtn', window._lastDeletedBill);
  save();
  renderBills();
  toast('Bill removed');
}

function undoLastBillDelete() {
  if (!window._lastDeletedBill) return;
  const { item, index } = window._lastDeletedBill;
  S.bills.splice(index, 0, item);
  window._lastDeletedBill = null;
  updateUndoButton('billsUndoBtn', null);
  save();
  renderBills();
  toast('Bill restored');
}

// ── Edit bill ───────────────────────────────────────

function openEditBill(i) {
  if (i == null || i < 0 || i >= S.bills.length) return;
  editingBillIdx = i;
  const b = S.bills[i];
  const modal = document.getElementById('editBillModal');
  if (!modal) { toast('Edit modal not found'); return; }

  const grid = document.getElementById('editBillGrid');
  if (!grid) { toast('Edit form not found'); return; }

  const cat = billCategoryDisplay(b);
  const emoji = b.emoji || autoEmoji(b.name, cat);
  const occ = billOccurrenceOf(b);
  const showDay = ['monthly', 'quarterly', 'annually'].includes(occ);
  const showDate = ['one-off', 'fortnightly'].includes(occ);
  const payDay = billPaymentDayFrom(b);
  const dateVal = b.paymentDate || b.nextPaymentDate || '';

  grid.innerHTML = `
    <div class="ff">
      <label>Icon</label>
      <button type="button" id="eb-emoji" class="emoji-btn" data-emoji="${emoji}"
              onclick="openEmojiPicker('edit')">${emoji}</button>
    </div>
    <div class="ff">
      <label>Name</label>
      <input type="text" id="eb-name" value="${b.name}"/>
    </div>
    <div class="ff">
      <label>Category</label>
      <select id="eb-category">
        ${BILL_CATEGORIES.map(c =>
    `<option value="${c}" ${cat === c ? 'selected' : ''}>${c}</option>`
  ).join('')}
      </select>
    </div>
    <div class="ff">
      <label>Company / Provider</label>
      <input type="text" id="eb-company"
             value="${b.company || ''}" placeholder="e.g. Octopus Energy"/>
    </div>
    <div class="ff money-field">
      <label>Amount</label>
      <input type="text" id="eb-amount"
             value="${b.amount.toLocaleString('en-GB')}" oninput="formatMoney(this)"/>
      <span class="currency">£</span>
    </div>
    <div class="ff flex-row gap-8" style="padding-top:18px;">
      <input type="checkbox" id="eb-diff-first"
             ${b.firstPaymentAmount ? 'checked' : ''}
             onchange="toggleEditFirstPayment(this.checked)"/>
      <label for="eb-diff-first" class="text-sm" style="margin:0;">Different first payment amount</label>
    </div>
    <div class="ff money-field" id="eb-first-field"
         style="display:${b.firstPaymentAmount ? '' : 'none'}">
      <label>First payment</label>
      <input type="text" id="eb-first-amount"
             value="${b.firstPaymentAmount ? b.firstPaymentAmount.toLocaleString('en-GB') : ''}"
             oninput="formatMoney(this)"/>
      <span class="currency">£</span>
    </div>
    <div class="ff">
      <label>Occurrence</label>
      <select id="eb-occurrence" onchange="toggleEditOccurrenceFields()">
        <option value="monthly"     ${occ === 'monthly' ? 'selected' : ''}>Monthly</option>
        <option value="weekly"      ${occ === 'weekly' ? 'selected' : ''}>Weekly</option>
        <option value="fortnightly" ${occ === 'fortnightly' ? 'selected' : ''}>Fortnightly</option>
        <option value="quarterly"   ${occ === 'quarterly' ? 'selected' : ''}>Quarterly</option>
        <option value="annually"    ${occ === 'annually' ? 'selected' : ''}>Annually</option>
        <option value="one-off"     ${occ === 'one-off' ? 'selected' : ''}>One-off</option>
      </select>
    </div>
    <div class="ff" id="eb-day-field" style="display:${showDay ? '' : 'none'}">
      <label>Day of month (1–28)</label>
      <input type="number" id="eb-day" min="1" max="28" value="${payDay}"/>
    </div>
    <div class="ff" id="eb-month-field" style="display:${occ === 'annually' ? '' : 'none'}">
      <label>Month</label>
      <select id="eb-month">
        ${MONTH_NAMES.map((m, idx) =>
    `<option value="${idx}" ${(b.paymentMonth || 0) === idx ? 'selected' : ''}>${m}</option>`
  ).join('')}
      </select>
    </div>
    <div class="ff" id="eb-weekday-field" style="display:${occ === 'weekly' ? '' : 'none'}">
      <label>Day of week</label>
      <select id="eb-weekday">
        ${WEEK_DAYS.map((d, idx) =>
    `<option value="${idx}" ${(b.paymentDayOfWeek || 0) === idx ? 'selected' : ''}>${d}</option>`
  ).join('')}
      </select>
    </div>
    <div class="ff" id="eb-date-field" style="display:${showDate ? '' : 'none'}">
      <label>${occ === 'one-off' ? 'Payment date' : 'Start date'}</label>
      <input type="date" id="eb-date" value="${dateVal}"/>
    </div>
    <div class="ff full-col">
      <label>Notes</label>
      <textarea id="eb-notes">${b.notes || ''}</textarea>
    </div>`;

  modal.classList.remove('hidden');
}

function toggleEditOccurrenceFields() {
  const occ = document.getElementById('eb-occurrence')?.value;
  const show = (id, cond) => { const el = document.getElementById(id); if (el) el.style.display = cond ? '' : 'none'; };
  show('eb-day-field', ['monthly', 'quarterly', 'annually'].includes(occ));
  show('eb-date-field', ['one-off', 'fortnightly'].includes(occ));
  show('eb-month-field', occ === 'annually');
  show('eb-weekday-field', occ === 'weekly');
}

function toggleEditFirstPayment(checked) {
  const fp = document.getElementById('eb-first-field');
  if (fp) fp.style.display = checked ? '' : 'none';
}

function saveEditBill() {
  if (editingBillIdx === null) return;
  const b = S.bills[editingBillIdx];
  const occ = document.getElementById('eb-occurrence').value;
  const emojiBtn = document.getElementById('eb-emoji');
  const hasDiffFirst = document.getElementById('eb-diff-first')?.checked;

  b.name = (document.getElementById('eb-name').value || '').trim();
  b.category = document.getElementById('eb-category').value;
  b.emoji = emojiBtn?.dataset.emoji || autoEmoji(b.name, b.category);
  b.company = (document.getElementById('eb-company')?.value || '').trim();
  b.amount = parseMoney(document.getElementById('eb-amount').value) || b.amount;
  b.occurrence = occ;
  b.paymentDay = parseInt(document.getElementById('eb-day')?.value) || 1;
  b.paymentMonth = parseInt(document.getElementById('eb-month')?.value) || 0;
  b.paymentDate = document.getElementById('eb-date')?.value || '';
  b.paymentDayOfWeek = parseInt(document.getElementById('eb-weekday')?.value) || 0;
  b.firstPaymentAmount = hasDiffFirst
    ? (parseMoney(document.getElementById('eb-first-amount')?.value) || null)
    : null;
  b.notes = document.getElementById('eb-notes')?.value || '';

  delete b.nextPaymentDate;
  delete b.frequency;
  delete b.recurring;

  save(); closeModal('editBillModal'); renderBills(); toast('Bill saved');
}

// ── HTML fragments for reference ────────────────────
//
// Paste these into your bills tab HTML where needed.
//
// Stats panel (place above the tabs):
//   <div id="billStatsPanel" class="bill-stats-panel"></div>
//
// Upcoming strip (place between stats and tab bar):
//   <div id="billsUpcomingStrip" class="upcoming-strip" style="display:none"></div>
//
// Tab bar:
//   <div class="bill-tabs">
//     <button class="bill-tab active" data-tab="All"           onclick="switchBillTab('All')">All</button>
//     <button class="bill-tab"        data-tab="Utilities"     onclick="switchBillTab('Utilities')">Utilities</button>
//     <button class="bill-tab"        data-tab="Subscriptions" onclick="switchBillTab('Subscriptions')">Subscriptions</button>
//     <button class="bill-tab"        data-tab="Insurance"     onclick="switchBillTab('Insurance')">Insurance</button>
//     <button class="bill-tab"        data-tab="Transport"     onclick="switchBillTab('Transport')">Transport</button>
//     <button class="bill-tab"        data-tab="Other"         onclick="switchBillTab('Other')">Other</button>
//   </div>
//
// Add-form company field (add after category select):
//   <div class="ff">
//     <label>Company / Provider</label>
//     <input type="text" id="billCompany" placeholder="e.g. Octopus Energy, Vodafone"/>
//   </div>
//
// CSS additions needed in your stylesheet:
//
//   .bill-stats-panel { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; margin-bottom:16px; }
//   .stat-card { background:var(--card); border-radius:10px; padding:14px; }
//   .stat-card.stat-alert { border:1px solid var(--neg,#e55); }
//   .stat-label { font-size:11px; color:var(--muted); margin-bottom:4px; }
//   .stat-value { font-size:18px; font-weight:700; }
//   .stat-sub   { font-size:11px; color:var(--muted); margin-top:2px; }
//   .upcoming-strip { background:var(--card); border-radius:10px; padding:12px 14px; margin-bottom:12px; }
//   .upcoming-header { font-size:11px; font-weight:600; color:var(--muted); margin-bottom:8px; }
//   .upcoming-list { display:flex; flex-direction:column; gap:6px; }
//   .upcoming-item { display:flex; justify-content:space-between; align-items:center; font-size:13px; }
//   .upcoming-badge { font-size:10px; font-weight:600; padding:2px 7px; border-radius:20px;
//                     background:var(--muted2,#555); color:#fff; }
//   .upcoming-badge.today { background:var(--neg,#e55); }
//   .bill-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
//   .bill-tab { padding:5px 12px; border-radius:20px; border:1px solid var(--border);
//               background:transparent; color:var(--muted); font-size:12px; cursor:pointer; }
//   .bill-tab.active { background:var(--accent); color:#fff; border-color:var(--accent); }
//   .bill-emoji { font-size:22px; line-height:1; flex-shrink:0; }