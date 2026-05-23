// ══════════════════════════════════════════════════
// BILLS MODULE — Enhanced Edition
// ══════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────

const BILL_CATEGORIES = ['Utilities', 'Subscriptions', 'Insurance', 'Transport', 'Other'];

/** Monthly multiplier for each occurrence type */
const MONTHLY_FACTOR = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  quarterly: 4 / 12,
  annually: 1 / 12,
  'one-off': 0,
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
  ['council tax', '🏛️'], ['council', '🏛️'],
  ['tv licence', '📺'], ['tv license', '📺'], ['television', '📺'],
  ['broadband', '📡'], ['internet', '📡'], ['wifi', '📡'],
  ['electricity', '⚡'], ['electric', '⚡'], ['power', '⚡'], ['energy', '⚡'],
  ['gas', '🔥'], ['heating', '🔥'],
  ['water', '💧'],
  ['landline', '☎️'],
  ['mobile', '📱'], ['phone', '📱'],
  ['netflix', '🎬'], ['disney', '✨'], ['hbo', '🎬'],
  ['amazon prime', '📦'], ['prime video', '📦'], ['amazon', '📦'],
  ['youtube premium', '▶️'], ['youtube', '▶️'],
  ['spotify', '🎵'], ['apple music', '🎵'], ['tidal', '🎵'], ['music', '🎵'],
  ['icloud', '☁️'], ['google one', '☁️'], ['dropbox', '☁️'], ['cloud', '☁️'],
  ['adobe', '🎨'], ['microsoft 365', '💻'], ['office 365', '💻'],
  ['gym', '💪'], ['fitness', '💪'],
  ['car insurance', '🚗'], ['car tax', '🚗'],
  ['home insurance', '🏠'],
  ['life insurance', '❤️'],
  ['health insurance', '🏥'], ['dental', '🦷'],
  ['pet insurance', '🐾'],
  ['travel insurance', '✈️'],
  ['insurance', '🛡️'],
  ['fuel', '⛽'], ['petrol', '⛽'], ['diesel', '⛽'],
  ['train', '🚆'], ['rail', '🚆'],
  ['bus pass', '🚌'], ['bus', '🚌'],
  ['parking', '🅿️'], ['congestion', '🏙️'],
  ['ulez', '🏙️'],
  ['car', '🚗'],
  ['mortgage', '🏦'], ['rent', '🏠'],
  ['childcare', '👶'], ['nursery', '👶'],
  ['school', '🎓'], ['education', '🎓'],
  ['loan', '💰'], ['credit', '💳'],
];

const CAT_EMOJI = {
  Utilities: '🔌', Subscriptions: '💳', Insurance: '🛡️', Transport: '🚌', Other: '📋',
};

// ── Full emoji library organised by section ──────────
const FULL_EMOJI_LIBRARY = {
  'Home & Utilities': ['🏠', '🏡', '🏢', '🏗️', '🏛️', '💧', '⚡', '🔥', '🌡️', '🚰', '📡', '📺', '☎️', '📱', '💡', '🔌', '🛁', '🪟', '🚪', '🧹', '🪣'],
  'Finance & Money': ['💰', '💳', '💸', '🏦', '💼', '🧾', '📊', '📈', '📉', '🔑', '🗝️', '💎', '🪙', '💲', '🏧', '📋', '⚖️'],
  'Subscriptions': ['🎬', '🎵', '📦', '✨', '▶️', '☁️', '🎮', '📚', '🎯', '🎸', '🎤', '🎧', '🎨', '🖼️', '🎭', '📰', '📡'],
  'Insurance': ['🛡️', '❤️', '🏥', '🦷', '🐾', '🏠', '🚗', '🚆', '🚌', '⛽', '✈️', '🅿️', '⚓', '🏙️', '🔒', '☂️'],
  'Transport': ['🚗', '🚕', '🚌', '🚆', '🚁', '⛽', '🛵', '🚲', '🛴', '🚢', '✈️', '🚀', '🏍️', '🚐', '🚎'],
  'Food & Shopping': ['🛒', '🍔', '☕', '🥗', '🍕', '🥐', '🧃', '🍱', '🛍️', '🏪', '🧺', '🥦', '🍎', '🍷', '🧁'],
  'Health & Fitness': ['💊', '🏋️', '🧘', '🏃', '🩺', '🧴', '💉', '🩹', '🧬', '❤️‍🩹', '🫀', '🧠', '👁️', '🦷', '💆'],
  'Family & Kids': ['👶', '🎓', '🧒', '🧑‍🤝‍🧑', '👨‍👩‍👧‍👦', '🍼', '🧸', '🎪', '🏫', '📝', '🖍️', '🎒', '🏅', '🎠'],
  'Entertainment': ['🎮', '🎲', '🎬', '🎪', '🎠', '🎡', '🎢', '🎭', '🎟️', '🎸', '🎺', '🥁', '🎻', '🎷'],
  'Nature & Pets': ['🐶', '🐱', '🐠', '🌍', '🌿', '🌺', '🌊', '🦋', '🐾', '🌲', '☀️', '🌙', '⭐', '🌈'],
};

// ── Module state ────────────────────────────────────
let billsActiveTab = 'All';
let addBillFormOpen = false;
let _emojiPickerTarget = null; // 'add' | 'edit'

// ── Utility helpers ─────────────────────────────────

