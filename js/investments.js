// ══════════════════════════════════════════════════════════════════
// investments.js  –  Upgraded Investment Dashboard
// New: price alerts · dividend tracker · heatmap · CSV export
//      currency toggle (GBP/USD) · sortable columns · 52w badges
//      investment thesis notes · portfolio snapshot bar · FX rate
//      watchlist fix · holdings count badges · cell flash on refresh
// ══════════════════════════════════════════════════════════════════

// ─── State ───────────────────────────────────────────────────────
let lastPrices = {};
let sparkHistory = {};
let sparkCharts = {};
let invAllocDoughnut = null, invHoldingsValueBar = null, invPlBar = null;
let liveInterval = null;
let fxRate = 1.27;   // USD → GBP default; refreshed on load
let displayCcy = 'GBP';  // 'GBP' | 'USD'

// Sort state per tab: { col, dir }
let sortStates = {
  all: { col: 'name', dir: 'asc' },
  stocks: { col: 'name', dir: 'asc' },
  crypto: { col: 'name', dir: 'asc' },
  other: { col: 'name', dir: 'asc' },
};

// allFilter — filter chips in "All" tab
let allFilter = 'all';

// Price alerts: [{ sym, dir:'above'|'below', price, triggered:bool }]
if (!window.priceAlerts) window.priceAlerts = [];

// Dividends: [{ holdingId, date, amount, notes }]
// stored on S.dividends

const WATCHED_SYMBOLS = [
  { sym: 'AAPL', name: 'Apple Inc.', type: 'stock', currency: '$' },
  { sym: 'MSFT', name: 'Microsoft', type: 'stock', currency: '$' },
  { sym: 'NVDA', name: 'NVIDIA', type: 'stock', currency: '$' },
  { sym: 'TSLA', name: 'Tesla', type: 'stock', currency: '$' },
  { sym: 'AMZN', name: 'Amazon', type: 'stock', currency: '$' },
  { sym: 'GOOGL', name: 'Alphabet', type: 'stock', currency: '$' },
  { sym: 'META', name: 'Meta Platforms', type: 'stock', currency: '$' },
  { sym: 'VUSA.L', name: 'S&P 500 ETF', type: 'etf', currency: '£' },
  { sym: 'BTC-USD', name: 'Bitcoin', type: 'crypto', currency: '$' },
  { sym: 'ETH-USD', name: 'Ethereum', type: 'crypto', currency: '$' },
  { sym: 'SOL-USD', name: 'Solana', type: 'crypto', currency: '$' },
  { sym: 'BNB-USD', name: 'BNB', type: 'crypto', currency: '$' },
  { sym: '^GSPC', name: 'S&P 500', type: 'index', currency: '' },
  { sym: '^IXIC', name: 'NASDAQ', type: 'index', currency: '' },
  { sym: '^FTSE', name: 'FTSE 100', type: 'index', currency: '' },
  { sym: '^DJI', name: 'Dow Jones', type: 'index', currency: '' },
];

const MKT_SUMMARY_SYMS = ['^GSPC', '^IXIC', '^FTSE', '^DJI'];
const LIVE_REFRESH_MS = 60_000;

// ─── FX fetch ────────────────────────────────────────────────────
async function fetchFxRate() {
  try {
    const r = await fetchQuote('GBPUSD=X');
    if (r && r.price) {
      fxRate = r.price;
      const el = document.getElementById('fxRateChip');
      if (el) el.textContent = `£1 = $${fxRate.toFixed(4)}`;
    }
  } catch { /* keep default */ }
}

// ─── Quote fetch ─────────────────────────────────────────────────
async function fetchQuote(sym) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('empty');
    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close || [];
    const sparkline = closes.filter(v => v != null).slice(-30);
    const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
    const change = meta.regularMarketPrice - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    return {
      sym,
      price: meta.regularMarketPrice,
      prevClose,
      open: meta.regularMarketOpen,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      volume: meta.regularMarketVolume,
      currency: meta.currency,
      marketState: meta.marketState,
      sparkline, change, changePct,
    };
  } catch { return null; }
}

async function fetchAllLivePrices() {
  const btn = document.getElementById('liveRefreshBtn');
  if (btn) btn.disabled = true;
  setStatusBar('Fetching live prices…');

  // also get all tickers in user's watchlist that aren't already in WATCHED_SYMBOLS
  const extraSyms = (S.watchlist || []).filter(
    w => !WATCHED_SYMBOLS.find(x => x.sym === w.sym)
  );
  const allSyms = [...WATCHED_SYMBOLS, ...extraSyms];

  const results = await Promise.all(allSyms.map(w => fetchQuote(w.sym)));
  let loaded = 0;
  results.forEach((r, i) => {
    if (!r) return;
    lastPrices[r.sym] = livePrices[r.sym]?.price;
    livePrices[r.sym] = r;
    sparkHistory[r.sym] = r.sparkline;
    loaded++;
  });

  // Check price alerts after fresh data
  checkPriceAlerts();

  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  setStatusBar(`${loaded} symbols loaded · ${now}`);
  if (btn) btn.disabled = false;

  renderTickerTape();
  renderMarketSummary();
  renderPriceGrid();
  renderHoldingsWithLive();
  renderInvestmentStats();
  renderStocksStats();
  renderCryptoStats();
  renderPortfolioSnapshot();
}

function startLiveRefresh() {
  clearInterval(liveInterval);
  liveInterval = setInterval(fetchAllLivePrices, LIVE_REFRESH_MS);
}

function setStatusBar(msg) {
  const el = document.getElementById('liveStatusBar');
  if (el) el.textContent = msg;
}

// ─── Currency helpers ─────────────────────────────────────────────
function toDisplayCcy(usdVal) {
  return displayCcy === 'GBP' ? usdVal / fxRate : usdVal;
}

function displayCcySymbol() {
  return displayCcy === 'GBP' ? '£' : '$';
}

function toggleDisplayCurrency() {
  displayCcy = displayCcy === 'GBP' ? 'USD' : 'GBP';
  const btn = document.getElementById('ccyToggleBtn');
  if (btn) btn.textContent = `Show in ${displayCcy === 'GBP' ? 'USD $' : 'GBP £'}`;
  renderHoldingsWithLive();
  renderInvestmentStats();
  renderStocksStats();
  renderCryptoStats();
  renderPortfolioSnapshot();
}

// ─── Ticker tape ─────────────────────────────────────────────────
function renderTickerTape() {
  const el = document.getElementById('tickerInner');
  if (!el) return;
  const items = WATCHED_SYMBOLS
    .filter(w => livePrices[w.sym])
    .map(w => {
      const d = livePrices[w.sym];
      const dir = d.changePct >= 0 ? 'up' : 'dn';
      const pfx = d.currency === 'GBP' ? '£' : d.currency === 'USD' ? '$' : '';
      return `<span class="ticker-item">
        <span class="ticker-sym">${w.sym.replace('-USD', '').replace('.L', '')}</span>
        <span class="ticker-price">${pfx}${fmtPrice(d.price, d.sym)}</span>
        <span class="ticker-chg ${dir}">${d.changePct >= 0 ? '▲' : '▼'} ${Math.abs(d.changePct).toFixed(2)}%</span>
      </span>`;
    });
  const doubled = items.join('') + items.join('');
  el.innerHTML = doubled || '<span class="ticker-item">Loading market data…</span>';
}

