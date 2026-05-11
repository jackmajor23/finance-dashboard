# Wealth Dashboard

A personal finance dashboard — tracks holdings, accounts, ISAs, salary, debts, goals, premium bonds and live stock prices. Runs entirely in the browser with no server, no database, no build step.

## Project structure

```
wealth-dashboard/
├── index.html          # App shell: sidebar nav, page divs, modals
├── css/
│   └── main.css        # Full design system — tokens, components, layouts
└── js/
    ├── state.js        # Global state (S), localStorage save/load, sidebar meta
    ├── utils.js        # fmt, fmtS, fmtP, fmtDate, toast, parseMoney, etc.
    ├── nav.js          # nav(), hTab(), PAGE_RENDERS dispatch table
    ├── overview.js     # renderOverview() + donut/bar/NW/goal-rings charts
    ├── holdings.js     # renderHoldings(), renderClosed(), add/edit/sell
    ├── accounts.js     # ISA_INFO, renderAccounts(), addAccount()
    ├── premium-bonds.js# renderPremiumBonds(), addPBWin(), undo
    ├── salary.js       # UK tax calc, renderSalary(), household view
    ├── debts.js        # renderDebts(), addDebt(), openEditDebt()
    ├── goals.js        # renderGoals(), addGoal()
    ├── stocks.js       # refreshPrices(), renderStocks(), watchlist
    ├── transactions.js # _addTx(), renderTransactions(), filter
    ├── tax.js          # renderTax() — CGT, ISA allowance, salary
    ├── settings.js     # saveSettings(), clearAll(), loadSample()
    └── init.js         # Bootstrap: loadState → renderOverview → set PB date
```

## Script load order

Files must load in this order (enforced in index.html):

```
state.js → utils.js → transactions.js → accounts.js →
overview.js → holdings.js → premium-bonds.js → salary.js →
debts.js → goals.js → stocks.js → tax.js → settings.js →
nav.js → init.js
```

`accounts.js` must load before `overview.js` because overview uses `ISA_INFO`.  
`transactions.js` must load before any page that calls `_addTx()`.

## Key globals

| Variable | Declared in | Used by |
|---|---|---|
| `S` | state.js | everything |
| `donutChart`, `barChart`, `nwChart` | state.js | overview.js |
| `hFilter`, `txFilter`, `editingId` etc. | state.js | holdings/debts/salary |
| `livePrices` | state.js | stocks.js, holdings.js |
| `ISA_INFO` | accounts.js | overview.js, tax.js |
| `UK_TAX` | salary.js | tax.js |
| `currentPersonIdx` | salary.js | salary.js only |
| `CUR`, `fmt`, `fmtS`, `_addTx` | utils/transactions.js | all pages |
| `PAGE_RENDERS` | nav.js | nav() |

## Hosting on GitHub Pages (free)

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages → Source → Deploy from branch → main / (root)**
3. Your dashboard is live at `https://yourusername.github.io/wealth-dashboard`

## Adding a new page

1. Add a `<button class="nav-item">` in the sidebar in `index.html`
2. Add a `<div class="page" id="page-xxx">` with its HTML in `index.html`
3. Create `js/xxx.js` with a `renderXxx()` function
4. Add `'xxx': renderXxx` to `PAGE_RENDERS` in `nav.js`
5. Add `<script src="js/xxx.js"></script>` in `index.html`

## Data

All data lives in `localStorage` under the key `wealth_v4`. Open browser devtools → Application → Local Storage to inspect or clear it. No data ever leaves your device.

## UK tax note (2025/26)

The salary calculator uses HMRC rates for 2025/26:
- Personal allowance: £12,570
- Basic rate (20%): £12,571–£50,270
- Higher rate (40%): £50,271–£125,140
- Additional rate (45%): above £125,140

NI and student loan repayments are estimated. For official figures, use HMRC's calculators or speak to an accountant.
