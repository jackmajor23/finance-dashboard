// ── Overview page & charts
// JS: OVERVIEW — Enhanced Edition
// ═══════════════════════════════════════════════════

function renderOverview(){
  const now = new Date();
  const hr = now.getHours();
  const name = S.settings.name;
  const greet = hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
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

  // ── Net worth monthly change callout ──────────────────────────────
  let nwChangeHTML = '';
  if(S.netWorthHistory.length>=2){
    const hist = S.netWorthHistory;
    const latest = hist[hist.length-1].value;
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate()-30);
    const monthAgo = hist.filter(h=>new Date(h.date)<=cutoff).at(-1) || hist[0];
    const diff = latest - monthAgo.value;
    const pctChange = monthAgo.value ? ((diff/monthAgo.value)*100).toFixed(1) : 0;
    const sign = diff>=0?'+':'';
    const col  = diff>=0?'var(--green, #0a8f5c)':'var(--red, #cc3333)';
    nwChangeHTML = `<div id="nwChangeCallout" style="
      display:inline-flex;align-items:center;gap:8px;
      padding:7px 14px;border-radius:20px;
      background:${diff>=0?'rgba(10,143,92,.09)':'rgba(204,51,51,.09)'};
      border:1px solid ${diff>=0?'rgba(10,143,92,.22)':'rgba(204,51,51,.22)'};
      font-size:13px;margin-bottom:12px;">
      <span style="font-size:16px;">${diff>=0?'📈':'📉'}</span>
      <span style="color:${col};font-variation-settings:'wght' 700;">${sign}${fmt(Math.abs(diff))} (${sign}${pctChange}%)</span>
      <span style="color:var(--muted);">in the last 30 days</span>
    </div>`;
  }
  const calloutEl = document.getElementById('nwCalloutWrap');
  if(calloutEl) calloutEl.innerHTML = nwChangeHTML;

  // ── Upcoming events ticker ─────────────────────────────────────────
  _renderEventsTicker(now);

  // ── Stat cards (now clickable) ────────────────────────────────────
  document.getElementById('summarycards').innerHTML = `
    <div class="stat-card sc-accent clickable-card" data-modal="networth" style="cursor:pointer;">
      <div class="stat-label">Net worth</div>
      <div class="stat-val val">${fmt(netWorth)}</div>
      <div class="stat-sub val">${H.length+A.length} assets tracked</div>
      <div class="card-expand-hint">↗ breakdown</div>
    </div>
    <div class="stat-card ${pl>=0?'sc-green':'sc-red'} clickable-card" data-modal="pl" style="cursor:pointer;">
      <div class="stat-label">Unrealised P&amp;L</div>
      <div class="stat-val ${cls(pl)} val">${fmtS(pl)}</div>
      <div class="stat-sub ${cls(pl)} val">${fmtP(pct(totCur,totInv))}</div>
      <div class="card-expand-hint">↗ by holding</div>
    </div>
    <div class="stat-card sc-green clickable-card" data-modal="isa" style="cursor:pointer;">
      <div class="stat-label">ISA holdings</div>
      <div class="stat-val pos val">${fmt(isaTot)}</div>
      <div class="stat-sub">tax-free wrapper</div>
      <div class="card-expand-hint">↗ details</div>
    </div>
    <div class="stat-card ${debtTot>0?'sc-red':'sc-amber'} clickable-card" data-modal="debts" style="cursor:pointer;">
      <div class="stat-label">Total debts</div>
      <div class="stat-val ${debtTot>0?'neg':'neu'} val">${debtTot>0?'-'+fmt(debtTot):fmt(0)}</div>
      <div class="stat-sub">${S.debts.length} obligation${S.debts.length!==1?'s':''}</div>
      <div class="card-expand-hint">↗ breakdown</div>
    </div>`;

  // Attach click handlers for modals
  document.querySelectorAll('.clickable-card').forEach(card=>{
    card.addEventListener('click', ()=> _openStatModal(card.dataset.modal, {netWorth,totCur,totInv,bankBal,pbBal,debtTot,isaTot,pl}));
  });

  _renderDonut();
  _renderBar();
  _renderNWChart();
  _renderGoalRings();
  _renderISAMini();
  _renderAllocationChart();
  _renderDebtTimeline();
  _renderMonthlyCashFlow();
}

