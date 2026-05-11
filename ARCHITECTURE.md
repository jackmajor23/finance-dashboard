# Finance Dashboard v4 - Modular Architecture

## Overview
The Finance Dashboard has been restructured from a 2265-line monolithic single-file application into a modular, maintainable architecture.

## Directory Structure

```
├── index.html                  # Main entry point (HTML shell + init)
├── src/
│   ├── state.js               # Central state management & persistence
│   ├── styles/
│   │   └── main.css           # Design system & component styles
│   ├── utils/
│   │   └── format.js          # Formatting & utility functions
│   ├── services/
│   │   ├── calculations.js    # Financial calculations (tax, net worth, etc.)
│   │   └── api.js             # External API calls (stock prices, etc.)
│   └── pages/
│       ├── index.js           # All page render functions
│       └── helpers.js         # UI helpers (add, edit, delete operations)
└── index.html.backup          # Original single-file version
```

## Module Descriptions

### `src/state.js` (93 lines)
**Purpose**: Central state management and localStorage persistence

**Exports**:
- `S` - Global state object containing all user data
- `save()` - Persists state to localStorage
- `loadState()` - Loads state from localStorage with defaults
- `_updateSidebarMeta()` - Updates sidebar with user info

**Data Model** (in `S`):
- `settings` - User preferences, currency, household mode
- `holdings` - Investment holdings (stocks, crypto, etc.)
- `closedHoldings` - Sold positions
- `accounts` - Bank accounts and ISAs
- `premiumBonds` - Premium bond holdings and wins
- `debts` - Debt tracking
- `goals` - Financial goals
- `salaries` - Income and tax info
- `watchlist` - Watched stock tickers
- `netWorthHistory` - Historical net worth for charting
- `transactions` - Transaction log
- `lastUpdated` - Timestamp of last save

### `src/utils/format.js` (103 lines)
**Purpose**: Formatting, calculation, and utility functions

**Exports**:
- `fmt(n)` - Format number as currency
- `fmtS(n)` - Format signed number (shows +/-)
- `fmtP(n)` - Format as percentage
- `fmtDate(s)` - Format date string
- `monthYear(m, y)` - Format month/year
- `formatMoney(input)` - Format input field for money entry
- `parseMoney(value)` - Parse money string to number
- `clamp(v, mn, mx)` - Constrain value between min/max
- `cls(n)` - Return CSS class for positive/negative values
- `pct(cur, inv)` - Calculate percentage change
- `toast(msg)` - Display notification
- `closeModal(id)` - Close modal dialog
- `toggleHide()` - Toggle value visibility
- `CUR()` - Get current currency symbol

### `src/services/calculations.js` (138 lines)
**Purpose**: Financial calculations and tax logic

**Exports**:
- `UK_TAX` - UK tax bands, thresholds, and student loan rates
- `ISA_INFO` - ISA types and annual limits
- `ACC_ICONS` - Icons for account types
- `ACC_COL` - Colors for account types
- `calcUKTax(gross, pensionPct, bonus, studentLoanPlan)` - Calculate UK income tax, NI, and student loan repayment
- `calculateNetWorth()` - Sum of all holdings and accounts minus debts
- `getISAInfo(type)` - Get ISA information by type

### `src/services/api.js` (170 lines)
**Purpose**: External API calls and data fetching

**Exports**:
- `_fetchPrice(ticker)` - Fetch stock price from Yahoo Finance API
- `refreshPrices()` - Refresh all watched prices
- `renderStocks()` - Display stock prices
- `addWatchTicker()` - Add ticker to watchlist
- `removeWatch(t)` - Remove ticker from watchlist
- `saveSettings()` - Save application settings
- `clearAll()` - Clear all user data
- `loadSample()` - Load sample financial data

### `src/pages/index.js` (1091 lines)
**Purpose**: All page rendering functions

**Exports** (render functions):
- `renderOverview()` - Dashboard overview with charts
- `renderHoldings()` - Investment holdings table
- `renderClosed()` - Closed/sold holdings
- `renderAccounts()` - Bank accounts and ISAs
- `renderPremiumBonds()` - Premium bonds tracker
- `renderSalary()` - Salary and income breakdown
- `renderDebts()` - Debt tracking
- `renderGoals()` - Financial goals
- `renderTransactions()` - Transaction log
- `renderTax()` - Tax summary (CGT, ISA allowance, etc.)
- `renderSettings()` - App settings

