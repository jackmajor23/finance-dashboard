// ── Initialisation ───────────────────────────────────
// ── INIT ──
loadState();
_updateSidebarMeta();
renderOverview();
// Set the current month/year in PB win form
document.getElementById('pbWinMonth').value=new Date().getMonth()+1;
document.getElementById('pbWinYear').value=new Date().getFullYear();
