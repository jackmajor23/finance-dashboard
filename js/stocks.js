// ── Stocks & live prices ─────────────────────────────
// 18. JS: STOCKS / LIVE PRICES
// ═══════════════════════════════════════════════════
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
        ${isWatch?`<button class="icon-btn del" onclick="removeWatch('${t}')">✕</button>`:''}
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
