// ── Debts ─────────────────────────────────────────────
// JS: DEBTS (with Student Loan Tracking)
// ═══════════════════════════════════════════════════

// Credit score rating helper
function getCreditScoreRating(score) {
  if (score >= 961) return { label: 'Excellent', color: '#0a8f5c' };
  if (score >= 881) return { label: 'Good', color: '#1d6fca' };
  if (score >= 721) return { label: 'Fair', color: '#b87309' };
  if (score >= 561) return { label: 'Poor', color: '#b03070' };
  return { label: 'Very Poor', color: '#cc3333' };
}

let draggedCreditScoreIndex = -1;
let addCreditScoreFormOpen = false;

function toggleAddCreditScoreForm(show) {
  addCreditScoreFormOpen = show !== undefined ? show : !addCreditScoreFormOpen;
  const formBox = document.getElementById('addCreditScoreFormBox');
  if (formBox) {
    if (addCreditScoreFormOpen) {
      formBox.classList.remove('hidden');
    } else {
      formBox.classList.add('hidden');
    }
  }
}

function renderCreditScores() {
  const container = document.getElementById('creditScoreCard');
  if (!container) return;
  if (!Array.isArray(S.creditScores)) S.creditScores = [];
  
  let scoresListHtml = '';
  if (!S.creditScores.length) {
    scoresListHtml = `
      <div class="empty-score-state" style="padding: 16px; text-align: center; color: var(--muted);">
        <p style="margin: 0; font-size: 13px;">No credit scores tracked yet.</p>
      </div>
    `;
  } else {
    scoresListHtml = `
      <div style="display:flex; flex-direction:column; gap:8px; padding: 12px 16px;">
        ${S.creditScores.map((cs, i) => {
          const rating = getCreditScoreRating(cs.score);
          const lastUpdatedText = formatLastUpdated(cs.date);
          return `
            <div class="score-row" draggable="true" data-cs-index="${i}" 
                 ondragstart="dragStartCreditScore(event)" ondragover="dragOverCreditScore(event)" 
                 ondrop="dropCreditScore(event)" ondragend="dragEndCreditScore(event)"
                 style="display:flex; align-items:center; justify-content:space-between; padding: 8px 12px; background:var(--surface2); border-radius:var(--radius-sm); border:1px solid var(--border); cursor: grab;">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="font-size: 20px; font-weight:700; color:${rating.color}; min-width: 48px;">${cs.score}</div>
                <div>
                  <div style="font-size:13px; font-weight:600;">${cs.provider}</div>
                  <div style="font-size:11px; color:var(--muted);">${rating.label} · checked ${lastUpdatedText}</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                ${cs.notes ? `<span title="${cs.notes}" style="cursor:help; font-size:14px; opacity:0.7;">📝</span>` : ''}
                <button class="icon-btn edit" onclick="openEditCreditScore(${i})">✎</button>
                <button class="icon-btn del" onclick="deleteCreditScore(${i})">✕</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; padding: 12px 16px; border-bottom:1px solid var(--border);">
      <span class="card-title" style="display:flex; align-items:center; gap:8px; font-size:14px; font-weight:700;">
        <span>📊</span> Credit Scores
      </span>
      <button class="btn btn-secondary btn-sm" onclick="toggleAddCreditScoreForm()" style="font-size:11px; padding: 4px 10px;">
        ＋ Add score
      </button>
    </div>
    
    ${scoresListHtml}

    <div id="addCreditScoreFormBox" class="hidden" style="padding: 16px; border-top:1px solid var(--border); background: var(--bg);">
      <h4 style="margin: 0 0 12px 0; font-size: 12px;">Add Credit Score</h4>
      <div class="form-grid" style="gap: 10px;">
        <div class="ff"><label>Provider / Bureau</label><input type="text" id="csProvider" placeholder="e.g. Experian" /></div>
        <div class="ff"><label>Score</label><input type="number" id="csScore" placeholder="920" min="0" max="999" /></div>
        <div class="ff"><label>Date checked</label><input type="date" id="csDate" /></div>
        <div class="ff full-col"><label>Notes</label><textarea id="csNotes" placeholder="Checked online..." style="min-height:40px;"></textarea></div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
        <button class="btn btn-ghost btn-sm" onclick="toggleAddCreditScoreForm(false)">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="addCreditScore()">Save score</button>
      </div>
    </div>
  `;
}

function dragStartCreditScore(e) {
  draggedCreditScoreIndex = parseInt(e.target.closest('[data-cs-index]').dataset.csIndex);
  e.target.closest('.score-row').style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function dragOverCreditScore(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const card = e.target.closest('.score-row');
  if (card) card.style.borderTop = '2px solid var(--accent)';
}

function dropCreditScore(e) {
  e.preventDefault();
  const targetCard = e.target.closest('.score-row');
  if (!targetCard) return;
  const targetIndex = parseInt(targetCard.dataset.csIndex);
  if (draggedCreditScoreIndex !== targetIndex && draggedCreditScoreIndex !== -1) {
    const cs = S.creditScores[draggedCreditScoreIndex];
    S.creditScores.splice(draggedCreditScoreIndex, 1);
    S.creditScores.splice(targetIndex, 0, cs);
    save();
    renderCreditScores();
  }
}

function dragEndCreditScore(e) {
  document.querySelectorAll('.score-row').forEach(card => {
    card.style.opacity = '1';
    card.style.borderTop = '';
  });
  draggedCreditScoreIndex = -1;
}

function addCreditScore() {
  if (!Array.isArray(S.creditScores)) S.creditScores = [];
  const provider = (document.getElementById('csProvider').value || '').trim();
  const score = parseInt(document.getElementById('csScore').value);
  const date = document.getElementById('csDate').value;
  const notes = document.getElementById('csNotes').value;
  if (!provider || isNaN(score)) { toast('Please enter provider and score.'); return; }
  if (score < 0 || score > 999) { toast('Score must be between 0 and 999.'); return; }
  S.creditScores.push({ provider, score, date: date || new Date().toISOString().split('T')[0], notes });
  save(); toast(`Added ${provider} credit score`);
  ['csProvider', 'csScore', 'csDate', 'csNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  addCreditScoreFormOpen = false;
  renderCreditScores();
}

function deleteCreditScore(i) {
  const deleted = S.creditScores.splice(i, 1)[0];
  window._lastDeletedCreditScore = { item: deleted, index: i };
  updateUndoButton('creditScoresUndoBtn', window._lastDeletedCreditScore);
  save();
  renderCreditScores();
  toast('Removed');
}

function undoLastCreditScoreDelete() {
  if (!window._lastDeletedCreditScore) return;
  const { item, index } = window._lastDeletedCreditScore;
  S.creditScores.splice(index, 0, item);
  window._lastDeletedCreditScore = null;
  updateUndoButton('creditScoresUndoBtn', null);
  save();
  renderCreditScores();
  toast('Restored');
}

let editingCreditScoreIdx = null;

function openEditCreditScore(i) {
  editingCreditScoreIdx = i;
  const cs = S.creditScores[i];
  document.getElementById('editCreditScoreGrid').innerHTML = `
    <div class="ff"><label>Provider / Bureau</label><input type="text" id="ecs-provider" value="${cs.provider}"/></div>
    <div class="ff"><label>Score</label><input type="number" id="ecs-score" value="${cs.score}" min="0" max="999"/></div>
    <div class="ff"><label>Date checked</label><input type="date" id="ecs-date" value="${cs.date || ''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="ecs-notes">${cs.notes || ''}</textarea></div>`;
  document.getElementById('editCreditScoreModal').classList.remove('hidden');
}

function saveEditCreditScore() {
  if (editingCreditScoreIdx === null) return;
  const cs = S.creditScores[editingCreditScoreIdx];
  cs.provider = document.getElementById('ecs-provider').value;
  cs.score = parseInt(document.getElementById('ecs-score').value);
  cs.date = document.getElementById('ecs-date').value;
  cs.notes = document.getElementById('ecs-notes').value;
  save(); closeModal('editCreditScoreModal'); renderCreditScores(); toast('Saved');
}

let currentDebtPersonIdx = 0;

function switchDebtPerson(idx) {
  currentDebtPersonIdx = idx;
  renderDebts();
}

let addDebtFormOpen = false;

function toggleAddDebtForm() {
  addDebtFormOpen = !addDebtFormOpen;
  const formBox = document.getElementById('addDebtFormBox');
  const btn = document.getElementById('addDebtBtn');
  if (formBox) {
    if (addDebtFormOpen) {
      populateDebtForm();
      formBox.classList.remove('hidden');
      if (btn) {
        btn.style.borderColor = 'var(--blue)';
        btn.style.color = 'var(--blue)';
      }
    } else {
      formBox.classList.add('hidden');
      if (btn) {
        btn.style.borderColor = '';
        btn.style.color = '';
      }
    }
  }
}

function populateDebtForm() {
  const container = document.getElementById('addDebtPersonWrap');
  if (!container) return;
  if (S.settings.personNames.length > 2) {
    container.innerHTML = `
      <label>Assigned to / Shared with</label>
      <div class="checkbox-group" style="display:flex; flex-direction:column; gap:6px; margin-top:6px; background:var(--surface2); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border);">
        ${S.settings.personNames.map((name, idx) => `
          <label class="cb-row" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" class="d-person-cb" value="${idx}" />
            <span style="font-size:13px;">${name}</span>
          </label>
        `).join('')}
      </div>
    `;
    container.className = "ff full-col";
  } else {
    container.innerHTML = `
      <label>Assigned to</label>
      <select id="dPerson" style="width:100%;">
        <option value="shared">Shared (household)</option>
        ${S.settings.personNames.map((p, i) => `<option value="${i}">${p}</option>`).join('')}
      </select>
    `;
    container.className = "ff";
  }
}

function toggleStudentLoanPlanField() {
  const typeSelect = document.getElementById('dType');
  const studentLoanField = document.getElementById('studentLoanPlanField');
  if (!typeSelect || !studentLoanField) return;

  if (typeSelect.value === 'Student') {
    studentLoanField.classList.remove('hidden');
  } else {
    studentLoanField.classList.add('hidden');
  }
}

// Calculate student loan balance based on salary history and interest
function calculateStudentLoanBalance(personIdx, studentLoanPlan, overrideBalance = null) {
  if (!studentLoanPlan || studentLoanPlan === 'none') return 0;
  if (overrideBalance !== null && overrideBalance >= 0) return overrideBalance;

  // Get salary history for this person
  const personSals = S.salaries.filter(s => (s.person || 0) === personIdx);
  if (!personSals.length) return 0;

  const rules = UK_STUDENT_LOAN_RULES[studentLoanPlan] || { threshold: 0, rate: 9 };
  let balance = 0;

  // Sum all repayments from salary history
  personSals.forEach(sal => {
    if (sal.studentLoan === studentLoanPlan || (sal.studentLoan === 'none' && !sal.studentLoan)) {
      const gross = sal.gross || 0;
      const repayment = gross > rules.threshold ? (gross - rules.threshold) * rules.rate / 100 : 0;

      // Calculate interest accrual for months this salary was active
      const startDate = sal.startDate ? new Date(sal.startDate) : new Date();
      const endDate = sal.endDate && !sal.ongoing ? new Date(sal.endDate) : new Date();
      const months = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30.5)));

      // Simple accrual: interest accrues while balance exists
      for (let i = 0; i < months; i++) {
        balance = (balance - repayment) * (1 + rules.rate / 100 / 12);
      }
    }
  });

  return Math.max(0, balance);
}

