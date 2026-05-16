// ── Premium Bonds ────────────────────────────────────
// JS: PREMIUM BONDS (with holding history)
// ═══════════════════════════════════════════════════

// ── State ─────────────────────────────────────────
let _pbWinsFilter = 'all';    // 'all' | '12m' | '6m'
let _pbFormMode   = 'history'; // 'history' | 'quick'  — history is default

// ── Main render ───────────────────────────────────
function renderPremiumBonds(){
  const pb = S.premiumBonds;

  // Always derive holding from history when entries exist
  let currentHolding = 0;
  if(pb.history && pb.history.length){
    currentHolding = pb.history.reduce((sum, e) => sum + e.amount, 0);
  } else {
    currentHolding = pb.amount || 0;
  }
  pb.amount = currentHolding; // keep in sync

  const totalWins = pb.wins.reduce((s, w) => s + w.amount, 0);
  const effRate   = currentHolding > 0 ? ((totalWins / currentHolding) * 100).toFixed(2) : 0;

  document.getElementById('pbSummary').innerHTML = `
    <div class="stat-card sc-accent">
      <div class="stat-label">Bonds held</div>
      <div class="stat-val val">${fmt(currentHolding)}</div>
      <div class="stat-sub">max £50,000</div>
    </div>
    <div class="stat-card sc-green">
      <div class="stat-label">Total winnings</div>
      <div class="stat-val pos val">${fmt(totalWins)}</div>
      <div class="stat-sub">${pb.wins.length} prize${pb.wins.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="stat-card sc-amber">
      <div class="stat-label">Effective return</div>
      <div class="stat-val">${effRate}%</div>
      <div class="stat-sub">all time</div>
    </div>`;

  _renderPBHoldingForm();
  _renderPBWins();
}

