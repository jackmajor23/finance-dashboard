# AI Reference Guide - Wealth Dashboard

**Purpose:** Quick reference for AI assistants to understand the codebase structure, key functions, and data flow without extensive searching.

---

## Quick Architecture Overview

**Type:** Single-page vanilla JavaScript application (no build step, no server)
**Storage:** localStorage (key: `wealth-dashboard-v4`)
**Charts:** Chart.js 4.4.1 (CDN)
**Data Flow:** All state in global `S` object → save() → localStorage

---

## File Load Order (CRITICAL)

```
1. constants.js    - All global constants (UK_TAX, ISA_INFO, etc.)
2. state.js        - Global state S, formatting functions, save/load
3. overview.js     - Overview page rendering
4. investments.js  - Investment dashboard (holdings, live prices, alerts)
5. accounts.js     - Bank accounts, ISAs
6. properties.js   - Property tracking
7. premium-bonds.js - Premium bonds tracking
8. salary.js       - UK tax calculation, salary records
9. bills.js        - Bill tracking
10. pension.js     - Pension tracking
11. debts.js       - Debt tracking
12. goals.js       - Savings goals
13. transactions.js - Transaction logging
14. stocks.js      - Stock price fetching
15. tax.js         - Tax summary
16. settings.js    - App settings
17. nav.js         - Navigation routing
18. init.js        - Bootstrap (loads state, renders initial page)
```

**Dependencies:**
- `constants.js` must be first (defines all constants)
- `state.js` must be second (defines S and formatting functions)
- `nav.js` must be near end (defines PAGE_RENDERS)
- `init.js` must be last (bootstraps app)

---

## Global State Object (S)

```javascript
S = {
  // App settings
  settings: {
    name: '',                    // User name
    title: 'Financial Tracker',  // App title
    currency: '£',               // Currency symbol
    household: false,            // Enable household mode
    personNames: ['Person 1'],    // Array of person names
    domIds: {}                   // DOM element IDs
  },
  
  // Financial data arrays
  holdings: [],          // Investment holdings
  closedHoldings: [],    // Sold positions
  accounts: [],          // Bank accounts, ISAs
  premiumBonds: { amount: 0, date: '', wins: [] },
  debts: [],             // Loans, mortgages, credit cards
  goals: [],             // Savings goals
  salaries: [],          // Salary records per person
  bills: [],             // Recurring bills
  properties: [],        // Property records
  creditScores: [],      // Credit score history
  watchlist: [],         // Stock/crypto watchlist
  netWorthHistory: [],   // Daily NW snapshots {date, value}
  transactions: [],      // Transaction log
  
  // Metadata
  lastUpdated: null      // ISO timestamp
}
```

---

## Key Constants (constants.js)

### UK Tax Configuration
```javascript
UK_TAX = {
  personalAllowance: 12570,
  bands: [
    { name: 'Personal allowance', from: 0, to: 12570, rate: 0 },
    { name: 'Basic rate (20%)', from: 12570, to: 50270, rate: 20 },
    { name: 'Higher rate (40%)', from: 50270, to: 125140, rate: 40 },
    { name: 'Additional (45%)', from: 125140, to: Infinity, rate: 45 }
  ],
  ni: { ptWeekly: 242, uelWeekly: 967, mainRate: 8, upperRate: 2 }
}
```

### ISA Information
```javascript
ISA_INFO = {
  'stocks-isa': { name: 'Stocks & Shares ISA', limit: 20000, color: '#0a8f5c' },
  'cash-isa': { name: 'Cash ISA', limit: 20000, color: '#1d6fca' },
  'lifetime-isa': { name: 'Lifetime ISA (LISA)', limit: 4000, color: '#5046e5' },
  'help-to-buy-isa': { name: 'Help to Buy ISA', limit: 2400, color: '#b03070' },
  'innovative-isa': { name: 'Innovative Finance ISA', limit: 20000, color: '#0b7a6e' },
  'junior-isa': { name: 'Junior ISA', limit: 9000, color: '#b87309' }
}
```

