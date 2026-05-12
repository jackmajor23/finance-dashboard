// ── Properties ───────────────────────────────────────
// JS: PROPERTIES (UK property tracker)
// ═══════════════════════════════════════════════════

const PROPERTY_TYPES = [
  { value: 'residential',  label: 'Residential (Main Home)' },
  { value: 'buy-to-let',   label: 'Buy-to-Let' },
  { value: 'holiday-let',  label: 'Holiday Let' },
  { value: 'commercial',   label: 'Commercial' },
  { value: 'land',         label: 'Land / Plot' },
];

const MORTGAGE_TYPES = [
  { value: 'repayment',      label: 'Repayment' },
  { value: 'interest-only',  label: 'Interest Only' },
  { value: 'none',           label: 'No Mortgage' },
];

const TENURE_TYPES = [
  { value: 'freehold',   label: 'Freehold' },
  { value: 'leasehold',  label: 'Leasehold' },
  { value: 'share',      label: 'Share of Freehold' },
];

let editingPropertyIdx = null;
let currentPropPersonIdx = 0;

// ─── Calculations ─────────────────────────────────────────────────

function calcSDLT(price, isAdditional = false) {
  // SDLT bands England & NI 2025/26
  const standard = [
    { from: 0,        to: 250000,   rate: 0  },
    { from: 250000,   to: 925000,   rate: 5  },
    { from: 925000,   to: 1500000,  rate: 10 },
    { from: 1500000,  to: Infinity, rate: 12 },
  ];
  const additional = [
    { from: 0,        to: 125000,   rate: 5  },
    { from: 125000,   to: 250000,   rate: 7  },
    { from: 250000,   to: 925000,   rate: 10 },
    { from: 925000,   to: 1500000,  rate: 15 },
    { from: 1500000,  to: Infinity, rate: 17 },
  ];
  const bands = isAdditional ? additional : standard;
  let sdlt = 0;
  bands.forEach(b => {
    if (price > b.from) {
      sdlt += (Math.min(price, b.to === Infinity ? price : b.to) - b.from) * b.rate / 100;
    }
  });
  return Math.round(sdlt);
}