// ── Holding form ──────────────────────────────────
// Rendered into <div id="pbHoldingFormWrap"> in the HTML.
// "Track history" tab is FIRST (left) and the default mode.
function _renderPBHoldingForm(){
  const wrap = document.getElementById('pbHoldingFormWrap');
  if(!wrap) return;

  const tab = (label, icon, m) => {
    const active = _pbFormMode === m;
    return `<button
      onclick="setPBFormMode('${m}')"
      style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;
             padding:5px 14px;font-size:12px;border-radius:var(--radius-sm);border:none;
             background:${active ? 'var(--accent)' : 'var(--surface2)'};
             color:${active ? '#fff' : 'var(--muted)'};
             font-variation-settings:'wght' ${active ? '600' : '400'};
             transition:background .15s,color .15s;">
        <span class="material-symbols-rounded" style="font-size:14px;">${icon}</span>${label}
    </button>`;
  };

  // ── Track history form: Amount (£) → Type → Date ──
  const historyForm = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">

      <div class="ff money-field" style="flex:1;min-width:120px;">
        <label class="form-label">Amount</label>
        <input id="pbHistAmount" class="form-input" type="text"
          placeholder="1,000" oninput="formatMoney(this)" />
        <span class="currency">£</span>
      </div>

      <div class="ff" style="flex:1;min-width:120px;">
        <label class="form-label">Type</label>
        <select id="pbHistType" class="form-input">
          <option value="add">Add bonds</option>
          <option value="withdraw">Withdraw bonds</option>
        </select>
      </div>

      <div class="ff" style="flex:1;min-width:120px;">
        <label class="form-label">Date</label>
        <input id="pbHistDate" class="form-input" type="date"
          value="${new Date().toISOString().slice(0,10)}">
      </div>

      <button class="btn btn-primary" onclick="addPBHistoryEntry()" style="margin-bottom:1px;">
        <span class="material-symbols-rounded" style="font-size:15px;vertical-align:-3px;">add</span> Log entry
      </button>

    </div>`;

  // ── Quick set form: overrides total directly ──
  const hasHistory = S.premiumBonds.history && S.premiumBonds.history.length > 0;
  const quickWarning = hasHistory ? `
    <div style="display:flex;align-items:flex-start;gap:7px;padding:9px 11px;margin-bottom:12px;
      background:rgba(220,150,30,0.10);border:1px solid rgba(220,150,30,0.30);
      border-radius:var(--radius-sm);font-size:12px;color:var(--muted);line-height:1.5;">
      <span class="material-symbols-rounded"
        style="font-size:15px;color:var(--amber,#dc961e);flex-shrink:0;margin-top:1px;">warning</span>
      <span>You have <strong>${S.premiumBonds.history.length}</strong> existing holding
        entr${S.premiumBonds.history.length === 1 ? 'y' : 'ies'}.
        Submitting will <strong>clear all history</strong> and replace it with this single value.</span>
    </div>` : '';

  const quickForm = `
    ${quickWarning}
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">

      <div class="ff money-field" style="flex:1;min-width:130px;">
        <label class="form-label">Total bonds held</label>
        <input id="pbQuickAmount" class="form-input" type="text"
          placeholder="50,000" oninput="formatMoney(this)" />
        <span class="currency">£</span>
      </div>

      <div class="ff" style="flex:1;min-width:120px;">
        <label class="form-label">Date</label>
        <input id="pbQuickDate" class="form-input" type="date"
          value="${new Date().toISOString().slice(0,10)}">
      </div>

      <button class="btn btn-primary" onclick="addPBQuickEntry()" style="margin-bottom:1px;">
        <span class="material-symbols-rounded" style="font-size:15px;vertical-align:-3px;">check</span>
        ${hasHistory ? 'Override total' : 'Set total'}
      </button>

    </div>`;

  wrap.innerHTML = `
    <!-- Mode tabs — Track history first/default, Quick set second -->
    <div style="display:flex;gap:4px;margin-bottom:14px;">
      ${tab('Track history', 'history', 'history')}
      ${tab('Quick set', 'bolt', 'quick')}
    </div>
    <!-- Active form -->
    <div>${_pbFormMode === 'history' ? historyForm : quickForm}</div>
    <!-- Contribution list — goals-style, only in history mode -->
    ${_pbFormMode === 'history' ? _buildPBHistoryList() : ''}`;
}

function setPBFormMode(mode){
  _pbFormMode = mode;
  _renderPBHoldingForm();
}

// ── Contribution history list (goals-style) ───────
// Compact inline scrollable list rendered inside the holding form card.
// Newest entry shown first.
function _buildPBHistoryList(){
  const pb = S.premiumBonds;

  if(!pb.history || !pb.history.length){
    return `
      <div style="margin-top:14px;padding:14px;text-align:center;
        border-radius:var(--radius-sm);background:var(--surface2);
        font-size:12px;color:var(--muted);">
        No holding history yet — log your first entry above.
      </div>`;
  }

  // Compute running totals oldest→newest, then display newest→oldest
  let running = 0;
  const allRows = pb.history.map((entry, idx) => {
    running += entry.amount;
    return { entry, idx, runningAfter: running };
  });

  const currentTotal = running;

  const rowsHtml = [...allRows].reverse().map(({ entry, idx, runningAfter }) => {
    const isAdd   = entry.amount >= 0;
    const icon    = isAdd ? 'add_circle' : 'remove_circle';
    const colour  = isAdd ? 'var(--green)' : 'var(--red)';
    const sign    = isAdd ? '+' : '';
    const pillCls = isAdd ? 'p-income' : 'p-payment';

    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;
        border-bottom:1px solid var(--border);">

        <span class="pill ${pillCls}"
          style="display:inline-flex;align-items:center;gap:3px;
                 padding:3px 8px 3px 5px;flex-shrink:0;font-size:11px;">
          <span class="material-symbols-rounded" style="font-size:12px;line-height:1;">${icon}</span>
          ${isAdd ? 'Add' : 'Withdraw'}
        </span>

        <span class="val" style="color:${colour};font-variation-settings:'wght' 600;
          flex-shrink:0;font-size:13px;">
          ${sign}${fmt(entry.amount)}
        </span>

        <span style="font-size:11px;color:var(--muted);flex:1;">
          → <span class="val" style="font-variation-settings:'wght' 500;">${fmt(runningAfter)}</span>
        </span>

        <span style="font-size:11px;color:var(--muted);flex-shrink:0;white-space:nowrap;">
          ${fmtDate(entry.date)}
        </span>

        <button class="icon-btn del" onclick="deletePBHistoryEntry(${idx})"
          style="width:22px;height:22px;padding:0;font-size:11px;flex-shrink:0;">✕</button>

      </div>`;
  }).join('');

  return `
    <div style="margin-top:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;
        margin-bottom:6px;font-size:11px;color:var(--muted);
        text-transform:uppercase;letter-spacing:.05em;">
        <span>Holding history</span>
        <span class="val" style="font-variation-settings:'wght' 700;color:var(--fg);
          font-size:12px;text-transform:none;letter-spacing:0;">
          Current: ${fmt(currentTotal)}
        </span>
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius-sm);
        overflow:hidden;max-height:220px;overflow-y:auto;">
        ${rowsHtml}
      </div>
    </div>`;
}

