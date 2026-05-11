// ── Goals ─────────────────────────────────────────────
// 17. JS: GOALS
// ═══════════════════════════════════════════════════
const GOAL_COLS=['#5046e5','#0a8f5c','#1d6fca','#b87309','#b03070','#0b7a6e'];
function renderGoals(){
  const grid=document.getElementById('goalsGrid');
  if(!S.goals.length){ grid.innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">◐</div><p>No goals yet.</p></div>`; return; }
  grid.innerHTML=S.goals.map((g,i)=>{
    const p=clamp(g.saved/g.target,0,1), col=GOAL_COLS[i%GOAL_COLS.length];
    const rem=g.target-g.saved, now=new Date(), end=g.date?new Date(g.date):null;
    const mo=end?Math.max(0,Math.round((end-now)/(1000*60*60*24*30.5))):null;
    const onTrack=g.monthly&&mo?g.monthly*mo>=rem:null;
    return`<div class="goal-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="goal-name">${g.emoji||'◐'} ${g.name}</div>
          <div class="goal-meta">Target: ${fmtDate(g.date)}${mo!=null?' · '+mo+' months':''}</div>
        </div>
        <div style="display:flex;gap:5px;">
          ${onTrack!=null?`<span class="pill ${onTrack?'p-income':'p-payment'}">${onTrack?'on track':'behind'}</span>`:''}
          <button class="icon-btn del" onclick="deleteGoal(${i})">✕</button>
        </div>
      </div>
      <div class="goal-saved val" style="color:${col};">${fmt(g.saved)} <span style="font-size:14px;color:var(--muted);font-variation-settings:'wght' 400;">of ${fmt(g.target)}</span></div>
      <div class="prog-outer" style="margin:8px 0 5px;"><div class="prog-fill" style="width:${(p*100).toFixed(1)}%;background:${col};"></div></div>
      <div class="goal-stats">
        <span style="color:${col};font-variation-settings:'wght' 600;">${Math.round(p*100)}% complete</span>
        <span style="color:var(--muted);"><span class="val">${fmt(rem)}</span> to go${g.monthly?' · <span class="val">'+fmt(g.monthly)+'</span>/mo':''}</span>
      </div>
    </div>`;
  }).join('');
}

function addGoal(){
  const name=(document.getElementById('gName').value||'').trim();
  const target=parseMoney(document.getElementById('gTarget').value);
  const saved=parseMoney(document.getElementById('gSaved').value)||0;
  const date=document.getElementById('gDate').value;
  const monthly=parseMoney(document.getElementById('gMonthly').value)||0;
  const emoji=document.getElementById('gEmoji').value||'◐';
  if(!name||isNaN(target)||!date){ toast('Please fill name, target, and date.'); return; }
  S.goals.push({name,target,saved,date,monthly,emoji});
  save(); toast(`Added: ${name}`);
  ['gName','gTarget','gSaved','gDate','gMonthly'].forEach(id=>document.getElementById(id).value='');
  const emojiEl=document.getElementById('gEmoji'); if(emojiEl) emojiEl.selectedIndex=0;
  renderGoals();
}
function deleteGoal(i){ S.goals.splice(i,1); save(); renderGoals(); toast('Removed'); }
