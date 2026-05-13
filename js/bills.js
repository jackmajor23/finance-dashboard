// ══════════════════════════════════════════════════
// BILLS MODULE
// ══════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────

const BILL_CATEGORIES = ['Utilities', 'Subscriptions', 'Insurance', 'Transport', 'Other'];
const BILL_TABS       = ['All', ...BILL_CATEGORIES];

/** Monthly multiplier for each occurrence type */
const MONTHLY_FACTOR = {
  weekly:      52 / 12,
  fortnightly: 26 / 12,
  monthly:     1,
  quarterly:   4  / 12,
  annually:    1  / 12,
  'one-off':   0,   // excluded from recurring totals
};

/** Short frequency labels shown after the price on each card */
const FREQ_LABEL = {
  weekly:      '/wk',
  fortnightly: '/2wk',
  monthly:     '/mo',
  quarterly:   '/qtr',
  annually:    '/yr',
  'one-off':   '',
};

/** Ordered list of [keyword, emoji] — first match wins */
const EMOJI_KEYWORDS = [
  // Utilities — specifics first
  ['council tax',      '🏛️'], ['council',         '🏛️'],
  ['tv licence',       '📺'], ['tv license',       '📺'], ['television',   '📺'],
  ['broadband',        '📡'], ['internet',         '📡'], ['wifi',         '📡'],
  ['electricity',      '⚡'], ['electric',         '⚡'], ['power',        '⚡'], ['energy', '⚡'],
  ['gas',              '🔥'], ['heating',          '🔥'],
  ['water',            '💧'],
  ['landline',         '☎️'],
  ['mobile',           '📱'], ['phone',            '📱'],
  // Subscriptions
  ['netflix',          '🎬'], ['disney',           '✨'], ['hbo',          '🎬'],
  ['amazon prime',     '📦'], ['prime video',      '📦'], ['amazon',       '📦'],
  ['youtube premium',  '▶️'], ['youtube',          '▶️'],
  ['spotify',          '🎵'], ['apple music',      '🎵'], ['tidal',        '🎵'], ['music', '🎵'],
  ['icloud',           '☁️'], ['google one',       '☁️'], ['dropbox',      '☁️'], ['cloud', '☁️'],
  ['adobe',            '🎨'], ['microsoft 365',    '💻'], ['office 365',   '💻'],
  ['gym',              '💪'], ['fitness',          '💪'],
  // Insurance
  ['car insurance',    '🚗'], ['car tax',          '🚗'],
  ['home insurance',   '🏠'],
  ['life insurance',   '❤️'],
  ['health insurance', '🏥'], ['dental',           '🦷'],
  ['pet insurance',    '🐾'],
  ['travel insurance', '✈️'],
  ['insurance',        '🛡️'],
  // Transport
  ['fuel',             '⛽'], ['petrol',           '⛽'], ['diesel',       '⛽'],
  ['train',            '🚆'], ['rail',             '🚆'],
  ['bus pass',         '🚌'], ['bus',              '🚌'],
  ['parking',          '🅿️'], ['congestion',       '🏙️'],
  ['ulez',             '🏙️'],
  ['car',              '🚗'],
  // Other
  ['mortgage',         '🏦'], ['rent',             '🏠'],
  ['childcare',        '👶'], ['nursery',          '👶'],
  ['school',           '🎓'], ['education',        '🎓'],
  ['loan',             '💰'], ['credit',           '💳'],
];

/** Emoji fallbacks by category */
const CAT_EMOJI = {
  Utilities:     '🔌',
  Subscriptions: '💳',
  Insurance:     '🛡️',
  Transport:     '🚌',
  Other:         '📋',
};

