// app.js — Main application controller

// ===== STATE =====
let currentDFA = null;         // The DFA currently loaded
let partitionResult = null;    // Result from partition method
let myhillResult = null;       // Result from myhill method
let partStep = 0;              // Current partition step index
let myhillStep = 0;            // Current myhill step index


// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  populatePresets();
  // Load a default DFA so it's not blank
  const defaultKey = Object.keys(PRESETS)[0];
  loadDFAFromPreset(PRESETS[defaultKey]);
});

// ===== NAVIGATION =====
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('mainNav').classList.toggle('open');
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId)?.classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tabId}"]`)?.classList.add('active');
  document.getElementById('mainNav').classList.remove('open');

  // Refresh visualizations after tab switch (cytoscape needs DOM to be visible)
  if (tabId === 'partition' && currentDFA) {
    setTimeout(() => refreshPartitionTab(), 50);
  }
  if (tabId === 'myhill' && currentDFA) {
    setTimeout(() => refreshMyhillTab(), 50);
  }
  if (tabId === 'compare') {
    setTimeout(() => refreshCompareTab(), 50);
  }
  if (tabId === 'builder') {
    setTimeout(() => {
      if (currentDFA) renderBuilderViz();
    }, 50);
  }
}

// ===== PRESETS =====
function populatePresets() {
  const sel = document.getElementById('presetSelect');
  for (const name of Object.keys(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  }
}

function loadPreset() {
  const sel = document.getElementById('presetSelect');
  const key = sel.value;
  if (!key || !PRESETS[key]) return;
  loadDFAFromPreset(PRESETS[key]);
}

function loadDFAFromPreset(dfa) {
  document.getElementById('inputStates').value = dfa.states.join(', ');
  document.getElementById('inputAlphabet').value = dfa.alphabet.join(', ');
  document.getElementById('inputStart').value = dfa.startState;
  document.getElementById('inputAccept').value = dfa.acceptStates.join(', ');
  buildTransitionTable();
  // Fill in transitions
  for (const state of dfa.states) {
    for (const sym of dfa.alphabet) {
      const input = document.getElementById(`trans_${cssId(state)}_${cssId(sym)}`);
      if (input) input.value = dfa.transitions[state]?.[sym] || '';
    }
  }
  applyDFA();
}

function cssId(s) {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ===== BUILDER =====
function buildTransitionTable() {
  const states = parseList(document.getElementById('inputStates').value);
  const alphabet = parseList(document.getElementById('inputAlphabet').value);
  const container = document.getElementById('transitionTableContainer');

  if (states.length === 0 || alphabet.length === 0) {
    container.innerHTML = '<p class="hint">Enter states and alphabet above.</p>';
    return;
  }

  let html = '<div class="transition-table-wrap"><table class="trans-table"><thead><tr>';
  html += '<th>State</th>';
  for (const sym of alphabet) html += `<th>${escHtml(sym)}</th>`;
  html += '</tr></thead><tbody>';

  for (const state of states) {
    html += `<tr><td><label>δ(${escHtml(state)},·)</label></td>`;
    for (const sym of alphabet) {
      const id = `trans_${cssId(state)}_${cssId(sym)}`;
      html += `<td><input type="text" id="${id}" placeholder="?" maxlength="20" /></td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function parseList(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readTransitions(states, alphabet) {
  const trans = {};
  for (const state of states) {
    trans[state] = {};
    for (const sym of alphabet) {
      const el = document.getElementById(`trans_${cssId(state)}_${cssId(sym)}`);
      if (el) trans[state][sym] = el.value.trim();
    }
  }
  return trans;
}

function applyDFA() {
  const states = parseList(document.getElementById('inputStates').value);
  const alphabet = parseList(document.getElementById('inputAlphabet').value);
  const startState = document.getElementById('inputStart').value.trim();
  const acceptStates = parseList(document.getElementById('inputAccept').value);
  const transitions = readTransitions(states, alphabet);

  const dfa = createDFA(states, alphabet, transitions, startState, acceptStates);
  const errors = validateDFA(dfa);

  const validBox = document.getElementById('validationMessages');
  if (errors.length > 0) {
    validBox.className = 'validation-box has-errors';
    validBox.innerHTML = '<strong>Issues:</strong><ul>' + errors.map(e => `<li>${escHtml(e)}</li>`).join('') + '</ul>';
    return;
  }

  validBox.className = 'validation-box is-valid';
  validBox.textContent = '✓ DFA is valid!';

  currentDFA = dfa;
  partitionResult = null;
  myhillResult = null;
  partStep = 0;
  myhillStep = 0;

  renderBuilderViz();
  document.getElementById('stringTester').style.display = 'block';
  document.getElementById('gotoMethods').style.display = 'flex';
}

function renderBuilderViz() {
  const container = document.getElementById('builderDfaViz');
  container.innerHTML = '';
  renderDFASimple(container, currentDFA);
}

function resetDFA() {
  document.getElementById('inputStates').value = '';
  document.getElementById('inputAlphabet').value = '';
  document.getElementById('inputStart').value = '';
  document.getElementById('inputAccept').value = '';
  document.getElementById('transitionTableContainer').innerHTML = '<p class="hint">Enter states and alphabet above, then click "Build Table".</p>';
  document.getElementById('validationMessages').className = 'validation-box';
  document.getElementById('validationMessages').textContent = '';
  document.getElementById('stringTester').style.display = 'none';
  document.getElementById('gotoMethods').style.display = 'none';
  document.getElementById('builderDfaViz').innerHTML = '';
  currentDFA = null;
  partitionResult = null;
  myhillResult = null;
}

function testString() {
  if (!currentDFA) return;
  const input = document.getElementById('testInput').value;
  const result = dfaRun(currentDFA, input);
  const el = document.getElementById('testResult');
  if (result === null) {
    el.className = 'test-result reject';
    el.textContent = '⚠ Invalid input — contains symbol not in alphabet.';
  } else if (result) {
    el.className = 'test-result accept';
    el.textContent = `✓ "${input}" is ACCEPTED by this DFA.`;
  } else {
    el.className = 'test-result reject';
    el.textContent = `✗ "${input}" is REJECTED by this DFA.`;
  }
}

// ===== PARTITION TAB =====
function refreshPartitionTab() {
  if (!currentDFA) {
    document.getElementById('partitionNoData').style.display = 'block';
    document.getElementById('partitionContent').style.display = 'none';
    return;
  }
  document.getElementById('partitionNoData').style.display = 'none';
  document.getElementById('partitionContent').style.display = 'block';

  if (!partitionResult) {
    partitionResult = partitionRefinement(currentDFA);
    partStep = 0;
  }
  renderPartitionStep();
}

function renderPartitionStep() {
  const steps = partitionResult.steps;
  const step = steps[partStep];

  document.getElementById('partCounter').textContent = `Step ${partStep + 1} / ${steps.length}`;
  document.getElementById('partPrev').disabled = partStep === 0;
  document.getElementById('partNext').disabled = partStep === steps.length - 1;

  // Render partition groups
  const display = document.getElementById('partitionDisplay');
  display.innerHTML = '';
  for (let i = 0; i < step.partitions.length; i++) {
    const group = step.partitions[i];
    const div = document.createElement('div');
    div.className = 'partition-group';
    const label = document.createElement('div');
    label.className = 'partition-group-label';
    label.textContent = `G${i}`;
    const states = document.createElement('div');
    states.className = 'partition-group-states';
    for (const st of group) {
      const chip = document.createElement('span');
      const isAccept = currentDFA.acceptStates.includes(st);
      chip.className = 'state-chip ' + (isAccept ? 'chip-accept' : 'chip-normal');
      chip.textContent = st;
      chip.title = isAccept ? `${st} (accepting)` : st;
      states.appendChild(chip);
    }
    div.appendChild(label);
    div.appendChild(states);
    display.appendChild(div);
  }

  // Description
  const desc = document.getElementById('partitionStepDesc');
  desc.textContent = step.description;
  desc.className = 'step-description' + (step.converged ? ' converged' : '');

  // Show result if last step and converged
  const resultEl = document.getElementById('partitionResult');
  if (step.converged) {
    resultEl.style.display = 'block';
    renderPartitionResult();
  } else {
    resultEl.style.display = 'none';
  }
}

function renderPartitionResult() {
  const { finalPartitions, minimizedDFA } = partitionResult;

  // Final classes
  const el = document.getElementById('partitionFinalClasses');
  el.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'final-classes';
  for (const group of finalPartitions) {
    const chip = document.createElement('span');
    chip.className = 'final-class-chip';
    chip.textContent = '{' + group.join(', ') + '}';
    row.appendChild(chip);
  }
  el.appendChild(row);

  // Minimized DFA visualization
  const vizEl = document.getElementById('partitionMinDfaViz');
  vizEl.innerHTML = '';
  renderDFASimple(vizEl, minimizedDFA);

  // Transition table
  const tableEl = document.getElementById('partitionMinDfaTable');
  tableEl.innerHTML = renderMinDFATable(minimizedDFA);
}

function partitionPrev() { if (partStep > 0) { partStep--; renderPartitionStep(); } }
function partitionNext() { if (partStep < partitionResult.steps.length - 1) { partStep++; renderPartitionStep(); } }
function partitionRunAll() { partStep = partitionResult.steps.length - 1; renderPartitionStep(); }

// ===== MYHILL TAB =====
function refreshMyhillTab() {
  if (!currentDFA) {
    document.getElementById('myhillNoData').style.display = 'block';
    document.getElementById('myhillContent').style.display = 'none';
    return;
  }
  document.getElementById('myhillNoData').style.display = 'none';
  document.getElementById('myhillContent').style.display = 'block';

  if (!myhillResult) {
    myhillResult = tableFilling(currentDFA);
    myhillStep = 0;
  }
  renderMyhillStep();
}

function renderMyhillStep() {
  const iters = myhillResult.iterations;
  const iter = iters[myhillStep];

  document.getElementById('myhillCounter').textContent = `Step ${myhillStep + 1} / ${iters.length}`;
  document.getElementById('myhillPrev').disabled = myhillStep === 0;
  document.getElementById('myhillNext').disabled = myhillStep === iters.length - 1;

  // Description
  const desc = document.getElementById('myhillStepDesc');
  desc.textContent = iter.description;
  desc.className = 'step-description' + (iter.converged ? ' converged' : '');

  // Build table
  const tableEl = document.getElementById('myhillTable');
  tableEl.innerHTML = buildMyhillTableHTML(iter, myhillResult.pairs, myhillResult);

  // Show result at last step
  const resultEl = document.getElementById('myhillResult');
  if (iter.converged) {
    resultEl.style.display = 'block';
    renderMyhillResult();
  } else {
    resultEl.style.display = 'none';
  }
}

function buildMyhillTableHTML(currentIter, allPairs, result) {
  // allPairs = ['qi,qj', ...]
  // Get all unique states involved
  const reachable = getReachableStates(currentDFA);
  const states = currentDFA.states.filter(s => reachable.has(s));
  const n = states.length;

  const snap = currentIter.tableSnapshot;
  const newlyMarked = new Set(currentIter.markedThisRound);

  let html = '<table>';
  // Header row: states[1..n-1]
  html += '<thead><tr><th></th>';
  for (let j = 0; j < n - 1; j++) {
    html += `<th>${escHtml(states[j])}</th>`;
  }
  html += '</tr></thead><tbody>';

  // Rows: states[1..n-1] (row = states[i], col = states[j] where j < i)
  for (let i = 1; i < n; i++) {
    html += `<tr><th>${escHtml(states[i])}</th>`;
    for (let j = 0; j < n - 1; j++) {
      if (j >= i) {
        // Upper triangle — greyed out
        html += `<td class="cell-diag"> </td>`;
        continue;
      }
      const key = [states[i], states[j]].sort().join(',');
      const info = snap[key];
      if (!info) {
        html += `<td class="cell-diag">—</td>`;
        continue;
      }

      if (!info.marked) {
        // Will show equiv marking at final step
        if (currentIter.converged) {
          html += `<td class="cell-equiv" title="Indistinguishable: ${escHtml(key)}">≡</td>`;
        } else {
          html += `<td class="cell-empty"></td>`;
        }
      } else if (newlyMarked.has(key)) {
        html += `<td class="cell-new" title="${escHtml(info.reason)}">✗</td>`;
      } else {
        html += `<td class="cell-marked" title="${escHtml(info.reason)}">✗</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderMyhillResult() {
  const { equivalentPairs, minimizedDFA } = myhillResult;

  // Equiv pairs
  const el = document.getElementById('myhillEquivPairs');
  if (equivalentPairs.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No equivalent pairs — DFA was already minimal!</p>';
  } else {
    const row = document.createElement('div');
    row.className = 'equiv-pairs';
    for (const pair of equivalentPairs) {
      const chip = document.createElement('span');
      chip.className = 'eq-pair-chip';
      chip.textContent = '(' + pair.replace(',', ', ') + ')';
      row.appendChild(chip);
    }
    el.innerHTML = '';
    el.appendChild(row);
  }

  // Minimized DFA visualization
  const vizEl = document.getElementById('myhillMinDfaViz');
  vizEl.innerHTML = '';
  renderDFASimple(vizEl, minimizedDFA);

  // Transition table
  const tableEl = document.getElementById('myhillMinDfaTable');
  tableEl.innerHTML = renderMinDFATable(minimizedDFA);
}

function myhillPrev() { if (myhillStep > 0) { myhillStep--; renderMyhillStep(); } }
function myhillNext() { if (myhillStep < myhillResult.iterations.length - 1) { myhillStep++; renderMyhillStep(); } }
function myhillRunAll() { myhillStep = myhillResult.iterations.length - 1; renderMyhillStep(); }

// ===== COMPARE TAB =====
function refreshCompareTab() {
  if (!currentDFA) {
    document.getElementById('compareNoData').style.display = 'block';
    document.getElementById('compareContent').style.display = 'none';
    return;
  }

  // Always run both methods (they cache themselves)
  if (!partitionResult) partitionResult = partitionRefinement(currentDFA);
  if (!myhillResult) myhillResult = tableFilling(currentDFA);

  document.getElementById('compareNoData').style.display = 'none';
  document.getElementById('compareContent').style.display = 'block';

  const minDFA = partitionResult.minimizedDFA;

  // Stats
  const origStates = currentDFA.states.length;
  const minStates = minDFA.states.length;
  const diff = origStates - minStates;
  const statsEl = document.getElementById('compareStats');
  statsEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-value">${origStates}</span>
      <div class="stat-label">Original States</div>
    </div>
    <div class="stat-card">
      <span class="stat-value">${minStates}</span>
      <div class="stat-label">Minimized States</div>
    </div>
    <div class="stat-card">
      <span class="stat-value">${diff}</span>
      <div class="stat-label">States Saved</div>
      ${diff > 0 ? `<div class="stat-diff">↓ ${Math.round(100*diff/origStates)}% reduction</div>` : ''}
    </div>
    <div class="stat-card">
      <span class="stat-value">${currentDFA.alphabet.length}</span>
      <div class="stat-label">Alphabet Size</div>
    </div>
  `;

  // Visualizations
  const origEl = document.getElementById('compareOrigViz');
  origEl.innerHTML = '';
  renderDFASimple(origEl, currentDFA);

  const minEl = document.getElementById('compareMinViz');
  minEl.innerHTML = '';
  renderDFASimple(minEl, minDFA);

  // Transition tables
  document.getElementById('compareOrigTable').innerHTML = renderMinDFATable(currentDFA);
  document.getElementById('compareMinTable').innerHTML = renderMinDFATable(minDFA);

  // Merge map
  const mergeEl = document.getElementById('mergeMap');
  const map = partitionResult.finalPartitions;
  const merged = map.filter(g => g.length > 1);
  if (merged.length === 0) {
    mergeEl.innerHTML = '<h3>State Merge Map</h3><p style="color:var(--text-muted);font-size:14px;margin-top:8px;">No states were merged — the DFA was already minimal.</p>';
  } else {
    let html = '<h3 style="font-size:15px;margin-bottom:12px;">State Merge Map</h3><div class="merge-rows">';
    for (const group of map) {
      const newName = '{' + [...group].sort().join(',') + '}';
      html += `<div class="merge-row">`;
      html += `<span class="merge-orig">${group.map(s => escHtml(s)).join(' + ')}</span>`;
      html += `<span class="merge-arrow">→</span>`;
      html += `<span class="merge-new">${escHtml(newName)}</span>`;
      if (group.length === 1) {
        html += `<span style="color:var(--text-muted);font-size:11px">(unchanged)</span>`;
      } else {
        html += `<span style="color:var(--text-muted);font-size:11px">(merged, indistinguishable)</span>`;
      }
      html += `</div>`;
    }
    html += '</div>';
    mergeEl.innerHTML = html;
  }
}

// ===== SHARED: Render minimized DFA transition table =====
function renderMinDFATable(dfa) {
  let html = '<table class="min-dfa-trans-table"><thead><tr>';
  html += '<th></th><th>State</th>';
  for (const sym of dfa.alphabet) html += `<th>${escHtml(sym)}</th>`;
  html += '</tr></thead><tbody>';

  for (const state of dfa.states) {
    const isStart = state === dfa.startState;
    const isAccept = dfa.acceptStates.includes(state);
    html += '<tr>';
    html += `<td>${isStart ? '→' : ''}</td>`;
    html += `<td class="state-cell">${escHtml(state)}${isAccept ? ' *' : ''}</td>`;
    for (const sym of dfa.alphabet) {
      const dest = dfa.transitions[state]?.[sym] || '—';
      html += `<td>${escHtml(dest)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  html += '<p style="font-size:11px;color:var(--text-muted);margin-top:6px;">→ start &nbsp; * accept</p>';
  return html;
}