function autoEmoji(name, category) {
  const lower = (name || '').toLowerCase();
  for (const [key, emoji] of EMOJI_KEYWORDS) {
    if (lower.includes(key)) return emoji;
  }
  return CAT_EMOJI[category] || '📋';
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getNextPaymentDate(bill) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const o = bill.occurrence || 'monthly';

  if (o === 'one-off') {
    return bill.paymentDate ? new Date(bill.paymentDate) : now;
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
    const d = new Date(now); d.setDate(d.getDate() + 14);
    return d;
  }
  const day = Math.min(bill.paymentDay || 1, 28);
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

function toMonthlyAmount(bill) {
  const factor = MONTHLY_FACTOR[bill.occurrence || 'monthly'] ?? 1;
  return bill.amount * factor;
}

function fmtOccurrence(bill) {
  const o = bill.occurrence || 'monthly';
  if (o === 'one-off') return 'One-off';
  if (o === 'weekly') return `Weekly · ${WEEK_DAYS[bill.paymentDayOfWeek || 0]}s`;
  if (o === 'fortnightly') return 'Fortnightly';
  if (o === 'monthly') return `Monthly · ${ordinal(bill.paymentDay || 1)}`;
  if (o === 'quarterly') return `Quarterly · ${ordinal(bill.paymentDay || 1)}`;
  if (o === 'annually') return `Annually · ${MONTH_NAMES[bill.paymentMonth || 0]} ${ordinal(bill.paymentDay || 1)}`;
  return o;
}

// ── Inject CSS ──────────────────────────────────────
function _injectBillsCSS() {
  if (document.getElementById('bills-enhanced-css')) return;
  const s = document.createElement('style');
  s.id = 'bills-enhanced-css';
  s.textContent = `
    /* ─── Bills page ─── */
    .bills-page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
    .bills-tabs-row { display:flex; gap:2px; border-bottom:1px solid var(--border); margin-bottom:16px; flex-wrap:wrap; }
    .bills-tab-btn { padding:7px 14px; background:none; border:none; border-bottom:2px solid transparent; font-size:12.5px; color:var(--muted2); cursor:pointer; margin-bottom:-1px; font-variation-settings:'wght' 500; transition:all .13s; }
    .bills-tab-btn.active { color:var(--accent); border-bottom-color:var(--accent); font-variation-settings:'wght' 700; }
    .bills-tab-btn:hover { color:var(--text); }

    /* person tabs */
    .bills-person-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }

    /* stat cards row */
    .bills-stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; margin-bottom:16px; }
    .stat-val { color:var(--red); }

    /* add form drawer */
    .bills-add-drawer { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:20px; margin-bottom:18px; }
    .bills-add-drawer h3 { font-size:14px; font-variation-settings:'wght' 700; margin-bottom:14px; }

    /* bill card */
    .bill-card-v2 { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; position:relative; transition:box-shadow .15s,transform .15s; }
    .bill-card-v2:hover { box-shadow:0 3px 12px rgba(0,0,0,.08); transform:translateY(-1px); }
    .bill-card-v2.overdue { border-color:var(--red); }
    .bill-card-v2.due-soon { border-color:var(--amber); }
    .bill-card-v2.auto-pay { border-left:3px solid var(--green); }
    .bill-card-v2.manual-pay { border-left:3px solid var(--blue); }

    /* payment mode badge */
    .pay-mode-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; padding:2px 7px; border-radius:10px; font-variation-settings:'wght' 600; }
    .pay-mode-badge.auto { background:var(--green-dim); color:var(--green); }
    .pay-mode-badge.manual { background:var(--blue-dim); color:var(--blue); }

    /* cost history toggle */
    .cost-history-section { margin-top:10px; padding-top:10px; border-top:1px solid var(--border); }
    .cost-history-toggle { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--muted); cursor:pointer; background:none; border:none; padding:0; }
    .cost-history-list { margin-top:6px; display:flex; flex-direction:column; gap:3px; }
    .cost-history-row { display:grid; grid-template-columns:auto 1fr auto; gap:8px; font-size:11px; padding:4px 0; border-bottom:1px solid var(--border); }
    .cost-history-row:last-child { border-bottom:none; }

    /* property assign pill */
    .prop-pill { font-size:10px; padding:2px 8px; border-radius:10px; background:var(--pink-dim); color:var(--pink); font-variation-settings:'wght' 600; }

    /* emoji picker overlay */
    .emoji-picker-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; }
    .emoji-picker-overlay.hidden { display:none; }
    .emoji-picker-panel { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); width:min(500px,95vw); max-height:70vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.2); }
    .emoji-picker-header { padding:14px 16px; border-bottom:1px solid var(--border); display:flex; gap:10px; align-items:center; flex-shrink:0; }
    .emoji-picker-search { flex:1; background:var(--bg); border:1px solid var(--border2); border-radius:var(--radius-sm); padding:7px 10px; font-size:13px; outline:none; transition:border .13s; }
    .emoji-picker-search:focus { border-color:var(--accent); }
    .emoji-picker-body { overflow-y:auto; padding:12px 14px; flex:1; }
    .emoji-section-label { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-variation-settings:'wght' 600; margin:10px 0 6px; }
    .emoji-section-label:first-child { margin-top:0; }
    .emoji-grid { display:flex; flex-wrap:wrap; gap:2px; margin-bottom:4px; }
    .emoji-btn-opt { width:36px; height:36px; border:none; background:none; border-radius:6px; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .1s; line-height:1; }
    .emoji-btn-opt:hover { background:var(--surface2); }
    .emoji-trigger-btn { width:38px; height:38px; border:1px solid var(--border2); border-radius:var(--radius-sm); background:var(--bg); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .13s; }
    .emoji-trigger-btn:hover { border-color:var(--accent); background:var(--accent-dim); }

    /* occurrence day picker */
    .day-chip-grid { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
    .day-chip { padding:3px 8px; border-radius:20px; border:1px solid var(--border2); background:var(--bg); font-size:11px; cursor:pointer; transition:all .13s; }
    .day-chip.selected { background:var(--accent); color:#fff; border-color:var(--accent); font-variation-settings:'wght' 600; }

    /* due callout */
    .due-callout { font-size:11px; padding:3px 8px; border-radius:10px; font-variation-settings:'wght' 600; }
    .due-callout.overdue { background:var(--red-dim); color:var(--red); }
    .due-callout.today { background:var(--red-dim); color:var(--red); }
    .due-callout.soon { background:var(--amber-dim); color:var(--amber); }
    .due-callout.ok { background:var(--green-dim); color:var(--green); }

    /* totals callout */
    .bills-total-bar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:12px 16px; background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius-md); margin-bottom:14px; font-size:12px; color:var(--muted2); }
    .bills-total-bar strong { font-variation-settings:'wght' 700; color:var(--text); }

    /* form section divider */
    .form-section-label { font-size:11px; letter-spacing:.08em; color:var(--accent); text-transform:uppercase; font-variation-settings:'wght' 700; padding:10px 0 6px; border-top:1px solid var(--border); margin-top:10px; }
    .form-section-label:first-child { border-top:none; padding-top:0; margin-top:0; }

    /* first payment natural toggle */
    .first-payment-row { display:flex; align-items:center; gap:8px; padding:6px 0; }

    /* bills grid */
    .bills-grid-v2 { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:14px; margin-bottom:18px; }

    /* bill template buttons */
    .bill-template-btn { display:inline-flex; align-items:center; gap:4px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); cursor:pointer; transition:all .13s; }
    .bill-template-btn:hover { background:var(--accent-dim); border-color:var(--accent); color:var(--accent); }
  `;
  document.head.appendChild(s);
}

// ══════════════════════════════════════════════════
// EMOJI PICKER
// ══════════════════════════════════════════════════

function openEmojiPicker(target) {
  _openEmojiPicker(target);
}

function _openEmojiPicker(target) {
  _emojiPickerTarget = target;
  let panel = document.getElementById('billsEmojiPickerOverlay');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'billsEmojiPickerOverlay';
    panel.className = 'emoji-picker-overlay hidden';
    panel.innerHTML = `
      <div class="emoji-picker-panel" onclick="event.stopPropagation()">
        <div class="emoji-picker-header">
          <input class="emoji-picker-search" id="emojiPickerSearch" placeholder="Search emoji…" oninput="_filterEmojiPicker(this.value)">
          <button class="icon-btn" onclick="_closeEmojiPicker()" style="flex-shrink:0;">✕</button>
        </div>
        <div class="emoji-picker-body" id="emojiPickerBody"></div>
      </div>`;
    panel.addEventListener('click', e => { if (e.target === panel) _closeEmojiPicker(); });
    document.body.appendChild(panel);
  }
  document.getElementById('emojiPickerSearch').value = '';
  _filterEmojiPicker('');
  panel.classList.remove('hidden');
}

