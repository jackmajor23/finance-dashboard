// ── State & Persistence ─────────────────────────────
// This file defines the global state object S and all state management functions
// It must load SECOND in index.html (after constants.js, before all other files)
// ═══════════════════════════════════════════════════

// localStorage key for persisting application state
const SK = 'wealth-dashboard-v4';

// Default state shape — add new keys here as features grow
// This is the initial state when no data exists in localStorage
let S = {
  // App settings and user preferences
  settings: { name: '', title: 'Financial Tracker', currency: '£', household: false, privacyMode: false, personNames: ['Person 1', 'Person 2'] },
  // Investment holdings and closed positions
  holdings: [], closedHoldings: [],
  // Bank accounts, ISAs, and savings accounts
  accounts: [],
  // Premium bonds data (amount, date, prize wins)
  premiumBonds: { amount: 0, date: '', wins: [] },
  // Debt tracking (loans, mortgages, credit cards, student loans)
  debts: [],
  // Savings goals with progress tracking
  goals: [],
  // Salary records per person (for tax calculation)
  salaries: [],
  // Recurring bills and expenses
  bills: [],
  // Property records with mortgage data
  properties: [],
  // Credit score history
  creditScores: [],
  // Stock/crypto watchlist
  watchlist: [],
  // Dividend ledger linked to individual holdings
  dividends: [],
  // Homes the user rents rather than owns
  rentedProperties: [],
  // Daily net worth history for charting
  netWorthHistory: [],
  // Transaction log (buys, sells, deposits, withdrawals)
  transactions: [],
  // Freelance invoice ledger
  invoices: [],
  // Last save timestamp (ISO format)
  lastUpdated: null
};

// Chart.js instances - must be destroyed before recreation to prevent memory leaks
let donutChart = null, barChart = null, nwChart = null;

// UI state variables - track current filter selections and editing state
let hFilter = 'all',           // Holdings filter (all, stocks, isa, crypto, etc.)
  txFilter = 'all',          // Transactions filter
  editingId = null,          // Currently editing holding ID
  editingDebtIdx = null,     // Currently editing debt index
  editingSalaryIdx = null,   // Currently editing salary index
  editingBillIdx = null;     // Currently editing bill index

// Live stock price cache - maps ticker symbols to price objects
let livePrices = {};

// ── State Persistence Functions ─────────────────────────────

/**
 * Save current state to localStorage
 * Updates lastUpdated timestamp and refreshes sidebar metadata
 * Call this after any state mutations
 */
function save() {
  S.lastUpdated = new Date().toISOString();
  try { localStorage.setItem(SK, JSON.stringify(S)); } catch (e) { }
  _updateSidebarMeta();
}

/**
 * Load state from localStorage on application startup
 * Merges loaded state with defaults to handle schema changes
 * Guards all arrays to prevent errors from corrupted data
 * Normalizes person indices to ensure data integrity
 */
function loadState() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) {
      const p = JSON.parse(raw);
      S = { ...S, ...p };
      // Merge settings with defaults to handle new fields
      S.settings = Object.assign({ name: '', title: 'Financial Tracker', currency: '£', household: false, privacyMode: false, personNames: ['Person 1', 'Person 2'] }, p.settings || {});
    }
  } catch (e) { }
  // Guard all arrays - ensure they exist and are arrays
  ['holdings', 'closedHoldings', 'accounts', 'debts', 'goals', 'salaries', 'bills', 'properties', 'rentedProperties', 'creditScores', 'watchlist', 'netWorthHistory', 'transactions', 'invoices', 'dividends']
    .forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
  // Guard premiumBonds object structure
  if (!S.premiumBonds || typeof S.premiumBonds !== 'object') S.premiumBonds = { amount: 0, date: '', wins: [] };
  if (!Array.isArray(S.premiumBonds.wins)) S.premiumBonds.wins = [];
  // Guard personNames array
  if (!Array.isArray(S.settings.personNames) || !S.settings.personNames.length) S.settings.personNames = ['Person 1'];
  // Ensure all person indices are valid
  normalizePeopleAndLinks();
  document.body.classList.toggle('hidden-vals', !!S.settings.privacyMode);
}

/**
 * Normalize person indices across all data arrays
 * Ensures all person references are valid indices into personNames array
 * Called after loading state to handle data integrity issues
 */
