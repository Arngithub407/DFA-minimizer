// myhill.js — Table Filling Method (Myhill-Nerode)

/**
 * Returns:
 * {
 *   table: { 'qi,qj': { marked: bool, markedAt: iteration, reason: string } },
 *   iterations: [ { pairs: ['qi,qj',...], markedThisRound: ['qi,qj',...], description } ],
 *   equivalentPairs: ['qi,qj',...],
 *   minimizedDFA: { ... }
 * }
 */
function tableFilling(dfa) {
  // Remove unreachable states
  const reachable = getReachableStates(dfa);
  const states = dfa.states.filter(s => reachable.has(s));
  const n = states.length;

  // All pairs (i < j)
  const pairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push([states[i], states[j]]);
    }
  }

  const key = (a, b) => {
    const [x, y] = [a, b].sort();
    return x + ',' + y;
  };

  // Table: key -> { marked, markedAt, reason }
  const table = {};
  for (const [a, b] of pairs) {
    table[key(a, b)] = { marked: false, markedAt: null, reason: '' };
  }

  const iterations = [];

  // Step 0: Mark pairs where one is accepting and one is not
  const markedStep0 = [];
  for (const [a, b] of pairs) {
    const aAccept = dfa.acceptStates.includes(a);
    const bAccept = dfa.acceptStates.includes(b);
    if (aAccept !== bAccept) {
      const k = key(a, b);
      table[k].marked = true;
      table[k].markedAt = 0;
      table[k].reason = `One is accepting, the other is not.`;
      markedStep0.push(k);
    }
  }

  iterations.push({
    iteration: 0,
    markedThisRound: markedStep0,
    description: "Base case: Mark all pairs (p, q) where exactly one of p, q is an accepting state — they are clearly distinguishable.",
    tableSnapshot: snapshotTable(table, pairs, key)
  });

  // Iterative marking
  let round = 1;
  while (true) {
    const markedThisRound = [];
    for (const [a, b] of pairs) {
      const k = key(a, b);
      if (table[k].marked) continue;

      // Check if for some symbol, the pair of destinations is already marked
      for (const sym of dfa.alphabet) {
        const da = dfa.transitions[a]?.[sym];
        const db = dfa.transitions[b]?.[sym];
        if (da && db && da !== db) {
          const destKey = key(da, db);
          if (table[destKey]?.marked) {
            table[k].marked = true;
            table[k].markedAt = round;
            table[k].reason = `δ(${a},${sym})=${da}, δ(${b},${sym})=${db} — pair (${da},${db}) is already marked.`;
            markedThisRound.push(k);
            break;
          }
        }
      }
    }

    iterations.push({
      iteration: round,
      markedThisRound: [...markedThisRound],
      description: markedThisRound.length > 0
        ? `Round ${round}: Marked ${markedThisRound.length} new pair(s) by propagation — their transitions lead to already-distinguishable pairs.`
        : `Round ${round}: No new pairs were marked. Algorithm terminates.`,
      tableSnapshot: snapshotTable(table, pairs, key),
      converged: markedThisRound.length === 0
    });

    if (markedThisRound.length === 0) break;
    round++;
    if (round > 100) break;
  }

  // Unmarked pairs = equivalent (indistinguishable)
  const equivalentPairs = pairs
    .filter(([a, b]) => !table[key(a, b)].marked)
    .map(([a, b]) => key(a, b));

  // Build equivalence classes (union-find style)
  const minDFA = buildMinFromEquivalentPairs(dfa, states, equivalentPairs, pairs);

  return {
    table,
    pairs: pairs.map(([a, b]) => key(a, b)),
    iterations,
    equivalentPairs,
    minimizedDFA: minDFA
  };
}

function snapshotTable(table, pairs, key) {
  const snap = {};
  for (const [a, b] of pairs) {
    const k = key(a, b);
    snap[k] = { ...table[k] };
  }
  return snap;
}

function buildMinFromEquivalentPairs(dfa, states, equivalentPairs, pairs) {
  // Union-Find
  const parent = {};
  for (const s of states) parent[s] = s;

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x, y) {
    const px = find(x), py = find(y);
    if (px !== py) parent[px] = py;
  }

  for (const eqKey of equivalentPairs) {
    const [a, b] = eqKey.split(',');
    union(a, b);
  }

  // Group states by root
  const groups = {};
  for (const s of states) {
    const root = find(s);
    if (!groups[root]) groups[root] = [];
    groups[root].push(s);
  }

  const groupList = Object.values(groups);
  const stateNames = groupList.map(g => '{' + [...g].sort().join(',') + '}');

  function findGroupIdx(state) {
    return groupList.findIndex(g => g.includes(find(state)));
  }

  const minStart = stateNames[findGroupIdx(dfa.startState)];
  const minAccept = [];

  for (let i = 0; i < groupList.length; i++) {
    if (groupList[i].some(s => dfa.acceptStates.includes(s))) {
      minAccept.push(stateNames[i]);
    }
  }

  const minTransitions = {};
  for (let i = 0; i < groupList.length; i++) {
    const rep = groupList[i][0];
    minTransitions[stateNames[i]] = {};
    for (const sym of dfa.alphabet) {
      const dest = dfa.transitions[rep]?.[sym];
      if (dest !== undefined) {
        const destIdx = findGroupIdx(dest);
        minTransitions[stateNames[i]][sym] = stateNames[destIdx];
      }
    }
  }

  return {
    states: stateNames,
    alphabet: dfa.alphabet,
    transitions: minTransitions,
    startState: minStart,
    acceptStates: minAccept,
    groupMap: groupList.map((g, i) => ({ group: stateNames[i], members: g }))
  };
}
