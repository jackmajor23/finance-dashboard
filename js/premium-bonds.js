// ── Premium Bonds ────────────────────────────────────
// 14. JS: PREMIUM BONDS
// ═══════════════════════════════════════════════════
function renderPremiumBonds(){
  const pb=S.premiumBonds;
  const totalWins=pb.wins.reduce((s,w)=>s+w.amount,0);
  const effRate=pb.amount>0?((totalWins/pb.amount)*100).toFixed(2):0;
  document.getElementById('pbSummary').innerHTML=`
    <div class="stat-card sc-accent"><div class="stat-label">Bonds held</div><div class="stat-val val">${fmt(pb.amount)}</div><div class="stat-sub">max £50,000</div></div>
    <div class="stat-card sc-green"><div class="stat-label">Total winnings</div><div class="stat-val pos val">${fmt(totalWins)}</div><div class="stat-sub">${pb.wins.length} prize${pb.wins.length!==1?'s':''}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">Effective return</div><div class="stat-val">${effRate}%</div><div class="stat-sub">all time</div></div>`;
  document.getElementById('pbAmount').value = pb.amount||'';
  _renderPBWins();
}

function updatePB(){
  const amount=parseMoney(document.getElementById('pbAmount').value)||0;
  const date=document.getElementById('pbDate').value;
  if(amount>50000){ toast('Maximum holding is £50,000.'); return; }
  S.premiumBonds.amount=amount;
  S.premiumBonds.date=date;
  save(); renderPremiumBonds(); renderOverview(); toast('Premium bonds updated');
}

function addPBWin(){
  const tier=parseInt(document.getElementById('pbWinTier').value)||25;
  const month=parseInt(document.getElementById('pbWinMonth').value)||new Date().getMonth()+1;
  const year=parseInt(document.getElementById('pbWinYear').value)||new Date().getFullYear();
  const autoAdd=document.getElementById('pbAutoAdd').checked;
  const date=`${year}-${String(month).padStart(2,'0')}-01`;
  S.premiumBonds.wins.unshift({amount:tier,date,month,year,autoAdded:autoAdd});
  if(autoAdd) S.premiumBonds.amount=Math.min(50000,(S.premiumBonds.amount||0)+tier);
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
