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

// ── Formatters ──
const f   = n => '£' + Math.round(n).toLocaleString('en-GB');
const fK  = n => n >= 1000 ? '£' + (n / 1000).toFixed(0) + 'k' : f(n);
const fKd = n => n >= 1000 ? '£' + (n / 1000).toFixed(1) + 'k' : f(n);

// ── Helpers ──
function monthlyContrib(a) {
  return (a.fixedM || 0) + (a.salary ? a.salary * (a.empP + a.erP) / 100 / 12 : 0);
}
function totalBalance()     { return accs.reduce((s, a) => s + a.balance, 0); }
function totalMonthly()     { return accs.reduce((s, a) => s + monthlyContrib(a), 0); }
function annualContribs()   { return totalMonthly() * 12; }
function statePensionAnn(yrs) { return (Math.min(yrs, SP_YRS) / SP_YRS) * SP_FULL; }

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
  document.querySelectorAll('#pensionContent .nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── Top metric bar (always visible) ──
function rTopM() {
  const m   = totalMonthly();
  const b   = totalBalance();
  const ac  = annualContribs();
  const spY = parseInt(document.getElementById('slSP')?.value || 15);

  document.getElementById('topM').innerHTML = `
    <div class="met">
      <div class="ml">Total pension pot</div>
      <div class="mv">${f(b)}</div>
      <div class="ms">${accs.length} accounts</div>
    </div>
    <div class="met">
      <div class="ml">Monthly contributions</div>
      <div class="mv">${f(m)}</div>
      <div class="ms">${f(m * 12)}/yr</div>
    </div>
    <div class="met">
      <div class="ml">Annual allowance used</div>
      <div class="mv">${Math.round(ac / AA * 100)}%</div>
      <div class="ms">${f(ac)} of ${f(AA)}</div>
    </div>
    <div class="met">
      <div class="ml">State pension (est.)</div>
      <div class="mv">${f(statePensionAnn(spY))}</div>
      <div class="ms">${spY}/${SP_YRS} NI years</div>
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
    <p class="sl" style="margin-bottom:10px;">Pension accounts</p>
    ${accs.map(a => {
      const m     = monthlyContrib(a);
      const badge = a.type === 'SIPP' ? 'bs' : a.type === 'Workplace' ? 'bw' : 'bp';
      return `
        <div class="card">
          <div class="row" style="margin-bottom:8px;">
            <div>
              <span style="font-weight:500;font-size:14px;">${a.name}</span>
              <span class="badge ${badge}" style="margin-left:8px;">${a.type}</span>
            </div>
            <span style="font-size:18px;font-weight:500;">${f(a.balance)}</span>
          </div>
          <div class="row" style="font-size:12px;color:var(--muted);">
            <span>${a.provider}</span>
            <span>${m > 0 ? f(m) + '/mo' : 'No active contributions'}</span>
          </div>
        </div>`;
    }).join('')}

    <div class="card">
      <p class="sl">Retirement income estimate (moderate growth, age 67)</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:3px;">Pension drawdown (4% SWR)</div>
          <div style="font-size:17px;font-weight:500;">${f(wi)}<span style="font-size:12px;font-weight:400;color:var(--muted);"> /yr</span></div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:3px;">State pension (15 NI yrs)</div>
          <div style="font-size:17px;font-weight:500;">${f(sp)}<span style="font-size:12px;font-weight:400;color:var(--muted);"> /yr</span></div>
        </div>
      </div>
      <hr class="div">
      <div class="row">
        <span style="font-size:13px;font-weight:500;">Combined annual income</span>
        <span style="font-size:20px;font-weight:500;">${f(ti)}</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;text-align:right;">${f(ti / 12)} per month</div>
    </div>
  `;
}

// ── Accounts tab ──
function rAccounts() {
  document.getElementById('accC').innerHTML = accs.map(a => {
    const m     = monthlyContrib(a);
    const ann   = m * 12;
    const empM  = a.salary ? a.salary * a.empP / 100 / 12 : 0;
    const erM   = a.salary ? a.salary * a.erP  / 100 / 12 : 0;
    const badge = a.type === 'SIPP' ? 'bs' : a.type === 'Workplace' ? 'bw' : 'bp';

    return `
      <div class="card">
        <div class="row" style="margin-bottom:10px;">
          <div>
            <div style="font-weight:500;font-size:15px;margin-bottom:5px;">${a.name}</div>
            <span class="badge ${badge}">${a.type}</span>
            <span style="font-size:12px;color:var(--muted);margin-left:8px;">${a.provider}</span>
          </div>
          <div style="font-size:22px;font-weight:500;">${f(a.balance)}</div>
        </div>
        <hr class="div">
        ${a.salary ? `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;font-size:12px;">
            <div><div style="color:var(--muted);margin-bottom:3px;">Your contrib</div><div style="font-weight:500;">${a.empP}%</div><div style="color:var(--muted);">${f(empM)}/mo</div></div>
            <div><div style="color:var(--muted);margin-bottom:3px;">Employer</div><div style="font-weight:500;">${a.erP}%</div><div style="color:var(--muted);">${f(erM)}/mo</div></div>
            <div><div style="color:var(--muted);margin-bottom:3px;">Total gross</div><div style="font-weight:500;">${f(m)}/mo</div><div style="color:var(--muted);">${f(ann)}/yr</div></div>
            <div><div style="color:var(--muted);margin-bottom:3px;">Salary</div><div style="font-weight:500;">${f(a.salary)}</div></div>
          </div>
        ` : a.fixedM ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
            <div><div style="color:var(--muted);margin-bottom:3px;">Monthly contribution</div><div style="font-weight:500;">${f(a.fixedM)}</div></div>
            <div><div style="color:var(--muted);margin-bottom:3px;">Annual contribution</div><div style="font-weight:500;">${f(ann)}</div></div>
          </div>
        ` : `<div style="font-size:12px;color:var(--muted);">No active contributions — consider consolidating or restarting contributions.</div>`}
      </div>`;
  }).join('');
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

  // Metric cards
  document.getElementById('projM').innerHTML = `
    <div class="met"><div class="ml">Projected pot (moderate)</div><div class="mv">${fKd(fm)}</div><div class="ms">at age ${ra}</div></div>
    <div class="met"><div class="ml">Annual income (4% SWR)</div><div class="mv">${fKd(fm * 0.04 + sp)}</div><div class="ms">incl. state pension</div></div>
    <div class="met"><div class="ml">Monthly income</div><div class="mv">${fKd((fm * 0.04 + sp) / 12)}</div><div class="ms">today's money, pre-tax</div></div>
  `;

  // Legend
  document.getElementById('legD').innerHTML = `
    <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#378ADD;"></span>Conservative (3%) — ${fKd(fc)}</span>
    <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#1D9E75;"></span>Moderate (5%) — ${fKd(fm)}</span>
    <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#BA7517;"></span>Optimistic (7%) — ${fKd(fo)}</span>
  `;

  // Income comparison cards
  document.getElementById('incC').innerHTML = `
    <p class="sl">Retirement income by scenario</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
      ${[[fc,'#378ADD','Conservative'],[fm,'#1D9E75','Moderate'],[fo,'#BA7517','Optimistic']].map(([pv, col, lbl]) => `
        <div class="rc">
          <div style="font-size:11px;color:var(--muted);margin-bottom:5px;">${lbl}</div>
          <div style="width:20px;height:3px;border-radius:2px;background:${col};margin:0 auto 8px;"></div>
          <div style="font-size:15px;font-weight:500;">${f(pv * 0.04 + sp)}/yr</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px;">${f((pv * 0.04 + sp) / 12)}/mo</div>
        </div>`).join('')}
    </div>
    <hr class="div">
    <div style="font-size:11px;color:var(--muted);">4% safe withdrawal rate. State pension: ${f(sp)}/yr (${spY}/${SP_YRS} NI years). Figures in today's money, before income tax.</div>
  `;

  // Chart
  if (pChart) pChart.destroy();
  pChart = new Chart(document.getElementById('pChart'), {
    type: 'line',
    data: {
      labels: lb,
      datasets: [
        { label: 'Conservative', data: c3, borderColor: '#378ADD', backgroundColor: 'transparent',             fill: false, tension: .3, pointRadius: 0, borderWidth: 1.5, borderDash: [5, 4] },
        { label: 'Moderate',     data: m5, borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,.08)',    fill: true,  tension: .3, pointRadius: 0, borderWidth: 2 },
        { label: 'Optimistic',   data: o7, borderColor: '#BA7517', backgroundColor: 'transparent',             fill: false, tension: .3, pointRadius: 0, borderWidth: 1.5, borderDash: [2, 3] }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + f(ctx.parsed.y) } }
      },
      scales: {
        x: { ticks: { font: { size: 11 }, color: '#888', autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
        y: { ticks: { font: { size: 11 }, color: '#888', callback: v => fK(v) }, grid: { color: 'rgba(128,128,128,.1)' } }
      }
    }
  });

  rTopM();
}

// ── Tax relief tab ──
function selBand(btn) {
  document.querySelectorAll('.bnd').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  txBand = parseInt(btn.dataset.b);
  updTax();
}

function updTax() {
  const gr = parseInt(document.getElementById('slGr').value);
  const er = parseFloat(document.getElementById('slEr').value);
  document.getElementById('oGr').textContent = '£' + gr.toLocaleString('en-GB');
  document.getElementById('oEr').textContent = er.toFixed(1) + '%';

  const rel   = gr * (txBand / 100);
  const net   = gr - rel;
  const erAmt = gr * er / 100;
  const tot   = gr + erAmt;
  const eff   = Math.max(0, net - erAmt);

  document.getElementById('taxO').innerHTML = `
    <div class="mgrid" style="margin-bottom:12px;">
      <div class="met"><div class="ml">Gross into pension</div><div class="mv">${f(gr)}</div><div class="ms">total going in</div></div>
      <div class="met"><div class="ml">Tax relief (${txBand}%)</div><div class="mv">${f(rel)}</div><div class="ms">HMRC tops up</div></div>
      <div class="met"><div class="ml">Net cost to you</div><div class="mv">${f(net)}</div><div class="ms">from your pay</div></div>
    </div>
    ${erAmt > 0 ? `
      <div class="card" style="margin-bottom:12px;">
        <p class="sl">With employer match (${er.toFixed(1)}%)</p>
        <div class="row" style="margin-bottom:8px;font-size:13px;"><span style="color:var(--muted);">Employer adds</span><span style="font-weight:500;">${f(erAmt)}</span></div>
        <div class="row" style="margin-bottom:8px;font-size:13px;"><span style="color:var(--muted);">Total going in</span><span style="font-weight:500;">${f(tot)}</span></div>
        <hr class="div">
        <div class="row"><span style="font-size:13px;font-weight:500;">Your effective cost</span><span style="font-size:17px;font-weight:500;">${f(eff)}</span></div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px;">For every ${f(net)} you put in, ${f(tot)} enters your pension — a ${Math.round((tot / net - 1) * 100)}% uplift.</div>
      </div>
    ` : ''}
    <div class="card">
      <p class="sl">All bands compared at ${f(gr)} gross</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        ${[[20, 'Basic'], [40, 'Higher'], [45, 'Additional']].map(([b, lbl]) => {
          const r = gr * b / 100, n = gr - r;
          const active = b === txBand ? 'border:1.5px solid var(--color-border-info);' : '';
          return `
            <div class="rc" style="${active}">
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">${lbl} ${b}%</div>
              <div style="font-size:16px;font-weight:500;">${f(n)}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">net cost</div>
              <div style="font-size:11px;color:var(--muted);">${f(r)} relief</div>
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
  const gaugeCol = pct < 60 ? '#1D9E75' : pct < 85 ? '#BA7517' : '#E24B4A';

  // Last 3 years carry-forward (replace with real data)
  const cf = [
    { yr: '2022/23', al: 40000, used: 18000 },
    { yr: '2023/24', al: 60000, used: 12500 },
    { yr: '2024/25', al: 60000, used: 12500 }
  ];
  const totCF = cf.reduce((s, y) => s + (y.al - y.used), 0);

  document.getElementById('allC').innerHTML = `
    <div class="card">
      <p class="sl">Annual allowance 2025/26</p>
      <div class="row" style="margin-bottom:8px;"><span style="font-size:13px;color:var(--muted);">Contributions this tax year</span><span style="font-size:15px;font-weight:500;">${f(used)}</span></div>
      <div class="gt"><div class="gf" style="width:${pct}%;background:${gaugeCol};"></div></div>
      <div class="row" style="font-size:12px;color:var(--muted);"><span>${pct}% used</span><span>${f(rem)} remaining</span></div>
      <hr class="div">
      <div class="row"><span style="font-size:13px;color:var(--muted);">Annual allowance limit</span><span style="font-weight:500;">${f(AA)}</span></div>
    </div>

    <div class="card">
      <p class="sl">Carry forward — unused allowances</p>
      ${cf.map(y => {
        const u = y.al - y.used;
        const p = Math.round(y.used / y.al * 100);
        return `
          <div style="margin-bottom:12px;">
            <div class="row" style="margin-bottom:4px;font-size:13px;"><span>${y.yr}</span><span style="font-weight:500;">${f(u)} unused</span></div>
            <div class="gt"><div class="gf" style="width:${p}%;background:#378ADD;"></div></div>
            <div style="font-size:11px;color:var(--muted);">${f(y.used)} of ${f(y.al)} used</div>
          </div>`;
      }).join('')}
      <hr class="div">
      <div class="row"><span style="font-size:13px;font-weight:500;">Total carry forward available</span><span style="font-size:17px;font-weight:500;">${f(totCF)}</span></div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px;">You can contribute up to ${f(AA + totCF)} in 2025/26 using carry forward, subject to sufficient earnings.</div>
    </div>

    <div class="card" style="margin-bottom:12px;">
      <p class="sl">Money purchase annual allowance (MPAA)</p>
      <div style="font-size:13px;color:var(--muted);line-height:1.6;">
        Once you start flexible drawdown, contributions are capped at <strong>£10,000/yr</strong>. This prevents recycling drawdown funds back in for repeated tax relief.
      </div>
    </div>

    <div class="card">
      <p class="sl">Tapered annual allowance</p>
      <div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:10px;">
        If threshold income exceeds <strong>£200,000</strong> and adjusted income exceeds <strong>£260,000</strong>, your allowance tapers — down to a minimum of <strong>£10,000</strong>.
      </div>
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
    <div class="tab-row" style="gap:8px;margin-bottom:20px;flex-wrap:wrap;">
      <button class="nav-btn active" onclick="swTab('overview', this)">Overview</button>
      <button class="nav-btn" onclick="swTab('accounts', this)">Accounts</button>
      <button class="nav-btn" onclick="swTab('projections', this)">Projections</button>
      <button class="nav-btn" onclick="swTab('tax', this)">Tax relief</button>
      <button class="nav-btn" onclick="swTab('allowances', this)">Allowances</button>
    </div>
    <div id="topM" class="summary-grid" style="grid-template-columns:repeat(4,minmax(160px,1fr));gap:14px;margin-bottom:20px;"></div>
    <div class="ptab active" id="tab-overview">
      <div id="ovC"></div>
    </div>
    <div class="ptab" id="tab-accounts" style="display:none;">
      <div id="accC"></div>
    </div>
    <div class="ptab" id="tab-projections" style="display:none;">
      <div class="card" style="margin-bottom:18px;">
        <div class="form-grid" style="grid-template-columns:repeat(4,minmax(140px,1fr));gap:12px;">
          <div class="ff"><label>Current age</label><input id="slA" type="range" min="18" max="70" value="45" oninput="document.getElementById('oA').textContent=this.value;updProj()"/><div style="font-size:12px;color:var(--muted);margin-top:6px;">Selected: <span id="oA">45</span></div></div>
          <div class="ff"><label>Retirement age</label><input id="slR" type="range" min="55" max="75" value="67" oninput="document.getElementById('oR').textContent=this.value;updProj()"/><div style="font-size:12px;color:var(--muted);margin-top:6px;">Selected: <span id="oR">67</span></div></div>
          <div class="ff"><label>Monthly contributions</label><input id="slC" type="range" min="0" max="5000" step="50" value="600" oninput="document.getElementById('oC').textContent='£'+parseInt(this.value).toLocaleString('en-GB');updProj()"/><div style="font-size:12px;color:var(--muted);margin-top:6px;">Selected: <span id="oC">£600</span></div></div>
          <div class="ff"><label>Current pot</label><input id="slP" type="range" min="0" max="500000" step="500" value="${totalBalance()}" oninput="document.getElementById('oP').textContent='£'+parseInt(this.value).toLocaleString('en-GB');updProj()"/><div style="font-size:12px;color:var(--muted);margin-top:6px;">Selected: <span id="oP">£${Math.round(totalBalance()).toLocaleString('en-GB')}</span></div></div>
          <div class="ff"><label>Growth rate</label><select id="selG" onchange="updProj()"><option value="3">3%</option><option value="5" selected>5%</option><option value="7">7%</option></select></div>
          <div class="ff"><label>NI years</label><input id="slSP" type="range" min="0" max="35" value="15" oninput="document.getElementById('oSP').textContent=this.value;updProj()"/><div style="font-size:12px;color:var(--muted);margin-top:6px;">Selected: <span id="oSP">15</span></div></div>
        </div>
      </div>
      <div id="projM" class="summary-grid" style="grid-template-columns:repeat(3,minmax(180px,1fr));gap:14px;margin-bottom:20px;"></div>
      <div id="incC"></div>
      <div style="height:320px;"><canvas id="pChart"></canvas></div>
    </div>
    <div class="ptab" id="tab-tax" style="display:none;">
      <div class="card" style="margin-bottom:18px;">
        <div class="form-grid" style="grid-template-columns:repeat(4,minmax(140px,1fr));gap:12px;">
          <div class="ff"><label>Gross contribution</label><input id="slGr" type="range" min="1000" max="150000" step="500" value="30000" oninput="document.getElementById('oGr').textContent='£'+parseInt(this.value).toLocaleString('en-GB');updTax()"/><div style="font-size:12px;color:var(--muted);margin-top:6px;">Selected: <span id="oGr">£30,000</span></div></div>
          <div class="ff"><label>Employer match</label><input id="slEr" type="range" min="0" max="20" step="0.5" value="5" oninput="document.getElementById('oEr').textContent=this.value+'%';updTax()"/><div style="font-size:12px;color:var(--muted);margin-top:6px;">Selected: <span id="oEr">5%</span></div></div>
          <div class="ff" style="grid-column:span 2;"><label>Tax band</label><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="bnd active" data-b="20" onclick="selBand(this)">20%</button><button class="bnd" data-b="40" onclick="selBand(this)">40%</button><button class="bnd" data-b="45" onclick="selBand(this)">45%</button></div></div>
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