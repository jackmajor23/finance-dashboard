// ── Global Constants & Configuration ────────────────────
// Centralized configuration to reduce duplication across modules
// ═══════════════════════════════════════════════════

// UK TAX CONFIGURATION - Used in salary.js
const UK_TAX = {
  personalAllowance: 12570,
  bands: [
    { name: 'Personal allowance', from: 0, to: 12570, rate: 0, color: '#0a8f5c' },
    { name: 'Basic rate (20%)', from: 12570, to: 50270, rate: 20, color: '#1d6fca' },
    { name: 'Higher rate (40%)', from: 50270, to: 125140, rate: 40, color: '#b87309' },
    { name: 'Additional (45%)', from: 125140, to: Infinity, rate: 45, color: '#cc3333' },
  ],
  ni: {
    ptWeekly: 242, // Primary threshold 2025/26 (weekly) - annual = 12,570
    uelWeekly: 967, // UEL (weekly) - annual = 50,270
    mainRate: 8,
    upperRate: 2,
  },
};

// UK TAX CONFIGURATION 2026/27 (Next Tax Year)
const UK_TAX_NEXT = {
  personalAllowance: 12570, // Frozen until 2028
  bands: [
    { name: 'Personal allowance', from: 0, to: 12570, rate: 0, color: '#0a8f5c' },
    { name: 'Basic rate (20%)', from: 12570, to: 50270, rate: 20, color: '#1d6fca' },
    { name: 'Higher rate (40%)', from: 50270, to: 125140, rate: 40, color: '#b87309' },
    { name: 'Additional (45%)', from: 125140, to: Infinity, rate: 45, color: '#cc3333' },
  ],
  ni: {
    ptWeekly: 242, // Frozen until 2028
    uelWeekly: 967, // Frozen until 2028
    mainRate: 8,
    upperRate: 2,
  },
  cgtAllowance: 3000, // Frozen at £3,000 until 2029
  isaAllowance: 20000, // Frozen at £20,000 until 2030
};

// STUDENT LOAN RULES - Used in debts.js
const UK_STUDENT_LOAN_RULES = {
  plan1: { threshold: 24990, rate: 9, writeoff: 2027 },
  plan2: { threshold: 28470, rate: 9, writeoff: 2042 },
  plan4: { threshold: 32745, rate: 9, writeoff: 2036 },
  plan5: { threshold: 25000, rate: 9, writeoff: 2051 },
  postgrad: { threshold: 21000, rate: 6, writeoff: 2033 }
};

// ISA INFORMATION - Used in accounts.js and overview.js
const ISA_INFO = {
  'stocks-isa': { name: 'Stocks & Shares ISA', limit: 20000, color: '#0a8f5c', desc: 'Invest in stocks, funds & ETFs. Tax-free gains. £20k/yr.' },
  'cash-isa': { name: 'Cash ISA', limit: 20000, color: '#1d6fca', desc: 'Tax-free interest on cash savings. £20k/yr.' },
  'lifetime-isa': { name: 'Lifetime ISA (LISA)', limit: 4000, color: '#5046e5', desc: '25% Gov bonus. First home or retirement. £4k/yr. Age 18–39.' },
  'help-to-buy-isa': { name: 'Help to Buy ISA', limit: 2400, color: '#b03070', desc: 'Gov bonus on first home purchase. Closed to new applicants Dec 2019.' },
  'innovative-isa': { name: 'Innovative Finance ISA', limit: 20000, color: '#0b7a6e', desc: 'P2P lending wrapper. Higher risk. £20k/yr (shared allowance).' },
  'junior-isa': { name: 'Junior ISA', limit: 9000, color: '#b87309', desc: 'Tax-free savings for under 18s. £9k/yr.' },
};

// ACCOUNT ICONS - Used in accounts.js
const ACC_ICONS = {
  'current': '🏦',
  'savings': '💰',
  'joint': '👫',
  'stocks-isa': '📈',
  'cash-isa': '🏛',
  'lifetime-isa': '🏠',
  'help-to-buy-isa': '🔑',
  'innovative-isa': '💡',
  'junior-isa': '🎓',
  'pension': '🏦',
  'premium-bonds-acc': '🎰',
  'credit-card': '💳',
  'other': '◈'
};

// ACCOUNT COLORS - Used in accounts.js
const ACC_COL = {
  'current': 'var(--blue)',
  'savings': 'var(--green)',
  'joint': 'var(--teal)',
  'stocks-isa': 'var(--green)',
  'cash-isa': 'var(--blue)',
  'lifetime-isa': 'var(--accent)',
  'help-to-buy-isa': 'var(--pink)',
  'innovative-isa': 'var(--teal)',
  'junior-isa': 'var(--amber)',
  'pension': 'var(--purple)',
  'premium-bonds-acc': 'var(--amber)',
  'credit-card': 'var(--red)',
  'other': 'var(--muted2)'
};