function normalizePeopleAndLinks() {
  if (!S.settings || typeof S.settings !== 'object') S.settings = {};
  const people = Array.isArray(S.settings.personNames) ? S.settings.personNames : [];
  S.settings.personNames = people
    .map((name, i) => String(name || '').trim() || `Person ${i + 1}`);
  if (!S.settings.personNames.length) S.settings.personNames = ['Person 1'];

  // Helper to clamp person index to valid range
  const clampPerson = (value) => {
    const idx = Number.parseInt(value, 10);
    const max = S.settings.personNames.length - 1;
    return Number.isInteger(idx) && idx >= 0 && idx <= max ? idx : 0;
  };

  // Normalize person indices in all data arrays
  S.salaries = (S.salaries || []).map(s => ({ ...s, person: clampPerson(s.person) }));
  S.accounts = (S.accounts || []).map(a => ({
    ...a,
    person: clampPerson(a.person),
    overdraft: Number(a.overdraft || 0),
    maxCreditLimit: Number(a.maxCreditLimit || a.max_credit_limit || 0),
    interestRate: Number(a.interestRate || a.interest_rate || 0),
  }));
  S.holdings = (S.holdings || []).map(h => ({
    ...h,
    invested: Number(h.invested || 0),
    current: Number(h.current || 0),
    dividendsReceived: Number(h.dividendsReceived || 0),
  }));
  S.debts = (S.debts || []).map(d => {
    if (d.shared) {
      if (Array.isArray(d.sharedPeople)) {
        const clamped = d.sharedPeople
          .map(idx => clampPerson(idx))
          .filter((v, i, self) => self.indexOf(v) === i);
        return { ...d, sharedPeople: clamped };
      }
      return { ...d };
    }
    return { ...d, person: clampPerson(d.person) };
  });
  S.properties = (S.properties || []).map(p => ({
    ...p,
    person: clampPerson(p.person),
    mortgageLedger: Array.isArray(p.mortgageLedger) ? p.mortgageLedger : [],
    tenantTimeline: Array.isArray(p.tenantTimeline) ? p.tenantTimeline : [],
  }));
}

/**
 * Remove all data linked to a deleted person
 * Shifts person indices for remaining people to maintain consistency
 * Called when a person is deleted from settings
 * @param {number} removedIdx - Index of the person being removed
 */
function removePersonLinkedData(removedIdx) {
  const safePerson = (value) => {
    const idx = Number.parseInt(value, 10);
    return Number.isInteger(idx) && idx >= 0 ? idx : 0;
  };
  // Shift person indices down for people after the removed one
  const shiftPerson = (value) => {
    const idx = safePerson(value);
    return idx > removedIdx ? idx - 1 : idx;
  };

  // Remove or shift salaries
  S.salaries = (S.salaries || [])
    .filter(s => safePerson(s.person) !== removedIdx)
    .map(s => ({ ...s, person: shiftPerson(s.person) }));

  // Remove or shift debts (handle shared debts)
  S.debts = (S.debts || [])
    .filter(d => {
      if (d.shared) {
        if (Array.isArray(d.sharedPeople)) {
          const remainingPeople = d.sharedPeople.filter(idx => idx !== removedIdx);
          return remainingPeople.length > 0;
        }
        return true;
      }
      return safePerson(d.person) !== removedIdx;
    })
    .map(d => {
      if (d.shared) {
        if (Array.isArray(d.sharedPeople)) {
          const updatedPeople = d.sharedPeople
            .filter(idx => idx !== removedIdx)
            .map(idx => idx > removedIdx ? idx - 1 : idx);
          // Convert to single-person debt if only one person remains
          if (updatedPeople.length === 1) {
            const newD = { ...d, shared: false, person: updatedPeople[0] };
            delete newD.sharedPeople;
            return newD;
          }
          return { ...d, sharedPeople: updatedPeople };
        }
        return { ...d };
      }
      return { ...d, person: shiftPerson(d.person) };
    });

  // Remove or shift properties
  S.properties = (S.properties || [])
    .filter(p => safePerson(p.person) !== removedIdx)
    .map(p => ({ ...p, person: shiftPerson(p.person) }));
}

/**
 * Update sidebar metadata (title, user name, last saved time)
 * Called after save() to refresh the sidebar display
 */
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

// ── Formatting Utility Functions ─────────────────────────────
// These functions are used throughout the application for consistent formatting

/**
 * Get current currency symbol from settings
 * @returns {string} Currency symbol (£ or $)
 */
const CUR = () => S.settings.currency || '£';

/**
 * Format number as currency (absolute value, no sign)
 * @param {number} n - Number to format
 * @returns {string} Formatted currency string (e.g., "£1,234")
 */
function fmt(n) { return CUR() + Math.abs(Math.round(n)).toLocaleString('en-GB'); }

/**
 * Format number as signed currency
 * @param {number} n - Number to format
 * @returns {string} Signed currency string (e.g., "+£1,234" or "-£1,234")
 */
function fmtS(n) { return (n >= 0 ? '+' : '-') + CUR() + Math.abs(Math.round(n)).toLocaleString('en-GB'); }

/**
 * Format number as percentage with sign
 * @param {number} n - Number to format
 * @returns {string} Percentage string (e.g., "+12.5%" or "-5.0%")
 */
