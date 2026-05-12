// ── Utilities: formatting, helpers ─────────────────
// JS: BILLS & UTILITIES
// ═══════════════════════════════════════════════════
function renderBills(){
  const grid=document.getElementById('billsGrid');
  if(!S.bills.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">⧗</div><p>No bills tracked yet.</p></div>`; return; }
  grid.innerHTML=S.bills.map((b,i)=>{
    const nxt=new Date(b.nextPaymentDate), now=new Date();
    const daysLeft=Math.max(0,Math.floor((nxt-now)/(1000*60*60*24)));
    return`<div class="bill-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${b.name}</div>
          <div style="font-size:11px;color:var(--muted);">${b.category||'Bill'} · ${b.frequency||'monthly'}</div>
        </div>
        <div style="display:flex;gap:5px;">
          <button class="icon-btn edit" onclick="openEditBill(${i})">✎</button>
          <button class="icon-btn del" onclick="deleteBill(${i})">✕</button>
        </div>
      </div>
      <div style="font-size:16px;font-weight:600;color:var(--val);" class="val">${fmt(b.amount)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px;">Next: ${fmtDate(b.nextPaymentDate)}${daysLeft<=7?` · <span class="neg">${daysLeft} day${daysLeft!==1?'s':''}</span>`:''}</div>
      ${b.notes?`<div style="font-size:10px;color:var(--muted2);margin-top:6px;">📝 ${b.notes}</div>`:''}
    </div>`;
  }).join('');
}

// Money formatting utilities
function formatMoney(input) {
  let value = input.value.replace(/[^0-9.]/g, ''); // Remove non-numeric except decimal
  if (value) {
    // Format with commas
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    value = parts.join('.');
  }
  input.value = value;
}

function parseMoney(value) {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

let editingBillIdx = null;

function addBill(){
  const name=(document.getElementById('billName').value||'').trim();
  const category=document.getElementById('billCategory').value;
  const amount=parseMoney(document.getElementById('billAmount').value)||0;
  const frequency=document.getElementById('billFrequency').value;
  const nextPaymentDate=document.getElementById('billNextPayment').value;
  const recurring=document.getElementById('billRecurring').value;
  const endDate=recurring==='never'?document.getElementById('billEndDate').value:'';
  const notes=(document.getElementById('billNotes').value||'').trim();
  
  if(!name||!amount||!nextPaymentDate){
    toast('Please fill: bill name, amount, and next payment date');
    return;
  }
  
  S.bills.push({
    id:Date.now(),
    name,
    category,
    amount,
    frequency,
    nextPaymentDate,
    recurring,
    endDate,
    notes,
    createdDate:new Date().toISOString().split('T')[0]
  });
  
  save(); toast(`Added: ${name}`); renderBills();
  ['billName','billAmount','billNextPayment','billNotes'].forEach(id=>document.getElementById(id).value='');
}

function deleteBill(i){
  S.bills.splice(i,1);
  save(); renderBills(); toast('Bill removed');
}

function openEditBill(i){
  editingBillIdx=i;
  const b=S.bills[i];
  const modal=document.getElementById('editBillModal');
  if(!modal){
    toast('Edit modal not found');
    return;
  }
  document.getElementById('editBillGrid').innerHTML=`
    <div class="ff"><label>Name</label><input type="text" id="eb-name" value="${b.name}"/></div>
    <div class="ff"><label>Category</label><input type="text" id="eb-category" value="${b.category||''}"/></div>
    <div class="ff money-field"><label>Amount</label><input type="text" id="eb-amount" value="${b.amount.toLocaleString('en-GB')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Frequency</label><input type="text" id="eb-frequency" value="${b.frequency||''}"/></div>
    <div class="ff"><label>Next payment date</label><input type="date" id="eb-nextpayment" value="${b.nextPaymentDate||''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="eb-notes">${b.notes||''}</textarea></div>`;
  modal.classList.remove('hidden');
}

function saveEditBill(){
  if(editingBillIdx===null) return;
  const b=S.bills[editingBillIdx];
  b.name=(document.getElementById('eb-name').value||'').trim();
  b.category=document.getElementById('eb-category').value;
  b.amount=parseMoney(document.getElementById('eb-amount').value)||b.amount;
  b.frequency=document.getElementById('eb-frequency').value;
  b.nextPaymentDate=document.getElementById('eb-nextpayment').value;
  b.notes=document.getElementById('eb-notes').value;
  save(); closeModal('editBillModal'); renderBills(); toast('Bill saved');
}