function renderStudentLoanSection(personIdx) {
  const personSals = S.salaries.filter(s => (s.person || 0) === personIdx);
  if (!personSals.length) return '';

  const latestSal = personSals[personSals.length - 1];
  const plan = latestSal.studentLoan || 'none';
  if (plan === 'none') return '';

  const rules = UK_STUDENT_LOAN_RULES[plan];
  const calcBalance = calculateStudentLoanBalance(personIdx, plan);

  return `
    <div class="form-box" style="background:var(--accent-dim);border:1px solid var(--accent);">
      <h3>Student Loan (${plan})</h3>
      <div class="grid-2col mb-16" style="gap:12px;">
        <div>
          <div class="text-xs text-muted font-semibold" style="text-transform:uppercase;margin-bottom:4px;">Plan</div>
          <div class="font-semibold" style="font-size:14px;">${plan.toUpperCase()}</div>
          <div class="text-sm text-muted" style="margin-top:2px;">Threshold: £${fmt(rules.threshold)}</div>
        </div>
        <div>
          <div class="text-xs text-muted font-semibold" style="text-transform:uppercase;margin-bottom:4px;">Calculated Balance</div>
          <div class="font-semibold" style="font-size:14px;color:var(--accent);">${fmt(calcBalance)}</div>
          <div class="text-sm text-muted" style="margin-top:2px;">Based on salary history</div>
        </div>
      </div>

      <div class="grid-2col-sm mb-16">
        <div class="ff">
          <label>Current balance (override)</label>
          <input type="text" id="slBalance" placeholder="${calcBalance.toLocaleString('en-GB')}" oninput="formatMoney(this)"/>
        </div>
        <div class="ff">
          <label>Interest rate</label>
          <input type="number" id="slRate" value="${rules.rate}" step="0.1" min="0" max="15" style="background:var(--bg);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:7px 10px;"/>
          <span class="text-xs text-muted" style="position:absolute;margin-top:2px;">% per annum</span>
        </div>
      </div>

      <div class="ff full-col mb-16">
        <label>Notes</label>
        <textarea id="slNotes" placeholder="e.g. Started repayments June 2022, on Plan 2..." style="background:var(--bg);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:7px 10px;min-height:50px;"></textarea>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" onclick="saveStudentLoan(${personIdx},'${plan}')">Update student loan in debts</button>
      </div>
    </div>
  `;
}