function calcMortgageMonthly(principal, annualRate, termYears) {
  if (!principal || !annualRate || !termYears) return 0;
  const r = (annualRate / 100) / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

function calcPropertyMetrics(prop) {
  const purchasePrice  = prop.purchasePrice  || 0;
  const depositAmount  = prop.depositAmount  || 0;
  const depositPct     = purchasePrice > 0 ? (depositAmount / purchasePrice) * 100 : 0;
  const estValue       = prop.estValue       || purchasePrice;
  const mortgageBalance = prop.mortgageBalance || 0;
  const equity         = estValue - mortgageBalance;
  const equityPct      = estValue > 0 ? (equity / estValue) * 100 : 0;
  const capitalGain    = estValue - purchasePrice;
  const capitalGainPct = purchasePrice > 0 ? (capitalGain / purchasePrice) * 100 : 0;
  const ltv            = estValue > 0 ? (mortgageBalance / estValue) * 100 : 0;
  const rentalMonthly  = prop.rentalMonthly  || 0;
  const rentalAnnual   = rentalMonthly * 12;
  const mortgageMonthly = prop.mortgageMonthly || 0;
  const rentalYield    = estValue > 0 && rentalAnnual > 0 ? (rentalAnnual / estValue) * 100 : 0;
  const netRentalMonthly = rentalMonthly - mortgageMonthly;
  const isAdditional   = prop.type === 'buy-to-let' || prop.type === 'holiday-let' || prop.type === 'commercial';
  const sdlt           = calcSDLT(purchasePrice, isAdditional);

  // Remaining mortgage term in years from end date
  let remainingYears = null;
  if (prop.mortgageEndDate) {
    const end = new Date(prop.mortgageEndDate);
    const now = new Date();
    remainingYears = Math.max(0, ((end - now) / (1000 * 60 * 60 * 24 * 365.25)));
  }

  return {
    purchasePrice, depositAmount, depositPct, estValue,
    mortgageBalance, equity, equityPct, capitalGain, capitalGainPct,
    ltv, rentalMonthly, rentalAnnual, mortgageMonthly, rentalYield,
    netRentalMonthly, sdlt, remainingYears,
  };
}

// ─── Render: main entry ───────────────────────────────────────────

function renderProperties() {
  if (!S.properties) S.properties = [];

  const tabsEl = document.getElementById('propPersonTabs');
  const allPeople = [...S.settings.personNames];
  const showHousehold = allPeople.length > 1;
  if (showHousehold) allPeople.push('Household');

  if (showHousehold) {
    tabsEl.innerHTML = allPeople.map((p, i) => {
      const isHH = i === allPeople.length - 1;
      return `<button class="person-btn ${currentPropPersonIdx === i ? 'active' : ''}" onclick="switchPropPerson(${i})">${isHH ? '📊 ' + p : p}</button>`;
    }).join('');
  } else {
    tabsEl.innerHTML = '';
    currentPropPersonIdx = 0;
  }

  const el = document.getElementById('propertiesContent');
  const isHH = showHousehold && currentPropPersonIdx === S.settings.personNames.length;

  if (isHH) {
    renderHouseholdProperties(el);
  } else {
    renderPersonProperties(el, currentPropPersonIdx);
  }

  // Sync person dropdown in add form
  const personSel = document.getElementById('propPerson');
  if (personSel) {
    personSel.innerHTML = S.settings.personNames.map((p, i) =>
      `<option value="${i}">${p}</option>`
    ).join('');
    personSel.value = currentPropPersonIdx < S.settings.personNames.length ? currentPropPersonIdx : 0;
  }
}

function switchPropPerson(idx) {
  currentPropPersonIdx = idx;
  renderProperties();
}

// ─── Render: single person ────────────────────────────────────────

function renderPersonProperties(el, personIdx) {
  const props = (S.properties || []).filter(p => (p.person || 0) === personIdx);

  if (!props.length) {
    el.innerHTML = `<div class="empty"><div class="ei">🏠</div><p>No properties added for ${S.settings.personNames[personIdx]} yet. Use the form below to add one.</p></div>`;
    return;
  }

  let totalValue = 0, totalMortgage = 0, totalEquity = 0, totalRental = 0, totalGain = 0;
  props.forEach(p => {
    const m = calcPropertyMetrics(p);
    totalValue    += m.estValue;
    totalMortgage += m.mortgageBalance;
    totalEquity   += m.equity;
    totalRental   += m.rentalMonthly;
    totalGain     += m.capitalGain;
  });

  const gainColor = totalGain >= 0 ? 'var(--green)' : 'var(--red)';

  el.innerHTML = `
    <div class="sal-breakdown-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="sal-card">
        <div class="sal-label">Portfolio value</div>
        <div class="sal-val pos val">${fmt(totalValue)}</div>
        <div class="sal-sub">${props.length} propert${props.length !== 1 ? 'ies' : 'y'}</div>
      </div>
      <div class="sal-card">
        <div class="sal-label">Mortgage debt</div>
        <div class="sal-val neg val">${fmt(totalMortgage)}</div>
        <div class="sal-sub">outstanding balance</div>
      </div>
      <div class="sal-card" style="border-color:var(--green);">
        <div class="sal-label">Total equity</div>
        <div class="sal-val pos val">${fmt(totalEquity)}</div>
        <div class="sal-sub">${totalValue > 0 ? ((totalEquity / totalValue) * 100).toFixed(1) : 0}% of portfolio</div>
      </div>
      <div class="sal-card" style="border-color:${gainColor};">
        <div class="sal-label">Unrealised gain</div>
        <div class="sal-val val" style="color:${gainColor};">${totalGain >= 0 ? '+' : ''}${fmt(totalGain)}</div>
        <div class="sal-sub">est. capital gain</div>
      </div>
    </div>

    ${totalRental > 0 ? `
    <div class="sal-breakdown-grid" style="grid-template-columns:repeat(3,1fr);margin-top:0;">
      <div class="sal-card">
        <div class="sal-label">Rental income</div>
        <div class="sal-val pos val">${fmt(totalRental)}/mo</div>
        <div class="sal-sub">${fmt(totalRental * 12)}/yr gross</div>
      </div>
      <div class="sal-card">
        <div class="sal-label">Gross yield</div>
        <div class="sal-val val">${totalValue > 0 ? ((totalRental * 12 / totalValue) * 100).toFixed(2) : 0}%</div>
        <div class="sal-sub">rental income / portfolio value</div>
      </div>
      <div class="sal-card">
        <div class="sal-label">Properties rented</div>
        <div class="sal-val val">${props.filter(p => p.isRented).length} of ${props.length}</div>
        <div class="sal-sub">generating rental income</div>
      </div>
    </div>` : ''}

    <div class="section-label">Properties · ${S.settings.personNames[personIdx]}</div>
    ${props.map(p => renderPropertyCard(p, S.properties.indexOf(p))).join('')}
  `;

  // Draw equity charts after DOM paint
  setTimeout(() => {
    props.forEach(p => {
      const m = calcPropertyMetrics(p);
      const idx = S.properties.indexOf(p);
      const ctx = document.getElementById(`propChart_${idx}`);
      if (!ctx) return;
      if (window[`_propChart_${idx}`]) window[`_propChart_${idx}`].destroy();
      window[`_propChart_${idx}`] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Equity', 'Mortgage'],
          datasets: [{
            data: [Math.max(0, Math.round(m.equity)), Math.round(m.mortgageBalance)],
            backgroundColor: ['#0a8f5c', '#cc3333'],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } },
            tooltip: { callbacks: { label: c => `£${fmt(c.parsed)}` } }
          }
        }
      });
    });
  }, 60);
}

