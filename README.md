# Interactive 8-Puzzle Problem Solver — Uniform Cost Search (UCS)

A state-space search algorithm visualizer and educational problem-solving platform demonstrating how **Uniform Cost Search (UCS)** explores an 8-Puzzle state space to reconstruct the optimal sequence of tile movements.

---

## Student & Course Metadata

* **Student Name:** Harsha Nethra
* **Registration Number:** 24BCT0107
* **Course:** Artificial Intelligence (Sem 5)
* **Assignment Title:** Interactive 8-Puzzle Problem Solver using AI Search Algorithms
* **Assigned Algorithm:** Uniform Cost Search (UCS)
* **Target Deployment:** GitHub Pages

---

## Key Features

1. **Decoupled 8-Puzzle Domain Engine (`js/puzzle.js`):**
   * Immutable 3×3 grid representation with 1D/2D coordinate transformations.
   * Blank tile movement (`UP`, `DOWN`, `LEFT`, `RIGHT`) with boundary checking.
   * Solvability verification via mathematical inversion parity checking ($N=3$).
   * Random solvable puzzle generator using Fisher-Yates shuffling with parity validation.

2. **Core Uniform Cost Search Engine (`js/ucs.js` & `js/priorityQueue.js`):**
   * Binary Min-Heap Priority Queue ordered by cumulative path cost $g(n)$ with deterministic FIFO tie-breaking.
   * Strict UCS compliance: Goal testing occurs upon **node selection/expansion**, not upon node generation, guaranteeing solution optimality.
   * Closed list / Explored set pruning suboptimal duplicate paths.
   * Step-by-step search trace emission for visual playback.

3. **Interactive Solver Studio:**
   * Interactive 3×3 tile inputs for both Initial and Goal states with live validation.
   * Preset puzzle configurations (Easy 1-move, Easy 2-moves, Medium 6-moves, Complex 14-moves, Unsolvable, and Solved).
   * Playback controls: **Run Search**, **Pause**, **Step Forward**, **Step Back**, **Reset**, and variable speed adjustment (50ms to 1200ms).
   * Live Successor States preview and Frontier (Priority Queue) inspector tabs.
   * Real-time KPI dashboard: Nodes Generated, Nodes Expanded, Path Cost $g(n)$, Maximum Search Depth, Execution Time (ms), and Memory footprint estimate.

4. **Academic Comparison & Algorithm Theory:**
   * Live empirical benchmark updating the assigned UCS row directly from puzzle runs.
   * Theoretical comparative matrix across 7 algorithms: BFS, DFS, DLS, IDDLS, UCS, GBFS, and A*.
   * Educational deep dive covering state-space representation, priority queue mechanics, and complexity analysis.

---

## Project Architecture

```
AI-8Puzzle-Visualizer/
│
├── index.html              # Main Single-Page Application interface
│
├── css/
│   └── style.css           # Custom dark theme, 3x3 puzzle boards, and responsive styles
│
├── js/
│   ├── puzzle.js           # Independent 8-puzzle domain engine & solvability logic
│   ├── priorityQueue.js    # Binary Min-Heap Priority Queue data structure
│   ├── ucs.js              # Uniform Cost Search algorithm & trace generator
│   ├── visualizer.js       # DOM rendering engine for boards, metrics, & frontier
│   ├── controller.js       # Playback controller & user event coordinator
│   └── app.js              # SPA router & application lifecycle bootstrap
│
├── tests/
│   ├── test_puzzle.js      # Automated unit tests for PuzzleEngine
│   └── test_ucs.js         # Automated unit tests for PriorityQueue and UCSEngine
│
├── docs/
│   ├── PRD.md              # Product Requirements Document
│   └── IMPLEMENTATION_PLAN.md # 10-phase sequential development plan
│
└── README.md               # Project documentation
```

---

## How to Run the Application

Open `index.html` in any web browser (Google Chrome, Microsoft Edge, Mozilla Firefox).

---

## Automated Testing

Unit test suites verify domain correctness, algorithmic optimality, and trace generation in Node.js:

```bash
# Test 8-puzzle engine, inversions, solvability, and random generation
node tests/test_puzzle.js

# Test Min-Heap priority queue, UCS optimality, and search trace events
node tests/test_ucs.js
```

---

## Theoretical Comparison Matrix

| Algorithm | Category | Frontier Structure | Complete? | Optimal? | Time Complexity | Space Complexity |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **UCS** *(Assigned)* | Uninformed | Min-Priority Queue | **Yes** | **Yes** | $O(b^{1 + \lfloor C^*/\epsilon \rfloor})$ | $O(b^{1 + \lfloor C^*/\epsilon \rfloor})$ |
| **BFS** | Uninformed | FIFO Queue | **Yes** | **Yes** *(unit cost)* | $O(b^d)$ | $O(b^d)$ |
| **DFS** | Uninformed | LIFO Stack | **No** | **No** | $O(b^m)$ | $O(b \cdot m)$ |
| **DLS** | Uninformed | LIFO Stack (cutoff) | **No** *(if $d > l$)* | **No** | $O(b^l)$ | $O(b \cdot l)$ |
| **IDDLS** | Uninformed | LIFO Stack (iterative) | **Yes** | **Yes** *(unit cost)* | $O(b^d)$ | $O(b \cdot d)$ |
| **GBFS** | Informed | Priority Queue ($h(n)$) | **No** | **No** | $O(b^m)$ *(worst-case)* | $O(b^m)$ |
| **A\*** | Informed | Priority Queue ($g+h$) | **Yes** | **Yes** *(admissible)* | $O(b^d)$ *(worst-case)* | $O(b^d)$ |

---

## References

1. Russell, S., & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson.
2. Korf, R. E. (1985). *Depth-first iterative-deepening: An optimal admissible tree search*. Artificial Intelligence, 27(1), 97-109.
3. Johnson, W. W., & Story, W. E. (1879). *Notes on the "15" Puzzle*. American Journal of Mathematics, 2(4), 397-404.
