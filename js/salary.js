// ── Salary & UK tax ──────────────────────────────────
// JS: SALARY (UK tax calculation)
// ═══════════════════════════════════════════════════

function calcUKTax(gross, pensionPct, bonus) {
  const pensionAmt = gross * (pensionPct || 0) / 100;
  const taxable = Math.max(0, gross - pensionAmt); // simplified: ignoring salary sacrifice nuance
  const totalIncome = taxable + (bonus || 0);

  // Income tax
  let incomeTax = 0;
  UK_TAX.bands.forEach(band => {
    const from = band.from, to = Math.min(band.to, totalIncome);
    if (to > from && totalIncome > from) incomeTax += Math.max(0, to - from) * band.rate / 100;
  });

  // NI (simplified annual)
  const ptAnnual = UK_TAX.ni.ptWeekly * 52; // ~12,570
  const uelAnnual = UK_TAX.ni.uelWeekly * 52; // ~50,270
  let ni = 0;
  if (totalIncome > ptAnnual) ni += Math.min(totalIncome, uelAnnual) - ptAnnual > 0 ? (Math.min(totalIncome, uelAnnual) - ptAnnual) * UK_TAX.ni.mainRate / 100 : 0;
  if (totalIncome > uelAnnual) ni += (totalIncome - uelAnnual) * UK_TAX.ni.upperRate / 100;

  // Student loan (no longer calculated here - moved to debts page)
  const slRepayment = 0;

  const totalDeductions = incomeTax + ni + pensionAmt + slRepayment;
  const takeHome = totalIncome - totalDeductions;
  return { gross, bonus: bonus || 0, totalIncome, pensionAmt, incomeTax, ni, slRepayment, totalDeductions, takeHome, takeHomeMonthly: takeHome / 12 };
}

let currentPersonIdx = 0;
let selectedPerks = [];

function normalizeSalaryRecord(sal) {
  if (!sal || typeof sal !== 'object') return sal;
  if (!Array.isArray(sal.bonuses)) {
    sal.bonuses = (sal.bonus > 0) ? [{ amount: sal.bonus, date: '', label: '' }] : [];
  }
  if (sal.ongoing === undefined) sal.ongoing = !sal.endDate;
  sal.bonus = (sal.bonuses || []).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  return sal;
}

function getSalaryBonuses(sal) {
  if (!sal) return [];
  if (!Array.isArray(sal.bonuses)) normalizeSalaryRecord(sal);
  return sal.bonuses || [];
}

function getSalaryBonusTotal(sal) {
  return getSalaryBonuses(sal).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
}

function formatSalaryPayDayLabel(sal) {
  if (!sal || !sal.payDay) return '—';
  if (sal.payDay === 'custom') {
    const d = sal.payDayCustom;
    return d ? `Day ${d} of month` : (PAY_DAY_OPTIONS.find(o => o.value === 'custom')?.label || 'Custom day');
  }
  return PAY_DAY_OPTIONS.find(o => o.value === sal.payDay)?.label || sal.payDay;
}

function formatSalaryBonusSummary(sal) {
  const total = getSalaryBonusTotal(sal);
  if (!total) return '—';
  const n = getSalaryBonuses(sal).length;
  return n > 1 ? `${fmt(total)} (${n})` : fmt(total);
}

function resolveSalaryPayDay(sal) {
  if (!sal) return '';
  if (sal.payDay === 'custom' && sal.payDayCustom) return String(sal.payDayCustom);
  return sal.payDay || '';
}

function toggleSalaryOngoing(mode) {
  const ongoing = document.getElementById(mode === 'add' ? 'salOngoing' : 'es-ongoing');
  const wrap = document.getElementById(mode === 'add' ? 'salEndDateWrap' : 'esEndDateWrap');
  if (!ongoing || !wrap) return;
  if (mode === 'edit') {
    wrap.classList.remove('hidden');
    wrap.classList.toggle('is-muted', !!ongoing.checked);
    return;
  }
  wrap.classList.toggle('hidden', !!ongoing.checked);
}

function toggleSalaryPayDayCustom(mode) {
  const sel = document.getElementById(mode === 'add' ? 'salPayDay' : 'es-payDay');
  const wrap = document.getElementById(mode === 'add' ? 'salPayDayCustomWrap' : 'esPayDayCustomWrap');
  if (!sel || !wrap) return;
  wrap.classList.toggle('hidden', sel.value !== 'custom');
}

function _salaryBonusListId(mode) {
  return mode === 'add' ? 'salBonusesList' : 'esBonusesList';
}