// ══════════════════════════════════════════════════
// STAT CARD MODAL
// ══════════════════════════════════════════════════

function _openStatModal(type, totals){
  // Remove existing modal if any
  const existing = document.getElementById('statCardModal');
  if(existing) existing.remove();

  let title='', rows=[];

  if(type==='networth'){
    title = 'Net Worth Breakdown';
    // Holdings
    S.holdings.forEach(h=>{
      rows.push({label:`${h.ticker||h.name} <span style="opacity:.5;font-size:11px;">${h.type}</span>`, value:h.current, sub:`invested ${fmt(h.invested)}`, color: h.current>=h.invested?'pos':'neg'});
    });
    // Bank accounts
    S.accounts.filter(a=>['current','savings','joint'].includes(a.type)).forEach(a=>{
      rows.push({label:`${a.name} <span style="opacity:.5;font-size:11px;">${a.type}</span>`, value:a.balance, color:'neu'});
    });
    // ISAs
    S.accounts.filter(a=>a.type.includes('isa')).forEach(a=>{
      rows.push({label:`${a.name} <span style="opacity:.5;font-size:11px;">ISA</span>`, value:a.balance, color:'pos'});
    });
    // Premium Bonds
    if(S.premiumBonds.amount){
      rows.push({label:'Premium Bonds', value:S.premiumBonds.amount, color:'neu'});
    }
    // Debts (negative)
    S.debts.forEach(d=>{
      const amt = d.remaining||d.total||0;
      rows.push({label:`${d.name} <span style="opacity:.5;font-size:11px;">debt</span>`, value:-amt, color:'neg'});
    });
    // Divider + total
    rows.push({divider:true});
    rows.push({label:'<strong>Total Net Worth</strong>', value:totals.netWorth, color:totals.netWorth>=0?'pos':'neg', bold:true});
  }

  else if(type==='pl'){
    title = 'Unrealised P&L by Holding';
    const sorted = [...S.holdings].sort((a,b)=>(b.current-b.invested)-(a.current-a.invested));
    sorted.forEach(h=>{
      const pl = h.current-h.invested;
      const pctVal = h.invested ? ((pl/h.invested)*100).toFixed(1) : 0;
      rows.push({label:`${h.ticker||h.name} <span style="opacity:.5;font-size:11px;">${h.type}</span>`, value:pl, sub:`${pctVal>=0?'+':''}${pctVal}% · current ${fmt(h.current)}`, color:pl>=0?'pos':'neg', signed:true});
    });
    rows.push({divider:true});
    const totalPl = totals.totCur - totals.totInv;
    rows.push({label:'<strong>Total P&L</strong>', value:totalPl, color:totalPl>=0?'pos':'neg', bold:true, signed:true});
  }

  else if(type==='isa'){
    title = 'ISA Holdings Detail';
    const isaAccs = S.accounts.filter(a=>a.type.includes('isa'));
    isaAccs.forEach(a=>{
      const info = (typeof ISA_INFO !== 'undefined' && ISA_INFO[a.type]) || {};
      const used  = Math.min(a.contrib||0, info.limit||20000);
      const limit = info.limit||20000;
      rows.push({label:`${a.name} <span style="opacity:.5;font-size:11px;">${a.type.replace('-',' ').toUpperCase()}</span>`, value:a.balance, sub:`${fmt(used)} contributed · ${fmt(limit-used)} allowance left`, color:'pos'});
    });
    rows.push({divider:true});
    rows.push({label:'<strong>Total ISA Value</strong>', value:totals.isaTot, color:'pos', bold:true});
  }

  else if(type==='debts'){
    title = 'Debt Breakdown';
    const sorted = [...S.debts].sort((a,b)=>(b.remaining||b.total||0)-(a.remaining||a.total||0));
    sorted.forEach(d=>{
      const amt   = d.remaining||d.total||0;
      const rate  = d.rate ? ` · ${d.rate}% APR` : '';
      const month = d.monthly ? ` · ${fmt(d.monthly)}/mo` : '';
      rows.push({label:`${d.name} <span style="opacity:.5;font-size:11px;">${d.type||'debt'}</span>`, value:-amt, sub:`${fmt(amt)} remaining${rate}${month}`, color:'neg', signed:false, absDisplay:true});
    });
    rows.push({divider:true});
    rows.push({label:'<strong>Total Debt</strong>', value:-totals.debtTot, color:'neg', bold:true, absDisplay:true});
  }

  // Build HTML
  const rowsHTML = rows.map(r=>{
    if(r.divider) return `<div style="border-top:1px solid var(--border);margin:8px 0;"></div>`;
    const valDisplay = r.absDisplay
      ? `<span class="val ${r.color}" style="${r.bold?'font-size:15px;font-variation-settings:\'wght\' 700;':''}">${fmt(Math.abs(r.value))}</span>`
      : `<span class="val ${r.color}" style="${r.bold?'font-size:15px;font-variation-settings:\'wght\' 700;':''}">${r.signed?(r.value>=0?'+':'')+fmt(Math.abs(r.value)):fmt(r.value)}</span>`;
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.04);">
        <div>
          <div style="font-size:13px;color:var(--text);">${r.label}</div>
          ${r.sub?`<div style="font-size:11px;color:var(--muted);margin-top:2px;">${r.sub}</div>`:''}
        </div>
        ${valDisplay}
      </div>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'statCardModal';
  modal.innerHTML = `
    <div id="statCardOverlay" style="
      position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;
      display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(4px);animation:fadeInModal .18s ease;">
      <div style="
        background:var(--card,#fff);border-radius:16px;
        box-shadow:0 24px 60px rgba(0,0,0,.22);
        width:min(480px,92vw);max-height:80vh;
        display:flex;flex-direction:column;
        animation:slideUpModal .22s cubic-bezier(.34,1.56,.64,1);">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 22px 14px;border-bottom:1px solid var(--border);">
          <div style="font-size:16px;font-variation-settings:'wght' 700;color:var(--text);">${title}</div>
          <button id="statModalClose" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);line-height:1;padding:2px 6px;border-radius:6px;" aria-label="Close">×</button>
        </div>
        <!-- Body -->
        <div style="overflow-y:auto;padding:4px 22px 20px;flex:1;">
          ${rowsHTML}
        </div>
      </div>
    </div>`;

  // Inject animation keyframes once
  if(!document.getElementById('modalKeyframes')){
    const s = document.createElement('style');
    s.id = 'modalKeyframes';
    s.textContent = `
      @keyframes fadeInModal { from{opacity:0} to{opacity:1} }
      @keyframes slideUpModal { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      .card-expand-hint { font-size:10px;color:var(--muted);margin-top:6px;opacity:.6; }
      .clickable-card:hover .card-expand-hint { opacity:1; }
      .clickable-card { transition:transform .15s,box-shadow .15s; }
      .clickable-card:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.12); }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(modal);

  // Close handlers
  const close = ()=> modal.remove();
  document.getElementById('statModalClose').addEventListener('click', close);
  document.getElementById('statCardOverlay').addEventListener('click', e=>{ if(e.target===e.currentTarget) close(); });
  document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown',esc); }});
}

// ══════════════════════════════════════════════════
// UPCOMING EVENTS TICKER
// ══════════════════════════════════════════════════

function _renderEventsTicker(now=new Date()){
  const el = document.getElementById('eventsTicker');
  if(!el) return;

  const events = [];
  const daysDiff = (d)=> Math.round((new Date(d)-now)/86400000);

  // ISA year reset (5 April)
  const isaReset = new Date(now.getFullYear(), 3, 5); // April 5
  if(isaReset < now) isaReset.setFullYear(isaReset.getFullYear()+1);
  events.push({emoji:'🏦', label:`ISA year resets`, days:daysDiff(isaReset)});

  // Premium bond draw (1st of each month)
  if(S.premiumBonds?.amount){
    const pbDraw = new Date(now.getFullYear(), now.getMonth()+1, 1);
    events.push({emoji:'🎟️', label:`Premium Bond draw`, days:daysDiff(pbDraw)});
  }

  // Goals with target dates
  (S.goals||[]).filter(g=>g.date).forEach(g=>{
    const d = daysDiff(g.date);
    if(d >= 0) events.push({emoji:g.emoji||'🎯', label:`Goal: ${g.name}`, days:d});
  });

  // Debts — estimated payoff
  (S.debts||[]).filter(d=>d.monthly&&d.remaining).forEach(d=>{
    const months = Math.ceil(d.remaining/d.monthly);
    const payoffDate = new Date(now); payoffDate.setMonth(payoffDate.getMonth()+months);
    events.push({emoji:'💳', label:`${d.name} paid off`, days:daysDiff(payoffDate)});
  });

  // Account anniversaries (if created date stored)
  (S.accounts||[]).filter(a=>a.openedDate).forEach(a=>{
    const ann = new Date(a.openedDate);
    ann.setFullYear(now.getFullYear());
    if(ann < now) ann.setFullYear(now.getFullYear()+1);
    const d = daysDiff(ann);
    if(d<=30) events.push({emoji:'📅', label:`${a.name} anniversary`, days:d});
  });

  events.sort((a,b)=>a.days-b.days);

  if(!events.length){
    el.style.display='none'; return;
  }

  const chips = events.slice(0,6).map(ev=>{
    const urgent = ev.days<=7;
    return `<div style="
      display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
      padding:5px 12px;border-radius:20px;
      background:${urgent?'rgba(204,51,51,.08)':'rgba(80,70,229,.06)'};
      border:1px solid ${urgent?'rgba(204,51,51,.2)':'rgba(80,70,229,.15)'};
      font-size:12px;color:var(--text);">
      <span>${ev.emoji}</span>
      <span style="color:var(--muted2);">${ev.label}</span>
      <span style="font-variation-settings:'wght' 700;color:${urgent?'#cc3333':'#5046e5'};">
        ${ev.days===0?'today':ev.days===1?'tomorrow':`in ${ev.days}d`}
      </span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:11px;font-variation-settings:'wght' 600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Upcoming</div>
    <div style="display:inline-flex;gap:6px;">${chips}</div>`;
}

// ══════════════════════════════════════════════════
// MONTHLY CASH FLOW SUMMARY
// ══════════════════════════════════════════════════

function _renderMonthlyCashFlow(){
  const el = document.getElementById('cashFlowChart');
  if(!el) return;
  if(typeof cashFlowChart!=='undefined' && cashFlowChart) cashFlowChart.destroy();

  // Build from S.transactions if available, else show placeholder
  const txns = S.transactions||[];
  if(!txns.length){
    el.closest?.('.chart-section')?.querySelector?.('.chart-empty')?.style && (el.closest('.chart-section').querySelector('.chart-empty').style.display='block');
    el.style.display='none';
    return;
  }

  // Aggregate last 6 months
  const months = [];
  for(let i=5;i>=0;i--){
    const d = new Date(); d.setMonth(d.getMonth()-i);
    months.push({
      label: d.toLocaleDateString('en-GB',{month:'short'}),
      year:  d.getFullYear(),
      month: d.getMonth(),
      income:0, expense:0
    });
  }
  txns.forEach(t=>{
    const d = new Date(t.date);
    const m = months.find(m=>m.year===d.getFullYear()&&m.month===d.getMonth());
    if(!m) return;
    if(t.amount>0) m.income+=t.amount; else m.expense+=Math.abs(t.amount);
  });

  const labels  = months.map(m=>m.label);
  const income  = months.map(m=>Math.round(m.income));
  const expense = months.map(m=>Math.round(m.expense));

  cashFlowChart = new Chart(el, {
    type:'bar',
    data:{labels, datasets:[
      {label:'Income',  data:income,  backgroundColor:'rgba(10,143,92,.18)', borderColor:'#0a8f5c', borderWidth:1.5, borderRadius:4},
      {label:'Expenses',data:expense, backgroundColor:'rgba(204,51,51,.14)', borderColor:'#cc3333', borderWidth:1.5, borderRadius:4}
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:true, position:'top', labels:{color:'#7c7b8a',font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmt(ctx.raw)}`}}
      },
      scales:{
        x:{ticks:{color:'#7c7b8a',font:{size:10}}, grid:{display:false}},
        y:{ticks:{color:'#7c7b8a',font:{size:10},callback:v=>fmt(v)}, grid:{color:'rgba(0,0,0,.04)'}}
      }
    }
  });
}

