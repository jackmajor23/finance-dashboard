// ── Accounts & ISA ───────────────────────────────────
// JS: ACCOUNTS & ISA
// ═══════════════════════════════════════════════════
let accountsFormOpen = false;
let currentAccountsPersonIdx = 0;

function isIsaType(type) {
  return !!ISA_INFO[type];
}

function toggleAccountsForm(force) {
  accountsFormOpen = typeof force === 'boolean' ? force : !accountsFormOpen;
  updateAccountsFormVisibility();
  if (accountsFormOpen) {
    document.getElementById('accountsFormBox')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('accName')?.focus({ preventScroll: true });
  }
}

function updateAccountsFormVisibility() {
  const box = document.getElementById('accountsFormBox');
  const btn = document.getElementById('accountsAddToggle');
  if (box) box.classList.toggle('hidden', !accountsFormOpen);
  if (btn) {
    btn.textContent = accountsFormOpen ? 'Cancel' : '+ Add account';
    btn.classList.toggle('is-open', accountsFormOpen);
    btn.setAttribute('aria-expanded', accountsFormOpen ? 'true' : 'false');
  }
  updateAccountContribVisibility();
}

function updateAccountContribVisibility() {
  const type = document.getElementById('accType')?.value || '';
  const field = document.getElementById('accContribField');
  const input = document.getElementById('accContrib');
  const show = isIsaType(type);
  if (field) field.style.display = show ? '' : 'none';
  if (!show && input) input.value = '';

  // Show overdraft field for accounts where a negative balance can be deliberate.
  const overdraftField = document.getElementById('accOverdraftField');
  const overdraftInput = document.getElementById('accOverdraft');
  const showOverdraft = ['current', 'savings', 'joint'].includes(type);
  if (overdraftField) overdraftField.style.display = showOverdraft ? '' : 'none';
  if (!showOverdraft && overdraftInput) overdraftInput.value = '';

  const creditField = document.getElementById('accCreditLimitField');
  const creditInput = document.getElementById('accCreditLimit');
  const showCredit = type === 'credit-card';
  if (creditField) creditField.style.display = showCredit ? '' : 'none';
  if (!showCredit && creditInput) creditInput.value = '';
}

// Format last updated timestamp
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


function syncPremiumBondsToAccount() {
  // Check if premium bonds exist and should be synced as an account
  const pbAmount = S.premiumBonds?.amount || 0;
  const pbAccount = S.accounts.find(a => a.type === 'premium-bonds-acc');

  if (pbAmount > 0 && !pbAccount) {
    // Auto-create premium bonds account
    S.accounts.push({
      name: 'Premium Bonds',
      type: 'premium-bonds-acc',
      provider: 'NS&I',
      balance: pbAmount,
      contrib: 0,
      lastUpdated: new Date().toISOString(),
      isSynced: true
    });
    save();
  } else if (pbAccount && pbAccount.isSynced) {
    // Update existing synced account
    pbAccount.balance = pbAmount;
    pbAccount.lastUpdated = new Date().toISOString();
  }
}

function syncAccountToPremiumBonds(accountIndex) {
  const account = S.accounts[accountIndex];
  if (account.type === 'premium-bonds-acc' && account.isSynced) {
    S.premiumBonds.amount = account.balance;
    S.premiumBonds.date = new Date().toISOString().split('T')[0];
    save();
  }
}

