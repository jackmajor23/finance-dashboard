// ── Tax summary ──────────────────────────────────────
// JS: TAX SUMMARY
// ═══════════════════════════════════════════════════

function calculateTaxImpact(salary) {
  if (!salary) return { current: 0, next: 0, difference: 0, details: [] };

  const gross = salary.gross || 0;
  const currentTax = calculateIncomeTax(gross, UK_TAX);
  const nextTax = calculateIncomeTax(gross, UK_TAX_NEXT);
  const currentNI = calculateNI(gross, UK_TAX.ni);
  const nextNI = calculateNI(gross, UK_TAX_NEXT.ni);

  const currentTotal = currentTax + currentNI;
  const nextTotal = nextTax + nextNI;
  const difference = nextTotal - currentTotal;

  const details = [
    { label: 'Income Tax', current: currentTax, next: nextTax, diff: nextTax - currentTax },
    { label: 'National Insurance', current: currentNI, next: nextNI, diff: nextNI - currentNI },
  ];

  return { current: currentTotal, next: nextTotal, difference, details };
}

function calculateIncomeTax(gross, taxConfig) {
  let tax = 0;
  const bands = taxConfig.bands;

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    if (gross > band.from) {
      const taxableInBand = Math.min(gross, band.to === Infinity ? gross : band.to) - band.from;
      tax += taxableInBand * band.rate / 100;
    }
  }

  return Math.round(tax);
}

function calculateNI(gross, niConfig) {
  const ptAnnual = niConfig.ptWeekly * 52;
  const uelAnnual = niConfig.uelWeekly * 52;

  if (gross <= ptAnnual) return 0;
  if (gross <= uelAnnual) {
    return Math.round((gross - ptAnnual) * niConfig.mainRate / 100);
  }
  const mainNI = (uelAnnual - ptAnnual) * niConfig.mainRate / 100;
  const upperNI = (gross - uelAnnual) * niConfig.upperRate / 100;
  return Math.round(mainNI + upperNI);
}

