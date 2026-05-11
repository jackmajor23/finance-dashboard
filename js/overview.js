// ── Overview page & charts
// Depends on: state.js, utils.js, accounts.js (ISA_INFO) ──────────────────────────
// 11. JS: OVERVIEW
// ═══════════════════════════════════════════════════
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
  const all=S.netWorthHistory;
  const periodEl=document.getElementById('nwPeriod');
  const period=periodEl?periodEl.value:'all';
  const now=new Date();
  const cutoff={
    '1w': new Date(now - 7*86400000),
    '1m': new Date(now - 30*86400000),
    '3m': new Date(now - 90*86400000),
    '6m': new Date(now - 180*86400000),
    '1y': new Date(now - 365*86400000),
    '5y': new Date(now - 5*365*86400000),
    'all': new Date(0)
  }[period]||new Date(0);
  const hist=all.filter(h=>new Date(h.date)>=cutoff);
  const el=document.getElementById('nwSub');
  if(el) el.textContent = hist.length>=2 ? hist.length+' data points':'building history…';
  if(hist.length<2) return;
  const labels=hist.map(h=>new Date(h.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}));
  const change=hist.length>=2?hist[hist.length-1].value-hist[0].value:0;
  const trending=change>=0?'#5046e5':'#cc3333';
  nwChart = new Chart(document.getElementById('nwChart'),{
    type:'line',
    data:{labels,datasets:[{data:hist.map(h=>h.value),borderColor:trending,backgroundColor:change>=0?'rgba(80,70,229,.07)':'rgba(204,51,51,.07)',borderWidth:2,pointRadius:0,tension:.4,fill:true}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${fmt(ctx.raw)}`}}},
      scales:{x:{ticks:{color:'#7c7b8a',font:{size:10},maxTicksLimit:8},grid:{display:false}},
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
  // Uses global ISA_INFO from accounts.js
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