/** Quick-add template library */
const BILL_TEMPLATES = [
  // Utilities
  { name: 'Electricity',          category: 'Utilities',     emoji: '⚡',  occurrence: 'monthly'  },
  { name: 'Gas',                   category: 'Utilities',     emoji: '🔥',  occurrence: 'monthly'  },
  { name: 'Water',                 category: 'Utilities',     emoji: '💧',  occurrence: 'monthly'  },
  { name: 'Broadband',             category: 'Utilities',     emoji: '📡',  occurrence: 'monthly'  },
  { name: 'Mobile Phone',          category: 'Utilities',     emoji: '📱',  occurrence: 'monthly'  },
  { name: 'Council Tax',           category: 'Utilities',     emoji: '🏛️', occurrence: 'monthly'  },
  { name: 'TV Licence',            category: 'Utilities',     emoji: '📺',  occurrence: 'annually' },
  // Subscriptions
  { name: 'Netflix',               category: 'Subscriptions', emoji: '🎬',  occurrence: 'monthly'  },
  { name: 'Spotify',               category: 'Subscriptions', emoji: '🎵',  occurrence: 'monthly'  },
  { name: 'Amazon Prime',          category: 'Subscriptions', emoji: '📦',  occurrence: 'annually' },
  { name: 'Disney+',               category: 'Subscriptions', emoji: '✨',  occurrence: 'monthly'  },
  { name: 'Apple TV+',             category: 'Subscriptions', emoji: '🍎',  occurrence: 'monthly'  },
  { name: 'YouTube Premium',       category: 'Subscriptions', emoji: '▶️', occurrence: 'monthly'  },
  { name: 'iCloud',                category: 'Subscriptions', emoji: '☁️', occurrence: 'monthly'  },
  { name: 'Microsoft 365',         category: 'Subscriptions', emoji: '💻',  occurrence: 'annually' },
  { name: 'Adobe Creative Cloud',  category: 'Subscriptions', emoji: '🎨',  occurrence: 'monthly'  },
  { name: 'Gym Membership',        category: 'Subscriptions', emoji: '💪',  occurrence: 'monthly'  },
  // Insurance
  { name: 'Car Insurance',         category: 'Insurance',     emoji: '🚗',  occurrence: 'annually' },
  { name: 'Home Insurance',        category: 'Insurance',     emoji: '🏠',  occurrence: 'annually' },
  { name: 'Life Insurance',        category: 'Insurance',     emoji: '❤️',  occurrence: 'monthly'  },
  { name: 'Pet Insurance',         category: 'Insurance',     emoji: '🐾',  occurrence: 'monthly'  },
  { name: 'Health Insurance',      category: 'Insurance',     emoji: '🏥',  occurrence: 'monthly'  },
  { name: 'Travel Insurance',      category: 'Insurance',     emoji: '✈️',  occurrence: 'annually' },
  // Transport
  { name: 'Car Tax',               category: 'Transport',     emoji: '🚗',  occurrence: 'annually' },
  { name: 'Fuel',                  category: 'Transport',     emoji: '⛽',  occurrence: 'monthly'  },
  { name: 'Train Season Ticket',   category: 'Transport',     emoji: '🚆',  occurrence: 'annually' },
  { name: 'Bus Pass',              category: 'Transport',     emoji: '🚌',  occurrence: 'monthly'  },
  { name: 'Parking Permit',        category: 'Transport',     emoji: '🅿️', occurrence: 'annually' },
  // Other
  { name: 'Rent',                  category: 'Other',         emoji: '🏠',  occurrence: 'monthly'  },
  { name: 'Mortgage',              category: 'Other',         emoji: '🏦',  occurrence: 'monthly'  },
  { name: 'Childcare',             category: 'Other',         emoji: '👶',  occurrence: 'monthly'  },
  { name: 'School Fees',           category: 'Other',         emoji: '🎓',  occurrence: 'monthly'  },
];

/** Curated emoji grid for the picker (5 rows × 14 cols) */
const EMOJI_GRID = [
  '⚡','🔥','💧','📡','📺','📱','☎️','🏛️','🔌','💡','🌡️','🚰','🛁','🪟',
  '🎬','🎵','📦','✨','▶️','☁️','🎮','📚','🎯','🎸','🎤','🎧','🎨','🖼️',
  '🛡️','❤️','🏥','🦷','🐾','🏠','🚗','🚆','🚌','⛽','✈️','🅿️','🏙️','🚲',
  '💳','💰','💸','🏦','💼','🧾','📊','📈','🔑','🗝️','🏢','🏗️','🧹','⚙️',
  '👶','🎓','🛒','🍔','☕','🎪','⚽','🏋️','🌍','🐶','🐱','🪴','💊','🧴',
];

// ── Module state ────────────────────────────────────
let billsActiveTab  = 'All';
let editingBillIdx  = null;
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

