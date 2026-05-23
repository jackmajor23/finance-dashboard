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
  { value: 'residential', label: 'Residential (Main Home)' },
  { value: 'buy-to-let', label: 'Buy-to-Let' },
  { value: 'holiday-let', label: 'Holiday Let' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land / Plot' },
];

const MORTGAGE_TYPES = [
  { value: 'repayment', label: 'Repayment' },
  { value: 'interest-only', label: 'Interest Only' },
  { value: 'none', label: 'No Mortgage' },
];

const TENURE_TYPES = [
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'share', label: 'Share of Freehold' },
];

const MOVING_STEPS = [
  { key: 'bid_placed', label: 'Bid placed' },
  { key: 'offer_accepted', label: 'Offer accepted' },
  { key: 'mortgage_applied', label: 'Mortgage applied' },
  { key: 'mortgage_offered', label: 'Mortgage offer received' },
  { key: 'survey_completed', label: 'Survey completed' },
  { key: 'contracts_exchanged', label: 'Contracts exchanged' },
  { key: 'completion_date_set', label: 'Completion date set' },
  { key: 'completed', label: 'Completed' },
];

let editingPropertyIdx = null;
let currentPropPersonIdx = 0;
let addPropertyFormOpen = false;
let propSort = { col: 'value', dir: 'desc' };
let addRentedPropertyFormOpen = false;

// ─── Calculations ─────────────────────────────────────────────────