### `src/pages/helpers.js` (1125 lines)
**Purpose**: UI interaction helpers and form operations

**Key Functions**:
- `addHolding()`, `deleteHolding()`, `openEditHolding()`, `saveEditHolding()`, `sellHolding()` - Holding operations
- `addAccount()` - Add bank account or ISA
- `updatePB()`, `addPBWin()`, `deletePBWin()` - Premium bond operations
- `addNewPerson()`, `removePerson()`, `editPersonName()` - Household management
- `addSalary()`, `deleteSalary()`, `openEditSalary()`, `saveEditSalary()` - Salary management
- `addDebt()`, `openEditDebt()`, `saveEditDebt()` - Debt management
- `addGoal()` - Add financial goal
- `_addTx()`, `setTxFilter()`, `renderTransactions()` - Transaction operations
- Various UI state helpers (tab switching, filtering, etc.)

### `src/styles/main.css` (408 lines)
**Purpose**: Design system, component styles, and page layouts

**Contains**:
- Design tokens (colors, spacing, typography)
- Base resets and utilities
- Component styles (cards, tables, forms, modals)
- Layout classes (sidebar, pages, grids)
- Responsive utilities

## Load Order

The application loads modules in this order (see `index.html`):

1. **State** (`src/state.js`) - Must be first; provides `S` object
2. **Utils** (`src/utils/format.js`) - Provides formatting functions
3. **Services** (`src/services/calculations.js`, `src/services/api.js`) - Calculations and API calls
4. **Pages** (`src/pages/helpers.js`, `src/pages/index.js`) - Page rendering and interactions
5. **Inline JS** - Navigation, initialization, and page rendering dispatch

## Key Design Decisions

### 1. **Monolithic Pages Module** (`src/pages/`)
Instead of creating 10+ small files, page logic is in two consolidated files:
- `index.js` contains all `render*()` functions
- `helpers.js` contains all CRUD and form operations

**Why**: Easier to navigate related functionality; reduces import complexity; avoids circular dependencies.

### 2. **Global State Object (`S`)**
The entire application state lives in a single `S` object that's localStorage-persisted.

**Why**: Simplifies data flow; familiar React-like pattern; easy debugging (can inspect `S` in console).

### 3. **Inline Initialization**
App initialization happens in the inline `<script>` in `index.html` after all modules load.

**Why**: Simple; avoids extra HTTP request; easy to modify startup behavior.

### 4. **CSS Design System**
All styles are in a single `main.css` file with CSS custom properties (variables).

**Why**: Easier to maintain; all design tokens in one place; easier to implement dark mode later.

## Future Improvements

1. **Component Library**: Extract reusable UI components (Card, Table, Form) into separate files
2. **Type Safety**: Add TypeScript or JSDoc type annotations
3. **Module System**: Migrate to ES6 `import`/`export` with a bundler
4. **Testing**: Add unit tests for calculations and state management
5. **Dark Mode**: Add CSS variables for dark theme
6. **Localization**: Extract strings into i18n module
7. **Lazy Loading**: Load page modules on demand rather than at startup

## Migration Notes

This restructuring maintains 100% backward compatibility with the original:
- All data persists in the same localStorage key (`wealth-dashboard-v4`)
- The backup (`index.html.backup`) contains the original monolithic version
- Feature parity: No features were added or removed

## Development Tips

### Adding a New Page

1. Add render function to `src/pages/index.js`
2. Add helper functions to `src/pages/helpers.js`
3. Add button to sidebar nav in `index.html`
4. Add page div: `<div class="page" id="page-xxx"></div>`
5. Register in `PAGE_RENDERS` object: `'xxx': renderXxx`

### Adding a New Utility Function

1. Add to `src/utils/format.js`
2. Use in any module (loaded early in chain)

### Adding a Service/Calculation

1. Add to `src/services/calculations.js`
2. Export it so pages can use it

### Debugging

- All state is global: `console.log(S)` to see entire state
- Formatting: `fmt(1000)` to test currency formatting
- Load sample data: Click "Load sample data" button
- Check localStorage: `localStorage.getItem('wealth-dashboard-v4')`

---

**Version**: 4.0 (Modular)  
**Original Version**: 2265 lines single file  
**Refactored**: 2128 lines organized into 7 modules
