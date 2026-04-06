// partition.js — Equivalence / Partition Refinement Method

/**
 * Returns an array of "steps", each step being:
 * {
 *   iteration: number,
 *   partitions: [[state,...], ...],
 *   description: string
 * }
 * Final step has converged === true.
 */
function partitionRefinement(dfa) {
  const steps = [];

  // Remove unreachable states first
  const reachable = getReachableStates(dfa);
  const states = dfa.states.filter(s => reachable.has(s));

  const accept = new Set(dfa.acceptStates.filter(s => reachable.has(s)));
  const nonAccept = states.filter(s => !accept.has(s));

  let partitions = [];
  if (nonAccept.length > 0) partitions.push(nonAccept);
  if (accept.size > 0) partitions.push([...accept]);

  steps.push({
    iteration: 0,
    partitions: partitions.map(p => [...p]),
    description: "Initial partition: separate accepting states from non-accepting states.",
    converged: false
  });

  // Map state -> partition index
  function getGroup(state, parts) {
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes(state)) return i;
    }
    return -1;
  }

  let iteration = 1;
  while (true) {
    const newPartitions = [];
    let refined = false;

    for (const group of partitions) {
      if (group.length === 1) {
        newPartitions.push(group);
        continue;
      }

      // Try to split this group
      // Two states are equivalent if for every symbol, they go to the same group
      const signature = (state) => {
        return dfa.alphabet.map(sym => {
          const dest = dfa.transitions[state]?.[sym];
          return dest ? getGroup(dest, partitions) : -1;
        }).join(',');
      };

      const sigMap = {};
      for (const state of group) {
        const sig = signature(state);
        if (!sigMap[sig]) sigMap[sig] = [];
        sigMap[sig].push(state);
      }

      const sub = Object.values(sigMap);
      if (sub.length > 1) refined = true;
      for (const s of sub) newPartitions.push(s);
    }

    const allSigs = partitions.flatMap(g => g.map(s =>
      dfa.alphabet.map(sym => {
        const dest = dfa.transitions[s]?.[sym];
        return dest ? getGroup(dest, partitions) : -1;
      }).join(',')
    )).join('|');

    steps.push({
      iteration,
      partitions: newPartitions.map(p => [...p]),
      description: refined
        ? `Iteration ${iteration}: Partition refined — some states were split based on transition destinations.`
        : `Iteration ${iteration}: No further refinement possible. Partition has stabilized.`,
      converged: !refined
    });

    partitions = newPartitions;
    if (!refined) break;
    iteration++;
    if (iteration > 100) break; // safety
  }

  // Build minimized DFA from final partition
  const minDFA = buildMinimizedDFA(dfa, partitions);
  return { steps, minimizedDFA: minDFA, finalPartitions: partitions };
}

function getReachableStates(dfa) {
  const reachable = new Set([dfa.startState]);
  const queue = [dfa.startState];
  while (queue.length) {
    const state = queue.shift();
    for (const sym of dfa.alphabet) {
      const dest = dfa.transitions[state]?.[sym];
      if (dest && !reachable.has(dest)) {
        reachable.add(dest);
        queue.push(dest);
      }
    }
  }
  return reachable;
}

function buildMinimizedDFA(dfa, partitions) {
  // Name each minimized state after its members
  const stateNames = partitions.map((group, i) => {
    const sorted = [...group].sort();
    return '{' + sorted.join(',') + '}';
  });

  function findGroup(state) {
    return partitions.findIndex(g => g.includes(state));
  }

  const startGroup = findGroup(dfa.startState);
  const minStartState = stateNames[startGroup];

  const minAccept = [];
  for (let i = 0; i < partitions.length; i++) {
    if (partitions[i].some(s => dfa.acceptStates.includes(s))) {
      minAccept.push(stateNames[i]);
    }
  }

  const minTransitions = {};
  for (let i = 0; i < partitions.length; i++) {
    const rep = partitions[i][0]; // representative
    const name = stateNames[i];
    minTransitions[name] = {};
    for (const sym of dfa.alphabet) {
      const dest = dfa.transitions[rep]?.[sym];
      if (dest !== undefined) {
        const destGroup = findGroup(dest);
        minTransitions[name][sym] = stateNames[destGroup];
      }
    }
  }

  return {
    states: stateNames,
    alphabet: dfa.alphabet,
    transitions: minTransitions,
    startState: minStartState,
    acceptStates: minAccept,
    partitionMap: partitions.map((g, i) => ({ group: stateNames[i], members: g }))
  };
}
