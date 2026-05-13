// ══════════════════════════════════════════════════════════════════
// investments.js  –  Full Investment Dashboard
// Features: live prices · sparklines · flash animations · ticker tape
//           stocks/crypto/all/closed tabs · add/edit/sell modals
//           allocation charts · top performers · P&L bar chart
// ══════════════════════════════════════════════════════════════════
 
// ─── State ───────────────────────────────────────────────────────
let livePrices   = {};   // { SYM: { price, prevClose, open, high, low, volume, sparkline, change, changePct } }
let lastPrices   = {};   // previous poll snapshot for flash detection
let sparkHistory = {};   // { SYM: number[] }
let sparkCharts  = {};   // Chart.js instances keyed by sym
let allocChart, barChart, plChart;
let stocksSort   = 'name';
let cryptoSort   = 'name';
let allFilter    = 'all';
let editingId    = null;
let liveInterval = null;
 
// Symbols to watch — extend freely
const WATCHED_SYMBOLS = [
  { sym: 'AAPL',     name: 'Apple Inc.',       type: 'stock',  currency: '$' },
  { sym: 'MSFT',     name: 'Microsoft',         type: 'stock',  currency: '$' },
  { sym: 'NVDA',     name: 'NVIDIA',            type: 'stock',  currency: '$' },
  { sym: 'TSLA',     name: 'Tesla',             type: 'stock',  currency: '$' },
  { sym: 'AMZN',     name: 'Amazon',            type: 'stock',  currency: '$' },
  { sym: 'GOOGL',    name: 'Alphabet',          type: 'stock',  currency: '$' },
  { sym: 'META',     name: 'Meta Platforms',    type: 'stock',  currency: '$' },
  { sym: 'VUSA.L',   name: 'S&P 500 ETF',       type: 'etf',    currency: '£' },
  { sym: 'BTC-USD',  name: 'Bitcoin',           type: 'crypto', currency: '$' },
  { sym: 'ETH-USD',  name: 'Ethereum',          type: 'crypto', currency: '$' },
  { sym: 'SOL-USD',  name: 'Solana',            type: 'crypto', currency: '$' },
  { sym: 'BNB-USD',  name: 'BNB',               type: 'crypto', currency: '$' },
  { sym: '^GSPC',    name: 'S&P 500',           type: 'index',  currency: ''  },
  { sym: '^IXIC',    name: 'NASDAQ',            type: 'index',  currency: ''  },
  { sym: '^FTSE',    name: 'FTSE 100',          type: 'index',  currency: ''  },
  { sym: '^DJI',     name: 'Dow Jones',         type: 'index',  currency: ''  },
];
 
const MKT_SUMMARY_SYMS = ['^GSPC', '^IXIC', '^FTSE', '^DJI'];
const LIVE_REFRESH_MS  = 60_000; // 1 minute
 