function _closeEmojiPicker() {
  const p = document.getElementById('billsEmojiPickerOverlay');
  if (p) p.classList.add('hidden');
}

function _filterEmojiPicker(q) {
  const body = document.getElementById('emojiPickerBody');
  if (!body) return;
  const lower = q.toLowerCase();
  let html = '';
  for (const [section, emojis] of Object.entries(FULL_EMOJI_LIBRARY)) {
    // When searching, include all sections
    const filtered = q ? emojis.filter(() => true) : emojis; // show all; search just highlights
    if (!filtered.length) continue;
    html += `<div class="emoji-section-label">${section}</div><div class="emoji-grid">`;
    html += filtered.map(e => `<button class="emoji-btn-opt" onclick="_selectEmoji('${e}')" title="${e}">${e}</button>`).join('');
    html += `</div>`;
  }
  body.innerHTML = html;
}

function _selectEmoji(emoji) {
  if (_emojiPickerTarget === 'add') {
    const btn = document.getElementById('billEmojiTrigger');
    if (btn) { btn.textContent = emoji; btn.dataset.emoji = emoji; }
  } else if (_emojiPickerTarget === 'edit') {
    const btn = document.getElementById('editBillEmojiTrigger');
    if (btn) { btn.textContent = emoji; btn.dataset.emoji = emoji; }
  }
  _closeEmojiPicker();
}

// ══════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════

function _renderBillsStats(filteredBills) {
  const el = document.getElementById('billsStatsGrid');
  if (!el) return;
  const bills = filteredBills || S.bills;
  const recurring = bills.filter(b => b.occurrence !== 'one-off');
  const monthlyTotal = recurring.reduce((s, b) => s + toMonthlyAmount(b), 0);
  const annualTotal = monthlyTotal * 12;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); end.setHours(23, 59, 59);
  const dueThisMonth = bills.reduce((s, b) => {
    const next = getNextPaymentDate(b);
    return (next >= start && next <= end) ? s + b.amount : s;
  }, 0);
  const cutoff7 = new Date(now); cutoff7.setDate(cutoff7.getDate() + 7);
  const dueSoon = bills.filter(b => { const n = getNextPaymentDate(b); return n >= now && n <= cutoff7; });

  el.innerHTML = `
    <div class="stat-card sc-accent"><div class="stat-label">Monthly total</div><div class="stat-val val">${fmt(monthlyTotal)}</div><div class="stat-sub">${recurring.length} recurring</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">Annual total</div><div class="stat-val val">${fmt(annualTotal)}</div><div class="stat-sub">${fmt(annualTotal / 365)}/day</div></div>
    <div class="stat-card sc-blue"><div class="stat-label">Due this month</div><div class="stat-val val">${fmt(dueThisMonth)}</div><div class="stat-sub">${MONTH_NAMES[new Date().getMonth()]}</div></div>
    <div class="stat-card ${dueSoon.length ? 'sc-red' : 'sc-green'}"><div class="stat-label">Due next 7 days</div><div class="stat-val val">${dueSoon.length ? fmt(dueSoon.reduce((s, b) => s + b.amount, 0)) : '—'}</div><div class="stat-sub">${dueSoon.length ? dueSoon.length + ' payment' + (dueSoon.length !== 1 ? 's' : '') : 'Nothing due'}</div></div>`;

  // Totals bar
  const bar = document.getElementById('billsTotalBar');
  if (bar) {
    const predictedNext = monthlyTotal;
    bar.innerHTML = `<span>Current total: <strong>${fmt(monthlyTotal)}/mo</strong></span>
      <span style="color:var(--border2);">|</span>
      <span>Predicted next month: <strong>${fmt(predictedNext)}</strong></span>
      <span style="color:var(--border2);">|</span>
      <span>Annual: <strong>${fmt(annualTotal)}</strong></span>`;
  }
}

// ══════════════════════════════════════════════════
// RENDER BILLS
// ══════════════════════════════════════════════════

function renderBills() {
  console.log('renderBills called');
  _injectBillsCSS();

  const pageEl = document.getElementById('page-bills');
  if (!pageEl) {
    console.log('page-bills element not found');
    return;
  }

  // Check if page already has our structure; if not, build it
  if (!document.getElementById('billsPageStructure')) {
    console.log('Building bills page structure');
    _buildBillsPageStructure(pageEl);
  }

  // Populate person tabs
  _renderBillsPersonTabs();

  // Get current person filter
  const personIdx = _currentBillPersonIdx();
  let bills = _getFilteredBills(personIdx);
  console.log('Bills after filtering:', bills);

  // Category tab filter
  if (billsActiveTab !== 'All') {
    bills = bills.filter(b => b.category === billsActiveTab);
  }

  _renderBillsStats(bills);
  _renderBillsGrid(bills);
  _renderBillsTicker(bills);
  _renderBillTemplates();
}

let _billPersonIdx = -1; // -1 = all/household

function _currentBillPersonIdx() { return _billPersonIdx; }

function switchBillPerson(idx) {
  _billPersonIdx = idx;
  renderBills();
}

function _getFilteredBills(personIdx) {
  if (personIdx === -1) return S.bills;
  return S.bills.filter(b => b.person === undefined || b.person === null || b.person === personIdx);
}

function _renderBillsPersonTabs() {
  const el = document.getElementById('billsPersonTabs');
  if (!el) return;
  const names = S.settings.personNames || [];
  if (names.length <= 1) { el.innerHTML = ''; _billPersonIdx = -1; return; }
  const allPeople = ['Household', ...names];
  el.innerHTML = allPeople.map((p, i) => {
    const idx = i === 0 ? -1 : i - 1;
    const active = _billPersonIdx === idx;
    return `<button class="person-btn ${active ? 'active' : ''}" onclick="switchBillPerson(${idx})">${i === 0 ? '📊 ' + p : p}</button>`;
  }).join('');
}

