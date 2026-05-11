// ── Premium Bonds ────────────────────────────────────
// 14. JS: PREMIUM BONDS (with holding history)
// ═══════════════════════════════════════════════════

function renderPremiumBonds(){
  const pb=S.premiumBonds;
  
  // Calculate holding from history
  let currentHolding = 0;
  if(pb.history && pb.history.length){
    currentHolding = pb.history.reduce((sum, entry) => sum + entry.amount, 0);
  } else {
    currentHolding = pb.amount || 0;
  }

  const totalWins=pb.wins.reduce((s,w)=>s+w.amount,0);
  const effRate=currentHolding>0?((totalWins/currentHolding)*100).toFixed(2):0;
  
  document.getElementById('pbSummary').innerHTML=`
    <div class="stat-card sc-accent"><div class="stat-label">Bonds held</div><div class="stat-val val">${fmt(currentHolding)}</div><div class="stat-sub">max £50,000</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Total winnings</div><div class="stat-val pos val">${fmt(totalWins)}</div><div class="stat-sub">${pb.wins.length} prize${pb.wins.length!==1?'s':''}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">Effective return</div><div class="stat-val">${effRate}%</div><div class="stat-sub">all time</div></div>`;
  
  // Render holding history
  _renderPBHistory();
  _renderPBWins();
}

function _renderPBHistory(){
  const pb = S.premiumBonds;
  const historyEl = document.getElementById('pbHistorySection');
  if(!historyEl) return;

  if(!pb.history || !pb.history.length){
    historyEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);">No holding history yet. Add an entry below.</div>`;
    return;
  }

  let runningTotal = 0;
  const rows = pb.history.map((entry, idx) => {
    runningTotal += entry.amount;
    return `<tr>
      <td>${fmtDate(entry.date)}</td>
      <td><span class="pill ${entry.amount > 0 ? 'p-income' : 'p-payment'}">${entry.amount > 0 ? 'Add' : 'Withdraw'}</span></td>
      <td class="val" style="color:${entry.amount > 0 ? 'var(--green)' : 'var(--red)'};">${entry.amount > 0 ? '+' : ''}${fmt(entry.amount)}</td>
      <td class="val" style="font-variation-settings:'wght' 600;">${fmt(runningTotal)}</td>
      <td style="font-size:11px;color:var(--muted);">${entry.notes || '—'}</td>
      <td>
        <button class="icon-btn del" onclick="deletePBHistoryEntry(${idx})" style="width:24px;height:24px;padding:0;font-size:11px;">✕</button>
      </td>
    </tr>`;
  });

  const currentTotal = runningTotal;
  historyEl.innerHTML = `
    <div class="section-label">Bond holding history</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Running Total</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    </div>
    <div style="text-align:right;padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:16px;font-size:12px;">
      <strong>Current holdings:</strong> <span class="val" style="font-variation-settings:'wght' 700;">${fmt(currentTotal)}</span>
    </div>
  `;
}

function addPBHistoryEntry(){
  const date = document.getElementById('pbHistDate').value;
  const type = document.getElementById('pbHistType').value;
  const amount = parseMoney(document.getElementById('pbHistAmount').value) || 0;
  const notes = document.getElementById('pbHistNotes').value;

  if(!date || !amount){ toast('Please enter date and amount.'); return; }

  const signedAmount = type === 'add' ? Math.abs(amount) : -Math.abs(amount);

  if(!S.premiumBonds.history) S.premiumBonds.history = [];
  S.premiumBonds.history.push({ date, amount: signedAmount, notes });

  // Calculate new current holding
  const newHolding = S.premiumBonds.history.reduce((s, e) => s + e.amount, 0);
  if(newHolding > 50000){
    toast('Total holdings would exceed £50,000. Please try again.');
    S.premiumBonds.history.pop();
    return;
  }

  S.premiumBonds.amount = newHolding;

  // Clear form
  document.getElementById('pbHistDate').value = '';
  document.getElementById('pbHistAmount').value = '';
  document.getElementById('pbHistNotes').value = '';

  save();
  toast('Holding entry added');
  renderPremiumBonds();
}

function deletePBHistoryEntry(idx){
  S.premiumBonds.history.splice(idx, 1);
  S.premiumBonds.amount = S.premiumBonds.history.reduce((s, e) => s + e.amount, 0);
  save();
  renderPremiumBonds();
  toast('Entry removed');
}

function addPBWin(){
  const tier=parseInt(document.getElementById('pbWinTier').value)||25;
  const month=parseInt(document.getElementById('pbWinMonth').value)||new Date().getMonth()+1;
  const year=parseInt(document.getElementById('pbWinYear').value)||new Date().getFullYear();
  const autoAdd=document.getElementById('pbAutoAdd').checked;
  const date=`${year}-${String(month).padStart(2,'0')}-01`;
  S.premiumBonds.wins.unshift({amount:tier,date,month,year,autoAdded:autoAdd});
  
  if(autoAdd){
    // Add to history instead of directly updating amount
    if(!S.premiumBonds.history) S.premiumBonds.history = [];
    S.premiumBonds.history.push({date, amount:tier, notes:`Prize win (auto-added)`});
    const newHolding = S.premiumBonds.history.reduce((s, e) => s + e.amount, 0);
    S.premiumBonds.amount = Math.min(50000, newHolding);
  }
  
  _addTx({txtype:'win',date,desc:'Premium Bond prize',amount:tier,pnl:tier,notes:`£${tier.toLocaleString()} prize · ${autoAdd?'added to bonds':'paid to bank'}`});
  save(); renderPremiumBonds(); toast(`🎉 Logged £${tier.toLocaleString()} win!`);
}

function _renderPBWins(){
  const wins=S.premiumBonds.wins;
  const tb=document.getElementById('pbWinsBody');
  if(!wins.length){ tb.innerHTML=`<tr><td colspan="5"><div class="empty"><div class="ei">◎</div><p>No wins logged yet.</p></div></td></tr>`; return; }
  let running=0;
  const rows=[...wins].reverse().map(w=>{running+=w.amount;return{...w,running};}).reverse();
  tb.innerHTML=rows.map((w,i)=>`
    <tr>
      <td>${monthYear(w.month,w.year)}</td>
      <td style="color:var(--green);font-variation-settings:'wght' 700;" class="val">${fmt(w.amount)}</td>
      <td class="val" style="color:var(--green);">${fmt(w.running)}</td>
      <td><span class="pill ${w.autoAdded?'p-isa':'p-income'}">${w.autoAdded?'added to bonds':'paid to bank'}</span></td>
      <td><button class="icon-btn del" onclick="deletePBWin(${i})">✕</button></td>
    </tr>`).join('');
}

function deletePBWin(i){ 
  const deleted=S.premiumBonds.wins.splice(i,1)[0];
  window._lastDeletedPBWin={item:deleted,index:i};
  updatePBUndoButton();
  save(); renderPremiumBonds(); toast('Removed'); 
}

function undoLastPBDelete(){
  if(!window._lastDeletedPBWin) return;
  const {item,index}=window._lastDeletedPBWin;
  S.premiumBonds.wins.splice(index,0,item);
  window._lastDeletedPBWin=null;
  updatePBUndoButton();
  save(); renderPremiumBonds(); toast('Restored');
}

function updatePBUndoButton(){
  const btn=document.getElementById('pbUndoBtn');
  if(!btn) return;
  if(window._lastDeletedPBWin){
    btn.style.opacity='1';
    btn.style.pointerEvents='auto';
  } else {
    btn.style.opacity='0';
    btn.style.pointerEvents='none';
  }
}