// ─── Fetch live quote from Yahoo Finance ─────────────────────────
async function fetchQuote(sym) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`;
    const res  = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('empty');
    const meta   = result.meta;
    const closes = result.indicators?.quote?.[0]?.close || [];
    const sparkline = closes.filter(v => v != null).slice(-30);
    const change    = meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || 0);
    const changePct = meta.chartPreviousClose
      ? ((change / meta.chartPreviousClose) * 100)
      : 0;
    return {
      sym,
      price:     meta.regularMarketPrice,
      prevClose: meta.chartPreviousClose || meta.previousClose,
      open:      meta.regularMarketOpen,
      high:      meta.regularMarketDayHigh,
      low:       meta.regularMarketDayLow,
      volume:    meta.regularMarketVolume,
      currency:  meta.currency,
      marketState: meta.marketState,
      sparkline,
      change,
      changePct,
    };
  } catch {
    return null;
  }
}
 
// Fetch all watched symbols in parallel
async function fetchAllLivePrices() {
  const btn = document.getElementById('liveRefreshBtn');
  if (btn) btn.disabled = true;
  setStatusBar('Fetching live prices…');
 
  const results = await Promise.all(WATCHED_SYMBOLS.map(w => fetchQuote(w.sym)));
  let loaded = 0;
  results.forEach(r => {
    if (!r) return;
    lastPrices[r.sym] = livePrices[r.sym]?.price;
    livePrices[r.sym] = r;
    sparkHistory[r.sym] = r.sparkline;
    loaded++;
  });
 
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  setStatusBar(`${loaded}/${WATCHED_SYMBOLS.length} symbols loaded · ${now}`);
  if (btn) btn.disabled = false;
 
  renderTickerTape();
  renderMarketSummary();
  renderPriceGrid();
  renderHoldingsWithLive();
  renderStocksStats();
  renderCryptoStats();
  renderInvestmentStats();
}
 
function startLiveRefresh() {
  clearInterval(liveInterval);
  liveInterval = setInterval(fetchAllLivePrices, LIVE_REFRESH_MS);
}
 
function setStatusBar(msg) {
  const el = document.getElementById('liveStatusBar');
  if (el) el.textContent = msg;
}
 
// ─── Ticker tape ─────────────────────────────────────────────────
function renderTickerTape() {
  const el = document.getElementById('tickerInner');
  if (!el) return;
  const items = WATCHED_SYMBOLS
    .filter(w => livePrices[w.sym])
    .map(w => {
      const d   = livePrices[w.sym];
      const dir = d.changePct >= 0 ? 'up' : 'dn';
      const pfx = d.currency === 'GBP' ? '£' : d.currency === 'USD' ? '$' : '';
      return `<span class="ticker-item">
        <span class="ticker-sym">${w.sym.replace('-USD','').replace('.L','')}</span>
        <span class="ticker-price">${pfx}${fmtPrice(d.price, d.sym)}</span>
        <span class="ticker-chg ${dir}">${d.changePct >= 0 ? '▲' : '▼'} ${Math.abs(d.changePct).toFixed(2)}%</span>
      </span>`;
    });
  const doubled = items.join('') + items.join('');
  el.innerHTML = doubled || '<span class="ticker-item">Market data unavailable</span>';
}
 
// ─── Market summary (index strip) ────────────────────────────────
function renderMarketSummary() {
  const el = document.getElementById('mktSummaryStrip');
  if (!el) return;
  el.innerHTML = MKT_SUMMARY_SYMS.map(sym => {
    const info = WATCHED_SYMBOLS.find(w => w.sym === sym);
    const d    = livePrices[sym];
    if (!d) return `<div class="mkt-card"><div class="mkt-label">${info?.name || sym}</div><div class="mkt-val">—</div></div>`;
    const dir  = d.changePct >= 0;
    return `<div class="mkt-card">
      <div class="mkt-label">${info?.name || sym}</div>
      <div class="mkt-val">${fmtPrice(d.price, sym, 0)}</div>
      <div class="mkt-sub ${dir ? 'pos' : 'neg'}">${dir ? '+' : ''}${d.change.toFixed(2)} (${dir ? '+' : ''}${d.changePct.toFixed(2)}%)</div>
    </div>`;
  }).join('');
}
 
// ─── Full price card grid ─────────────────────────────────────────
function renderPriceGrid(filterType) {
  const grid = document.getElementById('priceGrid');
  if (!grid) return;
  const type = filterType || window._priceGridFilter || 'all';
  window._priceGridFilter = type;
 
  const filtered = type === 'all'     ? WATCHED_SYMBOLS
    : type === 'stocks'  ? WATCHED_SYMBOLS.filter(w => w.type === 'stock' || w.type === 'etf')
    : type === 'crypto'  ? WATCHED_SYMBOLS.filter(w => w.type === 'crypto')
    : WATCHED_SYMBOLS.filter(w => w.type === 'index');
 
  // Destroy old sparkline charts
  Object.values(sparkCharts).forEach(c => { try { c.destroy(); } catch {} });
  sparkCharts = {};
 
  if (!Object.keys(livePrices).length) {
    grid.innerHTML = Array(6).fill(null).map(() => `<div class="loading-card">
      <div class="loading-bar wide"></div><div class="loading-bar short"></div>
      <div class="loading-bar price"></div>
    </div>`).join('');
    return;
  }
 
  grid.innerHTML = filtered.map(w => {
    const d = livePrices[w.sym];
    if (!d) return `<div class="price-card"><div class="card-sym">${w.sym}</div><div style="color:var(--muted);font-size:12px;">Unavailable</div></div>`;
 
    const prev     = lastPrices[w.sym];
    const flashCls = prev && d.price > prev ? 'flash-up' : prev && d.price < prev ? 'flash-dn' : '';
    const dir      = d.changePct >= 0;
    const pfx      = d.currency === 'GBP' ? '£' : d.currency === 'USD' ? '$' : (d.currency || '');
    const badgeCls = w.type === 'crypto' ? 'badge-crypto' : w.type === 'index' ? 'badge-index' : w.type === 'etf' ? 'badge-etf' : 'badge-stock';
    const cardId   = 'card-' + w.sym.replace(/[\^.\-]/g, '_');
    const spkId    = 'spk-'  + w.sym.replace(/[\^.\-]/g, '_');
 
    const dayRange = d.low && d.high ? `
      <div class="range-bar-wrap">
        <div class="range-labels"><span>${pfx}${fmtPrice(d.low, w.sym)}</span><span>${pfx}${fmtPrice(d.high, w.sym)}</span></div>
        <div class="range-track"><div class="range-thumb" style="left:${Math.min(95,Math.max(5,Math.round(((d.price-d.low)/(d.high-d.low||1))*100)))}%"></div></div>
      </div>` : '';
 
    return `<div class="price-card ${flashCls}" id="${cardId}">
      <div class="card-top">
        <div>
          <div class="card-sym">${w.sym.replace('-USD','').replace('.L','')}</div>
          <div class="card-name">${w.name}</div>
        </div>
        <span class="card-type-badge ${badgeCls}">${w.type}</span>
      </div>
      <div class="card-price"><span class="card-currency">${pfx}</span>${fmtPrice(d.price, w.sym)}</div>
      <div class="card-change-row">
        <span class="chg-badge ${dir ? 'chg-up' : 'chg-dn'}">${dir ? '▲' : '▼'} ${Math.abs(d.changePct).toFixed(2)}%</span>
        <span class="card-vol">${dir ? '+' : ''}${d.change.toFixed(2)}</span>
      </div>
      ${d.volume ? `<div class="card-vol" style="margin-top:4px;">Vol: ${fmtVol(d.volume)}</div>` : ''}
      ${dayRange}
      <div class="sparkline-wrap"><canvas id="${spkId}" role="img" aria-label="Price sparkline for ${w.name}"></canvas></div>
    </div>`;
  }).join('');
 
  // Draw sparklines
  filtered.forEach(w => {
    const spark = sparkHistory[w.sym];
    if (!spark?.length) return;
    const d     = livePrices[w.sym];
    const up    = d ? d.changePct >= 0 : true;
    const color = up ? '#639922' : '#E24B4A';
    const bg    = up ? 'rgba(99,153,34,0.08)' : 'rgba(226,75,74,0.08)';
    const spkId = 'spk-' + w.sym.replace(/[\^.\-]/g, '_');
    const el    = document.getElementById(spkId);
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
    } catch {}
  });
}
 
// ─── Live-enriched holdings table helper ────────────────────────
function getLivePrice(ticker) {
  if (!ticker) return null;
  const sym = ticker.toUpperCase();
  // Try direct match, then append -USD for crypto, then append .L for UK stocks
  return livePrices[sym] || livePrices[sym + '-USD'] || livePrices[sym + '.L'] || null;
}
 
// ─── Holdings rendering (stocks tab) ────────────────────────────
function renderStocksHoldings() {
  const q  = (document.getElementById('holdingsSearch') || {}).value || '';
  let H    = S.holdings.filter(h => h.type === 'stocks');
  if (q)   H = H.filter(h => h.name.toLowerCase().includes(q.toLowerCase()) || (h.ticker || '').toLowerCase().includes(q.toLowerCase()));
  H = sortHoldings(H, stocksSort);
  const tb = document.getElementById('stocksBody');
  if (!H.length) { tb.innerHTML = emptyRow(10, 'No stock holdings yet.'); return; }
  tb.innerHTML = H.map(h => {
    const originalIndex = S.holdings.findIndex(x => x.id === h.id);
    const live  = getLivePrice(h.ticker);
    const cur   = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    const pl    = cur - h.invested;
    const ret   = pct(cur, h.invested);
    const liveTag = live ? `<span class="live-tag">live</span>` : '';
    return `<tr>
      <td><span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}</td>
      <td>${h.wrapper ? `<span class="pill p-isa">${h.wrapper}</span>` : '—'}</td>
      <td class="val">${h.buyPrice ? CUR() + parseFloat(h.buyPrice).toFixed(2) : '—'}</td>
      <td class="val">${h.shares ? parseFloat(h.shares).toFixed(3) : '—'}</td>
      <td class="val">${fmt(h.invested)}</td>
      <td class="val">${fmt(cur)} ${liveTag}</td>
      <td class="val ${cls(pl)}">${fmtS(pl)}</td>
      <td>${pctBadge(ret)}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn" onclick="moveHoldingUp(${originalIndex})" title="Move up">▲</button>
        <button class="icon-btn" onclick="moveHoldingDown(${originalIndex})" title="Move down">▼</button>
        <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
        <button class="icon-btn del"  onclick="deleteHolding(${h.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
}
 