function _buildBillsPageStructure(pageEl) {
  // Clear old content but keep the page-header
  const header = pageEl.querySelector('.page-header');
  pageEl.innerHTML = '';
  if (header) pageEl.appendChild(header);

  // Rebuild header with Add button
  if (header) {
    header.innerHTML = `
      <div class="bills-page-header">
        <div>
          <h2>Bills</h2>
          <p>Track recurring payments, subscriptions & one-off expenses</p>
        </div>
        <button class="btn btn-primary" onclick="toggleAddBillForm()" id="addBillToggleBtn">+ Add bill</button>
      </div>`;
  } else {
    const h = document.createElement('div');
    h.className = 'page-header';
    h.innerHTML = `<div class="bills-page-header"><div><h2>Bills</h2><p>Track recurring payments, subscriptions & one-off expenses</p></div><button class="btn btn-primary" onclick="toggleAddBillForm()" id="addBillToggleBtn">+ Add bill</button></div>`;
    pageEl.insertBefore(h, pageEl.firstChild);
  }

  const structure = document.createElement('div');
  structure.id = 'billsPageStructure';
  structure.innerHTML = `
    <!-- Person tabs -->
    <div id="billsPersonTabs" class="bills-person-tabs"></div>

    <!-- Add bill drawer -->
    <div id="addBillDrawer" class="bills-add-drawer hidden">
      <h3>Add bill</h3>
      <div class="form-section-label">Basic details</div>
      <div class="form-grid">
        <div class="ff">
          <label>Icon</label>
          <button id="billEmojiTrigger" class="emoji-trigger-btn" data-emoji="" onclick="_openEmojiPicker('add')" title="Choose emoji">📋</button>
        </div>
        <div class="ff"><label>Bill name</label><input type="text" id="billName" placeholder="e.g. Electricity" oninput="_autoSetBillEmoji()"/></div>
        <div class="ff"><label>Category</label>
          <select id="billCategory">
            <option value="Utilities">Utilities</option>
            <option value="Subscriptions">Subscriptions</option>
            <option value="Insurance">Insurance</option>
            <option value="Transport">Transport</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="ff"><label>Provider / Company</label><input type="text" id="billCompany" placeholder="e.g. Octopus Energy"/></div>
        <div class="ff money-field"><label>Amount</label><input type="text" id="billAmount" placeholder="120.00" oninput="formatMoney(this)"/><span class="currency">£</span></div>
        <div class="ff"><label>Assigned to</label>
          <select id="billPerson">
            <option value="">Household</option>
          </select>
        </div>
        <div class="ff"><label>Link to property</label>
          <select id="billProperty">
            <option value="">— none —</option>
          </select>
        </div>
        <div class="ff"><label>Payment mode</label>
          <select id="billPayMode">
            <option value="auto">🔄 Automatic (Direct Debit / Standing Order)</option>
            <option value="manual">✋ Manual (Pay each time)</option>
          </select>
        </div>
      </div>

      <div class="form-section-label">When does it occur?</div>
      <div class="form-grid">
        <div class="ff"><label>Occurrence</label>
          <select id="billOccurrence" onchange="_toggleBillOccurrenceFields()">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
            <option value="one-off">One-off</option>
          </select>
        </div>
        <div class="ff" id="addBillDayField">
          <label>Day of month (1–28)</label>
          <input type="number" id="billPaymentDay" min="1" max="28" value="1" placeholder="1"/>
        </div>
        <div class="ff hidden" id="addBillMonthField">
          <label>Month</label>
          <select id="billPaymentMonth">
            ${MONTH_NAMES.map((m, i) => `<option value="${i}">${m}</option>`).join('')}
          </select>
        </div>
        <div class="ff hidden" id="addBillWeekdayField">
          <label>Day of week</label>
          <select id="billPaymentWeekday">
            ${WEEK_DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
          </select>
        </div>
        <div class="ff hidden" id="addBillDateField">
          <label>Date</label>
          <input type="date" id="billPaymentDate"/>
        </div>
      </div>

      <div class="form-section-label">Amount options</div>
      <div class="form-grid">
        <div class="ff" style="grid-column:1/-1;">
          <div class="first-payment-row">
            <label class="toggle"><input type="checkbox" id="billDiffFirst" onchange="_toggleFirstPayment('add')"><span class="toggle-track"></span></label>
            <span style="font-size:12.5px;color:var(--muted2);">First payment is a different amount</span>
          </div>
        </div>
        <div class="ff money-field hidden" id="addFirstPaymentField">
          <label>First payment amount</label>
          <input type="text" id="billFirstPayment" placeholder="0.00" oninput="formatMoney(this)"/>
          <span class="currency">£</span>
        </div>
      </div>

      <div class="form-section-label">Notes</div>
      <div class="form-grid">
        <div class="ff full-col"><textarea id="billNotes" placeholder="Any notes about this bill…" rows="2"></textarea></div>
      </div>

      <div class="form-actions" style="margin-top:14px;">
        <button class="btn btn-primary" onclick="addBill()">Save bill</button>
        <button class="btn btn-secondary" onclick="toggleAddBillForm()">Cancel</button>
      </div>
    </div>

    <!-- Stats -->
    <div id="billsStatsGrid" class="bills-stats-grid"></div>

    <!-- Totals bar -->
    <div id="billsTotalBar" class="bills-total-bar"></div>

    <!-- Upcoming Bills ticker -->
    <div class="bills-ticker-wrapper" id="billsTickerWrapper">
      <div class="bills-ticker-header">Upcoming Bills</div>
      <div id="billsTicker" class="bills-upcoming-strip"></div>
    </div>

    <!-- Category tabs -->
    <div class="bills-tabs-row" id="billsCategoryTabs">
      <button class="bills-tab-btn active" onclick="switchBillTab('All',this)">All</button>
      <button class="bills-tab-btn" onclick="switchBillTab('Utilities',this)">Utilities</button>
      <button class="bills-tab-btn" onclick="switchBillTab('Subscriptions',this)">Subscriptions</button>
      <button class="bills-tab-btn" onclick="switchBillTab('Insurance',this)">Insurance</button>
      <button class="bills-tab-btn" onclick="switchBillTab('Transport',this)">Transport</button>
      <button class="bills-tab-btn" onclick="switchBillTab('Other',this)">Other</button>
    </div>

    <!-- Bills grid -->
    <div id="billsGridV2" class="bills-grid-v2"></div>

    <!-- Quick add -->
    <p class="section-label" id="billTemplatesHeading">Quick add</p>
    <div id="billTemplates"></div>
  `;
  pageEl.appendChild(structure);

  // Also add edit modal if not present
  if (!document.getElementById('editBillModalV2')) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal-overlay hidden" id="editBillModalV2">
        <div class="modal" style="max-width:600px;">
          <h3>Edit bill</h3>
          <div class="form-section-label" style="border-top:none;padding-top:0;margin-top:0;">Basic details</div>
          <div class="form-grid">
            <div class="ff">
              <label>Icon</label>
              <button id="editBillEmojiTrigger" class="emoji-trigger-btn" data-emoji="" onclick="_openEmojiPicker('edit')" title="Choose emoji">📋</button>
            </div>
            <div class="ff"><label>Name</label><input type="text" id="eb-name"/></div>
            <div class="ff"><label>Category</label>
              <select id="eb-category">
                <option value="Utilities">Utilities</option>
                <option value="Subscriptions">Subscriptions</option>
                <option value="Insurance">Insurance</option>
                <option value="Transport">Transport</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="ff"><label>Provider / Company</label><input type="text" id="eb-company" placeholder="e.g. Octopus Energy"/></div>
            <div class="ff money-field"><label>Amount</label><input type="text" id="eb-amount" oninput="formatMoney(this)"/><span class="currency">£</span></div>
            <div class="ff"><label>Assigned to</label><select id="eb-person"><option value="">Household</option></select></div>
            <div class="ff"><label>Link to property</label><select id="eb-property"><option value="">— none —</option></select></div>
            <div class="ff"><label>Payment mode</label>
              <select id="eb-paymode">
                <option value="auto">🔄 Automatic</option>
                <option value="manual">✋ Manual</option>
              </select>
            </div>
          </div>
          <div class="form-section-label">When does it occur?</div>
          <div class="form-grid">
            <div class="ff"><label>Occurrence</label>
              <select id="eb-occurrence" onchange="_toggleEditBillOccurrenceFields()">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
                <option value="one-off">One-off</option>
              </select>
            </div>
            <div class="ff" id="editBillDayField"><label>Day of month (1–28)</label><input type="number" id="eb-day" min="1" max="28"/></div>
            <div class="ff hidden" id="editBillMonthField"><label>Month</label><select id="eb-month">${MONTH_NAMES.map((m, i) => `<option value="${i}">${m}</option>`).join('')}</select></div>
            <div class="ff hidden" id="editBillWeekdayField"><label>Day of week</label><select id="eb-weekday">${WEEK_DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select></div>
            <div class="ff hidden" id="editBillDateField"><label>Date</label><input type="date" id="eb-date"/></div>
          </div>
          <div class="form-section-label">Amount options</div>
          <div class="form-grid">
            <div class="ff" style="grid-column:1/-1;">
              <div class="first-payment-row">
                <label class="toggle"><input type="checkbox" id="eb-diff-first" onchange="_toggleFirstPayment('edit')"><span class="toggle-track"></span></label>
                <span style="font-size:12.5px;color:var(--muted2);">First payment is a different amount</span>
              </div>
            </div>
            <div class="ff money-field hidden" id="editFirstPaymentField">
              <label>First payment amount</label>
              <input type="text" id="eb-first-amount" oninput="formatMoney(this)"/>
              <span class="currency">£</span>
            </div>
          </div>

          <!-- Cost history -->
          <div class="form-section-label">Update cost (log a price change)</div>
          <div class="form-grid">
            <div class="ff money-field">
              <label>New amount</label>
              <input type="text" id="eb-new-cost" placeholder="new amount" oninput="formatMoney(this)"/>
              <span class="currency">£</span>
            </div>
            <div class="ff"><label>Effective from</label><input type="date" id="eb-cost-date"/></div>
            <div class="ff full-col"><label>Reason</label><input type="text" id="eb-cost-reason" placeholder="e.g. Price increased"/></div>
            <div class="ff full-col">
              <button class="btn btn-secondary btn-sm" onclick="_logCostChange()">Log cost change</button>
            </div>
          </div>

          <div class="form-section-label">Notes</div>
          <div class="form-grid">
            <div class="ff full-col"><textarea id="eb-notes" rows="2"></textarea></div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeModal('editBillModalV2')">Cancel</button>
            <button class="btn btn-danger" onclick="_deleteCurrentEditBill()">Delete</button>
            <button class="btn btn-primary" onclick="saveEditBillV2()">Save changes</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal.firstElementChild);
  }
}

