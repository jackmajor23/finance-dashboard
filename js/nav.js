// ── Navigation & routing ────────────────────────────
// 10. JS: NAVIGATION
// ═══════════════════════════════════════════════════
const PAGE_RENDERS = {
  'overview':       renderOverview,
  'investments':    renderInvestments,
  'accounts':       renderAccounts,
  'premium-bonds':  renderPremiumBonds,
  'salary':         renderSalary,
  'debts':          ()=>{ renderDebts(); populateDebtForm(); },
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

function invTab(tab, el){
  document.querySelectorAll('#page-investments .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#page-investments .tab-pane').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  const pane=document.getElementById('invtab-'+tab);
  if(pane) pane.classList.add('active');
  if(tab==='all') { hFilter='all'; renderHoldings(); renderInvestmentStats(); }
  if(tab==='stocks') { renderStocksHoldings(); renderStocksStats(); }
  if(tab==='crypto') { renderCryptoHoldings(); renderCryptoStats(); }
  if(tab==='watchlist') renderStocks();
}
