/**
 * CALCULATION SERVICES
 * Tax, salary, and financial calculations
 */

const UK_TAX = {
  personalAllowance: 12570,
  bands: [
    {name:'Personal allowance', from:0,       to:12570,  rate:0,   color:'#0a8f5c'},
    {name:'Basic rate (20%)',   from:12570,   to:50270,  rate:20,  color:'#1d6fca'},
    {name:'Higher rate (40%)',  from:50270,   to:125140, rate:40,  color:'#b87309'},
    {name:'Additional (45%)',   from:125140,  to:Infinity,rate:45, color:'#cc3333'},
  ],
  ni: {
    ptWeekly:242,
    uelWeekly:967,
    mainRate:8,
    upperRate:2,
  },
  studentLoan: {
    plan1: {threshold:24990, rate:9},
    plan2: {threshold:28470, rate:9},
    plan4: {threshold:32745, rate:9},
    plan5: {threshold:25000, rate:9},
    postgrad:{threshold:21000, rate:6},
  }
};

const ISA_INFO = {
  'stocks-isa':{name:'S&S ISA',limit:20000,color:'#0a8f5c'},
  'cash-isa':{name:'Cash ISA',limit:20000,color:'#1d6fca'},
  'lifetime-isa':{name:'LISA',limit:4000,color:'#5046e5'},
  'help-to-buy-isa':{name:'HTB ISA',limit:2400,color:'#b03070'},
  'innovative-isa':{name:'IFISA',limit:20000,color:'#0b7a6e'},
  'junior-isa':{name:'Junior ISA',limit:9000,color:'#b87309'},
};

/**
 * Calculate UK tax, NI, and student loan repayment
 */
function calcUKTax(gross, pensionPct, bonus, studentLoanPlan) {
  const pensionAmt = gross * (pensionPct || 0) / 100;
  const taxable = Math.max(0, gross - pensionAmt);
  const totalIncome = taxable + (bonus || 0);

  let incomeTax = 0;
  UK_TAX.bands.forEach(band => {
    const from = band.from;
    const to = Math.min(band.to, totalIncome);
    if(to > from && totalIncome > from) {
      incomeTax += Math.max(0, to - from) * band.rate / 100;
    }
  });

  const ptAnnual = UK_TAX.ni.ptWeekly * 52;
  const uelAnnual = UK_TAX.ni.uelWeekly * 52;
  let ni = 0;
  if(totalIncome > ptAnnual) {
    ni += Math.min(totalIncome, uelAnnual) - ptAnnual > 0 ? 
      (Math.min(totalIncome, uelAnnual) - ptAnnual) * UK_TAX.ni.mainRate / 100 : 0;
  }
  if(totalIncome > uelAnnual) {
    ni += (totalIncome - uelAnnual) * UK_TAX.ni.upperRate / 100;
  }

  let slRepayment = 0;
  if(studentLoanPlan && studentLoanPlan !== 'none' && UK_TAX.studentLoan[studentLoanPlan]) {
    const sl = UK_TAX.studentLoan[studentLoanPlan];
    if(totalIncome > sl.threshold) {
      slRepayment = (totalIncome - sl.threshold) * sl.rate / 100;
    }
  }

  const totalDeductions = incomeTax + ni + pensionAmt + slRepayment;
  const takeHome = totalIncome - totalDeductions;
  return {
    gross, 
    bonus: bonus || 0, 
    totalIncome, 
    pensionAmt, 
    incomeTax, 
    ni, 
    slRepayment, 
    totalDeductions, 
    takeHome,
    takeHomeMonthly: takeHome / 12
  };
}

/**
 * Calculate total net worth from all accounts and holdings
 */
function calculateNetWorth() {
  const holdingsValue = S.holdings.reduce((sum, h) => sum + (h.current || 0), 0);
  const closedValue = S.closedHoldings.reduce((sum, h) => sum + (h.soldFor || 0), 0);
  const accountsValue = S.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const pbValue = S.premiumBonds.amount || 0;
  const debtsValue = S.debts.reduce((sum, d) => sum + (d.amount || 0), 0);
  
  return holdingsValue + accountsValue + pbValue - debtsValue;
}

/**
 * Get ISA information by type
 */
function getISAInfo(type) {
  return ISA_INFO[type] || null;
}

const ACC_ICONS = {
  'current':'🏦',
  'savings':'💰',
  'joint':'👫',
  'stocks-isa':'📈',
  'cash-isa':'🏛',
  'lifetime-isa':'🏠',
  'help-to-buy-isa':'🔑',
  'innovative-isa':'💡',
  'junior-isa':'🎓',
  'pension':'🔒',
  'premium-bonds-acc':'🎟',
  'other':'◈'
};

const ACC_COL = {
  'current':'var(--blue)',
  'savings':'var(--green)',
  'joint':'var(--teal)',
  'stocks-isa':'var(--green)',
  'cash-isa':'var(--blue)',
  'lifetime-isa':'var(--accent)',
  'help-to-buy-isa':'var(--pink)',
  'innovative-isa':'var(--teal)',
  'junior-isa':'var(--amber)',
  'pension':'var(--accent)',
  'premium-bonds-acc':'var(--amber)',
  'other':'var(--muted2)'
};