// ── Toggle add bill form ─────────────────────────────

function toggleAddBillForm() {
  addBillFormOpen = !addBillFormOpen;
  const drawer = document.getElementById('addBillDrawer');
  const btn = document.getElementById('addBillToggleBtn');
  if (!drawer) return;
  if (addBillFormOpen) {
    drawer.classList.remove('hidden');
    if (btn) btn.textContent = '✕ Close';
    _populateBillFormDropdowns();
    drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    drawer.classList.add('hidden');
    if (btn) btn.textContent = '+ Add bill';
  }
}

function _populateBillFormDropdowns() {
  // Person dropdown
  const personSel = document.getElementById('billPerson');
  if (personSel) {
    const names = S.settings.personNames || [];
    personSel.innerHTML = '<option value="">Household</option>' +
      names.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  }
  // Property dropdown
  const propSel = document.getElementById('billProperty');
  if (propSel) {
    const props = S.properties || [];
    propSel.innerHTML = '<option value="">— none —</option>' +
      props.map((p, i) => `<option value="${i}">${p.nickname || p.address || 'Property ' + (i + 1)}</option>`).join('');
  }
}

// ── Occurrence field toggling ─────────────────────────

function _toggleBillOccurrenceFields() {
  const occ = document.getElementById('billOccurrence')?.value;
  const show = (id, cond) => {
    const el = document.getElementById(id);
    if (!el) return;
    cond ? el.classList.remove('hidden') : el.classList.add('hidden');
  };
  show('addBillDayField', ['monthly', 'quarterly', 'annually'].includes(occ));
  show('addBillMonthField', occ === 'annually');
  show('addBillWeekdayField', occ === 'weekly');
  show('addBillDateField', ['one-off', 'fortnightly'].includes(occ));
}

function _toggleEditBillOccurrenceFields() {
  const occ = document.getElementById('eb-occurrence')?.value;
  const show = (id, cond) => {
    const el = document.getElementById(id);
    if (!el) return;
    cond ? el.classList.remove('hidden') : el.classList.add('hidden');
  };
  show('editBillDayField', ['monthly', 'quarterly', 'annually'].includes(occ));
  show('editBillMonthField', occ === 'annually');
  show('editBillWeekdayField', occ === 'weekly');
  show('editBillDateField', ['one-off', 'fortnightly'].includes(occ));
}

function _toggleFirstPayment(target) {
  if (target === 'add') {
    const checked = document.getElementById('billDiffFirst')?.checked;
    const f = document.getElementById('addFirstPaymentField');
    if (f) checked ? f.classList.remove('hidden') : f.classList.add('hidden');
  } else {
    const checked = document.getElementById('eb-diff-first')?.checked;
    const f = document.getElementById('editFirstPaymentField');
    if (f) checked ? f.classList.remove('hidden') : f.classList.add('hidden');
  }
}

