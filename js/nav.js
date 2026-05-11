// ── Navigation & routing ────────────────────────────
// 10. JS: NAVIGATION
// ═══════════════════════════════════════════════════
const PAGE_RENDERS = {
  'overview':       renderOverview,
  'holdings':       ()=>{ renderHoldings(); renderClosed(); },
  'accounts':       renderAccounts,
  'premium-bonds':  renderPremiumBonds,
  'stocks-page':    renderStocks,
  'salary':         renderSalary,
  'debts':          renderDebts,
  'goals':          renderGoals,
  'transactions':   renderTransactions,
  'tax':            renderTax,
  'settings': ()=>{
    const sn=document.getElementById('setName'), st=document.getElementById('setTitle'), sc=document.getElementById('setCurrency');
    if(sn) sn.value=S.settings.name||'';
    if(st) st.value=S.settings.title||'';
    if(sc) sc.value=S.settings.currency||'£';
  }
};

function nav(page, el){
  const target=document.getElementById('page-'+page);
  if(!target){ console.warn('nav: page not found:',page); return; }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  target.classList.add('active');
  if(el) el.classList.add('active');
  if(PAGE_RENDERS[page]) PAGE_RENDERS[page]();
}

function hTab(tab, el){
  document.querySelectorAll('#page-holdings .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#page-holdings .tab-pane').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  const pane=document.getElementById('htab-'+tab);
  if(pane) pane.classList.add('active');
  if(tab==='open') renderHoldings();
  if(tab==='closed') renderClosed();
}
