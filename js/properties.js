// ── Properties ───────────────────────────────────────
// JS: PROPERTIES (UK property tracker)
// ═══════════════════════════════════════════════════
//
// HTML REQUIRED (inside your properties page/section only):
//
//   <p class="page-subtitle">Track your property investments...</p>
//   <!-- propPersonTabs is injected here automatically by JS -->
//   <div id="propertiesContent"></div>
//
// The JS auto-creates and auto-positions #propPersonTabs immediately
// before #propertiesContent, so you do NOT need a propPersonTabs div
// in your HTML at all. Remove it if it exists elsewhere.
// Call hidePropPersonTabs() from your page-switcher when navigating
// AWAY from the properties section so it doesn't bleed to other pages.

const PROPERTY_TYPES = [
  { value: 'residential',  label: 'Residential (Main Home)' },
  { value: 'buy-to-let',   label: 'Buy-to-Let' },
  { value: 'holiday-let',  label: 'Holiday Let' },
  { value: 'commercial',   label: 'Commercial' },
  { value: 'land',         label: 'Land / Plot' },
];

const MORTGAGE_TYPES = [
  { value: 'repayment',     label: 'Repayment' },
  { value: 'interest-only', label: 'Interest Only' },
  { value: 'none',          label: 'No Mortgage' },
];

const TENURE_TYPES = [
  { value: 'freehold',  label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'share',     label: 'Share of Freehold' },
];

let editingPropertyIdx   = null;
let currentPropPersonIdx = 0;
let addPropertyFormOpen  = false;

// ─── Calculations ─────────────────────────────────────────────────

function calcSDLT(price, isAdditional = false) {
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
    if (price > b.from)
      sdlt += (Math.min(price, b.to === Infinity ? price : b.to) - b.from) * b.rate / 100;
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
  const purchasePrice   = prop.purchasePrice   || 0;
  const depositAmount   = prop.depositAmount   || 0;
  const depositPct      = purchasePrice > 0 ? (depositAmount / purchasePrice) * 100 : 0;
  const estValue        = prop.estValue        || purchasePrice;
  const mortgageBalance = prop.mortgageBalance || 0;
  const equity          = estValue - mortgageBalance;
  const equityPct       = estValue > 0 ? (equity / estValue) * 100 : 0;
  const capitalGain     = estValue - purchasePrice;
  const capitalGainPct  = purchasePrice > 0 ? (capitalGain / purchasePrice) * 100 : 0;
  const ltv             = estValue > 0 ? (mortgageBalance / estValue) * 100 : 0;
  const rentalMonthly   = prop.rentalMonthly   || 0;
  const rentalAnnual    = rentalMonthly * 12;
  const mortgageMonthly = prop.mortgageMonthly || 0;
  const rentalYield     = estValue > 0 && rentalAnnual > 0 ? (rentalAnnual / estValue) * 100 : 0;
  const netRentalMonthly = rentalMonthly - mortgageMonthly;
  const isAdditional    = ['buy-to-let', 'holiday-let', 'commercial'].includes(prop.type);
  const sdlt            = calcSDLT(purchasePrice, isAdditional);

  let remainingYears = null;
  if (prop.mortgageEndDate) {
    const end = new Date(prop.mortgageEndDate);
    remainingYears = Math.max(0, (end - new Date()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  return {
    purchasePrice, depositAmount, depositPct, estValue,
    mortgageBalance, equity, equityPct, capitalGain, capitalGainPct,
    ltv, rentalMonthly, rentalAnnual, mortgageMonthly, rentalYield,
    netRentalMonthly, sdlt, remainingYears,
  };
}

// ─── Person tabs: auto-inject & auto-position ─────────────────────
// Creates #propPersonTabs if missing and always moves it immediately
// before #propertiesContent — it will never appear on other pages
// as long as hidePropPersonTabs() is called when navigating away.

function getPropPersonTabsEl() {
  const contentEl = document.getElementById('propertiesContent');
  if (!contentEl) return null;
  let tabsEl = document.getElementById('propPersonTabs');
  if (!tabsEl) {
    tabsEl = document.createElement('div');
    tabsEl.id = 'propPersonTabs';
    contentEl.parentNode.insertBefore(tabsEl, contentEl);
  } else if (tabsEl.nextElementSibling !== contentEl || tabsEl.parentNode !== contentEl.parentNode) {
    // Wrong position or wrong parent — move it into the right place
    tabsEl.parentNode.removeChild(tabsEl);
    contentEl.parentNode.insertBefore(tabsEl, contentEl);
  }
  return tabsEl;
}

// Call from your page-switcher when navigating AWAY from properties
function hidePropPersonTabs() {
  const t = document.getElementById('propPersonTabs');
  if (t) t.style.display = 'none';
}

// ─── Main render ──────────────────────────────────────────────────

function renderProperties() {
  if (!S.properties) S.properties = [];

  const allPeople     = [...S.settings.personNames];
  const showHousehold = allPeople.length > 1;
  if (showHousehold) allPeople.push('Household');

  const tabsEl = getPropPersonTabsEl();
  if (tabsEl) {
    tabsEl.style.cssText = showHousehold
      ? 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;'
      : 'display:none;';
    if (showHousehold) {
      tabsEl.innerHTML = allPeople.map((p, i) => {
        const isHH = i === allPeople.length - 1;
        return `<button class="person-btn ${currentPropPersonIdx === i ? 'active' : ''}"
          onclick="switchPropPerson(${i})">${isHH ? '📊 ' + p : p}</button>`;
      }).join('');
    } else {
      tabsEl.innerHTML = '';
      currentPropPersonIdx = 0;
    }
  }

  const el   = document.getElementById('propertiesContent');
  const isHH = showHousehold && currentPropPersonIdx === S.settings.personNames.length;
  if (isHH) renderHouseholdProperties(el);
  else      renderPersonProperties(el, currentPropPersonIdx);
}

function switchPropPerson(idx) {
  currentPropPersonIdx = idx;
  renderProperties();
}

// ─── Render: single person ────────────────────────────────────────

function renderPersonProperties(el, personIdx) {
  const props      = (S.properties || []).filter(p => (p.person || 0) === personIdx);
  const personName = S.settings.personNames[personIdx];
  let summaryHTML  = '';

  if (props.length) {
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

    summaryHTML = `
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
      <div class="section-label">Properties · ${personName}</div>
      ${props.map(p => renderPropertyCard(p, S.properties.indexOf(p))).join('')}
    `;
  } else {
    summaryHTML = `<div class="empty"><div class="ei">🏠</div>
      <p>No properties added for ${personName} yet. Use the form below to add one.</p></div>`;
  }

  el.innerHTML = summaryHTML + renderAddPropertyFormHTML(personIdx);

  setTimeout(() => {
    props.forEach(p => {
      if (!p.isRented) drawEquityChart(S.properties.indexOf(p), calcPropertyMetrics(p));
    });
  }, 60);
}

// ─── Equity chart helper ──────────────────────────────────────────

function drawEquityChart(idx, m) {
  const ctx = document.getElementById(`propChart_${idx}`);
  if (!ctx) return;
  if (window[`_propChart_${idx}`]) window[`_propChart_${idx}`].destroy();
  window[`_propChart_${idx}`] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Equity', 'Mortgage'],
      datasets: [{ data: [Math.max(0, Math.round(m.equity)), Math.round(m.mortgageBalance)], backgroundColor: ['#0a8f5c', '#cc3333'] }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 8 } },
        tooltip: { callbacks: { label: c => `£${fmt(c.parsed)}` } }
      }
    }
  });
}

