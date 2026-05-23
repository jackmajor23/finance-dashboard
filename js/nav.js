// ── Navigation & routing ────────────────────────────
// JS: NAVIGATION
// ═══════════════════════════════════════════════════
const PAGE_RENDERS = {
  'overview':       () => renderOverview(),
  'investments':    () => renderInvestments(),
  'accounts':       () => renderAccounts(),
  'properties':     () => renderProperties(),
  'premium-bonds':  () => renderPremiumBonds(),
  'salary':         () => renderSalary(),
  'bills':          () => renderBills(),
  'pension':        () => renderPension(),
  'debts':          ()=>{ renderDebts(); if(typeof populateDebtForm !== 'undefined') populateDebtForm(); },
  'goals':          () => renderGoals(),
  'transactions':   () => renderTransactions(),
  'tax':            () => renderTax(),
  'settings': () => renderSettings()
};

function nav(page, el){
  const target=document.getElementById('page-'+page);
  if(!target){ console.warn('nav: page not found:',page); return; }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  target.classList.add('active');
  if(el) el.classList.add('active');
  if(PAGE_RENDERS[page]) PAGE_RENDERS[page]();
  applyMobileSectionDisclosure();
  closeMobileNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function isMobileNavViewport() {
  return window.matchMedia('(max-width: 940px)').matches;
}

function setMobileNavState(open) {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('mobileMenuBtn');
  const backdrop = document.getElementById('mobileNavBackdrop');
  if (!sidebar || !btn || !backdrop) return;
  sidebar.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
  document.body.classList.toggle('nav-open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = open ? 'close' : 'menu';
}

function toggleMobileNav() {
  const sidebar = document.getElementById('sidebar');
  setMobileNavState(!sidebar?.classList.contains('open'));
}

function closeMobileNav() {
  setMobileNavState(false);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileNav();
});

window.addEventListener('resize', () => {
  if (!isMobileNavViewport()) closeMobileNav();
  applyMobileSectionDisclosure();
});

function applyMobileSectionDisclosure() {
  enhanceMobileDropdownSections();
  const shouldCollapse = isMobileNavViewport();
  document.querySelectorAll('.mobile-section-dropdown').forEach(section => {
    if (section.dataset.userToggled === 'true') return;
    section.dataset.autoToggling = 'true';
    section.open = !shouldCollapse;
    window.setTimeout(() => { delete section.dataset.autoToggling; }, 0);
  });
}

function enhanceMobileDropdownSections() {
  const billTemplates = document.getElementById('billTemplates');
  const billHeading = document.getElementById('billTemplatesHeading');
  if (billTemplates && billHeading && !billTemplates.closest('.mobile-section-dropdown')) {
    const details = document.createElement('details');
    details.className = 'mobile-section-dropdown bills-quick-add-dropdown';
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = billHeading.textContent || 'Quick add';
    const body = document.createElement('div');
    body.className = 'mobile-section-dropdown-body';
    billHeading.replaceWith(details);
    details.append(summary, body);
    body.appendChild(billTemplates);
  }
}

function initMobileNavigation() {
  const btn = document.getElementById('mobileMenuBtn');
  const backdrop = document.getElementById('mobileNavBackdrop');
  btn?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMobileNav();
  });
  backdrop?.addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileNav();
  });
  document.querySelectorAll('.mobile-section-dropdown').forEach(section => {
    section.addEventListener('toggle', () => {
      if (section.dataset.autoToggling === 'true') return;
      if (isMobileNavViewport()) section.dataset.userToggled = 'true';
    });
  });
  applyMobileSectionDisclosure();
}

window.nav = nav;
window.invTab = invTab;
window.toggleMobileNav = toggleMobileNav;
window.closeMobileNav = closeMobileNav;
window.initMobileNavigation = initMobileNavigation;
window.applyMobileSectionDisclosure = applyMobileSectionDisclosure;
window.enhanceMobileDropdownSections = enhanceMobileDropdownSections;

initMobileNavigation();

function invTab(tab, el){
  document.getElementById('page-investments')?.setAttribute('data-inv-tab', tab);
  document.querySelectorAll('#page-investments .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#page-investments .tab-pane').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  const pane=document.getElementById('invtab-'+tab);
  if(pane) pane.classList.add('active');
  if(tab==='all') { hFilter='all'; renderHoldings(); renderInvestmentStats(); }
  if(tab==='stocks') { renderStocksHoldings(); renderStocksStats(); }
  if(tab==='crypto') { renderCryptoHoldings(); renderCryptoStats(); }
  if(tab==='other' && typeof renderOtherHoldings === 'function') renderOtherHoldings();
  if(tab==='watchlist') renderStocks();
  if(tab==='closed' && typeof renderClosed === 'function') renderClosed();
  if(tab==='heatmap' && typeof renderHeatmap === 'function') renderHeatmap();
  if(tab==='dividends' && typeof renderDividends === 'function') renderDividends();
  if(tab==='alerts' && typeof renderAlertsList === 'function') renderAlertsList();
}
