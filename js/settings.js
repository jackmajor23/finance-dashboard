// ── Settings, sample data & clear ───────────────────
// JS: SETTINGS
// ═══════════════════════════════════════════════════
function saveSettings() {
  S.settings.name = (document.getElementById('setName').value || '').trim();
  S.settings.title = (document.getElementById('setTitle').value || '').trim() || 'My Wealth';
  S.settings.currency = (document.getElementById('setCurrency').value || '£').trim();
  normalizePeopleAndLinks();
  save();
  renderSettings();
  refreshPeopleDependentViews({ skipSettings: true });
  toast('Settings saved');
}

function renderSettings() {
  const sn = document.getElementById('setName');
  const st = document.getElementById('setTitle');
  const sc = document.getElementById('setCurrency');
  if (sn) sn.value = S.settings.name || '';
  if (st) st.value = S.settings.title || '';
  if (sc) sc.value = S.settings.currency || '£';
  normalizePeopleAndLinks();
  renderPersonManagement();
}

function hasRealPeople() {
  if (!S.settings.personNames || !S.settings.personNames.length) return false;
  // Check if all people are still default "Person X" names
  return S.settings.personNames.some(name => !name.startsWith('Person '));
}

function showDemoIndicator(containerId) {
  if (hasRealPeople()) {
    const indicator = document.querySelector('.demo-indicator');
    if (indicator) indicator.remove();
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  // Remove existing indicator
  const existing = container.querySelector('.demo-indicator');
  if (existing) existing.remove();

  // Add new indicator
  const indicator = document.createElement('div');
  indicator.className = 'demo-indicator';
  indicator.style.cssText = 'background:var(--amber);color:var(--surface1);padding:12px;border-radius:var(--radius-sm);margin-bottom:16px;font-size:13px;';
  indicator.innerHTML = `
    <strong>📋 Demo Mode:</strong> You haven't added any people yet. 
    <a href="#" onclick="nav('settings'); return false;" style="color:inherit;text-decoration:underline;font-weight:600;">Go to Settings</a> to add people.
  `;
  container.insertBefore(indicator, container.firstChild);
}

function clearAll() {
  if (!confirm('Clear all data? This cannot be undone.')) return;
  localStorage.removeItem(SK);
  location.reload();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function nextPersonName() {
  const names = new Set((S.settings.personNames || []).map(name => String(name).toLowerCase()));
  let i = (S.settings.personNames || []).length + 1;
  while (names.has(`person ${i}`)) i++;
  return `Person ${i}`;
}

function setPersonViewIndex(idx) {
  if (typeof currentPersonIdx !== 'undefined') currentPersonIdx = idx;
  if (typeof currentDebtPersonIdx !== 'undefined') currentDebtPersonIdx = idx;
  if (typeof currentPropPersonIdx !== 'undefined') currentPropPersonIdx = idx;
}

function shiftPersonViewIndexesAfterRemoval(removedIdx) {
  const shift = idx => {
    if (idx === removedIdx) return 0;
    return idx > removedIdx ? idx - 1 : idx;
  };
  if (typeof currentPersonIdx !== 'undefined') currentPersonIdx = shift(currentPersonIdx);
  if (typeof currentDebtPersonIdx !== 'undefined') currentDebtPersonIdx = shift(currentDebtPersonIdx);
  if (typeof currentPropPersonIdx !== 'undefined') currentPropPersonIdx = shift(currentPropPersonIdx);
}

function refreshPeopleDependentViews(opts = {}) {
  if (!opts.skipSettings) renderPersonManagement();
  if (typeof renderSalary === 'function') renderSalary();
  if (typeof populateDebtForm === 'function') populateDebtForm();
  if (typeof renderDebts === 'function') renderDebts();
  if (typeof renderProperties === 'function') renderProperties();
  if (typeof renderTransactions === 'function') renderTransactions();
  if (typeof renderTax === 'function') renderTax();
  if (typeof renderOverview === 'function') renderOverview();
}

// Render person management cards
function renderPersonManagement() {
  const pmEl = document.getElementById('personManagement');
  if (!pmEl) return;

  normalizePeopleAndLinks();

  pmEl.innerHTML = S.settings.personNames.map((p, i) => {
    const salaryCount = (S.salaries || []).filter(s => (s.person || 0) === i).length;
    const debtCount = (S.debts || []).filter(d => !d.shared && (d.person || 0) === i).length;
    const propCount = (S.properties || []).filter(prop => (prop.person || 0) === i).length;
    const isActive = typeof currentPersonIdx !== 'undefined' && currentPersonIdx === i;
    return `
    <div class="card-hover ${isActive ? 'active' : ''}" onclick="selectManagedPerson(${i})">
      <div class="flex-row-between mb-8">
        <span class="font-semibold text-sm">${escapeHtml(p || 'Unnamed')}</span>
        <div class="flex-row gap-6">
          <button class="icon-btn edit icon-btn-sm" onclick="editPersonName(${i}); event.stopPropagation();">✎</button>
          ${S.settings.personNames.length > 1 ? `<button class="icon-btn del icon-btn-sm" onclick="removePerson(${i}); event.stopPropagation();">✕</button>` : ''}
        </div>
      </div>
      <div class="text-sm text-muted">
        ${salaryCount} salary · ${debtCount} debt · ${propCount} propert${propCount === 1 ? 'y' : 'ies'}
      </div>
    </div>
  `;
  }).join('');
}

function selectManagedPerson(i) {
  setPersonViewIndex(i);
  renderPersonManagement();
}

function editPersonName(i) {
  const current = S.settings.personNames[i] || '';
  const next = prompt('Person name', current);
  if (next === null) return;

  const name = next.trim() || current;
  const exists = S.settings.personNames
    .some((person, idx) => idx !== i && person.toLowerCase() === name.toLowerCase());
  if (exists) { toast('That person already exists.'); return; }

  S.settings.personNames[i] = name;
  normalizePeopleAndLinks();
  save();
  refreshPeopleDependentViews();
  toast('Person updated');
}

function addNewPerson() {
  normalizePeopleAndLinks();
  const fallback = nextPersonName();
  const input = document.getElementById('newPersonName');
  const entered = input ? input.value : '';
  const name = entered.trim() || fallback;
  const exists = S.settings.personNames
    .some(person => person.toLowerCase() === name.toLowerCase());
  if (exists) { toast('That person already exists.'); return; }

  S.settings.personNames.push(name);
  const newIdx = S.settings.personNames.length - 1;
  setPersonViewIndex(newIdx);
  normalizePeopleAndLinks();
  save();
  if (input) input.value = '';
  refreshPeopleDependentViews();
  toast(`${name} added`);
}

function removePerson(i) {
  if (!confirm('Remove this person?')) return;
  if ((S.settings.personNames || []).length <= 1) return;

  const removedName = S.settings.personNames[i] || 'Person';
  S.settings.personNames.splice(i, 1);
  removePersonLinkedData(i);
  shiftPersonViewIndexesAfterRemoval(i);
  normalizePeopleAndLinks();
  save();
  refreshPeopleDependentViews();
  toast(`${removedName} removed`);
}

// ═══════════════════════════════════════════════════
// JS: SAMPLE DATA & INIT
// ═══════════════════════════════════════════════════
function loadSample() {
  S.settings = { name: 'Jordan', title: "Jordan's Financial Dashboard", currency: '£', household: true, personNames: ['Jordan', 'Alex'] };
  S.holdings = [
    { id: 1, name: 'Apple Inc.', ticker: 'AAPL', type: 'stocks', invested: 3000, current: 4200, buyPrice: '180.50', shares: '16.5', buyDate: '2024-01-15', wrapper: 'gia', notes: 'Tech growth stock' },
    { id: 2, name: 'Vanguard FTSE All-World', ticker: 'VWRL.L', type: 'isa', invested: 8000, current: 9500, buyPrice: '95.20', shares: '84', buyDate: '2023-06-01', wrapper: 'stocks-isa', notes: 'Global index fund' },
    { id: 3, name: 'Bitcoin', ticker: 'BTC-GBP', type: 'crypto', invested: 2500, current: 3200, buyPrice: '35000', shares: '0.071', buyDate: '2024-03-10', wrapper: '', notes: 'HODL strategy' },
    { id: 4, name: 'Nvidia Corp.', ticker: 'NVDA', type: 'stocks', invested: 1500, current: 2100, buyPrice: '450', shares: '3.33', buyDate: '2025-02-20', wrapper: 'gia', notes: 'AI boom play' },
    { id: 5, name: 'iShares Core FTSE 100', ticker: 'ISF.L', type: 'isa', invested: 4000, current: 4600, buyPrice: '780', shares: '5.13', buyDate: '2024-09-01', wrapper: 'stocks-isa', notes: 'UK market exposure' },
    { id: 6, name: 'Ethereum', ticker: 'ETH-GBP', type: 'crypto', invested: 1200, current: 1800, buyPrice: '2200', shares: '0.545', buyDate: '2025-01-05', wrapper: '', notes: 'DeFi potential' },
  ];
  S.closedHoldings = [
    { id: 99, name: 'Tesla Inc.', ticker: 'TSLA', type: 'stocks', invested: 1000, soldFor: 1400, buyPrice: '250', buyDate: '2023-05-01', sellPrice: '350', sellDate: '2025-11-15', notes: 'Profit taken' },
    { id: 100, name: 'Solana', ticker: 'SOL-GBP', type: 'crypto', invested: 800, soldFor: 600, buyPrice: '80', buyDate: '2024-07-01', sellPrice: '60', sellDate: '2025-12-01', notes: 'Cut losses' }
  ];
  S.accounts = [
    { name: 'Revolut Current', type: 'current', provider: 'Revolut', balance: 4500, contrib: 0 },
    { name: 'HSBC Savings', type: 'savings', provider: 'HSBC', balance: 15000, contrib: 0 },
    { name: 'Vanguard ISA', type: 'stocks-isa', provider: 'Vanguard', balance: 14500, contrib: 12000 },
    { name: 'Moneyfarm LISA', type: 'lifetime-isa', provider: 'Moneyfarm', balance: 18000, contrib: 4800 },
    { name: 'Santander HTB ISA', type: 'help-to-buy-isa', provider: 'Santander', balance: 5200, contrib: 3600 },
    { name: 'Aviva Pension', type: 'pension', provider: 'Aviva', balance: 85000, contrib: 25000 },
  ];
  S.premiumBonds = {
    amount: 15000, date: '2024-02-01', wins: [
      { amount: 25, date: '2025-01-01', month: 1, year: 2025, autoAdded: false },
      { amount: 50, date: '2025-03-01', month: 3, year: 2025, autoAdded: true },
      { amount: 100, date: '2025-07-01', month: 7, year: 2025, autoAdded: false },
      { amount: 25, date: '2025-09-01', month: 9, year: 2025, autoAdded: false },
      { amount: 50, date: '2026-01-01', month: 1, year: 2026, autoAdded: true },
    ]
  };
  S.debts = [
    { name: 'Mortgage', type: 'mortgage', total: 400000, remaining: 350000, monthly: 1800, rate: 2.5, start: '2020-05-01', end: '2050-05-01', lender: 'HSBC', notes: 'Fixed rate until 2028' },
    { name: 'Car Loan', type: 'car', total: 20000, remaining: 12000, monthly: 450, rate: 5.9, start: '2024-06-01', end: '2028-06-01', lender: 'Toyota Finance', notes: 'For new hybrid car' },
    { name: 'Credit Card', type: 'credit', total: 5000, remaining: 1200, monthly: 200, rate: 18.9, start: '2025-01-01', end: '2026-01-01', lender: 'Amex', notes: '0% for 12 months' },
  ];
  S.goals = [
    { name: 'Holiday Fund', target: 5000, saved: 3200, date: '2026-08-01', monthly: 300, emoji: '✈️' },
    { name: 'Home Improvements', target: 25000, saved: 8500, date: '2027-03-01', monthly: 500, emoji: '🏠' },
    { name: 'Investment Buffer', target: 20000, saved: 12000, date: '2026-12-01', monthly: 400, emoji: '💰' },
  ];
  S.salaries = [
    { person: 0, employer: 'TechCorp Ltd', gross: 65000, bonus: 5000, pensionPct: 5, employerPension: 3, studentLoan: 'none', startDate: '2023-04-01', ongoing: true, endDate: null, notes: 'Senior developer role' },
    { person: 1, employer: 'NHS Trust', gross: 42000, bonus: 0, pensionPct: 7, employerPension: 14, studentLoan: 'plan2', startDate: '2022-09-01', ongoing: true, endDate: null, notes: 'Healthcare professional' },
  ];
  S.watchlist = ['AAPL', 'NVDA', 'BTC-GBP', 'ETH-GBP', 'GOOGL', 'MSFT'];
  S.transactions = [
    { id: 1, txtype: 'buy', date: '2024-01-15', desc: 'Bought Apple Inc. (AAPL)', amount: 3000, pnl: 0, notes: '' },
    { id: 2, txtype: 'buy', date: '2023-06-01', desc: 'Bought Vanguard FTSE All-World (VWRL.L)', amount: 8000, pnl: 0, notes: '' },
    { id: 3, txtype: 'buy', date: '2024-03-10', desc: 'Bought Bitcoin (BTC-GBP)', amount: 2500, pnl: 0, notes: '' },
    { id: 4, txtype: 'sell', date: '2025-11-15', desc: 'Sold Tesla Inc. (TSLA)', amount: 1400, pnl: 400, notes: 'Profit: £400' },
    { id: 5, txtype: 'win', date: '2025-07-01', desc: 'Premium Bond prize', amount: 100, pnl: 100, notes: '£100 prize' },
    { id: 6, txtype: 'income', date: '2025-04-01', desc: 'Salary: TechCorp Ltd', amount: 65000, pnl: 0, notes: 'Person 1' },
    { id: 7, txtype: 'payment', date: '2024-06-01', desc: 'Car Loan', amount: 20000, pnl: -20000, notes: '£450/month · 5.9% APR' },
    { id: 8, txtype: 'buy', date: '2025-02-20', desc: 'Bought Nvidia Corp. (NVDA)', amount: 1500, pnl: 0, notes: '' },
    { id: 9, txtype: 'sell', date: '2025-12-01', desc: 'Sold Solana (SOL-GBP)', amount: 600, pnl: -200, notes: 'Loss: £200' },
  ];
  S.bills = [
    { id: 1, name: 'Electricity & Gas', category: 'utilities', amount: 180, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Octopus Energy', createdDate: '2025-01-01' },
    { id: 2, name: 'Council Tax', category: 'taxes', amount: 220, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Band D property', createdDate: '2025-01-01' },
    { id: 3, name: 'Water Bill', category: 'utilities', amount: 45, frequency: 'quarterly', nextPaymentDate: '2026-07-01', recurring: 'quarterly', endDate: '', notes: 'Thames Water', createdDate: '2025-01-01' },
    { id: 4, name: 'Car Insurance', category: 'insurance', amount: 950, frequency: 'yearly', nextPaymentDate: '2026-09-15', recurring: 'yearly', endDate: '', notes: 'Fully comp, £500 excess', createdDate: '2025-01-01' },
    { id: 5, name: 'Home Insurance', category: 'insurance', amount: 120, frequency: 'yearly', nextPaymentDate: '2026-11-01', recurring: 'yearly', endDate: '', notes: 'Buildings & contents', createdDate: '2025-01-01' },
    { id: 6, name: 'Broadband', category: 'utilities', amount: 35, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Virgin Media 100Mbps', createdDate: '2025-01-01' },
  ];
  S.properties = [
    {
      person: 0,
      nickname: 'Family Home',
      address: '15 Oak Street, Bristol, BS1 2AB',
      type: 'residential',
      tenure: 'freehold',
      purchasePrice: 550000,
      depositAmount: 110000,
      purchaseDate: '2021-08-15',
      estValue: 720000,
      mortgageType: 'repayment',
      mortgageLender: 'HSBC',
      mortgageBalance: 385000,
      mortgageRate: 2.25,
      mortgageMonthly: 1650,
      mortgageEndDate: '2051-08-15',
      mortgageAccountNo: 'HSBC123456',
      leaseYears: null,
      serviceCharge: null,
      groundRent: null,
      isRented: false,
      rentalMonthly: 0,
      tenancyStart: '',
      tenancyEnd: '',
      agentFeesPct: null,
      notes: '4 bedroom detached house, garden, garage'
    },
    {
      person: 1,
      nickname: 'Investment Property',
      address: '42 High Street, Manchester, M1 3AB',
      type: 'buy-to-let',
      tenure: 'leasehold',
      purchasePrice: 280000,
      depositAmount: 56000,
      purchaseDate: '2023-11-01',
      estValue: 310000,
      mortgageType: 'interest-only',
      mortgageLender: 'Barclays',
      mortgageBalance: 196000,
      mortgageRate: 3.5,
      mortgageMonthly: 570,
      mortgageEndDate: '2053-11-01',
      mortgageAccountNo: 'BARC789012',
      leaseYears: 99,
      serviceCharge: 1800,
      groundRent: 450,
      isRented: true,
      rentalMonthly: 1400,
      tenancyStart: '2024-01-01',
      tenancyEnd: '2026-12-31',
      agentFeesPct: 8,
      notes: '2 bedroom flat, furnished, good rental yield'
    }
  ];
  S.netWorthHistory = [];
  for (let i = 60; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    S.netWorthHistory.push({ date: dt.toISOString().split('T')[0], value: Math.round(65000 + Math.random() * 5000 - 1000 + (60 - i) * 300) });
  }
  save(); toast('Sample data loaded! 🎉'); renderOverview();
}

function loadSampleYoungProfessional() {
  S.settings = { name: 'Taylor', title: "Taylor's Financial Dashboard", currency: '£', household: false, personNames: ['Taylor'] };
  S.holdings = [
    { id: 1, name: 'Vanguard FTSE All-World', ticker: 'VWRL.L', type: 'isa', invested: 2000, current: 2200, buyPrice: '95.20', shares: '21', buyDate: '2024-06-01', wrapper: 'stocks-isa', notes: 'First investment - global index fund' },
    { id: 2, name: 'iShares Core FTSE 100', ticker: 'ISF.L', type: 'isa', invested: 1500, current: 1550, buyPrice: '780', shares: '1.92', buyDate: '2025-01-15', wrapper: 'stocks-isa', notes: 'UK market exposure' },
  ];
  S.closedHoldings = [];
  S.accounts = [
    { name: 'Monzo Current', type: 'current', provider: 'Monzo', balance: 2500, contrib: 0 },
    { name: 'Marcus Savings', type: 'savings', provider: 'Marcus by Goldman Sachs', balance: 8000, contrib: 0 },
    { name: 'Vanguard ISA', type: 'stocks-isa', provider: 'Vanguard', balance: 3750, contrib: 3500 },
    { name: 'Lifetime ISA', type: 'lifetime-isa', provider: 'Moneybox', balance: 4200, contrib: 3360 },
  ];
  S.premiumBonds = { amount: 0, date: '', wins: [] };
  S.debts = [
    { name: 'Student Loan', type: 'student', total: 45000, remaining: 42000, monthly: 0, rate: 0, start: '2019-09-01', end: '2042-04-01', lender: 'UK Government', notes: 'Plan 2 - repayments through salary' },
  ];
  S.goals = [
    { name: 'Emergency Fund', target: 10000, saved: 8000, date: '2026-06-01', monthly: 500, emoji: '🛡️' },
    { name: 'First Home Deposit', target: 50000, saved: 12000, date: '2029-01-01', monthly: 800, emoji: '🏠' },
    { name: 'Travel Fund', target: 3000, saved: 1500, date: '2026-09-01', monthly: 200, emoji: '✈️' },
  ];
  S.salaries = [
    { person: 0, employer: 'StartupXYZ', gross: 38000, bonus: 2000, pensionPct: 4, employerPension: 3, studentLoan: 'plan2', startDate: '2023-09-01', ongoing: true, endDate: null, notes: 'Junior developer role' },
  ];
  S.watchlist = ['AAPL', 'MSFT', 'TSLA', 'NVDA'];
  S.transactions = [
    { id: 1, txtype: 'buy', date: '2024-06-01', desc: 'Bought Vanguard FTSE All-World (VWRL.L)', amount: 2000, pnl: 0, notes: '' },
    { id: 2, txtype: 'buy', date: '2025-01-15', desc: 'Bought iShares Core FTSE 100 (ISF.L)', amount: 1500, pnl: 0, notes: '' },
    { id: 3, txtype: 'income', date: '2025-04-01', desc: 'Salary: StartupXYZ', amount: 38000, pnl: 0, notes: 'Taylor' },
  ];
  S.bills = [
    { id: 1, name: 'Rent', category: 'housing', amount: 1200, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: '1 bedroom flat', createdDate: '2025-01-01' },
    { id: 2, name: 'Council Tax', category: 'taxes', amount: 140, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Band B property', createdDate: '2025-01-01' },
    { id: 3, name: 'Broadband', category: 'utilities', amount: 30, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'BT Fibre', createdDate: '2025-01-01' },
    { id: 4, name: 'Mobile Phone', category: 'utilities', amount: 25, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Three network', createdDate: '2025-01-01' },
    { id: 5, name: 'Netflix', category: 'subscriptions', amount: 10, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Standard plan', createdDate: '2025-01-01' },
  ];
  S.properties = [];
  S.netWorthHistory = [];
  for (let i = 24; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    S.netWorthHistory.push({ date: dt.toISOString().split('T')[0], value: Math.round(15000 + Math.random() * 2000 - 500 + (24 - i) * 150) });
  }
  save(); toast('Young professional sample loaded! 🎓'); renderOverview();
}

function loadSampleRetiredCouple() {
  S.settings = { name: 'Margaret & Robert', title: "Margaret & Robert's Retirement Dashboard", currency: '£', household: true, personNames: ['Margaret', 'Robert'] };
  S.holdings = [
    { id: 1, name: 'Vanguard LifeStrategy 60', ticker: 'VGLS.L', type: 'isa', invested: 150000, current: 175000, buyPrice: '95.20', shares: '1575', buyDate: '2015-06-01', wrapper: 'stocks-isa', notes: 'Balanced fund for retirement income' },
    { id: 2, name: 'FTSE 100 Income Fund', ticker: 'UKIN.L', type: 'isa', invested: 80000, current: 92000, buyPrice: '120', shares: '667', buyDate: '2018-03-01', wrapper: 'stocks-isa', notes: 'Dividend income focus' },
    { id: 3, name: 'Corporate Bond Fund', ticker: 'CORP.L', type: 'isa', invested: 50000, current: 52000, buyPrice: '100', shares: '500', buyDate: '2020-01-15', wrapper: 'stocks-isa', notes: 'Lower risk fixed income' },
  ];
  S.closedHoldings = [
    { id: 99, name: 'BP', ticker: 'BP.', type: 'stocks', invested: 15000, soldFor: 18000, buyPrice: '450', buyDate: '2010-05-01', sellPrice: '540', sellDate: '2023-11-15', notes: 'Dividend stock sold for profit' },
  ];
  S.accounts = [
    { name: 'Joint Current', type: 'joint', provider: 'Nationwide', balance: 35000, contrib: 0 },
    { name: 'Margaret Savings', type: 'savings', provider: 'Santander', balance: 45000, contrib: 0 },
    { name: 'Robert Savings', type: 'savings', provider: 'Barclays', balance: 38000, contrib: 0 },
    { name: 'Margaret ISA', type: 'stocks-isa', provider: 'Hargreaves Lansdown', balance: 175000, contrib: 150000 },
    { name: 'Robert ISA', type: 'stocks-isa', provider: 'AJ Bell', balance: 144000, contrib: 130000 },
    { name: 'Margaret Pension', type: 'pension', provider: 'Aviva', balance: 285000, contrib: 0 },
    { name: 'Robert Pension', type: 'pension', provider: 'Scottish Widows', balance: 320000, contrib: 0 },
  ];
  S.premiumBonds = {
    amount: 50000, date: '2010-02-01', wins: [
      { amount: 25, date: '2025-01-01', month: 1, year: 2025, autoAdded: false },
      { amount: 50, date: '2025-06-01', month: 6, year: 2025, autoAdded: true },
      { amount: 100, date: '2025-12-01', month: 12, year: 2025, autoAdded: false },
    ]
  };
  S.debts = [];
  S.goals = [
    { name: 'Holiday Fund', target: 15000, saved: 12000, date: '2026-09-01', monthly: 0, emoji: '✈️' },
    { name: 'Gifts for Grandchildren', target: 10000, saved: 7500, date: '2026-12-01', monthly: 200, emoji: '🎁' },
    { name: 'Home Maintenance', target: 20000, saved: 15000, date: '2027-06-01', monthly: 300, emoji: '🏠' },
  ];
  S.salaries = [
    { person: 0, employer: 'Retired', gross: 0, bonus: 0, pensionPct: 0, employerPension: 0, studentLoan: 'none', startDate: '2020-05-01', ongoing: false, endDate: '2020-05-01', notes: 'State pension + private pension' },
    { person: 1, employer: 'Retired', gross: 0, bonus: 0, pensionPct: 0, employerPension: 0, studentLoan: 'none', startDate: '2018-09-01', ongoing: false, endDate: '2018-09-01', notes: 'State pension + private pension' },
  ];
  S.watchlist = ['VGLS.L', 'UKIN.L', 'CORP.L'];
  S.transactions = [
    { id: 1, txtype: 'buy', date: '2015-06-01', desc: 'Bought Vanguard LifeStrategy 60 (VGLS.L)', amount: 150000, pnl: 0, notes: '' },
    { id: 2, txtype: 'buy', date: '2018-03-01', desc: 'Bought FTSE 100 Income Fund (UKIN.L)', amount: 80000, pnl: 0, notes: '' },
    { id: 3, txtype: 'sell', date: '2023-11-15', desc: 'Sold BP (BP.)', amount: 18000, pnl: 3000, notes: 'Profit: £3,000' },
    { id: 4, txtype: 'win', date: '2025-12-01', desc: 'Premium Bond prize', amount: 100, pnl: 100, notes: '£100 prize' },
  ];
  S.bills = [
    { id: 1, name: 'Council Tax', category: 'taxes', amount: 180, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Band C property (discounted)', createdDate: '2025-01-01' },
    { id: 2, name: 'Electricity & Gas', category: 'utilities', amount: 140, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Octopus Energy - retired tariff', createdDate: '2025-01-01' },
    { id: 3, name: 'Water', category: 'utilities', amount: 35, frequency: 'quarterly', nextPaymentDate: '2026-07-01', recurring: 'quarterly', endDate: '', notes: 'Thames Water', createdDate: '2025-01-01' },
    { id: 4, name: 'Home Insurance', category: 'insurance', amount: 450, frequency: 'yearly', nextPaymentDate: '2026-10-01', recurring: 'yearly', endDate: '', notes: 'Buildings & contents - over 60s discount', createdDate: '2025-01-01' },
    { id: 5, name: 'TV Licence', category: 'taxes', amount: 169, frequency: 'yearly', nextPaymentDate: '2026-09-01', recurring: 'yearly', endDate: '', notes: 'Free for over 75s (Robert only)', createdDate: '2025-01-01' },
    { id: 6, name: 'Broadband', category: 'utilities', amount: 28, frequency: 'monthly', nextPaymentDate: '2026-06-01', recurring: 'monthly', endDate: '', notes: 'Virgin Media - senior discount', createdDate: '2025-01-01' },
  ];
  S.properties = [
    {
      person: 0,
      nickname: 'Family Home',
      address: '7 Willow Lane, Cambridge, CB2 3CD',
      type: 'residential',
      tenure: 'freehold',
      purchasePrice: 180000,
      depositAmount: 54000,
      purchaseDate: '1992-05-15',
      estValue: 450000,
      mortgageType: 'none',
      mortgageLender: '',
      mortgageBalance: 0,
      mortgageRate: 0,
      mortgageMonthly: 0,
      mortgageEndDate: '',
      mortgageAccountNo: '',
      leaseYears: null,
      serviceCharge: null,
      groundRent: null,
      isRented: false,
      rentalMonthly: 0,
      tenancyStart: '',
      tenancyEnd: '',
      agentFeesPct: null,
      notes: '3 bedroom semi-detached, mortgage paid off 2015'
    },
  ];
  S.netWorthHistory = [];
  for (let i = 120; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    S.netWorthHistory.push({ date: dt.toISOString().split('T')[0], value: Math.round(950000 + Math.random() * 10000 - 2000 + (120 - i) * 200) });
  }
  save(); toast('Retired couple sample loaded! 👴👵'); renderOverview();
}
