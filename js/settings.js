// ── Settings, sample data & clear ───────────────────
// JS: SETTINGS
// ═══════════════════════════════════════════════════
function saveSettings(){
  S.settings.name    = (document.getElementById('setName').value||'').trim();
  S.settings.title   = (document.getElementById('setTitle').value||'').trim()||'My Wealth';
  S.settings.currency= (document.getElementById('setCurrency').value||'£').trim();
  if(!S.settings.personNames||!S.settings.personNames.length) S.settings.personNames=['Person 1'];
  save(); renderOverview(); toast('Settings saved');
}

function clearAll(){
  if(!confirm('Clear all data? This cannot be undone.')) return;
  localStorage.removeItem(SK);
  location.reload();
}

// ═══════════════════════════════════════════════════
// JS: SAMPLE DATA & INIT
// ═══════════════════════════════════════════════════
function loadSample(){
  S.settings = { name:'Jordan', title:"Jordan's Financial Dashboard", currency:'£', household:true, personNames:['Jordan','Alex'] };
  S.holdings = [
    {id:1,name:'Apple Inc.',ticker:'AAPL',type:'stocks',invested:3000,current:4200,buyPrice:'180.50',shares:'16.5',buyDate:'2024-01-15',wrapper:'gia',notes:'Tech growth stock'},
    {id:2,name:'Vanguard FTSE All-World',ticker:'VWRL.L',type:'isa',invested:8000,current:9500,buyPrice:'95.20',shares:'84',buyDate:'2023-06-01',wrapper:'stocks-isa',notes:'Global index fund'},
    {id:3,name:'Bitcoin',ticker:'BTC-GBP',type:'crypto',invested:2500,current:3200,buyPrice:'35000',shares:'0.071',buyDate:'2024-03-10',wrapper:'',notes:'HODL strategy'},
    {id:4,name:'Nvidia Corp.',ticker:'NVDA',type:'stocks',invested:1500,current:2100,buyPrice:'450',shares:'3.33',buyDate:'2025-02-20',wrapper:'gia',notes:'AI boom play'},
    {id:5,name:'iShares Core FTSE 100',ticker:'ISF.L',type:'isa',invested:4000,current:4600,buyPrice:'780',shares:'5.13',buyDate:'2024-09-01',wrapper:'stocks-isa',notes:'UK market exposure'},
    {id:6,name:'Ethereum',ticker:'ETH-GBP',type:'crypto',invested:1200,current:1800,buyPrice:'2200',shares:'0.545',buyDate:'2025-01-05',wrapper:'',notes:'DeFi potential'},
  ];
  S.closedHoldings=[
    {id:99,name:'Tesla Inc.',ticker:'TSLA',type:'stocks',invested:1000,soldFor:1400,buyPrice:'250',buyDate:'2023-05-01',sellPrice:'350',sellDate:'2025-11-15',notes:'Profit taken'},
    {id:100,name:'Solana',ticker:'SOL-GBP',type:'crypto',invested:800,soldFor:600,buyPrice:'80',buyDate:'2024-07-01',sellPrice:'60',sellDate:'2025-12-01',notes:'Cut losses'}
  ];
  S.accounts=[
    {name:'Revolut Current',type:'current',provider:'Revolut',balance:4500,contrib:0},
    {name:'HSBC Savings',type:'savings',provider:'HSBC',balance:15000,contrib:0},
    {name:'Vanguard ISA',type:'stocks-isa',provider:'Vanguard',balance:14500,contrib:12000},
    {name:'Moneyfarm LISA',type:'lifetime-isa',provider:'Moneyfarm',balance:18000,contrib:4800},
    {name:'Santander HTB ISA',type:'help-to-buy-isa',provider:'Santander',balance:5200,contrib:3600},
    {name:'Aviva Pension',type:'pension',provider:'Aviva',balance:85000,contrib:25000},
  ];
  S.premiumBonds={amount:15000,date:'2024-02-01',wins:[
    {amount:25,date:'2025-01-01',month:1,year:2025,autoAdded:false},
    {amount:50,date:'2025-03-01',month:3,year:2025,autoAdded:true},
    {amount:100,date:'2025-07-01',month:7,year:2025,autoAdded:false},
    {amount:25,date:'2025-09-01',month:9,year:2025,autoAdded:false},
    {amount:50,date:'2026-01-01',month:1,year:2026,autoAdded:true},
  ]};
  S.debts=[
    {name:'Mortgage',type:'mortgage',total:400000,remaining:350000,monthly:1800,rate:2.5,start:'2020-05-01',end:'2050-05-01',lender:'HSBC',notes:'Fixed rate until 2028'},
    {name:'Car Loan',type:'car',total:20000,remaining:12000,monthly:450,rate:5.9,start:'2024-06-01',end:'2028-06-01',lender:'Toyota Finance',notes:'For new hybrid car'},
    {name:'Credit Card',type:'credit',total:5000,remaining:1200,monthly:200,rate:18.9,start:'2025-01-01',end:'2026-01-01',lender:'Amex',notes:'0% for 12 months'},
  ];
  S.goals=[
    {name:'Holiday Fund',target:5000,saved:3200,date:'2026-08-01',monthly:300,emoji:'✈️'},
    {name:'Home Improvements',target:25000,saved:8500,date:'2027-03-01',monthly:500,emoji:'🏠'},
    {name:'Investment Buffer',target:20000,saved:12000,date:'2026-12-01',monthly:400,emoji:'💰'},
  ];
  S.salaries=[
    {person:0,employer:'TechCorp Ltd',gross:65000,bonus:5000,pensionPct:5,employerPension:3,studentLoan:'none',startDate:'2023-04-01',ongoing:true,endDate:null,notes:'Senior developer role'},
    {person:1,employer:'NHS Trust',gross:42000,bonus:0,pensionPct:7,employerPension:14,studentLoan:'plan2',startDate:'2022-09-01',ongoing:true,endDate:null,notes:'Healthcare professional'},
  ];
  S.watchlist=['AAPL','NVDA','BTC-GBP','ETH-GBP','GOOGL','MSFT'];
  S.transactions=[
    {id:1,txtype:'buy',date:'2024-01-15',desc:'Bought Apple Inc. (AAPL)',amount:3000,pnl:0,notes:''},
    {id:2,txtype:'buy',date:'2023-06-01',desc:'Bought Vanguard FTSE All-World (VWRL.L)',amount:8000,pnl:0,notes:''},
    {id:3,txtype:'buy',date:'2024-03-10',desc:'Bought Bitcoin (BTC-GBP)',amount:2500,pnl:0,notes:''},
    {id:4,txtype:'sell',date:'2025-11-15',desc:'Sold Tesla Inc. (TSLA)',amount:1400,pnl:400,notes:'Profit: £400'},
    {id:5,txtype:'win',date:'2025-07-01',desc:'Premium Bond prize',amount:100,pnl:100,notes:'£100 prize'},
    {id:6,txtype:'income',date:'2025-04-01',desc:'Salary: TechCorp Ltd',amount:65000,pnl:0,notes:'Person 1'},
    {id:7,txtype:'payment',date:'2024-06-01',desc:'Car Loan',amount:20000,pnl:-20000,notes:'£450/month · 5.9% APR'},
    {id:8,txtype:'buy',date:'2025-02-20',desc:'Bought Nvidia Corp. (NVDA)',amount:1500,pnl:0,notes:''},
    {id:9,txtype:'sell',date:'2025-12-01',desc:'Sold Solana (SOL-GBP)',amount:600,pnl:-200,notes:'Loss: £200'},
  ];
  S.bills=[
    {id:1,name:'Electricity & Gas',category:'utilities',amount:180,frequency:'monthly',nextPaymentDate:'2026-06-01',recurring:'monthly',endDate:'',notes:'Octopus Energy',createdDate:'2025-01-01'},
    {id:2,name:'Council Tax',category:'taxes',amount:220,frequency:'monthly',nextPaymentDate:'2026-06-01',recurring:'monthly',endDate:'',notes:'Band D property',createdDate:'2025-01-01'},
    {id:3,name:'Water Bill',category:'utilities',amount:45,frequency:'quarterly',nextPaymentDate:'2026-07-01',recurring:'quarterly',endDate:'',notes:'Thames Water',createdDate:'2025-01-01'},
    {id:4,name:'Car Insurance',category:'insurance',amount:950,frequency:'yearly',nextPaymentDate:'2026-09-15',recurring:'yearly',endDate:'',notes:'Fully comp, £500 excess',createdDate:'2025-01-01'},
    {id:5,name:'Home Insurance',category:'insurance',amount:120,frequency:'yearly',nextPaymentDate:'2026-11-01',recurring:'yearly',endDate:'',notes:'Buildings & contents',createdDate:'2025-01-01'},
    {id:6,name:'Broadband',category:'utilities',amount:35,frequency:'monthly',nextPaymentDate:'2026-06-01',recurring:'monthly',endDate:'',notes:'Virgin Media 100Mbps',createdDate:'2025-01-01'},
  ];
  S.properties=[
    {
      person:0,
      nickname:'Family Home',
      address:'15 Oak Street, Bristol, BS1 2AB',
      type:'residential',
      tenure:'freehold',
      purchasePrice:550000,
      depositAmount:110000,
      purchaseDate:'2021-08-15',
      estValue:720000,
      mortgageType:'repayment',
      mortgageLender:'HSBC',
      mortgageBalance:385000,
      mortgageRate:2.25,
      mortgageMonthly:1650,
      mortgageEndDate:'2051-08-15',
      mortgageAccountNo:'HSBC123456',
      leaseYears:null,
      serviceCharge:null,
      groundRent:null,
      isRented:false,
      rentalMonthly:0,
      tenancyStart:'',
      tenancyEnd:'',
      agentFeesPct:null,
      notes:'4 bedroom detached house, garden, garage'
    },
    {
      person:1,
      nickname:'Investment Property',
      address:'42 High Street, Manchester, M1 3AB',
      type:'buy-to-let',
      tenure:'leasehold',
      purchasePrice:280000,
      depositAmount:56000,
      purchaseDate:'2023-11-01',
      estValue:310000,
      mortgageType:'interest-only',
      mortgageLender:'Barclays',
      mortgageBalance:196000,
      mortgageRate:3.5,
      mortgageMonthly:570,
      mortgageEndDate:'2053-11-01',
      mortgageAccountNo:'BARC789012',
      leaseYears:99,
      serviceCharge:1800,
      groundRent:450,
      isRented:true,
      rentalMonthly:1400,
      tenancyStart:'2024-01-01',
      tenancyEnd:'2026-12-31',
      agentFeesPct:8,
      notes:'2 bedroom flat, furnished, good rental yield'
    }
  ];
  S.netWorthHistory=[];
  for(let i=60;i>=0;i--){
    const dt=new Date(); dt.setDate(dt.getDate()-i);
    S.netWorthHistory.push({date:dt.toISOString().split('T')[0],value:Math.round(65000+Math.random()*5000-1000+(60-i)*300)});
  }
  save(); toast('Sample data loaded! 🎉'); renderOverview();
}
