// ── Utilities: formatting, helpers ─────────────────
// 9. JS: UTILITIES
// ═══════════════════════════════════════════════════
const CUR = () => S.settings.currency || '£';
function fmt(n){ return CUR() + Math.abs(Math.round(n)).toLocaleString('en-GB'); }
function fmtS(n){ return (n>=0?'+':'-') + CUR() + Math.abs(Math.round(n)).toLocaleString('en-GB'); }
function fmtP(n){ return (n>=0?'+':'') + n.toFixed(1) + '%'; }
function pct(cur,inv){ return inv===0?0:((cur-inv)/inv*100); }
function cls(n){ return n>=0?'pos':'neg'; }
function fmtDate(s){ if(!s)return'—'; const d=new Date(s); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
function monthYear(m,y){ const d=new Date(y,m-1); return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'}); }
function clamp(v,mn,mx){ return Math.min(Math.max(v,mn),mx); }

function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 3200);
}
function closeModal(id){ document.getElementById(id).classList.add('hidden'); editingId=null; editingDebtIdx=null; editingSalaryIdx=null; }
function toggleHide(){
  document.body.classList.toggle('hidden-vals');
  document.getElementById('eyeBtn').textContent = document.body.classList.contains('hidden-vals') ? '🙈' : '👁';
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
