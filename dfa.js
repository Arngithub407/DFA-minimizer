// dfa.js — DFA data model and utilities

/**
 * A DFA is represented as:
 * {
 *   states: ['q0','q1',...],
 *   alphabet: ['a','b'],
 *   transitions: { q0: { a: 'q1', b: 'q0' }, ... },
 *   startState: 'q0',
 *   acceptStates: ['q1']
 * }
 */

function createDFA(states, alphabet, transitions, startState, acceptStates) {
  return { states, alphabet, transitions, startState, acceptStates };
}

function dfaRun(dfa, input) {
  let current = dfa.startState;
  for (const ch of input) {
    if (!dfa.alphabet.includes(ch)) return null;
    current = dfa.transitions[current]?.[ch];
    if (current === undefined || current === null) return null;
  }
  return dfa.acceptStates.includes(current);
}

function validateDFA(dfa) {
  const errors = [];
  if (!dfa.states || dfa.states.length === 0) errors.push("No states defined.");
  if (!dfa.alphabet || dfa.alphabet.length === 0) errors.push("No alphabet defined.");
  if (!dfa.startState) errors.push("No start state defined.");
  if (!dfa.states.includes(dfa.startState)) errors.push("Start state not in states.");
  for (const acc of (dfa.acceptStates || [])) {
    if (!dfa.states.includes(acc)) errors.push(`Accept state '${acc}' not in states.`);
  }
  for (const st of dfa.states) {
    for (const sym of dfa.alphabet) {
      const dest = dfa.transitions[st]?.[sym];
      if (!dest) {
        errors.push(`Missing transition: δ(${st}, ${sym})`);
      } else if (!dfa.states.includes(dest)) {
        errors.push(`Transition δ(${st}, ${sym}) → '${dest}' not in states.`);
      }
    }
  }
  return errors;
}

// Preset DFAs
const PRESETS = {
  "Ends with 'ab' (over {a,b})": createDFA(
    ['q0','q1','q2','q3','q4'],
    ['a','b'],
    {
      q0: {a:'q1', b:'q0'},
      q1: {a:'q1', b:'q2'},
      q2: {a:'q3', b:'q0'},
      q3: {a:'q3', b:'q4'},
      q4: {a:'q3', b:'q0'},
    },
    'q0', ['q2','q4']
  ),
  "Even number of a's (over {a,b})": createDFA(
    ['q0','q1','q2','q3'],
    ['a','b'],
    {
      q0: {a:'q1', b:'q0'},
      q1: {a:'q0', b:'q1'},
      q2: {a:'q3', b:'q2'},
      q3: {a:'q2', b:'q3'},
    },
    'q0', ['q0','q2']
  ),
  "Binary divisible by 3": createDFA(
    ['q0','q1','q2'],
    ['0','1'],
    {
      q0: {'0':'q0','1':'q1'},
      q1: {'0':'q2','1':'q0'},
      q2: {'0':'q1','1':'q2'},
    },
    'q0', ['q0']
  ),
  "Strings over {a,b} not containing 'aa'": createDFA(
    ['q0','q1','q2','q3'],
    ['a','b'],
    {
      q0: {a:'q1', b:'q0'},
      q1: {a:'q3', b:'q2'},
      q2: {a:'q1', b:'q0'},
      q3: {a:'q3', b:'q3'},
    },
    'q0', ['q0','q1','q2']
  ),
};