// ─── Market summary ───────────────────────────────────────────────
function renderMarketSummary() {
  const el = document.getElementById('mktSummaryStrip');
  if (!el) return;
  el.innerHTML = MKT_SUMMARY_SYMS.map(sym => {
    const info = WATCHED_SYMBOLS.find(w => w.sym === sym);
    const d = livePrices[sym];
    if (!d) return `<div class="mkt-card"><div class="mkt-label">${info?.name || sym}</div><div class="mkt-val">—</div></div>`;
    const dir = d.changePct >= 0;
    return `<div class="mkt-card">
      <div class="mkt-label">${info?.name || sym}</div>
      <div class="mkt-val">${fmtPrice(d.price, sym, 0)}</div>
      <div class="mkt-sub ${dir ? 'pos' : 'neg'}">${dir ? '+' : ''}${d.change.toFixed(2)} (${dir ? '+' : ''}${d.changePct.toFixed(2)}%)</div>
    </div>`;
  }).join('');
}

// ─── Portfolio snapshot bar ───────────────────────────────────────
function renderPortfolioSnapshot() {
  const el = document.getElementById('portfolioSnapshot');
  if (!el) return;
  const { invested, current } = computeWithLive(S.holdings);
  const pl = current - invested;
  const ret = invested ? ((current / invested - 1) * 100) : 0;
  const dayPL = S.holdings.reduce((sum, h) => {
    const d = getLivePrice(h.ticker);
    if (!d || !d.changePct) return sum;
    const val = d.price * (parseFloat(h.shares) || 1);
    return sum + (val * d.changePct / 100);
  }, 0);
  const div = (S.dividends || []).reduce((s, d) => s + d.amount, 0);
  const sym = displayCcySymbol();

  el.innerHTML = `
    <div class="snap-card snap-accent">
      <div class="snap-label">Total invested</div>
      <div class="snap-val val">${sym}${fmt2(toDisplayCcy(invested))}</div>
    </div>
    <div class="snap-card ${pl >= 0 ? 'snap-green' : 'snap-red'}">
      <div class="snap-label">Portfolio value</div>
      <div class="snap-val val ${pl >= 0 ? 'pos' : 'neg'}">${sym}${fmt2(toDisplayCcy(current))}</div>
      <div class="snap-sub">${ret >= 0 ? '+' : ''}${ret.toFixed(2)}% total</div>
    </div>
    <div class="snap-card ${pl >= 0 ? 'snap-green' : 'snap-red'}">
      <div class="snap-label">Unrealised P&amp;L</div>
      <div class="snap-val val ${pl >= 0 ? 'pos' : 'neg'}">${pl >= 0 ? '+' : ''}${sym}${fmt2(toDisplayCcy(Math.abs(pl)))}</div>
    </div>
    <div class="snap-card ${dayPL >= 0 ? 'snap-green' : 'snap-red'}">
      <div class="snap-label">Today's move</div>
      <div class="snap-val val ${dayPL >= 0 ? 'pos' : 'neg'}">${dayPL >= 0 ? '+' : ''}${sym}${fmt2(toDisplayCcy(Math.abs(dayPL)))}</div>
    </div>
    <div class="snap-card snap-blue">
      <div class="snap-label">Dividends received</div>
      <div class="snap-val val">${sym}${fmt2(toDisplayCcy(div))}</div>
    </div>
  `;
}

// ─── Heatmap ──────────────────────────────────────────────────────
function renderHeatmap() {
  const el = document.getElementById('heatmapGrid');
  if (!el || !S.holdings.length) {
    if (el) el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:16px;">Add holdings to see heatmap.</div>';
    return;
  }
  el.innerHTML = S.holdings.map(h => {
    const live = getLivePrice(h.ticker);
    const cur = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    const ret = h.invested ? ((cur / h.invested - 1) * 100) : 0;
    const cls = heatClass(ret);
    return `<div class="heatmap-cell ${cls}" title="${h.name}: ${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%">
      <div class="hm-name">${h.ticker || h.name.split(' ')[0]}</div>
      <div class="hm-pct">${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%</div>
      <div class="hm-val">${displayCcySymbol()}${fmt2(toDisplayCcy(cur))}</div>
    </div>`;
  }).join('');
}

function heatClass(ret) {
  if (ret >= 20) return 'hm-hot5';
  if (ret >= 10) return 'hm-hot4';
  if (ret >= 5) return 'hm-hot3';
  if (ret >= 2) return 'hm-hot2';
  if (ret > 0) return 'hm-hot1';
  if (ret === 0) return 'hm-flat';
  if (ret >= -2) return 'hm-cold1';
  if (ret >= -5) return 'hm-cold2';
  if (ret >= -10) return 'hm-cold3';
  if (ret >= -20) return 'hm-cold4';
  return 'hm-cold5';
}

// ─── Price alerts ─────────────────────────────────────────────────
function checkPriceAlerts() {
  window.priceAlerts.forEach(a => {
    const d = livePrices[a.sym];
    if (!d) return;
    const wasTriggered = a.triggered;
    a.triggered = a.dir === 'above' ? d.price >= a.targetPrice : d.price <= a.targetPrice;
    if (a.triggered && !wasTriggered) {
      toast(`🔔 Alert: ${a.sym} ${a.dir === 'above' ? '≥' : '≤'} ${a.targetPrice}`);
    }
  });
  renderAlertsList();
}

function addPriceAlert() {
  const sym = (document.getElementById('alertSym') || {}).value || '';
  const dir = (document.getElementById('alertDir') || {}).value || 'above';
  const price = parseFloat((document.getElementById('alertPrice') || {}).value || '0');
  if (!sym || isNaN(price) || price <= 0) { toast('Enter symbol and target price.'); return; }
  window.priceAlerts.push({ sym: sym.toUpperCase(), dir, targetPrice: price, triggered: false });
  renderAlertsList();
  toast(`Alert set: ${sym} ${dir} ${price}`);
}

function removeAlert(i) {
  window.priceAlerts.splice(i, 1);
  renderAlertsList();
}

function renderAlertsList() {
  const el = document.getElementById('alertsList');
  if (!el) return;
  if (!window.priceAlerts.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0;">No alerts set.</div>';
    return;
  }
  el.innerHTML = window.priceAlerts.map((a, i) => {
    const d = livePrices[a.sym];
    const cur = d ? fmtPrice(d.price, a.sym) : '—';
    const stateCls = a.triggered ? 'alert-triggered' : 'alert-active';
    const stateLabel = a.triggered ? '🔔 HIT' : '⏳ watching';
    return `<div class="price-alert-row">
      <span class="pa-sym">${a.sym}</span>
      <span class="pa-dir ${a.dir === 'above' ? 'pa-above' : 'pa-below'}">${a.dir}</span>
      <span>${a.targetPrice}</span>
      <span style="color:var(--muted);font-size:11px;">now: ${cur}</span>
      <span class="alert-active ${a.triggered ? 'alert-triggered' : ''}">${stateLabel}</span>
      <button class="icon-btn del" onclick="removeAlert(${i})">✕</button>
    </div>`;
  }).join('');
}

// ─── Dividend tracker ─────────────────────────────────────────────
function addDividend() {
  if (!S.dividends) S.dividends = [];
  const holdingId = parseInt((document.getElementById('divHolding') || {}).value || '0');
  const date = (document.getElementById('divDate') || {}).value || new Date().toISOString().split('T')[0];
  const amount = parseFloat((document.getElementById('divAmount') || {}).value || '0');
  const notes = (document.getElementById('divNotes') || {}).value || '';
  if (!holdingId || isNaN(amount) || amount <= 0) { toast('Select holding and enter amount.'); return; }
  S.dividends.push({ id: Date.now(), holdingId, date, amount, notes });
  const holding = S.holdings.find(h => h.id === holdingId);
  if (holding) holding.dividendsReceived = Number(holding.dividendsReceived || 0) + amount;
  save();
  renderDividends();
  renderPortfolioSnapshot();
  toast('Dividend logged');
}