function saveStudentLoan(personIdx, plan) {
  const overrideBalance = parseMoney(document.getElementById('slBalance').value) || null;
  const finalBalance = overrideBalance !== null ? overrideBalance : calculateStudentLoanBalance(personIdx, plan);
  const rate = parseFloat(document.getElementById('slRate').value) || 9;
  const notes = document.getElementById('slNotes').value;

  let slDebt = S.debts.find(d => d.type === 'Student' && (d.person || 0) === personIdx && !d.shared);

  if (slDebt) {
    slDebt.remaining = finalBalance;
    slDebt.rate = rate;
    slDebt.notes = notes;
  } else {
    S.debts.push({
      name: `Student Loan (${plan})`,
      type: 'Student',
      total: finalBalance,
      remaining: finalBalance,
      monthly: 0,
      rate: rate,
      start: new Date().toISOString().split('T')[0],
      end: null,
      lender: 'UK Government',
      notes: notes,
      person: personIdx,
      shared: false,
      paymentType: 'automatic',
      contributions: []
    });
  }

  save();
  toast('Student loan updated');
  renderDebts();
}

// Collapsible detail toggling state cache
window._expandedDebtCards = window._expandedDebtCards || {};

function onDebtCardToggle(debtIndex) {
  const details = document.getElementById(`details-${debtIndex}`);
  if (details) {
    window._expandedDebtCards[debtIndex] = details.open;
  }
}

