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

// ═══════════════════════════════════════════════════
// 19. JS: TRANSACTIONS
// ═══════════════════════════════════════════════════
function _addTx(tx){ S.transactions.push({id:Date.now(),...tx}); }

function setTxFilter(f,el){
  txFilter=f;
  document.querySelectorAll('#page-transactions .filter-btn').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  renderTransactions();
}

function renderTransactions(){
  const q=(document.getElementById('txSearch')||{}).value||'';
  let T=S.transactions;
  if(txFilter!=='all') T=T.filter(t=>t.txtype===txFilter);
  if(q) T=T.filter(t=>(t.desc||'').toLowerCase().includes(q.toLowerCase())||(t.notes||'').toLowerCase().includes(q.toLowerCase()));
  T=[...T].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tb=document.getElementById('txBody');
  if(!T.length){ tb.innerHTML=`<tr><td colspan="6"><div class="empty"><div class="ei">≡</div><p>No transactions yet.</p></div></td></tr>`; return; }
  tb.innerHTML=T.map(t=>`
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td><span class="pill p-${t.txtype}">${t.txtype}</span></td>
      <td>${t.desc||'—'}</td>
      <td class="${t.amount>=0?'pos':'neg'} val">${fmt(Math.abs(t.amount))}</td>
      <td class="${cls(t.pnl||0)} val">${t.pnl?fmtS(t.pnl):'—'}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px;">${t.notes||'—'}</td>
    </tr>`).join('');
}