// TYPE COLORS FOR CHARTS - Used in overview.js
const TYPE_COLORS = {
  stocks: '#1d6fca',
  isa: '#0a8f5c',
  crypto: '#b87309',
  cash: '#7c7b8a',
  pension: '#5046e5',
  property: '#b03070',
  other: '#0b7a6e',
  current: '#6b7280',
  savings: '#0a8f5c',
  joint: '#1d6fca',
  'premium bonds': '#ff9800',
};

// DEBT TYPES - Used in debts.js  
const DEBT_TYPES = ['Loan', 'Mortgage', 'Credit-card', 'Student', 'Car', 'Other'];

// HOLDING TYPES - Used in investments.js
const HOLDING_TYPES = ['stocks', 'isa', 'crypto', 'cash', 'pension', 'property', 'other'];

// WRAPPER TYPES - Used in investments.js
const WRAPPER_TYPES = ['', 'stocks-isa', 'cash-isa', 'lifetime-isa', 'pension', 'gia'];

// GOAL EMOJIS - Used in goals.js
const GOAL_EMOJIS = [
  { value: '🏠', label: 'House' },
  { value: '🚗', label: 'Car' },
  { value: '✈️', label: 'Vacation' },
  { value: '🎓', label: 'Education' },
  { value: '🏖️', label: 'Retirement' },
  { value: '💰', label: 'Savings' },
  { value: '🏦', label: 'Bank' },
  { value: '📈', label: 'Investment' },
  { value: '🎯', label: 'Goal' },
  { value: '🏆', label: 'Achievement' },
  { value: '💍', label: 'Wedding' },
  { value: '🏥', label: 'Health' },
  { value: '📚', label: 'Books' },
  { value: '🎮', label: 'Gaming' },
  { value: '🍔', label: 'Food' },
  { value: '🛡️', label: 'Emergency' },
  { value: '🎁', label: 'Gift' },
  { value: '🏃', label: 'Fitness' },
  { value: '🎨', label: 'Hobby' },
  { value: '◐', label: 'Default' },
];

// PREMIUM BOND TIERS - Used in premium-bonds.js
const PB_TIERS = [25, 50, 100, 500, 1000, 5000, 25000, 50000, 100000, 1000000];

// DOM ELEMENT IDS - Used across the site
const DOM_IDS = {
  personManagement: 'personManagement',
};

// SALARY PERKS - Used in salary.js
const SALARY_PERKS = [
  { value: 'car', label: 'Company car', icon: '🚗' },
  { value: 'healthcare', label: 'Private healthcare', icon: '🏥' },
  { value: 'gym', label: 'Gym membership', icon: '🏋️' },
  { value: 'phone', label: 'Phone allowance', icon: '📱' },
  { value: 'laptop', label: 'Laptop/equipment', icon: '💻' },
  { value: 'subscriptions', label: 'Software subscriptions', icon: '📦' },
  { value: 'meals', label: 'Meal allowance', icon: '🍽️' },
  { value: 'travel', label: 'Travel allowance', icon: '✈️' },
  { value: 'insurance', label: 'Life insurance', icon: '🛡️' },
  { value: 'training', label: 'Training budget', icon: '📚' },
  { value: 'bonus', label: 'Performance bonus', icon: '💰' },
  { value: 'shares', label: 'Share options', icon: '📈' },
  { value: 'other', label: 'Other', icon: '◈' },
];

// PAY DAY OPTIONS - Used in salary.js
const PAY_DAY_OPTIONS = [
  { value: 'last_day', label: 'Last day of month' },
  { value: 'first_day', label: 'First day of month' },
  { value: '15th', label: '15th of month' },
  { value: '25th', label: '25th of month' },
  { value: 'weekly', label: 'Weekly (Friday)' },
  { value: 'bi_weekly', label: 'Bi-weekly (every 2 weeks)' },
  { value: 'four_weekly', label: 'Four-weekly' },
  { value: 'custom', label: 'Custom day' },
];

// MONTHS - Used across multiple files
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// STORAGE KEY
const STORAGE_KEY = 'wealth_v4';

// CHART PERIOD CUTOFFS - Used in overview.js
const CHART_PERIODS = {
  '1w': 7 * 86400000,
  '1m': 30 * 86400000,
  '3m': 90 * 86400000,
  '6m': 180 * 86400000,
  '1y': 365 * 86400000,
  '5y': 5 * 365 * 86400000,
};

// PROGRESS COLORS
const PROGRESS_COLORS = {
  positive: '#0a8f5c',
  negative: '#cc3333',
  neutral: '#7c7b8a',
};