// ══════════════════════════════════════════════════
// PORTFOLIO ALLOCATION — TARGET vs ACTUAL
// ══════════════════════════════════════════════════

function _renderAllocationChart(){
  const el = document.getElementById('allocationChart');
  if(!el) return;
  if(typeof allocChart!=='undefined' && allocChart) allocChart.destroy();

  const targets = S.settings.allocationTargets || {}; // e.g. {stocks:60, isa:20, cash:10, crypto:5, other:5}

  const groups={};
  S.holdings.forEach(h=>{groups[h.type]=(groups[h.type]||0)+h.current;});
  S.accounts.filter(a=>['current','savings','joint'].includes(a.type)).forEach(a=>{groups['cash']=(groups['cash']||0)+a.balance;});
  if(S.premiumBonds.amount) groups['cash']=(groups['cash']||0)+S.premiumBonds.amount;

  const total = Object.values(groups).reduce((s,v)=>s+v,0);
  if(!total){ el.style.display='none'; return; }

  const types = [...new Set([...Object.keys(groups), ...Object.keys(targets)])];
  const actual  = types.map(t=>total?((groups[t]||0)/total*100):0);
  const target  = types.map(t=>targets[t]||0);

  // Only render if targets are set
  const hasTargets = target.some(v=>v>0);

  allocChart = new Chart(el,{
    type:'bar',
    data:{
      labels: types.map(t=>t.charAt(0).toUpperCase()+t.slice(1)),
      datasets:[
        {label:'Actual %',  data:actual.map(v=>+v.toFixed(1)), backgroundColor:'rgba(80,70,229,.18)', borderColor:'#5046e5', borderWidth:1.5, borderRadius:4},
        ...(hasTargets?[{label:'Target %', data:target, backgroundColor:'rgba(10,143,92,.1)', borderColor:'#0a8f5c', borderWidth:1.5, borderRadius:4, borderDash:[4,4]}]:[])
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:hasTargets, position:'top', labels:{color:'#7c7b8a',font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${ctx.raw}%`}}
      },
      scales:{
        x:{ticks:{color:'#7c7b8a',font:{size:10}}, grid:{display:false}},
        y:{ticks:{color:'#7c7b8a',font:{size:10},callback:v=>v+'%'}, grid:{color:'rgba(0,0,0,.04)'}, max:100}
      }
    }
  });

  // Rebalancing suggestions
  if(hasTargets){
    const sugEl = document.getElementById('allocationSuggestions');
    if(sugEl){
      const sug = types.map((t,i)=>{
        const diff = actual[i] - (targets[i]||0);
        if(Math.abs(diff)<2) return null;
        const direction = diff>0?'⬇ reduce':'⬆ increase';
        return `<span style="font-size:11px;padding:3px 8px;border-radius:12px;background:${diff>0?'rgba(204,51,51,.08)':'rgba(10,143,92,.08)'};color:${diff>0?'#cc3333':'#0a8f5c'};border:1px solid ${diff>0?'rgba(204,51,51,.2)':'rgba(10,143,92,.2)'};">${direction} ${t} by ${Math.abs(diff).toFixed(1)}%</span>`;
      }).filter(Boolean);
      sugEl.innerHTML = sug.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;">${sug.join('')}</div>` : '<div style="font-size:11px;color:var(--muted);margin-top:8px;">✓ Portfolio is on target</div>';
    }
  }
}

// ══════════════════════════════════════════════════
// DEBT PAYOFF TIMELINE
// ══════════════════════════════════════════════════

function _renderDebtTimeline(){
  const el = document.getElementById('debtTimelineChart');
  if(!el) return;
  if(typeof debtTimelineChart!=='undefined' && debtTimelineChart) debtTimelineChart.destroy();

  const debts = (S.debts||[]).filter(d=>(d.remaining||d.total)&&d.monthly);
  if(!debts.length){
    const wrap = el.closest?.('.chart-section');
    if(wrap){ wrap.querySelector?.('.chart-empty') && (wrap.querySelector('.chart-empty').style.display='block'); }
    el.style.display='none'; return;
  }

  // Project each debt month-by-month
  const MONTHS = 120; // 10 year cap
  const now = new Date();
  const COLORS = ['#cc3333','#b87309','#5046e5','#0a8f5c','#1d6fca'];

  const datasets = debts.map((d,i)=>{
    let bal = d.remaining||d.total||0;
    const rate = (d.rate||0)/100/12;
    const data = [{x:0, y:Math.round(bal)}];
    for(let m=1;m<=MONTHS;m++){
      if(rate) bal = bal*(1+rate) - d.monthly;
      else     bal = bal - d.monthly;
      bal = Math.max(0, bal);
      data.push({x:m, y:Math.round(bal)});
      if(bal===0) break;
    }
    return {label:d.name, data, borderColor:COLORS[i%COLORS.length], backgroundColor:'transparent', borderWidth:2, tension:0.3, pointRadius:0, pointHitRadius:10};
  });

  // Month labels (every 6 months)
  const maxPoints = Math.max(...datasets.map(d=>d.data.length));
  const labels = Array.from({length:maxPoints},(_,i)=>{
    const d = new Date(now); d.setMonth(d.getMonth()+i);
    return i%6===0 ? d.toLocaleDateString('en-GB',{month:'short',year:'2-digit'}) : '';
  });

  debtTimelineChart = new Chart(el,{
    type:'line',
    data:{labels, datasets},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:true, position:'top', labels:{color:'#7c7b8a',font:{size:11},boxWidth:12}},
        tooltip:{
          mode:'index', intersect:false,
          callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmt(ctx.raw.y||ctx.raw)}`}
        }
      },
      scales:{
        x:{ticks:{color:'#7c7b8a',font:{size:10},maxRotation:0}, grid:{display:false}},
        y:{ticks:{color:'#7c7b8a',font:{size:10},callback:v=>fmt(v)}, grid:{color:'rgba(0,0,0,.04)'}}
      }
    }
  });

  // "What if" extra payment slider
  const sliderWrap = document.getElementById('debtExtraWrap');
  if(sliderWrap && !sliderWrap.dataset.init){
    sliderWrap.dataset.init='true';
    sliderWrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap;">
        <label style="font-size:12px;color:var(--muted2);">Extra monthly payment:</label>
        <input type="range" id="debtExtraSlider" min="0" max="1000" step="50" value="0" style="flex:1;min-width:120px;">
        <span id="debtExtraVal" style="font-size:12px;font-variation-settings:'wght' 700;color:#5046e5;min-width:50px;">£0</span>
      </div>
      <div id="debtExtraSavings" style="font-size:12px;color:var(--muted);margin-top:4px;"></div>`;

    document.getElementById('debtExtraSlider').addEventListener('input', function(){
      const extra = +this.value;
      document.getElementById('debtExtraVal').textContent = fmt(extra);

      // Recalculate with extra payment
      let origTotal=0, newTotal=0;
      debts.forEach(d=>{
        let bal=d.remaining||d.total||0, bal2=bal;
        const rate=(d.rate||0)/100/12;
        let m1=0,m2=0;
        while(bal>0&&m1<MONTHS){ bal=Math.max(0,rate?bal*(1+rate)-d.monthly:bal-d.monthly); origTotal+=d.monthly; m1++; }
        while(bal2>0&&m2<MONTHS){ bal2=Math.max(0,rate?bal2*(1+rate)-(d.monthly+extra):bal2-(d.monthly+extra)); newTotal+=(d.monthly+extra); m2++; }
      });
      const saved = origTotal-newTotal;
      document.getElementById('debtExtraSavings').textContent = extra>0 && saved>0
        ? `💡 Paying an extra ${fmt(extra)}/mo saves approx ${fmt(Math.round(saved))} in total payments`
        : '';
    });
  }
}

// ══════════════════════════════════════════════════
// EXISTING CHART FUNCTIONS (unchanged from original)
// ══════════════════════════════════════════════════

const TC = {stocks:'#3664a9',isa:'#41c99c',crypto:'#b48745',cash:'#2b21b4',pension:'#3737c8',property:'#6e676b',other:'#38baa4',current:'#4477de',savings:'#479283',joint:'#112b60','premium bonds':'#9e5f1f'};

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

function _renderNWChart() {
  if (nwChart) nwChart.destroy();

  const all = S.netWorthHistory || [];
  if (all.length < 2) {
    const el = document.getElementById('nwSub');
    if (el) el.textContent = 'building history…';
    return;
  }

  const periodEl = document.getElementById('nwPeriod');
  const now = new Date();
  const oldest = new Date(Math.min(...all.map(h => new Date(h.date))));
  const days = (now - oldest) / 86400000;

  const avail = ['all'];
  if (days >= 7)    avail.push('1w');
  if (days >= 30)   avail.push('1m');
  if (days >= 90)   avail.push('3m');
  if (days >= 180)  avail.push('6m');
  if (days >= 365)  avail.push('1y');
  if (days >= 1825) avail.push('5y');

  if (periodEl) {
    if (periodEl.options.length !== avail.length) {
      periodEl.innerHTML = '';
      const opts = {all:'All Time', '1w':'1 Week', '1m':'1 Month', '3m':'3 Months', '6m':'6 Months', '1y':'1 Year', '5y':'5 Years'};
      avail.forEach(p => {
        const o = document.createElement('option');
        o.value = p; o.textContent = opts[p];
        periodEl.appendChild(o);
      });
      periodEl.value = 'all';
    }
    if (!periodEl.dataset.listenerAdded) {
      periodEl.addEventListener('change', _renderNWChart);
      periodEl.dataset.listenerAdded = 'true';
    }
  }

  const period = periodEl?.value || 'all';
  const cutoffMs = {'1w':7*86400000,'1m':30*86400000,'3m':90*86400000,'6m':180*86400000,'1y':365*86400000,'5y':1825*86400000,'all':0}[period];
  const cutoffDate = cutoffMs ? new Date(now - cutoffMs) : new Date(0);
  const hist = all.filter(h => new Date(h.date) >= cutoffDate);

  const subEl = document.getElementById('nwSub');
  if (subEl) subEl.textContent = hist.length + ' data points';
  if (hist.length < 2) return;

  const labels = hist.map(h => new Date(h.date).toLocaleDateString('en-GB', {day:'numeric', month:'short'}));
  const change = hist.at(-1).value - hist[0].value;
  const color  = change >= 0 ? '#5046e5' : '#cc3333';

  const crosshairPlugin = {
    id: 'crosshair',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: { top, bottom }, tooltip } = chart;
      if (!tooltip?._active?.length) return;
      const x = tooltip._active[0].element.x;
      const y = tooltip._active[0].element.y;
      ctx.save();
      ctx.beginPath(); ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(80,70,229,0.35)'; ctx.lineWidth = 1.5;
      ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      ctx.beginPath(); ctx.setLineDash([]);
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#5046e5'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
  };

  nwChart = new Chart(document.getElementById('nwChart'), {
    type: 'line',
    plugins: [crosshairPlugin],
    data: {
      labels,
      datasets: [{
        data: hist.map(h => h.value),
        borderColor: color,
        backgroundColor: change >= 0 ? 'rgba(80,70,229,.07)' : 'rgba(204,51,51,.07)',
        borderWidth: 2, tension: 0.4, fill: true,
        pointRadius: 0, pointHitRadius: 20,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: 'rgba(24,24,32,0.88)',
          titleColor: '#a09fb5', bodyColor: '#fff',
          bodyFont: { size: 13, weight: '700' },
          padding: { x: 12, y: 8 }, cornerRadius: 6,
          callbacks: {
            title: ctx => ctx[0].label,
            label: ctx => ` £${ctx.raw.toLocaleString('en-GB')}`,
          }
        }
      },
      scales: {
        x: { ticks: { color:'#7c7b8a', font:{ size:10 }, maxTicksLimit:6 }, grid: { display: false } },
        y: { ticks: { color:'#7c7b8a', font:{ size:10 }, callback: v => fmt(v) }, grid: { color: 'rgba(0,0,0,.04)' } }
      }
    }
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