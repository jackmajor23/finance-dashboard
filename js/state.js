// ── State & Persistence ─────────────────────────────
const SK = 'wealth-dashboard-v4';

// Default state shape — add new keys here as features grow
let S = {
  settings: { name: '', title: 'Financial Tracker', currency: '£', household: false, personNames: ['Person 1', 'Person 2'] },
  holdings: [], closedHoldings: [], accounts: [],
  premiumBonds: { amount: 0, date: '', wins: [] },
  debts: [], goals: [], salaries: [],
  bills: [], properties: [], creditScores: [],
  watchlist: [], netWorthHistory: [],
  transactions: [], lastUpdated: null
};

// Chart instances
let donutChart = null, barChart = null, nwChart = null;

// UI state
let hFilter = 'all', txFilter = 'all', editingId = null, editingDebtIdx = null, editingSalaryIdx = null;
let livePrices = {};

function save() {
  S.lastUpdated = new Date().toISOString();
  try { localStorage.setItem(SK, JSON.stringify(S)); } catch (e) { }
  _updateSidebarMeta();
}

function loadState() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) {
      const p = JSON.parse(raw);
      S = { ...S, ...p };
      S.settings = Object.assign({ name: '', title: 'Financial Tracker', currency: '£', household: false, personNames: ['Person 1', 'Person 2'] }, p.settings || {});
    }
  } catch (e) { }
  // Guard all arrays
  ['holdings', 'closedHoldings', 'accounts', 'debts', 'goals', 'salaries', 'bills', 'properties', 'creditScores', 'watchlist', 'netWorthHistory', 'transactions']
    .forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
  if (!S.premiumBonds || typeof S.premiumBonds !== 'object') S.premiumBonds = { amount: 0, date: '', wins: [] };
  if (!Array.isArray(S.premiumBonds.wins)) S.premiumBonds.wins = [];
  if (!Array.isArray(S.settings.personNames) || !S.settings.personNames.length) S.settings.personNames = ['Person 1'];
  normalizePeopleAndLinks();
}

function normalizePeopleAndLinks() {
  if (!S.settings || typeof S.settings !== 'object') S.settings = {};
  const people = Array.isArray(S.settings.personNames) ? S.settings.personNames : [];
  S.settings.personNames = people
    .map((name, i) => String(name || '').trim() || `Person ${i + 1}`);
  if (!S.settings.personNames.length) S.settings.personNames = ['Person 1'];

  const clampPerson = (value) => {
    const idx = Number.parseInt(value, 10);
    const max = S.settings.personNames.length - 1;
    return Number.isInteger(idx) && idx >= 0 && idx <= max ? idx : 0;
  };

  S.salaries = (S.salaries || []).map(s => ({ ...s, person: clampPerson(s.person) }));
  S.debts = (S.debts || []).map(d => d.shared ? { ...d } : { ...d, person: clampPerson(d.person) });
  S.properties = (S.properties || []).map(p => ({ ...p, person: clampPerson(p.person) }));
}

function removePersonLinkedData(removedIdx) {
  const safePerson = (value) => {
    const idx = Number.parseInt(value, 10);
    return Number.isInteger(idx) && idx >= 0 ? idx : 0;
  };
  const shiftPerson = (value) => {
    const idx = safePerson(value);
    return idx > removedIdx ? idx - 1 : idx;
  };

  S.salaries = (S.salaries || [])
    .filter(s => safePerson(s.person) !== removedIdx)
    .map(s => ({ ...s, person: shiftPerson(s.person) }));

  S.debts = (S.debts || [])
    .filter(d => d.shared || safePerson(d.person) !== removedIdx)
    .map(d => d.shared ? { ...d } : { ...d, person: shiftPerson(d.person) });

  S.properties = (S.properties || [])
    .filter(p => safePerson(p.person) !== removedIdx)
    .map(p => ({ ...p, person: shiftPerson(p.person) }));
}

function _updateSidebarMeta() {
  const name = S.settings.name || S.settings.title || 'Financial Tracker';
  document.getElementById('sidebarTitle').textContent = S.settings.title || 'Financial Tracker';
  document.title = S.settings.title || 'Financial Tracker';
  document.getElementById('userName').textContent = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
  if (S.lastUpdated) {
    const d = new Date(S.lastUpdated);
    document.getElementById('lastUpdated').textContent =
      'saved ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
}
const CUR = () => S.settings.currency || '£';
function fmt(n) { return CUR() + Math.abs(Math.round(n)).toLocaleString('en-GB'); }
function fmtS(n) { return (n >= 0 ? '+' : '-') + CUR() + Math.abs(Math.round(n)).toLocaleString('en-GB'); }
function fmtP(n) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }
function pct(cur, inv) { return inv === 0 ? 0 : ((cur - inv) / inv * 100); }
function cls(n) { return n >= 0 ? 'pos' : 'neg'; }
function fmtDate(s) { if (!s) return '—'; const d = new Date(s); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
function monthYear(m, y) { const d = new Date(y, m - 1); return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); }
function clamp(v, mn, mx) { return Math.min(Math.max(v, mn), mx); }

/** Parse money from form fields (commas, £, $, spaces). */
function parseMoney(str) {
  if (str == null || str === '') return NaN;
  const cleaned = String(str).replace(/[£$,\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
/** Comma-separate a money input while typing. */
function formatMoney(input) {
  const raw = input.value.replace(/[^0-9.]/g, '');
  const parts = raw.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  input.value = parts.slice(0, 2).join('.');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3200);
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  editingId = null;
  editingDebtIdx = null;
  editingSalaryIdx = null;
  editingBillIdx = null;
}
function toggleHide() {
  const isHidden = document.body.classList.toggle('hidden-vals');

  const icon = document.getElementById('eyeBtn').querySelector('span');
  icon.textContent = isHidden ? 'visibility_off' : 'visibility';
}

// ── Search clear functionality ─────────────────────────────
function clearSearch(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.focus();
  }
}

function toggleSearchClear(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const wrapper = input.closest('.search-wrapper');
  if (!wrapper) return;
  const clearBtn = wrapper.querySelector('.search-clear');
  if (!clearBtn) return;
  clearBtn.style.display = input.value ? 'block' : 'none';
}
