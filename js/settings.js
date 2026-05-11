// ── Settings, sample data & clear ───────────────────
// 21. JS: SETTINGS
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
// 22. JS: SAMPLE DATA & INIT
// ═══════════════════════════════════════════════════
function loadSample(){
  S.settings = { name:'Alex', title:"Alex's Wealth", currency:'£', household:true, personNames:['Alex','Partner'] };
  S.holdings = [
    {id:1,name:'Apple Inc.',ticker:'AAPL',type:'stocks',invested:2000,current:2640,buyPrice:'148.50',shares:'15',buyDate:'2023-06-01',wrapper:'gia',notes:'Long-term hold'},
    {id:2,name:'Vanguard S&P 500',ticker:'VUSA.L',type:'isa',invested:5000,current:6200,buyPrice:'80.20',shares:'70',buyDate:'2022-03-15',wrapper:'stocks-isa',notes:'Core holding'},
    {id:3,name:'Bitcoin',ticker:'BTC-GBP',type:'crypto',invested:1500,current:1950,buyPrice:'22000',shares:'0.068',buyDate:'2023-01-10',wrapper:'',notes:''},
    {id:4,name:'Tesla',ticker:'TSLA',type:'stocks',invested:800,current:590,buyPrice:'220',shares:'4',buyDate:'2023-09-20',wrapper:'gia',notes:'Speculative position'},
    {id:5,name:'iShares MSCI World',ticker:'SWDA.L',type:'isa',invested:3000,current:3600,buyPrice:'81.50',shares:'42',buyDate:'2022-08-01',wrapper:'stocks-isa',notes:'Global diversification'},
  ];
  S.closedHoldings=[{id:99,name:'Ethereum',ticker:'ETH-GBP',type:'crypto',invested:700,soldFor:1044,buyPrice:'1200',buyDate:'2022-05-01',sellPrice:'1800',sellDate:'2024-02-15'}];
  S.accounts=[
    {name:'Monzo Current',type:'current',provider:'Monzo',balance:3200,contrib:0},
    {name:'Marcus Savings',type:'savings',provider:'Marcus',balance:8500,contrib:0},
    {name:'Vanguard ISA',type:'stocks-isa',provider:'Vanguard',balance:9800,contrib:8000},
    {name:'Moneybox LISA',type:'lifetime-isa',provider:'Moneybox',balance:12000,contrib:3200},
    {name:'Barclays HTB ISA',type:'help-to-buy-isa',provider:'Barclays',balance:3400,contrib:2400},
  ];
  S.premiumBonds={amount:10000,date:'2023-04-01',wins:[
    {amount:25,date:'2024-07-01',month:7,year:2024,autoAdded:false},
    {amount:50,date:'2024-09-01',month:9,year:2024,autoAdded:true},
    {amount:25,date:'2025-01-01',month:1,year:2025,autoAdded:false},
    {amount:25,date:'2025-03-01',month:3,year:2025,autoAdded:false},
  ]};
  S.debts=[
    {name:'Car finance',type:'car',total:12000,remaining:8400,monthly:350,rate:6.9,start:'2023-01-01',end:'2026-01-01',lender:'Santander',notes:'Final balloon payment Jan 2026'},
    {name:'Student loan',type:'student',total:27000,remaining:24000,monthly:180,rate:4.5,start:'2020-09-01',end:'2035-09-01',lender:'SLC',notes:'Plan 2'},
  ];
  S.goals=[
    {name:'House deposit',target:40000,saved:24000,date:'2027-06-01',monthly:600,emoji:'🏠'},
    {name:'Emergency fund',target:10000,saved:8500,date:'2025-12-01',monthly:200,emoji:'🛡'},
    {name:'New car',target:15000,saved:3200,date:'2026-09-01',monthly:400,emoji:'🚗'},
  ];
  S.salaries=[
    {person:0,employer:'Acme Ltd',gross:48000,bonus:3000,pensionPct:5,employerPension:3,studentLoan:'plan2',startDate:'2022-09-01',ongoing:true,endDate:null,notes:'Includes £3k annual bonus'},
    {person:1,employer:'NHS',gross:35000,bonus:0,pensionPct:7,employerPension:14,studentLoan:'none',startDate:'2021-03-01',ongoing:true,endDate:null,notes:'NHS pension scheme'},
  ];
  S.watchlist=['NVDA','^FTSE','^GSPC','ETH-GBP'];
  S.transactions=[
    {id:1,txtype:'buy',date:'2023-06-01',desc:'Bought Apple Inc. (AAPL)',amount:2000,pnl:0,notes:''},
    {id:2,txtype:'buy',date:'2022-03-15',desc:'Bought Vanguard S&P 500 (VUSA.L)',amount:5000,pnl:0,notes:''},
    {id:3,txtype:'buy',date:'2023-01-10',desc:'Bought Bitcoin (BTC-GBP)',amount:1500,pnl:0,notes:''},
    {id:4,txtype:'sell',date:'2024-02-15',desc:'Sold Ethereum (ETH-GBP)',amount:1044,pnl:344,notes:'Cost: £700 · Proceeds: £1,044'},
    {id:5,txtype:'win',date:'2025-01-01',desc:'Premium Bond prize',amount:25,pnl:25,notes:'£25 prize · paid to bank'},
    {id:6,txtype:'income',date:'2022-09-01',desc:'Salary: Acme Ltd',amount:48000,pnl:0,notes:'Person 1'},
    {id:7,txtype:'payment',date:'2023-01-01',desc:'Debt: Car finance',amount:12000,pnl:-12000,notes:'£350/month · 6.9% APR'},
  ];
  S.netWorthHistory=[];
  for(let i=60;i>=0;i--){
    const dt=new Date(); dt.setDate(dt.getDate()-i);
    S.netWorthHistory.push({date:dt.toISOString().split('T')[0],value:Math.round(42000+Math.random()*3000-500+(60-i)*200)});
  }
  save(); toast('Sample data loaded! 🎉'); renderOverview();
}
