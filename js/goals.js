// ── Goals ─────────────────────────────────────────────
// JS: GOALS
// ═══════════════════════════════════════════════════
const GOAL_COLS = ['#5046e5', '#0a8f5c', '#1d6fca', '#b87309', '#b03070', '#0b7a6e'];

let _goalDragSrc = null;

// ── Schedule Calculator ────────────────────────────────
// Returns null if both start+end dates aren't set.
// Otherwise compares actual saved vs. what should have been
// saved by today using linear interpolation across the timeline.
//
//   expectedSaved = target × (elapsed / total duration)
//   delta         = saved − expectedSaved
//
// Thresholds (% of target):
//   delta > +2%  → ahead
//   delta < −2%  → behind
//   otherwise    → on track
//
function _goalSchedule(g) {
  if (!g.startDate || !g.date) return null;
  const start = new Date(g.startDate);
  const end = new Date(g.date);
  const now = new Date();
  const total = end - start;
  if (total <= 0) return null;
  const elapsed = clamp(now - start, 0, total);
  const pctTime = elapsed / total;                         // 0–1: how far through the timeline we are
  const expectedSaved = g.target * pctTime;
  const delta = g.saved - expectedSaved;                    // +ve = ahead, -ve = behind
  const threshold = g.target * 0.02;                        // 2% buffer avoids hair-trigger flipping
  const status = delta > threshold ? 'ahead' : delta < -threshold ? 'behind' : 'on-track';
  return { expectedSaved, delta, pctTime, status };
}

