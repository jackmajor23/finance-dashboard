/**
 * STATE & PERSISTENCE
 * Central state management and localStorage persistence for finance dashboard
 */

const SK = 'wealth-dashboard-v4';

let S = {
  settings:  { 
    name:'', 
    title:'Financial Tracker', 
    currency:'£', 
    household:false, 
    personNames:['Person 1','Person 2'] 
  },
  holdings:  [], 
  closedHoldings: [], 
  accounts: [],
  premiumBonds: { amount:0, date:'', wins:[] },
  debts:     [], 
  goals:    [], 
  salaries: [],
  bills:     [],
  watchlist: [], 
  netWorthHistory: [],
  transactions: [], 
  lastUpdated: null
};

/**
 * Save current state to localStorage
 */
function save() {
  S.lastUpdated = new Date().toISOString();
  try { 
    localStorage.setItem(SK, JSON.stringify(S)); 
  } catch(e) {}
  _updateSidebarMeta();
}

/**
 * Load state from localStorage with fallback defaults
 */
function loadState() {
  try {
    const raw = localStorage.getItem(SK);
    if(raw) {
      const p = JSON.parse(raw);
      S = { ...S, ...p };
      S.settings = Object.assign({ 
        name:'',
        title:'Financial Tracker',
        currency:'£',
        household:false,
        personNames:['Person 1','Person 2'] 
      }, p.settings||{});
    }
  } catch(e) {}
  
  // Guard all arrays
  ['holdings','closedHoldings','accounts','debts','goals','salaries','bills','watchlist','netWorthHistory','transactions']
    .forEach(k => { 
      if(!Array.isArray(S[k])) S[k]=[]; 
    });
  
  if(!S.premiumBonds||typeof S.premiumBonds!=='object') {
    S.premiumBonds={amount:0,date:'',wins:[]};
  }
  if(!Array.isArray(S.premiumBonds.wins)) {
    S.premiumBonds.wins=[];
  }
}

/**
 * Update sidebar with current user info and last saved time
 */
function _updateSidebarMeta() {
  const name = S.settings.name || S.settings.title || 'Financial Tracker';
  const sidebarTitle = document.getElementById('sidebarTitle');
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const lastUpdated = document.getElementById('lastUpdated');
  
  if(sidebarTitle) sidebarTitle.textContent = S.settings.title || 'Financial Tracker';
  if(userName) userName.textContent = name;
  if(userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
  
  if(lastUpdated && S.lastUpdated) {
    const d = new Date(S.lastUpdated);
    lastUpdated.textContent =
      'saved ' + d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' ' +
      d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }
}
