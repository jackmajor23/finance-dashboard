import { loadState, saveState, state } from './state/index.js';
import { overviewPage } from './pages/overview/index.js';
import { holdingsPage } from './pages/holdings/index.js';
import { accountsPage } from './pages/accounts/index.js';
import { premiumBondsPage } from './pages/premium-bonds/index.js';
import { salaryPage } from './pages/salary/index.js';
import { debtsPage } from './pages/debts/index.js';
import { goalsPage } from './pages/goals/index.js';
import { stocksPage } from './pages/stocks/index.js';
import { taxPage } from './pages/tax/index.js';
import { settingsPage } from './pages/settings/index.js';
import { transactionsPage } from './pages/transactions/index.js';

const PAGES = {
  overview: overviewPage,
  holdings: holdingsPage,
  accounts: accountsPage,
  'premium-bonds': premiumBondsPage,
  salary: salaryPage,
  debts: debtsPage,
  goals: goalsPage,
  stocks: stocksPage,
  tax: taxPage,
  settings: settingsPage,
  transactions: transactionsPage,
};

function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

function activatePage(page) {
  document.querySelectorAll('.page').forEach((node) => {
    node.classList.toggle('active', node.id === `page-${page}`);
  });
}

function navigate(page) {
  if (!PAGES[page]) {
    page = 'overview';
  }
  activatePage(page);
  setActiveNav(page);
  PAGES[page].render(state);
}

function bindNav() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });
}

function initialize() {
  loadState();
  bindNav();
  navigate('overview');

  const refreshButton = document.getElementById('refreshPricesBtn');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      // placeholder for future refresh behavior
      saveState();
      navigate('overview');
    });
  }
}

window.addEventListener('DOMContentLoaded', initialize);

export { navigate, PAGES };