### Student Loan Rules
```javascript
UK_STUDENT_LOAN_RULES = {
  plan1: { threshold: 24990, rate: 9, writeoff: 2027 },
  plan2: { threshold: 28470, rate: 9, writeoff: 2042 },
  plan4: { threshold: 32745, rate: 9, writeoff: 2036 },
  plan5: { threshold: 25000, rate: 9, writeoff: 2051 },
  postgrad: { threshold: 21000, rate: 6, writeoff: 2033 }
}
```

---

## Key Utility Functions (state.js)

### Formatting Functions
```javascript
CUR()                    // Returns currency symbol (£ or $)
fmt(n)                   // Format as currency: £1,234
fmtS(n)                  // Format signed: +£1,234 or -£1,234
fmtP(n)                  // Format percentage: +12.5%
fmtDate(s)               // Format date: 1 Jan 2025
monthYear(m, y)          // Format: January 2025
pct(cur, inv)            // Calculate percentage return
cls(n)                   // Return 'pos' or 'neg' class
```

### Money Functions
```javascript
parseMoney(str)          // Parse "£1,234.56" → 1234.56
formatMoney(input)       // Format input while typing (adds commas)
```

### State Management
```javascript
save()                   // Save S to localStorage
loadState()              // Load S from localStorage
normalizePeopleAndLinks() // Ensure person indices are valid
removePersonLinkedData(idx) // Clean up data when person removed
```

### UI Helpers
```javascript
toast(msg)               // Show notification toast
closeModal(id)           // Close modal by ID
showConfirm({title, message, onConfirm}) // Show confirm dialog
toggleHide()             // Toggle visibility of sensitive values
clearSearch(inputId)     // Clear search input
toggleSearchClear(inputId) // Show/hide clear button
```

---

## Page Render Functions (nav.js PAGE_RENDERS)

```javascript
PAGE_RENDERS = {
  'overview': renderOverview,
  'investments': renderInvestments,
  'accounts': renderAccounts,
  'properties': renderProperties,
  'premium-bonds': renderPremiumBonds,
  'salary': renderSalary,
  'bills': renderBills,
  'pension': renderPension,
  'debts': renderDebts,
  'goals': renderGoals,
  'transactions': renderTransactions,
  'tax': renderTax,
  'settings': renderSettings
}
```

**Navigation:** `nav(pageId, element)` - switches active page and calls render function

---

## Key Data Structures

### Holding/Investment
```javascript
{
  id: 1234567890,        // Timestamp
  name: 'Vanguard S&P 500',
  ticker: 'VUSA.L',
  type: 'isa',           // stocks, isa, crypto, cash, pension, property, other
  invested: 10000,
  current: 12500,
  buyPrice: 100,
  shares: 100,
  buyDate: '2024-01-15',
  wrapper: 'stocks-isa',  // Account wrapper
  notes: 'Long-term hold'
}
```

### Account
```javascript
{
  name: 'Vanguard ISA',
  type: 'stocks-isa',     // current, savings, joint, stocks-isa, cash-isa, etc.
  provider: 'Vanguard',
  balance: 15000,
  contrib: 8000,         // Contributed this tax year
  person: 0              // Person index
}
```

### Debt
```javascript
{
  name: 'Mortgage',
  type: 'Mortgage',
  total: 200000,
  remaining: 180000,
  rate: 4.5,
  monthlyPayment: 1200,
  person: 0,
  shared: false,
  sharedPeople: [],       // If shared debt
  studentLoanPlan: null  // If student loan
}
```

### Salary
```javascript
{
  gross: 50000,
  pensionPct: 5,
  bonus: 5000,
  studentLoanPlan: 'plan2',
  perks: [],
  person: 0
}
```

### Transaction
```javascript
{
  txtype: 'buy',         // buy, sell, win, deposit, withdrawal
  date: '2024-01-15',
  desc: 'Bought VUSA.L',
  amount: 10000,
  pnl: 0,
  notes: ''
}
```

---

## Common Patterns

### Adding a New Item
```javascript
function addXxx() {
  const name = document.getElementById('xxxName').value.trim();
  const value = parseMoney(document.getElementById('xxxValue').value);
  
  if (!name || isNaN(value)) {
    toast('Please fill required fields');
    return;
  }
  
  S.xxx.push({ id: Date.now(), name, value });
  save();
  renderXxx();
  toast(`Added ${name}`);
  
  // Clear form
  document.getElementById('xxxName').value = '';
  document.getElementById('xxxValue').value = '';
}
```

