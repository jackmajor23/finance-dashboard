// ── Pension Tracker ──────────────────────────────────
// UK Pension Tracker — full feature build
// Tabs: Overview · Accounts · Projections · Tax Relief · Allowances
// ═══════════════════════════════════════════════════

// ── Sample data (replace with your S.accounts integration) ──
const accs = [
  { id: 1, name: 'Aviva Workplace',    type: 'Workplace', provider: 'Aviva',            balance: 45000, empP: 5,  erP: 5,  salary: 60000 },
  { id: 2, name: 'L&G Old Workplace',  type: 'Workplace', provider: 'Legal & General',  balance: 12500, empP: 0,  erP: 0,  salary: 0     },
  { id: 3, name: 'Vanguard SIPP',      type: 'SIPP',      provider: 'Vanguard',         balance: 8200,  empP: 0,  erP: 0,  salary: 0, fixedM: 200 }
];

// ── Constants ──
const AA       = 60000;    // Annual Allowance 2025/26
const SP_FULL  = 11502;    // Full new State Pension 2025/26
const SP_YRS   = 35;       // NI years for full State Pension

// ── State ──
let txBand  = 20;          // active tax band for tax relief tab
let pChart  = null;        // Chart.js instance (destroyed on re-render)

// ── Helpers ──
function monthlyContrib(a) {
  return (a.fixedM || 0) + (a.salary ? a.salary * (a.empP + a.erP) / 100 / 12 : 0);
}
function totalBalance()     { return accs.reduce((s, a) => s + a.balance, 0); }
function totalMonthly()     { return accs.reduce((s, a) => s + monthlyContrib(a), 0); }
function annualContribs()   { return totalMonthly() * 12; }
function statePensionAnn(yrs) { return (Math.min(yrs, SP_YRS) / SP_YRS) * SP_FULL; }

function penTypePill(type) {
  if (type === 'SIPP') return `<span class="pill p-pension">${type}</span>`;
  if (type === 'Workplace') return `<span class="pill" style="background:var(--blue-dim);color:var(--blue);">${type}</span>`;
  return `<span class="pill" style="background:var(--slate-dim);color:var(--slate);">${type}</span>`;
}
function penDivider() {
  return '<div style="height:1px;background:var(--border);margin:12px 0;" role="presentation"></div>';
}

// ── Compound growth projection ──
// Returns array of pot values from year 0 → years
function proj(startPot, annualContrib, years, growthPct) {
  const r = growthPct / 100;
  let p = startPot;
  const data = [Math.round(p)];
  for (let y = 0; y < years; y++) {
    p = p * (1 + r) + annualContrib;
    data.push(Math.round(p));
  }
  return data;
}