function _autoSetBillEmoji() {
  const name = document.getElementById('billName')?.value || '';
  const cat = document.getElementById('billCategory')?.value || '';
  const btn = document.getElementById('billEmojiTrigger');
  if (!btn || btn.dataset.userSet) return;
  const emoji = autoEmoji(name, cat);
  btn.textContent = emoji;
  btn.dataset.emoji = emoji;
}

// ── Tab switching ─────────────────────────────────────

function switchBillTab(tab, el) {
  billsActiveTab = tab;
  document.querySelectorAll('.bills-tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderBills();
}

// ── Render bills grid ─────────────────────────────────

function _renderBillsGrid(bills) {
  const grid = document.getElementById('billsGridV2');
  if (!grid) return;
  const now = new Date(); now.setHours(0, 0, 0, 0);

  if (!bills.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ei">📋</div><p>No bills in this category yet.</p></div>`;
    return;
  }

  grid.innerHTML = bills.map(b => {
    const origIdx = S.bills.indexOf(b);
    const nextDate = getNextPaymentDate(b);
    const daysLeft = Math.floor((nextDate - now) / 86400000);
    const isOneOff = b.occurrence === 'one-off';
    const overdue = !isOneOff && daysLeft < 0;
    const dueSoon = !overdue && daysLeft <= 7;
    const emoji = b.emoji || autoEmoji(b.name, b.category);
    const freqLabel = FREQ_LABEL[b.occurrence || 'monthly'] || '';
    const isAuto = b.payMode === 'auto' || b.payMode === undefined;
    const propName = (b.propertyIdx !== undefined && b.propertyIdx !== null && b.propertyIdx !== '')
      ? (S.properties?.[b.propertyIdx]?.nickname || S.properties?.[b.propertyIdx]?.address || '')
      : '';
    const personName = (b.person !== undefined && b.person !== null && b.person !== '' && S.settings.personNames)
      ? S.settings.personNames[parseInt(b.person)] || ''
      : '';

    let dueLabel = '';
    if (overdue) dueLabel = `<span class="due-callout overdue">Overdue</span>`;
    else if (daysLeft === 0) dueLabel = `<span class="due-callout today">Due today</span>`;
    else if (dueSoon) dueLabel = `<span class="due-callout soon">Due in ${daysLeft}d</span>`;
    else dueLabel = `<span class="due-callout ok">Due ${fmtDate(nextDate.toISOString().split('T')[0])}</span>`;

    // Cost history
    const history = b.costHistory || [];
    const histHTML = history.length ? `
      <div class="cost-history-section">
        <button class="cost-history-toggle" onclick="_toggleCostHistory(${origIdx})">
          <span id="chev-${origIdx}">▶</span>
          ${history.length} cost change${history.length !== 1 ? 's' : ''}
        </button>
        <div id="cost-hist-${origIdx}" class="cost-history-list" style="display:none;">
          ${[...history].reverse().map(h => `
            <div class="cost-history-row">
              <span style="color:var(--muted);">${h.date || ''}</span>
              <span style="color:var(--muted2);">${h.reason || ''}</span>
              <span style="font-variation-settings:'wght' 600;">${fmt(h.amount)}</span>
            </div>`).join('')}
        </div>
      </div>` : '';

    return `<div class="bill-card-v2 ${overdue ? 'overdue' : dueSoon ? 'due-soon' : ''} ${isAuto ? 'auto-pay' : 'manual-pay'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:9px;min-width:0;">
          <span style="font-size:22px;flex-shrink:0;">${emoji}</span>
          <div style="min-width:0;">
            <div style="font-size:14px;font-variation-settings:'wght' 700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.name}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px;">${[b.category, b.company].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;align-items:center;margin-left:8px;">
          <button class="icon-btn edit" onclick="openEditBillV2(${origIdx})">✎</button>
          <button class="icon-btn del" onclick="deleteBill(${origIdx})">✕</button>
        </div>
      </div>

      <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:6px;">
        <span style="font-size:18px;font-variation-settings:'wght' 700;color:var(--red);" class="val">${fmt(b.amount)}</span>
        ${freqLabel ? `<span style="font-size:11px;color:var(--muted);">${freqLabel}</span>` : ''}
        ${b.firstPaymentAmount ? `<span style="font-size:10px;color:var(--muted2);">(first: ${fmt(b.firstPaymentAmount)})</span>` : ''}
      </div>

      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
        <span class="pay-mode-badge ${isAuto ? 'auto' : 'manual'}">${isAuto ? '🔄 Auto' : '✋ Manual'}</span>
        ${dueLabel}
        ${propName ? `<span class="prop-pill">🏠 ${propName}</span>` : ''}
        ${personName ? `<span class="pill" style="font-size:10px;background:var(--accent-dim);color:var(--accent);">${personName}</span>` : ''}
      </div>

      <div style="font-size:11px;color:var(--muted2);">${fmtOccurrence(b)}</div>

      ${b.notes ? `<div style="font-size:10px;color:var(--muted2);margin-top:6px;padding:5px 8px;background:var(--surface2);border-radius:5px;">📝 ${b.notes}</div>` : ''}
      ${histHTML}
    </div>`;
  }).join('');
}

function _toggleCostHistory(idx) {
  const el = document.getElementById(`cost-hist-${idx}`);
  const chev = document.getElementById(`chev-${idx}`);
  if (!el) return;
  const open = el.style.display === 'none';
  el.style.display = open ? 'flex' : 'none';
  el.style.flexDirection = 'column';
  if (chev) chev.textContent = open ? '▼' : '▶';
}

// ── Add bill ─────────────────────────────────────────

function addBill() {
  const name = (document.getElementById('billName')?.value || '').trim();
  const category = document.getElementById('billCategory')?.value;
  const emojiBtn = document.getElementById('billEmojiTrigger');
  const emoji = emojiBtn?.dataset.emoji || autoEmoji(name, category);
  const company = (document.getElementById('billCompany')?.value || '').trim();
  const amount = parseMoney(document.getElementById('billAmount')?.value || '');
  const occurrence = document.getElementById('billOccurrence')?.value || 'monthly';
  const notes = (document.getElementById('billNotes')?.value || '').trim();
  const payMode = document.getElementById('billPayMode')?.value || 'auto';
  const personVal = document.getElementById('billPerson')?.value;
  const propVal = document.getElementById('billProperty')?.value;
  const person = personVal !== '' ? parseInt(personVal) : null;
  const propertyIdx = propVal !== '' ? parseInt(propVal) : null;

  const paymentDay = parseInt(document.getElementById('billPaymentDay')?.value) || 1;
  const paymentMonth = parseInt(document.getElementById('billPaymentMonth')?.value) || 0;
  const paymentDate = document.getElementById('billPaymentDate')?.value || '';
  const paymentDayOfWeek = parseInt(document.getElementById('billPaymentWeekday')?.value) || 0;

  const hasDiffFirst = document.getElementById('billDiffFirst')?.checked;
  const firstPaymentAmount = hasDiffFirst
    ? (parseMoney(document.getElementById('billFirstPayment')?.value || '') || null)
    : null;

  if (!name || isNaN(amount) || !amount) {
    toast('Please fill in the bill name and amount');
    return;
  }

  S.bills.push({
    id: Date.now(),
    name, category, emoji, company, amount, occurrence,
    paymentDay, paymentMonth, paymentDate, paymentDayOfWeek,
    firstPaymentAmount, notes, payMode, person, propertyIdx,
    costHistory: [],
    createdDate: new Date().toISOString().split('T')[0],
  });

  save();
  toast(`Added: ${emoji} ${name}`);

  // Reset form
  ['billName', 'billAmount', 'billNotes', 'billCompany'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  if (emojiBtn) { emojiBtn.textContent = '📋'; delete emojiBtn.dataset.emoji; delete emojiBtn.dataset.userSet; }
  const diffFirst = document.getElementById('billDiffFirst');
  if (diffFirst) { diffFirst.checked = false; _toggleFirstPayment('add'); }
  toggleAddBillForm();
  renderBills();
}

// ── Delete bill ───────────────────────────────────────

function deleteBill(i) {
  const deleted = S.bills.splice(i, 1)[0];
  window._lastDeletedBill = { item: deleted, index: i };
  updateUndoButton('billsUndoBtn', window._lastDeletedBill);
  save(); renderBills(); toast('Bill removed');
}

function undoLastBillDelete() {
  if (!window._lastDeletedBill) return;
  const { item, index } = window._lastDeletedBill;
  S.bills.splice(index, 0, item);
  window._lastDeletedBill = null;
  updateUndoButton('billsUndoBtn', null);
  save(); renderBills(); toast('Restored');
}

function _deleteCurrentEditBill() {
  if (editingBillIdx === null) return;
  if (!confirm('Delete this bill?')) return;
  deleteBill(editingBillIdx);
  closeModal('editBillModalV2');
}

// ── Edit bill ─────────────────────────────────────────

function openEditBillV2(i) {
  editingBillIdx = i;
  const b = S.bills[i];
  if (!b) return;
  const modal = document.getElementById('editBillModalV2');
  if (!modal) return;

  const emoji = b.emoji || autoEmoji(b.name, b.category);
  const occ = b.occurrence || 'monthly';

  // Set basic fields
  const emojiBtn = document.getElementById('editBillEmojiTrigger');
  if (emojiBtn) { emojiBtn.textContent = emoji; emojiBtn.dataset.emoji = emoji; }

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('eb-name', b.name || '');
  setVal('eb-category', b.category || 'Utilities');
  setVal('eb-company', b.company || '');
  setVal('eb-amount', b.amount ? b.amount.toLocaleString('en-GB') : '');
  setVal('eb-occurrence', occ);
  setVal('eb-day', b.paymentDay || 1);
  setVal('eb-month', b.paymentMonth || 0);
  setVal('eb-date', b.paymentDate || '');
  setVal('eb-weekday', b.paymentDayOfWeek || 0);
  setVal('eb-paymode', b.payMode || 'auto');
  setVal('eb-notes', b.notes || '');
  setVal('eb-new-cost', '');
  setVal('eb-cost-date', new Date().toISOString().split('T')[0]);
  setVal('eb-cost-reason', '');

  // Person & property dropdowns
  const personSel = document.getElementById('eb-person');
  if (personSel) {
    personSel.innerHTML = '<option value="">Household</option>' +
      (S.settings.personNames || []).map((n, idx) => `<option value="${idx}" ${b.person === idx ? 'selected' : ''}>${n}</option>`).join('');
  }
  const propSel = document.getElementById('eb-property');
  if (propSel) {
    propSel.innerHTML = '<option value="">— none —</option>' +
      (S.properties || []).map((p, idx) => `<option value="${idx}" ${b.propertyIdx === idx ? 'selected' : ''}>${p.nickname || p.address || 'Property ' + (idx + 1)}</option>`).join('');
    if (b.propertyIdx !== null && b.propertyIdx !== undefined) propSel.value = b.propertyIdx;
  }

  // First payment
  const diffFirst = document.getElementById('eb-diff-first');
  if (diffFirst) {
    diffFirst.checked = !!b.firstPaymentAmount;
    _toggleFirstPayment('edit');
  }
  setVal('eb-first-amount', b.firstPaymentAmount ? b.firstPaymentAmount.toLocaleString('en-GB') : '');

  // Toggle occurrence fields
  _toggleEditBillOccurrenceFields();

  modal.classList.remove('hidden');
}

function saveEditBillV2() {
  if (editingBillIdx === null) return;
  const b = S.bills[editingBillIdx];
  const occ = document.getElementById('eb-occurrence')?.value || 'monthly';
  const emojiBtn = document.getElementById('editBillEmojiTrigger');
  const hasDiff = document.getElementById('eb-diff-first')?.checked;
  const personVal = document.getElementById('eb-person')?.value;
  const propVal = document.getElementById('eb-property')?.value;

  b.name = (document.getElementById('eb-name')?.value || '').trim();
  b.category = document.getElementById('eb-category')?.value || b.category;
  b.emoji = emojiBtn?.dataset.emoji || autoEmoji(b.name, b.category);
  b.company = (document.getElementById('eb-company')?.value || '').trim();
  b.amount = parseMoney(document.getElementById('eb-amount')?.value || '') || b.amount;
  b.occurrence = occ;
  b.paymentDay = parseInt(document.getElementById('eb-day')?.value) || 1;
  b.paymentMonth = parseInt(document.getElementById('eb-month')?.value) || 0;
  b.paymentDate = document.getElementById('eb-date')?.value || '';
  b.paymentDayOfWeek = parseInt(document.getElementById('eb-weekday')?.value) || 0;
  b.payMode = document.getElementById('eb-paymode')?.value || 'auto';
  b.notes = document.getElementById('eb-notes')?.value || '';
  b.person = personVal !== '' ? parseInt(personVal) : null;
  b.propertyIdx = propVal !== '' ? parseInt(propVal) : null;
  b.firstPaymentAmount = hasDiff
    ? (parseMoney(document.getElementById('eb-first-amount')?.value || '') || null)
    : null;

  save();
  closeModal('editBillModalV2');
  renderBills();
  toast('Bill saved');
}

function _logCostChange() {
  if (editingBillIdx === null) return;
  const b = S.bills[editingBillIdx];
  const newAmt = parseMoney(document.getElementById('eb-new-cost')?.value || '');
  const date = document.getElementById('eb-cost-date')?.value || new Date().toISOString().split('T')[0];
  const reason = (document.getElementById('eb-cost-reason')?.value || '').trim();

  if (isNaN(newAmt) || !newAmt) { toast('Please enter a new amount'); return; }

  if (!b.costHistory) b.costHistory = [];
  b.costHistory.push({ date, amount: newAmt, reason, previousAmount: b.amount });
  b.amount = newAmt;

  // Clear fields
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('eb-new-cost', '');
  setVal('eb-cost-reason', '');
  setVal('eb-amount', newAmt.toLocaleString('en-GB'));

  save();
  toast(`Cost updated to ${fmt(newAmt)}`);
}

// ── Render upcoming bills ticker ───────────────────────

function _renderBillsTicker(bills) {
  const ticker = document.getElementById('billsTicker');
  if (!ticker) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = bills
    .filter(b => b.occurrence !== 'one-off')
    .map(b => {
      const next = getNextPaymentDate(b);
      const daysUntil = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
      return { ...b, next, daysUntil };
    })
    .filter(b => b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 10);

  if (!upcoming.length) {
    ticker.innerHTML = '<div class="bills-ticker-chips"><span style="font-size:11px;color:var(--muted2);">No upcoming bills</span></div>';
    return;
  }

  ticker.innerHTML = '<div class="bills-ticker-chips">' + upcoming.map(b => {
    const emoji = b.emoji || autoEmoji(b.name, b.category);
    const urgency = b.daysUntil <= 3 ? 'urgent' : b.daysUntil <= 7 ? 'soon' : 'normal';
    const daysText = b.daysUntil === 0 ? 'Today' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`;
    return `<div class="bills-ticker-chip ${urgency}">
      <span class="bills-ticker-emoji">${emoji}</span>
      <span class="bills-ticker-label">${b.name}</span>
      <span class="bills-ticker-days">${daysText}</span>
    </div>`;
  }).join('') + '</div>';
}

// ── Render bill templates (quick add) ───────────────────

function _renderBillTemplates() {
  const container = document.getElementById('billTemplates');
  if (!container) return;

  const templates = [
    { name: 'Electricity', category: 'Utilities', emoji: '⚡', amount: 120, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Gas', category: 'Utilities', emoji: '🔥', amount: 80, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Water', category: 'Utilities', emoji: '💧', amount: 35, occurrence: 'monthly', paymentDay: 15 },
    { name: 'Internet', category: 'Utilities', emoji: '�', amount: 45, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Mobile Phone', category: 'Utilities', emoji: '📱', amount: 35, occurrence: 'monthly', paymentDay: 1 },
    { name: 'TV Licence', category: 'Utilities', emoji: '📺', amount: 169.50, occurrence: 'annually', paymentMonth: 0, paymentDay: 1 },
    { name: 'Spotify', category: 'Subscriptions', emoji: '🎵', amount: 10.99, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Apple Music', category: 'Subscriptions', emoji: '🎵', amount: 10.99, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Sky', category: 'Subscriptions', emoji: '🎬', amount: 45, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Netflix', category: 'Subscriptions', emoji: '🎬', amount: 10.99, occurrence: 'monthly', paymentDay: 15 },
    { name: 'Disney+', category: 'Subscriptions', emoji: '🎬', amount: 7.99, occurrence: 'monthly', paymentDay: 15 },
    { name: 'Apple TV+', category: 'Subscriptions', emoji: '�', amount: 8.99, occurrence: 'monthly', paymentDay: 15 },
    { name: 'Amazon Prime', category: 'Subscriptions', emoji: '📦', amount: 8.99, occurrence: 'monthly', paymentDay: 1 },
    { name: 'YouTube Premium', category: 'Subscriptions', emoji: '▶️', amount: 11.99, occurrence: 'monthly', paymentDay: 1 },
    { name: 'iCloud', category: 'Subscriptions', emoji: '☁️', amount: 0.99, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Google One', category: 'Subscriptions', emoji: '☁️', amount: 1.99, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Adobe Creative Cloud', category: 'Subscriptions', emoji: '🎨', amount: 54.99, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Gym Membership', category: 'Subscriptions', emoji: '�', amount: 40, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Life Insurance', category: 'Insurance', emoji: '❤️', amount: 25, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Pet Insurance', category: 'Insurance', emoji: '🐾', amount: 20, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Health Insurance', category: 'Insurance', emoji: '🏥', amount: 50, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Travel Insurance', category: 'Insurance', emoji: '✈️', amount: 80, occurrence: 'annually', paymentMonth: 0, paymentDay: 1 },
    { name: 'Car Tax', category: 'Transport', emoji: '🚗', amount: 180, occurrence: 'annually', paymentMonth: 0, paymentDay: 1 },
    { name: 'Train Season Ticket', category: 'Transport', emoji: '🚆', amount: 300, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Bus Pass', category: 'Transport', emoji: '�', amount: 60, occurrence: 'monthly', paymentDay: 1 },
    { name: 'Parking Permit', category: 'Transport', emoji: '🅿️', amount: 100, occurrence: 'annually', paymentMonth: 0, paymentDay: 1 },
    { name: 'Childcare', category: 'Other', emoji: '👶', amount: 800, occurrence: 'monthly', paymentDay: 1 },
    { name: 'School Fees', category: 'Other', emoji: '🎓', amount: 1200, occurrence: 'monthly', paymentDay: 1 },
  ];

  container.innerHTML = templates.map(t => `
    <button class="pill bill-template-btn" onclick="_applyBillTemplate('${t.name}', '${t.category}', '${t.emoji}', ${t.amount}, '${t.occurrence}', ${t.paymentDay}, ${t.paymentMonth || 0})">
      <span>${t.emoji}</span>
      <span>${t.name}</span>
    </button>
  `).join('');
}

function _applyBillTemplate(name, category, emoji, amount, occurrence, paymentDay, paymentMonth) {
  toggleAddBillForm();
  setTimeout(() => {
    document.getElementById('billName').value = name;
    document.getElementById('billCategory').value = category;
    const emojiBtn = document.getElementById('billEmojiTrigger');
    if (emojiBtn) {
      emojiBtn.textContent = emoji;
      emojiBtn.dataset.emoji = emoji;
      emojiBtn.dataset.userSet = 'true';
    }
    document.getElementById('billAmount').value = amount.toLocaleString('en-GB', { minimumFractionDigits: 2 });
    document.getElementById('billOccurrence').value = occurrence;
    _toggleBillOccurrenceFields();
    if (occurrence === 'monthly' || occurrence === 'quarterly') {
      document.getElementById('billPaymentDay').value = paymentDay;
    } else if (occurrence === 'annually') {
      document.getElementById('billPaymentDay').value = paymentDay;
      document.getElementById('billPaymentMonth').value = paymentMonth;
    }
  }, 100);
}

// ── Legacy compatibility (called from HTML) ──────────
// Keep these so existing HTML onclick handlers still work
function openEditBill(i) { openEditBillV2(i); }
function saveEditBill() { saveEditBillV2(); }