const WEEK_DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function fmtOccurrence(bill) {
  const o = bill.occurrence || 'monthly';
  if (o === 'one-off')     return 'One-off';
  if (o === 'weekly')      return `Weekly · ${WEEK_DAYS[bill.paymentDayOfWeek || 0]}s`;
  if (o === 'fortnightly') return 'Fortnightly';
  if (o === 'monthly')     return `Monthly · ${ordinal(bill.paymentDay || 1)}`;
  if (o === 'quarterly')   return `Quarterly · ${ordinal(bill.paymentDay || 1)}`;
  if (o === 'annually')    return `Annually · ${MONTH_NAMES[bill.paymentMonth || 0]} ${ordinal(bill.paymentDay || 1)}`;
  return o;
}

/** Convert a bill's stated amount to its monthly equivalent */
function toMonthlyAmount(bill) {
  const factor = MONTHLY_FACTOR[bill.occurrence || 'monthly'] ?? 1;
  return bill.amount * factor;
}

/** Total amount of bills whose next payment falls in the current calendar month */
function getDueThisMonth() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59);
  return S.bills.reduce((sum, b) => {
    const next = getNextPaymentDate(b);
    return (next >= start && next <= end) ? sum + b.amount : sum;
  }, 0);
}

/** Bills (with their next date) due within the next N days inclusive of today */
function getBillsDueSoon(days = 7) {
  const now    = new Date(); now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() + days);
  return S.bills
    .map(b => ({ bill: b, next: getNextPaymentDate(b) }))
    .filter(({ next }) => next >= now && next <= cutoff)
    .sort((a, b) => a.next - b.next);
}

function getNextPaymentDate(bill) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const o   = bill.occurrence || 'monthly';

  if (o === 'one-off') {
    return bill.paymentDate ? new Date(bill.paymentDate) : now;
  }

  if (o === 'weekly') {
    const target = bill.paymentDayOfWeek || 0;
    const diff   = ((target - now.getDay() + 7) % 7) || 7;
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

  // Fallback
  let d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return d;
}

// ── Money helpers ───────────────────────────────────

function formatMoney(input) {
  let v = input.value.replace(/[^0-9.]/g, '');
  if (v) {
    const parts = v.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    v = parts.join('.');
  }
  input.value = v;
}

function parseMoney(value) {
  return parseFloat((value || '').replace(/,/g, '')) || 0;
}

// ── Stats panel ─────────────────────────────────────
// Call this to populate #billStatsPanel in your HTML.
// Expected markup: <div id="billStatsPanel" class="bill-stats-panel"></div>