function fmtP(n) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }

/**
 * Calculate percentage change
 * @param {number} cur - Current value
 * @param {number} inv - Original/invested value
 * @returns {number} Percentage change
 */
function pct(cur, inv) { return inv === 0 ? 0 : ((cur - inv) / inv * 100); }

/**
 * Get CSS class for positive/negative values
 * @param {number} n - Number to check
 * @returns {string} 'pos' for positive, 'neg' for negative
 */
function cls(n) { return n >= 0 ? 'pos' : 'neg'; }

/**
 * Format date string to readable format
 * @param {string} s - Date string or ISO date
 * @returns {string} Formatted date (e.g., "1 Jan 2025")
 */
function fmtDate(s) { if (!s) return '—'; const d = new Date(s); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

/**
 * Format month and year to readable format
 * @param {number} m - Month (1-12)
 * @param {number} y - Year
 * @returns {string} Formatted month/year (e.g., "January 2025")
 */
function monthYear(m, y) { const d = new Date(y, m - 1); return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); }

/**
 * Clamp value between min and max
 * @param {number} v - Value to clamp
 * @param {number} mn - Minimum
 * @param {number} mx - Maximum
 * @returns {number} Clamped value
 */
function clamp(v, mn, mx) { return Math.min(Math.max(v, mn), mx); }

/**
 * Parse money from form fields (removes commas, currency symbols, spaces)
 * @param {string} str - String to parse (e.g., "£1,234.56")
 * @returns {number} Parsed number or NaN if invalid
 */
function parseMoney(str) {
  if (str == null || str === '') return NaN;
  const cleaned = String(str).replace(/[£$,\s]/g, '').replace(/(?!^)-/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Format money input while typing (adds thousand separators)
 * Called on input event for money fields
 * @param {HTMLInputElement} input - Input element to format
 */
function formatMoney(input) {
  const isNegative = input.value.trim().startsWith('-');
  const raw = input.value.replace(/[^0-9.]/g, '');
  const parts = raw.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  input.value = (isNegative ? '-' : '') + parts.slice(0, 2).join('.');
}

// ── UI Helper Functions ─────────────────────────────

/**
 * Show toast notification message
 * @param {string} msg - Message to display
 */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3200);
}

/**
 * Close modal and reset editing state
 * @param {string} id - Modal element ID
 */
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  editingId = null;
  editingDebtIdx = null;
  editingSalaryIdx = null;
  editingBillIdx = null;
}

// Confirm dialog callback storage
let _confirmCallback = null;

/**
 * Show confirmation dialog
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @param {string} options.confirmText - Confirm button text
 * @param {boolean} options.danger - Show as dangerous action (red button)
 * @param {Function} options.onConfirm - Callback when confirmed
 */
function showConfirm({ title = 'Confirm', message = '', confirmText = 'Confirm', danger = false, onConfirm }) {
  const overlay = document.getElementById('confirmModal');
  const titleEl = document.getElementById('confirmModalTitle');
  const messageEl = document.getElementById('confirmModalMessage');
  const confirmBtn = document.getElementById('confirmModalConfirm');
  if (!overlay || !titleEl || !messageEl || !confirmBtn) return;

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;
  confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
  _confirmCallback = typeof onConfirm === 'function' ? onConfirm : null;
  overlay.classList.remove('hidden');
}

/**
 * Close confirmation dialog without action
 */
function closeConfirmModal() {
  const overlay = document.getElementById('confirmModal');
  if (overlay) overlay.classList.add('hidden');
  _confirmCallback = null;
}

/**
 * Execute confirm dialog callback
 */
function confirmModalAction() {
  const cb = _confirmCallback;
  closeConfirmModal();
  if (cb) cb();
}

/**
 * Toggle visibility of sensitive values (hide/show)
 * Adds/removes 'hidden-vals' class from body
 */
function toggleHide() {
  const isHidden = document.body.classList.toggle('hidden-vals');
  const icon = document.getElementById('eyeBtn').querySelector('span');
  icon.textContent = isHidden ? 'visibility_off' : 'visibility';
  S.settings.privacyMode = isHidden;
  save();
}

// ── Search Helper Functions ─────────────────────────────

/**
 * Clear search input and trigger input event
 * @param {string} inputId - Input element ID
 */
function clearSearch(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.focus();
  }
}

/**
 * Toggle search clear button visibility
 * Shows clear button when input has value, hides when empty
 * @param {string} inputId - Input element ID
 */
function toggleSearchClear(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const wrapper = input.closest('.search-wrapper');
  if (!wrapper) return;
  const clearBtn = wrapper.querySelector('.search-clear');
  if (!clearBtn) return;
  clearBtn.style.display = input.value ? 'block' : 'none';
}
