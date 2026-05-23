# Wealth Dashboard

A personal finance dashboard — tracks investments, accounts, ISAs, salary, debts, goals, premium bonds, properties, bills, pension and live stock prices. Runs entirely in the browser with no server, no database, no build step.

## Project structure

```
wealth-dashboard/
├── index.html          # App shell: sidebar nav, page divs, modals
├── css/
│   └── main.css        # Full design system — tokens, components, layouts
├── js/
│   ├── constants.js    # Global constants: UK_TAX, ISA_INFO, DEBT_TYPES, etc.
│   ├── state.js        # Global state (S), localStorage save/load, formatting utils
│   ├── overview.js     # renderOverview() + donut/bar/NW/goal-rings charts
│   ├── investments.js  # Investment dashboard: holdings, live prices, alerts, dividends
│   ├── accounts.js     # ISA_INFO, renderAccounts(), addAccount()
│   ├── properties.js   # Property tracking, mortgage calculations
│   ├── premium-bonds.js# renderPremiumBonds(), addPBWin(), prize history
│   ├── salary.js       # UK tax calc, renderSalary(), household view, perks
│   ├── bills.js        # Bill tracking, recurring expenses, emoji picker
│   ├── pension.js      # Pension pot tracking, projections
│   ├── debts.js        # renderDebts(), addDebt(), student loan calc
│   ├── goals.js        # renderGoals(), addGoal(), progress tracking
│   ├── transactions.js # _addTx(), renderTransactions(), filtering
│   ├── stocks.js       # refreshPrices(), renderStocks(), watchlist
│   ├── tax.js          # renderTax() — CGT, ISA allowance, salary summary
│   ├── settings.js     # saveSettings(), clearAll(), loadSample(), person mgmt
│   ├── nav.js          # nav(), PAGE_RENDERS dispatch table
│   ├── dom-helpers.js  # Generic DOM rendering helpers (tables, modals, etc.)
│   └── init.js         # Bootstrap: loadState → renderOverview → set PB date
└── src/                # Legacy/duplicate code (can be ignored)
    ├── pages/
    │   ├── helpers.js  # Old helper functions (superseded by js/dom-helpers.js)
    │   └── index.js    # Old page renders (superseded by individual js files)
    └── state.js        # Old state file (superseded by js/state.js)
```

## Script load order

Files must load in this order (enforced in index.html):

```
constants.js → state.js → overview.js → investments.js → accounts.js →
properties.js → premium-bonds.js → salary.js → bills.js → pension.js →
debts.js → goals.js → transactions.js → stocks.js → tax.js → settings.js →
nav.js → init.js
```

**Dependencies:**
- `constants.js` must load first as it defines all global constants
- `state.js` must load second as it defines the global state object `S` and formatting utilities
- `overview.js` depends on `state.js` for formatting functions
- `investments.js` depends on `state.js` for live prices and formatting
- `accounts.js` must load before `overview.js` because overview uses `ISA_INFO` (now in constants.js)
- `transactions.js` must load before any page that calls `_addTx()`
- `nav.js` must load near the end as it defines the PAGE_RENDERS dispatch table
- `init.js` must load last as it bootstraps the application

## Key globals

| Variable | Declared in | Used by | Description |
|---|---|---|
| `S` | state.js | everything | Global state object, persisted to localStorage |
| `UK_TAX` | constants.js | salary.js, tax.js | UK tax bands and NI rates for 2025/26 |
| `UK_TAX_NEXT` | constants.js | salary.js, tax.js | UK tax bands for 2026/27 |
| `ISA_INFO` | constants.js | accounts.js, overview.js, tax.js | ISA types, limits, and descriptions |
| `DEBT_TYPES` | constants.js | debts.js | Array of debt type strings |
| `HOLDING_TYPES` | constants.js | investments.js | Array of holding type strings |
| `donutChart`, `barChart`, `nwChart` | state.js | overview.js | Chart.js instances |
| `hFilter`, `txFilter` | state.js | investments.js, transactions.js | Filter state variables |
| `editingId`, `editingDebtIdx`, `editingSalaryIdx` | state.js | Multiple files | Currently editing item IDs |
| `livePrices` | state.js | investments.js, stocks.js | Live stock price cache |
| `currentPersonIdx` | salary.js | salary.js | Current person tab index |
| `CUR`, `fmt`, `fmtS`, `fmtP` | state.js | all pages | Currency formatting functions |
| `fmtDate`, `monthYear` | state.js | all pages | Date formatting functions |
| `parseMoney`, `formatMoney` | state.js | all pages | Money input parsing and formatting |
| `toast` | state.js | all pages | Notification toast function |
| `PAGE_RENDERS` | nav.js | nav() | Page render function dispatch table |
| `priceAlerts` | investments.js | investments.js | Price alert configuration |
| `fxRate`, `displayCcy` | investments.js | investments.js | FX rate and display currency |