function _salaryBonusRowHtml(mode, b, i) {
  const amt = b.amount ? Number(b.amount).toLocaleString('en-GB') : '';
  const label = (b.label || '').replace(/"/g, '&quot;');
  return `
    <div class="sal-bonus-row" data-bonus-idx="${i}">
      <div class="ff money-field"><label>Amount</label>
        <input type="text" data-bonus-amount value="${amt}" placeholder="0" oninput="formatMoney(this)"/><span class="currency">£</span></div>
      <div class="ff"><label>Payment date</label><input type="date" data-bonus-date value="${b.date || ''}"/></div>
      <div class="ff"><label>Label</label><input type="text" data-bonus-label value="${label}" placeholder="e.g. Q1 bonus"/></div>
      <button type="button" class="icon-btn del sal-bonus-remove" onclick="removeSalaryBonusRow('${mode}', ${i})" title="Remove">✕</button>
    </div>`;
}

function renderSalaryBonusRows(mode, bonuses) {
  const list = document.getElementById(_salaryBonusListId(mode));
  if (!list) return;
  const rows = bonuses && bonuses.length ? bonuses : [];
  if (!rows.length) {
    list.innerHTML = '<p class="text-sm text-muted" style="margin:0 0 8px;">No bonuses yet — use + Add bonus.</p>';
    return;
  }
  list.innerHTML = rows.map((b, i) => _salaryBonusRowHtml(mode, b, i)).join('');
}

function addSalaryBonusRow(mode) {
  const list = document.getElementById(_salaryBonusListId(mode));
  if (!list) return;
  const hint = list.querySelector('p.text-muted');
  if (hint) hint.remove();
  const current = readSalaryBonusRows(mode);
  current.push({ amount: '', date: '', label: '' });
  renderSalaryBonusRows(mode, current);
}

function removeSalaryBonusRow(mode, idx) {
  const current = readSalaryBonusRows(mode);
  current.splice(idx, 1);
  renderSalaryBonusRows(mode, current);
}

function readSalaryBonusRows(mode) {
  const list = document.getElementById(_salaryBonusListId(mode));
  if (!list) return [];
  return [...list.querySelectorAll('.sal-bonus-row')].map(row => ({
    amount: parseMoney(row.querySelector('[data-bonus-amount]')?.value) || 0,
    date: row.querySelector('[data-bonus-date]')?.value || '',
    label: (row.querySelector('[data-bonus-label]')?.value || '').trim()
  })).filter(b => b.amount > 0);
}

function readSalaryPayDayCustom(mode) {
  const el = document.getElementById(mode === 'add' ? 'salPayDayCustom' : 'esPayDayCustom');
  const n = parseInt(el?.value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

function initSalaryAddForm() {
  toggleSalaryOngoing('add');
  toggleSalaryPayDayCustom('add');
  if (!document.getElementById('salBonusesList')?.querySelector('.sal-bonus-row')) {
    renderSalaryBonusRows('add', []);
  }
}

function getTaxBand(gross) {
  for (const band of UK_TAX.bands) {
    if (gross >= band.from && gross < band.to) {
      return band;
    }
  }
  return UK_TAX.bands[UK_TAX.bands.length - 1]; // Additional rate
}

function renderPerksSelector() {
  const container = document.getElementById('salPerksContainer');
  if (!container) return;
  container.innerHTML = SALARY_PERKS.map(perk => `
    <label class="perk-chip ${selectedPerks.includes(perk.value) ? 'selected' : ''}">
      <input type="checkbox" value="${perk.value}" 
        ${selectedPerks.includes(perk.value) ? 'checked' : ''}
        onchange="togglePerk('${perk.value}', 'add')">
      <span>${perk.value === 'other' ? perk.label : `${perk.icon} ${perk.label}`}</span>
    </label>
  `).join('') + renderOtherPerkInput('add');
}

function togglePerk(perkValue, mode = 'add') {
  const index = selectedPerks.indexOf(perkValue);
  if (index > -1) {
    selectedPerks.splice(index, 1);
  } else {
    selectedPerks.push(perkValue);
  }
  if (mode === 'edit') renderEditPerksSelector();
  else renderPerksSelector();
}

function renderOtherPerkInput(mode, value = '') {
  if (!selectedPerks.includes('other')) return '';
  const id = mode === 'edit' ? 'esOtherPerk' : 'salOtherPerk';
  return `<div class="ff perk-other-field"><label>Other perk</label><input type="text" id="${id}" value="${escSalaryAttr(value)}" placeholder="e.g. season ticket loan" /></div>`;
}

function escSalaryAttr(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function populatePayDayOptions() {
  const select = document.getElementById('salPayDay');
  if (!select) return;
  select.innerHTML = '<option value="">Select pay day...</option>' +
    PAY_DAY_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
}

function renderSalary() {
  (S.salaries || []).forEach(normalizeSalaryRecord);

  // Populate person dropdown
  const personSel = document.getElementById('salPerson');
  if (S.settings.personNames && S.settings.personNames.length > 0) {
    personSel.innerHTML = S.settings.personNames.map((p, i) => `<option value="${i}">${p}</option>`).join('');
    personSel.value = currentPersonIdx;
  } else {
    personSel.innerHTML = '<option value="">No people configured</option>';
  }

  // Populate pay day options
  populatePayDayOptions();

  // Reset perks selection
  selectedPerks = [];
  renderPerksSelector();

  // Render person tabs
  const tabsEl = document.getElementById('personTabs');
  const allPeople = S.settings.personNames && S.settings.personNames.length > 0 ? [...S.settings.personNames] : [];
  if (allPeople.length > 1) allPeople.push('Household');

  if (allPeople.length > 1) {
    tabsEl.innerHTML = allPeople.map((p, i) => {
      const isHousehold = i === allPeople.length - 1;
      return `<button class="person-btn ${currentPersonIdx === i ? 'active' : ''}" onclick="switchPerson(${i})">${isHousehold ? '📊 ' + p : p}</button>`;
    }).join('');
  } else { tabsEl.innerHTML = ''; currentPersonIdx = 0; }

  // Get content based on current view
  const el = document.getElementById('salaryContent');
  const isHousehold = S.settings.personNames && S.settings.personNames.length > 1 && currentPersonIdx === S.settings.personNames.length;

  if (isHousehold) {
    renderHouseholdSalary(el);
  } else {
    renderPersonSalary(el, currentPersonIdx);
  }

  initSalaryAddForm();
}

function switchPerson(idx) {
  currentPersonIdx = idx;
  renderSalary();
}
function getTaxCodeCard() {
  const taxCode = S.settings.taxCode || '1257L'; // Default UK tax code
  const sal = S.salaries.length ? S.salaries[S.salaries.length - 1] : null;

  // Calculate estimated tax code based on salary
  let estimatedCode = taxCode;
  if (sal && sal.gross) {
    // Simple estimation based on income
    if (sal.gross <= 12570) estimatedCode = '1257L';
    else if (sal.gross <= 50270) estimatedCode = '1257L';
    else if (sal.gross <= 125140) estimatedCode = 'D0';
    else estimatedCode = 'D1';
  }

  return `<div class="sal-card"><div class="sal-label">Tax Code</div><div class="sal-val val" style="color:var(--accent);">${estimatedCode}</div><div class="sal-sub">HMRC · 2025/26</div></div>`;
}

function renderPersonSalary(el, personIdx) {
  const personSals = S.salaries.filter(s => (s.person || 0) === personIdx);

  if (!personSals.length) {
    const personName = S.settings.personNames && S.settings.personNames[personIdx] ? S.settings.personNames[personIdx] : 'this person';
    el.innerHTML = `<div class="empty"><div class="ei">◈</div><p>No salary added for ${personName} yet.</p></div>`;
    return;
  }

  const sal = personSals[personSals.length - 1];
  const bonusTotal = getSalaryBonusTotal(sal);
  const calc = calcUKTax(sal.gross || 0, sal.pensionPct || 0, bonusTotal);
  const taxBand = getTaxBand(calc.totalIncome);
  const bonusBreakdown = getSalaryBonuses(sal).length > 1
    ? getSalaryBonuses(sal).map(b =>
      `<div style="font-size:11px;color:var(--muted2);margin-top:4px;">${b.label || 'Bonus'}${b.date ? ' · ' + fmtDate(b.date) : ''}: ${fmt(b.amount)}</div>`
    ).join('') : '';

  el.innerHTML = `
    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Gross salary</div><div class="sal-val val">${fmt(calc.gross)}</div><div class="sal-sub">per year · ${sal.employer || '—'}</div></div>
      <div class="sal-card"><div class="sal-label">Bonus</div><div class="sal-val val">${fmt(calc.bonus)}</div><div class="sal-sub">${getSalaryBonuses(sal).length > 1 ? getSalaryBonuses(sal).length + ' payments' : 'annual'}</div>${bonusBreakdown}</div>
            <div class="sal-card"><div class="sal-label">Total income</div><div class="sal-val val">${fmt(calc.totalIncome)}</div><div class="sal-sub">salary + bonus</div></div>
      ${getTaxCodeCard()}
      <div class="sal-card"><div class="sal-label">Total income</div><div class="sal-val val">${fmt(calc.totalIncome)}</div><div class="sal-sub">salary + bonus</div></div>
      <div class="sal-card"><div class="sal-label">Income tax</div><div class="sal-val neg val">${fmt(calc.incomeTax)}</div><div class="sal-sub">PAYE 2025/26</div></div>
      <div class="sal-card"><div class="sal-label">National Insurance</div><div class="sal-val neg val">${fmt(calc.ni)}</div><div class="sal-sub">employee NI</div></div>
      <div class="sal-card"><div class="sal-label">Pension (yours)</div><div class="sal-val val">${fmt(calc.pensionAmt)}</div><div class="sal-sub">${sal.pensionPct || 0}% of gross</div></div>
      <div class="sal-card border-green"><div class="sal-label">Take-home (annual)</div><div class="sal-val pos val">${fmt(calc.takeHome)}</div><div class="sal-sub">after tax & NI</div></div>
      <div class="sal-card border-green"><div class="sal-label">Take-home (monthly)</div><div class="sal-val pos val">${fmt(calc.takeHomeMonthly)}</div><div class="sal-sub">approximate</div></div>
    </div>

    <div class="tax-band-indicator" style="margin-bottom:16px;padding:12px;border-radius:8px;background:${taxBand.color}15;border:1px solid ${taxBand.color}40;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="band-dot" style="background:${taxBand.color};width:12px;height:12px;border-radius:50%;"></span>
        <span style="font-weight:600;color:${taxBand.color};">Tax band: ${taxBand.name}</span>
        <span style="margin-left:auto;font-size:12px;color:var(--muted2);">${taxBand.rate}% rate on income above ${fmt(taxBand.from)}</span>
      </div>
    </div>

    <div class="grid-2col mb-16">
      <div class="card">
        <div class="card-header"><span class="card-title">UK tax bands 2025/26</span></div>
        <table class="tax-band-table">
          ${UK_TAX.bands.map(b => {
    const from = b.from, to = Math.min(b.to, calc.totalIncome);
    const taxable = Math.max(0, to - from);
    const amt = taxable * b.rate / 100;
    if (calc.totalIncome < b.from) return '';
    return `<tr>
              <td><span class="band-dot" style="background:${b.color};"></span>${b.name}</td>
              <td class="text-sm text-muted">${fmt(b.from)} – ${b.to === Infinity ? 'above' : fmt(b.to)}</td>
              <td class="font-semibold">${b.rate}%</td>
              <td class="font-semibold ${b.rate > 0 ? 'text-muted' : 'text-muted'} val" style="color:${b.rate > 0 ? 'var(--red)' : 'var(--green)'};">${b.rate > 0 ? '-' + fmt(amt) : '✓ Tax-free'}</td>
            </tr>`;
  }).join('')}
        </table>
        ${renderTaxBandsWithGaps(calc)}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Annual breakdown</span></div>
        <div class="sal-chart-wrap"><canvas id="salChart"></canvas></div>
        <div class="sal-chart-labels" id="salChartLabels"></div>
      </div>
    </div>

    <div class="grid-2col mb-16">
      ${renderBenefitsMatrix(personIdx, calc.totalIncome)}
      ${renderFreelanceIncomePanel(personIdx)}
    </div>

    <div class="section-label">Salary timeline · ${S.settings.personNames && S.settings.personNames[personIdx] ? S.settings.personNames[personIdx] : 'Person'}</div>
    ${renderSalaryTimeline(el, personIdx)}

    <div class="section-label">Salary history · ${S.settings.personNames && S.settings.personNames[personIdx] ? S.settings.personNames[personIdx] : 'Person'}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Employer</th><th>Gross</th><th>Bonus</th><th>Take-home/mo</th><th>Pay day</th><th>Perks</th><th>Started</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${personSals.map((s, i) => {
    const c = calcUKTax(s.gross || 0, s.pensionPct || 0, getSalaryBonusTotal(s));
    const payDayLabel = formatSalaryPayDayLabel(s);
    const perksDisplay = s.perks && s.perks.length > 0
      ? s.perks.slice(0, 3).map(p => SALARY_PERKS.find(perk => perk.value === p)?.icon || '').join(' ') + (s.perks.length > 3 ? ` +${s.perks.length - 3}` : '')
      : '—';
    return `<tr>
              <td class="font-semibold">${s.employer || '—'}</td>
              <td class="val">${fmt(s.gross)}</td>
              <td class="val">${formatSalaryBonusSummary(s)}</td>
              <td class="pos val">${fmt(c.takeHomeMonthly)}</td>
              <td class="text-sm">${payDayLabel}</td>
              <td class="text-sm">${perksDisplay}</td>
              <td>${fmtDate(s.startDate)}</td>
              <td><span class="pill ${s.ongoing !== false ? 'p-income' : 'p-payment'}">${s.ongoing !== false ? 'Ongoing' : fmtDate(s.endDate)}</span></td>
              <td>
                <button class="icon-btn edit" onclick="openEditSalary(${S.salaries.indexOf(s)})">✎</button>
                <button class="icon-btn del" onclick="deleteSalary(${S.salaries.indexOf(s)})">✕</button>
              </td>
            </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>
    ${sal.notes ? `<div style="padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);font-size:12px;color:var(--muted2);" class="mb-16">📝 ${sal.notes}</div>` : ''}`;

  setTimeout(() => {
    const ctx = document.getElementById('salChart');
    if (!ctx) return;
    if (window._salChart) window._salChart.destroy();
    const chartParts = [
      { label: 'Take-home', value: Math.round(calc.takeHome), color: '#0a8f5c' },
      { label: 'Income tax', value: Math.round(calc.incomeTax), color: '#cc3333' },
      { label: 'NI', value: Math.round(calc.ni), color: '#1d6fca' },
      { label: 'Pension', value: Math.round(calc.pensionAmt), color: '#034694' },
    ];
    const chartTotal = chartParts.reduce((sum, item) => sum + item.value, 0) || 1;
    window._salChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartParts.map(p => p.label),
        datasets: [{ data: chartParts.map(p => p.value), backgroundColor: chartParts.map(p => p.color), borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '66%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.parsed)} (${((ctx.parsed / chartTotal) * 100).toFixed(1)}%)` } } } }
    });
    const labelEl = document.getElementById('salChartLabels');
    if (labelEl) {
      labelEl.innerHTML = chartParts.map(part => `
        <div class="sal-chart-label">
          <span class="sal-chart-dot" style="background:${part.color};"></span>
          <span>${part.label}</span>
          <strong class="val">${fmt(part.value)}</strong>
          <em>${((part.value / chartTotal) * 100).toFixed(1)}%</em>
        </div>`).join('');
    }
    renderInvoiceList();
  }, 50);
}