// ── History entry submit ───────────────────────────
function addPBHistoryEntry(){
  const date = document.getElementById('pbHistDate').value;
  const type = document.getElementById('pbHistType').value;
  const raw  = parseMoney(document.getElementById('pbHistAmount').value) || 0;

  if(!date || !raw){ toast('Please enter an amount and date.'); return; }

  const signedAmount = type === 'add' ? Math.abs(raw) : -Math.abs(raw);

  if(!S.premiumBonds.history) S.premiumBonds.history = [];
  S.premiumBonds.history.push({ date, amount: signedAmount });

  const newHolding = S.premiumBonds.history.reduce((s, e) => s + e.amount, 0);

  if(newHolding > 50000){
    toast('Total holdings would exceed the £50,000 NS&I maximum. Entry not saved.');
    S.premiumBonds.history.pop();
    return;
  }
  if(newHolding < 0){
    toast('Withdrawal would exceed current holdings. Entry not saved.');
    S.premiumBonds.history.pop();
    return;
  }

  S.premiumBonds.amount = newHolding;
  document.getElementById('pbHistAmount').value = '';

  save();
  toast(signedAmount >= 0 ? '✅ Bonds added' : '✅ Withdrawal logged');
  renderPremiumBonds();
}

// ── Quick set submit ───────────────────────────────
// Replaces pb.amount directly. If history exists, confirms then clears it.
function addPBQuickEntry(){
  const date   = document.getElementById('pbQuickDate').value;
  const amount = parseMoney(document.getElementById('pbQuickAmount').value) || 0;

  if(!date || !amount){ toast('Please enter an amount and date.'); return; }
  if(amount > 50000){ toast('Amount exceeds the £50,000 NS&I maximum.'); return; }

  const hasHistory = S.premiumBonds.history && S.premiumBonds.history.length > 0;

  if(hasHistory){
    const n  = S.premiumBonds.history.length;
    const ok = confirm(
      `This will clear your ${n} existing holding entr${n === 1 ? 'y' : 'ies'} ` +
      `and set your total to ${fmt(amount)}.\n\nContinue?`
    );
    if(!ok) return;
  }

  // Replace history with a single override entry
  S.premiumBonds.history = [{ date, amount }];
  S.premiumBonds.amount  = amount;

  save();
  toast(`✅ Bond holding set to ${fmt(amount)}`);
  renderPremiumBonds();
}

// ── Delete history entry ───────────────────────────
// idx is the original (oldest-first) storage index — unaffected by display reversal
function deletePBHistoryEntry(idx){
  S.premiumBonds.history.splice(idx, 1);
  S.premiumBonds.amount = S.premiumBonds.history.reduce((s, e) => s + e.amount, 0);
  save();
  renderPremiumBonds();
  toast('Entry removed');
}

// ── Wins ──────────────────────────────────────────
function addPBWin(){
  const tier    = parseInt(document.getElementById('pbWinTier').value) || 25;
  const month   = parseInt(document.getElementById('pbWinMonth').value) || new Date().getMonth() + 1;
  const year    = parseInt(document.getElementById('pbWinYear').value)  || new Date().getFullYear();
  const autoAdd = document.getElementById('pbAutoAdd').checked;
  const date    = `${year}-${String(month).padStart(2, '0')}-01`;

  S.premiumBonds.wins.unshift({ amount: tier, date, month, year, autoAdded: autoAdd });

  if(autoAdd){
    if(!S.premiumBonds.history) S.premiumBonds.history = [];
    S.premiumBonds.history.push({ date, amount: tier });
    const newHolding = S.premiumBonds.history.reduce((s, e) => s + e.amount, 0);
    S.premiumBonds.amount = Math.min(50000, newHolding);
  }

  _addTx({ txtype: 'win', date, desc: 'Premium Bond prize', amount: tier, pnl: tier,
    notes: `£${tier.toLocaleString()} prize · ${autoAdd ? 'added to bonds' : 'paid to bank'}` });

  save(); renderPremiumBonds(); toast(`🎉 Logged £${tier.toLocaleString()} win!`);
}

// ── Wins filter ───────────────────────────────────
function setPBWinsFilter(f){
  _pbWinsFilter = f;
  _renderPBWins();
}

