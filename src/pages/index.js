function renderOverview(){
  const now = new Date();
  const hr = now.getHours();
  const name = S.settings.name;
  const greet = hr<12?'Good morning':'Good afternoon';
  document.getElementById('overviewGreeting').textContent = name ? `${greet}, ${name}` : 'Overview';
  document.getElementById('overviewDate').textContent = now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('sidebarTitle').textContent = S.settings.title||'Financial Tracker';

  const H=S.holdings, A=S.accounts;
  const totInv  = H.reduce((s,h)=>s+h.invested,0);
  const totCur  = H.reduce((s,h)=>s+h.current,0);
  const bankBal = A.filter(a=>['current','savings','joint'].includes(a.type)).reduce((s,a)=>s+a.balance,0);
  const pbBal   = S.premiumBonds.amount||0;
  const debtTot = S.debts.reduce((s,d)=>s+(d.remaining||d.total||0),0);
  const netWorth= totCur+bankBal+pbBal-debtTot;
  const pl      = totCur-totInv;
  const isaTot  = A.filter(a=>a.type.includes('isa')).reduce((s,a)=>s+a.balance,0);

  // Snapshot net worth history (once per day)
  const today = now.toISOString().split('T')[0];
  if(!S.netWorthHistory.length || S.netWorthHistory[S.netWorthHistory.length-1].date!==today){
    S.netWorthHistory.push({date:today, value:Math.round(netWorth)});
    if(S.netWorthHistory.length>730) S.netWorthHistory=S.netWorthHistory.slice(-730);
    save();
  }

  document.getElementById('summarycards').innerHTML = `
    <div class="stat-card sc-accent"><div class="stat-label">Net worth</div><div class="stat-val val">${fmt(netWorth)}</div><div class="stat-sub val">${H.length+A.length} assets tracked</div></div>
    <div class="stat-card ${pl>=0?'sc-green':'sc-red'}"><div class="stat-label">Unrealised P&amp;L</div><div class="stat-val ${cls(pl)} val">${fmtS(pl)}</div><div class="stat-sub ${cls(pl)} val">${fmtP(pct(totCur,totInv))}</div></div>
    <div class="stat-card sc-green"><div class="stat-label">ISA holdings</div><div class="stat-val pos val">${fmt(isaTot)}</div><div class="stat-sub">tax-free wrapper</div></div>
    <div class="stat-card ${debtTot>0?'sc-red':'sc-amber'}"><div class="stat-label">Total debts</div><div class="stat-val ${debtTot>0?'neg':'neu'} val">${debtTot>0?'-'+fmt(debtTot):fmt(0)}</div><div class="stat-sub">${S.debts.length} obligation${S.debts.length!==1?'s':''}</div></div>`;

  _renderDonut(); _renderBar(); _renderNWChart(); _renderGoalRings(); _renderISAMini();
}

// Colour map for asset types
const TC = {stocks:'#1d6fca',isa:'#0a8f5c',crypto:'#b87309',cash:'#7c7b8a',pension:'#5046e5',property:'#b03070',other:'#0b7a6e',current:'#6b7280',savings:'#0a8f5c',joint:'#1d6fca','premium bonds':'#b87309'};

function _renderDonut(){
  const groups={};
  S.holdings.forEach(h=>{groups[h.type]=(groups[h.type]||0)+h.current;});
  S.accounts.filter(a=>['current','savings','joint'].includes(a.type)).forEach(a=>{groups[a.type]=(groups[a.type]||0)+a.balance;});
  if(S.premiumBonds.amount) groups['premium bonds']=(groups['premium bonds']||0)+S.premiumBonds.amount;
  const labels=Object.keys(groups), data=labels.map(l=>groups[l]), colors=labels.map(l=>TC[l]||'#888');
  const total=data.reduce((s,v)=>s+v,0);
  document.getElementById('donutCenterVal').textContent=fmt(total);
  document.getElementById('donutLegend').innerHTML=labels.map((l,i)=>`
    <div class="legend-row">
      <div class="legend-left"><div class="legend-dot" style="background:${colors[i]}"></div><span class="legend-name">${l.charAt(0).toUpperCase()+l.slice(1)}</span></div>
      <span class="legend-val val">${fmt(groups[l])}</span>
    </div>`).join('');
  if(donutChart) donutChart.destroy();
  if(!labels.length) return;
  donutChart = new Chart(document.getElementById('donutChart'),{
    type:'doughnut',
    data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'72%',
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${fmt(ctx.raw)}`}}}}
  });
}

function _renderBar(){
  if(barChart) barChart.destroy();
  const H=[...S.holdings].sort((a,b)=>(b.current-b.invested)-(a.current-a.invested));
  if(!H.length) return;
  const labels=H.map(h=>h.ticker||h.name.substring(0,8));
  const pls=H.map(h=>Math.round(h.current-h.invested));
  barChart = new Chart(document.getElementById('barChart'),{
    type:'bar',
    data:{labels,datasets:[{data:pls,backgroundColor:pls.map(v=>v>=0?'rgba(10,143,92,.18)':'rgba(204,51,51,.14)'),borderColor:pls.map(v=>v>=0?'#0a8f5c':'#cc3333'),borderWidth:1.5,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.raw>=0?'+':''}${fmt(Math.abs(ctx.raw))}`}}},
      scales:{x:{ticks:{color:'#7c7b8a',font:{size:10},maxRotation:45},grid:{display:false}},
        y:{ticks:{color:'#7c7b8a',font:{size:10},callback:v=>(v>=0?'+':'')+fmt(Math.abs(v))},grid:{color:'rgba(0,0,0,.04)'}}}}
  });
}

