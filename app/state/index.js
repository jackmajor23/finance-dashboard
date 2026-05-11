import { DEFAULT_CURRENCY } from '../utils/format.js';

const STORAGE_KEY = 'wealth_v4';

export const DEFAULT_STATE = {
  user: { name: 'Financial Tracker' },
  settings: {
    name: 'Alex',
    title: "Alex's Wealth",
    currency: DEFAULT_CURRENCY,
    household: true,
    personNames: ['Person 1', 'Person 2'],
    visibility: {
      salary: true,
      holdings: true,
      goals: false,
      debts: true,
    },
  },
  household: {},
  holdings: [],
  closedHoldings: [],
  accounts: [],
  premiumBonds: { amount: 0, date: '', wins: [] },
  salaries: [],
  debts: [],
  goals: [],
  stocks: [],
  transactions: [],
  watchlist: [],
  netWorthHistory: [],
  lastUpdated: null,
};

export let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

export function saveState() {
  state.lastUpdated = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to persist state:', error);
  }
}

export function loadState() {
  try {
    const payload = localStorage.getItem(STORAGE_KEY);
    if (payload) {
      const parsed = JSON.parse(payload);
      state = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...parsed };
      state.settings = {
        ...DEFAULT_STATE.settings,
        ...parsed.settings,
      };
    }
  } catch (error) {
    console.warn('Unable to load state:', error);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

export function resetState() {
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveState();
}