// ─── Render: property card (view mode) ───────────────────────────

function renderPropertyCard(prop, globalIdx) {
  const m           = calcPropertyMetrics(prop);
  const typeLabel   = PROPERTY_TYPES.find(t => t.value === prop.type)?.label  || 'Residential';
  const tenureLabel = TENURE_TYPES.find(t => t.value === prop.tenure)?.label  || '';
  const ltvColor    = m.ltv > 90 ? 'var(--red)' : m.ltv > 80 ? 'var(--amber,#b87309)' : m.ltv > 60 ? 'var(--blue,#1d6fca)' : 'var(--green)';
  const gainPrefix  = m.capitalGain >= 0 ? '+' : '';
  const hasMortgage = prop.mortgageType !== 'none';
  const mapsQuery   = encodeURIComponent(prop.address || prop.nickname || '');

  // Location pin icon (left of address)
  const pinIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"
    style="flex-shrink:0;margin-right:3px;margin-top:1px;"
    xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;

  // External link icon with rich hover (colour + background tint + subtle lift)
  const mapsLink = mapsQuery ? `
    <a href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}"
       target="_blank" rel="noopener noreferrer" title="Open in Google Maps"
       style="display:inline-flex;align-items:center;margin-left:5px;color:var(--muted);
              text-decoration:none;vertical-align:middle;border-radius:3px;
              padding:1px 3px;transition:color .15s,background .15s,transform .15s;"
       onmouseover="this.style.color='var(--blue,#1d6fca)';this.style.background='color-mix(in srgb,var(--blue,#1d6fca) 10%,transparent)';this.style.transform='translateY(-1px)'"
       onmouseout="this.style.color='var(--muted)';this.style.background='transparent';this.style.transform='none'">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>` : '';

  const addressLine = prop.address
    ? `<div style="display:flex;align-items:flex-start;font-size:11px;color:var(--muted);margin-top:3px;">
        ${pinIcon}${prop.address}${mapsLink}
      </div>`
    : '';

  return `
    <div class="card" style="margin-bottom:18px;" id="propCard_${globalIdx}">

      <div class="card-header" style="align-items:flex-start;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="card-title" style="font-size:15px;">${prop.nickname || prop.address || 'Property'}</span>
            <span class="pill p-income" style="font-size:10px;">${typeLabel}</span>
            ${tenureLabel ? `<span class="pill" style="font-size:10px;background:var(--surface2);color:var(--muted);">${tenureLabel}</span>` : ''}
            ${prop.isRented ? `<span class="pill p-payment" style="font-size:10px;">Rented out</span>` : ''}
          </div>
          ${addressLine}
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="icon-btn edit" onclick="openEditProperty(${globalIdx})" title="Edit">✎</button>
          <button class="icon-btn del"  onclick="deleteProperty(${globalIdx})"   title="Delete">✕</button>
        </div>
      </div>

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

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
        <div>
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Purchase details</div>
          <table class="tax-band-table">
            <tr><td>Deposit paid</td><td class="val">${fmt(m.depositAmount)}</td></tr>
            <tr><td>Deposit %</td><td>${m.depositPct.toFixed(1)}%</td></tr>
            <tr><td>SDLT (est.)</td><td class="neg val">${fmt(m.sdlt)}</td></tr>
            ${prop.tenure        ? `<tr><td>Tenure</td><td>${tenureLabel}</td></tr>` : ''}
            ${prop.leaseYears    ? `<tr><td>Lease remaining</td><td>${prop.leaseYears} yrs</td></tr>` : ''}
            ${prop.serviceCharge ? `<tr><td>Service charge</td><td class="neg val">${fmt(prop.serviceCharge)}/yr</td></tr>` : ''}
            ${prop.groundRent    ? `<tr><td>Ground rent</td><td class="neg val">${fmt(prop.groundRent)}/yr</td></tr>` : ''}
          </table>
        </div>
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
            ${prop.mortgageEndDate   ? `<tr><td>Deal ends</td><td>${fmtDate(prop.mortgageEndDate)}</td></tr>` : ''}
            ${m.remainingYears !== null ? `<tr><td>Years remaining</td><td>${m.remainingYears.toFixed(1)} yrs</td></tr>` : ''}
            ${prop.mortgageAccountNo ? `<tr><td>Account no.</td><td style="font-size:11px;">${prop.mortgageAccountNo}</td></tr>` : ''}
          </table>` : `<div style="font-size:12px;color:var(--muted);padding:8px 0;">No mortgage — owned outright.</div>`}
        </div>
        <div>
          ${prop.isRented ? `
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Rental income</div>
          <table class="tax-band-table">
            <tr><td>Rent received</td><td class="pos val">${fmt(m.rentalMonthly)}/mo</td></tr>
            <tr><td>Annual gross</td><td class="pos val">${fmt(m.rentalAnnual)}/yr</td></tr>
            <tr><td>Gross yield</td><td>${m.rentalYield.toFixed(2)}%</td></tr>
            <tr><td>After mortgage</td><td class="${m.netRentalMonthly >= 0 ? 'pos' : 'neg'} val">${m.netRentalMonthly >= 0 ? '+' : ''}${fmt(m.netRentalMonthly)}/mo</td></tr>
            ${prop.tenancyStart ? `<tr><td>Tenancy from</td><td>${fmtDate(prop.tenancyStart)}</td></tr>` : ''}
            ${prop.tenancyEnd   ? `<tr><td>Tenancy to</td><td>${fmtDate(prop.tenancyEnd)}</td></tr>` : ''}
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

// ─── Inline edit form ─────────────────────────────────────────────
// Uses the same form-input / form-label classes as the add form so
// the editing state matches the card's established visual language.

function openEditProperty(globalIdx) {
  editingPropertyIdx = globalIdx;
  const cardEl = document.getElementById(`propCard_${globalIdx}`);
  if (!cardEl) return;

  const p   = S.properties[globalIdx];
  const mon = v => (v && v > 0) ? v.toLocaleString('en-GB') : '';

  const propTypeSel = PROPERTY_TYPES.map(t =>
    `<option value="${t.value}" ${p.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('');
  const mortTypeSel = MORTGAGE_TYPES.map(t =>
    `<option value="${t.value}" ${p.mortgageType === t.value ? 'selected' : ''}>${t.label}</option>`).join('');
  const tenureSel   = TENURE_TYPES.map(t =>
    `<option value="${t.value}" ${p.tenure === t.value ? 'selected' : ''}>${t.label}</option>`).join('');

  cardEl.innerHTML = `

    <!-- Edit header row -->
    <div style="display:flex;align-items:center;justify-content:space-between;
         margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--blue,#1d6fca);">
      <div style="font-size:13px;font-variation-settings:'wght' 700;color:var(--blue,#1d6fca);">
        ✎ Editing: ${p.nickname || p.address || 'Property'}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="icon-btn" onclick="cancelEditProperty(${globalIdx})"
          style="font-size:12px;padding:4px 12px;width:auto;border-radius:var(--radius-sm);">
          Cancel
        </button>
        <button class="icon-btn edit" onclick="saveEditProperty(${globalIdx})"
          style="font-size:12px;padding:4px 14px;width:auto;border-radius:var(--radius-sm);
                 background:var(--green);color:#fff;border-color:var(--green);">
          ✓ Save changes
        </button>
      </div>
    </div>

    <!-- Three-column edit grid — matches add-form layout -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">

      <!-- Col 1: Identity & purchase -->
      <div>
        <div class="section-label" style="margin-top:0;margin-bottom:10px;">Property details</div>

        <label class="form-label">Nickname / label</label>
        <input class="form-input" id="ep-nickname" value="${p.nickname || ''}" placeholder="e.g. Main Home">

        <label class="form-label" style="margin-top:10px;">Full address</label>
        <input class="form-input" id="ep-address" value="${p.address || ''}" placeholder="e.g. 12 Oak Lane, Leeds">

        <label class="form-label" style="margin-top:10px;">Property type</label>
        <select class="form-input" id="ep-type">${propTypeSel}</select>

        <label class="form-label" style="margin-top:10px;">Tenure</label>
        <select class="form-input" id="ep-tenure"
          onchange="toggleInlineEditLeaseFields(${globalIdx})">${tenureSel}</select>

        <div id="ep-leaseFields-${globalIdx}" style="display:${p.tenure === 'leasehold' ? '' : 'none'}">
          <label class="form-label" style="margin-top:10px;">Lease years remaining</label>
          <input class="form-input" id="ep-leaseyears" type="number" value="${p.leaseYears || ''}" placeholder="e.g. 85">
          <label class="form-label" style="margin-top:10px;">Service charge /yr (£)</label>
          <input class="form-input" id="ep-servicecharge" value="${mon(p.serviceCharge)}" placeholder="e.g. 2,400">
          <label class="form-label" style="margin-top:10px;">Ground rent /yr (£)</label>
          <input class="form-input" id="ep-groundrent" value="${mon(p.groundRent)}" placeholder="e.g. 250">
        </div>

        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
          <div class="section-label" style="margin-top:0;margin-bottom:10px;">Purchase</div>
          <label class="form-label">Purchase price (£)</label>
          <input class="form-input" id="ep-purchase" value="${mon(p.purchasePrice)}" placeholder="e.g. 350,000">
          <label class="form-label" style="margin-top:10px;">Deposit paid (£)</label>
          <input class="form-input" id="ep-deposit" value="${mon(p.depositAmount)}" placeholder="e.g. 35,000">
          <label class="form-label" style="margin-top:10px;">Purchase date</label>
          <input class="form-input" id="ep-purchasedate" type="date" value="${p.purchaseDate || ''}">
          <label class="form-label" style="margin-top:10px;">Current est. value (£)</label>
          <input class="form-input" id="ep-estvalue" value="${mon(p.estValue)}" placeholder="e.g. 420,000">
        </div>
      </div>

      <!-- Col 2: Mortgage -->
      <div>
        <div class="section-label" style="margin-top:0;margin-bottom:10px;">Mortgage</div>

        <label class="form-label">Mortgage type</label>
        <select class="form-input" id="ep-morttype"
          onchange="toggleInlineEditMortgageFields(${globalIdx})">${mortTypeSel}</select>

        <div id="ep-mortFields-${globalIdx}" style="display:${p.mortgageType === 'none' ? 'none' : ''}">
          <label class="form-label" style="margin-top:10px;">Lender</label>
          <input class="form-input" id="ep-lender" value="${p.mortgageLender || ''}" placeholder="e.g. Nationwide">

          <label class="form-label" style="margin-top:10px;">Outstanding balance (£)</label>
          <input class="form-input" id="ep-balance" value="${mon(p.mortgageBalance)}" placeholder="e.g. 210,000">

          <label class="form-label" style="margin-top:10px;">Interest rate (%)</label>
          <input class="form-input" id="ep-rate" type="number" step="0.01"
            value="${p.mortgageRate || ''}" placeholder="e.g. 4.29">

          <label class="form-label" style="margin-top:10px;">Monthly payment (£)</label>
          <input class="form-input" id="ep-monthly" value="${mon(p.mortgageMonthly)}" placeholder="e.g. 1,150">

          <label class="form-label" style="margin-top:10px;">Deal / fix end date</label>
          <input class="form-input" id="ep-mortend" type="date" value="${p.mortgageEndDate || ''}">

          <label class="form-label" style="margin-top:10px;">
            Account number
            <span style="color:var(--muted);font-variation-settings:'wght' 400;"> — optional</span>
          </label>
          <input class="form-input" id="ep-mortaccno" value="${p.mortgageAccountNo || ''}" placeholder="optional">
        </div>
      </div>

      <!-- Col 3: Rental & notes -->
      <div>
        <div class="section-label" style="margin-top:0;margin-bottom:10px;">Rental income</div>
        <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="ep-rented" ${p.isRented ? 'checked' : ''}
            onchange="toggleInlineEditRentalFields(${globalIdx})">
          Currently rented out
        </label>

        <div id="ep-rentalFields-${globalIdx}" style="display:${p.isRented ? '' : 'none'}">
          <label class="form-label" style="margin-top:10px;">Monthly rent received (£)</label>
          <input class="form-input" id="ep-rental" value="${mon(p.rentalMonthly)}" placeholder="e.g. 1,400">
          <label class="form-label" style="margin-top:10px;">Tenancy start</label>
          <input class="form-input" id="ep-tenancystart" type="date" value="${p.tenancyStart || ''}">
          <label class="form-label" style="margin-top:10px;">Tenancy end</label>
          <input class="form-input" id="ep-tenancyend" type="date" value="${p.tenancyEnd || ''}">
          <label class="form-label" style="margin-top:10px;">Agent fees (%)</label>
          <input class="form-input" id="ep-agentfees" type="number" step="0.1"
            value="${p.agentFeesPct || ''}" placeholder="e.g. 10">
        </div>

        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Notes</div>
          <textarea class="form-input" id="ep-notes" rows="4"
            style="resize:vertical;min-height:80px;"
            placeholder="Any notes about this property…">${p.notes || ''}</textarea>
        </div>

        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="icon-btn" onclick="cancelEditProperty(${globalIdx})"
            style="flex:1;font-size:12px;padding:6px 0;width:auto;border-radius:var(--radius-sm);">
            Cancel
          </button>
          <button class="icon-btn edit" onclick="saveEditProperty(${globalIdx})"
            style="flex:2;font-size:13px;padding:9px 0;width:auto;border-radius:var(--radius-sm);
                   background:var(--green);color:#fff;border-color:var(--green);">
            ✓ Save changes
          </button>
        </div>
      </div>

    </div>
  `;
}

// ── Inline-edit toggle helpers ────────────────────────────────────

function toggleInlineEditMortgageFields(i) {
  const f = document.getElementById(`ep-mortFields-${i}`);
  if (f) f.style.display = document.getElementById('ep-morttype')?.value === 'none' ? 'none' : '';
}
function toggleInlineEditRentalFields(i) {
  const f = document.getElementById(`ep-rentalFields-${i}`);
  if (f) f.style.display = document.getElementById('ep-rented')?.checked ? '' : 'none';
}
function toggleInlineEditLeaseFields(i) {
  const f = document.getElementById(`ep-leaseFields-${i}`);
  if (f) f.style.display = document.getElementById('ep-tenure')?.value === 'leasehold' ? '' : 'none';
}

// ── Cancel inline edit ────────────────────────────────────────────

function cancelEditProperty(globalIdx) {
  editingPropertyIdx = null;
  const prop   = S.properties[globalIdx];
  const cardEl = document.getElementById(`propCard_${globalIdx}`);
  if (!cardEl) { renderProperties(); return; }
  cardEl.outerHTML = renderPropertyCard(prop, globalIdx);
  if (!prop.isRented) setTimeout(() => drawEquityChart(globalIdx, calcPropertyMetrics(prop)), 60);
}

// ── Save inline edit ──────────────────────────────────────────────

function saveEditProperty(globalIdx) {
  if (globalIdx === null || globalIdx === undefined) return;
  const p  = S.properties[globalIdx];
  const gV = id => (document.getElementById(id)?.value || '').trim();
  const gM = id => parseMoney(document.getElementById(id)?.value) || 0;
  const gF = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gC = id => document.getElementById(id)?.checked || false;

  p.nickname          = gV('ep-nickname');
  p.address           = gV('ep-address');
  p.type              = gV('ep-type');
  p.tenure            = gV('ep-tenure');
  p.purchasePrice     = gM('ep-purchase')      || p.purchasePrice;
  p.depositAmount     = gM('ep-deposit');
  p.purchaseDate      = gV('ep-purchasedate');
  p.estValue          = gM('ep-estvalue')       || p.estValue;
  p.mortgageType      = gV('ep-morttype');
  p.mortgageLender    = gV('ep-lender');
  p.mortgageBalance   = gM('ep-balance');
  p.mortgageRate      = gF('ep-rate');
  p.mortgageMonthly   = gM('ep-monthly');
  p.mortgageEndDate   = gV('ep-mortend');
  p.mortgageAccountNo = gV('ep-mortaccno');
  p.leaseYears        = gF('ep-leaseyears')    || null;
  p.serviceCharge     = gM('ep-servicecharge') || null;
  p.groundRent        = gM('ep-groundrent')     || null;
  p.isRented          = gC('ep-rented');
  p.rentalMonthly     = gM('ep-rental');
  p.tenancyStart      = gV('ep-tenancystart');
  p.tenancyEnd        = gV('ep-tenancyend');
  p.agentFeesPct      = gF('ep-agentfees')     || null;
  p.notes             = gV('ep-notes');

  save();
  editingPropertyIdx = null;

  const cardEl = document.getElementById(`propCard_${globalIdx}`);
  if (cardEl) {
    cardEl.outerHTML = renderPropertyCard(p, globalIdx);
    if (!p.isRented) setTimeout(() => drawEquityChart(globalIdx, calcPropertyMetrics(p)), 60);
  }
  renderProperties();
  toast('Property updated ✓');
}

// ─── Add property form (collapsible card) ─────────────────────────

function renderAddPropertyFormHTML(personIdx) {
  const propTypeOptions = PROPERTY_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`).join('');
  const mortTypeOptions = MORTGAGE_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`).join('');
  const tenureOptions   = TENURE_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`).join('');
  const personOptions   = (S.settings.personNames || []).map((n, i) =>
    `<option value="${i}" ${i === personIdx ? 'selected' : ''}>${n}</option>`).join('');
  const multiPerson     = (S.settings.personNames || []).length > 1;

  return `
    <div class="card" id="addPropertyCard"
      style="margin-bottom:18px;border-style:dashed;border-color:var(--border);">

      <!-- Toggle header -->
      <div class="card-header" onclick="toggleAddPropertyForm()"
        style="cursor:pointer;user-select:none;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="addPropChevron"
            style="font-size:16px;color:var(--blue,#1d6fca);transition:transform .2s;
                   display:inline-block;transform:${addPropertyFormOpen ? 'rotate(90deg)' : 'rotate(0deg)'};">▸</span>
          <span class="card-title" style="font-size:14px;color:var(--blue,#1d6fca);">＋ Add a property</span>
        </div>
      </div>

      <!-- Form body -->
      <div id="addPropertyFormBody" style="display:${addPropertyFormOpen ? '' : 'none'};padding-top:4px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:4px;">

          <!-- Col 1: Identity & purchase -->
          <div>
            <div class="section-label" style="margin-top:0;margin-bottom:10px;">Property details</div>

            ${multiPerson ? `
            <label class="form-label">Owner</label>
            <select class="form-input" id="propPerson">${personOptions}</select>` :
            `<input type="hidden" id="propPerson" value="${personIdx}">`}

            <label class="form-label" style="margin-top:10px;">Nickname / label</label>
            <input class="form-input" id="propNickname" placeholder="e.g. Main Home, The Cottage">

            <label class="form-label" style="margin-top:10px;">Full address</label>
            <input class="form-input" id="propAddress" placeholder="e.g. 12 Oak Lane, Leeds, LS1 1AA">

            <label class="form-label" style="margin-top:10px;">Property type</label>
            <select class="form-input" id="propType">${propTypeOptions}</select>

            <label class="form-label" style="margin-top:10px;">Tenure</label>
            <select class="form-input" id="propTenure"
              onchange="togglePropLeaseFields()">${tenureOptions}</select>

            <div id="propLeaseFields" style="display:none;">
              <label class="form-label" style="margin-top:10px;">Lease years remaining</label>
              <input class="form-input" id="propLeaseYears" type="number" placeholder="e.g. 85">
              <label class="form-label" style="margin-top:10px;">Service charge /yr (£)</label>
              <input class="form-input" id="propServiceCharge" placeholder="e.g. 2,400">
              <label class="form-label" style="margin-top:10px;">Ground rent /yr (£)</label>
              <input class="form-input" id="propGroundRent" placeholder="e.g. 250">
            </div>

            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
              <div class="section-label" style="margin-top:0;margin-bottom:10px;">Purchase</div>
              <label class="form-label">Purchase price (£)</label>
              <input class="form-input" id="propPurchasePrice" placeholder="e.g. 350,000">
              <label class="form-label" style="margin-top:10px;">Deposit paid (£)</label>
              <input class="form-input" id="propDeposit" placeholder="e.g. 35,000">
              <label class="form-label" style="margin-top:10px;">Purchase date</label>
              <input class="form-input" id="propPurchaseDate" type="date">
              <label class="form-label" style="margin-top:10px;">
                Current est. value (£)
                <span style="color:var(--muted);font-variation-settings:'wght' 400;"> — optional</span>
              </label>
              <input class="form-input" id="propEstValue" placeholder="defaults to purchase price">
            </div>
          </div>

          <!-- Col 2: Mortgage -->
          <div>
            <div class="section-label" style="margin-top:0;margin-bottom:10px;">Mortgage</div>
            <label class="form-label">Mortgage type</label>
            <select class="form-input" id="propMortgageType"
              onchange="togglePropMortgageFields()">${mortTypeOptions}</select>

            <div id="propMortgageFields">
              <label class="form-label" style="margin-top:10px;">Lender</label>
              <input class="form-input" id="propMortgageLender" placeholder="e.g. Nationwide">

              <label class="form-label" style="margin-top:10px;">Outstanding balance (£)</label>
              <input class="form-input" id="propMortgageBalance" placeholder="e.g. 210,000">

              <label class="form-label" style="margin-top:10px;">Interest rate (%)</label>
              <input class="form-input" id="propMortgageRate" type="number" step="0.01" placeholder="e.g. 4.29">

              <label class="form-label" style="margin-top:10px;">Monthly payment (£)</label>
              <div style="display:flex;gap:6px;align-items:stretch;">
                <input class="form-input" id="propMortgageMonthly" placeholder="e.g. 1,150"
                  style="flex:1;margin:0;">
                <button class="icon-btn" onclick="calcAndFillMonthlyPayment()"
                  title="Estimate from balance, rate & end date"
                  style="flex-shrink:0;font-size:11px;padding:0 10px;width:auto;
                         border-radius:var(--radius-sm);height:auto;">
                  Calc
                </button>
              </div>

              <label class="form-label" style="margin-top:10px;">Deal / fix end date</label>
              <input class="form-input" id="propMortgageEndDate" type="date">

              <label class="form-label" style="margin-top:10px;">
                Account number
                <span style="color:var(--muted);font-variation-settings:'wght' 400;"> — optional</span>
              </label>
              <input class="form-input" id="propMortgageAccountNo" placeholder="optional">
            </div>
          </div>

          <!-- Col 3: Rental & notes -->
          <div>
            <div class="section-label" style="margin-top:0;margin-bottom:10px;">Rental income</div>
            <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="propIsRented" onchange="togglePropRentalFields()">
              Currently rented out
            </label>

            <div id="propRentalFields" style="display:none;">
              <label class="form-label" style="margin-top:10px;">Monthly rent received (£)</label>
              <input class="form-input" id="propRentalMonthly" placeholder="e.g. 1,400">
              <label class="form-label" style="margin-top:10px;">Tenancy start</label>
              <input class="form-input" id="propTenancyStart" type="date">
              <label class="form-label" style="margin-top:10px;">Tenancy end</label>
              <input class="form-input" id="propTenancyEnd" type="date">
              <label class="form-label" style="margin-top:10px;">Agent fees (%)</label>
              <input class="form-input" id="propAgentFees" type="number" step="0.1" placeholder="e.g. 10">
            </div>

            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
              <div class="section-label" style="margin-top:0;margin-bottom:8px;">Notes</div>
              <textarea class="form-input" id="propNotes" rows="3"
                style="resize:vertical;min-height:70px;"
                placeholder="Any notes about this property…"></textarea>
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;">
              <button class="icon-btn" onclick="toggleAddPropertyForm()"
                style="font-size:12px;padding:6px 14px;width:auto;border-radius:var(--radius-sm);">
                Cancel
              </button>
              <button class="icon-btn edit" onclick="addProperty()"
                style="flex:1;font-size:13px;padding:9px 0;width:auto;border-radius:var(--radius-sm);
                       background:var(--green);color:#fff;border-color:var(--green);">
                ＋ Save property
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

function toggleAddPropertyForm() {
  addPropertyFormOpen = !addPropertyFormOpen;
  const body    = document.getElementById('addPropertyFormBody');
  const chevron = document.getElementById('addPropChevron');
  if (body)    body.style.display      = addPropertyFormOpen ? '' : 'none';
  if (chevron) chevron.style.transform = addPropertyFormOpen ? 'rotate(90deg)' : 'rotate(0deg)';
}

// ─── Delete ───────────────────────────────────────────────────────

function deleteProperty(i) {
  if (!confirm('Delete this property? This cannot be undone.')) return;
  S.properties.splice(i, 1);
  save(); renderProperties(); toast('Deleted');
}

// ─── Add property (submit) ────────────────────────────────────────

function addProperty() {
  if (!S.properties) S.properties = [];
  const gV = id => (document.getElementById(id)?.value || '').trim();
  const gM = id => parseMoney(document.getElementById(id)?.value) || 0;
  const gF = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gC = id => document.getElementById(id)?.checked || false;

  const purchasePrice = gM('propPurchasePrice');
  const estValue      = gM('propEstValue') || purchasePrice;
  if (!purchasePrice && !estValue) { toast('Please enter a purchase price or estimated value.'); return; }

  const prop = {
    person:            parseInt(gV('propPerson')) || 0,
    nickname:          gV('propNickname'),
    address:           gV('propAddress'),
    type:              gV('propType'),
    tenure:            gV('propTenure'),
    purchasePrice,
    depositAmount:     gM('propDeposit'),
    purchaseDate:      gV('propPurchaseDate'),
    estValue,
    mortgageType:      gV('propMortgageType'),
    mortgageLender:    gV('propMortgageLender'),
    mortgageBalance:   gM('propMortgageBalance'),
    mortgageRate:      gF('propMortgageRate'),
    mortgageMonthly:   gM('propMortgageMonthly'),
    mortgageEndDate:   gV('propMortgageEndDate'),
    mortgageAccountNo: gV('propMortgageAccountNo'),
    leaseYears:        gF('propLeaseYears')     || null,
    serviceCharge:     gM('propServiceCharge')  || null,
    groundRent:        gM('propGroundRent')      || null,
    isRented:          gC('propIsRented'),
    rentalMonthly:     gM('propRentalMonthly'),
    tenancyStart:      gV('propTenancyStart'),
    tenancyEnd:        gV('propTenancyEnd'),
    agentFeesPct:      gF('propAgentFees')       || null,
    notes:             gV('propNotes'),
  };

  S.properties.push(prop);
  save();
  addPropertyFormOpen = false;
  toast('Property saved ✓');
  switchPropPerson(prop.person);
  renderProperties();
}

// ─── Add-form field toggle helpers ───────────────────────────────

function togglePropMortgageFields() {
  const f = document.getElementById('propMortgageFields');
  if (f) f.style.display = document.getElementById('propMortgageType')?.value === 'none' ? 'none' : '';
}
function togglePropRentalFields() {
  const f = document.getElementById('propRentalFields');
  if (f) f.style.display = document.getElementById('propIsRented')?.checked ? '' : 'none';
}
function togglePropLeaseFields() {
  const f = document.getElementById('propLeaseFields');
  if (f) f.style.display = document.getElementById('propTenure')?.value === 'leasehold' ? '' : 'none';
}

function calcAndFillMonthlyPayment() {
  const principal = parseMoney(document.getElementById('propMortgageBalance')?.value) || 0;
  const rate      = parseFloat(document.getElementById('propMortgageRate')?.value) || 0;
  const endDate   = document.getElementById('propMortgageEndDate')?.value;
  if (!principal || !rate || !endDate) { toast('Fill in balance, rate & end date first'); return; }
  const years   = Math.max(0.5, (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24 * 365.25));
  const monthly = calcMortgageMonthly(principal, rate, years);
  const el      = document.getElementById('propMortgageMonthly');
  if (el) { el.value = monthly.toLocaleString('en-GB'); toast(`Estimated: £${monthly.toLocaleString('en-GB')}/mo`); }
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
              <th>Property</th><th>Owner</th><th>Type</th>
              <th>Est. value</th><th>Mortgage</th><th>Equity</th>
              <th>LTV</th><th>Rental/mo</th><th>Yield</th>
            </tr>
          </thead>
          <tbody>
            ${allProps.map(p => {
              const m        = calcPropertyMetrics(p);
              const owner    = S.settings.personNames[p.person || 0] || '—';
              const typeLbl  = PROPERTY_TYPES.find(t => t.value === p.type)?.label?.split(' ')[0] || '—';
              const ltvColor = m.ltv > 90 ? 'var(--red)' : m.ltv > 80 ? 'var(--amber,#b87309)' : 'var(--green)';
              return `<tr>
                <td style="font-variation-settings:'wght' 600;">${p.nickname || p.address || '—'}</td>
                <td>${owner}</td>
                <td><span class="pill p-income" style="font-size:10px;">${typeLbl}</span></td>
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

  setTimeout(() => {
    const ctx = document.getElementById('hhPropChart');
    if (!ctx) return;
    if (window._hhPropChart) window._hhPropChart.destroy();
    const perPerson = S.settings.personNames.map((name, i) => {
      const equity = allProps.filter(p => (p.person || 0) === i)
        .reduce((s, p) => s + calcPropertyMetrics(p).equity, 0);
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
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 10, padding: 10 } },
          tooltip: { callbacks: { label: c => `£${fmt(c.parsed)}` } }
        }
      }
    });
  }, 60);
}