## Hosting on GitHub Pages (free)

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages → Source → Deploy from branch → main / (root)**
3. Your dashboard is live at `https://yourusername.github.io/wealth-dashboard`

## Adding a new page

1. Add a `<button class="nav-item">` in the sidebar in `index.html`
2. Add a `<div class="page" id="page-xxx">` with its HTML in `index.html`
3. Create `js/xxx.js` with a `renderXxx()` function
4. Add `'xxx': renderXxx` to `PAGE_RENDERS` in `nav.js`
5. Add `<script src="js/xxx.js"></script>` in `index.html` in the correct load order

## Data storage

All data lives in `localStorage` under the key `wealth-dashboard-v4` (defined as `SK` in state.js). Open browser devtools → Application → Local Storage to inspect or clear it. No data ever leaves your device.

**State structure (S object):**
```javascript
{
  settings: { name, title, currency, household, personNames, domIds },
  holdings: [],           // Investment holdings
  closedHoldings: [],     // Sold/closed positions
  accounts: [],           // Bank accounts, ISAs, savings
  premiumBonds: { amount, date, wins: [] },
  debts: [],              // Loans, mortgages, credit cards
  goals: [],              // Savings goals
  salaries: [],           // Salary records per person
  bills: [],              // Recurring bills/expenses
  properties: [],         // Property records
  creditScores: [],        // Credit score history
  watchlist: [],          // Stock/crypto watchlist
  netWorthHistory: [],   // Daily net worth snapshots
  transactions: [],       // Transaction log
  lastUpdated: null        // ISO timestamp
}
```

## UK tax note (2025/26)

The salary calculator uses HMRC rates for 2025/26 (defined in `UK_TAX` constant):
- Personal allowance: £12,570
- Basic rate (20%): £12,571–£50,270
- Higher rate (40%): £50,271–£125,140
- Additional rate (45%): above £125,140

**ISA allowances (2025/26):**
- Stocks & Shares ISA: £20,000/year
- Cash ISA: £20,000/year (shared with S&S ISA)
- Lifetime ISA: £4,000/year (with 25% government bonus)
- Junior ISA: £9,000/year
- Innovative Finance ISA: £20,000/year (shared allowance)

**CGT allowance:** £3,000 (frozen until 2029)

NI and student loan repayments are estimated. For official figures, use HMRC's calculators or speak to an accountant.

## Features by module

**Investments (investments.js):**
- Live stock prices via Yahoo Finance (15-min delayed)
- Holdings tracking with P&L calculations
- Price alerts with notifications
- Dividend tracker
- Portfolio heatmap
- CSV export
- Currency toggle (GBP/USD)
- Watchlist with price cards
- Closed positions tracking

**Accounts (accounts.js):**
- Bank accounts, ISAs, savings tracking
- ISA allowance tracking per type
- Multiple person support
- Account type icons and colors

**Salary (salary.js):**
- UK tax calculation with NI
- Student loan repayment calculations (Plans 1, 2, 4, 5, Postgrad)
- Multiple salary records per person
- Perks tracking (car, healthcare, gym, etc.)
- Household view
- Take-home pay breakdown

**Properties (properties.js):**
- Property tracking with valuation
- Mortgage calculations
- Rental income tracking
- Equity calculations

**Premium Bonds (premium-bonds.js):**
- Bond holding tracking (max £50,000)
- Prize logging with history
- Effective return calculation
- Auto-add winnings to holding

**Bills (bills.js):**
- Recurring bill tracking
- Emoji picker for categories
- Monthly/weekly/yearly views
- Bill history

**Pension (pension.js):**
- Pension pot tracking
- Contribution tracking
- Projection calculations

**Debts (debts.js):**
- Debt tracking with payoff timelines
- Student loan calculations
- Shared debt support
- Extra payment "what if" scenarios

**Goals (goals.js):**
- Savings goal tracking
- Progress visualization
- Goal categories with emojis

**Transactions (transactions.js):**
- Transaction logging
- Filtering by type
- Transaction history

**Tax (tax.js):**
- CGT calculations
- ISA allowance summary
- Salary tax summary
- Tax year overview

**Settings (settings.js):**
- App customization (name, title, currency)
- Person management
- Data export/import
- Sample data loading
- Data clearing
