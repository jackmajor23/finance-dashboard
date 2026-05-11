// ── State & Persistence ─────────────────────────────
const SK = 'wealth_v4';

// Default state shape — add new keys here as features grow
let S = {
  settings:  { name:'', title:'Financial Tracker', currency:'£', household:false, personNames:['Person 1','Person 2'] },
  holdings:  [], closedHoldings: [], accounts: [],
  premiumBonds: { amount:0, date:'', wins:[] },
  debts:     [], goals:    [], salaries: [],
  watchlist: [], netWorthHistory: [],
  transactions: [], lastUpdated: null
};

// Chart instances
let donutChart=null, barChart=null, nwChart=null;

// UI state
let hFilter='all', txFilter='all', editingId=null, editingDebtIdx=null, editingSalaryIdx=null;
let livePrices={};

function save(){
  S.lastUpdated = new Date().toISOString();
  try { localStorage.setItem(SK, JSON.stringify(S)); } catch(e){}
  _updateSidebarMeta();
}

function loadState(){
  try {
    const raw = localStorage.getItem(SK);
    if(raw){
      const p = JSON.parse(raw);
      S = { ...S, ...p };
      S.settings = Object.assign({ name:'',title:'Financial Tracker',currency:'£',household:false,personNames:['Person 1','Person 2'] }, p.settings||{} );
    }
  } catch(e){}
  // Guard all arrays
  ['holdings','closedHoldings','accounts','debts','goals','salaries','watchlist','netWorthHistory','transactions']
    .forEach(k=>{ if(!Array.isArray(S[k])) S[k]=[]; });
  if(!S.premiumBonds||typeof S.premiumBonds!=='object') S.premiumBonds={amount:0,date:'',wins:[]};
  if(!Array.isArray(S.premiumBonds.wins)) S.premiumBonds.wins=[];
  if(!Array.isArray(S.settings.personNames)||!S.settings.personNames.length) S.settings.personNames=['Person 1'];
}

function _updateSidebarMeta(){
  const name = S.settings.name || S.settings.title || 'Financial Tracker';
  document.getElementById('sidebarTitle').textContent = S.settings.title || 'Financial Tracker';
  document.getElementById('userName').textContent = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
  if(S.lastUpdated){
    const d = new Date(S.lastUpdated);
    document.getElementById('lastUpdated').textContent =
      'saved ' + d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' ' +
      d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }
}
