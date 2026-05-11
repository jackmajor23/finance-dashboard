// ── Debts ─────────────────────────────────────────────
// 16. JS: DEBTS
// ═══════════════════════════════════════════════════
let currentDebtPersonIdx=0;

function switchDebtPerson(idx){
  currentDebtPersonIdx = idx;
  renderDebts();
}

function populateDebtForm(){
  const personSel = document.getElementById('dPerson');
  personSel.innerHTML = '<option value="shared">Shared (household)</option>' + 
    S.settings.personNames.map((p,i) => `<option value="${i}">${p}</option>`).join('');
}
function renderDebts(){
  // Sync people from salary settings
  if(!S.settings.personNames || !Array.isArray(S.settings.personNames) || S.settings.personNames.length === 0) {
    S.settings.personNames = ['Person 1'];
    save();
  }

  // Render person tabs
  const tabsEl = document.getElementById('debtPersonTabs');
  const allPeople = [...S.settings.personNames];
  if(allPeople.length > 1) allPeople.push('Household');
  
  if(allPeople.length > 1){
    tabsEl.innerHTML = allPeople.map((p,i) => {
      const isHousehold = i === allPeople.length - 1;
      return `<button class="person-btn ${currentDebtPersonIdx === i ? 'active' : ''}" onclick="switchDebtPerson(${i})">${isHousehold ? '📊 ' + p : p}</button>`;
    }).join('');
  } else { 
    tabsEl.innerHTML = ''; 
    currentDebtPersonIdx = 0; 
  }

  // Get debts based on current view
  const isHousehold = S.settings.personNames.length > 1 && currentDebtPersonIdx === S.settings.personNames.length;
  let debts;
  if(isHousehold){
    debts = S.debts; // All debts for household view
  } else {
    debts = S.debts.filter(d => (d.person || 0) === currentDebtPersonIdx || d.shared);
  }

  // Filter out student debts if checkbox is unchecked
  const includeStudent = document.getElementById('includeStudentDebts')?.checked ?? true;
  if(!includeStudent){
    debts = debts.filter(d => d.type !== 'Student');
  }

  const totOwed=debts.reduce((s,d)=>s+(d.remaining??d.total??0),0);
  const totMonthly=debts.reduce((s,d)=>s+(d.monthly||0),0);
  const estMonths=totMonthly>0?Math.ceil(totOwed/totMonthly):0;
  document.getElementById('debtSummaryCards').innerHTML=`
    <div class="stat-card sc-red"><div class="stat-label">Total owed</div><div class="stat-val neg val">${fmt(totOwed)}</div><div class="stat-sub">${debts.length} debt${debts.length!==1?'s':''}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">Monthly payments</div><div class="stat-val val">${fmt(totMonthly)}</div><div class="stat-sub">combined</div></div>
    <div class="stat-card sc-blue"><div class="stat-label">Est. payoff</div><div class="stat-val" style="font-size:20px;">${estMonths?estMonths+' months':'—'}</div><div class="stat-sub">at current rate</div></div>`;

  const grid=document.getElementById('debtGrid');
  if(!debts.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">◉</div><p>No debts tracked${isHousehold ? ' for household' : ' for ' + S.settings.personNames[currentDebtPersonIdx]}.</p></div>`; return; }

  grid.innerHTML=debts.map((d,i)=>{
    const remaining=d.remaining??d.total??0;
    const original=d.total??remaining;
    const paid=Math.max(0,original-remaining);
    const paidPct=original>0?Math.min((paid/original)*100,100):0;
    const now=new Date(), end=d.end?new Date(d.end):null;
    const monthsLeft=end?Math.max(0,Math.round((end-now)/(1000*60*60*24*30.5))):d.monthly>0?Math.ceil(remaining/d.monthly):null;
    const assignedTo = d.shared ? 'Shared' : (d.person !== undefined ? S.settings.personNames[d.person] || 'Unknown' : S.settings.personNames[0]);
    return`<div class="debt-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div>
          <div class="debt-name">${d.name}</div>
          <div class="debt-meta">${d.lender||d.type||'Debt'} · ${d.rate||0}% APR${d.shared ? ' · Shared' : ''}</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center;">
          <span class="pill p-debt">${(d.type||'other').toLowerCase().replace(/-/g,' ')}</span>
          <button class="icon-btn edit" onclick="openEditDebt(${S.debts.indexOf(d)})">✎</button>
          <button class="icon-btn del"  onclick="deleteDebt(${S.debts.indexOf(d)})">✕</button>
        </div>
      </div>
      <div class="debt-owed val">${fmt(remaining)}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">of <span class="val">${fmt(original)}</span> original · ${paidPct.toFixed(0)}% paid</div>
      <div class="prog-outer"><div class="prog-fill" style="width:${paidPct.toFixed(1)}%;background:var(--green);"></div></div>
      <div class="debt-stats">
        <div><div class="ds-lbl">Monthly</div><div class="ds-val val">${fmt(d.monthly||0)}</div></div>
        <div><div class="ds-lbl">Months left</div><div class="ds-val">${monthsLeft??'—'}</div></div>
        <div><div class="ds-lbl">Started</div><div class="ds-val">${fmtDate(d.start)}</div></div>
        <div><div class="ds-lbl">End date</div><div class="ds-val">${fmtDate(d.end)}</div></div>
      </div>
      ${d.notes?`<div style="margin-top:8px;font-size:11px;color:var(--muted2);background:var(--surface2);border-radius:6px;padding:7px 10px;">📝 ${d.notes}</div>`:''}
    </div>`;
  }).join('');
}

function addDebt(){
  const name=(document.getElementById('dName').value||'').trim();
  const type=document.getElementById('dType').value;
  const personSel = document.getElementById('dPerson').value;
  const shared = document.getElementById('dShared').checked;
  const total=parseMoney(document.getElementById('dTotal').value)||0;
  const remaining=parseMoney(document.getElementById('dRemaining').value)||total;
  const monthly=parseMoney(document.getElementById('dMonthly').value)||0;
  const rate=parseFloat(document.getElementById('dRate').value)||0;
  const start=document.getElementById('dStart').value;
  const end=document.getElementById('dEnd').value;
  const lender=(document.getElementById('dLender').value||'').trim();
  const notes=document.getElementById('dNotes').value;
  if(!name||!total){ toast('Please enter name and total amount.'); return; }
  
  const person = personSel === 'shared' ? undefined : parseInt(personSel);
  S.debts.push({name,type,total,remaining,monthly,rate,start,end,lender,notes,person,shared});
  _addTx({txtype:'payment',date:start||new Date().toISOString().split('T')[0],desc:`Debt: ${name}`,amount:total,pnl:-total,notes:`${fmt(monthly)}/month · ${rate}% APR`});
  save(); toast(`Added: ${name}`); renderDebts(); renderOverview();
  ['dName','dTotal','dRemaining','dMonthly','dRate','dStart','dEnd','dLender','dNotes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('dShared').checked = false;
}

function deleteDebt(i){ S.debts.splice(i,1); save(); renderDebts(); renderOverview(); toast('Removed'); }

function openEditDebt(i){
  editingDebtIdx=i;
  const d=S.debts[i];
  document.getElementById('editDebtGrid').innerHTML=`
    <div class="ff"><label>Name</label><input type="text" id="ed-name" value="${d.name}"/></div>
    <div class="ff"><label>Type</label>
      <select id="ed-type">${['Loan','Mortgage','Credit-card','Student','Car','Other'].map(t=>`<option value="${t}"${d.type===t?' selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="ff"><label>Assigned to</label>
      <select id="ed-person">${'<option value="shared">Shared (household)</option>' + S.settings.personNames.map((p,idx)=>`<option value="${idx}"${(d.person||0)===idx&&!d.shared?' selected':''}>${p}</option>`).join('')}</select>
    </div>
    <div class="ff"><label>Shared debt?</label>
      <label class="toggle"><input type="checkbox" id="ed-shared"${d.shared?' checked':''}><span class="toggle-track"></span></label>
    </div>
    <div class="ff money-field"><label>Original total</label><input type="text" id="ed-total" value="${d.total ? d.total.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Remaining</label><input type="text" id="ed-remaining" value="${d.remaining ? d.remaining.toLocaleString('en-GB') : (d.total ? d.total.toLocaleString('en-GB') : '')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Monthly payment</label><input type="text" id="ed-monthly" value="${d.monthly ? d.monthly.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Interest rate (%)</label><input type="number" id="ed-rate" value="${d.rate||''}" step=".1"/></div>
    <div class="ff"><label>Start date</label><input type="date" id="ed-start" value="${d.start||''}"/></div>
    <div class="ff"><label>End date</label><input type="date" id="ed-end" value="${d.end||''}"/></div>
    <div class="ff"><label>Lender</label><input type="text" id="ed-lender" value="${d.lender||''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="ed-notes">${d.notes||''}</textarea></div>`;
  document.getElementById('editDebtModal').classList.remove('hidden');
}

function saveEditDebt(){
  if(editingDebtIdx===null) return;
  const d=S.debts[editingDebtIdx];
  d.name=document.getElementById('ed-name').value;
  d.type=document.getElementById('ed-type').value;
  d.total=parseMoney(document.getElementById('ed-total').value)||d.total;
  d.remaining=parseMoney(document.getElementById('ed-remaining').value)??d.remaining;
  d.monthly=parseMoney(document.getElementById('ed-monthly').value)||0;
  d.rate=parseFloat(document.getElementById('ed-rate').value)||0;
  d.start=document.getElementById('ed-start').value;
  d.end=document.getElementById('ed-end').value;
  d.lender=document.getElementById('ed-lender').value;
  d.notes=document.getElementById('ed-notes').value;
  save(); closeModal('editDebtModal'); renderDebts(); toast('Saved');
}
