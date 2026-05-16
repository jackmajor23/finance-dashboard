// ── Salary & UK tax ──────────────────────────────────
// JS: SALARY (UK tax calculation)
// ═══════════════════════════════════════════════════

function calcUKTax(gross, pensionPct, bonus, studentLoanPlan) {
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
        onchange="togglePerk('${perk.value}')">
      <span>${perk.icon} ${perk.label}</span>
    </label>
  `).join('');
}

function togglePerk(perkValue) {
  const index = selectedPerks.indexOf(perkValue);
  if (index > -1) {
    selectedPerks.splice(index, 1);
  } else {
    selectedPerks.push(perkValue);
  }
  renderPerksSelector();
}

function populatePayDayOptions() {
  const select = document.getElementById('salPayDay');
  select.innerHTML = '<option value="">Select pay day...</option>' +
    PAY_DAY_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
}

function renderSalary() {
  // Populate person dropdown
  const personSel = document.getElementById('salPerson');
  personSel.innerHTML = S.settings.personNames.map((p, i) => `<option value="${i}">${p}</option>`).join('');
  personSel.value = currentPersonIdx;

  // Populate pay day options
  populatePayDayOptions();

  // Reset perks selection
  selectedPerks = [];
  renderPerksSelector();

  // Render person tabs
  const tabsEl = document.getElementById('personTabs');
  const allPeople = [...S.settings.personNames];
  if (allPeople.length > 1) allPeople.push('Household');

  if (allPeople.length > 1) {
    tabsEl.innerHTML = allPeople.map((p, i) => {
      const isHousehold = i === allPeople.length - 1;
      return `<button class="person-btn ${currentPersonIdx === i ? 'active' : ''}" onclick="switchPerson(${i})">${isHousehold ? '📊 ' + p : p}</button>`;
    }).join('');
  } else { tabsEl.innerHTML = ''; currentPersonIdx = 0; }

  // Get content based on current view
  const el = document.getElementById('salaryContent');
  const isHousehold = S.settings.personNames.length > 1 && currentPersonIdx === S.settings.personNames.length;

  if (isHousehold) {
    renderHouseholdSalary(el);
  } else {
    renderPersonSalary(el, currentPersonIdx);
  }
}

function switchPerson(idx) {
  currentPersonIdx = idx;
  renderSalary();
}

function renderSalaryTimeline(personSals, personIdx) {
  if (!personSals || personSals.length === 0) {
    return '<div class="empty" style="margin-bottom:16px;"><div class="ei">◈</div><p>No salary history to display.</p></div>';
  }

  // Sort salaries by start date
  const sortedSals = [...personSals].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Calculate salary changes
  const timelineData = sortedSals.map((sal, index) => {
    const prevSal = index > 0 ? sortedSals[index - 1] : null;
    const change = prevSal ? sal.gross - prevSal.gross : 0;
    const changePct = prevSal && prevSal.gross > 0 ? ((sal.gross - prevSal.gross) / prevSal.gross * 100) : 0;
    const calc = calcUKTax(sal.gross || 0, sal.pensionPct || 0, sal.bonus || 0, 'none');

    return {
      ...sal,
      calc,
      change,
      changePct,
      isIncrease: change > 0,
      isFirst: index === 0
    };
  });

  // Find max salary for scaling
  const maxSalary = Math.max(...timelineData.map(s => s.gross));

  return `
    <div class="salary-timeline" style="margin-bottom:24px;">
      <div class="timeline-container">
        ${timelineData.map((item, index) => {
    const barWidth = (item.gross / maxSalary) * 100;
    const changeBadge = !item.isFirst ? `
            <span class="timeline-change ${item.isIncrease ? 'increase' : 'decrease'}">
              ${item.isIncrease ? '↑' : '↓'} ${fmt(Math.abs(item.change))} (${item.changePct.toFixed(1)}%)
            </span>
          ` : '<span class="timeline-change neutral">Start</span>';

    return `
            <div class="timeline-item">
              <div class="timeline-date">
                <div class="timeline-year">${new Date(item.startDate).getFullYear()}</div>
                <div class="timeline-month">${new Date(item.startDate).toLocaleDateString('en-GB', { month: 'short' })}</div>
              </div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <div class="timeline-employer">${item.employer || '—'}</div>
                  ${changeBadge}
                </div>
                <div class="timeline-salary-bar">
                  <div class="timeline-bar-fill" style="width: ${barWidth}%;"></div>
                  <div class="timeline-salary-amount">${fmt(item.gross)}</div>
                </div>
                <div class="timeline-details">
                  <span class="timeline-detail">Take-home: <strong class="pos">${fmt(item.calc.takeHomeMonthly)}/mo</strong></span>
                  ${item.bonus ? `<span class="timeline-detail">Bonus: <strong>${fmt(item.bonus)}</strong></span>` : ''}
                  <span class="timeline-detail">Pension: <strong>${item.pensionPct || 0}%</strong></span>
                </div>
                ${item.notes ? `<div class="timeline-notes">📝 ${item.notes}</div>` : ''}
              </div>
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;
}

function renderPersonSalary(el, personIdx) {
  const personSals = S.salaries.filter(s => (s.person || 0) === personIdx);

  if (!personSals.length) {
    el.innerHTML = `<div class="empty"><div class="ei">◈</div><p>No salary added for ${S.settings.personNames[personIdx]} yet.</p></div>`;
    return;
  }

  const sal = personSals[personSals.length - 1];
  const calc = calcUKTax(sal.gross || 0, sal.pensionPct || 0, sal.bonus || 0, 'none');
  const taxBand = getTaxBand(calc.totalIncome);

  el.innerHTML = `
    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Gross salary</div><div class="sal-val val">${fmt(calc.gross)}</div><div class="sal-sub">per year · ${sal.employer || '—'}</div></div>
      <div class="sal-card"><div class="sal-label">Bonus</div><div class="sal-val val">${fmt(calc.bonus)}</div><div class="sal-sub">annual</div></div>
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
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Annual breakdown</span></div>
        <div class="sal-chart-wrap"><canvas id="salChart"></canvas></div>
      </div>
    </div>

    <div class="section-label">Salary timeline · ${S.settings.personNames[personIdx]}</div>
    ${renderSalaryTimeline(personSals, personIdx)}

    <div class="section-label">Salary history · ${S.settings.personNames[personIdx]}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Employer</th><th>Gross</th><th>Bonus</th><th>Take-home/mo</th><th>Pay day</th><th>Perks</th><th>Started</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${personSals.map((s, i) => {
    const c = calcUKTax(s.gross || 0, s.pensionPct || 0, s.bonus || 0, 'none');
    const payDayLabel = s.payDay ? PAY_DAY_OPTIONS.find(o => o.value === s.payDay)?.label || s.payDay : '—';
    const perksDisplay = s.perks && s.perks.length > 0
      ? s.perks.slice(0, 3).map(p => SALARY_PERKS.find(perk => perk.value === p)?.icon || '').join(' ') + (s.perks.length > 3 ? ` +${s.perks.length - 3}` : '')
      : '—';
    return `<tr>
              <td class="font-semibold">${s.employer || '—'}</td>
              <td class="val">${fmt(s.gross)}</td>
              <td class="val">${s.bonus ? fmt(s.bonus) : '—'}</td>
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
    window._salChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Take-home', 'Income tax', 'NI', 'Pension'],
        datasets: [{ data: [Math.round(calc.takeHome), Math.round(calc.incomeTax), Math.round(calc.ni), Math.round(calc.pensionAmt)], backgroundColor: ['#0a8f5c', '#cc3333', '#1d6fca', '#5046e5'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 10, padding: 10 } }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed) } } } }
    });
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

  S.settings.personNames.forEach((p, i) => {
    const personSals = S.salaries.filter(s => (s.person || 0) === i);
    if (!personSals.length) return;
    const sal = personSals[personSals.length - 1];
    const calc = calcUKTax(sal.gross || 0, sal.pensionPct || 0, sal.bonus || 0, 'none');
    totals.gross += calc.gross;
    totals.bonus += calc.bonus;
    totals.incomeTax += calc.incomeTax;
    totals.ni += calc.ni;
    totals.pensionAmt += calc.pensionAmt;
    totals.slRepayment += calc.slRepayment;
    totals.takeHome += calc.takeHome;
    breakdowns.push({ person: p, calc });
  });

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
  const bonus = parseMoney(document.getElementById('salBonus').value) || 0;
  const pensionPct = parseFloat(document.getElementById('salPensionPct').value) || 0;
  const employerPension = parseFloat(document.getElementById('salEmployerPension').value) || 0;
  const startDate = document.getElementById('salStartDate').value;
  const ongoing = document.getElementById('salOngoing').checked;
  const endDate = ongoing ? null : document.getElementById('salEndDate').value;
  const notes = document.getElementById('salNotes').value;
  const perks = [...selectedPerks];
  const payDay = document.getElementById('salPayDay').value;
  if (!gross) { toast('Please enter a gross salary.'); return; }
  S.salaries.push({ person, employer, gross, bonus, pensionPct, employerPension, startDate, endDate, ongoing, notes, perks, payDay });
  selectedPerks = [];
  renderPerksSelector();
  document.getElementById('salPayDay').value = '';
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

  document.getElementById('editSalaryGrid').innerHTML = `
    <div class="ff"><label>Employer</label><input type="text" id="es-employer" value="${sal.employer || ''}"/></div>
    <div class="ff money-field"><label>Gross</label><input type="text" id="es-gross" value="${sal.gross ? sal.gross.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Bonus</label><input type="text" id="es-bonus" value="${sal.bonus ? sal.bonus.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Your pension (%)</label><input type="number" id="es-pension" value="${sal.pensionPct || ''}"/></div>
    <div class="ff"><label>Start date</label><input type="date" id="es-start" value="${sal.startDate || ''}"/></div>
    <div class="ff full-col">
      <label>Job perks (optional)</label>
      <div id="esPerksContainer" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;"></div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="renderEditPerksSelector()">+ Add perks</button>
    </div>
    <div class="ff">
      <label>Pay day</label>
      <select id="es-payDay">
        <option value="">Select pay day...</option>
        ${PAY_DAY_OPTIONS.map(opt => `<option value="${opt.value}" ${sal.payDay === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
      </select>
    </div>
    <div class="ff full-col"><label>Notes</label><textarea id="es-notes">${sal.notes || ''}</textarea></div>`;

  renderEditPerksSelector();
  document.getElementById('editSalaryModal').classList.remove('hidden');
}

function renderEditPerksSelector() {
  const container = document.getElementById('esPerksContainer');
  if (!container) return;
  container.innerHTML = SALARY_PERKS.map(perk => `
    <label class="perk-chip ${selectedPerks.includes(perk.value) ? 'selected' : ''}">
      <input type="checkbox" value="${perk.value}" 
        ${selectedPerks.includes(perk.value) ? 'checked' : ''}
        onchange="togglePerk('${perk.value}'); renderEditPerksSelector();">
      <span>${perk.icon} ${perk.label}</span>
    </label>
  `).join('');
}

function saveEditSalary() {
  if (editingSalaryIdx === null) return;
  const sal = S.salaries[editingSalaryIdx];
  sal.employer = document.getElementById('es-employer').value;
  sal.gross = parseMoney(document.getElementById('es-gross').value) || sal.gross;
  sal.bonus = parseMoney(document.getElementById('es-bonus').value) || 0;
  sal.pensionPct = parseFloat(document.getElementById('es-pension').value) || 0;
  sal.startDate = document.getElementById('es-start').value;
  sal.notes = document.getElementById('es-notes').value;
  sal.perks = [...selectedPerks];
  sal.payDay = document.getElementById('es-payDay').value;
  selectedPerks = [];
  save(); closeModal('editSalaryModal'); renderSalary(); toast('Saved');
}