// ═══════════════════════════════════════════════════
// 20. JS: TAX SUMMARY
// ═══════════════════════════════════════════════════
function renderTax(){
  const isaUsed=S.accounts.filter(a=>ISA_INFO[a.type]).reduce((s,a)=>s+(a.contrib||0),0);
  const isaLimit=20000, isaLeft=Math.max(0,isaLimit-isaUsed);
  const realisedGains=S.closedHoldings.filter(h=>(h.soldFor||0)>h.invested).reduce((s,h)=>s+(h.soldFor-h.invested),0);
  const realisedLosses=S.closedHoldings.filter(h=>(h.soldFor||0)<h.invested).reduce((s,h)=>s+(h.invested-(h.soldFor||0)),0);
  const netGain=realisedGains-realisedLosses;
  const CGT_ALLOWANCE=3000;
  const cgtLiable=Math.max(0,netGain-CGT_ALLOWANCE);
  const pbWins=S.premiumBonds.wins.reduce((s,w)=>s+w.amount,0);
  const sal=S.salaries.length?S.salaries[S.salaries.length-1]:null;

  document.getElementById('taxGrid').innerHTML=`
    <div class="tax-card"><div class="stat-label">Realised P&amp;L (total)</div><div class="stat-val ${cls(netGain)} val">${fmtS(netGain)}</div><div class="stat-sub val">Gains: ${fmt(realisedGains)} · Losses: ${fmt(realisedLosses)}</div></div>
    <div class="tax-card"><div class="stat-label">CGT allowance 2025/26</div><div class="stat-val val">${fmt(CGT_ALLOWANCE)}</div><div class="stat-sub ${cgtLiable>0?'neg':'pos'}">${cgtLiable>0?fmt(cgtLiable)+' potentially liable':'Within allowance ✓'}</div></div>
    <div class="tax-card"><div class="stat-label">ISA allowance left</div><div class="stat-val pos val">${fmt(isaLeft)}</div><div class="stat-sub">of <span class="val">${fmt(isaLimit)}</span> · <span class="val">${fmt(isaUsed)}</span> used</div></div>
    <div class="tax-card"><div class="stat-label">Premium bond wins</div><div class="stat-val pos val">${fmt(pbWins)}</div><div class="stat-sub">Tax-free ✓</div></div>
    <div class="tax-card"><div class="stat-label">Unrealised P&amp;L</div><div class="stat-val ${cls(S.holdings.reduce((s,h)=>s+(h.current-h.invested),0))} val">${fmtS(S.holdings.reduce((s,h)=>s+(h.current-h.invested),0))}</div><div class="stat-sub">Not yet taxable</div></div>
    <div class="tax-card"><div class="stat-label">Gross salary</div><div class="stat-val val">${sal?fmt(sal.gross):'—'}</div><div class="stat-sub">Personal allowance: ${fmt(UK_TAX.personalAllowance)}</div></div>`;

  const el=document.getElementById('taxIsaDetail');
  const relevant=S.accounts.filter(a=>ISA_INFO[a.type]);
  if(!relevant.length){ el.innerHTML='<div style="color:var(--muted);font-size:12px;">No ISA accounts added.</div>'; return; }
  el.innerHTML=relevant.map(a=>{
    const info=ISA_INFO[a.type], used=Math.min(a.contrib||0,info.limit), p=Math.min((used/info.limit)*100,100);
    return`<div style="display:flex;align-items:center;gap:14px;">
      <div style="width:130px;font-size:12px;color:var(--muted2);">${info.name}</div>
      <div style="flex:1;" class="prog-outer"><div class="prog-fill" style="width:${p.toFixed(1)}%;background:${info.color};"></div></div>
      <div style="font-size:12px;font-variation-settings:'wght' 600;width:70px;text-align:right;color:${info.color};" class="val">${fmt(used)}</div>
      <div style="font-size:11px;color:var(--muted);width:90px;text-align:right;"><span class="val">${fmt(info.limit-used)}</span> left</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
// 21. JS: SETTINGS
// ═══════════════════════════════════════════════════
function saveSettings(){
  S.settings.name    = (document.getElementById('setName').value||'').trim();
  S.settings.title   = (document.getElementById('setTitle').value||'').trim()||'My Wealth';
  S.settings.currency= (document.getElementById('setCurrency').value||'£').trim();
  save(); renderOverview(); toast('Settings saved');
}

function clearAll(){
  if(!confirm('Clear all data? This cannot be undone.')) return;
  localStorage.removeItem(SK);
  location.reload();
}

// ═══════════════════════════════════════════════════
// 22. JS: SAMPLE DATA & INIT
// ═══════════════════════════════════════════════════
function loadSample(){
  S.settings = { name:'Alex', title:"Alex's Wealth", currency:'£', household:true };
  S.holdings = [
    {id:1,name:'Apple Inc.',ticker:'AAPL',type:'stocks',invested:2000,current:2640,buyPrice:'148.50',shares:'15',buyDate:'2023-06-01',wrapper:'gia',notes:'Long-term hold'},
    {id:2,name:'Vanguard S&P 500',ticker:'VUSA.L',type:'isa',invested:5000,current:6200,buyPrice:'80.20',shares:'70',buyDate:'2022-03-15',wrapper:'stocks-isa',notes:'Core holding'},
    {id:3,name:'Bitcoin',ticker:'BTC-GBP',type:'crypto',invested:1500,current:1950,buyPrice:'22000',shares:'0.068',buyDate:'2023-01-10',wrapper:'',notes:''},
    {id:4,name:'Tesla',ticker:'TSLA',type:'stocks',invested:800,current:590,buyPrice:'220',shares:'4',buyDate:'2023-09-20',wrapper:'gia',notes:'Speculative position'},
    {id:5,name:'iShares MSCI World',ticker:'SWDA.L',type:'isa',invested:3000,current:3600,buyPrice:'81.50',shares:'42',buyDate:'2022-08-01',wrapper:'stocks-isa',notes:'Global diversification'},
  ];
  S.closedHoldings=[{id:99,name:'Ethereum',ticker:'ETH-GBP',type:'crypto',invested:700,soldFor:1044,buyPrice:'1200',buyDate:'2022-05-01',sellPrice:'1800',sellDate:'2024-02-15'}];
  S.accounts=[
    {name:'Monzo Current',type:'current',provider:'Monzo',balance:3200,contrib:0},
    {name:'Marcus Savings',type:'savings',provider:'Marcus',balance:8500,contrib:0},
    {name:'Vanguard ISA',type:'stocks-isa',provider:'Vanguard',balance:9800,contrib:8000},
    {name:'Moneybox LISA',type:'lifetime-isa',provider:'Moneybox',balance:12000,contrib:3200},
    {name:'Barclays HTB ISA',type:'help-to-buy-isa',provider:'Barclays',balance:3400,contrib:2400},
  ];
  S.premiumBonds={amount:10000,date:'2023-04-01',wins:[
