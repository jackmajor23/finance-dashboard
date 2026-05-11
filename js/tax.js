// ── Tax summary ──────────────────────────────────────
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