function renderTaxYearChanges() {
  const el = document.getElementById('taxYearChanges');
  if (!el) return;

  const changes = [];

  // Personal allowance
  if (UK_TAX.personalAllowance !== UK_TAX_NEXT.personalAllowance) {
    changes.push({
      type: 'Personal Allowance',
      current: UK_TAX.personalAllowance,
      next: UK_TAX_NEXT.personalAllowance,
      impact: UK_TAX_NEXT.personalAllowance - UK_TAX.personalAllowance,
      description: 'Amount you can earn tax-free'
    });
  }

  // CGT allowance
  const currentCGT = 3000;
  const nextCGT = UK_TAX_NEXT.cgtAllowance || 3000;
  if (currentCGT !== nextCGT) {
    changes.push({
      type: 'CGT Allowance',
      current: currentCGT,
      next: nextCGT,
      impact: nextCGT - currentCGT,
      description: 'Capital gains tax-free allowance'
    });
  }

  // ISA allowance
  const currentISA = 20000;
  const nextISA = UK_TAX_NEXT.isaAllowance || 20000;
  if (currentISA !== nextISA) {
    changes.push({
      type: 'ISA Allowance',
      current: currentISA,
      next: nextISA,
      impact: nextISA - currentISA,
      description: 'Annual ISA contribution limit'
    });
  }

  // Tax bands
  UK_TAX.bands.forEach((band, i) => {
    const nextBand = UK_TAX_NEXT.bands[i];
    if (band.to !== nextBand.to && band.to !== Infinity) {
      changes.push({
        type: `${band.name} threshold`,
        current: band.to,
        next: nextBand.to,
        impact: nextBand.to - band.to,
        description: 'Income threshold for this tax band'
      });
    }
  });

  // Calculate salary impact
  const sal = S.salaries.length ? S.salaries[S.salaries.length - 1] : null;
  const taxImpact = calculateTaxImpact(sal);

  if (!changes.length && taxImpact.difference === 0) {
    el.innerHTML = `
      <div class="tax-year-banner" style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:24px;">📊</span>
          <div>
            <div style="font-size:14px;font-variation-settings:'wght' 600;color:var(--text);">Tax Year 2026/27</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">No major changes expected. Tax thresholds and allowances remain frozen.</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const impactColor = taxImpact.difference > 0 ? 'var(--red)' : taxImpact.difference < 0 ? 'var(--green)' : 'var(--muted)';
  const impactPrefix = taxImpact.difference > 0 ? '+' : '';

  el.innerHTML = `
    <div class="tax-year-banner" style="background:linear-gradient(135deg,var(--surface2) 0%,var(--surface3) 100%);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:28px;">📅</span>
          <div>
            <div style="font-size:15px;font-variation-settings:'wght' 700;color:var(--text);">Next Tax Year: 2026/27</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">Starting 6 April 2026</div>
          </div>
        </div>
        ${sal ? `
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Estimated tax impact</div>
          <div style="font-size:18px;font-variation-settings:'wght' 700;color:${impactColor};">${impactPrefix}${fmt(taxImpact.difference)}/yr</div>
          <div style="font-size:11px;color:var(--muted);">Based on current salary</div>
        </div>
        ` : ''}
      </div>
      
      ${changes.length > 0 ? `
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:12px;font-variation-settings:'wght' 600;color:var(--text);margin-bottom:10px;">Key Changes</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
          ${changes.map(c => `
            <div style="background:var(--bg);border:1px solid var(--border2);border-radius:8px;padding:10px;">
              <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">${c.type}</div>
              <div style="display:flex;align-items:baseline;gap:8px;">
                <span class="val" style="font-size:13px;color:var(--muted2);">${fmt(c.current)}</span>
                <span style="color:var(--muted);">→</span>
                <span class="val" style="font-size:13px;font-variation-settings:'wght' 600;color:${c.impact > 0 ? 'var(--green)' : c.impact < 0 ? 'var(--red)' : 'var(--text)'};">${fmt(c.next)}</span>
              </div>
              <div style="font-size:10px;color:var(--muted);margin-top:4px;">${c.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      ${sal ? `
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:12px;font-variation-settings:'wght' 600;color:var(--text);margin-bottom:10px;">Tax Breakdown Impact</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
          ${taxImpact.details.map(d => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border2);">
              <div>
                <div style="font-size:12px;color:var(--text);">${d.label}</div>
                <div style="font-size:11px;color:var(--muted);">${fmt(d.current)} → ${fmt(d.next)}</div>
              </div>
              <div style="font-size:13px;font-variation-settings:'wght' 600;color:${d.diff > 0 ? 'var(--red)' : d.diff < 0 ? 'var(--green)' : 'var(--muted)'};">
                ${d.diff !== 0 ? (d.diff > 0 ? '+' : '') + fmt(d.diff) : 'No change'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;
}

function renderTax() {
  const isaUsed = S.accounts.filter(a => ISA_INFO[a.type]).reduce((s, a) => s + (a.contrib || 0), 0);
  const isaLimit = 20000, isaLeft = Math.max(0, isaLimit - isaUsed);
  const realisedGains = S.closedHoldings.filter(h => (h.soldFor || 0) > h.invested).reduce((s, h) => s + (h.soldFor - h.invested), 0);
  const realisedLosses = S.closedHoldings.filter(h => (h.soldFor || 0) < h.invested).reduce((s, h) => s + (h.invested - (h.soldFor || 0)), 0);
  const netGain = realisedGains - realisedLosses;
  const CGT_ALLOWANCE = 3000;
  const cgtLiable = Math.max(0, netGain - CGT_ALLOWANCE);
  const pbWins = S.premiumBonds.wins.reduce((s, w) => s + w.amount, 0);
  const sal = S.salaries.length ? S.salaries[S.salaries.length - 1] : null;

  document.getElementById('taxGrid').innerHTML = `
    <div class="tax-card"><div class="stat-label">Realised P&amp;L (total)</div><div class="stat-val ${cls(netGain)} val">${fmtS(netGain)}</div><div class="stat-sub val">Gains: ${fmt(realisedGains)} · Losses: ${fmt(realisedLosses)}</div></div>
    <div class="tax-card"><div class="stat-label">CGT allowance 2025/26</div><div class="stat-val val">${fmt(CGT_ALLOWANCE)}</div><div class="stat-sub ${cgtLiable > 0 ? 'neg' : 'pos'}">${cgtLiable > 0 ? fmt(cgtLiable) + ' potentially liable' : 'Within allowance ✓'}</div></div>
    <div class="tax-card"><div class="stat-label">ISA allowance left</div><div class="stat-val pos val">${fmt(isaLeft)}</div><div class="stat-sub">of <span class="val">${fmt(isaLimit)}</span> · <span class="val">${fmt(isaUsed)}</span> used</div></div>
    <div class="tax-card"><div class="stat-label">Premium bond wins</div><div class="stat-val pos val">${fmt(pbWins)}</div><div class="stat-sub">Tax-free ✓</div></div>
    <div class="tax-card"><div class="stat-label">Unrealised P&amp;L</div><div class="stat-val ${cls(S.holdings.reduce((s, h) => s + (h.current - h.invested), 0))} val">${fmtS(S.holdings.reduce((s, h) => s + (h.current - h.invested), 0))}</div><div class="stat-sub">Not yet taxable</div></div>
    <div class="tax-card"><div class="stat-label">Gross salary</div><div class="stat-val val">${sal ? fmt(sal.gross) : '—'}</div><div class="stat-sub">Personal allowance: ${fmt(UK_TAX.personalAllowance)}</div></div>`;

  const el = document.getElementById('taxIsaDetail');
  const relevant = S.accounts.filter(a => ISA_INFO[a.type]);
  if (!relevant.length) { el.innerHTML = '<div style="color:var(--muted);font-size:12px;">No ISA accounts added.</div>'; return; }
  el.innerHTML = relevant.map(a => {
    const info = ISA_INFO[a.type], used = Math.min(a.contrib || 0, info.limit), p = Math.min((used / info.limit) * 100, 100);
    return `<div style="display:flex;align-items:center;gap:14px;">
      <div style="width:130px;font-size:12px;color:var(--muted2);">${info.name}</div>
      <div style="flex:1;" class="prog-outer"><div class="prog-fill" style="width:${p.toFixed(1)}%;background:${info.color};"></div></div>
      <div style="font-size:12px;font-variation-settings:'wght' 600;width:70px;text-align:right;color:${info.color};" class="val">${fmt(used)}</div>
      <div style="font-size:11px;color:var(--muted);width:90px;text-align:right;"><span class="val">${fmt(info.limit - used)}</span> left</div>
    </div>`;
  }).join('');

  // Render tax year changes
  renderTaxYearChanges();
}