### Editing an Item
```javascript
function openEditXxx(id) {
  editingId = id;
  const item = S.xxx.find(x => x.id === id);
  if (!item) return;
  
  // Populate modal fields
  document.getElementById('editName').value = item.name;
  document.getElementById('editValue').value = item.value;
  
  document.getElementById('editModal').classList.remove('hidden');
}

function saveEditXxx() {
  const item = S.xxx.find(x => x.id === editingId);
  if (!item) return;
  
  item.name = document.getElementById('editName').value;
  item.value = parseMoney(document.getElementById('editValue').value);
  
  save();
  closeModal('editModal');
  renderXxx();
  toast('Saved');
}
```

### Deleting an Item
```javascript
function deleteXxx(id) {
  S.xxx = S.xxx.filter(x => x.id !== id);
  save();
  renderXxx();
  toast('Deleted');
}
```

---

## DOM Helper Functions (dom-helpers.js)

```javascript
renderHoldingRow(h, originalIndex)  // Generic holding table row
renderStatCard(label, value, subtext, className)  // Stats card HTML
renderInvestmentTypeStats(holdings, elementId, typeLabel)  // Stats calculation
createFormField(type, id, label, value, options)  // Modal field generator
renderPersonTabs(currentIdx, names, callback)  // Person tab buttons
renderPersonManagementCards(names, idx, editCb, deleteCb)  // Person cards
renderEmptyState(icon, message, colspan)  // Empty state HTML
renderTypePill(type, prefix)  // Type badge pill
renderProgressBar(percent, color)  // Progress bar HTML
```

---

## Investment Dashboard Features (investments.js)

### State Variables
```javascript
lastPrices = {}          // Cache of last fetched prices
sparkHistory = {}       // Mini chart history
fxRate = 1.27           // USD → GBP conversion
displayCcy = 'GBP'      // Current display currency
sortStates = {}         // Sort state per tab
allFilter = 'all'       // Filter for "All" tab
priceAlerts = []        // Price alert configuration
```

### Key Functions
```javascript
fetchAllLivePrices()    // Fetch all prices from Yahoo Finance
renderInvestments()     // Main render function
invTab(tab, el)         // Switch investment tab
setSortCol(tab, col)    // Set sort column
setHFilter(filter, el)  // Set holding filter
toggleDisplayCurrency() // Toggle GBP/USD
exportHoldingsCSV()     // Export holdings to CSV
```

### Tabs
- all: All holdings with filtering
- stocks: Stock/ETF holdings only
- crypto: Crypto holdings only
- watchlist: Price cards for watched symbols
- closed: Closed positions
- heatmap: Portfolio heatmap visualization
- dividends: Dividend tracker
- alerts: Price alert configuration
- add: Add new holding form

---

## Person Management

**Multi-person support:** Most modules support multiple people via `person` index (0, 1, 2, etc.)

**Person array:** `S.settings.personNames = ['Person 1', 'Person 2']`

**Clamping:** All person indices are clamped to valid range to prevent errors

**Household view:** Some modules (salary) have a "Household" tab that aggregates data across all people

---

## Chart.js Usage

**Chart instances:** `donutChart`, `barChart`, `nwChart` (defined in state.js)

**Common pattern:**
```javascript
if (chartInstance) chartInstance.destroy();
chartInstance = new Chart(canvasElement, {
  type: 'doughnut' | 'bar' | 'line',
  data: { labels, datasets: [...] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { ... }
  }
});
```

---

## External Dependencies

**Chart.js:** CDN `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js`

**Yahoo Finance API:** Used for live stock prices (15-min delayed, no API key needed)

**No other external dependencies** - all other functionality is vanilla JS

---

## Common Issues & Solutions

### Issue: "undefined is not a function"
- Check script load order in index.html
- Ensure dependencies are loaded before use

### Issue: Data not persisting
- Check that `save()` is called after state changes
- Verify localStorage key is `wealth-dashboard-v4`

### Issue: Person index out of bounds
- Use `normalizePeopleAndLinks()` after person changes
- Person indices are auto-clamped in state.js

### Issue: Chart not rendering
- Destroy old chart instance before creating new one
- Check canvas element exists in DOM

---