function renderAccounts() {
  updateAccountsFormVisibility();

  // Render person tabs
  const tabsEl = document.getElementById('accountsPersonTabs');
  const allPeople = [...S.settings.personNames];
  if (allPeople.length > 1) allPeople.push('Household');

  if (tabsEl) {
    if (allPeople.length > 1) {
      tabsEl.innerHTML = allPeople.map((p, i) => {
        const isHousehold = i === allPeople.length - 1;
        return `<button class="person-btn ${currentAccountsPersonIdx === i ? 'active' : ''}" onclick="switchAccountsPerson(${i})">${isHousehold ? '📊 ' + p : p}</button>`;
      }).join('');
    } else {
      tabsEl.innerHTML = '';
      currentAccountsPersonIdx = 0;
    }
  }

  // Populate owner dropdown
  const ownerSelect = document.getElementById('accOwner');
  if (ownerSelect) {
    ownerSelect.innerHTML = S.settings.personNames.map((p, i) => `<option value="${i}">${p}</option>`).join('');
    ownerSelect.value = currentAccountsPersonIdx;
  }

  // Sync premium bonds to account
  syncPremiumBondsToAccount();

  // ISA tracker
  const el = document.getElementById('isaTracker');
  el.innerHTML = Object.keys(ISA_INFO).map(key => {
    const info = ISA_INFO[key];
    const matching = S.accounts.filter(a => a.type === key);
    const used = Math.min(matching.reduce((s, a) => s + (a.contrib || 0), 0), info.limit);
    const p = Math.min((used / info.limit) * 100, 100);
    return `<div class="isa-card">
      <div class="text-xs text-muted font-semibold" style="text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">ISA type</div>
      <div class="isa-name">${info.name}</div>
      <div class="isa-desc">${info.desc}</div>
      <div class="prog-outer"><div class="prog-fill" style="width:${p.toFixed(1)}%;background:${info.color};"></div></div>
      <div class="isa-stats">
        <span style="color:${info.color};font-variation-settings:'wght' 600;" class="val">${fmt(used)} used</span>
        <span class="text-muted"><span class="val">${fmt(info.limit - used)}</span> of <span class="val">${fmt(info.limit)}</span> left</span>
      </div>
    </div>`;
  }).join('');

  // Accounts grid with drag-and-drop reordering
  const grid = document.getElementById('accountsGrid');
  if (!S.accounts.length) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ei">◳</div><p>No accounts yet. Use the add account button above.</p></div>`; return; }

  grid.innerHTML = S.accounts.map((a, i) => {
    const info = ISA_INFO[a.type];
    const contrib = a.contrib || 0, limit = info ? info.limit : null;
    const pf = limit ? Math.min((contrib / limit) * 100, 100) : null;
    const col = ACC_COL[a.type] || 'var(--muted2)';
    const isCreditCard = a.type === 'credit-card';
    const overdraft = Number(a.overdraft || 0);
    const maxCreditLimit = Number(a.maxCreditLimit || 0);
    const interestRate = Number(a.interestRate || 0);
    const isOverdrawn = !isCreditCard && Number(a.balance || 0) < 0;
    const exceedsOverdraft = isOverdrawn && Math.abs(Number(a.balance || 0)) > overdraft;
    const balanceClass = isCreditCard || isOverdrawn ? 'neg' : '';
    const lastUpdatedText = formatLastUpdated(a.lastUpdated);
    return `<div class="acc-card" draggable="true" data-acc-index="${i}" ondragstart="dragStartAccount(event)" ondragover="dragOverAccount(event)" ondrop="dropAccount(event)" ondragend="dragEndAccount(event)">
      <div class="acc-top">
        <div>
          <div class="acc-name">${a.name}</div>
          <div class="acc-type-lbl">${a.provider || ''} · ${(a.type || '').replace(/-/g, ' ')}</div>
        </div>
        <div class="flex-row gap-6">
          <span style="font-size:22px;">${ACC_ICONS[a.type] || '◈'}</span>
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <button class="icon-btn del" onclick="deleteAccount(${i})">✕</button>
        </div>
      </div>
      <div class="acc-bal-edit flex-row gap-8" style="cursor:pointer;" onclick="toggleEditBalance(${i})">
        <span class="acc-bal val ${balanceClass}" style="color:${isOverdrawn ? 'var(--red)' : col};">${isCreditCard && a.balance > 0 ? '-' : ''}${a.balance < 0 ? '-' : ''}${fmt(Math.abs(a.balance))}</span>
        <span class="text-sm text-muted2">✎</span>
      </div>
      <div class="acc-bal-input" id="accBalInput${i}" style="display:none;gap:6px;">
        <input type="text" id="accBalValue${i}" value="${a.balance}" placeholder="0" oninput="formatMoney(this)" style="flex:1;"/>
        <button class="icon-btn" onclick="saveBalance(${i})" style="color:var(--green);">✓</button>
        <button class="icon-btn" onclick="toggleEditBalance(${i})" style="color:var(--muted2);">✕</button>
      </div>
      <div class="text-xs" style="color:var(--muted3);margin-top:6px;margin-bottom:4px;">Last updated: <em>${lastUpdatedText}</em></div>
      ${interestRate ? `<div class="text-xs val" style="color:var(--green);margin-top:4px;">Interest rate: ${interestRate.toFixed(2)}%</div>` : ''}
      ${overdraft > 0 ? `<div class="text-xs" style="color:${exceedsOverdraft ? 'var(--red)' : 'var(--amber)'};margin-top:4px;"><em>Overdraft limit: <span class="val">${fmt(overdraft)}</span>${exceedsOverdraft ? ' · exceeded' : ''}</em></div>` : ''}
      ${isCreditCard && maxCreditLimit > 0 ? `<div class="text-xs" style="color:var(--muted2);margin-top:4px;">Credit limit: <span class="val">${fmt(maxCreditLimit)}</span> · <span class="val">${fmt(Math.max(0, maxCreditLimit - Math.abs(a.balance || 0)))}</span> available</div>` : ''}
      ${info ? `<div class="text-sm text-muted" style="margin-top:2px;">Contributed: <span class="val">${fmt(contrib)}</span></div>
        <div class="acc-bar"><div class="acc-bar-fill" style="width:${pf.toFixed(1)}%;background:${col};"></div></div>
        <div class="acc-bar-lbl"><span class="val">${fmt(contrib)} used</span><span><span class="val">${fmt(limit - contrib)}</span> left of <span class="val">${fmt(limit)}</span></span></div>`
        : `<div class="text-sm text-muted" style="margin-top:2px;">${isCreditCard ? 'Outstanding balance' : (a.type.includes('pension') ? 'Pension pot' : 'Account balance')}</div>`}
    </div>`;
  }).join('');
}