// Compile manual plus auto-generated payments history
function getDebtHistory(d) {
  const history = [];
  
  if (Array.isArray(d.contributions)) {
    d.contributions.forEach(c => {
      history.push({
        date: c.date,
        amount: c.amount,
        type: c.type || 'extra',
        method: c.method || 'manual',
        isManual: true
      });
    });
  }
  
  if (d.monthly > 0 && d.start) {
    const start = new Date(d.start);
    const now = new Date();
    const end = d.end ? new Date(d.end) : now;
    const limit = end < now ? end : now;
    
    let curr = new Date(start);
    if (curr <= limit) {
      let iterations = 0;
      while (curr <= limit && iterations < 360) {
        const dateStr = curr.toISOString().split('T')[0];
        const hasManualRegular = history.some(h => h.date.slice(0, 7) === dateStr.slice(0, 7) && h.type === 'regular');
        if (!hasManualRegular) {
          history.push({
            date: dateStr,
            amount: d.monthly,
            type: 'regular',
            method: d.paymentType || 'automatic',
            isManual: false
          });
        }
        curr.setMonth(curr.getMonth() + 1);
        iterations++;
      }
    }
  }
  
  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  return history;
}

function renderDebts() {
  renderCreditScores();
  updateUndoButton('creditScoresUndoBtn', window._lastDeletedCreditScore);

  if (!S.settings.personNames || !Array.isArray(S.settings.personNames) || S.settings.personNames.length === 0) {
    S.settings.personNames = ['Person 1'];
    save();
  }
  updateUndoButton('debtsUndoBtn', window._lastDeletedDebt);

  // Render person tabs
  const tabsEl = document.getElementById('debtPersonTabs');
  const allPeople = [...S.settings.personNames];
  if (allPeople.length > 1) allPeople.push('Household');

  if (allPeople.length > 1) {
    tabsEl.innerHTML = allPeople.map((p, i) => {
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
  if (isHousehold) {
    debts = S.debts;
  } else {
    debts = S.debts.filter(d => {
      if (d.shared) {
        if (d.sharedPeople && Array.isArray(d.sharedPeople)) {
          return d.sharedPeople.includes(currentDebtPersonIdx);
        }
        return true;
      }
      return (d.person || 0) === currentDebtPersonIdx;
    });
  }

  // Hide or show student debts toggle based on whether there are student debts
  const hasStudentLoan = S.debts.some(d => d.type === 'Student');
  const studentToggleContainer = document.getElementById('studentDebtsToggleContainer');
  if (studentToggleContainer) {
    if (hasStudentLoan) {
      studentToggleContainer.classList.remove('hidden');
    } else {
      studentToggleContainer.classList.add('hidden');
    }
  }

  // Filter out student debts if checkbox is unchecked
  const includeStudent = document.getElementById('includeStudentDebts')?.checked ?? true;
  if (!includeStudent) {
    debts = debts.filter(d => d.type !== 'Student');
  }

  const totOwed = debts.reduce((s, d) => s + (d.remaining ?? d.total ?? 0), 0);
  const totMonthly = debts.reduce((s, d) => s + (d.monthly || 0), 0);
  const estMonths = totMonthly > 0 ? Math.ceil(totOwed / totMonthly) : 0;
  document.getElementById('debtSummaryCards').innerHTML = `
    <div class="stat-card sc-red"><div class="stat-label">Total owed</div><div class="stat-val neg val">${fmt(totOwed)}</div><div class="stat-sub">${debts.length} debt${debts.length !== 1 ? 's' : ''}</div></div>
    <div class="stat-card sc-amber"><div class="stat-label">Monthly payments</div><div class="stat-val val">${fmt(totMonthly)}</div><div class="stat-sub">combined</div></div>
    <div class="stat-card sc-blue"><div class="stat-label">Est. payoff</div><div class="stat-val" style="font-size:20px;">${estMonths ? estMonths + ' months' : '—'}</div><div class="stat-sub">at current rate</div></div>`;

  const slSection = document.getElementById('studentLoanSection');
  if (slSection) {
    if (!isHousehold) {
      const personSals = S.salaries.filter(s => (s.person || 0) === currentDebtPersonIdx);
      const hasSL = personSals.some(s => s.studentLoan && s.studentLoan !== 'none');
      slSection.innerHTML = hasSL ? renderStudentLoanSection(currentDebtPersonIdx) : '';
    } else {
      slSection.innerHTML = '';
    }
  }

  const grid = document.getElementById('debtGrid');
  if (!debts.length) { 
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ei">◉</div><p>No debts tracked${isHousehold ? ' for household' : ' for ' + (S.settings.personNames[currentDebtPersonIdx] || 'this person')}</p></div>`; 
    return; 
  }

  grid.innerHTML = debts.map((d) => {
    const remaining = d.remaining ?? d.total ?? 0;
    const original = d.total ?? remaining;
    const paid = Math.max(0, original - remaining);
    const paidPct = original > 0 ? Math.min((paid / original) * 100, 100) : 0;
    const now = new Date(), end = d.end ? new Date(d.end) : null;
    const monthsLeft = end ? Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24 * 30.5))) : d.monthly > 0 ? Math.ceil(remaining / d.monthly) : null;
    
    let assignedTo = '';
    if (d.shared) {
      if (d.sharedPeople && Array.isArray(d.sharedPeople)) {
        assignedTo = 'Shared with ' + d.sharedPeople.map(idx => S.settings.personNames[idx] || 'Unknown').join(', ');
      } else {
        assignedTo = 'Shared (household)';
      }
    } else {
      assignedTo = S.settings.personNames[d.person || 0] || 'Unknown';
    }

    const debtIndex = S.debts.indexOf(d);
    
    // History compilation
    const history = getDebtHistory(d);
    const historyCount = history.length;
    const historyRows = history.map((h, hIdx) => {
      const typeLabel = h.type === 'extra' ? 'Extra' : 'Regular';
      const methodLabel = h.method === 'automatic' ? 'Auto' : 'Manual';
      const typeClass = h.type === 'extra' ? 'pos' : '';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding: 4px 6px; border-bottom: 1px dashed var(--border); background: ${h.type === 'extra' ? 'rgba(10, 143, 92, 0.05)' : 'transparent'};">
          <div>
            <span style="font-variation-settings:'wght' 600;">${fmtDate(h.date)}</span>
            <span class="text-muted2" style="font-size:10px; margin-left:4px;">(${typeLabel} · ${methodLabel})</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="${typeClass}" style="font-variation-settings:'wght' 600;">${fmt(h.amount)}</span>
            ${h.isManual ? `<button class="icon-btn del" title="Delete payment" onclick="deleteContribution(${debtIndex}, ${hIdx}); event.stopPropagation(); event.preventDefault();" style="font-size:9px; padding:0 2px;">✕</button>` : ''}
          </div>
        </div>
      `;
    }).join('') || '<div class="text-muted" style="font-size:11px; padding:6px; text-align:center;">No payments logged yet.</div>';

    return `<div class="debt-card" draggable="true" data-debt-index="${debtIndex}" ondragstart="dragStartDebt(event)" ondragover="dragOverDebt(event)" ondrop="dropDebt(event)" ondragend="dragEndDebt(event)">
      <div class="flex-row-between" style="align-items:flex-start;margin-bottom:6px;">
        <div>
          <div class="debt-name">${d.name}</div>
          <div class="debt-meta">${d.lender || d.type || 'Debt'} · ${d.rate || 0}% APR · ${assignedTo}</div>
        </div>
        <div class="flex-row gap-6">
          <span class="pill p-debt">${(d.type || 'other').toLowerCase().replace(/-/g, ' ')}</span>
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <button class="icon-btn edit" onclick="openEditDebt(${debtIndex})">✎</button>
          <button class="icon-btn del"  onclick="deleteDebt(${debtIndex})">✕</button>
        </div>
      </div>
      <div class="debt-owed val">${fmt(remaining)}</div>
      <div class="text-sm text-muted" style="margin-bottom:4px;">of <span class="val">${fmt(original)}</span> original · ${paidPct.toFixed(0)}% paid</div>
      <div class="prog-outer"><div class="prog-fill" style="width:${paidPct.toFixed(1)}%;background:var(--green);"></div></div>
      <div class="debt-stats">
        <div><div class="ds-lbl">Monthly</div><div class="ds-val val">${fmt(d.monthly || 0)} <span style="font-size:9px; font-weight:normal; color:var(--muted);">${d.paymentType === 'manual' ? '(Manual)' : '(Auto)'}</span></div></div>
        <div><div class="ds-lbl">Months left</div><div class="ds-val">${monthsLeft ?? '—'}</div></div>
        <div><div class="ds-lbl">Started</div><div class="ds-val">${fmtDate(d.start)}</div></div>
        <div><div class="ds-lbl">End date</div><div class="ds-val">${fmtDate(d.end)}</div></div>
      </div>
      ${d.notes ? `<div style="margin-top:8px; background:var(--surface2); border-radius:6px; padding:7px 10px;" class="text-sm text-muted2">📝 ${d.notes}</div>` : ''}
      
      <!-- Payments History Collapsible Details -->
      <details class="debt-history-details" id="details-${debtIndex}" style="margin-top:10px; border-top:1px solid var(--border); padding-top:8px;" ${window._expandedDebtCards[debtIndex] ? 'open' : ''} ontoggle="onDebtCardToggle(${debtIndex})">
        <summary style="font-size:12px; cursor:pointer; color:var(--muted); font-weight:600; display:flex; justify-content:space-between; align-items:center;">
          <span>📋 Payment History (${historyCount})</span>
          <span style="font-size:10px; font-weight:normal; opacity:0.7;">Click to toggle</span>
        </summary>
        <div style="margin-top:6px; max-height:120px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; border:1px solid var(--border); border-radius:4px;">
          ${historyRows}
        </div>
        
        <div style="display:flex; gap:6px; margin-top:6px;">
          <button class="btn btn-secondary btn-sm" style="flex:1; font-size:10px; padding:4px 0;" onclick="toggleAddContribForm(${debtIndex}, true); event.stopPropagation(); event.preventDefault();">
            ＋ Add payment
          </button>
        </div>

        <!-- Add contribution form inline -->
        <div id="add-contrib-form-${debtIndex}" class="hidden" style="margin-top:8px; border:1px solid var(--border); padding:8px; border-radius:4px; background:var(--bg);">
          <div style="font-weight:600; font-size:11px; margin-bottom:6px;">Add payment</div>
          <div class="grid-2col-sm" style="gap:6px; margin-bottom:6px;">
            <div class="ff money-field" style="margin:0;">
              <label style="font-size:9px;">Amount</label>
              <input type="text" id="ac-amount-${debtIndex}" oninput="formatMoney(this)" style="padding:4px; font-size:11px;"/>
              <span class="currency" style="font-size:10px; right:4px; top:18px;">£</span>
            </div>
            <div class="ff" style="margin:0;">
              <label style="font-size:9px;">Date</label>
              <input type="date" id="ac-date-${debtIndex}" style="padding:3px; font-size:11px;"/>
            </div>
          </div>
          <div class="grid-2col-sm" style="gap:6px; margin-bottom:6px;">
            <div class="ff" style="margin:0;">
              <label style="font-size:9px;">Type</label>
              <select id="ac-type-${debtIndex}" style="padding:3px; font-size:11px;">
                <option value="extra">Extra / Overpayment</option>
                <option value="regular">Regular payment</option>
              </select>
            </div>
            <div class="ff" style="margin:0;">
              <label style="font-size:9px;">Method</label>
              <select id="ac-method-${debtIndex}" style="padding:3px; font-size:11px;">
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:4px;">
            <button class="btn btn-ghost btn-sm" style="font-size:10px; padding:2px 6px;" onclick="toggleAddContribForm(${debtIndex}, false); event.stopPropagation(); event.preventDefault();">Cancel</button>
            <button class="btn btn-primary btn-sm" style="font-size:10px; padding:2px 6px;" onclick="submitContribution(${debtIndex}); event.stopPropagation(); event.preventDefault();">Save</button>
          </div>
        </div>
      </details>
    </div>`;
  }).join('');
}

function toggleAddContribForm(debtIndex, show) {
  const form = document.getElementById(`add-contrib-form-${debtIndex}`);
  if (form) {
    if (show) {
      form.classList.remove('hidden');
      const dateEl = document.getElementById(`ac-date-${debtIndex}`);
      if (dateEl && !dateEl.value) {
        dateEl.value = new Date().toISOString().split('T')[0];
      }
    } else {
      form.classList.add('hidden');
    }
  }
}

function submitContribution(debtIndex) {
  const amountVal = document.getElementById(`ac-amount-${debtIndex}`).value;
  const dateVal = document.getElementById(`ac-date-${debtIndex}`).value;
  const typeVal = document.getElementById(`ac-type-${debtIndex}`).value;
  const methodVal = document.getElementById(`ac-method-${debtIndex}`).value;
  
  const amount = parseMoney(amountVal);
  if (isNaN(amount) || amount <= 0) {
    toast('Please enter a valid amount.');
    return;
  }
  
  const d = S.debts[debtIndex];
  if (!d) return;
  
  if (!Array.isArray(d.contributions)) {
    d.contributions = [];
  }
  
  d.contributions.push({
    date: dateVal || new Date().toISOString().split('T')[0],
    amount,
    type: typeVal,
    method: methodVal
  });
  
  const remaining = d.remaining ?? d.total ?? 0;
  d.remaining = Math.max(0, remaining - amount);
  
  save();
  toast('Contribution saved.');
  renderDebts();
  renderOverview();
}

function deleteContribution(debtIndex, historyIndex) {
  const d = S.debts[debtIndex];
  if (!d || !Array.isArray(d.contributions)) return;
  
  const history = getDebtHistory(d);
  const targetContrib = history[historyIndex];
  if (!targetContrib || !targetContrib.isManual) return;
  
  const matchIdx = d.contributions.findIndex(c => c.date === targetContrib.date && c.amount === targetContrib.amount && c.type === targetContrib.type);
  if (matchIdx !== -1) {
    const removed = d.contributions.splice(matchIdx, 1)[0];
    const remaining = d.remaining ?? d.total ?? 0;
    d.remaining = remaining + removed.amount;
    
    save();
    toast('Contribution removed.');
    renderDebts();
    renderOverview();
  }
}

function addDebt() {
  const name = (document.getElementById('dName').value || '').trim();
  const type = document.getElementById('dType').value;
  
  let shared = false;
  let sharedPeople = undefined;
  let person = 0;
  
  if (S.settings.personNames.length > 2) {
    const checkedCheckboxes = Array.from(document.querySelectorAll('.d-person-cb:checked'));
    const checkedIndices = checkedCheckboxes.map(cb => parseInt(cb.value));
    
    if (checkedIndices.length > 1) {
      shared = true;
      sharedPeople = checkedIndices;
    } else if (checkedIndices.length === 1) {
      person = checkedIndices[0];
    } else {
      person = 0;
    }
  } else {
    const personSel = document.getElementById('dPerson').value;
    shared = personSel === 'shared';
    if (!shared) person = parseInt(personSel) || 0;
  }
  
  const total = parseMoney(document.getElementById('dTotal').value) || 0;
  const remaining = parseMoney(document.getElementById('dRemaining').value) || total;
  const monthly = parseMoney(document.getElementById('dMonthly').value) || 0;
  const rate = parseFloat(document.getElementById('dRate').value) || 0;
  const start = document.getElementById('dStart').value;
  const end = document.getElementById('dEnd').value;
  const lender = (document.getElementById('dLender').value || '').trim();
  const notes = document.getElementById('dNotes').value;
  const studentLoanPlan = type === 'Student' ? document.getElementById('dStudentLoanPlan').value : null;
  const paymentType = document.getElementById('dPaymentType').value;
  
  if (!validateRequiredFields([
    'dName',
    { id: 'dTotal', type: 'money' },
  ], 'Please enter name and total amount.')) return;

  S.debts.push({ 
    name, 
    type, 
    total, 
    remaining, 
    monthly, 
    rate, 
    start, 
    end, 
    lender, 
    notes, 
    person: shared ? undefined : person, 
    shared, 
    sharedPeople,
    studentLoanPlan,
    paymentType,
    contributions: []
  });
  
  save(); 
  toast(`Added: ${name}`); 
  renderDebts(); 
  renderOverview();
  
  ['dName', 'dTotal', 'dRemaining', 'dMonthly', 'dRate', 'dStart', 'dEnd', 'dLender', 'dNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  addDebtFormOpen = true; // so toggle closes it
  toggleAddDebtForm();
}

function deleteDebt(i) {
  const deleted = S.debts.splice(i, 1)[0];
  window._lastDeletedDebt = { item: deleted, index: i };
  updateUndoButton('debtsUndoBtn', window._lastDeletedDebt);
  save();
  renderDebts();
  renderOverview();
  toast('Removed');
}

function undoLastDebtDelete() {
  if (!window._lastDeletedDebt) return;
  const { item, index } = window._lastDeletedDebt;
  S.debts.splice(index, 0, item);
  window._lastDeletedDebt = null;
  updateUndoButton('debtsUndoBtn', null);
  save();
  renderDebts();
  renderOverview();
  toast('Restored');
}

function openEditDebt(i) {
  editingDebtIdx = i;
  const d = S.debts[i];
  
  let personSelectorHtml = '';
  if (S.settings.personNames.length > 2) {
    const selectedPeople = d.shared ? (d.sharedPeople || []) : (d.person !== undefined ? [d.person] : [0]);
    personSelectorHtml = `
      <div class="ff full-col">
        <label>Assigned to / Shared with</label>
        <div class="checkbox-group" style="display:flex; flex-direction:column; gap:6px; margin-top:6px; background:var(--surface2); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border);">
          ${S.settings.personNames.map((name, idx) => `
            <label class="cb-row" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" class="ed-person-cb" value="${idx}" ${selectedPeople.includes(idx) ? 'checked' : ''} />
              <span style="font-size:13px;">${name}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    personSelectorHtml = `
      <div class="ff">
        <label>Assigned to</label>
        <select id="ed-person" style="width:100%;">
          <option value="shared" ${d.shared ? 'selected' : ''}>Shared (household)</option>
          ${S.settings.personNames.map((p, idx) => `
            <option value="${idx}" ${!d.shared && (d.person || 0) === idx ? 'selected' : ''}>${p}</option>
          `).join('')}
        </select>
      </div>
    `;
  }

  const paymentTypeSelectorHtml = `
    <div class="ff">
      <label>Payment method</label>
      <select id="ed-paymentType" style="width:100%;">
        <option value="automatic" ${d.paymentType !== 'manual' ? 'selected' : ''}>Automatic</option>
        <option value="manual" ${d.paymentType === 'manual' ? 'selected' : ''}>Manual</option>
      </select>
    </div>
  `;

  document.getElementById('editDebtGrid').innerHTML = `
    <div class="ff"><label>Name</label><input type="text" id="ed-name" value="${d.name}"/></div>
    <div class="ff"><label>Type</label>
      <select id="ed-type" style="width:100%;">${['Loan', 'Mortgage', 'Credit-card', 'Student', 'Car', 'Other'].map(t => `<option value="${t}"${d.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
    </div>
    ${personSelectorHtml}
    ${paymentTypeSelectorHtml}
    <div class="ff money-field"><label>Original total</label><input type="text" id="ed-total" value="${d.total ? d.total.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Remaining</label><input type="text" id="ed-remaining" value="${d.remaining ? d.remaining.toLocaleString('en-GB') : (d.total ? d.total.toLocaleString('en-GB') : '')}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff money-field"><label>Monthly payment</label><input type="text" id="ed-monthly" value="${d.monthly ? d.monthly.toLocaleString('en-GB') : ''}" oninput="formatMoney(this)"/><span class="currency">£</span></div>
    <div class="ff"><label>Interest rate (%)</label><input type="number" id="ed-rate" value="${d.rate || ''}" step=".1"/></div>
    <div class="ff"><label>Start date</label><input type="date" id="ed-start" value="${d.start || ''}"/></div>
    <div class="ff"><label>End date</label><input type="date" id="ed-end" value="${d.end || ''}"/></div>
    <div class="ff"><label>Lender</label><input type="text" id="ed-lender" value="${d.lender || ''}"/></div>
    <div class="ff full-col"><label>Notes</label><textarea id="ed-notes">${d.notes || ''}</textarea></div>`;
  document.getElementById('editDebtModal').classList.remove('hidden');
}

function saveEditDebt() {
  if (editingDebtIdx === null) return;
  const d = S.debts[editingDebtIdx];
  d.name = document.getElementById('ed-name').value;
  d.type = document.getElementById('ed-type').value;
  d.total = parseMoney(document.getElementById('ed-total').value) || d.total;
  d.remaining = parseMoney(document.getElementById('ed-remaining').value) ?? d.remaining;
  d.monthly = parseMoney(document.getElementById('ed-monthly').value) || 0;
  d.rate = parseFloat(document.getElementById('ed-rate').value) || 0;
  d.start = document.getElementById('ed-start').value;
  d.end = document.getElementById('ed-end').value;
  d.lender = document.getElementById('ed-lender').value;
  d.notes = document.getElementById('ed-notes').value;
  d.paymentType = document.getElementById('ed-paymentType').value;
  
  if (S.settings.personNames.length > 2) {
    const checkedCheckboxes = Array.from(document.querySelectorAll('.ed-person-cb:checked'));
    const checkedIndices = checkedCheckboxes.map(cb => parseInt(cb.value));
    if (checkedIndices.length > 1) {
      d.shared = true;
      d.sharedPeople = checkedIndices;
      delete d.person;
    } else if (checkedIndices.length === 1) {
      d.shared = false;
      delete d.sharedPeople;
      d.person = checkedIndices[0];
    } else {
      d.shared = false;
      delete d.sharedPeople;
      d.person = 0;
    }
  } else {
    const personSel = document.getElementById('ed-person').value;
    d.shared = personSel === 'shared';
    if (d.shared) {
      delete d.person;
      delete d.sharedPeople;
    } else {
      d.person = parseInt(personSel, 10) || 0;
      delete d.sharedPeople;
    }
  }
  
  save(); 
  closeModal('editDebtModal'); 
  renderDebts(); 
  toast('Saved');
}

let draggedDebtIndex = -1;

function dragStartDebt(e) {
  draggedDebtIndex = parseInt(e.target.closest('[data-debt-index]').dataset.debtIndex);
  e.target.closest('.debt-card').style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function dragOverDebt(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const card = e.target.closest('.debt-card');
  if (card) card.style.borderTop = '2px solid var(--accent)';
}

function dropDebt(e) {
  e.preventDefault();
  const targetCard = e.target.closest('.debt-card');
  if (!targetCard) return;
  const targetIndex = parseInt(targetCard.dataset.debtIndex);
  if (draggedDebtIndex !== targetIndex && draggedDebtIndex !== -1) {
    const debt = S.debts[draggedDebtIndex];
    S.debts.splice(draggedDebtIndex, 1);
    S.debts.splice(targetIndex, 0, debt);
    save();
    renderDebts();
  }
}

function dragEndDebt(e) {
  document.querySelectorAll('.debt-card').forEach(card => {
    card.style.opacity = '1';
    card.style.borderTop = '';
  });
  draggedDebtIndex = -1;
}