function renderBillStats() {
  const el = document.getElementById('billStatsPanel');
  if (!el) return;

  if (!S.bills.length) { el.innerHTML = ''; return; }

  const recurring     = S.bills.filter(b => b.occurrence !== 'one-off');
  const oneOffs       = S.bills.filter(b => b.occurrence === 'one-off');
  const monthlyTotal  = recurring.reduce((s, b) => s + toMonthlyAmount(b), 0);
  const annualTotal   = monthlyTotal * 12;
  const dailyCost     = annualTotal / 365;
  const dueThisMonth  = getDueThisMonth();
  const dueSoon       = getBillsDueSoon(7);
  const dueSoonTotal  = dueSoon.reduce((s, { bill }) => s + bill.amount, 0);
  const biggest       = recurring.length
    ? recurring.reduce((a, b) => toMonthlyAmount(b) > toMonthlyAmount(a) ? b : a)
    : null;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Monthly total</div>
      <div class="stat-value">${fmt(monthlyTotal)}</div>
      <div class="stat-sub">${recurring.length} recurring bill${recurring.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Annual total</div>
      <div class="stat-value">${fmt(annualTotal)}</div>
      <div class="stat-sub">${fmt(dailyCost)} / day</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Due this month</div>
      <div class="stat-value">${fmt(dueThisMonth)}</div>
      <div class="stat-sub">${MONTH_NAMES[new Date().getMonth()]}</div>
    </div>
    <div class="stat-card${dueSoon.length ? ' stat-alert' : ''}">
      <div class="stat-label">Due next 7 days</div>
      <div class="stat-value">${dueSoon.length ? fmt(dueSoonTotal) : '—'}</div>
      <div class="stat-sub">${dueSoon.length
        ? `${dueSoon.length} payment${dueSoon.length !== 1 ? 's' : ''}`
        : 'Nothing due'}</div>
    </div>
    ${biggest ? `
    <div class="stat-card">
      <div class="stat-label">Biggest bill</div>
      <div class="stat-value" style="font-size:15px;">
        ${biggest.emoji || autoEmoji(biggest.name, biggest.category)} ${biggest.name}
      </div>
      <div class="stat-sub">${fmt(toMonthlyAmount(biggest))} / mo</div>
    </div>` : ''}
    ${oneOffs.length ? `
    <div class="stat-card">
      <div class="stat-label">One-off payments</div>
      <div class="stat-value">${fmt(oneOffs.reduce((s, b) => s + b.amount, 0))}</div>
      <div class="stat-sub">${oneOffs.length} item${oneOffs.length !== 1 ? 's' : ''}</div>
    </div>` : ''}
  `;
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
    <div class="upcoming-header">⚡ Due in the next 7 days</div>
    <div class="upcoming-list">
      ${dueSoon.map(({ bill, next }) => {
        const daysLeft = Math.floor((next - now) / 86400000);
        const emoji    = bill.emoji || autoEmoji(bill.name, bill.category);
        const label    = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`;
        return `<div class="upcoming-item">
          <span>
            ${emoji} <strong>${bill.name}</strong>
            ${bill.company ? `<span style="opacity:.55;font-size:10px;margin-left:4px;">${bill.company}</span>` : ''}
          </span>
          <span style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:600;">${fmt(bill.amount)}</span>
            <span class="upcoming-badge${daysLeft === 0 ? ' today' : ''}">${label}</span>
          </span>
        </div>`;
      }).join('')}
    </div>`;
}

// ── Tabs ─────────────────────────────────────────────

function switchBillTab(tab) {
  billsActiveTab = tab;
  document.querySelectorAll('.bill-tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tab)
  );
  renderBills();
}

// ── Emoji picker ──────────────────────────────────────

function openEmojiPicker(target) {
  billEmojiTarget = target;
  const modal = document.getElementById('emojiPickerModal');
  if (!modal) return;
  document.getElementById('emojiSearch').value = '';
  renderEmojiGrid('');
  modal.classList.remove('hidden');
}

function renderEmojiGrid(search) {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  grid.innerHTML = EMOJI_GRID
    .map(e => `<button class="emoji-opt" onclick="selectEmoji('${e}')">${e}</button>`)
    .join('');
}

function selectEmoji(emoji) {
  const id  = billEmojiTarget === 'add' ? 'billEmojiBtn' : 'eb-emoji';
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
    : S.bills.filter(b => b.category === billsActiveTab);

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="ei">⧗</div>
      <p>${billsActiveTab === 'All' ? 'No bills tracked yet.' : `No ${billsActiveTab} bills.`}</p>
    </div>`;
    renderBillStats();
    renderUpcomingStrip();
    return;
  }

  const now = new Date(); now.setHours(0, 0, 0, 0);

  grid.innerHTML = filtered.map(b => {
    const origIdx   = S.bills.indexOf(b);
    const nextDate  = getNextPaymentDate(b);
    const daysLeft  = Math.max(0, Math.floor((nextDate - now) / 86400000));
    const isOneOff  = b.occurrence === 'one-off';
    const overdue   = !isOneOff && nextDate < now;
    const dueSoon   = !overdue && daysLeft <= 7;
    const emoji     = b.emoji || autoEmoji(b.name, b.category);
    const freqLabel = FREQ_LABEL[b.occurrence || 'monthly'] || '';

    let dueLabel = '';
    if (overdue)      dueLabel = ` · <span class="neg">Overdue</span>`;
    else if (dueSoon) dueLabel = ` · <span class="neg">${
      daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`
    }</span>`;

    // Card subtitle: category · company (if set) · frequency detail
    const subtitleParts = [b.category || 'Other'];
    if (b.company) subtitleParts.push(b.company);
    subtitleParts.push(fmtOccurrence(b));

    return `<div class="bill-card${overdue ? ' bill-overdue' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:9px;">
          <span class="bill-emoji">${emoji}</span>
          <div>
            <div style="font-weight:600;font-size:14px;">${b.name}</div>
            <div style="font-size:11px;color:var(--muted);">${subtitleParts.join(' · ')}</div>
          </div>
        </div>
        <div style="display:flex;gap:5px;">
          <button class="icon-btn edit" onclick="openEditBill(${origIdx})">✎</button>
          <button class="icon-btn del"  onclick="deleteBill(${origIdx})">✕</button>
        </div>
      </div>

      <div style="display:flex;align-items:baseline;gap:5px;">
        <div class="val" style="font-size:16px;font-weight:600;color:var(--val);">${fmt(b.amount)}</div>
        ${freqLabel ? `<div style="font-size:11px;color:var(--muted);font-weight:500;">${freqLabel}</div>` : ''}
      </div>

      ${b.firstPaymentAmount
        ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">First payment: ${fmt(b.firstPaymentAmount)}</div>`
        : ''}

      <div style="font-size:11px;color:var(--muted);margin-top:4px;">
        ${isOneOff ? 'Date' : 'Next'}: ${fmtDate(nextDate.toISOString().split('T')[0])}${dueLabel}
      </div>
      ${b.notes ? `<div style="font-size:10px;color:var(--muted2);margin-top:6px;">📝 ${b.notes}</div>` : ''}
    </div>`;
  }).join('');

  renderBillStats();
  renderUpcomingStrip();
}

// ── Template chips ─────────────────────────────────

function renderBillTemplates() {
  const container = document.getElementById('billTemplates');
  if (!container) return;
  const existingNames = new Set(S.bills.map(b => b.name.toLowerCase()));
  container.innerHTML = BILL_TEMPLATES
    .filter(t => !existingNames.has(t.name.toLowerCase()))
    .map(t => {
      const safe = t.name.replace(/'/g, "\\'");
      return `<button class="template-chip"
        onclick="quickAddBill('${safe}','${t.category}','${t.emoji}','${t.occurrence}')">
        ${t.emoji} ${t.name}
      </button>`;
    }).join('');
}

function quickAddBill(name, category, emoji, occurrence) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('billName',       name);
  set('billCategory',   category);
  set('billOccurrence', occurrence);
  const emojiBtn = document.getElementById('billEmojiBtn');
  if (emojiBtn) { emojiBtn.textContent = emoji; emojiBtn.dataset.emoji = emoji; }
  toggleOccurrenceFields();
  document.getElementById('billName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('billAmount')?.focus();
}

// ── Form field toggling ─────────────────────────────

function toggleOccurrenceFields() {
  const occ  = document.getElementById('billOccurrence')?.value;
  const show = (id, cond) => { const el = document.getElementById(id); if (el) el.style.display = cond ? '' : 'none'; };
  show('billPaymentDayField',     ['monthly','quarterly','annually'].includes(occ));
  show('billPaymentDateField',    ['one-off','fortnightly'].includes(occ));
  show('billPaymentMonthField',   occ === 'annually');
  show('billPaymentWeekDayField', occ === 'weekly');
}

function toggleFirstPayment(checked) {
  const fp = document.getElementById('billFirstPaymentField');
  if (fp) fp.style.display = checked ? '' : 'none';
}

// ── Add bill ────────────────────────────────────────

function addBill() {
  const name       = (document.getElementById('billName').value || '').trim();
  const category   = document.getElementById('billCategory').value;
  const emojiBtn   = document.getElementById('billEmojiBtn');
  const emoji      = emojiBtn?.dataset.emoji || autoEmoji(name, category);
  const company    = (document.getElementById('billCompany')?.value || '').trim();
  const amount     = parseMoney(document.getElementById('billAmount').value);
  const occurrence = document.getElementById('billOccurrence').value;
  const notes      = (document.getElementById('billNotes').value || '').trim();

  const paymentDay       = parseInt(document.getElementById('billPaymentDay')?.value)    || 1;
  const paymentMonth     = parseInt(document.getElementById('billPaymentMonth')?.value)   || 0;
  const paymentDate      = document.getElementById('billPaymentDate')?.value              || '';
  const paymentDayOfWeek = parseInt(document.getElementById('billPaymentWeekDay')?.value) || 0;

  const hasDiffFirst       = document.getElementById('billDiffFirst')?.checked;
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
  renderBillTemplates();

  // Reset add form
  ['billName','billAmount','billNotes','billCompany'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  if (emojiBtn) { emojiBtn.textContent = '🔖'; delete emojiBtn.dataset.emoji; }
  const diffFirst = document.getElementById('billDiffFirst');
  if (diffFirst) { diffFirst.checked = false; toggleFirstPayment(false); }
}

// ── Delete bill ─────────────────────────────────────

function deleteBill(i) {
  S.bills.splice(i, 1);
  save(); renderBills(); renderBillTemplates(); toast('Bill removed');
}

// ── Edit bill ───────────────────────────────────────

function openEditBill(i) {
  editingBillIdx = i;
  const b     = S.bills[i];
  const modal = document.getElementById('editBillModal');
  if (!modal) { toast('Edit modal not found'); return; }

  const emoji    = b.emoji || autoEmoji(b.name, b.category);
  const occ      = b.occurrence || 'monthly';
  const showDay  = ['monthly','quarterly','annually'].includes(occ);
  const showDate = ['one-off','fortnightly'].includes(occ);

  document.getElementById('editBillGrid').innerHTML = `
    <div class="ff">
      <label>Icon</label>
      <button id="eb-emoji" class="emoji-btn" data-emoji="${emoji}"
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
          `<option value="${c}" ${b.category === c ? 'selected' : ''}>${c}</option>`
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
    <div class="ff" style="flex-direction:row;align-items:center;gap:8px;padding-top:18px;">
      <input type="checkbox" id="eb-diff-first"
             ${b.firstPaymentAmount ? 'checked' : ''}
             onchange="toggleEditFirstPayment(this.checked)"/>
      <label for="eb-diff-first" style="margin:0;font-size:12px;">Different first payment amount</label>
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
        <option value="monthly"     ${occ === 'monthly'     ? 'selected' : ''}>Monthly</option>
        <option value="weekly"      ${occ === 'weekly'      ? 'selected' : ''}>Weekly</option>
        <option value="fortnightly" ${occ === 'fortnightly' ? 'selected' : ''}>Fortnightly</option>
        <option value="quarterly"   ${occ === 'quarterly'   ? 'selected' : ''}>Quarterly</option>
        <option value="annually"    ${occ === 'annually'    ? 'selected' : ''}>Annually</option>
        <option value="one-off"     ${occ === 'one-off'     ? 'selected' : ''}>One-off</option>
      </select>
    </div>
    <div class="ff" id="eb-day-field" style="display:${showDay ? '' : 'none'}">
      <label>Day of month (1–28)</label>
      <input type="number" id="eb-day" min="1" max="28" value="${b.paymentDay || 1}"/>
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
      <input type="date" id="eb-date" value="${b.paymentDate || ''}"/>
    </div>
    <div class="ff full-col">
      <label>Notes</label>
      <textarea id="eb-notes">${b.notes || ''}</textarea>
    </div>`;

  modal.classList.remove('hidden');
}

function toggleEditOccurrenceFields() {
  const occ  = document.getElementById('eb-occurrence')?.value;
  const show = (id, cond) => { const el = document.getElementById(id); if (el) el.style.display = cond ? '' : 'none'; };
  show('eb-day-field',     ['monthly','quarterly','annually'].includes(occ));
  show('eb-date-field',    ['one-off','fortnightly'].includes(occ));
  show('eb-month-field',   occ === 'annually');
  show('eb-weekday-field', occ === 'weekly');
}

function toggleEditFirstPayment(checked) {
  const fp = document.getElementById('eb-first-field');
  if (fp) fp.style.display = checked ? '' : 'none';
}

function saveEditBill() {
  if (editingBillIdx === null) return;
  const b            = S.bills[editingBillIdx];
  const occ          = document.getElementById('eb-occurrence').value;
  const emojiBtn     = document.getElementById('eb-emoji');
  const hasDiffFirst = document.getElementById('eb-diff-first')?.checked;

  b.name             = (document.getElementById('eb-name').value || '').trim();
  b.category         = document.getElementById('eb-category').value;
  b.emoji            = emojiBtn?.dataset.emoji || autoEmoji(b.name, b.category);
  b.company          = (document.getElementById('eb-company')?.value || '').trim();
  b.amount           = parseMoney(document.getElementById('eb-amount').value) || b.amount;
  b.occurrence       = occ;
  b.paymentDay       = parseInt(document.getElementById('eb-day')?.value)      || 1;
  b.paymentMonth     = parseInt(document.getElementById('eb-month')?.value)    || 0;
  b.paymentDate      = document.getElementById('eb-date')?.value               || '';
  b.paymentDayOfWeek = parseInt(document.getElementById('eb-weekday')?.value)  || 0;
  b.firstPaymentAmount = hasDiffFirst
    ? (parseMoney(document.getElementById('eb-first-amount')?.value) || null)
    : null;
  b.notes = document.getElementById('eb-notes')?.value || '';

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