function deleteDividend(id) {
  const deleted = (S.dividends || []).find(d => d.id === id);
  if (deleted) {
    const holding = S.holdings.find(h => h.id === deleted.holdingId);
    if (holding) holding.dividendsReceived = Math.max(0, Number(holding.dividendsReceived || 0) - Number(deleted.amount || 0));
  }
  S.dividends = (S.dividends || []).filter(d => d.id !== id);
  save();
  renderDividends();
  renderPortfolioSnapshot();
}

function renderDividends() {
  const el = document.getElementById('dividendsList');
  if (!el) return;
  const divs = S.dividends || [];

  // Populate holding select
  const sel = document.getElementById('divHolding');
  if (sel && S.holdings.length) {
    sel.innerHTML = '<option value="">Select holding…</option>' +
      S.holdings.map(h => `<option value="${h.id}">${h.name}${h.ticker ? ' (' + h.ticker + ')' : ''}</option>`).join('');
  }

  if (!divs.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px 0;">No dividends logged yet.</div>';
    return;
  }

  // Group by holding
  const byHolding = {};
  divs.forEach(d => {
    const h = S.holdings.find(x => x.id === d.holdingId);
    const key = h ? h.name : `ID ${d.holdingId}`;
    if (!byHolding[key]) byHolding[key] = { total: 0, entries: [], h };
    byHolding[key].total += d.amount;
    byHolding[key].entries.push(d);
  });

  const totalDiv = divs.reduce((s, d) => s + d.amount, 0);
  el.innerHTML = `
    <div class="div-row div-head">
      <span>Holding</span><span>Date</span><span>Amount</span><span>Yield</span><span>Notes</span><span></span>
    </div>
    ${divs.sort((a, b) => b.date.localeCompare(a.date)).map(d => {
    const h = S.holdings.find(x => x.id === d.holdingId);
    const name = h ? (h.ticker || h.name) : `Unknown`;
    const inv = h ? h.invested : 1;
    const yld = inv ? ((d.amount / inv) * 100).toFixed(2) : '—';
    return `<div class="div-row">
        <span style="font-variation-settings:'wght' 600;">${name}</span>
        <span>${fmtDate(d.date)}</span>
        <span class="pos">${fmt(d.amount)}</span>
        <span><span class="div-yield-badge">${yld}%</span></span>
        <span style="color:var(--muted);font-size:11px;">${d.notes || '—'}</span>
        <span><button class="icon-btn del" onclick="deleteDividend(${d.id})">✕</button></span>
      </div>`;
  }).join('')}
    <div class="div-row" style="font-variation-settings:'wght' 700;border-top:2px solid var(--border);margin-top:4px;padding-top:8px;">
      <span>Total</span><span></span><span class="pos">${fmt(totalDiv)}</span><span></span><span></span><span></span>
    </div>
  `;
}

