// ── DOM & Rendering Helpers ─────────────────────────────
// Consolidated helper functions to reduce code duplication across modules
// ═══════════════════════════════════════════════════

/**
 * Generic table row renderer for holdings/investments
 * Reduces code duplication across renderHoldings, renderStocksHoldings, renderCryptoHoldings
 */
function renderHoldingRow(h, originalIndex) {
  const pl = h.current - h.invested;
  const ret = pct(h.current, h.invested);
  const lp = h.ticker ? livePrices[h.ticker.toUpperCase()] : null;
  
  return `<tr>
    <td><span style="font-variation-settings:'wght' 600;">${h.name}</span>${h.ticker ? `<span class="ticker-badge">${h.ticker}</span>` : ''}</td>
    <td><span class="pill p-${h.type}">${h.type}</span></td>
    <td class="val">${h.buyPrice ? CUR() + parseFloat(h.buyPrice).toFixed(2) : '—'}</td>
    <td>${fmtDate(h.buyDate)}</td>
    <td class="val">${fmt(h.invested)}</td>
    <td class="val">${fmt(h.current)}${lp ? ` <span style="font-size:10px;color:var(--muted);">(live)</span>` : ''}</td>
    <td class="${cls(pl)} val">${fmtS(pl)}</td>
    <td class="${cls(ret)}">${fmtP(ret)}</td>
    <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px;">${h.notes || '—'}</td>
    <td style="white-space:nowrap;">
      <button class="icon-btn" onclick="moveHoldingUp(${originalIndex})" title="Move up">▲</button>
      <button class="icon-btn" onclick="moveHoldingDown(${originalIndex})" title="Move down">▼</button>
      <button class="icon-btn edit" onclick="openEditHolding(${h.id})">✎</button>
      <button class="icon-btn del" onclick="deleteHolding(${h.id})">✕</button>
    </td>
  </tr>`;
}

/**
 * Generic stats card renderer (used in investments, salary, etc.)
 */
function renderStatCard(label, value, subtext = '', className = '') {
  return `<div class="stat-card ${className}"><div class="stat-label">${label}</div><div class="stat-val val">${value}</div>${subtext ? `<div class="stat-sub">${subtext}</div>` : ''}</div>`;
}

/**
 * Generic stats calculation renderer for different asset classes
 * Used in renderInvestmentStats, renderStocksStats, renderCryptoStats
 */
function renderInvestmentTypeStats(holdings, statsElementId, typeLabel = '') {
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const current = holdings.reduce((s, h) => s + h.current, 0);
  const pl = current - invested;
  const ret = invested ? ((current / invested - 1) * 100) : 0;
  
  const label = typeLabel ? `${typeLabel} Invested` : 'Total Invested';
  const html = `
    ${renderStatCard(label, fmt(invested), '', 'sc-accent')}
    ${renderStatCard('Current Value', fmt(current), '', 'sc-green')}
    ${renderStatCard(typeLabel ? 'P&L' : 'Unrealised P&L', fmtS(pl), fmtP(ret), pl >= 0 ? 'sc-amber' : '')}
  `;
  
  document.getElementById(statsElementId).innerHTML = html;
}

/**
 * Modal form field generator
 * Reduces repeated modal field creation in debts, salary, holdings, etc.
 */
function createFormField(type, id, label, value = '', options = {}) {
  const attrs = Object.entries(options)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  
  let field = '';
  
  switch (type) {
    case 'text':
      field = `<div class="ff"><label>${label}</label><input type="text" id="${id}" value="${value}" ${attrs}/></div>`;
      break;
    case 'money':
      field = `<div class="ff money-field"><label>${label}</label><input type="text" id="${id}" value="${value}" oninput="formatMoney(this)" ${attrs}/><span class="currency">£</span></div>`;
      break;
    case 'number':
      field = `<div class="ff"><label>${label}</label><input type="number" id="${id}" value="${value}" ${attrs}/></div>`;
      break;
    case 'date':
      field = `<div class="ff"><label>${label}</label><input type="date" id="${id}" value="${value}" ${attrs}/></div>`;
      break;
    case 'select':
      field = `<div class="ff"><label>${label}</label><select id="${id}" ${attrs}>${options.html || ''}</select></div>`;
      break;
    case 'textarea':
      field = `<div class="ff full-col"><label>${label}</label><textarea id="${id}" ${attrs}>${value}</textarea></div>`;
      break;
    case 'checkbox':
      field = `<div class="ff"><label>${label}</label><label class="toggle"><input type="checkbox" id="${id}" ${value ? 'checked' : ''}><span class="toggle-track"></span></label></div>`;
      break;
  }
  
  return field;
}

/**
 * Person tab and management renderer
 * Reduces duplication between salary.js and debts.js
 */
function renderPersonTabs(currentPersonIdx, personNames, onSwitchCallback = 'switchPerson') {
  const allPeople = [...personNames];
  if (allPeople.length > 1) allPeople.push('Household');
  
  if (allPeople.length <= 1) {
    return '';
  }
  
  return allPeople.map((p, i) => {
    const isHousehold = i === allPeople.length - 1;
    return `<button class="person-btn ${currentPersonIdx === i ? 'active' : ''}" onclick="${onSwitchCallback}(${i})">${isHousehold ? '📊 ' + p : p}</button>`;
  }).join('');
}

/**
 * Person management cards renderer
 * Used in salary.js and can be reused elsewhere
 */
function renderPersonManagementCards(personNames, currentPersonIdx, editCallback, deleteCallback) {
  return personNames.map((p, i) => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;cursor:pointer;" onclick="${editCallback}(${i})">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:600;font-size:13px;">${p}</span>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn edit" style="width:24px;height:24px;padding:0;font-size:11px;" onclick="event.stopPropagation();">✎</button>
          ${personNames.length > 1 ? `<button class="icon-btn del" style="width:24px;height:24px;padding:0;font-size:11px;" onclick="${deleteCallback}(${i}); event.stopPropagation();">✕</button>` : ''}
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);">Used in various contexts</div>
    </div>
  `).join('');
}

/**
 * Empty state generator
 * Reduces repeated empty state HTML across modules
 */
function renderEmptyState(icon, message, colspan = '1') {
  return `<tr><td colspan="${colspan}"><div class="empty"><div class="ei">${icon}</div><p>${message}</p></div></td></tr>`;
}

/**
 * Chip/pill formatter for type badges
 */
function renderTypePill(type, prefix = 'p-') {
  return `<span class="pill ${prefix}${type}">${type.toLowerCase().replace(/-/g, ' ')}</span>`;
}

/**
 * Progress bar renderer
 */
function renderProgressBar(percent, color = 'var(--green)') {
  return `<div class="prog-outer"><div class="prog-fill" style="width:${percent.toFixed(1)}%;background:${color};"></div></div>`;
}

/**
 * Debt/Liability card header with edit/delete actions
 */
function renderCardActions(editCallback, deleteCallback, editBtnIdx, delBtnIdx) {
  return `
    <div style="display:flex;gap:5px;align-items:center;">
      <button class="icon-btn edit" onclick="openEditDebt(${editBtnIdx})">✎</button>
      <button class="icon-btn del" onclick="deleteDebt(${delBtnIdx})">✕</button>
    </div>
  `;
}