## File Purposes Summary

| File | Purpose | Key Functions |
|------|---------|---------------|
| constants.js | All global constants | UK_TAX, ISA_INFO, DEBT_TYPES |
| state.js | State management | save(), loadState(), fmt(), toast() |
| overview.js | Dashboard overview | renderOverview(), chart rendering |
| investments.js | Investment tracking | renderInvestments(), fetchAllLivePrices() |
| accounts.js | Bank/ISA accounts | renderAccounts(), addAccount() |
| properties.js | Property tracking | renderProperties(), mortgage calc |
| premium-bonds.js | Premium bonds | renderPremiumBonds(), addPBWin() |
| salary.js | Salary/tax calc | renderSalary(), calcUKTax() |
| bills.js | Bill tracking | renderBills(), addBill() |
| pension.js | Pension tracking | renderPension(), projection calc |
| debts.js | Debt tracking | renderDebts(), debt payoff calc |
| goals.js | Savings goals | renderGoals(), addGoal() |
| transactions.js | Transaction log | renderTransactions(), _addTx() |
| stocks.js | Stock prices | refreshPrices(), renderStocks() |
| tax.js | Tax summary | renderTax(), CGT calc |
| settings.js | App settings | renderSettings(), person mgmt |
| nav.js | Navigation | nav(), PAGE_RENDERS |
| dom-helpers.js | DOM helpers | renderHoldingRow(), createFormField() |
| init.js | Bootstrap | loadState(), renderOverview() |

---

## Quick Search Terms

When searching the codebase, use these terms:
- "render" - Find render functions
- "add" - Find add/create functions
- "delete" - Find delete/remove functions
- "edit" - Find edit/update functions
- "S." - Find state object usage
- "fmt" - Find formatting functions
- "toast" - Find notification calls
- "save()" - Find state persistence points
- "localStorage" - Find storage operations
- "Chart" - Find chart rendering code
- "person" - Find multi-person support code

---

## Data Flow Diagram

```
User Action → Form Input → Parse/Validate → Update S → save() → localStorage
                                                              ↓
                                                    renderXxx() → Update DOM
```

**Example:**
```
User enters holding → parseMoney() → S.holdings.push() → save() → localStorage
                                                          ↓
                                            renderHoldings() → Update table
```

---

## CSS Classes (main.css)

**Layout:** `.app`, `.sidebar`, `.main`, `.page`

**Cards:** `.card`, `.stat-card`, `.acc-card`

**Buttons:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.icon-btn`

**Forms:** `.form-box`, `.form-grid`, `.ff` (form field), `.money-field`

**Tables:** `.table-wrap`, `.inv-table`

**Navigation:** `.nav-item`, `.tab-btn`, `.person-btn`

**Utility:** `.hidden`, `.val` (value formatting), `.pos`/`.neg` (color classes)

---

## Testing Checklist

When making changes:
1. ✅ Check script load order in index.html
2. ✅ Verify constants are defined before use
3. ✅ Ensure save() is called after state changes
4. ✅ Test with empty state (no data)
5. ✅ Test with multiple people
6. ✅ Verify chart instances are destroyed before recreation
7. ✅ Check localStorage key consistency
8. ✅ Test form validation
9. ✅ Verify person index clamping
10. ✅ Check modal open/close functionality

---

## Performance Notes

- Chart instances are destroyed before recreation to prevent memory leaks
- Net worth history is limited to 730 days (2 years)
- Live prices are cached in `lastPrices` object
- DOM updates are batched where possible
- localStorage operations are synchronous but fast for this data size

---

## Security Notes

- No data leaves the device (localStorage only)
- No API keys used (Yahoo Finance is public)
- No server communication
- Input validation on all form fields
- Person indices are clamped to prevent array access errors

---

## Future Enhancement Ideas

- [ ] Add data export to JSON
- [ ] Add data import from JSON
- [ ] Add recurring transaction support
- [ ] Add budget tracking
- [ ] Add net worth projection
- [ ] Add inflation adjustment
- [ ] Add currency conversion for multiple currencies
- [ ] Add dark mode toggle
- [ ] Add mobile app (React Native)
- [ ] Add backend for cloud sync

---

**Last Updated:** 2025-01-20
**Version:** Based on current codebase structure