// ─── Holdings rendering (crypto tab) ────────────────────────────
function renderCryptoHoldings() {
  const q  = (document.getElementById('cryptoSearch') || {}).value || '';
  let H    = S.holdings.filter(h => h.type === 'crypto');
  if (q)   H = H.filter(h => h.name.toLowerCase().includes(q.toLowerCase()) || (h.ticker || '').toLowerCase().includes(q.toLowerCase()));
  H = sortHoldings(H, cryptoSort);
  const tb = document.getElementById('cryptoBody');
  if (!H.length) { tb.innerHTML = emptyRow(8, 'No crypto holdings yet.'); return; }
  tb.innerHTML = H.map(h => {
    const originalIndex = S.holdings.findIndex(x => x.id === h.id);
    const live  = getLivePrice(h.ticker);
    const cur   = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    const pl    = cur - h.invested;
    const ret   = pct(cur, h.invested);
    const liveTag = live ? `<span class="live-tag">live</span>` : '';
    const liveUnitPrice = live ? `<span class="live-tag">$${live.price.toLocaleString('en-US', {maximumFractionDigits:2})}</span>` : '';
    return `<tr>
      <td><span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}</td>
      <td class="val">${h.shares ? parseFloat(h.shares).toFixed(4) : '—'}</td>
      <td class="val">${h.buyPrice ? CUR() + parseFloat(h.buyPrice).toLocaleString() : '—'}</td>
      <td class="val">${liveUnitPrice || '—'}</td>
      <td class="val">${fmt(h.invested)}</td>
      <td class="val">${fmt(cur)} ${liveTag}</td>
      <td class="val ${cls(pl)}">${fmtS(pl)}</td>
      <td>${pctBadge(ret)}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn" onclick="moveHoldingUp(${originalIndex})" title="Move up">▲</button>
        <button class="icon-btn" onclick="moveHoldingDown(${originalIndex})" title="Move down">▼</button>
        <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
        <button class="icon-btn del"  onclick="deleteHolding(${h.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
}
 
// ─── All holdings tab ────────────────────────────────────────────
function renderInvestments() {
  const q  = (document.getElementById('investmentsSearch') || {}).value || '';
  let H    = S.holdings;
  if (allFilter !== 'all') H = H.filter(h => h.type === allFilter);
  if (q) H = H.filter(h => h.name.toLowerCase().includes(q.toLowerCase()) || (h.ticker || '').toLowerCase().includes(q.toLowerCase()));
  const tb = document.getElementById('holdingsBody');
  if (!H.length) { tb.innerHTML = emptyRow(10, 'No investments yet. Add one via the Add tab.'); return; }
  tb.innerHTML = H.map(h => {
    const originalIndex = S.holdings.findIndex(x => x.id === h.id);
    const live  = getLivePrice(h.ticker);
    const cur   = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    const pl    = cur - h.invested;
    const ret   = pct(cur, h.invested);
    const liveTag = live ? `<span class="live-tag">live</span>` : '';
    return `<tr>
      <td><span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}</td>
      <td><span class="pill p-${h.type}">${h.type}</span></td>
      <td class="val">${h.buyPrice ? CUR() + parseFloat(h.buyPrice).toFixed(2) : '—'}</td>
      <td>${fmtDate(h.buyDate)}</td>
      <td class="val">${fmt(h.invested)}</td>
      <td class="val">${fmt(cur)} ${liveTag}</td>
      <td class="val ${cls(pl)}">${fmtS(pl)}</td>
      <td>${pctBadge(ret)}</td>
      <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px;">${h.notes || '—'}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn" onclick="moveHoldingUp(${originalIndex})" title="Move up">▲</button>
        <button class="icon-btn" onclick="moveHoldingDown(${originalIndex})" title="Move down">▼</button>
        <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
        <button class="icon-btn del"  onclick="deleteHolding(${h.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
}
 
// Alias — called from original tab switch logic
function renderHoldings()         { renderInvestments(); }
function renderHoldingsWithLive() { renderInvestments(); renderStocksHoldings(); renderCryptoHoldings(); }
 
// ─── Closed positions ────────────────────────────────────────────
function renderClosed() {
  const tb = document.getElementById('closedBody');
  if (!S.closedHoldings.length) { tb.innerHTML = emptyRow(11, 'No sold positions yet.'); return; }
  tb.innerHTML = S.closedHoldings.map((h, i) => {
    const pl  = (h.soldFor || 0) - h.invested;
    const ret = pct(h.soldFor || 0, h.invested);
    return `<tr>
      <td><span class="fw6">${h.name}</span>${h.ticker ? tickerBadge(h.ticker) : ''}</td>
      <td><span class="pill p-${h.type}">${h.type}</span></td>
      <td class="val">${h.buyPrice  ? CUR() + parseFloat(h.buyPrice).toFixed(2)  : '—'}</td>
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
 
// ─── Stats cards ─────────────────────────────────────────────────
function computeWithLive(holdings) {
  return holdings.reduce((acc, h) => {
    const live = getLivePrice(h.ticker);
    const cur  = live ? live.price * (parseFloat(h.shares) || 1) : h.current;
    acc.invested += h.invested;
    acc.current  += cur;
    return acc;
  }, { invested: 0, current: 0 });
}
 
function renderInvestmentStats() {
  const { invested, current } = computeWithLive(S.holdings);
  const pl  = current - invested;
  const ret = invested ? ((current / invested - 1) * 100) : 0;
  const el  = document.getElementById('investmentStats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card sc-accent"><div class="stat-label">Total invested</div><div class="stat-val val">${fmt(invested)}</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Current value</div><div class="stat-val pos val">${fmt(current)}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">Unrealised P&amp;L</div><div class="stat-val ${cls(pl)} val">${fmtS(pl)}</div><div class="stat-sub">${fmtP(ret)}</div></div>
  `;
}
 
function renderStocksStats() {
  const { invested, current } = computeWithLive(S.holdings.filter(h => h.type === 'stocks'));
  const pl  = current - invested;
  const ret = pct(current, invested);
  const el  = document.getElementById('stocksStats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card sc-accent"><div class="stat-label">Stocks invested</div><div class="stat-val val">${fmt(invested)}</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Current value</div><div class="stat-val pos val">${fmt(current)}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">P&amp;L</div><div class="stat-val ${cls(pl)} val">${fmtS(pl)}</div><div class="stat-sub">${fmtP(ret)}</div></div>
  `;
}
 
function renderCryptoStats() {
  const { invested, current } = computeWithLive(S.holdings.filter(h => h.type === 'crypto'));
  const pl  = current - invested;
  const ret = pct(current, invested);
  const el  = document.getElementById('cryptoStats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card sc-accent"><div class="stat-label">Crypto invested</div><div class="stat-val val">${fmt(invested)}</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Current value</div><div class="stat-val pos val">${fmt(current)}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">P&amp;L</div><div class="stat-val ${cls(pl)} val">${fmtS(pl)}</div><div class="stat-sub">${fmtP(ret)}</div></div>
  `;
}
 
// ─── Overview charts ─────────────────────────────────────────────
function renderOverviewCharts() {
  const H = S.holdings;
  const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const textCol = isDark ? '#b4b2a9' : '#5f5e5a';
  const gridCol = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)';
  const typeColors = { stocks: '#185FA5', crypto: '#534AB7', isa: '#3B6D11', pension: '#BA7517', cash: '#888780', other: '#5F5E5A' };
 
  // Allocation doughnut
  const types    = [...new Set(H.map(h => h.type))];
  const allocData = types.map(t => {
    const { current } = computeWithLive(H.filter(h => h.type === t));
    return { type: t, val: current };
  });
  const total = allocData.reduce((s, d) => s + d.val, 0);
 
  if (allocChart) allocChart.destroy();
  const allocEl = document.getElementById('allocChart');
  if (allocEl) {
    allocChart = new Chart(allocEl, {
      type: 'doughnut',
      data: {
        labels: allocData.map(d => d.type),
        datasets: [{ data: allocData.map(d => d.val), backgroundColor: allocData.map(d => typeColors[d.type] || '#888'), borderWidth: 0, hoverOffset: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.label}: ${fmt(c.raw)} (${((c.raw / total) * 100).toFixed(0)}%)` } },
        },
      },
    });
  }
 
  // Allocation legend
  const legendEl = document.getElementById('allocLegend');
  if (legendEl) {
    legendEl.innerHTML = allocData.map(d => `
      <div class="alloc-row">
        <span class="alloc-label"><span class="alloc-dot" style="background:${typeColors[d.type] || '#888'}"></span>${d.type}</span>
        <div class="alloc-bar-track"><div class="alloc-bar-fill" style="width:${Math.round((d.val / total) * 100)}%;background:${typeColors[d.type] || '#888'};"></div></div>
        <span class="alloc-pct">${Math.round((d.val / total) * 100)}%</span>
      </div>`).join('');
  }
 
  // Top performers
  const sorted = [...H].sort((a, b) => {
    const ra = pct((getLivePrice(a.ticker)?.price * (parseFloat(a.shares) || 1)) || a.current, a.invested);
    const rb = pct((getLivePrice(b.ticker)?.price * (parseFloat(b.shares) || 1)) || b.current, b.invested);
    return rb - ra;
  }).slice(0, 6);
  const maxRet = Math.max(...sorted.map(h => {
    const cur = (getLivePrice(h.ticker)?.price * (parseFloat(h.shares) || 1)) || h.current;
    return Math.abs(pct(cur, h.invested));
  }));
  const perfEl = document.getElementById('topPerformers');
  if (perfEl) {
    perfEl.innerHTML = sorted.map(h => {
      const cur = (getLivePrice(h.ticker)?.price * (parseFloat(h.shares) || 1)) || h.current;
      const ret = pct(cur, h.invested);
      const live = getLivePrice(h.ticker);
      const liveTag = live ? `<span class="live-tag">live</span>` : '';
      return `<div class="perf-row">
        <span class="perf-name">${h.name}${h.ticker ? ` <span class="ticker-badge">${h.ticker}</span>` : ''} ${liveTag}</span>
        <div class="perf-bar-track"><div class="perf-bar-fill" style="width:${Math.round((Math.abs(ret) / maxRet) * 100)}%;background:${ret >= 0 ? '#639922' : '#E24B4A'};"></div></div>
        <span class="pct-badge ${ret >= 0 ? 'pct-pos' : 'pct-neg'}" style="min-width:56px;text-align:right;">${fmtP(ret)}</span>
      </div>`;
    }).join('');
  }
 
  // Bar chart — portfolio value
  const sortedByVal = [...H].sort((a, b) => {
    const ca = (getLivePrice(a.ticker)?.price * (parseFloat(a.shares) || 1)) || a.current;
    const cb = (getLivePrice(b.ticker)?.price * (parseFloat(b.shares) || 1)) || b.current;
    return cb - ca;
  }).slice(0, 8);
  if (barChart) barChart.destroy();
  const barEl = document.getElementById('barChart');
  if (barEl) {
    barChart = new Chart(barEl, {
      type: 'bar',
      data: {
        labels: sortedByVal.map(h => h.ticker || h.name.split(' ')[0]),
        datasets: [
          { label: 'Current value', data: sortedByVal.map(h => (getLivePrice(h.ticker)?.price * (parseFloat(h.shares) || 1)) || h.current), backgroundColor: sortedByVal.map(h => typeColors[h.type] || '#888'), borderRadius: 4, barThickness: 14 },
          { label: 'Invested', data: sortedByVal.map(h => h.invested), backgroundColor: isDark ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.07)', borderRadius: 4, barThickness: 14 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.raw)}` } } },
        scales: {
          x: { ticks: { color: textCol, font: { size: 11 } }, grid: { color: gridCol } },
          y: { ticks: { color: textCol, font: { size: 11 }, callback: v => '£' + Math.round(v / 1000) + 'k' }, grid: { color: gridCol } },
        },
      },
    });
  }
 
  // P&L bar chart
  if (plChart) plChart.destroy();
  const plEl = document.getElementById('plChart');
  if (plEl) {
    plChart = new Chart(plEl, {
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
 
// ─── Add / edit / sell ───────────────────────────────────────────
function addInvestments() {
  const name      = (document.getElementById('hName').value || '').trim();
  const ticker    = (document.getElementById('hTicker').value || '').trim().toUpperCase();
  const type      = document.getElementById('hType').value;
  const invested  = parseMoney(document.getElementById('hInvested').value);
  const current   = parseMoney(document.getElementById('hCurrent').value);
  const buyPrice  = document.getElementById('hBuyPrice').value;
  const shares    = document.getElementById('hShares').value;
  const buyDate   = document.getElementById('hBuyDate').value;
  const wrapper   = document.getElementById('hWrapper').value;
  const notes     = document.getElementById('hNotes').value;
  if (!name || isNaN(invested) || isNaN(current)) { toast('Please fill: name, invested, and current value.'); return; }
  S.holdings.push({ id: Date.now(), name, ticker, type, invested, current, buyPrice, shares, buyDate, wrapper, notes });
  _addTx({ txtype: 'buy', date: buyDate || new Date().toISOString().split('T')[0], desc: `Bought ${name}${ticker ? ' (' + ticker + ')' : ''}`, amount: invested, pnl: 0, notes });
  save(); closeModal('addHoldingModal'); renderHoldings(); renderOverview(); toast(`Added ${name}`);
  ['hName','hTicker','hInvested','hCurrent','hBuyPrice','hShares','hBuyDate','hNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('hType').value    = 'stocks';
  document.getElementById('hWrapper').value = '';
}
 
function deleteHolding(id) {
  S.holdings = S.holdings.filter(h => h.id !== id);
  save(); renderHoldings(); renderOverview(); renderStocksHoldings(); renderCryptoHoldings(); renderOverviewCharts(); toast('Holding deleted');
}
 
function deleteClosedHolding(i) {
  S.closedHoldings.splice(i, 1);
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
      <select id="em-type">${['stocks','isa','crypto','cash','pension','other'].map(t => `<option value="${t}"${h.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
    </div>
    <div class="ff money-field"><label>Invested</label><input type="text" id="em-invested" value="${h.invested.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Current value</label><input type="text" id="em-current" value="${h.current.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Buy price / unit</label><input type="text" id="em-buyprice" value="${h.buyPrice ? parseFloat(h.buyPrice).toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Shares / units</label><input type="number" id="em-shares" value="${h.shares || ''}" step="any"/></div>
    <div class="ff"><label>Buy date</label><input type="date" id="em-buydate" value="${h.buyDate || ''}"/></div>
    <div class="ff"><label>Wrapper</label>
      <select id="em-wrapper">${['','ISA','SIPP','GIA','LISA'].map(w => `<option value="${w}"${h.wrapper === w ? ' selected' : ''}>${w || 'None'}</option>`).join('')}</select>
    </div>
    <div class="ff full-col"><label>Notes</label><textarea id="em-notes">${h.notes || ''}</textarea></div>
  `;
  ['editSellPrice','editSellDate','editSellTotal'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('editModal').classList.remove('hidden');
}
 
function saveEditHolding() {
  const h = S.holdings.find(x => x.id === editingId);
  if (!h) return;
  h.name     = document.getElementById('em-name').value;
  h.ticker   = (document.getElementById('em-ticker').value || '').toUpperCase();
  h.type     = document.getElementById('em-type').value;
  h.invested = parseMoney(document.getElementById('em-invested').value) || h.invested;
  h.current  = parseMoney(document.getElementById('em-current').value) || h.current;
  h.buyPrice = document.getElementById('em-buyprice').value;
  h.shares   = document.getElementById('em-shares').value;
  h.buyDate  = document.getElementById('em-buydate').value;
  h.wrapper  = document.getElementById('em-wrapper')?.value || h.wrapper;
  h.notes    = document.getElementById('em-notes').value;
  save(); closeModal('editModal'); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); renderOverview(); renderOverviewCharts(); toast('Saved');
}
 
function sellHolding() {
  const h = S.holdings.find(x => x.id === editingId);
  if (!h) return;
  const sellPrice = document.getElementById('editSellPrice').value;
  const sellDate  = document.getElementById('editSellDate').value || new Date().toISOString().split('T')[0];
  const sellTotal = parseMoney(document.getElementById('editSellTotal').value) || h.current;
  const pl        = sellTotal - h.invested;
  S.closedHoldings.push({ ...h, sellPrice, sellDate, soldFor: sellTotal });
  S.holdings = S.holdings.filter(x => x.id !== editingId);
  _addTx({ txtype: 'sell', date: sellDate, desc: `Sold ${h.name}${h.ticker ? ' (' + h.ticker + ')' : ''}`, amount: sellTotal, pnl: pl, notes: `Cost: ${fmt(h.invested)} · Proceeds: ${fmt(sellTotal)}` });
  save(); closeModal('editModal'); renderHoldings(); renderStocksHoldings(); renderCryptoHoldings(); renderClosed(); renderOverview(); renderOverviewCharts();
  toast(`Sold ${h.name} · P&L: ${fmtS(pl)}`);
}
 
// ─── Sort / filter helpers ────────────────────────────────────────
function sortHoldings(H, key) {
  return [...H].sort((a, b) => {
    if (key === 'name')    return a.name.localeCompare(b.name);
    if (key === 'current') return b.current - a.current;
    if (key === 'pl')      return (b.current - b.invested) - (a.current - a.invested);
    if (key === 'ret')     return pct(b.current, b.invested) - pct(a.current, a.invested);
    if (key === 'volatility') return Math.abs(pct(b.current, b.invested)) - Math.abs(pct(a.current, a.invested));
    return 0;
  });
}
 
function setHFilter(f, el) {
  allFilter = f;
  document.querySelectorAll('#htab-open .filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderInvestments();
}
 
function setStocksSort(key, el) {
  stocksSort = key;
  document.querySelectorAll('#tab-stocks .filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderStocksHoldings();
}
 
function setCryptoSort(key, el) {
  cryptoSort = key;
  document.querySelectorAll('#tab-crypto .filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderCryptoHoldings();
}
 
// ─── Tab switching ────────────────────────────────────────────────
function invTab(tab, el) {
  document.querySelectorAll('#page-investments .tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('#page-investments .tab-pane').forEach(t => t.classList.remove('active'));
  const pane = document.getElementById('invtab-' + tab);
  if (pane) pane.classList.add('active');
  if (tab === 'all')    { hFilter = 'all'; renderHoldings(); renderInvestmentStats(); }
  if (tab === 'stocks') { renderStocksHoldings(); renderStocksStats(); }
  if (tab === 'crypto') { renderCryptoHoldings(); renderCryptoStats(); }
  if (tab === 'watchlist') renderStocks();
}

function renderInvestmentsPage() {
  invTab('all', document.querySelector('#page-investments .tab-btn.active') || document.querySelector('#page-investments .tab-btn'));
}

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
function tickerBadge(t) { return `<span class="ticker-badge">${t}</span>`; }
function pctBadge(ret)  { return `<span class="pct-badge ${ret >= 0 ? 'pct-pos' : 'pct-neg'}">${fmtP(ret)}</span>`; }
function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}"><div class="empty"><div class="ei">◫</div><p>${msg}</p></div></td></tr>`;
}
 
// ─── CSS for live elements (inject once) ─────────────────────────
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
    .ticker-badge{display:inline-block;background:var(--bg3,#f1efe8);border:0.5px solid rgba(0,0,0,.1);border-radius:4px;padding:1px 5px;font-size:10px;color:var(--muted,#888);margin-left:4px;vertical-align:middle;}
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
    .range-thumb{position:absolute;top:-3px;width:9px;height:9px;border-radius:50%;background:var(--color-text-primary,#222);border:2px solid var(--color-background-primary,#fff);}
    .card-type-badge{font-size:10px;padding:2px 7px;border-radius:12px;font-weight:500;}
    .badge-stock{background:#E6F1FB;color:#0C447C;}
    .badge-crypto{background:#EEEDFE;color:#3C3489;}
    .badge-index{background:#FAEEDA;color:#854F0B;}
    .badge-etf{background:#EAF3DE;color:#27500A;}
    .chg-badge{font-size:11px;font-weight:500;padding:2px 6px;border-radius:4px;}
    .chg-up{background:#EAF3DE;color:#27500A;}
    .chg-dn{background:#FCEBEB;color:#791F1F;}
    .live-dot{width:7px;height:7px;border-radius:50%;background:#639922;display:inline-block;animation:livepulse 2s infinite;}
    @keyframes livepulse{0%,100%{opacity:1;}50%{opacity:.3;}}
    .alloc-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;gap:6px;margin-bottom:5px;}
    .alloc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
    .alloc-label{display:flex;align-items:center;gap:5px;min-width:64px;color:var(--muted,#888);}
    .alloc-bar-track{flex:1;background:rgba(0,0,0,.07);border-radius:4px;height:4px;}
    .alloc-bar-fill{height:4px;border-radius:4px;}
    .alloc-pct{font-weight:500;min-width:28px;text-align:right;}
    .perf-row{display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:0.5px solid rgba(0,0,0,.06);font-size:13px;}
    .perf-row:last-child{border-bottom:none;}
    .perf-name{flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .perf-bar-track{width:60px;background:rgba(0,0,0,.07);border-radius:4px;height:6px;flex-shrink:0;}
    .perf-bar-fill{height:6px;border-radius:4px;}
    .mkt-card{background:var(--color-background-secondary);border-radius:8px;padding:10px 12px;}
    .mkt-label{font-size:10px;color:var(--muted,#888);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;}
    .mkt-val{font-size:16px;font-weight:500;font-variant-numeric:tabular-nums;}
    .mkt-sub{font-size:11px;margin-top:2px;}
    .ticker-tape{overflow:hidden;border-top:0.5px solid rgba(0,0,0,.08);border-bottom:0.5px solid rgba(0,0,0,.08);padding:6px 0;background:var(--color-background-secondary);}
    .ticker-inner{display:flex;gap:0;white-space:nowrap;animation:tickerScroll 30s linear infinite;}
    .ticker-inner:hover{animation-play-state:paused;}
    .ticker-item{display:inline-flex;align-items:center;gap:6px;padding:0 18px;font-size:12px;border-right:0.5px solid rgba(0,0,0,.08);}
    .ticker-sym{font-weight:500;}
    .ticker-price{font-variant-numeric:tabular-nums;}
    .ticker-chg{font-size:11px;}
    .up{color:#639922;}
    .dn{color:#E24B4A;}
    @keyframes tickerScroll{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
    .loading-card{border-radius:12px;padding:14px 16px;animation:shimmer 1.5s infinite;background:var(--color-background-secondary);}
    @keyframes shimmer{0%,100%{opacity:.5;}50%{opacity:1;}}
    .loading-bar{height:10px;background:rgba(0,0,0,.09);border-radius:4px;margin-bottom:8px;}
    .loading-bar.wide{width:80%;}
    .loading-bar.short{width:50%;}
    .loading-bar.price{height:18px;width:65%;}
  `;
  document.head.appendChild(s);
}
 
// ─── Initialise ───────────────────────────────────────────────────
function initInvestments() {
  injectLiveStyles();
  fetchAllLivePrices();
  startLiveRefresh();
}
 
// Call initInvestments() from your main app init, e.g.:
// document.addEventListener('DOMContentLoaded', initInvestments);
 
// ══════════════════════════════════════════════════════════════════
// DATA & STORAGE
// ══════════════════════════════════════════════════════════════════
 
const STORAGE_KEY = 'inv_dashboard_v3';
 
// Default state shape
const DEFAULT_STATE = {
  holdings: [
    { id: 1,  name: 'Apple Inc.',    ticker: 'AAPL',    type: 'stocks', invested: 5200,  current: 7840,  buyPrice: '145.60', shares: '35.71',   buyDate: '2022-03-15', wrapper: 'ISA', notes: 'Core holding' },
    { id: 2,  name: 'Microsoft',     ticker: 'MSFT',    type: 'stocks', invested: 3800,  current: 5120,  buyPrice: '285.00', shares: '13.33',   buyDate: '2022-06-01', wrapper: 'ISA', notes: '' },
    { id: 3,  name: 'NVIDIA',        ticker: 'NVDA',    type: 'stocks', invested: 2100,  current: 6300,  buyPrice: '180.00', shares: '11.67',   buyDate: '2023-01-10', wrapper: 'GIA', notes: 'AI growth play' },
    { id: 4,  name: 'S&P 500 ETF',   ticker: 'VUSA',    type: 'stocks', invested: 10000, current: 13400, buyPrice: '82.50',  shares: '121.21',  buyDate: '2021-11-01', wrapper: 'ISA', notes: 'Core index' },
    { id: 5,  name: 'Bitcoin',       ticker: 'BTC',     type: 'crypto', invested: 4500,  current: 9800,  buyPrice: '28000',  shares: '0.1607',  buyDate: '2023-03-20', wrapper: '',    notes: 'Long term hold' },
    { id: 6,  name: 'Ethereum',      ticker: 'ETH',     type: 'crypto', invested: 2200,  current: 3100,  buyPrice: '1600',   shares: '1.375',   buyDate: '2023-05-10', wrapper: '',    notes: '' },
    { id: 7,  name: 'Solana',        ticker: 'SOL',     type: 'crypto', invested: 800,   current: 1450,  buyPrice: '22.00',  shares: '36.36',   buyDate: '2023-09-01', wrapper: '',    notes: 'High risk' },
    { id: 8,  name: 'Tesla',         ticker: 'TSLA',    type: 'stocks', invested: 1800,  current: 1240,  buyPrice: '220.00', shares: '8.18',    buyDate: '2022-12-01', wrapper: 'GIA', notes: 'Volatile' },
    { id: 9,  name: 'Cardano',       ticker: 'ADA',     type: 'crypto', invested: 600,   current: 320,   buyPrice: '0.48',   shares: '1250',    buyDate: '2022-08-15', wrapper: '',    notes: 'Speculative' },
  ],
  closedHoldings: [
    { id: 100, name: 'Meta Platforms', ticker: 'META', type: 'stocks', invested: 3200, soldFor: 4800, buyPrice: '142.00', sellPrice: '212.00', buyDate: '2022-10-10', sellDate: '2023-11-20', shares: '22.54' },
  ],
  transactions: [],
  settings: { currency: 'GBP', dateFormat: 'en-GB' },
};
 
// Live state object — populated from localStorage or defaults
let S = JSON.parse(JSON.stringify(DEFAULT_STATE));
 
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge carefully so new keys in DEFAULT_STATE always exist
      S = {
        ...DEFAULT_STATE,
        ...parsed,
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      };
      // Back-compat: rename old "closed" → closedHoldings
      if (parsed.closed && !parsed.closedHoldings) S.closedHoldings = parsed.closed;
    }
  } catch (e) {
    console.warn('investments.js: failed to load state, using defaults.', e);
    S = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}
 
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { console.warn('investments.js: save failed', e); }
}
 
function resetToDefaults() {
  if (!confirm('Reset all data to sample defaults? This cannot be undone.')) return;
  S = JSON.parse(JSON.stringify(DEFAULT_STATE));
  save();
  renderAll();
  toast('Data reset to defaults');
}
 
// Internal transaction log helper
function _addTx({ txtype, date, desc, amount, pnl, notes }) {
  if (!S.transactions) S.transactions = [];
  S.transactions.unshift({ id: Date.now(), txtype, date, desc, amount, pnl: pnl || 0, notes: notes || '' });
  // Keep last 200
  if (S.transactions.length > 200) S.transactions.length = 200;
}
 
// ══════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ══════════════════════════════════════════════════════════════════
 
/** User's preferred currency symbol */
function CUR() { return S.settings?.currency === 'GBP' ? '£' : '$'; }
 
/** Format a number as a money string with currency symbol */
function fmt(v) {
  if (v == null || isNaN(v)) return CUR() + '—';
  return CUR() + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
 
/** Format signed P&L: +£1,234.56 or -£234.00 */
function fmtS(v) {
  if (v == null || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '-') + CUR() + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
 
/** Format percentage: +12.3% */
function fmtP(v) {
  if (v == null || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}
 
/** Format a date string for display */
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); } catch { return d; }
}
 
/** % return between current and invested */
function pct(current, invested) { return invested ? ((current / invested - 1) * 100) : 0; }
 
/** CSS class for positive/negative */
function cls(v) { return v >= 0 ? 'pos' : 'neg'; }
 
/**
 * Parse a money input string to float.
 * Handles: "1,234.56"  "1234"  "£1,234"  "$1,234.56"
 */
function parseMoney(str) {
  if (str == null) return NaN;
  const cleaned = String(str).replace(/[£$,\s]/g, '');
  return parseFloat(cleaned);
}
 
/**
 * Auto-format a money <input> with commas as the user types.
 * Call: oninput="formatMoney(this)"
 */
function formatMoney(input) {
  const raw   = input.value.replace(/[^0-9.]/g, '');
  const parts = raw.split('.');
  parts[0]    = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  input.value = parts.slice(0, 2).join('.');
}
 
// ══════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════
 
function toast(msg, type = 'default') {
  let wrap = document.getElementById('toastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toastWrap';
    wrap.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none;';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.style.cssText = `background:var(--color-text-primary,#222);color:var(--color-background-primary,#fff);border-radius:8px;padding:9px 14px;font-size:13px;font-family:var(--font-sans,sans-serif);animation:toastIn .2s ease;max-width:300px;pointer-events:auto;`;
  t.textContent = msg;
  if (!document.getElementById('toast-keyframes')) {
    const ks = document.createElement('style');
    ks.id = 'toast-keyframes';
    ks.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}';
    document.head.appendChild(ks);
  }
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .25s'; setTimeout(() => t.remove(), 280); }, 2600);
}
 
// ══════════════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════════════
 
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
 
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}
 
/** Close any modal when clicking its backdrop */
function initModalBackdropClose() {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
  });
}
 
// ══════════════════════════════════════════════════════════════════
// OVERVIEW / SUMMARY RENDER
// ══════════════════════════════════════════════════════════════════
 
/** Master render called after any data change */
function renderAll() {
  renderOverview();
  renderStocksHoldings();
  renderCryptoHoldings();
  renderInvestments();
  renderClosed();
  renderInvestmentStats();
  renderStocksStats();
  renderCryptoStats();
}
 
/** Render the top-level overview stat cards */
function renderOverview() {
  const { invested, current } = computeWithLive(S.holdings);
  const pl    = current - invested;
  const ret   = pct(current, invested);
  const realPL = S.closedHoldings.reduce((s, h) => s + ((h.soldFor || 0) - h.invested), 0);
  const el    = document.getElementById('overviewStats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total invested</div>
      <div class="stat-val">${fmt(invested)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Portfolio value</div>
      <div class="stat-val ${cls(pl)}">${fmt(current)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Unrealised P&amp;L</div>
      <div class="stat-val ${cls(pl)}">${fmtS(pl)}</div>
      <div class="stat-sub">${fmtP(ret)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Realised P&amp;L</div>
      <div class="stat-val ${cls(realPL)}">${fmtS(realPL)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Holdings</div>
      <div class="stat-val">${S.holdings.length}</div>
    </div>
  `;
}
// ══════════════════════════════════════════════════════════════════
// EXTRA UI HELPERS
// ══════════════════════════════════════════════════════════════════
 
/** Set active class on a filter button, clearing siblings */
function setActiveFilter(el, siblingSelector) {
  document.querySelectorAll(siblingSelector).forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}
 
/** Render closed positions summary stat cards */
function renderClosedSummary() {
  const el = document.getElementById('closedSummary');
  if (!el) return;
  const C       = S.closedHoldings;
  const realPL  = C.reduce((s, h) => s + ((h.soldFor || 0) - h.invested), 0);
  const cost    = C.reduce((s, h) => s + h.invested, 0);
  const proc    = C.reduce((s, h) => s + (h.soldFor || 0), 0);
  el.innerHTML  = `
    <div class="cs-card"><div class="cs-val ${cls(realPL)}">${fmtS(realPL)}</div><div class="cs-lbl">Realised P&amp;L</div></div>
    <div class="cs-card"><div class="cs-val">${fmt(cost)}</div><div class="cs-lbl">Total cost</div></div>
    <div class="cs-card"><div class="cs-val">${fmt(proc)}</div><div class="cs-lbl">Total proceeds</div></div>
    <div class="cs-card"><div class="cs-val">${C.length}</div><div class="cs-lbl">Closed positions</div></div>
  `;
}
 
// Override renderClosed to also refresh summary
const _renderClosedOrig = renderClosed;
function renderClosed() {
  _renderClosedOrig();
  renderClosedSummary();
}
 
// ══════════════════════════════════════════════════════════════════
// FULL INIT
// ══════════════════════════════════════════════════════════════════
 
/**
 * Mount the dashboard into a container element.
 * Usage: mountInvestmentDashboard(document.getElementById('app'));
 * Or just call initInvestments() if HTML is already in the page.
 */
function mountInvestmentDashboard(container) {
  if (!container) { console.error('investments.js: container not found'); return; }
  container.innerHTML = dashboardHTML();
  // Set today's date in header
  const dateEl = document.getElementById('overviewDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  initModalBackdropClose();
  initInvestments();
  loadState();
  renderAll();
  renderOverviewCharts();
}
 
function initInvestments() {
  injectLiveStyles();
  loadState();
  renderAll();
  renderOverviewCharts();
  // Set buy date default to today
  const bdEl = document.getElementById('hBuyDate');
  if (bdEl) bdEl.value = new Date().toISOString().split('T')[0];
  initModalBackdropClose();
  fetchAllLivePrices();
  startLiveRefresh();
}
 
// Auto-mount if a #investments-app container exists in the page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('investments-app');
    if (root) mountInvestmentDashboard(root);
    else initInvestments();
  });
} else {
  const root = document.getElementById('investments-app');
  if (root) mountInvestmentDashboard(root);
  // Otherwise caller runs initInvestments() manually
}
 