# DFA Minimization — Interactive Web App

An interactive educational tool for learning **DFA (Deterministic Finite Automaton) Minimization**, built as part of a Theory of Automata, Formal Languages, and Computation (TAFL) project.

## 🌐 Live Demo
Deployment link - https://arngithub407.github.io/DFA-minimizer/
OR 
Open `index.html` directly in any browser — no server or build step needed.

## 📖 Features

- **Theory Section** — Explains what a DFA is, why we minimize, and the core concept of distinguishability
- **DFA Builder** — Interactively define states, alphabet, transitions, and test input strings
- **4 Preset DFAs** — Load ready-made examples to explore right away
- **Method 1: Partition / Equivalence Class Refinement** — Step-by-step partition refinement with visual state groups
- **Method 2: Table Filling (Myhill-Nerode)** — Interactive distinguishability table filled iteratively
- **Side-by-Side Comparison** — Original vs minimized DFA with state reduction stats and merge map
- **Pure SVG visualizations** — Renders DFA graphs in all tabs without any dependencies

## 🧮 Methods Implemented

| Method | Description |
|--------|-------------|
| Partition Refinement | Start with {F, Q\F}, iteratively split groups by transition destinations |
| Table Filling (Myhill-Nerode) | Mark distinguishable pairs, propagate, merge unmarked pairs |

## 📁 File Structure

```
dfa-minimizer/
├── index.html      # Main HTML layout and structure
├── style.css       # All styling (vanilla CSS)
├── dfa.js          # DFA data model, validation, presets
├── partition.js    # Partition refinement algorithm
├── myhill.js       # Table filling (Myhill-Nerode) algorithm
├── visualizer.js   # Pure SVG DFA graph renderer
└── app.js          # UI controller and wiring
```

## 🚀 How to Run

Just open `index.html` in your browser. No installation required.

## 📚 Theory Concepts Covered

- Deterministic Finite Automata (DFA)
- State distinguishability / indistinguishability
- Myhill-Nerode theorem
- Equivalence classes and canonical minimization

---

*TAFL Project — 2026*