// ─── CSV export ───────────────────────────────────────────────────
function exportHoldingsCSV() {
  const rows = [['Name', 'Ticker', 'Type', 'Invested', 'Current Value', 'P&L', 'Return %', 'Buy Price', 'Shares', 'Buy Date', 'Wrapper', 'Notes']];
  S.holdings.forEach(h => {
    const live = getLivePrice(h.ticker);
    const cur = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    const pl = cur - h.invested;
    const ret = h.invested ? ((cur / h.invested - 1) * 100).toFixed(2) : '0';
    rows.push([h.name, h.ticker || '', h.type, h.invested.toFixed(2), cur.toFixed(2), pl.toFixed(2), ret, h.buyPrice || '', h.shares || '', h.buyDate || '', h.wrapper || '', (h.notes || '').replace(/,/g, ' ')]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `holdings-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast('CSV exported');
}

function exportClosedCSV() {
  const rows = [['Name', 'Ticker', 'Type', 'Invested', 'Sold For', 'P&L', 'Return %', 'Buy Date', 'Sell Date', 'Sell Price']];
  S.closedHoldings.forEach(h => {
    const pl = (h.soldFor || 0) - h.invested;
    const ret = h.invested ? ((pl / h.invested) * 100).toFixed(2) : '0';
    rows.push([h.name, h.ticker || '', h.type, h.invested.toFixed(2), (h.soldFor || 0).toFixed(2), pl.toFixed(2), ret, h.buyDate || '', h.sellDate || '', h.sellPrice || '']);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `closed-positions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast('CSV exported');
}

// ─── Sortable table helpers ───────────────────────────────────────
function getHoldingVal(h, col) {
  const live = getLivePrice(h.ticker);
  const cur = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
  switch (col) {
    case 'name': return h.name.toLowerCase();
    case 'ticker': return (h.ticker || '').toLowerCase();
    case 'type': return h.type;
    case 'invested': return h.invested;
    case 'current': return cur;
    case 'pl': return cur - h.invested;
    case 'ret': return h.invested ? (cur / h.invested - 1) : 0;
    case 'buyDate': return h.buyDate || '';
    default: return 0;
  }
}

function sortHoldingsByCols(arr, tab) {
  const { col, dir } = sortStates[tab] || { col: 'name', dir: 'asc' };
  return [...arr].sort((a, b) => {
    const av = getHoldingVal(a, col);
    const bv = getHoldingVal(b, col);
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return dir === 'asc' ? cmp : -cmp;
  });
}

function setSortCol(tab, col) {
  const st = sortStates[tab];
  if (st.col === col) {
    st.dir = st.dir === 'asc' ? 'desc' : 'asc';
  } else {
    st.col = col;
    st.dir = 'asc';
  }
  // Update header arrows
  document.querySelectorAll(`#invtab-${tab} th[data-sort]`).forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === col) th.classList.add(st.dir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
  if (tab === 'all') renderInvestments();
  if (tab === 'stocks') renderStocksHoldings();
  if (tab === 'crypto') renderCryptoHoldings();
}

// ─── Holdings rendering — All tab ────────────────────────────────
function renderInvestments() {
  document.getElementById('page-investments')?.setAttribute('data-inv-tab', 'all');
  const q = (document.getElementById('investmentsSearch') || {}).value || '';
  let H = S.holdings;
  if (allFilter !== 'all') H = H.filter(h => h.type === allFilter);
  if (q) H = H.filter(h => h.name.toLowerCase().includes(q.toLowerCase()) || (h.ticker || '').toLowerCase().includes(q.toLowerCase()));
  H = sortHoldingsByCols(H, 'all');
  const tb = document.getElementById('holdingsBody');
  if (!tb) return;
  if (!H.length) { tb.innerHTML = emptyRow(10, 'No investments yet. Add one via the Add tab.'); return; }
  const sym = displayCcySymbol();
  tb.innerHTML = H.map(h => {
    const idx = S.holdings.findIndex(x => x.id === h.id);
    const live = getLivePrice(h.ticker);
    const cur = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    const pl = cur - h.invested;
    const ret = pct(cur, h.invested);
    const liveTag = live ? `<span class="live-tag">live</span>` : '';
    const curDisp = toDisplayCcy(cur);
    const plDisp = toDisplayCcy(pl);
    return `<tr>
      <td>
        <span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}
        ${h.thesis ? `<div><button class="thesis-toggle" onclick="toggleThesis('th-${h.id}')">▸ thesis</button><div class="thesis-panel" id="th-${h.id}">${escHtml(h.thesis)}</div></div>` : ''}
      </td>
      <td><span class="pill p-${h.type}">${h.type}</span></td>
      <td class="val">${h.buyPrice ? CUR() + parseFloat(h.buyPrice).toFixed(2) : '—'}</td>
      <td>${fmtDate(h.buyDate)}</td>
      <td class="val">${sym}${fmt2(toDisplayCcy(h.invested))}</td>
      <td class="val">${sym}${fmt2(curDisp)} ${liveTag}</td>
      <td class="val ${cls(pl)}">${pl >= 0 ? '+' : ''}${sym}${fmt2(Math.abs(plDisp))}</td>
      <td>${pctBadge(ret)}</td>
      <td class="notes-cell">${h.notes || '—'}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
        <button class="icon-btn del"  onclick="deleteHolding(${h.id})">✕</button>
      </td>
    </tr>`;
  }).join('');

  // Update badge count
  const badge = document.getElementById('allHoldingsBadge');
  if (badge) badge.textContent = H.length;
}

// ─── Holdings rendering — Stocks tab ─────────────────────────────
function renderStocksHoldings() {
  document.getElementById('page-investments')?.setAttribute('data-inv-tab', 'stocks');
  const q = (document.getElementById('holdingsSearch') || {}).value || '';
  let H = S.holdings.filter(h => h.type === 'stocks' || h.type === 'isa' || h.type === 'etf');
  if (q) H = H.filter(h => h.name.toLowerCase().includes(q.toLowerCase()) || (h.ticker || '').toLowerCase().includes(q.toLowerCase()));
  H = sortHoldingsByCols(H, 'stocks');
  const tb = document.getElementById('stocksBody');
  if (!tb) return;
  if (!H.length) { tb.innerHTML = emptyRow(9, 'No stock holdings yet.'); return; }
  const sym = displayCcySymbol();
  tb.innerHTML = H.map(h => {
    const idx = S.holdings.findIndex(x => x.id === h.id);
    const live = getLivePrice(h.ticker);
    const cur = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    const pl = cur - h.invested;
    const ret = pct(cur, h.invested);
    const liveTag = live ? `<span class="live-tag">live</span>` : '';
    const dayChg = live ? `<span style="font-size:10px;color:${live.changePct >= 0 ? 'var(--green)' : 'var(--red)'};">${live.changePct >= 0 ? '▲' : '▼'}${Math.abs(live.changePct).toFixed(2)}%</span>` : '';
    return `<tr>
      <td><span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}</td>
      <td>${h.wrapper ? `<span class="pill p-isa">${h.wrapper}</span>` : '—'}</td>
      <td class="val">${h.buyPrice ? CUR() + parseFloat(h.buyPrice).toFixed(2) : '—'}</td>
      <td class="val">${h.shares ? parseFloat(h.shares).toFixed(3) : '—'}</td>
      <td class="val">${sym}${fmt2(toDisplayCcy(h.invested))}</td>
      <td class="val">${sym}${fmt2(toDisplayCcy(cur))} ${liveTag} ${dayChg}</td>
      <td class="val ${cls(pl)}">${pl >= 0 ? '+' : ''}${sym}${fmt2(toDisplayCcy(Math.abs(pl)))}</td>
      <td>${pctBadge(ret)}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn" onclick="moveHoldingUp(${idx})" title="Move up">▲</button>
        <button class="icon-btn" onclick="moveHoldingDown(${idx})" title="Move down">▼</button>
        <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
        <button class="icon-btn del"  onclick="deleteHolding(${h.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
  const badge = document.getElementById('stocksBadge');
  if (badge) badge.textContent = H.length;
}

// ─── Holdings rendering — Crypto tab ─────────────────────────────
function renderCryptoHoldings() {
  document.getElementById('page-investments')?.setAttribute('data-inv-tab', 'crypto');
  const q = (document.getElementById('cryptoSearch') || {}).value || '';
  let H = S.holdings.filter(h => h.type === 'crypto');
  if (q) H = H.filter(h => h.name.toLowerCase().includes(q.toLowerCase()) || (h.ticker || '').toLowerCase().includes(q.toLowerCase()));
  H = sortHoldingsByCols(H, 'crypto');
  const tb = document.getElementById('cryptoBody');
  if (!tb) return;
  if (!H.length) { tb.innerHTML = emptyRow(9, 'No crypto holdings yet.'); return; }
  const sym = displayCcySymbol();
  tb.innerHTML = H.map(h => {
    const idx = S.holdings.findIndex(x => x.id === h.id);
    const live = getLivePrice(h.ticker);
    const cur = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    const pl = cur - h.invested;
    const ret = pct(cur, h.invested);
    const liveTag = live ? `<span class="live-tag">live</span>` : '';
    const liveUnit = live ? `<span class="live-tag">$${live.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>` : '';
    return `<tr>
      <td><span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}</td>
      <td class="val">${h.shares ? parseFloat(h.shares).toFixed(4) : '—'}</td>
      <td class="val">${h.buyPrice ? CUR() + parseFloat(h.buyPrice).toLocaleString() : '—'}</td>
      <td class="val">${liveUnit || '—'}</td>
      <td class="val">${sym}${fmt2(toDisplayCcy(h.invested))}</td>
      <td class="val">${sym}${fmt2(toDisplayCcy(cur))} ${liveTag}</td>
      <td class="val ${cls(pl)}">${pl >= 0 ? '+' : ''}${sym}${fmt2(toDisplayCcy(Math.abs(pl)))}</td>
      <td>${pctBadge(ret)}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn" onclick="moveHoldingUp(${idx})" title="Move up">▲</button>
        <button class="icon-btn" onclick="moveHoldingDown(${idx})" title="Move down">▼</button>
        <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
        <button class="icon-btn del"  onclick="deleteHolding(${h.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
  const badge = document.getElementById('cryptoBadge');
  if (badge) badge.textContent = H.length;
}

function renderOtherHoldings() {
  document.getElementById('page-investments')?.setAttribute('data-inv-tab', 'other');
  let H = S.holdings.filter(h => h.type === 'other');
  H = sortHoldingsByCols(H, 'other');
  const tb = document.getElementById('otherBody');
  if (!tb) return;
  if (!H.length) { tb.innerHTML = emptyRow(8, 'No cars, art, collectibles or alternative assets yet.'); return; }
  tb.innerHTML = H.map(h => {
    const idx = S.holdings.findIndex(x => x.id === h.id);
    const pl = Number(h.current || 0) - Number(h.invested || 0);
    const ret = pct(h.current, h.invested);
    const category = h.category || h.altCategory || inferAlternativeCategory(h);
    return `<tr>
      <td><span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}</td>
      <td><span class="alt-asset-chip">${category}</span></td>
      <td>${fmtDate(h.buyDate)}</td>
      <td class="val">${fmt(h.invested)}</td>
      <td class="val">${fmt(h.current)}</td>
      <td class="val ${cls(pl)}">${pl >= 0 ? '+' : ''}${fmt(Math.abs(pl))} <span style="font-size:11px;">${fmtP(ret)}</span></td>
      <td class="notes-cell">${h.notes || '—'}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
        <button class="icon-btn del" onclick="deleteHolding(${h.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
  const badge = document.getElementById('otherBadge');
  if (badge) badge.textContent = H.length;
}

function inferAlternativeCategory(h) {
  const text = `${h.name || ''} ${h.notes || ''}`.toLowerCase();
  if (/(car|vehicle|motor|bmw|tesla|porsche|audi|mercedes)/.test(text)) return 'Car';
  if (/(art|painting|print|sculpture|artist)/.test(text)) return 'Art';
  if (/(watch|collectible|coin|wine|whisky|card|memorabilia)/.test(text)) return 'Collectible';
  return 'Alternative';
}

function renderHoldings() { renderInvestments(); renderOtherHoldings(); }
function renderHoldingsWithLive() { renderInvestments(); renderStocksHoldings(); renderCryptoHoldings(); renderOtherHoldings(); renderHeatmap(); }

// ─── Closed positions ─────────────────────────────────────────────
function renderClosed() {
  const tb = document.getElementById('closedBody');
  if (!tb) return;
  if (!S.closedHoldings.length) { tb.innerHTML = emptyRow(11, 'No sold positions yet.'); return; }
  tb.innerHTML = S.closedHoldings.map((h, i) => {
    const pl = (h.soldFor || 0) - h.invested;
    const ret = pct(h.soldFor || 0, h.invested);
    return `<tr>
      <td><span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}</td>
      <td><span class="pill p-${h.type}">${h.type}</span></td>
      <td class="val">${h.buyPrice ? CUR() + parseFloat(h.buyPrice).toFixed(2) : '—'}</td>
      <td>${fmtDate(h.buyDate)}</td>
      <td class="val">${h.sellPrice ? CUR() + parseFloat(h.sellPrice).toFixed(2) : '—'}</td>
      <td>${fmtDate(h.sellDate)}</td>
      <td class="val">${fmt(h.invested)}</td>
      <td class="val">${fmt(h.soldFor || 0)}</td>
      <td class="val ${cls(pl)}">${fmtS(pl)}</td>
      <td>${pctBadge(ret)}</td>
      <td><button class="icon-btn del" onclick="deleteClosedHolding(${i})">✕</button></td>
    </tr>`;
  }).join('');
}

// ─── Watchlist / price grid ───────────────────────────────────────
function renderStocks() { renderPriceGrid(); }
function renderPriceGrid(filterType) {
  const grid = document.getElementById('priceGrid');
  if (!grid) return;
  const type = filterType || window._priceGridFilter || 'all';
  window._priceGridFilter = type;

  // Build symbol list: default WATCHED + user watchlist
  const watchlistSyms = (S.watchlist || []).map(w => ({
    sym: w.sym, name: w.name || w.sym, type: w.type || 'stock', currency: w.currency || '$'
  }));
  const allWatched = [
    ...WATCHED_SYMBOLS,
    ...watchlistSyms.filter(w => !WATCHED_SYMBOLS.find(x => x.sym === w.sym))
  ];

  const filtered = type === 'all' ? allWatched
    : type === 'stocks' ? allWatched.filter(w => w.type === 'stock' || w.type === 'etf')
      : type === 'crypto' ? allWatched.filter(w => w.type === 'crypto')
        : allWatched.filter(w => w.type === 'index');

  Object.values(sparkCharts).forEach(c => { try { c.destroy(); } catch { } });
  sparkCharts = {};

  if (!Object.keys(livePrices).length) {
    grid.innerHTML = Array(8).fill(null).map(() => `<div class="loading-card">
      <div class="loading-bar wide"></div><div class="loading-bar short"></div>
      <div class="loading-bar price"></div>
    </div>`).join('');
    return;
  }

  grid.innerHTML = filtered.map(w => {
    const d = livePrices[w.sym];
    if (!d) return `<div class="price-card">
      <div class="card-sym">${w.sym.replace('-USD', '').replace('.L', '')}</div>
      <div style="color:var(--muted);font-size:12px;margin-top:6px;">Price unavailable</div>
    </div>`;

    const prev = lastPrices[w.sym];
    const flashCls = prev && d.price > prev ? 'flash-up' : prev && d.price < prev ? 'flash-dn' : '';
    const dir = d.changePct >= 0;
    const pfx = d.currency === 'GBP' ? '£' : d.currency === 'USD' ? '$' : (d.currency || '');
    const badgeCls = w.type === 'crypto' ? 'badge-crypto' : w.type === 'index' ? 'badge-index' : w.type === 'etf' ? 'badge-etf' : 'badge-stock';
    const cardId = 'card-' + w.sym.replace(/[\^.\-]/g, '_');
    const spkId = 'spk-' + w.sym.replace(/[\^.\-]/g, '_');

    const dayRange = d.low && d.high ? `
      <div class="range-bar-wrap">
        <div class="range-labels"><span>${pfx}${fmtPrice(d.low, w.sym)}</span><span>${pfx}${fmtPrice(d.high, w.sym)}</span></div>
        <div class="range-track"><div class="range-thumb" style="left:${Math.min(95, Math.max(5, Math.round(((d.price - d.low) / (d.high - d.low || 1)) * 100)))}%"></div></div>
      </div>` : '';

    // 52-week badge
    let week52 = '';
    if (d.fiftyTwoWeekHigh && d.fiftyTwoWeekLow) {
      const range52 = d.fiftyTwoWeekHigh - d.fiftyTwoWeekLow;
      const pos52 = range52 > 0 ? ((d.price - d.fiftyTwoWeekLow) / range52) * 100 : 50;
      const nearHigh = pos52 >= 90;
      const nearLow = pos52 <= 10;
      week52 = `<div class="week52-row">
        <span>${pfx}${fmtPrice(d.fiftyTwoWeekLow, w.sym)} <span class="w52-badge ${nearLow ? 'w52-near-low' : ''}">52w low</span></span>
        <span>${nearHigh ? '<span class="w52-badge w52-near-high">Near high</span>' : ''}${pfx}${fmtPrice(d.fiftyTwoWeekHigh, w.sym)}</span>
      </div>`;
    }

    // alert badge
    const activeAlert = window.priceAlerts.find(a => a.sym === w.sym && !a.triggered);
    const alertBadge = activeAlert ? `<span class="alert-active" style="font-size:9px;padding:1px 4px;">🔔 ${activeAlert.dir} ${activeAlert.targetPrice}</span>` : '';

    const isUserWatch = (S.watchlist || []).find(x => x.sym === w.sym);
    const watchBtn = isUserWatch
      ? `<button class="icon-btn del" style="font-size:10px;" onclick="removeFromWatchlist('${w.sym}')" title="Remove">✕</button>`
      : `<button class="icon-btn"    style="font-size:10px;" onclick="addToWatchlist('${w.sym}')" title="Add to watchlist">+</button>`;

    return `<div class="price-card ${flashCls}" id="${cardId}">
      <div class="card-top">
        <div>
          <div class="card-sym">${w.sym.replace('-USD', '').replace('.L', '')}</div>
          <div class="card-name">${w.name}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <span class="card-type-badge ${badgeCls}">${w.type}</span>
          ${watchBtn}
        </div>
      </div>
      <div class="card-price"><span class="card-currency">${pfx}</span>${fmtPrice(d.price, w.sym)}</div>
      <div class="card-change-row">
        <span class="chg-badge ${dir ? 'chg-up' : 'chg-dn'}">${dir ? '▲' : '▼'} ${Math.abs(d.changePct).toFixed(2)}%</span>
        <span class="card-vol">${dir ? '+' : ''}${d.change.toFixed(2)}</span>
      </div>
      ${d.volume ? `<div class="card-vol" style="margin-top:4px;">Vol: ${fmtVol(d.volume)}</div>` : ''}
      ${dayRange}
      ${week52}
      ${alertBadge}
      <div class="sparkline-wrap"><canvas id="${spkId}" role="img" aria-label="Price sparkline for ${w.name}"></canvas></div>
    </div>`;
  }).join('');

  // Draw sparklines
  filtered.forEach(w => {
    const spark = sparkHistory[w.sym];
    if (!spark?.length) return;
    const d = livePrices[w.sym];
    const up = d ? d.changePct >= 0 : true;
    const color = up ? '#639922' : '#E24B4A';
    const bg = up ? 'rgba(99,153,34,0.08)' : 'rgba(226,75,74,0.08)';
    const spkId = 'spk-' + w.sym.replace(/[\^.\-]/g, '_');
    const el = document.getElementById(spkId);
    if (!el) return;
    try {
      sparkCharts[w.sym] = new Chart(el, {
        type: 'line',
        data: {
          labels: spark.map((_, i) => i),
          datasets: [{ data: spark, borderColor: color, borderWidth: 1.5, pointRadius: 0, fill: true, backgroundColor: bg, tension: 0.3 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
        },
      });
    } catch { }
  });
}

// ─── Watchlist add / remove ───────────────────────────────────────
function addWatchTicker() {
  const input = document.getElementById('watchTicker');
  if (!input) return;
  const sym = input.value.trim().toUpperCase();
  if (!sym) { toast('Enter a ticker symbol.'); return; }
  if (!S.watchlist) S.watchlist = [];
  if (S.watchlist.find(w => w.sym === sym)) { toast(`${sym} already in watchlist.`); return; }
  S.watchlist.push({ sym, name: sym, type: 'stock', currency: '$' });
  save();
  input.value = '';
  toast(`Added ${sym} to watchlist — fetching price…`);
  fetchQuote(sym).then(r => {
    if (r) { livePrices[sym] = r; sparkHistory[sym] = r.sparkline; }
    renderPriceGrid();
  });
}

function addToWatchlist(sym) {
  if (!S.watchlist) S.watchlist = [];
  if (S.watchlist.find(w => w.sym === sym)) return;
  const meta = WATCHED_SYMBOLS.find(w => w.sym === sym);
  S.watchlist.push(meta || { sym, name: sym, type: 'stock', currency: '$' });
  save();
  toast(`${sym} added to watchlist`);
  renderPriceGrid();
}

function removeFromWatchlist(sym) {
  S.watchlist = (S.watchlist || []).filter(w => w.sym !== sym);
  save();
  toast(`${sym} removed from watchlist`);
  renderPriceGrid();
}

// ─── Stats cards ──────────────────────────────────────────────────
function computeWithLive(holdings) {
  return holdings.reduce((acc, h) => {
    const live = getLivePrice(h.ticker);
    const cur = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    acc.invested += h.invested;
    acc.current += cur;
    return acc;
  }, { invested: 0, current: 0 });
}

function getLivePrice(ticker) {
  if (!ticker) return null;
  const sym = ticker.toUpperCase();
  return livePrices[sym] || livePrices[sym + '-USD'] || livePrices[sym + '.L'] || null;
}

function renderInvestmentStats() {
  const el = document.getElementById('investmentStats');
  if (!el) return;
  el.innerHTML = '';
}

function renderStocksStats() {
  const { invested, current } = computeWithLive(S.holdings.filter(h => h.type === 'stocks' || h.type === 'etf'));
  const pl = current - invested;
  const ret = pct(current, invested);
  const el = document.getElementById('stocksStats');
  if (!el) return;
  const sym = displayCcySymbol();
  el.className = 'investment-stat-row';
  el.innerHTML = `
    <div class="stat-card sc-accent"><div class="stat-label">Stocks invested</div><div class="stat-val val">${sym}${fmt2(toDisplayCcy(invested))}</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Current value</div><div class="stat-val ${cls(pl)} val">${sym}${fmt2(toDisplayCcy(current))}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">P&amp;L</div><div class="stat-val ${cls(pl)} val">${pl >= 0 ? '+' : ''}${sym}${fmt2(toDisplayCcy(Math.abs(pl)))}</div><div class="stat-sub">${fmtP(ret)}</div></div>
  `;
}

function renderCryptoStats() {
  const { invested, current } = computeWithLive(S.holdings.filter(h => h.type === 'crypto'));
  const pl = current - invested;
  const ret = pct(current, invested);
  const el = document.getElementById('cryptoStats');
  if (!el) return;
  const sym = displayCcySymbol();
  el.className = 'investment-stat-row';
  el.innerHTML = `
    <div class="stat-card sc-accent"><div class="stat-label">Crypto invested</div><div class="stat-val val">${sym}${fmt2(toDisplayCcy(invested))}</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Current value</div><div class="stat-val ${cls(pl)} val">${sym}${fmt2(toDisplayCcy(current))}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">P&amp;L</div><div class="stat-val ${cls(pl)} val">${pl >= 0 ? '+' : ''}${sym}${fmt2(toDisplayCcy(Math.abs(pl)))}</div><div class="stat-sub">${fmtP(ret)}</div></div>
  `;
}

// ─── Thesis toggle ───────────────────────────────────────────────
function toggleThesis(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// ─── Add / edit / sell modals ─────────────────────────────────────
function _addTx({ txtype, date, desc, amount, pnl, notes }) {
  if (!S.transactions) S.transactions = [];
  S.transactions.unshift({ id: Date.now(), txtype, date, desc, amount, pnl: pnl || 0, notes: notes || '' });
  if (S.transactions.length > 200) S.transactions.length = 200;
}

function addHolding() {
  const name = (document.getElementById('hName').value || '').trim();
  const ticker = (document.getElementById('hTicker').value || '').trim().toUpperCase();
  const type = document.getElementById('hType').value;
  const invested = parseMoney(document.getElementById('hInvested').value);
  const current = parseMoney(document.getElementById('hCurrent').value);
  const buyPrice = document.getElementById('hBuyPrice').value;
  const shares = document.getElementById('hShares').value;
  const buyDate = document.getElementById('hBuyDate').value;
  const wrapper = document.getElementById('hWrapper').value;
  const notes = document.getElementById('hNotes').value;
  const thesis = (document.getElementById('hThesis') || {}).value || '';
  if (!name || isNaN(invested) || isNaN(current)) { toast('Please fill: name, invested, and current value.'); return; }
  S.holdings.push({ id: Date.now(), name, ticker, type, invested, current, buyPrice, shares, buyDate, wrapper, notes, thesis });
  _addTx({ txtype: 'buy', date: buyDate || new Date().toISOString().split('T')[0], desc: `Bought ${name}${ticker ? ' (' + ticker + ')' : ''}`, amount: invested, pnl: 0, notes });
  save(); closeModal('addHoldingModal'); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); renderOtherHoldings(); renderOverview(); renderOverviewCharts(); renderPortfolioSnapshot(); toast(`Added ${name}`);
  ['hName', 'hTicker', 'hInvested', 'hCurrent', 'hBuyPrice', 'hShares', 'hBuyDate', 'hNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('hType').value = 'stocks';
  document.getElementById('hWrapper').value = '';
}

function addInlineHolding(kind) {
  const prefix = kind === 'crypto' ? 'cryptoInline' : 'stockInline';
  const name = (document.getElementById(prefix + 'Name')?.value || '').trim();
  const ticker = (document.getElementById(prefix + 'Ticker')?.value || '').trim().toUpperCase();
  const invested = parseMoney(document.getElementById(prefix + 'Invested')?.value);
  const current = parseMoney(document.getElementById(prefix + 'Current')?.value);
  const shares = document.getElementById(prefix + 'Shares')?.value || '';
  if (!name || isNaN(invested) || isNaN(current)) {
    toast(`Add ${kind === 'crypto' ? 'token' : 'stock'} name, invested amount and current value.`);
    return;
  }
  const buyDate = new Date().toISOString().split('T')[0];
  S.holdings.push({ id: Date.now(), name, ticker, type: kind, invested, current, shares, buyDate, wrapper: kind === 'stocks' ? 'GIA' : '', notes: '', thesis: '' });
  _addTx({ txtype: 'buy', date: buyDate, desc: `Bought ${name}${ticker ? ' (' + ticker + ')' : ''}`, amount: invested, pnl: 0, notes: 'Inline entry' });
  ['Name', 'Ticker', 'Invested', 'Current', 'Shares'].forEach(id => {
    const el = document.getElementById(prefix + id);
    if (el) el.value = '';
  });
  save();
  renderHoldings();
  renderStocksHoldings();
  renderCryptoHoldings();
  renderStocksStats();
  renderCryptoStats();
  renderPortfolioSnapshot();
  renderHeatmap();
  toast(`Added ${name}`);
}

function deleteHolding(id) {
  const idx = S.holdings.findIndex(h => h.id === id);
  if (idx === -1) return;
  const deleted = S.holdings.splice(idx, 1)[0];
  window._lastDeletedHolding = { item: deleted, index: idx };
  save(); renderHoldings(); renderOverview(); renderStocksHoldings(); renderCryptoHoldings(); renderOverviewCharts(); renderPortfolioSnapshot(); renderHeatmap(); toast('Holding deleted');
}

function deleteClosedHolding(i) {
  const deleted = S.closedHoldings.splice(i, 1)[0];
  window._lastDeletedClosedHolding = { item: deleted, index: i };
  save(); renderClosed(); toast('Deleted');
}

function moveHoldingUp(i) {
  if (i <= 0) return;
  [S.holdings[i], S.holdings[i - 1]] = [S.holdings[i - 1], S.holdings[i]];
  save(); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); toast('Moved up');
}

function moveHoldingDown(i) {
  if (i >= S.holdings.length - 1) return;
  [S.holdings[i], S.holdings[i + 1]] = [S.holdings[i + 1], S.holdings[i]];
  save(); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); toast('Moved down');
}

function openEditHolding(id) {
  editingId = id;
  const h = S.holdings.find(x => x.id === id);
  if (!h) return;
  document.getElementById('editFormGrid').innerHTML = `
    <div class="ff"><label>Name</label><input type="text" id="em-name" value="${h.name}"/></div>
    <div class="ff"><label>Ticker</label><input type="text" id="em-ticker" value="${h.ticker || ''}"/></div>
    <div class="ff"><label>Type</label>
      <select id="em-type">${['stocks', 'crypto', 'other'].map(t => `<option value="${t}"${h.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
    </div>
    <div class="ff money-field"><label>Invested</label><input type="text" id="em-invested" value="${h.invested.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Current value</label><input type="text" id="em-current" value="${h.current.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Buy price / unit</label><input type="text" id="em-buyprice" value="${h.buyPrice ? parseFloat(h.buyPrice).toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Shares / units</label><input type="number" id="em-shares" value="${h.shares || ''}" step="any"/></div>
    <div class="ff"><label>Buy date</label><input type="date" id="em-buydate" value="${h.buyDate || ''}"/></div>
    <div class="ff"><label>Wrapper</label>
      <select id="em-wrapper">${['', 'ISA', 'SIPP', 'GIA', 'LISA'].map(w => `<option value="${w}"${h.wrapper === w ? ' selected' : ''}>${w || 'None'}</option>`).join('')}</select>
    </div>
    <div class="ff full-col"><label>Notes</label><textarea id="em-notes">${h.notes || ''}</textarea></div>
    <div class="ff full-col"><label>Investment thesis</label><textarea id="em-thesis" placeholder="Why do you hold this? Target price, catalyst…">${h.thesis || ''}</textarea></div>
  `;
  ['editSellPrice', 'editSellDate', 'editSellTotal'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('editModal').classList.remove('hidden');
}

function saveEditHolding() {
  const h = S.holdings.find(x => x.id === editingId);
  if (!h) return;
  h.name = document.getElementById('em-name').value;
  h.ticker = (document.getElementById('em-ticker').value || '').toUpperCase();
  h.type = document.getElementById('em-type').value;
  h.invested = parseMoney(document.getElementById('em-invested').value) || h.invested;
  h.current = parseMoney(document.getElementById('em-current').value) || h.current;
  h.buyPrice = document.getElementById('em-buyprice').value;
  h.shares = document.getElementById('em-shares').value;
  h.buyDate = document.getElementById('em-buydate').value;
  h.wrapper = document.getElementById('em-wrapper')?.value || h.wrapper;
  h.notes = document.getElementById('em-notes').value;
  h.thesis = (document.getElementById('em-thesis') || {}).value || '';
  save(); closeModal('editModal'); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); renderOverview(); renderOverviewCharts(); renderPortfolioSnapshot(); renderHeatmap(); toast('Saved');
}

function sellHolding() {
  const h = S.holdings.find(x => x.id === editingId);
  if (!h) return;
  const sellPrice = document.getElementById('editSellPrice').value;
  const sellDate = document.getElementById('editSellDate').value || new Date().toISOString().split('T')[0];
  const sellTotal = parseMoney(document.getElementById('editSellTotal').value) || h.current;
  const pl = sellTotal - h.invested;
  S.closedHoldings.push({ ...h, sellPrice, sellDate, soldFor: sellTotal });
  S.holdings = S.holdings.filter(x => x.id !== editingId);
  _addTx({ txtype: 'sell', date: sellDate, desc: `Sold ${h.name}${h.ticker ? ' (' + h.ticker + ')' : ''}`, amount: sellTotal, pnl: pl, notes: `Cost: ${fmt(h.invested)} · Proceeds: ${fmt(sellTotal)}` });
  save(); closeModal('editModal'); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); renderClosed(); renderOverview(); renderOverviewCharts(); renderPortfolioSnapshot(); renderHeatmap();
  toast(`Sold ${h.name} · P&L: ${fmtS(pl)}`);
}

// ─── Overview charts (unchanged logic, kept for compatibility) ────
function renderOverviewCharts() {
  const H = S.holdings;
  const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const textCol = isDark ? '#b4b2a9' : '#5f5e5a';
  const gridCol = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)';
  const typeColors = { stocks: '#185FA5', crypto: '#534AB7', isa: '#3B6D11', pension: '#BA7517', cash: '#888780', other: '#5F5E5A' };

  const types = [...new Set(H.map(h => h.type))];
  const allocData = types.map(t => {
    const { current } = computeWithLive(H.filter(h => h.type === t));
    return { type: t, val: current };
  });
  const total = allocData.reduce((s, d) => s + d.val, 0);

  if (invAllocDoughnut) invAllocDoughnut.destroy();
  const allocEl = document.getElementById('allocChart');
  if (allocEl) {
    invAllocDoughnut = new Chart(allocEl, {
      type: 'doughnut',
      data: {
        labels: allocData.map(d => d.type),
        datasets: [{ data: allocData.map(d => d.val), backgroundColor: allocData.map(d => typeColors[d.type] || '#888'), borderWidth: 0, hoverOffset: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.label}: ${fmt(c.raw)} (${((c.raw / total) * 100).toFixed(0)}%)` } } },
      },
    });
  }

  const legendEl = document.getElementById('allocLegend');
  if (legendEl) {
    legendEl.innerHTML = allocData.map(d => `
      <div class="alloc-row">
        <span class="alloc-label"><span class="alloc-dot" style="background:${typeColors[d.type] || '#888'}"></span>${d.type}</span>
        <div class="alloc-bar-track"><div class="alloc-bar-fill" style="width:${Math.round((d.val / total) * 100)}%;background:${typeColors[d.type] || '#888'};"></div></div>
        <span class="alloc-pct">${Math.round((d.val / total) * 100)}%</span>
      </div>`).join('');
  }

  if (invPlBar) invPlBar.destroy();
  const plEl = document.getElementById('plChart');
  if (plEl) {
    invPlBar = new Chart(plEl, {
      type: 'bar',
      data: {
        labels: H.map(h => h.ticker || h.name.split(' ')[0]),
        datasets: [{
          label: 'P&L',
          data: H.map(h => { const cur = (getLivePrice(h.ticker)?.price * (parseFloat(h.shares) || 1)) || h.current; return cur - h.invested; }),
          backgroundColor: H.map(h => { const cur = (getLivePrice(h.ticker)?.price * (parseFloat(h.shares) || 1)) || h.current; return (cur - h.invested) >= 0 ? '#639922' : '#E24B4A'; }),
          borderRadius: 4, barThickness: 14,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `P&L: ${fmtS(c.raw)}` } } },
        scales: {
          x: { ticks: { color: textCol, font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: textCol, font: { size: 11 }, callback: v => (v >= 0 ? '+' : '') + '£' + Math.round(Math.abs(v) / 1000) + 'k' }, grid: { color: gridCol } },
        },
      },
    });
  }
}

// ─── Tab switching ────────────────────────────────────────────────
function invTab(tab, el) {
  document.getElementById('page-investments')?.setAttribute('data-inv-tab', tab);
  document.querySelectorAll('#page-investments .tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('#page-investments .tab-pane').forEach(t => t.classList.remove('active'));
  const pane = document.getElementById('invtab-' + tab);
  if (pane) pane.classList.add('active');
  if (tab === 'all') { renderInvestments(); renderInvestmentStats(); }
  if (tab === 'stocks') { renderStocksHoldings(); renderStocksStats(); }
  if (tab === 'crypto') { renderCryptoHoldings(); renderCryptoStats(); }
  if (tab === 'other') { renderOtherHoldings(); }
  if (tab === 'watchlist') { renderPriceGrid(); }
  if (tab === 'closed') { renderClosed(); }
  if (tab === 'heatmap') { renderHeatmap(); }
  if (tab === 'dividends') { renderDividends(); }
  if (tab === 'alerts') { renderAlertsList(); }
}

function setHFilter(f, el) {
  allFilter = f;
  document.querySelectorAll('#invtab-all .filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderInvestments();
}

// ─── Utility formatters ───────────────────────────────────────────
function fmtPrice(p, sym, dec) {
  if (p == null || isNaN(p)) return '—';
  const d = dec !== undefined ? dec : (p < 10 ? 4 : p < 1000 ? 2 : 0);
  return p.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtVol(v) {
  if (!v) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return v;
}
function fmt2(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function tickerBadge(t) { return `<span class="ticker-badge">${t}</span>`; }
function pctBadge(ret) { return `<span class="pct-badge ${ret >= 0 ? 'pct-pos' : 'pct-neg'}">${fmtP(ret)}</span>`; }
function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}"><div class="empty"><div class="ei">◫</div><p>${msg}</p></div></td></tr>`;
}
function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── CSS injection ────────────────────────────────────────────────
function injectLiveStyles() {
  if (document.getElementById('inv-live-styles')) return;
  const s = document.createElement('style');
  s.id = 'inv-live-styles';
  s.textContent = `
    .live-tag{display:inline-block;background:#EAF3DE;color:#27500A;border-radius:4px;padding:1px 5px;font-size:10px;font-weight:500;margin-left:4px;vertical-align:middle;}
    .pct-badge{display:inline-block;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:500;}
    .pct-pos{background:#EAF3DE;color:#27500A;}
    .pct-neg{background:#FCEBEB;color:#791F1F;}
    .fw6{font-variation-settings:'wght' 600;}
    .ticker-badge{display:inline-block;background:var(--bg,#f1efe8);border:0.5px solid rgba(0,0,0,.1);border-radius:4px;padding:1px 5px;font-size:10px;color:var(--muted,#888);margin-left:4px;vertical-align:middle;}
    .price-card{position:relative;transition:border-color .15s;}
    .price-card.flash-up{animation:flashUp .7s ease;}
    .price-card.flash-dn{animation:flashDn .7s ease;}
    @keyframes flashUp{0%{background:#EAF3DE;}100%{background:inherit;}}
    @keyframes flashDn{0%{background:#FCEBEB;}100%{background:inherit;}}
    .sparkline-wrap{height:38px;margin-top:8px;}
    .sparkline-wrap canvas{width:100%!important;height:38px!important;}
    .range-bar-wrap{margin-top:6px;}
    .range-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--muted,#888);margin-bottom:2px;}
    .range-track{height:3px;background:rgba(0,0,0,.08);border-radius:4px;position:relative;}
    .range-thumb{position:absolute;top:-3px;width:9px;height:9px;border-radius:50%;background:var(--text,#222);border:2px solid var(--surface,#fff);}
    .card-type-badge{font-size:10px;padding:2px 7px;border-radius:12px;font-weight:500;}
    .badge-stock{background:#E6F1FB;color:#0C447C;}
    .badge-crypto{background:#EEEDFE;color:#3C3489;}
    .badge-index{background:#FAEEDA;color:#854F0B;}
    .badge-etf{background:#EAF3DE;color:#27500A;}
    .chg-badge{font-size:11px;font-weight:500;padding:2px 6px;border-radius:4px;}
    .chg-up{background:#EAF3DE;color:#27500A;}
    .chg-dn{background:#FCEBEB;color:#791F1F;}
    .alloc-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;gap:6px;margin-bottom:5px;}
    .alloc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block;}
    .alloc-label{display:flex;align-items:center;gap:5px;min-width:64px;color:var(--muted,#888);}
    .alloc-bar-track{flex:1;background:rgba(0,0,0,.07);border-radius:4px;height:4px;}
    .alloc-bar-fill{height:4px;border-radius:4px;}
    .alloc-pct{font-weight:500;min-width:28px;text-align:right;}
    .mkt-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;}
    .mkt-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;font-variation-settings:'wght' 600;}
    .mkt-val{font-size:16px;font-variation-settings:'wght' 700;font-variant-numeric:tabular-nums;}
    .mkt-sub{font-size:11px;margin-top:2px;}
    .ticker-tape{overflow:hidden;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:5px 0;background:var(--surface2);margin-bottom:18px;user-select:none;}
    .ticker-inner{display:flex;white-space:nowrap;animation:tickerScroll 35s linear infinite;}
    .ticker-inner:hover{animation-play-state:paused;}
    .ticker-item{display:inline-flex;align-items:center;gap:6px;padding:0 20px;font-size:12px;border-right:1px solid var(--border);}
    .ticker-sym{font-variation-settings:'wght' 700;}
    .ticker-price{font-variant-numeric:tabular-nums;}
    .ticker-chg{font-size:11px;}
    .up{color:var(--green,#0a8f5c);}
    .dn{color:var(--red,#cc3333);}
    @keyframes tickerScroll{from{transform:translateX(0);}to{transform:translateX(-50%);}}
    .loading-card{border:1px solid var(--border);border-radius:12px;padding:16px;background:var(--surface);}
    @keyframes shimmer{0%,100%{opacity:.4;}50%{opacity:.9;}}
    .loading-bar{height:10px;background:var(--border2);border-radius:4px;margin-bottom:8px;animation:shimmer 1.5s infinite;}
    .loading-bar.wide{width:80%;}
    .loading-bar.short{width:50%;}
    .loading-bar.price{height:20px;width:65%;}
    .investment-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;}
  `;
  document.head.appendChild(s);
}

// ─── Init ─────────────────────────────────────────────────────────
function initInvestments() {
  injectLiveStyles();
  if (!S.dividends) S.dividends = [];
  if (!S.watchlist) S.watchlist = [];
  if (!S.closedHoldings) S.closedHoldings = [];
  const bdEl = document.getElementById('hBuyDate');
  if (bdEl && !bdEl.value) bdEl.value = new Date().toISOString().split('T')[0];
  fetchFxRate();
  fetchAllLivePrices();
  startLiveRefresh();
}
