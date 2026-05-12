// ── Pension ──────────────────────────────────
// 15. JS: PENSION (UK tax calculation)
// ═══════════════════════════════════════════════════
// Pension

function renderPension(){
  const el = document.getElementById('pensionContent');
  const accounts = S.accounts || [];
  const pensionAccounts = accounts.filter(a => a.type === 'pension');
  
  if(!pensionAccounts.length){
    el.innerHTML = '<div class="empty"><div class="ei">🔒</div><p>No pension accounts tracked yet.</p></div>';
    return;
  }
  
  const totalPension = pensionAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Pension overview</span>
      </div>
      <div style="padding:16px;">
        <div class="stat-card sc-accent">
          <div class="stat-label">Total pension pot</div>
          <div class="stat-val val">${fmt(totalPension)}</div>
          <div class="stat-sub">${pensionAccounts.length} pension account${pensionAccounts.length !== 1 ? 's' : ''}</div>
        </div>
        <div style="margin-top:16px;">
          <div class="card-header" style="margin-bottom:12px;">
            <span class="card-title" style="font-size:14px;">Pension accounts</span>
          </div>
          ${pensionAccounts.map((a, i) => `
            <div style="padding:12px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-weight:600;font-size:13px;">${a.name || 'Pension ' + (i+1)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:4px;">Pot size</div>
                </div>
                <div class="val" style="font-size:16px;font-weight:600;">${fmt(a.balance)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
