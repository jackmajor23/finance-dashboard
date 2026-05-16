// ── Initialisation ───────────────────────────────────
// ── INIT ──
console.log('init.js loaded');
loadState();
_updateSidebarMeta();
renderOverview();
if (typeof initInvestments === 'function') initInvestments();
// Set the current month/year in PB win form
document.getElementById('pbWinMonth').value = new Date().getMonth() + 1;
document.getElementById('pbWinYear').value = new Date().getFullYear();

// ── Global keyboard shortcut for undo ─────────────────
document.addEventListener('keydown', (e) => {
    console.log('Key pressed:', e.key, 'ctrlKey:', e.ctrlKey, 'metaKey:', e.metaKey);
    // Ctrl+Z or Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        console.log('Ctrl+Z pressed, checking for undo operations...');
        // Check for any available undo operation
        if (window._lastDeletedTx) {
            console.log('Undoing transaction deletion');
            e.preventDefault();
            undoLastTxDelete();
        } else if (window._lastDeletedAccount) {
            console.log('Undoing account deletion');
            e.preventDefault();
            undoLastAccountDelete();
        } else if (window._lastDeletedPBWin) {
            console.log('Undoing PB win deletion');
            e.preventDefault();
            undoLastPBDelete();
        } else if (window._lastDeletedSalary) {
            console.log('Undoing salary deletion');
            e.preventDefault();
            undoLastSalaryDelete();
        } else if (window._lastDeletedBill) {
            console.log('Undoing bill deletion');
            e.preventDefault();
            undoLastBillDelete();
        } else if (window._lastDeletedProperty) {
            console.log('Undoing property deletion');
            e.preventDefault();
            undoLastPropertyDelete();
        } else if (window._lastDeletedDebt) {
            console.log('Undoing debt deletion');
            e.preventDefault();
            undoLastDebtDelete();
        } else if (window._lastDeletedGoal) {
            console.log('Undoing goal deletion');
            e.preventDefault();
            undoLastGoalDelete();
        } else {
            console.log('No undo operation available');
        }
    }
});