function formatLastUpdated(isoString) {
  if (!isoString) return 'never';
  const d = new Date(isoString);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins === 1 ? '1 min ago' : `${mins} mins ago`;
  if (hrs < 24) return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function calcSDLT(price, isAdditional = false) {
  const standard = [
    { from: 0, to: 250000, rate: 0 },
    { from: 250000, to: 925000, rate: 5 },
    { from: 925000, to: 1500000, rate: 10 },
    { from: 1500000, to: Infinity, rate: 12 },
  ];
  const additional = [
    { from: 0, to: 125000, rate: 5 },
    { from: 125000, to: 250000, rate: 7 },
    { from: 250000, to: 925000, rate: 10 },
    { from: 925000, to: 1500000, rate: 15 },
    { from: 1500000, to: Infinity, rate: 17 },
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
  const purchasePrice = prop.purchasePrice || 0;
  const depositAmount = prop.depositAmount || 0;
  const depositPct = purchasePrice > 0 ? (depositAmount / purchasePrice) * 100 : 0;
  const estValue = prop.estValue || purchasePrice;
  const mortgageBalance = prop.mortgageBalance || 0;
  const equity = estValue - mortgageBalance;
  const equityPct = estValue > 0 ? (equity / estValue) * 100 : 0;
  const capitalGain = estValue - purchasePrice;
  const capitalGainPct = purchasePrice > 0 ? (capitalGain / purchasePrice) * 100 : 0;
  const ltv = estValue > 0 ? (mortgageBalance / estValue) * 100 : 0;
  const rentalMonthly = prop.rentalMonthly || 0;
  const rentalAnnual = rentalMonthly * 12;
  const mortgageMonthly = prop.mortgageMonthly || 0;
  const rentalYield = estValue > 0 && rentalAnnual > 0 ? (rentalAnnual / estValue) * 100 : 0;
  const netRentalMonthly = rentalMonthly - mortgageMonthly;
  const isAdditional = ['buy-to-let', 'holiday-let', 'commercial'].includes(prop.type);
  const sdlt = prop.sdltOverrideEnabled ? Number(prop.sdltOverride || 0) : calcSDLT(purchasePrice, isAdditional);

  let remainingYears = null;
  if (prop.mortgageEndDate) {
    const end = new Date(prop.mortgageEndDate);
    remainingYears = Math.max(0, (end - new Date()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  return {
    purchasePrice, depositAmount, depositPct, estValue,
    mortgageBalance, equity, equityPct, capitalGain, capitalGainPct,
    ltv, rentalMonthly, rentalAnnual, mortgageMonthly, rentalYield,
    netRentalMonthly, sdlt, sdltIsOverridden: !!prop.sdltOverrideEnabled, remainingYears,
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

  const allPeople = [...S.settings.personNames];
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

  const el = document.getElementById('propertiesContent');
  const isHH = showHousehold && currentPropPersonIdx === S.settings.personNames.length;
  if (isHH) renderHouseholdProperties(el);
  else renderPersonProperties(el, currentPropPersonIdx);
}

function switchPropPerson(idx) {
  currentPropPersonIdx = idx;
  renderProperties();
}

// ─── Render: single person ────────────────────────────────────────

function renderPersonProperties(el, personIdx) {
  const props = (S.properties || []).filter(p => (p.person || 0) === personIdx);
  const personName = S.settings.personNames[personIdx];
  let summaryHTML = '';

  if (props.length) {
    let totalValue = 0, totalMortgage = 0, totalEquity = 0, totalRental = 0, totalGain = 0;
    props.forEach(p => {
      const m = calcPropertyMetrics(p);
      totalValue += m.estValue;
      totalMortgage += m.mortgageBalance;
      totalEquity += m.equity;
      totalRental += m.rentalMonthly;
      totalGain += m.capitalGain;
    });
    const gainColor = totalGain >= 0 ? 'var(--green)' : 'var(--red)';

    summaryHTML = `
      <div class="sal-breakdown-grid" style="grid-template-columns:repeat(4,1fr);">
        <div class="sal-card">
          <div class="sal-label">Portfolio value</div>
          <div class="sal-val val">${fmt(totalValue)}</div>
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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div class="section-label" style="margin:0;">Properties · ${personName}</div>
        <div style="display:flex;gap:8px;">
          <button class="icon-btn" onclick="toggleAddRentedPropertyForm()" style="font-size:12px;padding:8px 16px;border-radius:var(--radius-sm);${addRentedPropertyFormOpen ? 'border-color:var(--blue);color:var(--blue);' : ''}">
            I rent
          </button>
          <button class="icon-btn" onclick="toggleAddPropertyForm()" style="font-size:12px;padding:8px 16px;border-radius:var(--radius-sm);${addPropertyFormOpen ? 'border-color:var(--blue);color:var(--blue);' : ''}">
            ＋ Add property
          </button>
        </div>
      </div>

      ${addRentedPropertyFormOpen ? renderAddRentedPropertyForm() : ''}

      ${addPropertyFormOpen ? renderAddPropertyFormHTML() : ''}

      ${props.map(p => renderPropertyCard(p, S.properties.indexOf(p))).join('')}
    `;
  } else {
    summaryHTML = `<div class="empty"><div class="ei">🏠</div>
      <p>No properties added for ${personName} yet. Use the form below to add one.</p></div>`;
  }

  el.innerHTML = summaryHTML;

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
        tooltip: {
          callbacks: {
            label: c => {
              const value = c.parsed;
              const dataset = c.chart.data.datasets[c.datasetIndex];
              const total = dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${c.label}: ${fmt(value)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ─── Render: property card (view mode) ───────────────────────────

function renderPropertyCard(prop, globalIdx) {
  const m = calcPropertyMetrics(prop);
  const typeLabel = PROPERTY_TYPES.find(t => t.value === prop.type)?.label || 'Residential';
  const tenureLabel = TENURE_TYPES.find(t => t.value === prop.tenure)?.label || '';
  const ltvColor = m.ltv > 90 ? 'var(--red)' : m.ltv > 80 ? 'var(--amber,#b87309)' : m.ltv > 60 ? 'var(--blue,#1d6fca)' : 'var(--green)';
  const gainPrefix = m.capitalGain >= 0 ? '+' : '';
  const hasMortgage = prop.mortgageType !== 'none';
  const mapsQuery = encodeURIComponent(prop.address || prop.nickname || '');

  // Location pin icon (left of address)
  const pinIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"
    style="flex-shrink:0;margin-right:3px;"
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
    ? `<div style="display:flex;align-items:center;font-size:11px;color:var(--muted);margin-top:3px;">
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
          <div class="acc-bal-edit flex-row gap-8" style="cursor:pointer;" onclick="toggleEditPropEstValue(${globalIdx})">
            <span class="sal-val val" style="font-size:15px;" id="propEstValueDisplay${globalIdx}">${fmt(m.estValue)}</span>
            <span style="font-size:12px;color:var(--muted2);">✎</span>
          </div>
          <div id="propEstValueInput${globalIdx}" style="display:none;gap:6px;margin-top:4px;">
            <input type="text" id="propEstValue${globalIdx}" value="${m.estValue.toLocaleString('en-GB')}"
                   oninput="formatMoney(this)" style="flex:1;font-size:15px;font-weight:600;padding:4px;border:1px solid var(--blue);border-radius:4px;"/>
            <button class="icon-btn" onclick="savePropEstValue(${globalIdx})" style="color:var(--green);">✓</button>
            <button class="icon-btn" onclick="toggleEditPropEstValue(${globalIdx})" style="color:var(--muted2);">✕</button>
          </div>
          <div class="sal-sub">current estimate</div>
          <div style="font-size:11px;color:var(--muted3);margin-top:6px;margin-bottom:4px;">Last updated: <em>${formatLastUpdated(prop.estValueLastUpdated)}</em></div>
        </div>
        <div class="sal-card" style="padding:10px;">
          <div class="sal-label">Purchase price</div>
          <div class="acc-bal-edit flex-row gap-8" style="cursor:pointer;" onclick="toggleEditPropPurchasePrice(${globalIdx})">
            <span class="sal-val val" style="font-size:15px;" id="propPurchasePriceDisplay${globalIdx}">${fmt(m.purchasePrice)}</span>
            <span style="font-size:12px;color:var(--muted2);">✎</span>
          </div>
          <div id="propPurchasePriceInput${globalIdx}" style="display:none;gap:6px;margin-top:4px;">
            <input type="text" id="propPurchasePrice${globalIdx}" value="${m.purchasePrice.toLocaleString('en-GB')}"
                   oninput="formatMoney(this)" style="flex:1;font-size:15px;font-weight:600;padding:4px;border:1px solid var(--blue);border-radius:4px;"/>
            <button class="icon-btn" onclick="savePropPurchasePrice(${globalIdx})" style="color:var(--green);">✓</button>
            <button class="icon-btn" onclick="toggleEditPropPurchasePrice(${globalIdx})" style="color:var(--muted2);">✕</button>
          </div>
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
            <tr><td>SDLT ${m.sdltIsOverridden ? '(manual)' : '(est.)'}<span class="info-tooltip info-icon" data-tooltip="Stamp Duty Land Tax - tax paid on property purchases over £250,000. Manual overrides can reflect regional holidays, first-time-buyer relief or special fiscal periods.">i</span></td><td class="neg val">${fmt(m.sdlt)}</td></tr>
            ${prop.tenure ? `<tr><td>Tenure<span class="info-tooltip info-icon" data-tooltip="Freehold: you own the property and land outright. Leasehold: you own the property for a fixed period, then it returns to the freeholder.">i</span></td><td>${tenureLabel}</td></tr>` : ''}
            ${prop.leaseYears ? `<tr><td>Lease remaining</td><td>${prop.leaseYears} yrs</td></tr>` : ''}
            ${prop.serviceCharge ? `<tr><td>Service charge</td><td class="neg val">${fmt(prop.serviceCharge)}/yr</td></tr>` : ''}
            ${prop.groundRent ? `<tr><td>Ground rent</td><td class="neg val">${fmt(prop.groundRent)}/yr</td></tr>` : ''}
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
            ${prop.mortgageEndDate ? `<tr><td>Deal ends</td><td>${fmtDate(prop.mortgageEndDate)}</td></tr>` : ''}
            ${m.remainingYears !== null ? `<tr><td>Years remaining</td><td>${m.remainingYears.toFixed(1)} yrs</td></tr>` : ''}
            ${prop.mortgageAccountNo ? `<tr><td>Account no.</td><td style="font-size:11px;">${prop.mortgageAccountNo}</td></tr>` : ''}
          </table>` : `<div style="font-size:12px;color:var(--muted);padding:8px 0;">No mortgage — owned outright.</div>`}
          ${renderMortgageLedger(prop)}
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
            ${prop.hasTenancyEnd && prop.tenancyEnd ? `<tr><td>Tenancy to</td><td>${fmtDate(prop.tenancyEnd)}</td></tr>` : ''}
            ${!prop.hasTenancyEnd ? `<tr><td>Tenancy</td><td><span style="font-size:18px;">⟳</span> Rolling contract</td></tr>` : ''}
            ${prop.agentFeesPct ? `<tr><td>Agent fees</td><td class="neg val">${prop.agentFeesType === 'percent' ? prop.agentFeesPct + '%' : fmt(prop.agentFeesPct)}</td></tr>` : ''}
            ${prop.tenantNames ? `<tr><td>Tenants</td><td>${prop.tenantNames}</td></tr>` : ''}
            ${prop.tenantSince ? `<tr><td>Tenant since</td><td>${fmtDate(prop.tenantSince)}</td></tr>` : ''}
          </table>` : `
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Equity split</div>
          <div style="height:130px;"><canvas id="propChart_${globalIdx}"></canvas></div>`}
        </div>
      </div>

      ${prop.notes ? `<div style="padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);font-size:12px;color:var(--muted2);margin-top:14px;">📝 ${prop.notes}</div>` : ''}

      ${renderTenantTimeline(prop)}
      ${prop.movingProcess ? renderMovingProcessTracker(prop, globalIdx) : ''}
    </div>
  `;
}

function renderMortgageLedger(prop) {
  const ledger = Array.isArray(prop.mortgageLedger) ? prop.mortgageLedger : [];
  if (!ledger.length) return '';
  return `<details class="prop-ledger" style="margin-top:10px;">
    <summary>Mortgage history</summary>
    <div class="prop-ledger-list">
      ${ledger.slice().reverse().map(entry => `
        <div class="prop-ledger-row">
          <span>${fmtDate(entry.date)}</span>
          <span>${entry.lender || '—'}</span>
          <span class="val">${fmt(entry.balance || 0)}</span>
          <span>${Number(entry.rate || 0).toFixed(2)}%</span>
        </div>`).join('')}
    </div>
  </details>`;
}

function renderTenantTimeline(prop) {
  const timeline = Array.isArray(prop.tenantTimeline) ? prop.tenantTimeline : [];
  const derived = prop.isRented && (prop.tenantNames || prop.tenancyStart || prop.rentalMonthly)
    ? [{ tenantNames: prop.tenantNames || 'Current tenant', rent: prop.rentalMonthly, start: prop.tenancyStart || prop.tenantSince, end: prop.hasTenancyEnd ? prop.tenancyEnd : '' }]
    : [];
  const rows = timeline.length ? timeline : derived;
  if (!rows.length) return '';
  return `<div class="tenant-timeline">
    <div class="section-label" style="margin-top:0;margin-bottom:10px;">Tenant timeline</div>
    ${rows.map(row => `
      <div class="tenant-timeline-row">
        <span class="tenant-dot"></span>
        <div>
          <div style="font-variation-settings:'wght' 650;">${row.tenantNames || 'Tenant'}</div>
          <div style="color:var(--muted);font-size:11px;">${row.start ? fmtDate(row.start) : 'Start unknown'}${row.end ? ` to ${fmtDate(row.end)}` : ' to present'} · ${fmt(row.rent || 0)}/mo</div>
        </div>
      </div>`).join('')}
  </div>`;
}

function renderMovingProcessTracker(prop, globalIdx) {
  if (!prop.movingProcess || !prop.movingProcess.enabled) return '';

  const completedSteps = MOVING_STEPS.filter(step => prop.movingProcess[step.key]).length;
  const totalSteps = MOVING_STEPS.length;
  const progressPct = (completedSteps / totalSteps) * 100;

  return `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
      <div class="section-label" style="margin-top:0;margin-bottom:12px;">House moving process</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;text-transform:capitalize;">
        Perspective: ${prop.movingProcess.perspective || 'buying'}
      </div>
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;color:var(--muted);">
          <span>Progress</span>
          <span>${completedSteps}/${totalSteps} steps (${progressPct.toFixed(0)}%)</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
          <div style="height:100%;background:var(--blue);border-radius:3px;transition:width .3s;width:${progressPct}%;"></div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${MOVING_STEPS.map(step => {
    const isComplete = prop.movingProcess[step.key];
    return `
            <button onclick="toggleMovingStep(${globalIdx}, '${step.key}')"
              style="padding:6px 12px;border-radius:var(--radius-sm);font-size:11px;cursor:pointer;
                     border:1px solid ${isComplete ? 'var(--blue)' : 'var(--border2)'};
                     background:${isComplete ? 'var(--blue-dim)' : 'transparent'};
                     color:${isComplete ? 'var(--blue)' : 'var(--muted2)'};
                     transition:all .13s;">
              ${isComplete ? '✓ ' : ''}${step.label}
            </button>
          `;
  }).join('')}
      </div>
      ${prop.movingProcess.notes ? `
        <div style="margin-top:12px;padding:8px 12px;background:var(--surface2);border-radius:var(--radius-sm);font-size:11px;color:var(--muted2);">
          📝 ${prop.movingProcess.notes}
        </div>
      ` : ''}
    </div>
  `;
}

function toggleMovingStep(globalIdx, stepKey) {
  const prop = S.properties[globalIdx];
  if (!prop.movingProcess) prop.movingProcess = { enabled: true };
  prop.movingProcess[stepKey] = !prop.movingProcess[stepKey];
  save();
  renderProperties();
}

function toggleEditMovingEnabled(globalIdx) {
  const checkbox = document.getElementById(`ep-moving-enabled`);
  const stepsDiv = document.getElementById(`ep-moving-steps-${globalIdx}`);
  if (checkbox && stepsDiv) {
    stepsDiv.style.display = checkbox.checked ? 'block' : 'none';
  }
}

// ─── Render: rented properties (user is renting) ───────────────────────

function renderRentedPropertiesSection(el) {
  const rentedProps = S.rentedProperties || [];
  if (!rentedProps.length) {
    el.innerHTML = `
      <div class="empty"><div class="ei">🏠</div><p>No rental properties added yet.</p>
        <button class="icon-btn" onclick="toggleAddRentedPropertyForm()" style="margin-top:12px;${addRentedPropertyFormOpen ? 'border-color:var(--blue);color:var(--blue);' : ''}">I rent</button>
      </div>`;
    return;
  }

  let totalRent = 0;
  rentedProps.forEach(r => totalRent += r.monthlyRent);

  el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;align-items:center;margin-bottom:16px;">
      <button class="icon-btn" onclick="toggleAddRentedPropertyForm()" style="font-size:12px;padding:8px 16px;border-radius:var(--radius-sm);${addRentedPropertyFormOpen ? 'border-color:var(--blue);color:var(--blue);' : ''}">
        I rent
      </button>
    </div>
    <div class="sal-breakdown-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px;">
      <div class="sal-card"><div class="sal-label">Monthly rent</div><div class="sal-val neg val">${fmt(totalRent)}/mo</div><div class="sal-sub">${fmt(totalRent * 12)}/yr</div></div>
      <div class="sal-card"><div class="sal-label">Properties</div><div class="sal-val val">${rentedProps.length}</div><div class="sal-sub">rental homes</div></div>
      <div class="sal-card"><div class="sal-label">Total deposits</div><div class="sal-val val">${fmt(rentedProps.reduce((s, r) => s + (r.deposit || 0), 0))}</div><div class="sal-sub">held by landlords</div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;">
      ${rentedProps.map((r, i) => renderRentedPropertyCard(r, i)).join('')}
    </div>
  `;
}

function renderRentedPropertyCard(r, idx) {
  const rentHistory = r.rentHistory || [];
  const currentRent = rentHistory.length > 0 ? rentHistory[rentHistory.length - 1].amount : r.monthlyRent;
  const isRolling = !r.hasTenancyEnd;

  return `
    <div class="card" id="rentedPropCard_${idx}">
      <div class="card-header" style="justify-content:space-between;">
        <span class="card-title">${r.nickname || r.address || 'Rental Property'}</span>
        <div style="display:flex;gap:8px;">
          <button class="icon-btn edit" onclick="openEditRentedProperty(${idx})" title="Edit">✎</button>
          <button class="icon-btn del" onclick="deleteRentedProperty(${idx})" title="Delete">✕</button>
        </div>
      </div>

      <div style="padding:14px;">
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;">
          <div class="sal-card" style="padding:10px;">
            <div class="sal-label">Monthly rent</div>
            <div class="sal-val neg val" style="font-size:15px;">${fmt(currentRent)}</div>
            <div class="sal-sub">current</div>
          </div>
          <div class="sal-card" style="padding:10px;">
            <div class="sal-label">Landlord</div>
            <div class="sal-val val" style="font-size:15px;">${r.landlordName || '—'}</div>
            <div class="sal-sub">${r.landlordContact || ''}</div>
          </div>
        </div>

        <div class="section-label" style="margin-top:0;margin-bottom:8px;">Tenancy details</div>
        <table class="tax-band-table">
          <tr><td>Started</td><td>${fmtDate(r.tenancyStart)}</td></tr>
          ${r.hasTenancyEnd && r.tenancyEnd ? `<tr><td>Ends</td><td>${fmtDate(r.tenancyEnd)}</td></tr>` : ''}
          ${isRolling ? `<tr><td>Type</td><td><span style="font-size:18px;">⟳</span> Rolling contract</td></tr>` : ''}
          ${r.deposit ? `<tr><td>Deposit</td><td class="neg val">${fmt(r.deposit)}</td></tr>` : ''}
        </table>

        ${rentHistory.length > 1 ? `
          <div class="section-label" style="margin-top:12px;margin-bottom:8px;">Rent history</div>
          <div style="max-height:120px;overflow-y:auto;">
            ${rentHistory.slice().reverse().map(h => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border2);font-size:11px;">
                <span>${fmtDate(h.date)}</span>
                <span class="val">${fmt(h.amount)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${r.notes ? `<div style="padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);font-size:12px;color:var(--muted2);margin-top:14px;">📝 ${r.notes}</div>` : ''}
      </div>
    </div>
  `;
}

function renderAddRentedPropertyForm() {
  return `
    <div class="card" style="margin-top:16px;display:flex;flex-direction:column;">
      <div class="card-header" style="justify-content:flex-end;">
        <button class="icon-btn del" onclick="toggleAddRentedPropertyForm()">✕</button>
      </div>
      <div style="padding:14px;">
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
          <div>
            <label class="form-label">Property name / address</label>
            <input class="form-input" id="rentedPropNickname" placeholder="e.g. Flat 4, 123 Oak Street">
          </div>

          <div>
            <label class="form-label">Monthly rent (£)</label>
            <input class="form-input" id="rentedPropRent" placeholder="£ e.g. 1,200">
          </div>

          <div>
            <label class="form-label">Landlord name</label>
            <input class="form-input" id="rentedPropLandlord" placeholder="e.g. John Smith">
          </div>

          <div>
            <label class="form-label">Landlord contact</label>
            <input class="form-input" id="rentedPropLandlordContact" placeholder="e.g. 07700 900000">
          </div>

          <div>
            <label class="form-label">Tenancy start date</label>
            <input class="form-input" id="rentedPropStart" type="date">
          </div>

          <div>
            <label class="form-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="rentedPropHasEnd" onchange="toggleRentedPropEnd()">
              Has end date
            </label>
            <div id="rentedPropEndWrapper" style="display:none;margin-top:10px;">
              <label class="form-label">Tenancy end date</label>
              <input class="form-input" id="rentedPropEnd" type="date">
            </div>
          </div>

          <div>
            <label class="form-label">Deposit (£)</label>
            <input class="form-input" id="rentedPropDeposit" placeholder="£ e.g. 2,400">
          </div>

          <div>
            <label class="form-label">Notes</label>
            <textarea class="form-input" id="rentedPropNotes" rows="3" placeholder="Any notes about this rental…"></textarea>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="icon-btn" onclick="toggleAddRentedPropertyForm()" style="flex:1;">Cancel</button>
          <button class="icon-btn edit" onclick="addRentedProperty()" style="flex:2;background:var(--green);color:#fff;border-color:var(--green);">＋ Add</button>
        </div>
      </div>
    </div>
  `;
}

function toggleAddRentedPropertyForm() {
  addRentedPropertyFormOpen = !addRentedPropertyFormOpen;
  if (addRentedPropertyFormOpen) addPropertyFormOpen = false;
  renderProperties();
}

function toggleRentedPropEnd() {
  const hasEnd = document.getElementById('rentedPropHasEnd')?.checked;
  const wrapper = document.getElementById('rentedPropEndWrapper');
  if (wrapper) wrapper.style.display = hasEnd ? '' : 'none';
}

function addRentedProperty() {
  if (!S.rentedProperties) S.rentedProperties = [];
  const gV = id => (document.getElementById(id)?.value || '').trim();
  const gM = id => parseMoney(document.getElementById(id)?.value) || 0;
  const gC = id => document.getElementById(id)?.checked || false;

  const monthlyRent = gM('rentedPropRent');
  if (!monthlyRent) { toast('Please enter monthly rent.'); return; }

  const rentedProp = {
    nickname: gV('rentedPropNickname'),
    monthlyRent,
    landlordName: gV('rentedPropLandlord'),
    landlordContact: gV('rentedPropLandlordContact'),
    tenancyStart: gV('rentedPropStart'),
    tenancyEnd: gV('rentedPropEnd'),
    hasTenancyEnd: gC('rentedPropHasEnd'),
    deposit: gM('rentedPropDeposit'),
    notes: gV('rentedPropNotes'),
    rentHistory: [{ date: new Date().toISOString(), amount: monthlyRent }]
  };

  S.rentedProperties.push(rentedProp);
  save();
  addRentedPropertyFormOpen = false;
  toast('Rental property added ✓');
  renderProperties();
}

function deleteRentedProperty(i) {
  if (!confirm('Delete this rental property?')) return;
  S.rentedProperties.splice(i, 1);
  save();
  renderProperties();
  toast('Deleted');
}

function openEditRentedProperty(idx) {
  // For now, just delete and re-add (simple implementation)
  // Could be expanded to full edit form later
  toast('Edit feature coming soon - delete and re-add for now');
}

// ─── Inline edit form ─────────────────────────────────────────────
// Uses the same form-input / form-label classes as the add form so
// the editing state matches the card's established visual language.

function openEditProperty(globalIdx) {
  editingPropertyIdx = globalIdx;
  const cardEl = document.getElementById(`propCard_${globalIdx}`);
  if (!cardEl) return;

  const p = S.properties[globalIdx];
  const mon = v => (v && v > 0) ? v.toLocaleString('en-GB') : '';

  const propTypeSel = PROPERTY_TYPES.map(t =>
    `<option value="${t.value}" ${p.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('');
  const mortTypeSel = MORTGAGE_TYPES.map(t =>
    `<option value="${t.value}" ${p.mortgageType === t.value ? 'selected' : ''}>${t.label}</option>`).join('');
  const tenureSel = TENURE_TYPES.map(t =>
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
          <input class="form-input" id="ep-servicecharge" value="${mon(p.serviceCharge)}" placeholder="£ e.g. 2,400">
          <label class="form-label" style="margin-top:10px;">Ground rent /yr (£)</label>
          <input class="form-input" id="ep-groundrent" value="${mon(p.groundRent)}" placeholder="£ e.g. 250">
        </div>

        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
          <div class="section-label" style="margin-top:0;margin-bottom:10px;">Purchase</div>
          <label class="form-label">Purchase price (£)</label>
          <input class="form-input" id="ep-purchase" value="${mon(p.purchasePrice)}" placeholder="£ e.g. 350,000">
          <label class="form-label" style="margin-top:10px;">Deposit paid (£)</label>
          <input class="form-input" id="ep-deposit" value="${mon(p.depositAmount)}" placeholder="£ e.g. 35,000">
          <label class="form-label" style="margin-top:10px;">Purchase date</label>
          <input class="form-input" id="ep-purchasedate" type="date" value="${p.purchaseDate || ''}">
          <label class="form-label" style="margin-top:10px;">Current est. value (£)</label>
          <input class="form-input" id="ep-estvalue" value="${mon(p.estValue)}" placeholder="£ e.g. 420,000">
          <label class="form-label" style="margin-top:10px;display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="ep-sdlt-override-enabled" ${p.sdltOverrideEnabled ? 'checked' : ''} onchange="toggleEditSdltOverride(${globalIdx})">
            Manual stamp duty
          </label>
          <div id="ep-sdlt-override-wrap-${globalIdx}" style="display:${p.sdltOverrideEnabled ? '' : 'none'};">
            <input class="form-input" id="ep-sdlt-override" value="${mon(p.sdltOverride)}" placeholder="e.g. 0">
          </div>
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
          <input class="form-input" id="ep-balance" value="${mon(p.mortgageBalance)}" placeholder="£ e.g. 210,000">

          <label class="form-label" style="margin-top:10px;">Interest rate (%)</label>
          <input class="form-input" id="ep-rate" type="number" step="0.01"
            value="${p.mortgageRate || ''}" placeholder="% e.g. 4.29">

          <label class="form-label" style="margin-top:10px;">Monthly payment (£)</label>
          <input class="form-input" id="ep-monthly" value="${mon(p.mortgageMonthly)}" placeholder="£ e.g. 1,150">

          <label class="form-label" style="margin-top:10px;">Deal / fix end date</label>
          <input class="form-input" id="ep-mortend" type="date" value="${p.mortgageEndDate || ''}">

          <label class="form-label" style="margin-top:10px;">
            Account number
            <span style="color:var(--muted);font-variation-settings:'wght' 400;"> — optional</span>
          </label>
          <input class="form-input" id="ep-mortaccno" value="${p.mortgageAccountNo || ''}" placeholder="HSBC123456">
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
          <input class="form-input" id="ep-rental" value="${mon(p.rentalMonthly)}" placeholder="£ e.g. 1,400">
          <label class="form-label" style="margin-top:10px;">Tenancy start</label>
          <input class="form-input" id="ep-tenancystart" type="date" value="${p.tenancyStart || ''}">
          <label class="form-label" style="margin-top:10px; display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" id="ep-hastenancyend" ${p.hasTenancyEnd ? 'checked' : ''} onchange="toggleEditTenancyEnd(${globalIdx})">
            ADD TENANCY END DATE
          </label>
          <div id="ep-tenancyenddate-${globalIdx}" style="display:${p.hasTenancyEnd ? '' : 'none'}">
            <label class="form-label" style="margin-top:10px;">Tenancy end</label>
            <input class="form-input" id="ep-tenancyend" type="date" value="${p.tenancyEnd || ''}">
          </div>
          <label class="form-label" style="margin-top:10px;">Agent fees</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <select class="form-input" id="ep-agentfeestype" onchange="toggleEditAgentFeesType(${globalIdx})" style="width:80px;">
              <option value="percent" ${p.agentFeesType === 'percent' ? 'selected' : ''}>%</option>
              <option value="fixed" ${p.agentFeesType === 'fixed' ? 'selected' : ''}>£</option>
            </select>
            <input class="form-input" id="ep-agentfees" type="number" step="0.01"
              value="${p.agentFeesPct || ''}" placeholder="${p.agentFeesType === 'percent' ? '% e.g. 10' : '£ e.g. 150'}" style="flex:1;">
          </div>
          <label class="form-label" style="margin-top:10px;">Tenant names</label>
          <input class="form-input" id="ep-tenantnames" value="${p.tenantNames || ''}" placeholder="e.g. John Smith, Jane Doe">
          <label class="form-label" style="margin-top:10px;">Tenant since</label>
          <input class="form-input" id="ep-tenantsince" type="date" value="${p.tenantSince || ''}" placeholder="When did they move in?">
        </div>

        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Notes</div>
          <textarea class="form-input" id="ep-notes" rows="4"
            style="resize:vertical;min-height:80px;"
            placeholder="Any notes about this property…">${p.notes || ''}</textarea>
        </div>

        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
          <div class="section-label" style="margin-top:0;margin-bottom:8px;">Moving process</div>
          <label class="form-label">Perspective</label>
          <select class="form-input" id="ep-moving-perspective" style="margin-bottom:8px;">
            <option value="buying" ${p.movingProcess?.perspective === 'buying' ? 'selected' : ''}>Buying</option>
            <option value="selling" ${p.movingProcess?.perspective === 'selling' ? 'selected' : ''}>Selling</option>
          </select>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px;">
            <input type="checkbox" id="ep-moving-enabled" ${(p.movingProcess && p.movingProcess.enabled) ? 'checked' : ''}
              onchange="toggleEditMovingEnabled(${globalIdx})">
            <span style="font-size:12px;color:var(--muted2);">Enable moving process tracker</span>
          </label>
          <div id="ep-moving-steps-${globalIdx}" style="display:${(p.movingProcess && p.movingProcess.enabled) ? 'block' : 'none'};margin-top:8px;">
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${MOVING_STEPS.map(step => {
    const isComplete = p.movingProcess && p.movingProcess[step.key];
    return `
                  <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted2);cursor:pointer;">
                    <input type="checkbox" id="ep-moving-${step.key}" ${isComplete ? 'checked' : ''}
                      onchange="toggleEditMovingStep(${globalIdx}, '${step.key}')">
                    ${step.label}
                  </label>
                `;
  }).join('')}
            </div>
            <label class="form-label" style="margin-top:10px;">Moving notes</label>
            <textarea class="form-input" id="ep-moving-notes" rows="2"
              style="resize:vertical;min-height:50px;"
              placeholder="Any notes about the moving process…">${p.movingProcess?.notes || ''}</textarea>
          </div>
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

function toggleEditMovingStep(globalIdx, stepKey) {
  // This is just for UI toggle during edit, actual save happens in saveEditProperty
}
function toggleEditTenancyEnd(globalIdx) {
  const hasEnd = document.getElementById(`ep-hastenancyend`)?.checked;
  const wrapper = document.getElementById(`ep-tenancyenddate-${globalIdx}`);
  if (wrapper) wrapper.style.display = hasEnd ? '' : 'none';
}
function toggleEditAgentFeesType(globalIdx) {
  const type = document.getElementById(`ep-agentfeestype`)?.value;
  const input = document.getElementById(`ep-agentfees`);
  if (input) {
    input.placeholder = type === 'percent' ? '% e.g. 10' : '£ e.g. 150';
    input.step = type === 'percent' ? '0.1' : '0.01';
  }
}

function toggleEditSdltOverride(globalIdx) {
  const enabled = document.getElementById('ep-sdlt-override-enabled')?.checked;
  const wrapper = document.getElementById(`ep-sdlt-override-wrap-${globalIdx}`);
  if (wrapper) wrapper.style.display = enabled ? '' : 'none';
}

function toggleEditPropEstValue(i) {
  const display = document.querySelector(`#propEstValueInput${i}`).style.display;
  if (display === 'none') {
    document.querySelector(`#propEstValueInput${i}`).style.display = 'flex';
    document.querySelector(`#propEstValue${i}`).focus();
    document.querySelector(`#propEstValue${i}`).select();
  } else {
    document.querySelector(`#propEstValueInput${i}`).style.display = 'none';
  }
}

function savePropEstValue(i) {
  const input = document.getElementById(`propEstValue${i}`);
  const newValue = parseMoney(input.value) || 0;
  if (newValue !== S.properties[i].estValue) {
    S.properties[i].estValue = newValue;
    S.properties[i].estValueLastUpdated = new Date().toISOString();
    save();
    toast('Est. value updated');
  }
  toggleEditPropEstValue(i);
  renderProperties();
}

function toggleEditPropPurchasePrice(i) {
  const display = document.querySelector(`#propPurchasePriceInput${i}`).style.display;
  if (display === 'none') {
    document.querySelector(`#propPurchasePriceInput${i}`).style.display = 'flex';
    document.querySelector(`#propPurchasePrice${i}`).focus();
    document.querySelector(`#propPurchasePrice${i}`).select();
  } else {
    document.querySelector(`#propPurchasePriceInput${i}`).style.display = 'none';
  }
}

function savePropPurchasePrice(i) {
  const input = document.getElementById(`propPurchasePrice${i}`);
  const newValue = parseMoney(input.value) || 0;
  if (newValue !== S.properties[i].purchasePrice) {
    S.properties[i].purchasePrice = newValue;
    save();
    toast('Purchase price updated');
  }
  toggleEditPropPurchasePrice(i);
  renderProperties();
}

// ── Cancel inline edit ────────────────────────────────────────────

function cancelEditProperty(globalIdx) {
  editingPropertyIdx = null;
  const prop = S.properties[globalIdx];
  const cardEl = document.getElementById(`propCard_${globalIdx}`);
  if (!cardEl) { renderProperties(); return; }
  cardEl.outerHTML = renderPropertyCard(prop, globalIdx);
  if (!prop.isRented) setTimeout(() => drawEquityChart(globalIdx, calcPropertyMetrics(prop)), 60);
}

// ── Save inline edit ──────────────────────────────────────────────

function saveEditProperty(globalIdx) {
  if (globalIdx === null || globalIdx === undefined) return;
  const p = S.properties[globalIdx];
  const previousMortgage = {
    lender: p.mortgageLender || '',
    type: p.mortgageType || '',
    balance: Number(p.mortgageBalance || 0),
    rate: Number(p.mortgageRate || 0),
    monthly: Number(p.mortgageMonthly || 0),
    endDate: p.mortgageEndDate || '',
  };
  const gV = id => (document.getElementById(id)?.value || '').trim();
  const gM = id => parseMoney(document.getElementById(id)?.value) || 0;
  const gF = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gC = id => document.getElementById(id)?.checked || false;

  p.nickname = gV('ep-nickname');
  p.address = gV('ep-address');
  p.type = gV('ep-type');
  p.tenure = gV('ep-tenure');
  p.purchasePrice = gM('ep-purchase') || p.purchasePrice;
  p.depositAmount = gM('ep-deposit');
  p.purchaseDate = gV('ep-purchasedate');
  p.estValue = gM('ep-estvalue') || p.estValue;
  p.sdltOverrideEnabled = gC('ep-sdlt-override-enabled');
  p.sdltOverride = p.sdltOverrideEnabled ? gM('ep-sdlt-override') : null;
  p.mortgageType = gV('ep-morttype');
  p.mortgageLender = gV('ep-lender');
  p.mortgageBalance = gM('ep-balance');
  p.mortgageRate = gF('ep-rate');
  p.mortgageMonthly = gM('ep-monthly');
  p.mortgageEndDate = gV('ep-mortend');
  p.mortgageAccountNo = gV('ep-mortaccno');
  p.leaseYears = gF('ep-leaseyears') || null;
  p.serviceCharge = gM('ep-servicecharge') || null;
  p.groundRent = gM('ep-groundrent') || null;
  p.isRented = gC('ep-rented');
  p.rentalMonthly = gM('ep-rental');
  p.tenancyStart = gV('ep-tenancystart');
  p.tenancyEnd = gV('ep-tenancyend');
  p.hasTenancyEnd = gC('ep-hastenancyend');
  p.agentFeesPct = gF('ep-agentfees') || null;
  p.agentFeesType = gV('ep-agentfeestype') || 'percent';
  p.tenantNames = gV('ep-tenantnames');
  p.tenantSince = gV('ep-tenantsince');
  p.notes = gV('ep-notes');
  syncPropertyLedgers(p, previousMortgage);

  // Moving process
  const movingEnabled = document.getElementById(`ep-moving-enabled`)?.checked || false;
  if (movingEnabled) {
    if (!p.movingProcess) p.movingProcess = { enabled: true };
    p.movingProcess.enabled = true;
    p.movingProcess.perspective = gV('ep-moving-perspective') || 'buying';
    MOVING_STEPS.forEach(step => {
      p.movingProcess[step.key] = document.getElementById(`ep-moving-${step.key}`)?.checked || false;
    });
    p.movingProcess.notes = document.getElementById(`ep-moving-notes`)?.value || '';
  } else {
    p.movingProcess = { enabled: false };
  }

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

function syncPropertyLedgers(prop, previousMortgage) {
  if (!Array.isArray(prop.mortgageLedger)) prop.mortgageLedger = [];
  const currentMortgage = {
    lender: prop.mortgageLender || '',
    type: prop.mortgageType || '',
    balance: Number(prop.mortgageBalance || 0),
    rate: Number(prop.mortgageRate || 0),
    monthly: Number(prop.mortgageMonthly || 0),
    endDate: prop.mortgageEndDate || '',
  };
  const changed = Object.keys(currentMortgage).some(key => String(currentMortgage[key]) !== String(previousMortgage[key]));
  if (changed && currentMortgage.type !== 'none') {
    prop.mortgageLedger.push({ date: new Date().toISOString().split('T')[0], ...currentMortgage });
    prop.mortgageLedger = prop.mortgageLedger.slice(-24);
  }

  if (!Array.isArray(prop.tenantTimeline)) prop.tenantTimeline = [];
  if (prop.isRented && (prop.tenantNames || prop.tenancyStart || prop.rentalMonthly)) {
    const latest = prop.tenantTimeline[prop.tenantTimeline.length - 1];
    const entry = {
      tenantNames: prop.tenantNames || 'Current tenant',
      rent: Number(prop.rentalMonthly || 0),
      start: prop.tenancyStart || prop.tenantSince || '',
      end: prop.hasTenancyEnd ? prop.tenancyEnd : '',
    };
    const same = latest && latest.tenantNames === entry.tenantNames && latest.rent === entry.rent && latest.start === entry.start && latest.end === entry.end;
    if (!same) prop.tenantTimeline.push(entry);
    prop.tenantTimeline = prop.tenantTimeline.slice(-20);
  }
}

// ─── Add property form (collapsible card) ─────────────────────────

function renderAddPropertyFormHTML(personIdx) {
  const propTypeOptions = PROPERTY_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`).join('');
  const mortTypeOptions = MORTGAGE_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`).join('');
  const tenureOptions = TENURE_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`).join('');
  const personOptions = (S.settings.personNames || []).map((n, i) =>
    `<option value="${i}" ${i === personIdx ? 'selected' : ''}>${n}</option>`).join('');
  const multiPerson = (S.settings.personNames || []).length > 1;

  return `
    <div class="card" id="addPropertyCard"
      style="margin-bottom:18px;border-style:dashed;border-color:var(--border);">
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
              <input class="form-input" id="propServiceCharge" placeholder="e.g. 2,400" onfocus="addCurrencyPrefix(this)" onblur="removeCurrencyPrefix(this)">
              <label class="form-label" style="margin-top:10px;">Ground rent /yr (£)</label>
              <input class="form-input" id="propGroundRent" placeholder="e.g. 250" onfocus="addCurrencyPrefix(this)" onblur="removeCurrencyPrefix(this)">
            </div>

            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">
              <div class="section-label" style="margin-top:0;margin-bottom:10px;">Purchase</div>
              <label class="form-label">Purchase price (£)</label>
              <input class="form-input" id="propPurchasePrice" placeholder="e.g. 350,000" onfocus="addCurrencyPrefix(this)" onblur="removeCurrencyPrefix(this)">
              <label class="form-label" style="margin-top:10px;">Deposit paid (£)</label>
              <input class="form-input" id="propDeposit" placeholder="e.g. 35,000" onfocus="addCurrencyPrefix(this)" onblur="removeCurrencyPrefix(this)">
              <label class="form-label" style="margin-top:10px;">Purchase date</label>
              <input class="form-input" id="propPurchaseDate" type="date">
              <label class="form-label" style="margin-top:10px;">
                Current est. value (£)
                <span style="color:var(--muted);font-variation-settings:'wght' 400;"> — optional</span>
              </label>
              <input class="form-input" id="propEstValue" placeholder="defaults to purchase price" onfocus="addCurrencyPrefix(this)" onblur="removeCurrencyPrefix(this)">
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
              <input class="form-input" id="propMortgageBalance" placeholder="e.g. 210,000" onfocus="addCurrencyPrefix(this)" onblur="removeCurrencyPrefix(this)">

              <label class="form-label" style="margin-top:10px;">Interest rate (%)</label>
              <input class="form-input" id="propMortgageRate" type="number" step="0.01" placeholder="e.g. 4.29" onfocus="addPercentSuffix(this)" onblur="removePercentSuffix(this)">

              <label class="form-label" style="margin-top:10px;">Monthly payment (£)</label>
              <div style="display:flex;gap:6px;align-items:stretch;">
                <input class="form-input" id="propMortgageMonthly" placeholder="e.g. 1,150" onfocus="addCurrencyPrefix(this)" onblur="removeCurrencyPrefix(this)"
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
              <input class="form-input" id="propMortgageAccountNo" placeholder="e.g. HSBC123456">
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
              <input class="form-input" id="propRentalMonthly" placeholder="e.g. 1,400" onfocus="addCurrencyPrefix(this)" onblur="removeCurrencyPrefix(this)">
              <label class="form-label" style="margin-top:10px;">Tenancy start</label>
              <input class="form-input" id="propTenancyStart" type="date">
              <label class="form-label" style="margin-top:10px; display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="propHasTenancyEnd" onchange="togglePropTenancyEnd()">
                ADD TENANCY END DATE
              </label>
              <div id="propTenancyEndDateWrapper" style="display:none;">
                <label class="form-label" style="margin-top:10px;">Tenancy end</label>
                <input class="form-input" id="propTenancyEnd" type="date">
              </div>
              <label class="form-label" style="margin-top:10px;">Agent fees</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <select class="form-input" id="propAgentFeesType" onchange="togglePropAgentFeesType()" style="width:80px;">
                  <option value="percent">%</option>
                  <option value="fixed">£</option>
                </select>
                <input class="form-input" id="propAgentFees" type="number" step="0.01" placeholder="e.g. 10" style="flex:1;" onfocus="addPercentSuffix(this)" onblur="removePercentSuffix(this)">
              </div>
              <label class="form-label" style="margin-top:10px;">Tenant names</label>
              <input class="form-input" id="propTenantNames" placeholder="e.g. John Smith, Jane Doe">
              <label class="form-label" style="margin-top:10px;">Tenant since</label>
              <input class="form-input" id="propTenantSince" type="date" placeholder="When did they move in?">
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
                Save property
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
  if (addPropertyFormOpen) addRentedPropertyFormOpen = false;
  renderProperties();
}

function addCurrencyPrefix(input) {
  if (!input.value) {
    input.value = '£';
  }
}

function removeCurrencyPrefix(input) {
  if (input.value === '£') {
    input.value = '';
  }
}

function addPercentSuffix(input) {
  if (!input.value) {
    input.value = '%';
  }
}

function removePercentSuffix(input) {
  if (input.value === '%') {
    input.value = '';
  }
}

// ─── Delete ───────────────────────────────────────────────────────

function deleteProperty(i) {
  if (!confirm('Delete this property? This cannot be undone.')) return;
  const deleted = S.properties.splice(i, 1)[0];
  window._lastDeletedProperty = { item: deleted, index: i };
  updateUndoButton('propertiesUndoBtn', window._lastDeletedProperty);
  save(); renderProperties(); toast('Deleted');
}

function undoLastPropertyDelete() {
  if (!window._lastDeletedProperty) return;
  const { item, index } = window._lastDeletedProperty;
  S.properties.splice(index, 0, item);
  window._lastDeletedProperty = null;
  updateUndoButton('propertiesUndoBtn', null);
  save(); renderProperties(); toast('Restored');
}

// ─── Add property (submit) ────────────────────────────────────────

function addProperty() {
  if (!S.properties) S.properties = [];
  const gV = id => (document.getElementById(id)?.value || '').trim();
  const gM = id => parseMoney(document.getElementById(id)?.value) || 0;
  const gF = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gC = id => document.getElementById(id)?.checked || false;

  const purchasePrice = gM('propPurchasePrice');
  const estValue = gM('propEstValue') || purchasePrice;
  if (!purchasePrice && !estValue) { toast('Please enter a purchase price or estimated value.'); return; }

  const prop = {
    person: parseInt(gV('propPerson')) || 0,
    nickname: gV('propNickname'),
    address: gV('propAddress'),
    type: gV('propType'),
    tenure: gV('propTenure'),
    purchasePrice,
    depositAmount: gM('propDeposit'),
    purchaseDate: gV('propPurchaseDate'),
    estValue,
    mortgageType: gV('propMortgageType'),
    mortgageLender: gV('propMortgageLender'),
    mortgageBalance: gM('propMortgageBalance'),
    mortgageRate: gF('propMortgageRate'),
    mortgageMonthly: gM('propMortgageMonthly'),
    mortgageEndDate: gV('propMortgageEndDate'),
    mortgageAccountNo: gV('propMortgageAccountNo'),
    leaseYears: gF('propLeaseYears') || null,
    serviceCharge: gM('propServiceCharge') || null,
    groundRent: gM('propGroundRent') || null,
    isRented: gC('propIsRented'),
    rentalMonthly: gM('propRentalMonthly'),
    tenancyStart: gV('propTenancyStart'),
    tenancyEnd: gV('propTenancyEnd'),
    hasTenancyEnd: gC('propHasTenancyEnd'),
    agentFeesPct: gF('propAgentFees') || null,
    agentFeesType: gV('propAgentFeesType') || 'percent',
    tenantNames: gV('propTenantNames'),
    tenantSince: gV('propTenantSince'),
    notes: gV('propNotes'),
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
function togglePropTenancyEnd() {
  const f = document.getElementById('propTenancyEndDateWrapper');
  const hasEnd = document.getElementById('propHasTenancyEnd')?.checked;
  if (f) f.style.display = hasEnd ? '' : 'none';
}
function togglePropAgentFeesType() {
  const type = document.getElementById('propAgentFeesType')?.value;
  const input = document.getElementById('propAgentFees');
  if (input) {
    input.placeholder = type === 'percent' ? '% e.g. 10' : '£ e.g. 150';
    input.step = type === 'percent' ? '0.1' : '0.01';
  }
}

function calcAndFillMonthlyPayment() {
  const principal = parseMoney(document.getElementById('propMortgageBalance')?.value) || 0;
  const rate = parseFloat(document.getElementById('propMortgageRate')?.value) || 0;
  const endDate = document.getElementById('propMortgageEndDate')?.value;
  if (!principal || !rate || !endDate) { toast('Fill in balance, rate & end date first'); return; }
  const years = Math.max(0.5, (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24 * 365.25));
  const monthly = calcMortgageMonthly(principal, rate, years);
  const el = document.getElementById('propMortgageMonthly');
  if (el) { el.value = monthly.toLocaleString('en-GB'); toast(`Estimated: £${monthly.toLocaleString('en-GB')}/mo`); }
}

// ─── Render: household view ───────────────────────────────────────

const PROP_SORT_COLS = ['property', 'owner', 'type', 'value', 'mortgage', 'equity', 'ltv', 'rental', 'yield'];

function setPropSort(col) {
  if (!PROP_SORT_COLS.includes(col)) return;
  if (propSort.col === col) {
    propSort.dir = propSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    const numericCols = ['value', 'mortgage', 'equity', 'ltv', 'rental', 'yield'];
    propSort = { col, dir: numericCols.includes(col) ? 'desc' : 'asc' };
  }
  _syncPropSortHeaders();
  renderProperties();
}

function _syncPropSortHeaders() {
  document.querySelectorAll('#page-properties th[data-sort]').forEach(th => {
    const col = th.dataset.sort;
    th.classList.toggle('sort-active', col === propSort.col);
    th.dataset.dir = col === propSort.col ? propSort.dir : '';
    const arrow = th.querySelector('.sort-arrow');
    if (arrow) {
      arrow.textContent = col !== propSort.col ? '↕' : propSort.dir === 'asc' ? '↑' : '↓';
    }
  });
}

function _applyPropSort(arr) {
  const { col, dir } = propSort;
  return [...arr].sort((a, b) => {
    let va, vb;
    const ma = calcPropertyMetrics(a);
    const mb = calcPropertyMetrics(b);
    switch (col) {
      case 'property': va = a.nickname || a.address || ''; vb = b.nickname || b.address || ''; break;
      case 'owner': va = S.settings.personNames[a.person || 0] || ''; vb = S.settings.personNames[b.person || 0] || ''; break;
      case 'type': va = PROPERTY_TYPES.find(t => t.value === a.type)?.label || ''; vb = PROPERTY_TYPES.find(t => t.value === b.type)?.label || ''; break;
      case 'value': va = ma.estValue; vb = mb.estValue; break;
      case 'mortgage': va = ma.mortgageBalance; vb = mb.mortgageBalance; break;
      case 'equity': va = ma.equity; vb = mb.equity; break;
      case 'ltv': va = ma.ltv; vb = mb.ltv; break;
      case 'rental': va = ma.rentalMonthly; vb = mb.rentalMonthly; break;
      case 'yield': va = ma.rentalYield; vb = mb.rentalYield; break;
      default: return 0;
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderHouseholdProperties(el) {
  const props = S.properties || [];
  const personNames = S.settings.personNames || [];
  const personCount = personNames.length;
  const propSort = S.settings.propSort || { col: 'nickname', dir: 'asc' };

  const sortedProps = [...props].sort((a, b) => {
    const aVal = a[propSort.col] || '';
    const bVal = b[propSort.col] || '';
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return propSort.dir === 'asc' ? cmp : -cmp;
  });

  if (!sortedProps.length) {
    el.innerHTML = `<div class="empty"><div class="ei">🏠</div><p>No properties added yet.</p></div>`;
    return;
  }

  let totalValue = 0, totalMortgage = 0, totalEquity = 0, totalRental = 0, totalGain = 0;
  sortedProps.forEach(p => {
    const m = calcPropertyMetrics(p);
    totalValue += m.estValue;
    totalMortgage += m.mortgageBalance;
    totalEquity += m.equity;
    totalRental += m.rentalMonthly;
    totalGain += m.capitalGain;
  });
  const gainColor = totalGain >= 0 ? 'var(--green)' : 'var(--red)';

  el.innerHTML = `
    <div class="sal-breakdown-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px;">
      <div class="sal-card">
        <div class="sal-label">Portfolio value</div>
        <div class="sal-val val">${fmt(totalValue)}</div>
        <div class="sal-sub">${sortedProps.length} propert${sortedProps.length !== 1 ? 'ies' : 'y'}</div>
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
    <div class="sal-breakdown-grid" style="grid-template-columns:repeat(3,1fr);margin-top:0;margin-bottom:16px;">
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
        <div class="sal-val val">${sortedProps.filter(p => p.isRented).length} of ${sortedProps.length}</div>
        <div class="sal-sub">generating rental income</div>
      </div>
    </div>` : ''}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div class="section-label" style="margin:0;">All properties</div>
      <div style="display:flex;gap:8px;">
        <button class="icon-btn" onclick="toggleAddRentedPropertyForm()" style="font-size:12px;padding:8px 16px;border-radius:var(--radius-sm);${addRentedPropertyFormOpen ? 'border-color:var(--blue);color:var(--blue);' : ''}">
          I rent
        </button>
        <button class="icon-btn" onclick="toggleAddPropertyForm()" style="font-size:12px;padding:8px 16px;border-radius:var(--radius-sm);${addPropertyFormOpen ? 'border-color:var(--blue);color:var(--blue);' : ''}">
          ＋ Add property
        </button>
      </div>
    </div>

    ${addRentedPropertyFormOpen ? renderAddRentedPropertyForm() : ''}

    ${addPropertyFormOpen ? renderAddPropertyFormHTML() : ''}

    <div class="card">
      <table class="tax-band-table" style="background:white;">
        <thead>
          <tr>
            <th data-sort="property" onclick="setPropSort('property')" class="${propSort.col === 'property' ? 'sort-active' : ''}" style="cursor:pointer;">
              Property ${propSort.col === 'property' ? `<span class="sort-arrow">${propSort.dir === 'asc' ? '↑' : '↓'}</span>` : ''}
            </th>
            <th data-sort="type" onclick="setPropSort('type')" class="${propSort.col === 'type' ? 'sort-active' : ''}" style="cursor:pointer;">
              Type ${propSort.col === 'type' ? `<span class="sort-arrow">${propSort.dir === 'asc' ? '↑' : '↓'}</span>` : ''}
            </th>
            <th data-sort="owner" onclick="setPropSort('owner')" class="${propSort.col === 'owner' ? 'sort-active' : ''}" style="cursor:pointer;">
              Owner ${propSort.col === 'owner' ? `<span class="sort-arrow">${propSort.dir === 'asc' ? '↑' : '↓'}</span>` : ''}
            </th>
            <th data-sort="value" onclick="setPropSort('value')" class="${propSort.col === 'value' ? 'sort-active' : ''}" style="cursor:pointer;">
              Value ${propSort.col === 'value' ? `<span class="sort-arrow">${propSort.dir === 'asc' ? '↑' : '↓'}</span>` : ''}
            </th>
            <th data-sort="mortgage" onclick="setPropSort('mortgage')" class="${propSort.col === 'mortgage' ? 'sort-active' : ''}" style="cursor:pointer;">
              Mortgage ${propSort.col === 'mortgage' ? `<span class="sort-arrow">${propSort.dir === 'asc' ? '↑' : '↓'}</span>` : ''}
            </th>
            <th data-sort="equity" onclick="setPropSort('equity')" class="${propSort.col === 'equity' ? 'sort-active' : ''}" style="cursor:pointer;">
              Equity ${propSort.col === 'equity' ? `<span class="sort-arrow">${propSort.dir === 'asc' ? '↑' : '↓'}</span>` : ''}
            </th>
            <th data-sort="rental" onclick="setPropSort('rental')" class="${propSort.col === 'rental' ? 'sort-active' : ''}" style="cursor:pointer;">
              Rent ${propSort.col === 'rental' ? `<span class="sort-arrow">${propSort.dir === 'asc' ? '↑' : '↓'}</span>` : ''}
            </th>
          </tr>
        </thead>
        <tbody id="hhPropBody">
          ${sortedProps.map((p, i) => {
    const m = calcPropertyMetrics(p);
    const ownerName = personNames[p.person] || 'Unknown';
    return `
            <tr>
              <td>${p.nickname || p.address || 'Property'}</td>
              <td>${PROPERTY_TYPES.find(t => t.value === p.type)?.label || '—'}</td>
              <td>${ownerName}</td>
              <td class="val">${fmt(m.estValue)}</td>
              <td class="neg val">${fmt(m.mortgageBalance)}</td>
              <td class="pos val">${fmt(m.equity)}</td>
              <td class="${m.rentalMonthly > 0 ? 'pos' : ''} val">${m.rentalMonthly > 0 ? fmt(m.rentalMonthly) + '/mo' : '—'}</td>
            </tr>
          `;
  }).join('')}
        </tbody>
      </table>
    </div>

    ${addPropertyFormOpen ? renderAddPropertyFormHTML() : ''}
  `;

  setTimeout(() => _syncPropSortHeaders(), 0);
}
