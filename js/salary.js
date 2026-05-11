// ── Salary & UK tax ──────────────────────────────────
// 15. JS: SALARY (UK tax calculation)
// ═══════════════════════════════════════════════════
// UK 2025/26 tax bands
const UK_TAX = {
  personalAllowance: 12570,
  bands: [
    {name:'Personal allowance', from:0,       to:12570,  rate:0,   color:'#0a8f5c'},
    {name:'Basic rate (20%)',   from:12570,   to:50270,  rate:20,  color:'#1d6fca'},
    {name:'Higher rate (40%)',  from:50270,   to:125140, rate:40,  color:'#b87309'},
    {name:'Additional (45%)',   from:125140,  to:Infinity,rate:45, color:'#cc3333'},
  ],
  ni: {
    ptWeekly:242, // Primary threshold 2025/26 (weekly) - annual = 12,570
    uelWeekly:967, // UEL (weekly) - annual = 50,270
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

function calcUKTax(gross, pensionPct, bonus, studentLoanPlan){
  const pensionAmt = gross * (pensionPct||0)/100;
  const taxable = Math.max(0, gross - pensionAmt); // simplified: ignoring salary sacrifice nuance
  const totalIncome = taxable + (bonus||0);

  // Income tax
  let incomeTax=0;
  UK_TAX.bands.forEach(band=>{
    const from=band.from, to=Math.min(band.to, totalIncome);
    if(to>from && totalIncome>from) incomeTax += Math.max(0, to-from) * band.rate/100;
  });

  // NI (simplified annual)
  const ptAnnual=UK_TAX.ni.ptWeekly*52; // ~12,570
  const uelAnnual=UK_TAX.ni.uelWeekly*52; // ~50,270
  let ni=0;
  if(totalIncome>ptAnnual) ni += Math.min(totalIncome,uelAnnual)-ptAnnual > 0 ? (Math.min(totalIncome,uelAnnual)-ptAnnual)*UK_TAX.ni.mainRate/100 : 0;
  if(totalIncome>uelAnnual) ni += (totalIncome-uelAnnual)*UK_TAX.ni.upperRate/100;

  // Student loan
  let slRepayment=0;
  if(studentLoanPlan && studentLoanPlan!=='none' && UK_TAX.studentLoan[studentLoanPlan]){
    const sl=UK_TAX.studentLoan[studentLoanPlan];
    if(totalIncome>sl.threshold) slRepayment=(totalIncome-sl.threshold)*sl.rate/100;
  }

  const totalDeductions=incomeTax+ni+pensionAmt+slRepayment;
  const takeHome=totalIncome-totalDeductions;
  return {gross,bonus:bonus||0,totalIncome,pensionAmt,incomeTax,ni,slRepayment,totalDeductions,takeHome,takeHomeMonthly:takeHome/12};
}

let currentPersonIdx=0;

function addNewPerson(){
  const newPerson='Person '+(S.settings.personNames.length+1);
  S.settings.personNames.push(newPerson);
  save(); renderSalary();
}

function removePerson(idx){
  if(S.settings.personNames.length<=1){ toast('You must have at least one person.'); return; }
  S.settings.personNames.splice(idx,1);
  S.salaries=S.salaries.filter(s=>(s.person||0)!==idx);
  S.salaries.forEach(s=>{ if((s.person||0)>idx) s.person--; });
  currentPersonIdx=Math.min(currentPersonIdx,S.settings.personNames.length-1);
  save(); renderSalary();
}

function editPersonName(idx){
  const current=S.settings.personNames[idx];
  const newName=prompt('Edit person name:',current);
  if(newName && newName.trim()){
    S.settings.personNames[idx]=newName.trim();
    save(); renderSalary();
  }
}

function renderSalary(){
  // Populate person dropdown
  const personSel=document.getElementById('salPerson');
  personSel.innerHTML=S.settings.personNames.map((p,i)=>`<option value="${i}">${p}</option>`).join('');
  personSel.value=currentPersonIdx;

  // Render person management cards
  const pmEl=document.getElementById('personManagement');
  pmEl.innerHTML=S.settings.personNames.map((p,i)=>`
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;cursor:pointer;" onclick="switchPerson(${i})">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:600;font-size:13px;">${p}</span>
        <div style="display:flex;gap:6px;">
          <button class="icon-btn edit" style="width:24px;height:24px;padding:0;font-size:11px;" onclick="editPersonName(${i}); event.stopPropagation();">✎</button>
          ${S.settings.personNames.length>1?`<button class="icon-btn del" style="width:24px;height:24px;padding:0;font-size:11px;" onclick="removePerson(${i}); event.stopPropagation();">✕</button>`:''}
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);">${S.salaries.filter(s=>(s.person||0)===i).length} salary record${S.salaries.filter(s=>(s.person||0)===i).length!==1?'s':''}</div>
    </div>
  `).join('');

  // Render person tabs
  const tabsEl=document.getElementById('personTabs');
  const allPeople=[...S.settings.personNames];
  if(allPeople.length>1) allPeople.push('Household');
  
  if(allPeople.length>1){
    tabsEl.innerHTML=allPeople.map((p,i)=>{
      const isHousehold=i===allPeople.length-1;
      return`<button class="person-btn ${currentPersonIdx===i?'active':''}" onclick="switchPerson(${i})">${isHousehold?'📊 '+p:p}</button>`;
    }).join('');
  } else { tabsEl.innerHTML=''; currentPersonIdx=0; }

  // Get content based on current view
  const el=document.getElementById('salaryContent');
  const isHousehold=S.settings.personNames.length>1 && currentPersonIdx===S.settings.personNames.length;
  
  if(isHousehold){
    renderHouseholdSalary(el);
  } else {
    renderPersonSalary(el,currentPersonIdx);
  }
}

function switchPerson(idx){
  currentPersonIdx=idx;
  renderSalary();
}

function renderPersonSalary(el,personIdx){
  const personSals=S.salaries.filter(s=>(s.person||0)===personIdx);
  
  if(!personSals.length){
    el.innerHTML=`<div class="empty"><div class="ei">◈</div><p>No salary added for ${S.settings.personNames[personIdx]} yet.</p></div>`;
    return;
  }

  const sal=personSals[personSals.length-1];
  const calc=calcUKTax(sal.gross||0, sal.pensionPct||0, sal.bonus||0, sal.studentLoan||'none');

  el.innerHTML=`
    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Gross salary</div><div class="sal-val val">${fmt(calc.gross)}</div><div class="sal-sub">per year · ${sal.employer||'—'}</div></div>
      <div class="sal-card"><div class="sal-label">Bonus</div><div class="sal-val val">${fmt(calc.bonus)}</div><div class="sal-sub">annual</div></div>
      <div class="sal-card"><div class="sal-label">Total income</div><div class="sal-val val">${fmt(calc.totalIncome)}</div><div class="sal-sub">salary + bonus</div></div>
      <div class="sal-card"><div class="sal-label">Income tax</div><div class="sal-val neg val">${fmt(calc.incomeTax)}</div><div class="sal-sub">PAYE 2025/26</div></div>
      <div class="sal-card"><div class="sal-label">National Insurance</div><div class="sal-val neg val">${fmt(calc.ni)}</div><div class="sal-sub">employee NI</div></div>
      <div class="sal-card"><div class="sal-label">Pension (yours)</div><div class="sal-val val">${fmt(calc.pensionAmt)}</div><div class="sal-sub">${sal.pensionPct||0}% of gross</div></div>
      ${calc.slRepayment>0?`<div class="sal-card"><div class="sal-label">Student loan</div><div class="sal-val neg val">${fmt(calc.slRepayment)}</div><div class="sal-sub">${sal.studentLoan} plan</div></div>`:''}
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Take-home (annual)</div><div class="sal-val pos val">${fmt(calc.takeHome)}</div><div class="sal-sub"><span class="val">${fmt(calc.takeHomeMonthly)}</span>/month</div></div>
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Take-home (monthly)</div><div class="sal-val pos val">${fmt(calc.takeHomeMonthly)}</div><div class="sal-sub">estimated net</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="card">
        <div class="card-header"><span class="card-title">UK tax bands 2025/26</span></div>
        <table class="tax-band-table">
          ${UK_TAX.bands.map(b=>{
            const from=b.from, to=Math.min(b.to,calc.totalIncome);
            const taxable=Math.max(0,to-from);
            const amt=taxable*b.rate/100;
            if(calc.totalIncome<b.from) return '';
            return`<tr>
              <td><span class="band-dot" style="background:${b.color};"></span>${b.name}</td>
              <td style="color:var(--muted);font-size:11px;">${fmt(b.from)} – ${b.to===Infinity?'above':fmt(b.to)}</td>
              <td style="font-variation-settings:'wght' 600;">${b.rate}%</td>
              <td style="font-variation-settings:'wght' 600;color:${b.rate>0?'var(--red)':'var(--green)'};" class="val">${b.rate>0?'-'+fmt(amt):'✓ Tax-free'}</td>
            </tr>`;
          }).join('')}
        </table>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Annual breakdown</span></div>
        <div class="sal-chart-wrap"><canvas id="salChart"></canvas></div>
      </div>
    </div>

    <div class="section-label">Salary history · ${S.settings.personNames[personIdx]}</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Employer</th><th>Gross</th><th>Bonus</th><th>Take-home/mo</th><th>Started</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${personSals.map((s,i)=>{
            const c=calcUKTax(s.gross||0,s.pensionPct||0,s.bonus||0,s.studentLoan||'none');
            return`<tr>
              <td style="font-variation-settings:'wght' 600;">${s.employer||'—'}</td>
              <td class="val">${fmt(s.gross)}</td>
              <td class="val">${s.bonus?fmt(s.bonus):'—'}</td>
              <td class="pos val">${fmt(c.takeHomeMonthly)}</td>
              <td>${fmtDate(s.startDate)}</td>
              <td><span class="pill ${s.ongoing!==false?'p-income':'p-payment'}">${s.ongoing!==false?'Ongoing':fmtDate(s.endDate)}</span></td>
              <td>
                <button class="icon-btn edit" onclick="openEditSalary(${S.salaries.indexOf(s)})">✎</button>
                <button class="icon-btn del" onclick="deleteSalary(${S.salaries.indexOf(s)})">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${sal.notes?`<div style="padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);font-size:12px;color:var(--muted2);margin-bottom:16px;">📝 ${sal.notes}</div>`:''}`;

  setTimeout(()=>{
    const ctx=document.getElementById('salChart');
    if(!ctx) return;
    if(window._salChart) window._salChart.destroy();
    window._salChart=new Chart(ctx,{
      type:'doughnut',
      data:{
        labels:['Take-home','Income tax','NI','Pension',...(calc.slRepayment>0?['Student loan']:[])],
        datasets:[{data:[Math.round(calc.takeHome),Math.round(calc.incomeTax),Math.round(calc.ni),Math.round(calc.pensionAmt),...(calc.slRepayment>0?[Math.round(calc.slRepayment)]:[])],backgroundColor:['#0a8f5c','#cc3333','#b87309','#5046e5','#0b7a6e'],borderWidth:0}]
      },
      options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:10,padding:10}},tooltip:{callbacks:{label:ctx=>` ${fmt(ctx.raw)}`}}}}
    });
  },50);
}

function renderHouseholdSalary(el){
  const hhSals=S.salaries;
  if(!hhSals.length){
    el.innerHTML=`<div class="empty"><div class="ei">◈</div><p>No salaries added yet.</p></div>`;
    return;
  }

  const totals={gross:0,bonus:0,incomeTax:0,ni:0,pensionAmt:0,slRepayment:0,takeHome:0};
  const breakdowns=[];
  
  S.settings.personNames.forEach((p,i)=>{
    const personSals=S.salaries.filter(s=>(s.person||0)===i);
    if(!personSals.length) return;
    const sal=personSals[personSals.length-1];
    const calc=calcUKTax(sal.gross||0,sal.pensionPct||0,sal.bonus||0,sal.studentLoan||'none');
    totals.gross+=calc.gross;
    totals.bonus+=calc.bonus;
    totals.incomeTax+=calc.incomeTax;
    totals.ni+=calc.ni;
    totals.pensionAmt+=calc.pensionAmt;
    totals.slRepayment+=calc.slRepayment;
    totals.takeHome+=calc.takeHome;
    breakdowns.push({person:p,calc});
  });

  el.innerHTML=`
    <div class="sal-breakdown-grid">
      <div class="sal-card"><div class="sal-label">Combined gross</div><div class="sal-val val">${fmt(totals.gross)}</div><div class="sal-sub">per year</div></div>
      <div class="sal-card"><div class="sal-label">Combined bonus</div><div class="sal-val val">${fmt(totals.bonus)}</div><div class="sal-sub">annual</div></div>
      <div class="sal-card"><div class="sal-label">Combined income</div><div class="sal-val val">${fmt(totals.gross+totals.bonus)}</div><div class="sal-sub">salary + bonus</div></div>
      <div class="sal-card"><div class="sal-label">Income tax</div><div class="sal-val neg val">${fmt(totals.incomeTax)}</div><div class="sal-sub">combined PAYE</div></div>
      <div class="sal-card"><div class="sal-label">National Insurance</div><div class="sal-val neg val">${fmt(totals.ni)}</div><div class="sal-sub">combined NI</div></div>
      <div class="sal-card"><div class="sal-label">Pensions</div><div class="sal-val val">${fmt(totals.pensionAmt)}</div><div class="sal-sub">combined</div></div>
      ${totals.slRepayment>0?`<div class="sal-card"><div class="sal-label">Student loans</div><div class="sal-val neg val">${fmt(totals.slRepayment)}</div><div class="sal-sub">combined repayment</div></div>`:''}
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Combined take-home (annual)</div><div class="sal-val pos val">${fmt(totals.takeHome)}</div><div class="sal-sub"><span class="val">${fmt(totals.takeHome/12)}</span>/month</div></div>
      <div class="sal-card" style="border-color:var(--green);"><div class="sal-label">Combined take-home (monthly)</div><div class="sal-val pos val">${fmt(totals.takeHome/12)}</div><div class="sal-sub">estimated combined net</div></div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-header"><span class="card-title">Household breakdown</span></div>
      <table class="tax-band-table">
        <thead><tr><th>Person</th><th>Gross</th><th>Take-home/mo</th></tr></thead>
        <tbody>
          ${breakdowns.map(bd=>`<tr>
            <td style="font-variation-settings:'wght' 600;">${bd.person}</td>
            <td class="val">${fmt(bd.calc.gross)}</td>
            <td class="pos val">${fmt(bd.calc.takeHomeMonthly)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function toggleHousehold(){
  S.settings.household=document.getElementById('householdToggle').checked;
  save(); renderSalary();
}

function addSalary(){
  const person=parseInt(document.getElementById('salPerson').value)||0;
  const employer=(document.getElementById('salEmployer').value||'').trim();
  const gross=parseMoney(document.getElementById('salGross').value)||0;
  const bonus=parseMoney(document.getElementById('salBonus').value)||0;
  const pensionPct=parseFloat(document.getElementById('salPensionPct').value)||0;
  const employerPension=parseFloat(document.getElementById('salEmployerPension').value)||0;
  const studentLoan=document.getElementById('salStudentLoan').value;
  const startDate=document.getElementById('salStartDate').value;
  const ongoing=document.getElementById('salOngoing').checked;
  const endDate=ongoing?null:document.getElementById('salEndDate').value;
  const notes=document.getElementById('salNotes').value;
  if(!gross){ toast('Please enter a gross salary.'); return; }
  S.salaries.push({person,employer,gross,bonus,pensionPct,employerPension,studentLoan,startDate,endDate,ongoing,notes});
  const personName=S.settings.personNames[person]||'Person '+(person+1);
  _addTx({txtype:'income',date:startDate||new Date().toISOString().split('T')[0],desc:`Salary: ${employer}`,amount:gross,pnl:0,notes:`${personName} · Net/mo ~${fmt(calcUKTax(gross,pensionPct,bonus,studentLoan).takeHomeMonthly)}`});
  save(); toast('Salary saved'); renderSalary();
}

function deleteSalary(i){
  S.salaries.splice(i,1);
  save(); renderSalary(); toast('Deleted');
}

function openEditSalary(i){
  const sal=S.salaries[i];
  editingSalaryIdx=i;
  document.getElementById('editSalaryGrid').innerHTML=`
    <div class="ff"><label>Employer</label><input type="text" id="es-employer" value="${sal.employer||''}"/></div>
    <div class="ff money-field"><label>Gross</label><input type="text" id="es-gross" value="${sal.gross ? sal.gross.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Bonus</label><input type="text" id="es-bonus" value="${sal.bonus ? sal.bonus.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Your pension (%)</label><input type="number" id="es-pension" value="${sal.pensionPct||''}"/></div>
    <div class="ff"><label>Student loan</label>
      <select id="es-sl">
        ${['none','plan1','plan2','plan4','plan5','postgrad'].map(v=>`<option value="${v}"${sal.studentLoan===v?' selected':''}>${v}</option>`).join('')}
      </select>
    </div>
    <div class="ff"><label>Start date</label><input type="date" id="es-start" value="${sal.startDate||''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="es-notes">${sal.notes||''}</textarea></div>`;
  document.getElementById('editSalaryModal').classList.remove('hidden');
}

function saveEditSalary(){
  if(editingSalaryIdx===null) return;
  const sal=S.salaries[editingSalaryIdx];
  sal.employer=document.getElementById('es-employer').value;
  sal.gross=parseMoney(document.getElementById('es-gross').value)||sal.gross;
  sal.bonus=parseMoney(document.getElementById('es-bonus').value)||0;
  sal.pensionPct=parseFloat(document.getElementById('es-pension').value)||0;
  sal.studentLoan=document.getElementById('es-sl').value;
  sal.startDate=document.getElementById('es-start').value;
  sal.notes=document.getElementById('es-notes').value;
  save(); closeModal('editSalaryModal'); renderSalary(); toast('Saved');
}