function renderHouseholdSalary(el) {
  const hhSals = S.salaries;
  if (!hhSals.length) {
    el.innerHTML = `<div class="empty"><div class="ei">◈</div><p>No salaries added yet.</p></div>`;
    return;
  }

  const totals = { gross: 0, bonus: 0, incomeTax: 0, ni: 0, pensionAmt: 0, slRepayment: 0, takeHome: 0 };
  const breakdowns = [];

  if (S.settings.personNames && S.settings.personNames.length > 0) {
    S.settings.personNames.forEach((p, i) => {
      const personSals = S.salaries.filter(s => (s.person || 0) === i);
      if (!personSals.length) return;
      const sal = personSals[personSals.length - 1];
      const calc = calcUKTax(sal.gross || 0, sal.pensionPct || 0, getSalaryBonusTotal(sal));
      totals.gross += calc.gross;
      totals.bonus += calc.bonus;
      totals.incomeTax += calc.incomeTax;
      totals.ni += calc.ni;
      totals.pensionAmt += calc.pensionAmt;
      totals.slRepayment += calc.slRepayment;
      totals.takeHome += calc.takeHome;
      breakdowns.push({ person: p, calc });
    });
  }

  el.innerHTML = `
    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Combined gross</div><div class="sal-val val">${fmt(totals.gross)}</div><div class="sal-sub">per year</div></div>
      <div class="sal-card"><div class="sal-label">Combined bonus</div><div class="sal-val val">${fmt(totals.bonus)}</div><div class="sal-sub">annual</div></div>
      <div class="sal-card"><div class="sal-label">Combined income</div><div class="sal-val val">${fmt(totals.gross + totals.bonus)}</div><div class="sal-sub">salary + bonus</div></div>
      <div class="sal-card"><div class="sal-label">Income tax</div><div class="sal-val neg val">${fmt(totals.incomeTax)}</div><div class="sal-sub">combined PAYE</div></div>
      <div class="sal-card"><div class="sal-label">National Insurance</div><div class="sal-val neg val">${fmt(totals.ni)}</div><div class="sal-sub">combined NI</div></div>
      <div class="sal-card"><div class="sal-label">Pensions</div><div class="sal-val val">${fmt(totals.pensionAmt)}</div><div class="sal-sub">combined</div></div>
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Combined take-home (annual)</div><div class="sal-val pos val">${fmt(totals.takeHome)}</div><div class="sal-sub">after tax & NI</div></div>
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Combined take-home (monthly)</div><div class="sal-val pos val">${fmt(totals.takeHome / 12)}</div><div class="sal-sub">approximate</div></div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-header"><span class="card-title">Household breakdown</span></div>
      <table class="tax-band-table">
        <thead><tr><th>Person</th><th>Gross</th><th>Take-home/mo</th></tr></thead>
        <tbody>
          ${breakdowns.map(bd => `<tr>
            <td style="font-variation-settings:'wght' 600;">${bd.person}</td>
            <td class="val">${fmt(bd.calc.gross)}</td>
            <td class="pos val">${fmt(bd.calc.takeHomeMonthly)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function toggleHousehold() {
  S.settings.household = document.getElementById('householdToggle').checked;
  save(); renderSalary();
}

function addSalary() {
  const person = parseInt(document.getElementById('salPerson').value) || 0;
  const employer = (document.getElementById('salEmployer').value || '').trim();
  const gross = parseMoney(document.getElementById('salGross').value) || 0;
  const bonuses = readSalaryBonusRows('add');
  const bonus = bonuses.reduce((sum, b) => sum + b.amount, 0);
  const pensionPct = parseFloat(document.getElementById('salPensionPct').value) || 0;
  const employerPension = parseFloat(document.getElementById('salEmployerPension').value) || 0;
  const startDate = document.getElementById('salStartDate').value;
  const ongoing = document.getElementById('salOngoing').checked;
  const endDate = ongoing ? null : (document.getElementById('salEndDate').value || null);
  const notes = document.getElementById('salNotes').value;
  const perks = [...selectedPerks];
  const otherPerkLabel = selectedPerks.includes('other') ? (document.getElementById('salOtherPerk')?.value || '').trim() : '';
  const perksNotes = (document.getElementById('salPerksNotes')?.value || '').trim();
  const payDay = document.getElementById('salPayDay').value;
  const payDayCustom = payDay === 'custom' ? readSalaryPayDayCustom('add') : null;
  if (!gross) { toast('Please enter a gross salary.'); return; }
  if (payDay === 'custom' && !payDayCustom) { toast('Enter a day of the month (1–31) for custom pay day.'); return; }
  S.salaries.push({ person, employer, gross, bonus, bonuses, pensionPct, employerPension, startDate, endDate, ongoing, notes, perks, otherPerkLabel, perksNotes, payDay, payDayCustom });
  selectedPerks = [];
  renderPerksSelector();
  document.getElementById('salEmployer').value = '';
  document.getElementById('salGross').value = '';
  document.getElementById('salPensionPct').value = '';
  document.getElementById('salEmployerPension').value = '';
  document.getElementById('salStartDate').value = '';
  document.getElementById('salEndDate').value = '';
  document.getElementById('salOngoing').checked = true;
  document.getElementById('salNotes').value = '';
  const perksNotesEl = document.getElementById('salPerksNotes');
  if (perksNotesEl) perksNotesEl.value = '';
  document.getElementById('salPayDay').value = '';
  document.getElementById('salPayDayCustom').value = '';
  toggleSalaryOngoing('add');
  toggleSalaryPayDayCustom('add');
  renderSalaryBonusRows('add', []);
  save(); toast('Salary saved'); renderSalary();
}

function deleteSalary(i) {
  const deleted = S.salaries.splice(i, 1)[0];
  window._lastDeletedSalary = { item: deleted, index: i };
  updateUndoButton('salaryUndoBtn', window._lastDeletedSalary);
  save(); renderSalary(); toast('Deleted');
}

function undoLastSalaryDelete() {
  if (!window._lastDeletedSalary) return;
  const { item, index } = window._lastDeletedSalary;
  S.salaries.splice(index, 0, item);
  window._lastDeletedSalary = null;
  updateUndoButton('salaryUndoBtn', null);
  save(); renderSalary(); toast('Restored');
}

function openEditSalary(i) {
  const sal = S.salaries[i];
  editingSalaryIdx = i;
  selectedPerks = sal.perks || [];
  normalizeSalaryRecord(sal);
  const ongoing = sal.ongoing !== false;

  document.getElementById('editSalaryGrid').innerHTML = `
    <div class="ff"><label>Employer</label><input type="text" id="es-employer" value="${sal.employer || ''}"/></div>
    <div class="ff money-field"><label>Gross</label><input type="text" id="es-gross" value="${sal.gross ? sal.gross.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Your pension (%)</label><input type="number" id="es-pension" value="${sal.pensionPct || ''}"/></div>
    <div class="ff"><label>Start date</label><input type="date" id="es-start" value="${sal.startDate || ''}"/></div>
    <div class="ff full-col flex-row" style="align-items:center;gap:10px;margin-top:2px;">
      <label class="cb-row"><input type="checkbox" id="es-ongoing" ${ongoing ? 'checked' : ''} onchange="toggleSalaryOngoing('edit')"> Ongoing (no end date)</label>
    </div>
    <div class="ff${ongoing ? ' is-muted' : ''}" id="esEndDateWrap"><label>End date</label><input type="date" id="es-end" value="${sal.endDate || ''}"/></div>
    <div class="ff full-col">
      <label>Bonuses (optional)</label>
      <div id="esBonusesList" class="sal-bonus-list"></div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="addSalaryBonusRow('edit')">+ Add bonus</button>
    </div>
    <div class="ff full-col">
      <label>Job perks (optional)</label>
      <div id="esPerksContainer" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;"></div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="renderEditPerksSelector()">+ Add perks</button>
    </div>
    <div class="ff full-col"><label>Perks notes</label><input type="text" id="es-perks-notes" value="${escSalaryAttr(sal.perksNotes || '')}" placeholder="e.g. negotiated at annual review" /></div>
    <div class="ff">
      <label>Pay day</label>
      <select id="es-payDay" onchange="toggleSalaryPayDayCustom('edit')">
        <option value="">Select pay day...</option>
        ${PAY_DAY_OPTIONS.map(opt => `<option value="${opt.value}" ${sal.payDay === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
      </select>
    </div>
    <div class="ff${sal.payDay === 'custom' ? '' : ' hidden'}" id="esPayDayCustomWrap">
      <label>Day of month (1–31)</label>
      <input type="number" id="esPayDayCustom" min="1" max="31" value="${sal.payDayCustom || ''}" placeholder="e.g. 28" />
    </div>
    <div class="ff full-col"><label>Notes</label><textarea id="es-notes">${sal.notes || ''}</textarea></div>`;

  renderEditPerksSelector();
  renderSalaryBonusRows('edit', getSalaryBonuses(sal));
  toggleSalaryOngoing('edit');
  toggleSalaryPayDayCustom('edit');
  document.getElementById('editSalaryModal').classList.remove('hidden');
}

function renderEditPerksSelector() {
  const container = document.getElementById('esPerksContainer');
  if (!container) return;
  container.innerHTML = SALARY_PERKS.map(perk => `
    <label class="perk-chip ${selectedPerks.includes(perk.value) ? 'selected' : ''}">
      <input type="checkbox" value="${perk.value}" 
        ${selectedPerks.includes(perk.value) ? 'checked' : ''}
        onchange="togglePerk('${perk.value}', 'edit');">
      <span>${perk.value === 'other' ? perk.label : `${perk.icon} ${perk.label}`}</span>
    </label>
  `).join('') + renderOtherPerkInput('edit', S.salaries[editingSalaryIdx]?.otherPerkLabel || '');
}

function saveEditSalary() {
  if (editingSalaryIdx === null) return;
  const sal = S.salaries[editingSalaryIdx];
  sal.employer = document.getElementById('es-employer').value;
  sal.gross = parseMoney(document.getElementById('es-gross').value) || sal.gross;
  sal.bonuses = readSalaryBonusRows('edit');
  sal.bonus = sal.bonuses.reduce((sum, b) => sum + b.amount, 0);
  sal.pensionPct = parseFloat(document.getElementById('es-pension').value) || 0;
  sal.startDate = document.getElementById('es-start').value;
  sal.ongoing = document.getElementById('es-ongoing').checked;
  sal.endDate = sal.ongoing ? null : (document.getElementById('es-end').value || null);
  sal.notes = document.getElementById('es-notes').value;
  sal.perks = [...selectedPerks];
  sal.otherPerkLabel = selectedPerks.includes('other') ? (document.getElementById('esOtherPerk')?.value || '').trim() : '';
  sal.perksNotes = document.getElementById('es-perks-notes')?.value || '';
  sal.payDay = document.getElementById('es-payDay').value;
  sal.payDayCustom = sal.payDay === 'custom' ? readSalaryPayDayCustom('edit') : null;
  if (sal.payDay === 'custom' && !sal.payDayCustom) { toast('Enter a day of the month (1–31) for custom pay day.'); return; }
  selectedPerks = [];
  save(); closeModal('editSalaryModal'); renderSalary(); toast('Saved');
}

function toggleFreelancerMode() {
  const personIdx = currentPersonIdx;
  const personSals = S.salaries.filter(s => (s.person || 0) === personIdx);
  if (!personSals.length) return;
  const sal = personSals[personSals.length - 1];
  sal.isFreelancer = !sal.isFreelancer;
  save();
  renderSalary();
}

function calcFreelancerTax(revenue, allowableCosts, nationalInsurance, taxYear = '2025/26') {
  // UK Self-employment tax calculation (simplified)
  const profit = Math.max(0, revenue - allowableCosts);
  const smallProfitsThreshold = 1000; // Tax-free allowance
  const taxableProfit = Math.max(0, profit - smallProfitsThreshold);

  // Income tax (simplified - uses basic rate)
  const incomeTax = taxableProfit * 20 / 100;

  // National Insurance (Class 2 + Class 4)
  const class2NI = 163.80; // 2025/26 fixed annual
  const class4Lower = 11908;
  const class4Upper = 50270;
  let class4NI = 0;
  if (taxableProfit > class4Lower) {
    const taxableForClass4 = Math.min(taxableProfit, class4Upper);
    class4NI = (taxableForClass4 - class4Lower) * 9 / 100;
  }
  if (taxableProfit > class4Upper) {
    class4NI += (taxableProfit - class4Upper) * 2 / 100;
  }
  const totalNI = class2NI + class4NI + (nationalInsurance || 0);

  // Quarterly tax threshold
  const quarterlyThreshold = 1000;
  const needsToPayQuarterly = taxableProfit > quarterlyThreshold;
  const quarterlyAmount = needsToPayQuarterly ? taxableProfit / 4 : 0;

  return {
    revenue, allowableCosts, profit, taxableProfit, incomeTax, class2NI, class4NI, totalNI,
    takeHome: profit - incomeTax - totalNI,
    takeHomeMonthly: (profit - incomeTax - totalNI) / 12,
    quarterlyThreshold, needsToPayQuarterly, quarterlyAmount,
    nextTaxPaymentDue: getNextTaxPaymentDate()
  };
}

function getNextTaxPaymentDate() {
  const today = new Date();
  const taxYear = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
  // Quarterly payments: Jan 31, Apr 30, Jul 31, Oct 31
  const quarters = [
    new Date(taxYear, 0, 31),
    new Date(taxYear, 3, 30),
    new Date(taxYear, 6, 31),
    new Date(taxYear, 9, 31)
  ];
  for (let q of quarters) {
    if (q > today) return q.toISOString().split('T')[0];
  }
  return new Date(taxYear + 1, 0, 31).toISOString().split('T')[0];
}

function renderSalaryTimeline(el, personIdx) {
  const personSals = S.salaries.filter(s => (s.person || 0) === personIdx).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (!personSals.length) return '';
  const grouped = [];
  let currentGroup = { employer: null, salaries: [] };
  const maxSalary = Math.max(...personSals.map(s => Number(s.gross || 0)), 1);

  personSals.forEach(sal => {
    if (sal.employer === currentGroup.employer) {
      currentGroup.salaries.push(sal);
    } else {
      if (currentGroup.employer) grouped.push(currentGroup);
      currentGroup = { employer: sal.employer, salaries: [sal] };
    }
  });
  if (currentGroup.employer) grouped.push(currentGroup);

  return `<div class="salary-timeline-v2">
    ${grouped.map((group, idx) => {
    const salaries = group.salaries;
    const startDate = new Date(salaries[0].startDate);
    const endDate = salaries[salaries.length - 1].endDate ? new Date(salaries[salaries.length - 1].endDate) : null;
    const years = endDate ? Math.max(0.1, (endDate - startDate) / 31557600000) : null;
    const duration = years ? `${years.toFixed(years >= 10 ? 0 : 1)} yr${years >= 1.5 ? 's' : ''}` : 'Ongoing';
    const first = salaries[0];
    const latest = salaries[salaries.length - 1];
    const latestCalc = calcUKTax(latest.gross || 0, latest.pensionPct || 0, getSalaryBonusTotal(latest));
    const delta = salaries.length > 1 ? Number(latest.gross || 0) - Number(first.gross || 0) : 0;
    const deltaPct = first.gross ? (delta / first.gross) * 100 : 0;

    return `
      <article class="salary-timeline-group ${idx === grouped.length - 1 ? 'is-last' : ''}">
        <div class="salary-timeline-marker">
          <span>${String(startDate.getFullYear()).slice(-2)}</span>
        </div>
        <div class="salary-timeline-card">
          <div class="salary-timeline-head">
            <div>
              <h4>${escSalaryText(group.employer || 'Unknown employer')}</h4>
              <p>${fmtDate(first.startDate)} - ${latest.ongoing !== false ? 'Now' : fmtDate(latest.endDate)} · ${duration}</p>
            </div>
            <div class="salary-timeline-current">
              <span>Current take-home</span>
              <strong class="val">${fmt(latestCalc.takeHomeMonthly)}/mo</strong>
            </div>
          </div>
          <div class="salary-timeline-meta">
            <span>${salaries.length} salary event${salaries.length !== 1 ? 's' : ''}</span>
            <span class="${delta >= 0 ? 'pos' : 'neg'}">${delta ? `${delta > 0 ? '+' : ''}${fmt(delta)} (${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%)` : 'Baseline'}</span>
            <span>${formatSalaryPayDayLabel(latest)}</span>
          </div>
          <div class="salary-event-list">
            ${salaries.map((s) => {
      const calc = calcUKTax(s.gross || 0, s.pensionPct || 0, getSalaryBonusTotal(s));
      const width = Math.max(8, (Number(s.gross || 0) / maxSalary) * 100);
      return `
              <div class="salary-event-row">
                <div class="salary-event-date">${fmtDate(s.startDate)}</div>
                <div class="salary-event-main">
                  <div class="salary-event-bar"><span style="width:${width.toFixed(1)}%;"></span></div>
                  <div class="salary-event-caption">
                    <strong class="val">${fmt(s.gross)}</strong>
                    <span>${getSalaryBonusTotal(s) ? `Bonus ${fmt(getSalaryBonusTotal(s))}` : 'No bonus logged'}</span>
                  </div>
                </div>
                <div class="salary-event-takehome val">${fmt(calc.takeHomeMonthly)}/mo</div>
              </div>`;
    }).join('')}
          </div>
          ${latest.notes ? `<div class="salary-timeline-note">${escSalaryText(latest.notes)}</div>` : ''}
        </div>
      </article>`;
  }).join('')}
  </div>`;
}

function escSalaryText(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


function renderSalaryChartWithLabels(calc) {
  setTimeout(() => {
    const ctx = document.getElementById('salChart');
    if (!ctx) return;
    if (window._salChart) window._salChart.destroy();

    const data = [Math.round(calc.takeHome), Math.round(calc.incomeTax), Math.round(calc.ni), Math.round(calc.pensionAmt)];
    const labels = ['Take-home', 'Income tax', 'NI', 'Pension'];
    const colors = ['#0a8f5c', '#cc3333', '#1d6fca', '#5046e5'];

    window._salChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 10, padding: 10 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const value = ctx.parsed;
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((value / total) * 100).toFixed(1);
                return `£${fmt(value)} (${pct}%)`;
              }
            }
          },
          datalabels: {
            color: 'white',
            font: { weight: 'bold', size: 12 },
            formatter: (value, ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((value / total) * 100).toFixed(0);
              return pct > 5 ? pct + '%' : '';
            }
          }
        }
      }
    });
  }, 50);
}

const UK_TAX_2026 = {
  personalAllowance: 12570, // Frozen (estimated)
  bands: [
    { name: 'Personal allowance', from: 0, to: 12570, rate: 0, color: '#0a8f5c' },
    { name: 'Basic rate (20%)', from: 12570, to: 50270, rate: 20, color: '#1d6fca' },
    { name: 'Higher rate (40%)', from: 50270, to: 125140, rate: 40, color: '#b87309' },
    { name: 'Additional (45%)', from: 125140, to: Infinity, rate: 45, color: '#cc3333' },
  ]
};

function renderNextYearPreview(calc) {
  // Only show if rates confirmed (hardcoded flag)
  const showPreview = true; // Set to true when rates confirmed from gov.uk

  if (!showPreview) return '';

  const nextYearCalc = calcUKTax(calc.gross, 0, calc.bonus);
  const difference = calc.takeHome - nextYearCalc.takeHome;
  const pctChange = ((difference / calc.takeHome) * 100).toFixed(1);

  return `
    <div style="background:linear-gradient(135deg, var(--surface2) 0%, var(--surface) 100%);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin:14px 0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:20px;">ℹ️</span>
        <strong style="font-size:13px;">2026/27 Tax Projection</strong>
        <a href="https://www.gov.uk/government/organisations/hm-revenue-customs" target="_blank" style="font-size:11px;color:var(--blue);margin-left:auto;">Source: HMRC</a>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;">
        <div>
          <div style="color:var(--muted);margin-bottom:4px;">Current (2025/26)</div>
          <div style="font-size:16px;font-variation-settings:'wght' 600;color:var(--green);">£${fmt(calc.takeHomeMonthly)}/mo</div>
        </div>
        <div>
          <div style="color:var(--muted);margin-bottom:4px;">Projected (2026/27)</div>
          <div style="font-size:16px;font-variation-settings:'wght' 600;color:${difference > 0 ? 'var(--green)' : 'var(--red)'};"><span style="font-size:12px;">${difference > 0 ? '+' : ''}${pctChange}%</span> £${fmt(nextYearCalc.takeHomeMonthly)}/mo</div>
        </div>
      </div>
    </div>
  `;
}

function renderTaxBandsWithGaps(calc) {
  // Show bands user doesn't hit, with salary needed to reach them
  const gapBands = UK_TAX.bands.filter(b => b.from >= calc.totalIncome);

  if (!gapBands.length) return '';

  return `
    <div class="tax-gap-panel">
      <details>
        <summary>Tax bands not reached yet</summary>
        <div class="tax-gap-list">
          ${gapBands.map(b => {
    const needed = b.from - calc.totalIncome;
    return `
            <div class="tax-gap-row">
              <span><i style="background:${b.color};"></i>${b.name}</span>
              <strong class="val">+${fmt(needed)}</strong>
            </div>
            `;
  }).join('')}
        </div>
      </details>
    </div>
  `;
}

function renderBenefitsMatrix(personIdx, grossSalary) {
  const partnerSalary = (S.salaries || [])
    .filter(s => (s.person || 0) !== personIdx)
    .map(s => Number(s.gross || 0))
    .sort((a, b) => b - a)[0] || 0;
  const adjusted = grossSalary;
  const rows = [
    {
      label: 'Child Benefit',
      status: adjusted <= 60000 ? 'Clear' : adjusted < 80000 ? 'Tapered' : 'Clawback',
      detail: adjusted <= 60000 ? 'No high-income charge indicated.' : adjusted < 80000 ? `${fmt(adjusted - 60000)} into taper band.` : 'Likely fully clawed back.',
    },
    {
      label: 'Marriage Allowance',
      status: partnerSalary < 12570 && adjusted <= 50270 ? 'Potential' : 'Unlikely',
      detail: partnerSalary < 12570 ? 'Partner appears below personal allowance.' : 'Partner income may use their own allowance.',
    },
    {
      label: 'Adjusted Net Income',
      status: adjusted > 100000 ? 'Watch' : 'OK',
      detail: adjusted > 100000 ? `${fmt(adjusted - 100000)} above personal allowance taper start.` : `${fmt(100000 - adjusted)} before taper starts.`,
    },
  ];
  return `<div class="card benefits-matrix">
    <div class="card-header"><span class="card-title">Benefits & allowances</span></div>
    ${rows.map(row => `<div class="benefit-row">
      <div><strong>${row.label}</strong><span>${row.detail}</span></div>
      <em class="${row.status === 'OK' || row.status === 'Clear' || row.status === 'Potential' ? 'pos' : row.status === 'Watch' || row.status === 'Tapered' ? 'warn' : 'neg'}">${row.status}</em>
    </div>`).join('')}
  </div>`;
}

function renderFreelanceIncomePanel(personIdx) {
  initInvoiceSystem();
  const invoices = (S.invoices || []).filter(inv => inv.person === personIdx);
  const paid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const threshold = UK_TAX.bands.find(b => b.rate === 40)?.from || 50270;
  const paidByDate = invoices
    .filter(inv => inv.status === 'paid')
    .sort((a, b) => new Date(a.paymentDate || a.dueDate || a.issueDate || a.createdDate) - new Date(b.paymentDate || b.dueDate || b.issueDate || b.createdDate));
  let running = 0;
  const crossing = paidByDate.find(inv => {
    running += Number(inv.amount || 0);
    return running >= threshold;
  });
  return `<div class="card freelance-panel">
    <div class="card-header"><span class="card-title">Freelance invoices</span></div>
    <div class="freelance-form">
      <input id="invNumber" placeholder="Invoice #" />
      <input id="invPO" placeholder="PO number" />
      <input id="invClient" placeholder="Client" />
      <input id="invAmount" placeholder="Amount" oninput="formatMoney(this)" />
      <input id="invIssueDate" type="date" />
      <input id="invDueDate" type="date" />
      <input id="invPaymentDate" type="date" />
      <select id="invStatus"><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select>
      <input id="invNotes" placeholder="Notes" />
      <button class="btn btn-primary btn-sm" onclick="addInvoice()">Log</button>
    </div>
    <div class="freelance-summary">
      <span>Total paid <strong class="val">${fmt(paid)}</strong></span>
      <span>${crossing ? `Higher-rate threshold crossed by ${fmtDate(crossing.paymentDate || crossing.dueDate || crossing.issueDate)}` : `${fmt(Math.max(0, threshold - paid))} to higher-rate threshold`}</span>
    </div>
    <div id="invoiceList"></div>
  </div>`;
}

function checkTaxAllowances(personIdx, grossSalary) {
  const allowances = {};

  // Marriage Allowance (up to £3,522 transfer)
  // Eligible: earning £12,570-£50,270, partner earning less than £12,570
  allowances.marriageAllowance = {
    eligible: grossSalary >= 12570 && grossSalary <= 50270,
    description: 'Transfer unused allowance to spouse',
    maxBenefit: 3522 * 20 / 100, // £704.40
    impact: 704.40
  };

  // Child Benefit eligibility
  // Reduced if either parent earns over £50,000
  allowances.childBenefit = {
    eligible: grossSalary <= 50000,
    description: 'Receive child benefit without clawback',
    impactIf50k: 845 * 20 / 100, // Approx tax on clawback
    impact: grossSalary > 50000 ? -(grossSalary - 50000) * 1 / 100 : 0
  };

  // Personal Savings Allowance
  const savingsAllowance = grossSalary < 17570 ? 1000 : (grossSalary < 50270 ? 500 : 0);
  allowances.savingsAllowance = {
    eligible: savingsAllowance > 0,
    description: `Interest-free threshold: £${savingsAllowance}`,
    benefit: savingsAllowance * 20 / 100,
    impact: savingsAllowance * 20 / 100
  };

  return allowances;
}

function renderAllowancesInfo(personIdx, grossSalary) {
  const allowances = checkTaxAllowances(personIdx, grossSalary);

  let html = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;">
    <strong style="font-size:12px;display:block;margin-bottom:10px;">💡 Available tax allowances</strong>
  `;

  Object.entries(allowances).forEach(([key, alloc]) => {
    if (!alloc.eligible) return;
    html += `
      <div style="padding:8px;background:var(--surface);border-radius:4px;margin-bottom:6px;font-size:11px;">
        <div style="font-variation-settings:'wght' 600;">${alloc.description}</div>
        <div style="color:var(--green);margin-top:2px;">Potential benefit: +£${fmt(alloc.impact)}/year</div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}



function initInvoiceSystem() {
  if (!S.invoices) S.invoices = [];
}

function addInvoice() {
  initInvoiceSystem();
  const personIdx = currentPersonIdx;
  const invoiceNum = (document.getElementById('invNumber').value || '').trim();
  const poRef = (document.getElementById('invPO').value || '').trim();
  const client = (document.getElementById('invClient').value || '').trim();
  const amount = parseMoney(document.getElementById('invAmount').value) || 0;
  const issueDate = document.getElementById('invIssueDate').value;
  const dueDate = document.getElementById('invDueDate').value;
  const paymentDate = document.getElementById('invPaymentDate').value;
  const status = document.getElementById('invStatus').value || 'unpaid';
  const notes = (document.getElementById('invNotes').value || '').trim();

  if (!invoiceNum || !amount) { toast('Invoice number and amount required'); return; }

  S.invoices.push({
    person: personIdx,
    invoiceNum,
    poRef,
    client,
    amount,
    issueDate,
    dueDate,
    paymentDate,
    status,
    notes,
    createdDate: new Date().toISOString().split('T')[0]
  });

  save();
  toast('Invoice recorded');
  document.getElementById('invNumber').value = '';
  document.getElementById('invPO').value = '';
  document.getElementById('invClient').value = '';
  document.getElementById('invAmount').value = '';
  document.getElementById('invIssueDate').value = '';
  document.getElementById('invDueDate').value = '';
  document.getElementById('invPaymentDate').value = '';
  document.getElementById('invNotes').value = '';
  document.getElementById('invStatus').value = 'unpaid';
  renderInvoiceList();
}

function renderInvoiceList() {
  initInvoiceSystem();
  const personIdx = currentPersonIdx;
  const personInvoices = (S.invoices || [])
    .map((invoice, originalIndex) => ({ ...invoice, originalIndex }))
    .filter(i => i.person === personIdx)
    .sort((a, b) => new Date(b.paymentDate || b.dueDate || b.createdDate) - new Date(a.paymentDate || a.dueDate || a.createdDate));

  if (!personInvoices.length) {
    document.getElementById('invoiceList').innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No invoices recorded</div>';
    return;
  }

  let cumulativeTotal = 0;
  let paidTotal = 0;
  const rows = personInvoices.map((inv, idx) => {
    cumulativeTotal += inv.amount;
    if (inv.status === 'paid') paidTotal += inv.amount;

    const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status === 'unpaid';
    const isPaid = inv.status === 'paid';

    return `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:10px;font-variation-settings:'wght' 600;">${inv.invoiceNum}</td>
        <td style="padding:10px;">${inv.client || inv.poRef || '—'}</td>
        <td style="padding:10px;text-align:right;color:var(--green);">${fmt(inv.amount)}</td>
        <td style="padding:10px;font-size:12px;color:var(--muted);">${fmtDate(inv.paymentDate || inv.dueDate || inv.issueDate)}</td>
        <td style="padding:10px;"><span class="pill ${isPaid ? 'p-income' : isOverdue ? 'p-payment' : 'p-warn'}" style="font-size:11px;">${inv.status}${isOverdue ? ' (overdue)' : ''}</span></td>
        <td style="padding:10px;text-align:right;font-variation-settings:'wght' 600;">${fmt(cumulativeTotal)}</td>
        <td style="padding:10px;"><button class="icon-btn" onclick="toggleInvoiceStatus(${inv.originalIndex})" title="Toggle paid/unpaid">${isPaid ? '✓' : '✕'}</button></td>
      </tr>
    `;
  }).join('');

  const pendingTotal = cumulativeTotal - paidTotal;
  const html = `
    <div style="margin-bottom:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
      <div class="sal-card">
        <div class="sal-label">Total invoiced</div>
        <div class="sal-val val">${fmt(cumulativeTotal)}</div>
        <div class="sal-sub">all time</div>
      </div>
      <div class="sal-card" style="border-color:var(--green);">
        <div class="sal-label">Paid</div>
        <div class="sal-val pos val">${fmt(paidTotal)}</div>
        <div class="sal-sub">${personInvoices.filter(i => i.status === 'paid').length} invoices</div>
      </div>
      <div class="sal-card" style="border-color:var(--orange);">
        <div class="sal-label">Pending</div>
        <div class="sal-val val">${fmt(pendingTotal)}</div>
        <div class="sal-sub">${personInvoices.filter(i => i.status !== 'paid').length} unpaid</div>
      </div>
    </div>
    <div class="table-wrap">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:2px solid var(--border);">
          <th style="padding:10px;text-align:left;">Invoice</th>
          <th style="padding:10px;text-align:left;">Client / PO</th>
          <th style="padding:10px;text-align:right;">Amount</th>
          <th style="padding:10px;text-align:left;">Cash date</th>
          <th style="padding:10px;text-align:left;">Status</th>
          <th style="padding:10px;text-align:right;">Cumulative</th>
          <th style="padding:10px;"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  document.getElementById('invoiceList').innerHTML = html;
}

function toggleInvoiceStatus(idx) {
  initInvoiceSystem();
  const invoice = S.invoices[idx];
  invoice.status = invoice.status === 'paid' ? 'unpaid' : 'paid';
  save();
  renderInvoiceList();
  toast(`Invoice marked as ${invoice.status}`);
}

function deleteInvoice(idx) {
  initInvoiceSystem();
  if (confirm('Delete this invoice record?')) {
    S.invoices.splice(idx, 1);
    save();
    renderInvoiceList();
    toast('Invoice deleted');
  }
}