let draggedAccountIndex = -1;

function dragStartAccount(e) {
  draggedAccountIndex = parseInt(e.target.closest('[data-acc-index]').dataset.accIndex);
  e.target.closest('.acc-card').style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function dragOverAccount(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const card = e.target.closest('.acc-card');
  if (card) card.style.borderTop = '2px solid var(--accent)';
}

function dropAccount(e) {
  e.preventDefault();
  const targetCard = e.target.closest('.acc-card');
  if (!targetCard) return;
  const targetIndex = parseInt(targetCard.dataset.accIndex);
  if (draggedAccountIndex !== targetIndex && draggedAccountIndex !== -1) {
    const account = S.accounts[draggedAccountIndex];
    S.accounts.splice(draggedAccountIndex, 1);
    S.accounts.splice(targetIndex, 0, account);
    save();
    renderAccounts();
  }
}

function dragEndAccount(e) {
  document.querySelectorAll('.acc-card').forEach(card => {
    card.style.opacity = '1';
    card.style.borderTop = '';
  });
  draggedAccountIndex = -1;
}

function toggleEditBalance(i) {
  const display = document.querySelector(`#accBalInput${i}`).style.display;
  if (display === 'none') {
    document.querySelector(`#accBalInput${i}`).style.display = 'flex';
    document.querySelector(`#accBalValue${i}`).focus();
    document.querySelector(`#accBalValue${i}`).select();
  } else {
    document.querySelector(`#accBalInput${i}`).style.display = 'none';
  }
}

function saveBalance(i) {
  const input = document.getElementById(`accBalValue${i}`);
  const newBalance = parseMoney(input.value) || 0;
  const account = S.accounts[i];
  if (newBalance < 0 && ['current', 'savings', 'joint'].includes(account.type)) {
    const overdraft = Number(account.overdraft || 0);
    if (!overdraft || Math.abs(newBalance) > overdraft) {
      toast('Negative balance needs an active overdraft limit.');
      return;
    }
  }
  if (newBalance !== S.accounts[i].balance) {
    S.accounts[i].balance = newBalance;
    S.accounts[i].lastUpdated = new Date().toISOString();
    // Sync to premium bonds if this is a synced premium bonds account
    syncAccountToPremiumBonds(i);
    save();
    toast('Balance updated');
  }
  toggleEditBalance(i);
  renderAccounts();
}

function addAccount() {
  const name = (document.getElementById('accName').value || '').trim();
  const type = document.getElementById('accType').value;
  const provider = (document.getElementById('accProvider').value || '').trim();
  const balance = parseMoney(document.getElementById('accBalance').value) || 0;
  const contrib = parseMoney(document.getElementById('accContrib').value) || 0;
  const overdraft = parseMoney(document.getElementById('accOverdraft').value) || 0;
  const maxCreditLimit = parseMoney(document.getElementById('accCreditLimit').value) || 0;
  const interestRate = parseFloat(document.getElementById('accInterestRate').value) || 0;
  const owner = parseInt(document.getElementById('accOwner').value) || 0;
  if (!validateRequiredFields(['accName'], 'Please enter an account name.')) return;
  if (balance < 0 && ['current', 'savings', 'joint'].includes(type) && (!overdraft || Math.abs(balance) > overdraft)) {
    toast('Set an overdraft limit that covers the negative balance.');
    return;
  }
  S.accounts.push({ name, type, provider, balance, contrib, overdraft, maxCreditLimit, interestRate, person: owner, lastUpdated: new Date().toISOString() });
  save(); toast(`Added ${name}`);
  ['accName', 'accProvider', 'accBalance', 'accContrib', 'accOverdraft', 'accCreditLimit', 'accInterestRate'].forEach(id => document.getElementById(id).value = '');
  accountsFormOpen = false;
  renderAccounts();
}

function deleteAccount(i) {
  const deleted = S.accounts.splice(i, 1)[0];
  window._lastDeletedAccount = { item: deleted, index: i };
  updateUndoButton('accountsUndoBtn', window._lastDeletedAccount);
  save();
  renderAccounts();
  toast('Removed');
}

function undoLastAccountDelete() {
  if (!window._lastDeletedAccount) return;
  const { item, index } = window._lastDeletedAccount;
  S.accounts.splice(index, 0, item);
  window._lastDeletedAccount = null;
  updateUndoButton('accountsUndoBtn', null);
  save();
  renderAccounts();
  toast('Restored');
}

function switchAccountsPerson(idx) {
  currentAccountsPersonIdx = idx;
  const ownerSelect = document.getElementById('accOwner');
  if (ownerSelect) {
    ownerSelect.value = idx;
  }
  renderAccounts();
}