// ─── Render: property card ────────────────────────────────────────

function renderPropertyCard(prop, globalIdx) {
  const m = calcPropertyMetrics(prop);
  const typeLabel   = PROPERTY_TYPES.find(t => t.value === prop.type)?.label || 'Residential';
  const tenureLabel = TENURE_TYPES.find(t => t.value === prop.tenure)?.label || '';
  const ltvColor    = m.ltv > 90 ? 'var(--red)' : m.ltv > 80 ? 'var(--amber,#b87309)' : m.ltv > 60 ? 'var(--blue,#1d6fca)' : 'var(--green)';
  const gainPrefix  = m.capitalGain >= 0 ? '+' : '';
  const hasMortgage = prop.mortgageType !== 'none';

  return `
    <div class="card" style="margin-bottom:18px;" id="propCard_${globalIdx}">

      <!-- Card header -->
      <div class="card-header" style="align-items:flex-start;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="card-title" style="font-size:15px;">${prop.nickname || prop.address || 'Property'}</span>
            <span class="pill p-income" style="font-size:10px;">${typeLabel}</span>
            ${tenureLabel ? `<span class="pill" style="font-size:10px;background:var(--surface2);color:var(--muted);">${tenureLabel}</span>` : ''}
            ${prop.isRented ? `<span class="pill p-payment" style="font-size:10px;">Rented out</span>` : ''}
          </div>
          ${prop.nickname && prop.address ? `<div style="font-size:11px;color:var(--muted);margin-top:3px;">${prop.address}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="icon-btn edit" onclick="openEditProperty(${globalIdx})" title="Edit">✎</button>
          <button class="icon-btn del" onclick="deleteProperty(${globalIdx})" title="Delete">✕</button>
        </div>
      </div>

      <!-- Top metric tiles -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
        <div class="sal-card" style="padding:10px;">
          <div class="sal-label">Est. value</div>
          <div class="sal-val pos val" style="font-size:15px;">${fmt(m.estValue)}</div>
          <div class="sal-sub">current estimate</div>
        </div>
        <div class="sal-card" style="padding:10px;">
          <div class="sal-label">Purchase price</div>
          <div class="sal-val val" style="font-size:15px;">${fmt(m.purchasePrice)}</div>
          <div class="sal-sub">${prop.purchaseDate ? fmtDate(prop.purchaseDate) : 'date unknown'}</div>
        </div>
        <div class="sal-card" style="padding:10px;border-color:${m.capitalGain >= 0 ? 'var(--green)' : 'var(--red)'};">
          <div class="sal-label">Capital gain</div>
          <div class="sal-val ${m.capitalGain >= 0 ? 'pos' : 'neg'} val" style="font-size:15px;">${gainPrefix}${fmt(m.capitalGain)}</div>
          <div class="sal-sub">${gainPrefix}${m.capitalGainPct.toFixed(1)}% unrealised</div>
        </div>
        <div class="sal-card" style="padding:10px;border-color:var(--green);">
          <div class="sal-label">Equity</div>
          <div class="sal-val pos val" style="font-size:15px;">${fmt(m.equity)}</div>
          <div class="sal-sub">${m.equityPct.toFixed(1)}% of value</div>
        </div>
      </div>

      <!-- Detail columns -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">

        <!-- Purchase / ownership details -->
        <div>
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Purchase details</div>
          <table class="tax-band-table">
            <tr><td>Deposit paid</td><td class="val">${fmt(m.depositAmount)}</td></tr>
            <tr><td>Deposit %</td><td>${m.depositPct.toFixed(1)}%</td></tr>
            <tr><td>SDLT (est.)</td><td class="neg val">${fmt(m.sdlt)}</td></tr>
            ${prop.tenure ? `<tr><td>Tenure</td><td>${tenureLabel}</td></tr>` : ''}
            ${prop.leaseYears ? `<tr><td>Lease remaining</td><td>${prop.leaseYears} yrs</td></tr>` : ''}
            ${prop.serviceCharge ? `<tr><td>Service charge</td><td class="neg val">${fmt(prop.serviceCharge)}/yr</td></tr>` : ''}
            ${prop.groundRent ? `<tr><td>Ground rent</td><td class="neg val">${fmt(prop.groundRent)}/yr</td></tr>` : ''}
          </table>
        </div>

        <!-- Mortgage details -->
        <div>
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Mortgage</div>
          ${hasMortgage ? `
          <table class="tax-band-table">
            <tr><td>Lender</td><td style="font-variation-settings:'wght' 600;">${prop.mortgageLender || '—'}</td></tr>
            <tr><td>Type</td><td>${MORTGAGE_TYPES.find(t => t.value === prop.mortgageType)?.label || '—'}</td></tr>
            <tr><td>Balance</td><td class="neg val">${fmt(m.mortgageBalance)}</td></tr>
            <tr><td>Monthly payment</td><td class="neg val">${fmt(m.mortgageMonthly)}/mo</td></tr>
            <tr><td>Interest rate</td><td>${prop.mortgageRate || 0}%</td></tr>
            <tr><td>LTV</td><td style="color:${ltvColor};font-variation-settings:'wght' 700;">${m.ltv.toFixed(1)}%</td></tr>
            ${prop.mortgageEndDate ? `<tr><td>Deal ends</td><td>${fmtDate(prop.mortgageEndDate)}</td></tr>` : ''}
            ${m.remainingYears !== null ? `<tr><td>Years remaining</td><td>${m.remainingYears.toFixed(1)} yrs</td></tr>` : ''}
            ${prop.mortgageAccountNo ? `<tr><td>Account no.</td><td style="font-size:11px;">${prop.mortgageAccountNo}</td></tr>` : ''}
          </table>` : `<div style="font-size:12px;color:var(--muted);padding:8px 0;">No mortgage — owned outright.</div>`}
        </div>

        <!-- Rental / chart -->
        <div>
          ${prop.isRented ? `
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Rental income</div>
          <table class="tax-band-table">
            <tr><td>Rent received</td><td class="pos val">${fmt(m.rentalMonthly)}/mo</td></tr>
            <tr><td>Annual gross</td><td class="pos val">${fmt(m.rentalAnnual)}/yr</td></tr>
            <tr><td>Gross yield</td><td>${m.rentalYield.toFixed(2)}%</td></tr>
            <tr><td>After mortgage</td><td class="${m.netRentalMonthly >= 0 ? 'pos' : 'neg'} val">${m.netRentalMonthly >= 0 ? '+' : ''}${fmt(m.netRentalMonthly)}/mo</td></tr>
            ${prop.tenancyStart ? `<tr><td>Tenancy from</td><td>${fmtDate(prop.tenancyStart)}</td></tr>` : ''}
            ${prop.tenancyEnd ? `<tr><td>Tenancy to</td><td>${fmtDate(prop.tenancyEnd)}</td></tr>` : ''}
            ${prop.agentFeesPct ? `<tr><td>Agent fees</td><td class="neg val">${prop.agentFeesPct}%</td></tr>` : ''}
          </table>` : `
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Equity split</div>
          <div style="height:130px;"><canvas id="propChart_${globalIdx}"></canvas></div>`}
        </div>

      </div>

      ${prop.notes ? `<div style="padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);font-size:12px;color:var(--muted2);margin-top:14px;">📝 ${prop.notes}</div>` : ''}
    </div>
  `;
}

// ─── Render: household view ───────────────────────────────────────

function renderHouseholdProperties(el) {
  const allProps = S.properties || [];
  if (!allProps.length) {
    el.innerHTML = `<div class="empty"><div class="ei">🏠</div><p>No properties added yet.</p></div>`;
    return;
  }

  let totalValue = 0, totalMortgage = 0, totalEquity = 0, totalRental = 0, totalGain = 0;
  allProps.forEach(p => {
    const m = calcPropertyMetrics(p);
    totalValue    += m.estValue;
    totalMortgage += m.mortgageBalance;
    totalEquity   += m.equity;
    totalRental   += m.rentalMonthly;
    totalGain     += m.capitalGain;
  });

  const gainColor = totalGain >= 0 ? 'var(--green)' : 'var(--red)';

  el.innerHTML = `
    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Portfolio value</div><div class="sal-val pos val">${fmt(totalValue)}</div><div class="sal-sub">${allProps.length} propert${allProps.length !== 1 ? 'ies' : 'y'}</div></div>
      <div class="sal-card"><div class="sal-label">Mortgage debt</div><div class="sal-val neg val">${fmt(totalMortgage)}</div><div class="sal-sub">combined outstanding</div></div>
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Total equity</div><div class="sal-val pos val">${fmt(totalEquity)}</div><div class="sal-sub">${totalValue > 0 ? ((totalEquity / totalValue) * 100).toFixed(1) : 0}% of portfolio</div></div>
      <div class="sal-card" style="border-color:${gainColor};"><div class="sal-label">Capital gains</div><div class="sal-val val" style="color:${gainColor};">${totalGain >= 0 ? '+' : ''}${fmt(totalGain)}</div><div class="sal-sub">unrealised</div></div>
      <div class="sal-card"><div class="sal-label">Rental income</div><div class="sal-val pos val">${fmt(totalRental)}/mo</div><div class="sal-sub">${fmt(totalRental * 12)}/yr</div></div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-header"><span class="card-title">All properties</span></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Est. value</th>
              <th>Mortgage</th>
              <th>Equity</th>
              <th>LTV</th>
              <th>Rental/mo</th>
              <th>Yield</th>
            </tr>
          </thead>
          <tbody>
            ${allProps.map(p => {
              const m = calcPropertyMetrics(p);
              const owner = S.settings.personNames[p.person || 0] || '—';
              const typeLabel = PROPERTY_TYPES.find(t => t.value === p.type)?.label?.split(' ')[0] || '—';
              const ltvColor = m.ltv > 90 ? 'var(--red)' : m.ltv > 80 ? 'var(--amber,#b87309)' : 'var(--green)';
              return `<tr>
                <td style="font-variation-settings:'wght' 600;">${p.nickname || p.address || '—'}</td>
                <td>${owner}</td>
                <td><span class="pill p-income" style="font-size:10px;">${typeLabel}</span></td>
                <td class="pos val">${fmt(m.estValue)}</td>
                <td class="neg val">${fmt(m.mortgageBalance)}</td>
                <td class="pos val">${fmt(m.equity)}</td>
                <td style="color:${ltvColor};font-variation-settings:'wght' 700;">${m.ltv.toFixed(1)}%</td>
                <td class="${m.rentalMonthly > 0 ? 'pos val' : ''}">${m.rentalMonthly > 0 ? fmt(m.rentalMonthly) : '—'}</td>
                <td>${m.rentalYield > 0 ? m.rentalYield.toFixed(2) + '%' : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Household equity donut
  setTimeout(() => {
    const ctx = document.getElementById('hhPropChart');
    if (!ctx) return;
    if (window._hhPropChart) window._hhPropChart.destroy();
    const perPerson = S.settings.personNames.map((name, i) => {
      const pProps = allProps.filter(p => (p.person || 0) === i);
      const equity = pProps.reduce((sum, p) => sum + calcPropertyMetrics(p).equity, 0);
      return { name, equity };
    }).filter(pp => pp.equity > 0);
    if (!perPerson.length) return;
    window._hhPropChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: perPerson.map(p => p.name),
        datasets: [{ data: perPerson.map(p => Math.round(p.equity)), backgroundColor: ['#0a8f5c', '#1d6fca', '#b87309', '#5046e5'] }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 10, padding: 10 } }, tooltip: { callbacks: { label: c => `£${fmt(c.parsed)}` } } }
      }
    });
  }, 60);
}

// ─── Add property ─────────────────────────────────────────────────

function addProperty() {
  if (!S.properties) S.properties = [];

  const get  = id => document.getElementById(id);
  const gVal = id => (get(id)?.value || '').trim();
  const gMon = id => parseMoney(get(id)?.value) || 0;
  const gFlt = id => parseFloat(get(id)?.value) || 0;
  const gChk = id => get(id)?.checked || false;

  const purchasePrice = gMon('propPurchasePrice');
  const estValue      = gMon('propEstValue') || purchasePrice;
  if (!purchasePrice && !estValue) { toast('Please enter a purchase price or estimated value.'); return; }

  const prop = {
    person:           parseInt(gVal('propPerson')) || 0,
    nickname:         gVal('propNickname'),
    address:          gVal('propAddress'),
    type:             gVal('propType'),
    tenure:           gVal('propTenure'),
    purchasePrice,
    depositAmount:    gMon('propDeposit'),
    purchaseDate:     gVal('propPurchaseDate'),
    estValue,
    // Mortgage
    mortgageType:     gVal('propMortgageType'),
    mortgageLender:   gVal('propMortgageLender'),
    mortgageBalance:  gMon('propMortgageBalance'),
    mortgageRate:     gFlt('propMortgageRate'),
    mortgageMonthly:  gMon('propMortgageMonthly'),
    mortgageEndDate:  gVal('propMortgageEndDate'),
    mortgageAccountNo:gVal('propMortgageAccountNo'),
    // Leasehold extras
    leaseYears:       gFlt('propLeaseYears') || null,
    serviceCharge:    gMon('propServiceCharge') || null,
    groundRent:       gMon('propGroundRent') || null,
    // Rental
    isRented:         gChk('propIsRented'),
    rentalMonthly:    gMon('propRentalMonthly'),
    tenancyStart:     gVal('propTenancyStart'),
    tenancyEnd:       gVal('propTenancyEnd'),
    agentFeesPct:     gFlt('propAgentFees') || null,
    notes:            gVal('propNotes'),
  };

  S.properties.push(prop);
  save();
  toast('Property saved ✓');

  // Reset form
  document.getElementById('addPropertyForm')?.reset();
  togglePropMortgageFields();

  switchPropPerson(prop.person);
  renderProperties();
}

// ─── Delete / edit ────────────────────────────────────────────────

function deleteProperty(i) {
  if (!confirm('Delete this property? This cannot be undone.')) return;
  S.properties.splice(i, 1);
  save(); renderProperties(); toast('Deleted');
}

function openEditProperty(i) {
  const p = S.properties[i];
  editingPropertyIdx = i;

  const fld = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };
  const mon = v => v ? v.toLocaleString('en-GB') : '';

  // Populate edit modal fields
  fld('ep-nickname',      p.nickname);
  fld('ep-address',       p.address);
  fld('ep-type',          p.type);
  fld('ep-tenure',        p.tenure);
  fld('ep-purchase',      mon(p.purchasePrice));
  fld('ep-deposit',       mon(p.depositAmount));
  fld('ep-purchasedate',  p.purchaseDate);
  fld('ep-estvalue',      mon(p.estValue));
  fld('ep-morttype',      p.mortgageType);
  fld('ep-lender',        p.mortgageLender);
  fld('ep-balance',       mon(p.mortgageBalance));
  fld('ep-rate',          p.mortgageRate);
  fld('ep-monthly',       mon(p.mortgageMonthly));
  fld('ep-mortend',       p.mortgageEndDate);
  fld('ep-mortaccno',     p.mortgageAccountNo);
  fld('ep-leaseyears',    p.leaseYears);
  fld('ep-servicecharge', mon(p.serviceCharge));
  fld('ep-groundrent',    mon(p.groundRent));
  fld('ep-rented',        p.isRented);
  fld('ep-rental',        mon(p.rentalMonthly));
  fld('ep-tenancystart',  p.tenancyStart);
  fld('ep-tenancyend',    p.tenancyEnd);
  fld('ep-agentfees',     p.agentFeesPct);
  fld('ep-notes',         p.notes);

  const rentedChk = document.getElementById('ep-rented');
  if (rentedChk) rentedChk.checked = p.isRented || false;

  document.getElementById('editPropertyModal')?.classList.remove('hidden');
  toggleEditPropMortgageFields();
  toggleEditPropRentalFields();
}

function saveEditProperty() {
  if (editingPropertyIdx === null) return;
  const p = S.properties[editingPropertyIdx];
  const gVal = id => (document.getElementById(id)?.value || '').trim();
  const gMon = id => parseMoney(document.getElementById(id)?.value) || 0;
  const gFlt = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gChk = id => document.getElementById(id)?.checked || false;

  p.nickname         = gVal('ep-nickname');
  p.address          = gVal('ep-address');
  p.type             = gVal('ep-type');
  p.tenure           = gVal('ep-tenure');
  p.purchasePrice    = gMon('ep-purchase') || p.purchasePrice;
  p.depositAmount    = gMon('ep-deposit');
  p.purchaseDate     = gVal('ep-purchasedate');
  p.estValue         = gMon('ep-estvalue') || p.estValue;
  p.mortgageType     = gVal('ep-morttype');
  p.mortgageLender   = gVal('ep-lender');
  p.mortgageBalance  = gMon('ep-balance');
  p.mortgageRate     = gFlt('ep-rate');
  p.mortgageMonthly  = gMon('ep-monthly');
  p.mortgageEndDate  = gVal('ep-mortend');
  p.mortgageAccountNo = gVal('ep-mortaccno');
  p.leaseYears       = gFlt('ep-leaseyears') || null;
  p.serviceCharge    = gMon('ep-servicecharge') || null;
  p.groundRent       = gMon('ep-groundrent') || null;
  p.isRented         = gChk('ep-rented');
  p.rentalMonthly    = gMon('ep-rental');
  p.tenancyStart     = gVal('ep-tenancystart');
  p.tenancyEnd       = gVal('ep-tenancyend');
  p.agentFeesPct     = gFlt('ep-agentfees') || null;
  p.notes            = gVal('ep-notes');

  save();
  closeModal('editPropertyModal');
  renderProperties();
  toast('Property updated ✓');
}

// ─── Form UI helpers ──────────────────────────────────────────────

function togglePropMortgageFields() {
  const type = document.getElementById('propMortgageType')?.value;
  const fields = document.getElementById('propMortgageFields');
  if (fields) fields.style.display = type === 'none' ? 'none' : '';
}

function togglePropRentalFields() {
  const checked = document.getElementById('propIsRented')?.checked;
  const fields = document.getElementById('propRentalFields');
  if (fields) fields.style.display = checked ? '' : 'none';
}

function togglePropLeaseFields() {
  const tenure = document.getElementById('propTenure')?.value;
  const fields = document.getElementById('propLeaseFields');
  if (fields) fields.style.display = tenure === 'leasehold' ? '' : 'none';
}

function toggleEditPropMortgageFields() {
  const type = document.getElementById('ep-morttype')?.value;
  const fields = document.getElementById('editPropMortgageFields');
  if (fields) fields.style.display = type === 'none' ? 'none' : '';
}

function toggleEditPropRentalFields() {
  const checked = document.getElementById('ep-rented')?.checked;
  const fields = document.getElementById('editPropRentalFields');
  if (fields) fields.style.display = checked ? '' : 'none';
}

function toggleEditPropLeaseFields() {
  const tenure = document.getElementById('ep-tenure')?.value;
  const fields = document.getElementById('editPropLeaseFields');
  if (fields) fields.style.display = tenure === 'leasehold' ? '' : 'none';
}

function calcAndFillMonthlyPayment() {
  const principal = parseMoney(document.getElementById('propMortgageBalance')?.value) || 0;
  const rate = parseFloat(document.getElementById('propMortgageRate')?.value) || 0;
  const endDate = document.getElementById('propMortgageEndDate')?.value;
  if (!principal || !rate || !endDate) { toast('Fill in balance, rate & end date to estimate payment'); return; }
  const years = Math.max(0.5, (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24 * 365.25));
  const monthly = calcMortgageMonthly(principal, rate, years);
  const el = document.getElementById('propMortgageMonthly');
  if (el) { el.value = monthly.toLocaleString('en-GB'); toast(`Estimated: £${monthly.toLocaleString('en-GB')}/mo`); }
}
