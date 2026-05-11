// ── Stocks & live prices ─────────────────────────────
// 18. JS: STOCKS / LIVE PRICES
// ═══════════════════════════════════════════════════
window.liveHistory = {};
async function _fetchPrice(ticker){
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;
  try {
    const res=await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,{headers:{'Accept':'application/json'}});
    if(!res.ok) return null;
    const data=await res.json();
    const q=data?.chart?.result?.[0];
    if(!q) return null;
    const meta=q.meta;
    const price=meta.regularMarketPrice??meta.previousClose??0;
    const prev=meta.chartPreviousClose??meta.previousClose??price;
    const change=prev?((price-prev)/prev*100):0;
    return{price,change,currency:meta.currency||'USD',name:meta.longName||meta.shortName||ticker};
  } catch(e){ return null; }
}

async function _fetchHistory(ticker, range='1y'){
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`;
  try {
    const res=await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,{headers:{'Accept':'application/json'}});
    if(!res.ok) return null;
    const data=await res.json();
    const q=data?.chart?.result?.[0];
    if(!q) return null;
    const timestamps=q.timestamp;
    const closes=q.indicators.quote[0].close;
    const history=timestamps.map((t,i)=>({date:new Date(t*1000),price:closes[i]})).filter(p=>p.price);
    return history;
  } catch(e){ return null; }
}

async function refreshPrices(){
  const tickers=[...new Set([
    ...S.holdings.filter(h=>h.ticker).map(h=>h.ticker.toUpperCase()),
    ...S.watchlist.map(t=>t.toUpperCase())
  ])];
  if(!tickers.length){ toast('No tickers to refresh. Add holdings with ticker symbols.'); return; }
  toast(`Fetching ${tickers.length} price${tickers.length>1?'s':''}…`);
  const results=await Promise.allSettled(tickers.map(async t=>({t,data:await _fetchPrice(t)})));
  let ok=0;
  results.forEach(r=>{ if(r.status==='fulfilled'&&r.value?.data){ livePrices[r.value.t]=r.value.data; ok++; } });
  const time=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('lastRefreshTime').textContent=`refreshed ${time} · ${ok}/${tickers.length} ok`;
  toast(`Updated ${ok}/${tickers.length} prices`);
  renderStocks(); renderHoldings();
}

function renderStocks(){
  const all=[...new Set([...S.holdings.filter(h=>h.ticker).map(h=>h.ticker.toUpperCase()),...S.watchlist])];
  const grid=document.getElementById('stocksGrid');
  if(!all.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">◬</div><p>No tickers tracked yet.<br>Add a holding with a ticker, or use the watchlist above.</p></div>`; return; }
  grid.innerHTML=all.map(t=>{
    const p=livePrices[t];
    const isWatch=!S.holdings.find(h=>(h.ticker||'').toUpperCase()===t);
    const sym=p?.currency==='GBp'?'p':p?.currency==='GBP'?'£':'$';
    return`<div class="stock-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="stock-ticker">${t}</div>
          <div class="stock-name">${p?.name||'—'}</div>
        </div>
        <div>
          ${isWatch?`<button class="icon-btn" onclick="viewChart('${t}')" title="View chart">📈</button>`:''}
          ${isWatch?`<button class="icon-btn del" onclick="removeWatch('${t}')">✕</button>`:''}
        </div>
      </div>
      ${p
        ?`<div class="stock-price val">${sym}${p.price<1?p.price.toFixed(4):p.price.toFixed(2)}</div>
          <div class="stock-chg ${p.change>=0?'pos':'neg'}">${p.change>=0?'▲':'▼'} ${Math.abs(p.change).toFixed(2)}%</div>
          <div style="font-size:10px;color:var(--muted);margin-top:5px;">${p.currency} · 15-min delay</div>`
        :`<div style="color:var(--muted);font-size:12px;margin-top:8px;">Click ↻ Refresh to load</div>`}
    </div>`;
  }).join('');
}

function addWatchTicker(){
  const t=(document.getElementById('watchTicker').value||'').trim().toUpperCase();
  if(!t) return;
  if(!S.watchlist.includes(t)){ S.watchlist.push(t); save(); }
  document.getElementById('watchTicker').value='';
  renderStocks(); toast(`Added ${t} to watchlist`);
}
function removeWatch(t){ S.watchlist=S.watchlist.filter(x=>x!==t); save(); renderStocks(); }

function generateChart(history, width=500, height=200){
  if(!history || history.length<2) return '<div style="color:var(--muted);font-size:14px;padding:20px;">No data available</div>';
  const prices=history.map(p=>p.price);
  const min=Math.min(...prices), max=Math.max(...prices);
  const range=max-min||1;
  const points=history.map((p,i)=>`${(i/(history.length-1))*width},${height - ((p.price-min)/range)*height}`).join(' ');
  return `<svg width="${width}" height="${height}" style="border:1px solid var(--border);border-radius:4px;">
    <polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${points}"/>
  </svg>`;
}

async function viewChart(ticker){
  document.getElementById('chartTitle').textContent=`${ticker} Chart`;
  document.getElementById('chartModal').classList.remove('hidden');
  await loadChart(ticker, '1y');
}

async function loadChart(ticker, range){
  document.getElementById('chartContainer').innerHTML='<div style="padding:20px;">Loading...</div>';
  const history = await _fetchHistory(ticker, range);
  if(history){
    window.liveHistory[ticker] = window.liveHistory[ticker] || {};
    window.liveHistory[ticker][range] = history;
  }
  const chart = generateChart(history);
  document.getElementById('chartContainer').innerHTML=chart;
}

function setChartRange(range, el){
  document.querySelectorAll('#chartModal .filter-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  const ticker = document.getElementById('chartTitle').textContent.split(' ')[0];
  loadChart(ticker, range);
}