// ── Render ─────────────────────────────────────────────
function renderGoals() {
  const grid = document.getElementById('goalsGrid');

  if (!S.goals.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ei">◐</div><p>No goals yet.</p></div>`;
    return;
  }
  grid.innerHTML = S.goals.map((g, i) => {
    const p = clamp(g.saved / g.target, 0, 1);
    const col = GOAL_COLS[i % GOAL_COLS.length];
    const rem = Math.max(0, g.target - g.saved);
    const now = new Date(), end = g.date ? new Date(g.date) : null;
    const mo = end ? Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24 * 30.5))) : null;
    const contribs = g.contributions || [];
    const sched = _goalSchedule(g);

    // ── Date label ────────────────────────────────────
    let dateLabel = 'No target date';
    if (g.startDate && g.date) {
      dateLabel = `${fmtDate(g.startDate)} → ${fmtDate(g.date)}${mo != null ? ' · ' + mo + ' mo' : ''}`;
    } else if (g.date) {
      dateLabel = `Target: ${fmtDate(g.date)}${mo != null ? ' · ' + mo + ' mo' : ''}`;
    } else if (g.startDate) {
      dateLabel = `Started: ${fmtDate(g.startDate)}`;
    }

    // ── Schedule badge ────────────────────────────────
    // Shows exact £ delta. Redness scales with how far behind.
    let schedBadge = '';
    if (sched) {
      const absDelta = Math.abs(sched.delta);
      const pctOff = Math.round(absDelta / g.target * 100);
      if (sched.status === 'ahead') {
        schedBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:#d1fae5;color:#065f46;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px;">
          ↑ ${fmt(absDelta)} ahead
        </span>`;
      } else if (sched.status === 'behind') {
        // Intensity 0→1 at 25% off target, so colour deepens as you fall further behind
        const intensity = clamp(pctOff / 25, 0, 1);
        const bg = `rgba(${Math.round(220 + intensity * 35)},${Math.round(50 - intensity * 30)},${Math.round(70 - intensity * 50)},${0.12 + intensity * 0.08})`;
        const fg = `rgb(${Math.round(160 + intensity * 40)},${Math.round(20 - intensity * 10)},40)`;
        schedBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:${bg};color:${fg};border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px;">
          ↓ ${fmt(absDelta)} behind${pctOff >= 10 ? ' (' + pctOff + '%)' : ''}
        </span>`;
      } else {
        schedBadge = `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(16,185,129,.12);color:#065f46;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px;">
          ✓ On schedule
        </span>`;
      }
    } else if (g.date && !g.startDate) {
      // Has end date but no start date — invite user to enable tracking
      schedBadge = `<span onclick="openEditGoal(${i})" style="display:inline-flex;align-items:center;gap:3px;background:rgba(0,0,0,.06);color:var(--muted);border-radius:999px;padding:2px 8px;font-size:11px;margin-left:6px;cursor:pointer;" title="Add a start date to enable schedule tracking">
        + add start date
      </span>`;
    }

    // ── Progress bar with "expected today" marker ──────
    // A vertical tick shows where savings *should* be right now,
    // making the gap (or surplus) visually instant.
    const schedMarker = sched ? `
      <div title="Expected today: ${fmt(sched.expectedSaved)}" style="
        position:absolute;top:-3px;bottom:-3px;
        left:${(sched.pctTime * 100).toFixed(2)}%;
        transform:translateX(-50%);
        width:2px;background:rgba(0,0,0,.28);border-radius:2px;pointer-events:none;">
      </div>
      <div style="
        position:absolute;bottom:calc(100% + 5px);
        left:${(sched.pctTime * 100).toFixed(2)}%;
        transform:translateX(-50%);
        font-size:9px;color:var(--muted);white-space:nowrap;pointer-events:none;">
        today's target
      </div>`: '';

    // ── Contribution timeline rows ─────────────────────
    const tlRows = contribs.slice().reverse().map(c => `
      <div style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;font-size:12px;padding:5px 2px;border-bottom:1px solid var(--border,#f0f0f0);">
        <span style="color:var(--muted);white-space:nowrap;">${c.date || ''}</span>
        <span style="color:var(--muted);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.note || ''}</span>
        <span class="val" style="color:${col};font-weight:700;white-space:nowrap;">+${fmt(c.amount)}</span>
      </div>`).join('');

    return `<div class="goal-card" draggable="true" data-idx="${i}"
        ondragstart="_gdStart(event,${i})"
        ondragover="_gdOver(event)"
        ondrop="_gdDrop(event,${i})"
        ondragleave="_gdLeave(event)"
        ondragend="_gdEnd(event)">

      <!-- Header -->
      <div class="flex-row-between" style="align-items:flex-start;gap:8px;">
        <div style="min-width:0;">
          <div class="goal-name">${g.emoji || '◐'} ${g.name}</div>
          <div class="goal-meta flex-row flex-wrap gap-2" style="margin-top:2px;">
            <span>${dateLabel}</span>${schedBadge}
          </div>
        </div>
        <div class="flex-row gap-4" style="flex-shrink:0;">
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <button class="icon-btn edit" onclick="openEditGoal(${i})" title="Edit goal">✎</button>
          <button class="icon-btn del"  onclick="deleteGoal(${i})"   title="Delete goal">✕</button>
        </div>
      </div>

      <!-- Big amount -->
      <div class="goal-saved val" style="color:${col};margin-top:10px;">
        ${fmt(g.saved)}
        <span style="font-size:14px;color:var(--muted);font-variation-settings:'wght' 400;"> of ${fmt(g.target)}</span>
      </div>

      <!-- Progress bar + expected-today marker -->
      <div class="prog-outer" style="margin:16px 0 6px;position:relative;">
        <div class="prog-fill" style="width:${(p * 100).toFixed(2)}%;background:${col};transition:width .4s;"></div>
        ${schedMarker}
      </div>

      <!-- Stats row -->
      <div class="goal-stats flex-row-between flex-wrap gap-4">
        <span style="color:${col};font-variation-settings:'wght' 600;">${Math.round(p * 100)}% saved</span>
        <span class="text-muted" style="font-size:13px;">
          <span class="val" style="color:var(--text);">${fmt(rem)}</span> to go
          ${g.monthly ? ` &nbsp;·&nbsp; <span class="val">${fmt(g.monthly)}</span>/mo` : ''}
        </span>
      </div>

      <!-- Expected vs actual row (only when schedule data available) -->
      ${sched ? `
      <div class="flex-row-between text-sm text-muted" style="margin-top:5px;padding-top:5px;border-top:1px solid var(--border,#f0f0f0);">
        <span>Expected by today: <span class="val" style="color:var(--text);">${fmt(sched.expectedSaved)}</span></span>
        <span style="color:${sched.status === 'behind' ? '#b03070' : sched.status === 'ahead' ? '#0a8f5c' : 'var(--muted)'};font-weight:700;">
          ${sched.delta >= 0 ? '+' : ''}${fmt(sched.delta)}
        </span>
      </div>`: ''}

      <!-- Contributions timeline -->
      ${contribs.length ? `
      <button onclick="_tlToggle(${i})" style="all:unset;cursor:pointer;margin-top:10px;" class="flex-row gap-6 text-sm text-muted" style="border-top:1px solid var(--border,#eee);padding-top:8px;width:100%;box-sizing:border-box;">
        <span id="tl-arr-${i}" style="font-size:10px;transition:transform .2s;">▶</span>
        ${contribs.length} contribution${contribs.length !== 1 ? 's' : ''}
        <span class="text-xs" style="opacity:.7;">(${fmt(contribs.reduce((s, c) => s + c.amount, 0))} total)</span>
      </button>
      <div id="tl-${i}" style="display:none;margin-top:4px;max-height:200px;overflow-y:auto;">
        ${tlRows}
      </div>`
        : `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border,#eee);font-size:12px;color:var(--muted);">No contributions yet — use ✎ to log one.</div>`}
    </div>`;
  }).join('');
}

// ── Timeline toggle ────────────────────────────────────
function _tlToggle(i) {
  const box = document.getElementById(`tl-${i}`);
  const arr = document.getElementById(`tl-arr-${i}`);
  if (!box) return;
  const open = box.style.display === 'none';
  box.style.display = open ? 'block' : 'none';
  if (arr) arr.style.transform = open ? 'rotate(90deg)' : 'none';
}

// ── Drag & Drop reordering ─────────────────────────────
function _gdStart(e, i) {
  _goalDragSrc = i;
  e.dataTransfer.effectAllowed = 'move';
  e.target.closest('.goal-card').style.opacity = '0.5';
}
function _gdOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const card = e.target.closest('.goal-card');
  if (card) card.style.borderTop = '2px solid var(--accent)';
}
function _gdDrop(e, i) {
  e.preventDefault();
  const targetCard = e.target.closest('.goal-card');
  if (!targetCard) return;
  const targetIndex = i;
  if (_goalDragSrc !== null && _goalDragSrc !== targetIndex) {
    const moved = S.goals.splice(_goalDragSrc, 1)[0];
    S.goals.splice(targetIndex, 0, moved);
    _goalDragSrc = null;
    save(); renderGoals();
  }
}
function _gdEnd(e) {
  document.querySelectorAll('.goal-card').forEach(card => {
    card.style.opacity = '1';
    card.style.borderTop = '';
  });
  _goalDragSrc = null;
}

// ── Add Goal ───────────────────────────────────────────
function addGoal() {
  const name = (document.getElementById('gName').value || '').trim();
  const target = parseMoney(document.getElementById('gTarget').value);
  const saved = parseMoney(document.getElementById('gSaved').value) || 0;
  const date = document.getElementById('gDate').value || '';
  const monthly = parseMoney(document.getElementById('gMonthly').value) || 0;
  const emoji = document.getElementById('gEmoji').value || '◐';
  // gStartDate is optional in HTML — falls back to today so schedule tracking works immediately
  const startDateEl = document.getElementById('gStartDate');
  const startDate = startDateEl && startDateEl.value
    ? startDateEl.value
    : new Date().toISOString().slice(0, 10);

  if (!name || isNaN(target) || target <= 0) { toast('Please fill in a name and target amount.'); return; }

  const contributions = saved > 0
    ? [{ date: new Date().toLocaleDateString(), amount: saved, note: 'Initial amount' }]
    : [];

  S.goals.push({ name, target, saved, date, startDate, monthly, emoji, contributions });
  save(); toast(`Added: ${name}`);
  ['gName', 'gTarget', 'gSaved', 'gDate', 'gMonthly', 'gStartDate'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const emojiEl = document.getElementById('gEmoji'); if (emojiEl) emojiEl.selectedIndex = 0;
  renderGoals();
}

function deleteGoal(i) {
  const deleted = S.goals.splice(i, 1)[0];
  window._lastDeletedGoal = { item: deleted, index: i };
  updateUndoButton('goalsUndoBtn', window._lastDeletedGoal);
  save();
  renderGoals();
  toast('Removed');
}

function undoLastGoalDelete() {
  if (!window._lastDeletedGoal) return;
  const { item, index } = window._lastDeletedGoal;
  S.goals.splice(index, 0, item);
  window._lastDeletedGoal = null;
  updateUndoButton('goalsUndoBtn', null);
  save();
  renderGoals();
  toast('Restored');
}

// ── Edit Goal modal ────────────────────────────────────
function openEditGoal(i) {
  const g = S.goals[i];
  const col = GOAL_COLS[i % GOAL_COLS.length];
  let modal = document.getElementById('_goalEditModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = '_goalEditModal';
    modal.setAttribute('onclick', 'if(event.target===this)closeEditGoal()');
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);' + 'display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    document.body.appendChild(modal);
  }

  // Current schedule status shown at the top of the modal
  const sched = _goalSchedule(g);
  let schedNote = '';
  if (sched) {
    const sign = sched.delta >= 0 ? '+' : '';
    const statusColour = sched.status === 'behind' ? '#b03070' : sched.status === 'ahead' ? '#0a8f5c' : 'var(--text)';
    const statusBg = sched.status === 'behind' ? 'rgba(176,48,112,.09)' : sched.status === 'ahead' ? 'rgba(10,143,92,.09)' : 'rgba(0,0,0,.05)';
    schedNote = `<div style="background:${statusBg};border-radius:10px;padding:10px 12px;font-size:13px;color:var(--muted);">
      Schedule: <strong style="color:${statusColour};">${sign}${fmt(sched.delta)} (${sched.status === 'on-track' ? 'on schedule' : sched.status})</strong>
      &nbsp;·&nbsp; Expected by today: <strong style="color:var(--text);">${fmt(sched.expectedSaved)}</strong>
    </div>`;
  } else {
    schedNote = `<div style="background:rgba(0,0,0,.04);border-radius:10px;padding:10px 12px;font-size:13px;color:var(--muted);">
      Set a <strong>Start Date</strong> and <strong>Target Date</strong> to enable schedule tracking.
    </div>`;
  }

  modal.innerHTML = `
    <div style="background:var(--card,#fff);border-radius:18px;padding:24px;width:min(440px,100%);display:flex;flex-direction:column;gap:14px;box-shadow:0 12px 40px rgba(0,0,0,.22);max-height:92vh;overflow-y:auto;">

      <div class="flex-row-between">
        <h3 style="margin:0;font-size:17px;">${g.emoji || '◐'} ${g.name}</h3>
        <button onclick="closeEditGoal()" style="all:unset;cursor:pointer;font-size:22px;color:var(--muted);line-height:1;">✕</button>
      </div>

      ${schedNote}

      <label class="text-muted" style="font-size:13px;" class="flex-col gap-4">Name
        <input id="_eg-name" class="input" value="${g.name}">
      </label>

      <label class="text-muted" style="font-size:13px;" class="flex-col gap-4">Target Amount
        <input id="_eg-target" class="input" type="number" min="0" value="${g.target}">
      </label>

      <!-- Start + End dates side by side -->
      <div class="grid-2col-sm">
        <label class="text-muted" style="font-size:13px;" class="flex-col gap-4">
          Start Date
          <input id="_eg-start" class="input" type="date" value="${g.startDate || ''}">
        </label>
        <label class="text-muted" style="font-size:13px;" class="flex-col gap-4">
          Target Date <span style="font-style:italic;font-weight:400;">(optional)</span>
          <input id="_eg-date" class="input" type="date" value="${g.date || ''}">
        </label>
      </div>

      <fieldset style="border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:12px 14px;margin:0;">
        <legend class="text-sm text-muted" style="padding:0 4px;">Log a Contribution</legend>
        <div class="flex-row gap-8">
          <input id="_eg-add"  class="input" type="number" min="0" placeholder="Amount" style="flex:1;">
          <input id="_eg-note" class="input" placeholder="Note (optional)" style="flex:1.4;">
        </div>
      </fieldset>

      <label class="text-muted" style="font-size:13px;" class="flex-col gap-4">Monthly Savings (reference)
        <input id="_eg-monthly" class="input" type="number" min="0" value="${g.monthly || 0}">
      </label>

      <button onclick="saveEditGoal(${i})"
        style="background:${col};color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;cursor:pointer;font-weight:700;margin-top:2px;">
        Save Changes
      </button>
    </div>`;

  modal.style.display = 'flex';
  setTimeout(() => { const el = document.getElementById('_eg-add'); if (el) el.focus(); }, 50);
}

function closeEditGoal() {
  const modal = document.getElementById('_goalEditModal');
  if (modal) modal.style.display = 'none';
}

function saveEditGoal(i) {
  const g = S.goals[i];
  const name = (document.getElementById('_eg-name').value || '').trim();
  const target = parseMoney(document.getElementById('_eg-target').value);
  const addAmt = parseMoney(document.getElementById('_eg-add').value) || 0;
  const note = (document.getElementById('_eg-note').value || '').trim();
  const monthly = parseMoney(document.getElementById('_eg-monthly').value) || 0;
  const date = document.getElementById('_eg-date').value || '';
  const startDate = document.getElementById('_eg-start').value || '';

  if (!name || isNaN(target) || target <= 0) { toast('Name and a valid target are required.'); return; }

  g.name = name; g.target = target; g.monthly = monthly; g.date = date; g.startDate = startDate;

  if (addAmt > 0) {
    g.saved = (g.saved || 0) + addAmt;
    if (!g.contributions) g.contributions = [];
    g.contributions.push({ date: new Date().toLocaleDateString(), amount: addAmt, note });
    toast(`+${fmt(addAmt)} added to "${name}"`);
  } else {
    toast('Goal updated');
  }

  save(); closeEditGoal(); renderGoals();
}