function _getFilteredWins(){
  const all = S.premiumBonds.wins;
  if(_pbWinsFilter === 'all') return all;
  const months = _pbWinsFilter === '6m' ? 6 : 12;
  const now    = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return all.filter(w => new Date(w.year, w.month - 1, 1) >= cutoff);
}

// ── Wins table ────────────────────────────────────
function _renderPBWins(){
  const allWins      = S.premiumBonds.wins;
  const filteredWins = _getFilteredWins();
  const tb           = document.getElementById('pbWinsBody');

  // Filter bar
  const filterBar = document.getElementById('pbWinsFilterBar');
  if(filterBar){
    const btn = (label, val) =>
      `<button onclick="setPBWinsFilter('${val}')"
        style="cursor:pointer;padding:4px 12px;font-size:11px;border-radius:var(--radius-sm);
          border:1px solid ${_pbWinsFilter===val ? 'var(--accent)' : 'var(--border)'};
          background:${_pbWinsFilter===val ? 'var(--accent)' : 'transparent'};
          color:${_pbWinsFilter===val ? '#fff' : 'var(--muted)'};
          font-variation-settings:'wght' ${_pbWinsFilter===val ? '600' : '400'};
          transition:all .15s;">${label}</button>`;

    const filteredTotal = filteredWins.reduce((s, w) => s + w.amount, 0);
    const periodLabel   = _pbWinsFilter === 'all'
      ? `${allWins.length} prize${allWins.length !== 1 ? 's' : ''}`
      : `${filteredWins.length} prize${filteredWins.length !== 1 ? 's' : ''} · ${fmt(filteredTotal)}`;

    filterBar.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        <span class="material-symbols-rounded" style="font-size:15px;color:var(--muted);">filter_list</span>
        ${btn('All time', 'all')}
        ${btn('Last year', '12m')}
        ${btn('Last 6 months', '6m')}
        <span style="margin-left:auto;font-size:11px;color:var(--muted);">${periodLabel}</span>
      </div>`;
  }

  // Empty state
  if(!filteredWins.length){
    tb.innerHTML = `<tr><td colspan="5"><div class="empty">
      <div class="ei">◎</div>
      <p>No wins ${_pbWinsFilter !== 'all' ? 'in this period' : 'logged yet'}.</p>
    </div></td></tr>`;
    return;
  }

  // Map to original indices BEFORE any reverse/spread — safe for delete
  const withOrigIdx = filteredWins.map(w => ({ w, origIdx: allWins.indexOf(w) }));

  let running = 0;
  const rowData = [...withOrigIdx].reverse().map(item => {
    running += item.w.amount;
    return { ...item, running };
  }).reverse();

  tb.innerHTML = rowData.map(({ w, origIdx, running }) => {
    const addedToBonds = w.autoAdded;
    return `<tr>
      <td>${monthYear(w.month, w.year)}</td>
      <td style="color:var(--green);font-variation-settings:'wght' 700;" class="val">${fmt(w.amount)}</td>
      <td class="val" style="color:var(--green);">${fmt(running)}</td>
      <td>
        <span class="pill ${addedToBonds ? 'p-isa' : 'p-income'}"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 5px;">
          <span class="material-symbols-rounded" style="font-size:14px;line-height:1;">
            ${addedToBonds ? 'savings' : 'account_balance'}
          </span>
          ${addedToBonds ? 'added to bonds' : 'paid to bank'}
        </span>
      </td>
      <td><button class="icon-btn del" onclick="deletePBWin(${origIdx})">✕</button></td>
    </tr>`;
  }).join('');
}

// ── Delete / undo wins ────────────────────────────
function deletePBWin(origIdx){
  const deleted = S.premiumBonds.wins.splice(origIdx, 1)[0];
  window._lastDeletedPBWin = { item: deleted, index: origIdx };
  updatePBUndoButton();
  save(); renderPremiumBonds(); toast('Removed');
}

function undoLastPBDelete(){
  if(!window._lastDeletedPBWin) return;
  const { item, index } = window._lastDeletedPBWin;
  S.premiumBonds.wins.splice(index, 0, item);
  window._lastDeletedPBWin = null;
  updatePBUndoButton();
  save(); renderPremiumBonds(); toast('Restored');
}

function updatePBUndoButton(){
  const btn = document.getElementById('pbUndoBtn');
  if(!btn) return;
  btn.style.opacity       = window._lastDeletedPBWin ? '1' : '0';
  btn.style.pointerEvents = window._lastDeletedPBWin ? 'auto' : 'none';
}