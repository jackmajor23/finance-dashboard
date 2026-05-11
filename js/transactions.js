// ── Transactions ─────────────────────────────────────
// 19. JS: TRANSACTIONS
// ═══════════════════════════════════════════════════
function _addTx(tx){ S.transactions.push({id:Date.now(),...tx}); }

function setTxFilter(f,el){
  txFilter=f;
  document.querySelectorAll('#page-transactions .filter-btn').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  renderTransactions();
}

function renderTransactions(){
  const q=(document.getElementById('txSearch')||{}).value||'';
  let T=S.transactions;
  if(txFilter!=='all') T=T.filter(t=>t.txtype===txFilter);
  if(q) T=T.filter(t=>(t.desc||'').toLowerCase().includes(q.toLowerCase())||(t.notes||'').toLowerCase().includes(q.toLowerCase()));
  T=[...T].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tb=document.getElementById('txBody');
  if(!T.length){ tb.innerHTML=`<tr><td colspan="7"><div class="empty"><div class="ei">≡</div><p>No transactions yet.</p></div></td></tr>`; return; }
  tb.innerHTML=T.map(t=>{
    const originalIndex = S.transactions.findIndex(tx => tx.id === t.id);
    return `
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td><span class="pill p-${t.txtype}">${t.txtype}</span></td>
      <td>${t.desc||'—'}</td>
      <td class="${t.amount>=0?'pos':'neg'} val">${fmt(Math.abs(t.amount))}</td>
      <td class="${cls(t.pnl||0)} val">${t.pnl?fmtS(t.pnl):'—'}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px;">${t.notes||'—'}</td>
      <td><button class="icon-btn del" onclick="deleteTransaction(${originalIndex})">✕</button></td>
    </tr>`;
  }).join('');
  updateTxUndoButton();
}

function deleteTransaction(i){ 
  const deleted=S.transactions.splice(i,1)[0];
  window._lastDeletedTx={item:deleted,index:i};
  updateTxUndoButton();
  save(); renderTransactions(); toast('Removed'); 
}

function undoLastTxDelete(){
  if(!window._lastDeletedTx) return;
  const {item,index}=window._lastDeletedTx;
  S.transactions.splice(index,0,item);
  window._lastDeletedTx=null;
  updateTxUndoButton();
  save(); renderTransactions(); toast('Restored');
}

function updateTxUndoButton(){
  const btn=document.getElementById('txUndoBtn');
  if(!btn) return;
  if(window._lastDeletedTx){
    btn.style.opacity='1';
    btn.style.pointerEvents='auto';
  } else {
    btn.style.opacity='0';
    btn.style.pointerEvents='none';
  }
}