function _renderNWChart(){
  if(nwChart) nwChart.destroy();
  const hist=S.netWorthHistory;
  document.getElementById('nwSub').textContent = hist.length>=2 ? hist.length+' days tracked':'building history…';
  if(hist.length<2) return;
  const labels=hist.map(h=>new Date(h.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}));
  nwChart = new Chart(document.getElementById('nwChart'),{
    type:'line',
    data:{labels,datasets:[{data:hist.map(h=>h.value),borderColor:'#5046e5',backgroundColor:'rgba(80,70,229,.07)',borderWidth:2,pointRadius:0,tension:.4,fill:true}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${fmt(ctx.raw)}`}}},
      scales:{x:{ticks:{color:'#7c7b8a',font:{size:10},maxTicksLimit:6},grid:{display:false}},
        y:{ticks:{color:'#7c7b8a',font:{size:10},callback:v=>fmt(v)},grid:{color:'rgba(0,0,0,.04)'}}}}
  });
}

function _renderGoalRings(){
  const el=document.getElementById('goalsRings');
  if(!S.goals.length){ el.innerHTML='<div class="empty"><div class="ei">◐</div><p>No goals yet.</p></div>'; return; }
  const COLS=['#5046e5','#0a8f5c','#1d6fca','#b87309','#b03070','#0b7a6e'];
  const R=36, C=2*Math.PI*R, SZ=90;
  el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:18px;padding:4px 0;">'+S.goals.map((g,i)=>{
    const p=clamp(g.saved/g.target,0,1), col=COLS[i%COLS.length];
    const dash=p*C, gap=C-dash;
    return`<div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
      <svg width="${SZ}" height="${SZ}" viewBox="0 0 ${SZ} ${SZ}" style="transform:rotate(-90deg)">
        <circle cx="${SZ/2}" cy="${SZ/2}" r="${R}" fill="none" stroke="var(--border)" stroke-width="7"/>
        <circle cx="${SZ/2}" cy="${SZ/2}" r="${R}" fill="none" stroke="${col}" stroke-width="7" stroke-dasharray="${dash.toFixed(1)} ${gap.toFixed(1)}" stroke-linecap="round"/>
      </svg>
      <div style="margin-top:-${SZ/2+14}px;margin-bottom:${SZ/2-4}px;font-size:13px;font-variation-settings:'wght' 700;color:${col};">${Math.round(p*100)}%</div>
      <div style="font-size:11px;color:var(--muted2);text-align:center;max-width:80px;">${g.emoji||''} ${g.name}</div>
    </div>`;
  }).join('')+'</div>';
}

function _renderISAMini(){
  const ISA_INFO={
    'stocks-isa':{name:'S&S ISA',limit:20000,color:'#0a8f5c'},
    'cash-isa':{name:'Cash ISA',limit:20000,color:'#1d6fca'},
    'lifetime-isa':{name:'LISA',limit:4000,color:'#5046e5'},
    'help-to-buy-isa':{name:'HTB ISA',limit:2400,color:'#b03070'},
    'innovative-isa':{name:'IFISA',limit:20000,color:'#0b7a6e'},
    'junior-isa':{name:'Junior ISA',limit:9000,color:'#b87309'},
  };
  const relevant=S.accounts.filter(a=>ISA_INFO[a.type]);
  const el=document.getElementById('isaMiniGrid');
  if(!relevant.length){ el.innerHTML='<div style="color:var(--muted);font-size:12px;">No ISA accounts added yet. Add them in Accounts &amp; ISAs.</div>'; return; }
  el.innerHTML=relevant.map(a=>{
    const info=ISA_INFO[a.type], used=Math.min(a.contrib||0,info.limit), p=Math.min((used/info.limit)*100,100);
    return`<div>
      <div style="font-size:11px;color:var(--muted2);margin-bottom:5px;font-variation-settings:'wght' 600;">${info.name} · ${a.name}</div>
      <div class="prog-outer"><div class="prog-fill" style="width:${p.toFixed(1)}%;background:${info.color};"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;">
        <span style="color:${info.color};font-variation-settings:'wght' 600;" class="val">${fmt(used)} used</span>
        <span style="color:var(--muted);"><span class="val">${fmt(info.limit-used)}</span> left</span>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
// 12. JS: HOLDINGS
// ═══════════════════════════════════════════════════
function setHFilter(f,el){
  hFilter=f;
  document.querySelectorAll('#htab-open .filter-btn').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  renderHoldings();
}

function renderHoldings(){
  const q=(document.getElementById('holdingsSearch')||{}).value||'';
  let H=S.holdings;
  if(hFilter!=='all') H=H.filter(h=>h.type===hFilter);
  if(q) H=H.filter(h=>h.name.toLowerCase().includes(q.toLowerCase())||(h.ticker||'').toLowerCase().includes(q.toLowerCase()));
  const tb=document.getElementById('holdingsBody');
  if(!H.length){ tb.innerHTML=`<tr><td colspan="10"><div class="empty"><div class="ei">◫</div><p>No holdings yet.<br>Add one via the Add tab.</p></div></td></tr>`; return; }
  tb.innerHTML=H.map(h=>{
    const pl=h.current-h.invested, ret=pct(h.current,h.invested);
    const lp=h.ticker?livePrices[h.ticker.toUpperCase()]:null;
    return`<tr>
      <td><span style="font-variation-settings:'wght' 600;">${h.name}</span>${h.ticker?`<span class="ticker-badge">${h.ticker}</span>`:''}</td>
      <td><span class="pill p-${h.type}">${h.type}</span></td>
      <td class="val">${h.buyPrice?CUR()+parseFloat(h.buyPrice).toFixed(2):'—'}</td>
      <td>${fmtDate(h.buyDate)}</td>
      <td class="val">${fmt(h.invested)}</td>
      <td class="val">${fmt(h.current)}${lp?` <span style="font-size:10px;color:var(--muted);">(live)</span>`:''}</td>
      <td class="${cls(pl)} val">${fmtS(pl)}</td>
      <td class="${cls(ret)}">${fmtP(ret)}</td>
      <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px;">${h.notes||'—'}</td>
      <td style="white-space:nowrap;">
        <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
        <button class="icon-btn del"  onclick="deleteHolding(${h.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function renderClosed(){
  const tb=document.getElementById('closedBody');
  if(!S.closedHoldings.length){ tb.innerHTML=`<tr><td colspan="11"><div class="empty"><div class="ei">◫</div><p>No sold positions yet.</p></div></td></tr>`; return; }
  tb.innerHTML=S.closedHoldings.map((h,i)=>{
    const pl=(h.soldFor||0)-h.invested, ret=pct(h.soldFor||0,h.invested);
    return`<tr>
      <td><span style="font-variation-settings:'wght' 600;">${h.name}</span>${h.ticker?`<span class="ticker-badge">${h.ticker}</span>`:''}</td>
      <td><span class="pill p-${h.type}">${h.type}</span></td>
      <td class="val">${h.buyPrice?CUR()+parseFloat(h.buyPrice).toFixed(2):'—'}</td>
      <td>${fmtDate(h.buyDate)}</td>
      <td class="val">${h.sellPrice?CUR()+parseFloat(h.sellPrice).toFixed(2):'—'}</td>
      <td>${fmtDate(h.sellDate)}</td>
      <td class="val">${fmt(h.invested)}</td>
      <td class="val">${fmt(h.soldFor||0)}</td>
      <td class="${cls(pl)} val">${fmtS(pl)}</td>
      <td class="${cls(ret)}">${fmtP(ret)}</td>
      <td><button class="icon-btn del" onclick="deleteClosedHolding(${i})">✕</button></td>
    </tr>`;
  }).join('');
}

function addHolding(){
  const name=(document.getElementById('hName').value||'').trim();
  const ticker=(document.getElementById('hTicker').value||'').trim().toUpperCase();
  const type=document.getElementById('hType').value;
  const invested=parseMoney(document.getElementById('hInvested').value);
  const current=parseMoney(document.getElementById('hCurrent').value);
  const buyPrice=document.getElementById('hBuyPrice').value;
  const shares=document.getElementById('hShares').value;
  const buyDate=document.getElementById('hBuyDate').value;
  const wrapper=document.getElementById('hWrapper').value;
  const notes=document.getElementById('hNotes').value;
  if(!name||isNaN(invested)||isNaN(current)){ toast('Please fill: name, invested, and current value.'); return; }
  S.holdings.push({id:Date.now(),name,ticker,type,invested,current,buyPrice,shares,buyDate,wrapper,notes});
  _addTx({txtype:'buy',date:buyDate||new Date().toISOString().split('T')[0],desc:`Bought ${name}${ticker?' ('+ticker+')':''}`,amount:invested,pnl:0,notes});
  save(); toast(`Added ${name}`);
  ['hName','hTicker','hInvested','hCurrent','hBuyPrice','hShares','hBuyDate','hNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('hWrapper').value='';
}

function deleteHolding(id){
  S.holdings=S.holdings.filter(h=>h.id!==id);
  save(); renderHoldings(); renderOverview(); toast('Holding deleted');
}
function deleteClosedHolding(i){
  S.closedHoldings.splice(i,1);
  save(); renderClosed(); toast('Deleted');
}

function openEditHolding(id){
  editingId=id;
  const h=S.holdings.find(x=>x.id===id);
  if(!h) return;
  document.getElementById('editFormGrid').innerHTML=`
    <div class="ff"><label>Name</label><input type="text" id="em-name" value="${h.name}"/></div>
    <div class="ff"><label>Ticker</label><input type="text" id="em-ticker" value="${h.ticker||''}"/></div>
    <div class="ff"><label>Type</label>
      <select id="em-type">${['stocks','isa','crypto','cash','pension','property','other'].map(t=>`<option value="${t}"${h.type===t?' selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="ff money-field"><label>Invested</label><input type="text" id="em-invested" value="${h.invested.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Current value</label><input type="text" id="em-current" value="${h.current.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Buy price / unit</label><input type="text" id="em-buyprice" value="${h.buyPrice ? h.buyPrice.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Shares / units</label><input type="number" id="em-shares" value="${h.shares||''}" step="any"/></div>
    <div class="ff"><label>Buy date</label><input type="date" id="em-buydate" value="${h.buyDate||''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="em-notes">${h.notes||''}</textarea></div>`;
  ['editSellPrice','editSellDate','editSellTotal'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('editModal').classList.remove('hidden');
}

function saveEditHolding(){
  const h=S.holdings.find(x=>x.id===editingId);
  if(!h) return;
  h.name    = document.getElementById('em-name').value;
  h.ticker  = (document.getElementById('em-ticker').value||'').toUpperCase();
  h.type    = document.getElementById('em-type').value;
  h.invested= parseMoney(document.getElementById('em-invested').value)||h.invested;
  h.current = parseMoney(document.getElementById('em-current').value)||h.current;
  h.buyPrice= document.getElementById('em-buyprice').value;
  h.shares  = document.getElementById('em-shares').value;
  h.buyDate = document.getElementById('em-buydate').value;
  h.notes   = document.getElementById('em-notes').value;
  save(); closeModal('editModal'); renderHoldings(); renderOverview(); toast('Saved');
}

function sellHolding(){
  const h=S.holdings.find(x=>x.id===editingId);
  if(!h) return;
  const sellPrice=document.getElementById('editSellPrice').value;
  const sellDate =document.getElementById('editSellDate').value||new Date().toISOString().split('T')[0];
  const sellTotal=parseMoney(document.getElementById('editSellTotal').value)||h.current;
  const pl=sellTotal-h.invested;
  S.closedHoldings.push({...h,sellPrice,sellDate,soldFor:sellTotal});
  S.holdings=S.holdings.filter(x=>x.id!==editingId);
  _addTx({txtype:'sell',date:sellDate,desc:`Sold ${h.name}${h.ticker?' ('+h.ticker+')':''}`,amount:sellTotal,pnl:pl,notes:`Cost: ${fmt(h.invested)} · Proceeds: ${fmt(sellTotal)}`});
  save(); closeModal('editModal'); renderHoldings(); renderClosed(); renderOverview();
  toast(`Sold ${h.name} · P&L: ${fmtS(pl)}`);
}

// ═══════════════════════════════════════════════════
// 13. JS: ACCOUNTS & ISA
// ═══════════════════════════════════════════════════

function renderAccounts(){
  // ISA tracker
  const el=document.getElementById('isaTracker');
  el.innerHTML=Object.keys(ISA_INFO).map(key=>{
    const info=ISA_INFO[key];
    const matching=S.accounts.filter(a=>a.type===key);
    const used=Math.min(matching.reduce((s,a)=>s+(a.contrib||0),0),info.limit);
    const p=Math.min((used/info.limit)*100,100);
    return`<div class="isa-card">
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;font-variation-settings:'wght' 600;">ISA type</div>
      <div class="isa-name">${info.name}</div>
      <div class="isa-desc">${info.desc}</div>
      <div class="prog-outer"><div class="prog-fill" style="width:${p.toFixed(1)}%;background:${info.color};"></div></div>
      <div class="isa-stats">
        <span style="color:${info.color};font-variation-settings:'wght' 600;" class="val">${fmt(used)} used</span>
        <span style="color:var(--muted);"><span class="val">${fmt(info.limit-used)}</span> of <span class="val">${fmt(info.limit)}</span> left</span>
      </div>
    </div>`;
  }).join('');

  // Accounts grid
  const grid=document.getElementById('accountsGrid');
  if(!S.accounts.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">◳</div><p>No accounts yet. Add one below.</p></div>`; return; }
  grid.innerHTML=S.accounts.map((a,i)=>{
    const info=ISA_INFO[a.type];
    const contrib=a.contrib||0, limit=info?info.limit:null;
    const pf=limit?Math.min((contrib/limit)*100,100):null;
    const col=ACC_COL[a.type]||'var(--muted2)';
    return`<div class="acc-card">
      <div class="acc-top">
        <div>
          <div class="acc-name">${a.name}</div>
          <div class="acc-type-lbl">${a.provider||''} · ${(a.type||'').replace(/-/g,' ')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:22px;">${ACC_ICONS[a.type]||'◈'}</span>
          <button class="icon-btn del" onclick="deleteAccount(${i})">✕</button>
        </div>
      </div>
      <div class="acc-bal val" style="color:${col};">${fmt(a.balance)}</div>
      ${info?`<div style="font-size:11px;color:var(--muted);margin-top:2px;">Contributed: <span class="val">${fmt(contrib)}</span></div>
        <div class="acc-bar"><div class="acc-bar-fill" style="width:${pf.toFixed(1)}%;background:${col};"></div></div>
        <div class="acc-bar-lbl"><span class="val">${fmt(contrib)} used</span><span><span class="val">${fmt(limit-contrib)}</span> left of <span class="val">${fmt(limit)}</span></span></div>`
      :`<div style="font-size:11px;color:var(--muted);margin-top:2px;">${a.type.includes('pension')?'Pension pot':'Account balance'}</div>`}
    </div>`;
  }).join('');
}

function addAccount(){
  const name=(document.getElementById('accName').value||'').trim();
  const type=document.getElementById('accType').value;
  const provider=(document.getElementById('accProvider').value||'').trim();
  const balance=parseMoney(document.getElementById('accBalance').value)||0;
  const contrib=parseMoney(document.getElementById('accContrib').value)||0;
  if(!name){ toast('Please enter an account name.'); return; }
  S.accounts.push({name,type,provider,balance,contrib});
  save(); toast(`Added ${name}`);
  ['accName','accProvider','accBalance','accContrib'].forEach(id=>document.getElementById(id).value='');
  renderAccounts();
}
function deleteAccount(i){ S.accounts.splice(i,1); save(); renderAccounts(); toast('Removed'); }

// ═══════════════════════════════════════════════════
// 14. JS: PREMIUM BONDS
// ═══════════════════════════════════════════════════
function renderPremiumBonds(){
  const pb=S.premiumBonds;
  const totalWins=pb.wins.reduce((s,w)=>s+w.amount,0);
  const effRate=pb.amount>0?((totalWins/pb.amount)*100).toFixed(2):0;
  document.getElementById('pbSummary').innerHTML=`
    <div class="stat-card sc-accent"><div class="stat-label">Bonds held</div><div class="stat-val val">${fmt(pb.amount)}</div><div class="stat-sub">max £50,000</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Total winnings</div><div class="stat-val pos val">${fmt(totalWins)}</div><div class="stat-sub">${pb.wins.length} prize${pb.wins.length!==1?'s':''}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">Effective return</div><div class="stat-val">${effRate}%</div><div class="stat-sub">all time</div></div>`;
  document.getElementById('pbAmount').value = pb.amount||'';
  _renderPBWins();
}

function updatePB(){
  const amount=parseMoney(document.getElementById('pbAmount').value)||0;
  const date=document.getElementById('pbDate').value;
  if(amount>50000){ toast('Maximum holding is £50,000.'); return; }
  S.premiumBonds.amount=amount;
  S.premiumBonds.date=date;
  save(); renderPremiumBonds(); renderOverview(); toast('Premium bonds updated');
}

function addPBWin(){
  const tier=parseInt(document.getElementById('pbWinTier').value)||25;
  const month=parseInt(document.getElementById('pbWinMonth').value)||new Date().getMonth()+1;
  const year=parseInt(document.getElementById('pbWinYear').value)||new Date().getFullYear();
  const autoAdd=document.getElementById('pbAutoAdd').checked;
  const date=`${year}-${String(month).padStart(2,'0')}-01`;
  S.premiumBonds.wins.unshift({amount:tier,date,month,year,autoAdded:autoAdd});
  if(autoAdd) S.premiumBonds.amount=Math.min(50000,(S.premiumBonds.amount||0)+tier);
  _addTx({txtype:'win',date,desc:'Premium Bond prize',amount:tier,pnl:tier,notes:`£${tier.toLocaleString()} prize · ${autoAdd?'added to bonds':'paid to bank'}`});
  save(); renderPremiumBonds(); toast(`🎉 Logged £${tier.toLocaleString()} win!`);
}

function _renderPBWins(){
  const wins=S.premiumBonds.wins;
  const tb=document.getElementById('pbWinsBody');
  if(!wins.length){ tb.innerHTML=`<tr><td colspan="5"><div class="empty"><div class="ei">◎</div><p>No wins logged yet.</p></div></td></tr>`; return; }
  let running=0;
  const rows=[...wins].reverse().map(w=>{running+=w.amount;return{...w,running};}).reverse();
  tb.innerHTML=rows.map((w,i)=>`
    <tr>
      <td>${monthYear(w.month,w.year)}</td>
      <td style="color:var(--green);font-variation-settings:'wght' 700;" class="val">${fmt(w.amount)}</td>
      <td class="val" style="color:var(--green);">${fmt(w.running)}</td>
      <td><span class="pill ${w.autoAdded?'p-isa':'p-income'}">${w.autoAdded?'added to bonds':'paid to bank'}</span></td>
      <td><button class="icon-btn del" onclick="deletePBWin(${i})">✕</button></td>
    </tr>`).join('');
}

function deletePBWin(i){ 
  const deleted=S.premiumBonds.wins.splice(i,1)[0];
  window._lastDeletedPBWin={item:deleted,index:i};
  updatePBUndoButton();
  save(); renderPremiumBonds(); toast('Removed'); 
}

function undoLastPBDelete(){
  if(!window._lastDeletedPBWin) return;
  const {item,index}=window._lastDeletedPBWin;
  S.premiumBonds.wins.splice(index,0,item);
  window._lastDeletedPBWin=null;
  updatePBUndoButton();
  save(); renderPremiumBonds(); toast('Restored');
}

function updatePBUndoButton(){
  const btn=document.getElementById('pbUndoBtn');
  if(!btn) return;
  if(window._lastDeletedPBWin){
    btn.style.opacity='1';
    btn.style.pointerEvents='auto';
  } else {
    btn.style.opacity='0';
    btn.style.pointerEvents='none';
  }
}

// ═══════════════════════════════════════════════════
// 15. JS: SALARY (UK tax calculation)
// ═══════════════════════════════════════════════════
// UK 2025/26 tax bands
    plan5: {threshold:25000, rate:9},
    postgrad:{threshold:21000, rate:6},
  }
};

function calcUKTax(gross, pensionPct, bonus, studentLoanPlan){
  const pensionAmt = gross * (pensionPct||0)/100;
  const taxable = Math.max(0, gross - pensionAmt); // simplified: ignoring salary sacrifice nuance
  const totalIncome = taxable + (bonus||0);

  // Income tax
  let incomeTax=0;
  UK_TAX.bands.forEach(band=>{
    const from=band.from, to=Math.min(band.to, totalIncome);
    if(to>from && totalIncome>from) incomeTax += Math.max(0, to-from) * band.rate/100;
  });

  // NI (simplified annual)
  const ptAnnual=UK_TAX.ni.ptWeekly*52; // ~12,570
  const uelAnnual=UK_TAX.ni.uelWeekly*52; // ~50,270
  let ni=0;
  if(totalIncome>ptAnnual) ni += Math.min(totalIncome,uelAnnual)-ptAnnual > 0 ? (Math.min(totalIncome,uelAnnual)-ptAnnual)*UK_TAX.ni.mainRate/100 : 0;
  if(totalIncome>uelAnnual) ni += (totalIncome-uelAnnual)*UK_TAX.ni.upperRate/100;

  // Student loan
  let slRepayment=0;
  if(studentLoanPlan && studentLoanPlan!=='none' && UK_TAX.studentLoan[studentLoanPlan]){
    const sl=UK_TAX.studentLoan[studentLoanPlan];
    if(totalIncome>sl.threshold) slRepayment=(totalIncome-sl.threshold)*sl.rate/100;
  }

  const totalDeductions=incomeTax+ni+pensionAmt+slRepayment;
  const takeHome=totalIncome-totalDeductions;
  return {gross,bonus:bonus||0,totalIncome,pensionAmt,incomeTax,ni,slRepayment,totalDeductions,takeHome,takeHomeMonthly:takeHome/12};
}

let currentPersonIdx=0;

function addNewPerson(){
  const newPerson='Person '+(S.settings.personNames.length+1);
  S.settings.personNames.push(newPerson);
  save(); renderSalary();
}

function removePerson(idx){
  if(S.settings.personNames.length<=1){ toast('You must have at least one person.'); return; }
  S.settings.personNames.splice(idx,1);
  S.salaries=S.salaries.filter(s=>(s.person||0)!==idx);
  S.salaries.forEach(s=>{ if((s.person||0)>idx) s.person--; });
  currentPersonIdx=Math.min(currentPersonIdx,S.settings.personNames.length-1);
  save(); renderSalary();
}

function editPersonName(idx){
  const current=S.settings.personNames[idx];
  const newName=prompt('Edit person name:',current);
  if(newName && newName.trim()){
    S.settings.personNames[idx]=newName.trim();
    save(); renderSalary();
  }
}

function renderSalary(){
  // Populate person dropdown
  const personSel=document.getElementById('salPerson');
  personSel.innerHTML=S.settings.personNames.map((p,i)=>`<option value="${i}">${p}</option>`).join('');
  personSel.value=currentPersonIdx;

  // Render person management cards
  const pmEl=document.getElementById('personManagement');
  pmEl.innerHTML=S.settings.personNames.map((p,i)=>`
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;cursor:pointer;" onclick="switchPerson(${i})">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:600;font-size:13px;">${p}</span>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn edit" style="width:24px;height:24px;padding:0;font-size:11px;" onclick="editPersonName(${i}); event.stopPropagation();">✎</button>
          ${S.settings.personNames.length>1?`<button class="icon-btn del" style="width:24px;height:24px;padding:0;font-size:11px;" onclick="removePerson(${i}); event.stopPropagation();">✕</button>`:''}
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);">${S.salaries.filter(s=>(s.person||0)===i).length} salary record${S.salaries.filter(s=>(s.person||0)===i).length!==1?'s':''}</div>
    </div>
  `).join('');

  // Render person tabs
  const tabsEl=document.getElementById('personTabs');
  const allPeople=[...S.settings.personNames];
  if(allPeople.length>1) allPeople.push('Household');
  
  if(allPeople.length>1){
    tabsEl.innerHTML=allPeople.map((p,i)=>{
      const isHousehold=i===allPeople.length-1;
      return`<button class="person-btn ${currentPersonIdx===i?'active':''}" onclick="switchPerson(${i})">${isHousehold?'📊 '+p:p}</button>`;
    }).join('');
  } else { tabsEl.innerHTML=''; currentPersonIdx=0; }

  // Get content based on current view
  const el=document.getElementById('salaryContent');
  const isHousehold=S.settings.personNames.length>1 && currentPersonIdx===S.settings.personNames.length;
  
  if(isHousehold){
    renderHouseholdSalary(el);
  } else {
    renderPersonSalary(el,currentPersonIdx);
  }
}

function switchPerson(idx){
  currentPersonIdx=idx;
  renderSalary();
}

function renderPersonSalary(el,personIdx){
  const personSals=S.salaries.filter(s=>(s.person||0)===personIdx);
  
  if(!personSals.length){
    el.innerHTML=`<div class="empty"><div class="ei">◈</div><p>No salary added for ${S.settings.personNames[personIdx]} yet.</p></div>`;
    return;
  }

  const sal=personSals[personSals.length-1];
  const calc=calcUKTax(sal.gross||0, sal.pensionPct||0, sal.bonus||0, sal.studentLoan||'none');

  el.innerHTML=`
    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Gross salary</div><div class="sal-val val">${fmt(calc.gross)}</div><div class="sal-sub">per year · ${sal.employer||'—'}</div></div>
      <div class="sal-card"><div class="sal-label">Bonus</div><div class="sal-val val">${fmt(calc.bonus)}</div><div class="sal-sub">annual</div></div>
      <div class="sal-card"><div class="sal-label">Total income</div><div class="sal-val val">${fmt(calc.totalIncome)}</div><div class="sal-sub">salary + bonus</div></div>
      <div class="sal-card"><div class="sal-label">Income tax</div><div class="sal-val neg val">${fmt(calc.incomeTax)}</div><div class="sal-sub">PAYE 2025/26</div></div>
      <div class="sal-card"><div class="sal-label">National Insurance</div><div class="sal-val neg val">${fmt(calc.ni)}</div><div class="sal-sub">employee NI</div></div>
      <div class="sal-card"><div class="sal-label">Pension (yours)</div><div class="sal-val val">${fmt(calc.pensionAmt)}</div><div class="sal-sub">${sal.pensionPct||0}% of gross</div></div>
      ${calc.slRepayment>0?`<div class="sal-card"><div class="sal-label">Student loan</div><div class="sal-val neg val">${fmt(calc.slRepayment)}</div><div class="sal-sub">${sal.studentLoan} plan</div></div>`:''}
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Take-home (annual)</div><div class="sal-val pos val">${fmt(calc.takeHome)}</div><div class="sal-sub"><span class="val">${fmt(calc.takeHomeMonthly)}</span>/month</div></div>
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Take-home (monthly)</div><div class="sal-val pos val">${fmt(calc.takeHomeMonthly)}</div><div class="sal-sub">estimated net</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="card">
        <div class="card-header"><span class="card-title">UK tax bands 2025/26</span></div>
        <table class="tax-band-table">
          ${UK_TAX.bands.map(b=>{
            const from=b.from, to=Math.min(b.to,calc.totalIncome);
            const taxable=Math.max(0,to-from);
            const amt=taxable*b.rate/100;
            if(calc.totalIncome<b.from) return '';
            return`<tr>
              <td><span class="band-dot" style="background:${b.color};"></span>${b.name}</td>
              <td style="color:var(--muted);font-size:11px;">${fmt(b.from)} – ${b.to===Infinity?'above':fmt(b.to)}</td>
              <td style="font-variation-settings:'wght' 600;">${b.rate}%</td>
              <td style="font-variation-settings:'wght' 600;color:${b.rate>0?'var(--red)':'var(--green)'};" class="val">${b.rate>0?'-'+fmt(amt):'✓ Tax-free'}</td>
            </tr>`;
          }).join('')}
        </table>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Annual breakdown</span></div>
        <div class="sal-chart-wrap"><canvas id="salChart"></canvas></div>
      </div>
    </div>

    <div class="section-label">Salary history · ${S.settings.personNames[personIdx]}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Employer</th><th>Gross</th><th>Bonus</th><th>Take-home/mo</th><th>Started</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${personSals.map((s,i)=>{
            const c=calcUKTax(s.gross||0,s.pensionPct||0,s.bonus||0,s.studentLoan||'none');
            return`<tr>
              <td style="font-variation-settings:'wght' 600;">${s.employer||'—'}</td>
              <td class="val">${fmt(s.gross)}</td>
              <td class="val">${s.bonus?fmt(s.bonus):'—'}</td>
              <td class="pos val">${fmt(c.takeHomeMonthly)}</td>
              <td>${fmtDate(s.startDate)}</td>
              <td><span class="pill ${s.ongoing!==false?'p-income':'p-payment'}">${s.ongoing!==false?'Ongoing':fmtDate(s.endDate)}</span></td>
              <td>
                <button class="icon-btn edit" onclick="openEditSalary(${S.salaries.indexOf(s)})">✎</button>
                <button class="icon-btn del" onclick="deleteSalary(${S.salaries.indexOf(s)})">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${sal.notes?`<div style="padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);font-size:12px;color:var(--muted2);margin-bottom:16px;">📝 ${sal.notes}</div>`:''}`;

  setTimeout(()=>{
    const ctx=document.getElementById('salChart');
    if(!ctx) return;
    if(window._salChart) window._salChart.destroy();
    window._salChart=new Chart(ctx,{
      type:'doughnut',
      data:{
        labels:['Take-home','Income tax','NI','Pension',...(calc.slRepayment>0?['Student loan']:[])],
        datasets:[{data:[Math.round(calc.takeHome),Math.round(calc.incomeTax),Math.round(calc.ni),Math.round(calc.pensionAmt),...(calc.slRepayment>0?[Math.round(calc.slRepayment)]:[])],backgroundColor:['#0a8f5c','#cc3333','#b87309','#5046e5','#0b7a6e'],borderWidth:0}]
      },
      options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:10,padding:10}},tooltip:{callbacks:{label:ctx=>` ${fmt(ctx.raw)}`}}}}
    });
  },50);
}

function renderHouseholdSalary(el){
  const hhSals=S.salaries;
  if(!hhSals.length){
    el.innerHTML=`<div class="empty"><div class="ei">◈</div><p>No salaries added yet.</p></div>`;
    return;
  }

  const totals={gross:0,bonus:0,incomeTax:0,ni:0,pensionAmt:0,slRepayment:0,takeHome:0};
  const breakdowns=[];
  
  S.settings.personNames.forEach((p,i)=>{
    const personSals=S.salaries.filter(s=>(s.person||0)===i);
    if(!personSals.length) return;
    const sal=personSals[personSals.length-1];
    const calc=calcUKTax(sal.gross||0,sal.pensionPct||0,sal.bonus||0,sal.studentLoan||'none');
    totals.gross+=calc.gross;
    totals.bonus+=calc.bonus;
    totals.incomeTax+=calc.incomeTax;
    totals.ni+=calc.ni;
    totals.pensionAmt+=calc.pensionAmt;
    totals.slRepayment+=calc.slRepayment;
    totals.takeHome+=calc.takeHome;
    breakdowns.push({person:p,calc});
  });

  el.innerHTML=`
    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Combined gross</div><div class="sal-val val">${fmt(totals.gross)}</div><div class="sal-sub">per year</div></div>
      <div class="sal-card"><div class="sal-label">Combined bonus</div><div class="sal-val val">${fmt(totals.bonus)}</div><div class="sal-sub">annual</div></div>
      <div class="sal-card"><div class="sal-label">Combined income</div><div class="sal-val val">${fmt(totals.gross+totals.bonus)}</div><div class="sal-sub">salary + bonus</div></div>
      <div class="sal-card"><div class="sal-label">Income tax</div><div class="sal-val neg val">${fmt(totals.incomeTax)}</div><div class="sal-sub">combined PAYE</div></div>
      <div class="sal-card"><div class="sal-label">National Insurance</div><div class="sal-val neg val">${fmt(totals.ni)}</div><div class="sal-sub">combined NI</div></div>
      <div class="sal-card"><div class="sal-label">Pensions</div><div class="sal-val val">${fmt(totals.pensionAmt)}</div><div class="sal-sub">combined</div></div>
      ${totals.slRepayment>0?`<div class="sal-card"><div class="sal-label">Student loans</div><div class="sal-val neg val">${fmt(totals.slRepayment)}</div><div class="sal-sub">combined repayment</div></div>`:''}
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Combined take-home (annual)</div><div class="sal-val pos val">${fmt(totals.takeHome)}</div><div class="sal-sub"><span class="val">${fmt(totals.takeHome/12)}</span>/month</div></div>
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Combined take-home (monthly)</div><div class="sal-val pos val">${fmt(totals.takeHome/12)}</div><div class="sal-sub">estimated combined net</div></div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-header"><span class="card-title">Household breakdown</span></div>
      <table class="tax-band-table">
        <thead><tr><th>Person</th><th>Gross</th><th>Take-home/mo</th></tr></thead>
        <tbody>
          ${breakdowns.map(bd=>`<tr>
            <td style="font-variation-settings:'wght' 600;">${bd.person}</td>
            <td class="val">${fmt(bd.calc.gross)}</td>
            <td class="pos val">${fmt(bd.calc.takeHomeMonthly)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function toggleHousehold(){
  S.settings.household=document.getElementById('householdToggle').checked;
  save(); renderSalary();
}

function addSalary(){
  const person=parseInt(document.getElementById('salPerson').value)||0;
  const employer=(document.getElementById('salEmployer').value||'').trim();
  const gross=parseMoney(document.getElementById('salGross').value)||0;
  const bonus=parseMoney(document.getElementById('salBonus').value)||0;
  const pensionPct=parseFloat(document.getElementById('salPensionPct').value)||0;
  const employerPension=parseFloat(document.getElementById('salEmployerPension').value)||0;
  const studentLoan=document.getElementById('salStudentLoan').value;
  const startDate=document.getElementById('salStartDate').value;
  const ongoing=document.getElementById('salOngoing').checked;
  const endDate=ongoing?null:document.getElementById('salEndDate').value;
  const notes=document.getElementById('salNotes').value;
  if(!gross){ toast('Please enter a gross salary.'); return; }
  S.salaries.push({person,employer,gross,bonus,pensionPct,employerPension,studentLoan,startDate,endDate,ongoing,notes});
  const personName=S.settings.personNames[person]||'Person '+(person+1);
  _addTx({txtype:'income',date:startDate||new Date().toISOString().split('T')[0],desc:`Salary: ${employer}`,amount:gross,pnl:0,notes:`${personName} · Net/mo ~${fmt(calcUKTax(gross,pensionPct,bonus,studentLoan).takeHomeMonthly)}`});
  save(); toast('Salary saved'); renderSalary();
}

function deleteSalary(i){
  S.salaries.splice(i,1);
  save(); renderSalary(); toast('Deleted');
}

function openEditSalary(i){
  const sal=S.salaries[i];
  editingSalaryIdx=i;
  document.getElementById('editSalaryGrid').innerHTML=`
    <div class="ff"><label>Employer</label><input type="text" id="es-employer" value="${sal.employer||''}"/></div>
    <div class="ff money-field"><label>Gross</label><input type="text" id="es-gross" value="${sal.gross ? sal.gross.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Bonus</label><input type="text" id="es-bonus" value="${sal.bonus ? sal.bonus.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Your pension (%)</label><input type="number" id="es-pension" value="${sal.pensionPct||''}"/></div>
    <div class="ff"><label>Student loan</label>
      <select id="es-sl">
        ${['none','plan1','plan2','plan4','plan5','postgrad'].map(v=>`<option value="${v}"${sal.studentLoan===v?' selected':''}>${v}</option>`).join('')}
      </select>
    </div>
    <div class="ff"><label>Start date</label><input type="date" id="es-start" value="${sal.startDate||''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="es-notes">${sal.notes||''}</textarea></div>`;
  document.getElementById('editSalaryModal').classList.remove('hidden');
}

function saveEditSalary(){
  if(editingSalaryIdx===null) return;
  const sal=S.salaries[editingSalaryIdx];
  sal.employer=document.getElementById('es-employer').value;
  sal.gross=parseMoney(document.getElementById('es-gross').value)||sal.gross;
  sal.bonus=parseMoney(document.getElementById('es-bonus').value)||0;
  sal.pensionPct=parseFloat(document.getElementById('es-pension').value)||0;
  sal.studentLoan=document.getElementById('es-sl').value;
  sal.startDate=document.getElementById('es-start').value;
  sal.notes=document.getElementById('es-notes').value;
  save(); closeModal('editSalaryModal'); renderSalary(); toast('Saved');
}

// ═══════════════════════════════════════════════════
// 16. JS: DEBTS
// ═══════════════════════════════════════════════════
function renderDebts(){
  const debts=S.debts;
  const totOwed=debts.reduce((s,d)=>s+(d.remaining??d.total??0),0);
  const totMonthly=debts.reduce((s,d)=>s+(d.monthly||0),0);
  const estMonths=totMonthly>0?Math.ceil(totOwed/totMonthly):0;
  document.getElementById('debtSummaryCards').innerHTML=`
    <div class="stat-card sc-red"><div class="stat-label">Total owed</div><div class="stat-val neg val">${fmt(totOwed)}</div><div class="stat-sub">${debts.length} debt${debts.length!==1?'s':''}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">Monthly payments</div><div class="stat-val val">${fmt(totMonthly)}</div><div class="stat-sub">combined</div></div>
    <div class="stat-card sc-blue"><div class="stat-label">Est. payoff</div><div class="stat-val" style="font-size:20px;">${estMonths?estMonths+' months':'—'}</div><div class="stat-sub">at current rate</div></div>`;

  const grid=document.getElementById('debtGrid');
  if(!debts.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">◉</div><p>No debts tracked.</p></div>`; return; }

  grid.innerHTML=debts.map((d,i)=>{
    const remaining=d.remaining??d.total??0;
    const original=d.total??remaining;
    const paid=Math.max(0,original-remaining);
    const paidPct=original>0?Math.min((paid/original)*100,100):0;
    const now=new Date(), end=d.end?new Date(d.end):null;
    const monthsLeft=end?Math.max(0,Math.round((end-now)/(1000*60*60*24*30.5))):d.monthly>0?Math.ceil(remaining/d.monthly):null;
    return`<div class="debt-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div>
          <div class="debt-name">${d.name}</div>
          <div class="debt-meta">${d.lender||d.type||'Debt'} · ${d.rate||0}% APR</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center;">
          <span class="pill p-debt">${(d.type||'other').replace(/-/g,' ')}</span>
          <button class="icon-btn edit" onclick="openEditDebt(${i})">✎</button>
          <button class="icon-btn del"  onclick="deleteDebt(${i})">✕</button>
        </div>
      </div>
      <div class="debt-owed val">${fmt(remaining)}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">of <span class="val">${fmt(original)}</span> original · ${paidPct.toFixed(0)}% paid</div>
      <div class="prog-outer"><div class="prog-fill" style="width:${paidPct.toFixed(1)}%;background:var(--green);"></div></div>
      <div class="debt-stats">
        <div><div class="ds-lbl">Monthly</div><div class="ds-val val">${fmt(d.monthly||0)}</div></div>
        <div><div class="ds-lbl">Months left</div><div class="ds-val">${monthsLeft??'—'}</div></div>
        <div><div class="ds-lbl">Started</div><div class="ds-val">${fmtDate(d.start)}</div></div>
        <div><div class="ds-lbl">End date</div><div class="ds-val">${fmtDate(d.end)}</div></div>
      </div>
      ${d.notes?`<div style="margin-top:8px;font-size:11px;color:var(--muted2);background:var(--surface2);border-radius:6px;padding:7px 10px;">📝 ${d.notes}</div>`:''}
    </div>`;
  }).join('');
}

function addDebt(){
  const name=(document.getElementById('dName').value||'').trim();
  const type=document.getElementById('dType').value;
  const total=parseMoney(document.getElementById('dTotal').value)||0;
  const remaining=parseMoney(document.getElementById('dRemaining').value)||total;
  const monthly=parseMoney(document.getElementById('dMonthly').value)||0;
  const rate=parseFloat(document.getElementById('dRate').value)||0;
  const start=document.getElementById('dStart').value;
  const end=document.getElementById('dEnd').value;
  const lender=(document.getElementById('dLender').value||'').trim();
  const notes=document.getElementById('dNotes').value;
  if(!name||!total){ toast('Please enter name and total amount.'); return; }
  S.debts.push({name,type,total,remaining,monthly,rate,start,end,lender,notes});
  _addTx({txtype:'payment',date:start||new Date().toISOString().split('T')[0],desc:`Debt: ${name}`,amount:total,pnl:-total,notes:`${fmt(monthly)}/month · ${rate}% APR`});
  save(); toast(`Added: ${name}`); renderDebts(); renderOverview();
  ['dName','dTotal','dRemaining','dMonthly','dRate','dStart','dEnd','dLender','dNotes'].forEach(id=>document.getElementById(id).value='');
}

function deleteDebt(i){ S.debts.splice(i,1); save(); renderDebts(); renderOverview(); toast('Removed'); }

function openEditDebt(i){
  editingDebtIdx=i;
  const d=S.debts[i];
  document.getElementById('editDebtGrid').innerHTML=`
    <div class="ff"><label>Name</label><input type="text" id="ed-name" value="${d.name}"/></div>
    <div class="ff"><label>Type</label>
      <select id="ed-type">${['Loan','Mortgage','Credit-card','Student','Car','Other'].map(t=>`<option value="${t}"${d.type===t?' selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="ff money-field"><label>Original total</label><input type="text" id="ed-total" value="${d.total ? d.total.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Remaining</label><input type="text" id="ed-remaining" value="${d.remaining ? d.remaining.toLocaleString('en-GB') : (d.total ? d.total.toLocaleString('en-GB') : '')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Monthly payment</label><input type="text" id="ed-monthly" value="${d.monthly ? d.monthly.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Interest rate (%)</label><input type="number" id="ed-rate" value="${d.rate||''}" step=".1"/></div>
    <div class="ff"><label>Start date</label><input type="date" id="ed-start" value="${d.start||''}"/></div>
    <div class="ff"><label>End date</label><input type="date" id="ed-end" value="${d.end||''}"/></div>
    <div class="ff"><label>Lender</label><input type="text" id="ed-lender" value="${d.lender||''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="ed-notes">${d.notes||''}</textarea></div>`;
  document.getElementById('editDebtModal').classList.remove('hidden');
}

function saveEditDebt(){
  if(editingDebtIdx===null) return;
  const d=S.debts[editingDebtIdx];
  d.name=document.getElementById('ed-name').value;
  d.type=document.getElementById('ed-type').value;
  d.total=parseMoney(document.getElementById('ed-total').value)||d.total;
  d.remaining=parseMoney(document.getElementById('ed-remaining').value)??d.remaining;
  d.monthly=parseMoney(document.getElementById('ed-monthly').value)||0;
  d.rate=parseFloat(document.getElementById('ed-rate').value)||0;
  d.start=document.getElementById('ed-start').value;
  d.end=document.getElementById('ed-end').value;
  d.lender=document.getElementById('ed-lender').value;
  d.notes=document.getElementById('ed-notes').value;
  save(); closeModal('editDebtModal'); renderDebts(); toast('Saved');
}

// ═══════════════════════════════════════════════════
// 17. JS: GOALS
// ═══════════════════════════════════════════════════
const GOAL_COLS=['#5046e5','#0a8f5c','#1d6fca','#b87309','#b03070','#0b7a6e'];
function renderGoals(){
  const grid=document.getElementById('goalsGrid');
  if(!S.goals.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">◐</div><p>No goals yet.</p></div>`; return; }
  grid.innerHTML=S.goals.map((g,i)=>{
    const p=clamp(g.saved/g.target,0,1), col=GOAL_COLS[i%GOAL_COLS.length];
    const rem=g.target-g.saved, now=new Date(), end=g.date?new Date(g.date):null;
    const mo=end?Math.max(0,Math.round((end-now)/(1000*60*60*24*30.5))):null;
    const onTrack=g.monthly&&mo?g.monthly*mo>=rem:null;
    return`<div class="goal-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="goal-name">${g.emoji||'◐'} ${g.name}</div>
          <div class="goal-meta">Target: ${fmtDate(g.date)}${mo!=null?' · '+mo+' months':''}</div>
        </div>
        <div style="display:flex;gap:5px;">
          ${onTrack!=null?`<span class="pill ${onTrack?'p-income':'p-payment'}">${onTrack?'on track':'behind'}</span>`:''}
          <button class="icon-btn del" onclick="deleteGoal(${i})">✕</button>
        </div>
      </div>
      <div class="goal-saved val" style="color:${col};">${fmt(g.saved)} <span style="font-size:14px;color:var(--muted);font-variation-settings:'wght' 400;">of ${fmt(g.target)}</span></div>
      <div class="prog-outer" style="margin:8px 0 5px;"><div class="prog-fill" style="width:${(p*100).toFixed(1)}%;background:${col};"></div></div>
      <div class="goal-stats">
        <span style="color:${col};font-variation-settings:'wght' 600;">${Math.round(p*100)}% complete</span>
        <span style="color:var(--muted);"><span class="val">${fmt(rem)}</span> to go${g.monthly?' · <span class="val">'+fmt(g.monthly)+'</span>/mo':''}</span>
      </div>
    </div>`;
  }).join('');
}

function addGoal(){
  const name=(document.getElementById('gName').value||'').trim();
  const target=parseMoney(document.getElementById('gTarget').value);
  const saved=parseMoney(document.getElementById('gSaved').value)||0;
  const date=document.getElementById('gDate').value;
  const monthly=parseMoney(document.getElementById('gMonthly').value)||0;
  const emoji=document.getElementById('gEmoji').value||'◐';
  if(!name||isNaN(target)||!date){ toast('Please fill name, target, and date.'); return; }
  S.goals.push({name,target,saved,date,monthly,emoji});
  save(); toast(`Added: ${name}`);
  ['gName','gTarget','gSaved','gDate','gMonthly','gEmoji'].forEach(id=>document.getElementById(id).value='');
  renderGoals();
}
function deleteGoal(i){ S.goals.splice(i,1); save(); renderGoals(); toast('Removed'); }

// ═══════════════════════════════════════════════════
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
    {amount:25,date:'2024-07-01',month:7,year:2024,autoAdded:false},
    {amount:50,date:'2024-09-01',month:9,year:2024,autoAdded:true},
    {amount:25,date:'2025-01-01',month:1,year:2025,autoAdded:false},
    {amount:25,date:'2025-03-01',month:3,year:2025,autoAdded:false},
  ]};
  S.debts=[
    {name:'Car finance',type:'car',total:12000,remaining:8400,monthly:350,rate:6.9,start:'2023-01-01',end:'2026-01-01',lender:'Santander',notes:'Final balloon payment Jan 2026'},
    {name:'Student loan',type:'student',total:27000,remaining:24000,monthly:180,rate:4.5,start:'2020-09-01',end:'2035-09-01',lender:'SLC',notes:'Plan 2'},
  ];
  S.goals=[
    {name:'House deposit',target:40000,saved:24000,date:'2027-06-01',monthly:600,emoji:'🏠'},
    {name:'Emergency fund',target:10000,saved:8500,date:'2025-12-01',monthly:200,emoji:'🛡'},
    {name:'New car',target:15000,saved:3200,date:'2026-09-01',monthly:400,emoji:'🚗'},
  ];
  S.salaries=[
    {person:0,employer:'Acme Ltd',gross:48000,bonus:3000,pensionPct:5,employerPension:3,studentLoan:'plan2',startDate:'2022-09-01',ongoing:true,endDate:null,notes:'Includes £3k annual bonus'},
    {person:1,employer:'NHS',gross:35000,bonus:0,pensionPct:7,employerPension:14,studentLoan:'none',startDate:'2021-03-01',ongoing:true,endDate:null,notes:'NHS pension scheme'},
  ];
  S.watchlist=['NVDA','^FTSE','^GSPC','ETH-GBP'];
  S.transactions=[
    {id:1,txtype:'buy',date:'2023-06-01',desc:'Bought Apple Inc. (AAPL)',amount:2000,pnl:0,notes:''},
    {id:2,txtype:'buy',date:'2022-03-15',desc:'Bought Vanguard S&P 500 (VUSA.L)',amount:5000,pnl:0,notes:''},
    {id:3,txtype:'buy',date:'2023-01-10',desc:'Bought Bitcoin (BTC-GBP)',amount:1500,pnl:0,notes:''},
    {id:4,txtype:'sell',date:'2024-02-15',desc:'Sold Ethereum (ETH-GBP)',amount:1044,pnl:344,notes:'Cost: £700 · Proceeds: £1,044'},
    {id:5,txtype:'win',date:'2025-01-01',desc:'Premium Bond prize',amount:25,pnl:25,notes:'£25 prize · paid to bank'},
    {id:6,txtype:'income',date:'2022-09-01',desc:'Salary: Acme Ltd',amount:48000,pnl:0,notes:'Person 1'},
    {id:7,txtype:'payment',date:'2023-01-01',desc:'Debt: Car finance',amount:12000,pnl:-12000,notes:'£350/month · 6.9% APR'},
  ];
  S.netWorthHistory=[];
  for(let i=60;i>=0;i--){

// ═══════════════════════════════════════════════════════════════════════════
// BILLS TRACKING
// ═══════════════════════════════════════════════════════════════════════════
function renderBills(){
  const container = document.getElementById('billsGrid');
  if(!container) return;
  
  if(!S.bills.length){
    container.innerHTML=`<div class="empty" style="grid-column:1/-1;"><div class="ei">📋</div><p>No bills tracked yet.<br>Add one using the form below.</p></div>`;
    return;
  }
  
  // Calculate upcoming bills
  const today = new Date();
  const billsWithNext = S.bills.map(b=>{
    let nextDate = new Date(b.nextPaymentDate);
    let daysUntil = Math.ceil((nextDate - today)/(1000*60*60*24));
    
    // If past due, calculate next occurrence
    if(daysUntil < 0 && b.recurring !== 'never'){
      if(b.recurring === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if(b.recurring === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if(b.recurring === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      daysUntil = Math.ceil((nextDate - today)/(1000*60*60*24));
    }
    
    return {...b, nextDate, daysUntil};
  });
  
  container.innerHTML = billsWithNext.map((b,i)=>{
    const status = b.daysUntil < 0 ? 'overdue' : b.daysUntil < 7 ? 'due-soon' : 'upcoming';
    const statusLabel = b.daysUntil < 0 ? '⚠ OVERDUE' : b.daysUntil === 0 ? '🔴 TODAY' : b.daysUntil < 7 ? '🟡 Due soon' : '🟢 Upcoming';
    const amountClass = b.amount > 0 ? 'neg' : '';
    
    let durationText = '';
    if(b.recurring === 'never' && b.endDate){
      const end = new Date(b.endDate);
      const monthsLeft = Math.ceil((end - today)/(1000*60*60*24*30));
      durationText = `${monthsLeft} month${monthsLeft !== 1 ? 's' : ''} remaining`;
    } else if(b.recurring !== 'never'){
      durationText = `${b.recurring} (ongoing)`;
    }
    
    return `<div class="bill-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div class="bill-name">${b.name}</div>
          <div class="bill-cat" style="font-size:10px;color:var(--muted);margin-top:2px;">${b.category || 'Other'}</div>
        </div>
        <div style="text-align:right;">
          <div class="bill-amount ${amountClass} val">£${Math.abs(b.amount).toFixed(2)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">${b.frequency || 'Monthly'}</div>
        </div>
      </div>
      
      <div style="background:var(--bg);padding:8px;border-radius:6px;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px;">Next payment</div>
        <div style="font-size:12px;font-variation-settings:'wght' 600;">${fmtDate(b.nextDate)}</div>
        <div class="bill-status ${status}" style="font-size:10px;margin-top:3px;">${statusLabel}</div>
      </div>
      
      ${durationText ? `<div style="font-size:10px;color:var(--muted2);margin-bottom:10px;">⏱ ${durationText}</div>` : ''}
      
      <div style="display:flex;gap:6px;">
        <button class="icon-btn edit" onclick="openEditBill(${i})" style="flex:1;text-align:center;padding:6px;background:var(--accent-dim);border:1px solid var(--accent);border-radius:4px;color:var(--accent);font-size:11px;cursor:pointer;">✎ Edit</button>
        <button class="icon-btn del" onclick="deleteBill(${i})" style="flex:1;text-align:center;padding:6px;background:var(--red-dim);border:1px solid var(--red);border-radius:4px;color:var(--red);font-size:11px;cursor:pointer;">✕ Remove</button>
      </div>
    </div>`;
  }).join('');
}