// ── Tab switcher ──
function swTab(id, btn) {
  document.querySelectorAll('#pensionContent .ptab').forEach(t => {
    const active = t.id === 'tab-' + id;
    t.classList.toggle('active', active);
    t.style.display = active ? '' : 'none';
  });
  document.querySelectorAll('#pensionContent .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── Top metric bar (always visible) ──
function rTopM() {
  const m   = totalMonthly();
  const b   = totalBalance();
  const ac  = annualContribs();
  const spY = parseInt(document.getElementById('slSP')?.value || 15);

  document.getElementById('topM').innerHTML = `
    <div class="stat-card sc-accent">
      <div class="stat-label">Total pension pot</div>
      <div class="stat-val val">${fmt(b)}</div>
      <div class="stat-sub">${accs.length} accounts</div>
    </div>
    <div class="stat-card sc-green">
      <div class="stat-label">Monthly contributions</div>
      <div class="stat-val val">${fmt(m)}</div>
      <div class="stat-sub">${fmt(m * 12)}/yr</div>
    </div>
    <div class="stat-card sc-amber">
      <div class="stat-label">Annual allowance used</div>
      <div class="stat-val">${Math.round(ac / AA * 100)}%</div>
      <div class="stat-sub">${fmt(ac)} of ${fmt(AA)}</div>
    </div>
    <div class="stat-card sc-purple">
      <div class="stat-label">State pension (est.)</div>
      <div class="stat-val val">${fmt(statePensionAnn(spY))}</div>
      <div class="stat-sub">${spY}/${SP_YRS} NI years</div>
    </div>
  `;
}

// ── Overview tab ──
function rOverview() {
  const b  = totalBalance();
  const sp = statePensionAnn(15);
  const p5 = proj(b, annualContribs(), 29, 5);
  const pv = p5[p5.length - 1];
  const wi = pv * 0.04;   // 4% safe withdrawal rate
  const ti = wi + sp;

  document.getElementById('ovC').innerHTML = `
    <div class="section-label">Pension accounts</div>
    <div class="pen-stack">
    ${accs.map(a => {
      const m     = monthlyContrib(a);
      return `
        <div class="card">
          <div class="pen-row" style="margin-bottom:8px;">
            <div>
              <span style="font-variation-settings:'wght' 600;font-size:14px;">${a.name}</span>
              <span style="margin-left:8px;">${penTypePill(a.type)}</span>
            </div>
            <span class="val" style="font-size:18px;font-variation-settings:'wght' 700;">${fmt(a.balance)}</span>
          </div>
          <div class="pen-row" style="font-size:12px;color:var(--muted2);">
            <span>${a.provider}</span>
            <span>${m > 0 ? fmt(m) + '/mo' : 'No active contributions'}</span>
          </div>
        </div>`;
    }).join('')}

    <div class="card">
      <div class="card-header" style="margin-bottom:12px;">
        <span class="card-title">Retirement income estimate</span>
        <span class="card-sub">Moderate growth · age 67</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:10px;letter-spacing:.07em;color:var(--muted);text-transform:uppercase;margin-bottom:4px;font-variation-settings:'wght' 600;">Pension drawdown (4% SWR)</div>
          <div class="val" style="font-size:17px;font-variation-settings:'wght' 700;">${fmt(wi)}<span style="font-size:12px;font-variation-settings:'wght' 400;color:var(--muted2);"> /yr</span></div>
        </div>
        <div>
          <div style="font-size:10px;letter-spacing:.07em;color:var(--muted);text-transform:uppercase;margin-bottom:4px;font-variation-settings:'wght' 600;">State pension (15 NI yrs)</div>
          <div class="val" style="font-size:17px;font-variation-settings:'wght' 700;">${fmt(sp)}<span style="font-size:12px;font-variation-settings:'wght' 400;color:var(--muted2);"> /yr</span></div>
        </div>
      </div>
      ${penDivider()}
      <div class="pen-row">
        <span style="font-size:13px;font-variation-settings:'wght' 600;">Combined annual income</span>
        <span class="val" style="font-size:20px;font-variation-settings:'wght' 700;">${fmt(ti)}</span>
      </div>
      <div style="font-size:12px;color:var(--muted2);margin-top:6px;text-align:right;">${fmt(ti / 12)} per month</div>
    </div>
    </div>
  `;
}

// ── Accounts tab ──
function rAccounts() {
  document.getElementById('accC').innerHTML = '<div class="pen-stack">' + accs.map(a => {
    const m     = monthlyContrib(a);
    const ann   = m * 12;
    const empM  = a.salary ? a.salary * a.empP / 100 / 12 : 0;
    const erM   = a.salary ? a.salary * a.erP  / 100 / 12 : 0;

    return `
      <div class="card">
        <div class="pen-row" style="margin-bottom:10px;">
          <div>
            <div style="font-variation-settings:'wght' 600;font-size:15px;margin-bottom:6px;">${a.name}</div>
            ${penTypePill(a.type)}
            <span style="font-size:12px;color:var(--muted2);margin-left:8px;">${a.provider}</span>
          </div>
          <div class="val" style="font-size:22px;font-variation-settings:'wght' 700;">${fmt(a.balance)}</div>
        </div>
        ${penDivider()}
        ${a.salary ? `
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;font-size:12px;">
            <div><div style="color:var(--muted);margin-bottom:3px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-variation-settings:'wght' 600;">Your contrib</div><div style="font-variation-settings:'wght' 600;">${a.empP}%</div><div style="color:var(--muted2);">${fmt(empM)}/mo</div></div>
            <div><div style="color:var(--muted);margin-bottom:3px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-variation-settings:'wght' 600;">Employer</div><div style="font-variation-settings:'wght' 600;">${a.erP}%</div><div style="color:var(--muted2);">${fmt(erM)}/mo</div></div>
            <div><div style="color:var(--muted);margin-bottom:3px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-variation-settings:'wght' 600;">Total gross</div><div style="font-variation-settings:'wght' 600;">${fmt(m)}/mo</div><div style="color:var(--muted2);">${fmt(ann)}/yr</div></div>
            <div><div style="color:var(--muted);margin-bottom:3px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-variation-settings:'wght' 600;">Salary</div><div style="font-variation-settings:'wght' 600;">${fmt(a.salary)}</div></div>
          </div>
        ` : a.fixedM ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
            <div><div style="color:var(--muted);margin-bottom:3px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-variation-settings:'wght' 600;">Monthly contribution</div><div class="val" style="font-variation-settings:'wght' 600;">${fmt(a.fixedM)}</div></div>
            <div><div style="color:var(--muted);margin-bottom:3px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-variation-settings:'wght' 600;">Annual contribution</div><div class="val" style="font-variation-settings:'wght' 600;">${fmt(ann)}</div></div>
          </div>
        ` : `<div style="font-size:12px;color:var(--muted2);">No active contributions — consider consolidating or restarting contributions.</div>`}
      </div>`;
  }).join('') + '</div>';
}

// ── Projections tab ──
function updProj() {
  const ca  = parseInt(document.getElementById('slA').value);
  const ra  = parseInt(document.getElementById('slR').value);
  const mc  = parseInt(document.getElementById('slC').value);
  const sp0 = parseInt(document.getElementById('slP').value);
  const g   = parseFloat(document.getElementById('selG').value);
  const spY = parseInt(document.getElementById('slSP').value);

  // Update readouts
  document.getElementById('oA').textContent  = ca;
  document.getElementById('oR').textContent  = ra;
  document.getElementById('oC').textContent  = '£' + mc.toLocaleString('en-GB');
  document.getElementById('oP').textContent  = '£' + sp0.toLocaleString('en-GB');
  document.getElementById('oSP').textContent = spY;

  const yrs = Math.max(1, ra - ca);
  const ann = mc * 12;
  const sp  = statePensionAnn(spY);
  const lb  = Array.from({ length: yrs + 1 }, (_, i) => ca + i);

  const c3 = proj(sp0, ann, yrs, 3);
  const m5 = proj(sp0, ann, yrs, 5);
  const o7 = proj(sp0, ann, yrs, 7);
  const fc = c3[c3.length - 1];
  const fm = m5[m5.length - 1];
  const fo = o7[o7.length - 1];

  const tickCol = (typeof getComputedStyle !== 'undefined' && document.documentElement)
    ? (getComputedStyle(document.documentElement).getPropertyValue('--muted3').trim() || '#9a999d')
    : '#9a999d';
  const gridCol = (typeof getComputedStyle !== 'undefined' && document.documentElement)
    ? (getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(0,0,0,.08)')
    : 'rgba(0,0,0,.08)';

  // Metric cards
  document.getElementById('projM').innerHTML = `
    <div class="stat-card sc-blue"><div class="stat-label">Projected pot (moderate)</div><div class="stat-val val">${fmt(fm)}</div><div class="stat-sub">at age ${ra}</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Annual income (4% SWR)</div><div class="stat-val val">${fmt(fm * 0.04 + sp)}</div><div class="stat-sub">incl. state pension</div></div>
    <div class="stat-card sc-accent"><div class="stat-label">Monthly income</div><div class="stat-val val">${fmt((fm * 0.04 + sp) / 12)}</div><div class="stat-sub">today's money, pre-tax</div></div>
  `;

  // Legend
  document.getElementById('legD').innerHTML = `
    <span class="pen-legend-item"><span class="pen-legend-dot" style="background:var(--blue);"></span>Conservative (3%) — ${fmt(fc)}</span>
    <span class="pen-legend-item"><span class="pen-legend-dot" style="background:var(--green);"></span>Moderate (5%) — ${fmt(fm)}</span>
    <span class="pen-legend-item"><span class="pen-legend-dot" style="background:var(--amber);"></span>Optimistic (7%) — ${fmt(fo)}</span>
  `;

  // Income comparison cards
  document.getElementById('incC').innerHTML = `
    <div class="section-label" style="margin-top:4px;">Retirement income by scenario</div>
    <div class="pen-scenario-grid">
      ${[[fc,'var(--blue)','Conservative'],[fm,'var(--green)','Moderate'],[fo,'var(--amber)','Optimistic']].map(([pv, col, lbl]) => `
        <div class="stat-card" style="padding:16px;">
          <div class="stat-label" style="margin-bottom:6px;">${lbl}</div>
          <div style="width:24px;height:3px;border-radius:2px;background:${col};margin-bottom:10px;"></div>
          <div class="stat-val val" style="font-size:18px;">${fmt(pv * 0.04 + sp)}<span style="font-size:11px;font-variation-settings:'wght' 400;color:var(--muted2);">/yr</span></div>
          <div class="stat-sub">${fmt((pv * 0.04 + sp) / 12)}/mo</div>
        </div>`).join('')}
    </div>
    ${penDivider()}
    <p style="font-size:11px;color:var(--muted2);line-height:1.5;">4% safe withdrawal rate. State pension: ${fmt(sp)}/yr (${spY}/${SP_YRS} NI years). Figures in today's money, before income tax.</p>
  `;

  // Chart
  if (pChart) pChart.destroy();
  pChart = new Chart(document.getElementById('pChart'), {
    type: 'line',
    data: {
      labels: lb,
      datasets: [
        { label: 'Conservative', data: c3, borderColor: '#1d6fca', backgroundColor: 'transparent',          fill: false, tension: .3, pointRadius: 0, borderWidth: 1.5, borderDash: [5, 4] },
        { label: 'Moderate',     data: m5, borderColor: '#0a8f5c', backgroundColor: 'rgba(10,143,92,.08)',   fill: true,  tension: .3, pointRadius: 0, borderWidth: 2 },
        { label: 'Optimistic',   data: o7, borderColor: '#df9c37', backgroundColor: 'transparent',        fill: false, tension: .3, pointRadius: 0, borderWidth: 1.5, borderDash: [2, 3] }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y) } }
      },
      scales: {
        x: { ticks: { font: { size: 11 }, color: tickCol, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
        y: { ticks: { font: { size: 11 }, color: tickCol, callback: v => (v >= 1000 ? '£' + Math.round(v / 1000) + 'k' : fmt(v)) }, grid: { color: gridCol } }
      }
    }
  });

  rTopM();
}

// ── Tax relief tab ──
function selBand(btn) {
  document.querySelectorAll('#pensionContent .pen-tax-band').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  txBand = parseInt(btn.dataset.b);
  updTax();
}

function updTax() {
  const gr = parseInt(document.getElementById('slGr').value);
  const er = parseFloat(document.getElementById('slEr').value);
  document.getElementById('oGr').textContent = fmt(gr);
  document.getElementById('oEr').textContent = er.toFixed(1) + '%';

  const rel   = gr * (txBand / 100);
  const net   = gr - rel;
  const erAmt = gr * er / 100;
  const tot   = gr + erAmt;
  const eff   = Math.max(0, net - erAmt);

  document.getElementById('taxO').innerHTML = `
    <div class="summary-grid pen-tax-summary" style="margin-bottom:12px;">
      <div class="stat-card sc-accent"><div class="stat-label">Gross into pension</div><div class="stat-val val">${fmt(gr)}</div><div class="stat-sub">total going in</div></div>
      <div class="stat-card sc-green"><div class="stat-label">Tax relief (${txBand}%)</div><div class="stat-val val">${fmt(rel)}</div><div class="stat-sub">HMRC tops up</div></div>
      <div class="stat-card sc-amber"><div class="stat-label">Net cost to you</div><div class="stat-val val">${fmt(net)}</div><div class="stat-sub">from your pay</div></div>
    </div>
    ${erAmt > 0 ? `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header" style="margin-bottom:10px;">
          <span class="card-title">With employer match (${er.toFixed(1)}%)</span>
        </div>
        <div class="pen-row" style="margin-bottom:8px;font-size:13px;"><span style="color:var(--muted2);">Employer adds</span><span class="val" style="font-variation-settings:'wght' 600;">${fmt(erAmt)}</span></div>
        <div class="pen-row" style="margin-bottom:8px;font-size:13px;"><span style="color:var(--muted2);">Total going in</span><span class="val" style="font-variation-settings:'wght' 600;">${fmt(tot)}</span></div>
        ${penDivider()}
        <div class="pen-row"><span style="font-size:13px;font-variation-settings:'wght' 600;">Your effective cost</span><span class="val" style="font-size:17px;font-variation-settings:'wght' 700;">${fmt(eff)}</span></div>
        <p style="font-size:11px;color:var(--muted2);margin-top:10px;line-height:1.5;">For every ${fmt(net)} you put in, ${fmt(tot)} enters your pension — a ${Math.round((tot / net - 1) * 100)}% uplift.</p>
      </div>
    ` : ''}
    <div class="card">
      <div class="card-header" style="margin-bottom:12px;">
        <span class="card-title">All bands compared</span>
        <span class="card-sub">at ${fmt(gr)} gross</span>
      </div>
      <div class="pen-scenario-grid">
        ${[[20, 'Basic'], [40, 'Higher'], [45, 'Additional']].map(([b, lbl]) => {
          const r = gr * b / 100, n = gr - r;
          const active = b === txBand ? 'border-color:var(--accent);box-shadow:0 0 0 1px var(--accent-dim);' : '';
          return `
            <div class="stat-card" style="padding:14px;${active}">
              <div class="stat-label" style="margin-bottom:4px;">${lbl} ${b}%</div>
              <div class="stat-val val" style="font-size:17px;">${fmt(n)}</div>
              <div class="stat-sub">net cost</div>
              <div style="font-size:11px;color:var(--muted2);margin-top:4px;">${fmt(r)} relief</div>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ── Allowances tab ──
function rAllowances() {
  const ac    = annualContribs();
  const used  = Math.min(ac, AA);
  const rem   = AA - used;
  const pct   = Math.round(used / AA * 100);
  const gaugeCol = pct < 60 ? 'var(--green)' : pct < 85 ? 'var(--amber)' : 'var(--red)';

  // Last 3 years carry-forward (replace with real data)
  const cf = [
    { yr: '2022/23', al: 40000, used: 18000 },
    { yr: '2023/24', al: 60000, used: 12500 },
    { yr: '2024/25', al: 60000, used: 12500 }
  ];
  const totCF = cf.reduce((s, y) => s + (y.al - y.used), 0);

  document.getElementById('allC').innerHTML = `
    <div class="card">
      <div class="card-header" style="margin-bottom:12px;">
        <span class="card-title">Annual allowance 2025/26</span>
      </div>
      <div class="pen-row" style="margin-bottom:8px;"><span style="font-size:13px;color:var(--muted2);">Contributions this tax year</span><span class="val" style="font-size:15px;font-variation-settings:'wght' 600;">${fmt(used)}</span></div>
      <div class="prog-outer"><div class="prog-fill" style="width:${pct}%;background:${gaugeCol};"></div></div>
      <div class="pen-row" style="font-size:12px;color:var(--muted2);margin-top:6px;"><span>${pct}% used</span><span>${fmt(rem)} remaining</span></div>
      ${penDivider()}
      <div class="pen-row"><span style="font-size:13px;color:var(--muted2);">Annual allowance limit</span><span class="val" style="font-variation-settings:'wght' 600;">${fmt(AA)}</span></div>
    </div>

    <div class="card">
      <div class="card-header" style="margin-bottom:12px;">
        <span class="card-title">Carry forward — unused allowances</span>
      </div>
      ${cf.map(y => {
        const u = y.al - y.used;
        const p = Math.round(y.used / y.al * 100);
        return `
          <div style="margin-bottom:14px;">
            <div class="pen-row" style="margin-bottom:6px;font-size:13px;"><span>${y.yr}</span><span class="val" style="font-variation-settings:'wght' 600;">${fmt(u)} unused</span></div>
            <div class="prog-outer"><div class="prog-fill" style="width:${p}%;background:var(--blue);"></div></div>
            <div style="font-size:11px;color:var(--muted2);margin-top:4px;">${fmt(y.used)} of ${fmt(y.al)} used</div>
          </div>`;
      }).join('')}
      ${penDivider()}
      <div class="pen-row"><span style="font-size:13px;font-variation-settings:'wght' 600;">Total carry forward available</span><span class="val" style="font-size:17px;font-variation-settings:'wght' 700;">${fmt(totCF)}</span></div>
      <p style="font-size:11px;color:var(--muted2);margin-top:10px;line-height:1.5;">You can contribute up to ${fmt(AA + totCF)} in 2025/26 using carry forward, subject to sufficient earnings.</p>
    </div>

    <div class="card" style="margin-bottom:12px;">
      <div class="card-header" style="margin-bottom:8px;">
        <span class="card-title">Money purchase annual allowance (MPAA)</span>
      </div>
      <p style="font-size:13px;color:var(--muted2);line-height:1.6;">
        Once you start flexible drawdown, contributions are capped at <strong>£10,000/yr</strong>. This prevents recycling drawdown funds back in for repeated tax relief.
      </p>
    </div>

    <div class="card">
      <div class="card-header" style="margin-bottom:8px;">
        <span class="card-title">Tapered annual allowance</span>
      </div>
      <p style="font-size:13px;color:var(--muted2);line-height:1.6;">
        If threshold income exceeds <strong>£200,000</strong> and adjusted income exceeds <strong>£260,000</strong>, your allowance tapers — down to a minimum of <strong>£10,000</strong>.
      </p>
    </div>
  `;
}

// ── Entry point — call this to mount the whole pension section ──
function renderPension() {
  const el = document.getElementById('pensionContent');
  if (!el) return;

  const pensionAccounts = (window.S?.accounts || []).filter(a => a.type === 'pension');

  if (pensionAccounts.length) {
    accs.length = 0;
    accs.push(...pensionAccounts.map((a, i) => ({
      id: a.id ?? i + 1,
      name: a.name || a.provider || `Pension ${i + 1}`,
      type: 'SIPP',
      provider: a.provider || '',
      balance: a.balance || 0,
      fixedM: (a.contrib || 0) / 12
    })));
  }

  if (!accs.length) {
    el.innerHTML = '<div class="empty"><div class="ei">🔒</div><p>No pension accounts tracked yet.</p></div>';
    return;
  }

  el.innerHTML = `
    <div class="tab-row">
      <button type="button" class="tab-btn active" onclick="swTab('overview', this)">Overview</button>
      <button type="button" class="tab-btn" onclick="swTab('accounts', this)">Accounts</button>
      <button type="button" class="tab-btn" onclick="swTab('projections', this)">Projections</button>
      <button type="button" class="tab-btn" onclick="swTab('tax', this)">Tax relief</button>
      <button type="button" class="tab-btn" onclick="swTab('allowances', this)">Allowances</button>
    </div>
    <div id="topM" class="summary-grid"></div>
    <div class="ptab active" id="tab-overview">
      <div id="ovC"></div>
    </div>
    <div class="ptab" id="tab-accounts" style="display:none;">
      <div id="accC"></div>
    </div>
    <div class="ptab" id="tab-projections" style="display:none;">
      <div class="card" style="margin-bottom:18px;">
        <div class="form-grid" style="grid-template-columns:repeat(4,minmax(140px,1fr));gap:12px;">
          <div class="ff"><label>Current age</label><input id="slA" type="range" min="18" max="70" value="45" oninput="document.getElementById('oA').textContent=this.value;updProj()"/><div style="font-size:12px;color:var(--muted2);margin-top:6px;">Selected: <span id="oA">45</span></div></div>
          <div class="ff"><label>Retirement age</label><input id="slR" type="range" min="55" max="75" value="67" oninput="document.getElementById('oR').textContent=this.value;updProj()"/><div style="font-size:12px;color:var(--muted2);margin-top:6px;">Selected: <span id="oR">67</span></div></div>
          <div class="ff"><label>Monthly contributions</label><input id="slC" type="range" min="0" max="5000" step="50" value="600" oninput="document.getElementById('oC').textContent=fmt(parseInt(this.value,10)||0);updProj()"/><div style="font-size:12px;color:var(--muted2);margin-top:6px;">Selected: <span id="oC">${fmt(600)}</span></div></div>
          <div class="ff"><label>Current pot</label><input id="slP" type="range" min="0" max="500000" step="500" value="${totalBalance()}" oninput="document.getElementById('oP').textContent=fmt(parseInt(this.value,10)||0);updProj()"/><div style="font-size:12px;color:var(--muted2);margin-top:6px;">Selected: <span id="oP">${fmt(totalBalance())}</span></div></div>
          <div class="ff"><label>Growth rate</label><select id="selG" onchange="updProj()"><option value="3">3%</option><option value="5" selected>5%</option><option value="7">7%</option></select></div>
          <div class="ff"><label>NI years</label><input id="slSP" type="range" min="0" max="35" value="15" oninput="document.getElementById('oSP').textContent=this.value;updProj()"/><div style="font-size:12px;color:var(--muted2);margin-top:6px;">Selected: <span id="oSP">15</span></div></div>
        </div>
      </div>
      <div id="projM" class="summary-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));"></div>
      <div id="incC"></div>
      <div id="legD" class="pen-legend"></div>
      <div class="card pen-chart-card">
        <div class="pen-chart-wrap"><canvas id="pChart"></canvas></div>
      </div>
    </div>
    <div class="ptab" id="tab-tax" style="display:none;">
      <div class="card" style="margin-bottom:18px;">
        <div class="form-grid" style="grid-template-columns:repeat(4,minmax(140px,1fr));gap:12px;">
          <div class="ff"><label>Gross contribution</label><input id="slGr" type="range" min="1000" max="150000" step="500" value="30000" oninput="document.getElementById('oGr').textContent=fmt(parseInt(this.value,10)||0);updTax()"/><div style="font-size:12px;color:var(--muted2);margin-top:6px;">Selected: <span id="oGr">${fmt(30000)}</span></div></div>
          <div class="ff"><label>Employer match</label><input id="slEr" type="range" min="0" max="20" step="0.5" value="5" oninput="document.getElementById('oEr').textContent=this.value+'%';updTax()"/><div style="font-size:12px;color:var(--muted2);margin-top:6px;">Selected: <span id="oEr">5%</span></div></div>
          <div class="ff" style="grid-column:span 2;"><label>Tax band</label><div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="filter-btn pen-tax-band active" data-b="20" onclick="selBand(this)">20%</button>
            <button type="button" class="filter-btn pen-tax-band" data-b="40" onclick="selBand(this)">40%</button>
            <button type="button" class="filter-btn pen-tax-band" data-b="45" onclick="selBand(this)">45%</button>
          </div></div>
        </div>
      </div>
      <div id="taxO"></div>
    </div>
    <div class="ptab" id="tab-allowances" style="display:none;">
      <div id="allC"></div>
    </div>
  `;

  document.querySelectorAll('#pensionContent .ptab').forEach(panel => panel.style.display = panel.classList.contains('active') ? '' : 'none');

  rTopM();
  rOverview();
  rAccounts();
  rAllowances();
  setTimeout(() => { updProj(); updTax(); }, 50);
}