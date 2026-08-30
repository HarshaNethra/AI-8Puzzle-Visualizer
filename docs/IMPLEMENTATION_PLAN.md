# Implementation Plan — Interactive 8-Puzzle UCS Visualizer

**Project:** AI Digital Assignment — Interactive 8-Puzzle Problem Solver  
**Assigned Algorithm:** Uniform Cost Search (UCS)  
**Deployment:** GitHub Pages

---

## Overview

Build the application in 10 phases, in this order. Each phase should be implemented and tested before moving to the next.

The key architectural principle is:

> **Puzzle Engine → UCS → Search Trace → UI → Visualization**

Do not tightly couple the UCS algorithm to the UI. The algorithm should be independently testable and produce a replayable search trace.

---

# Phase 1 — Project Foundation

### Goal
Get the application shell working.

### Tasks

- Create GitHub repository
- Set up HTML/CSS/JavaScript structure
- Add Bootstrap or Tailwind CSS
- Create navigation
- Create pages/sections:
  - Home
  - Solver
  - Comparison
  - Algorithm Info
- Establish basic responsive layout

### Deliverable

An empty but polished application shell with navigation and the major sections in place.

---

# Phase 2 — Puzzle Engine

### Goal
Build the 8-Puzzle functionality independently of UCS.

### Tasks

Implement:

- 3×3 puzzle state representation
- Blank-tile detection
- Valid move generation
- State transitions
- State equality/comparison
- State serialization/hashing
- Initial-state validation
- Goal-state validation
- Solvability checking
- Random solvable puzzle generation

### Deliverable

A reliable puzzle engine that can:

- Represent puzzle states
- Validate states
- Generate valid successors
- Generate solvable random puzzles

---

# Phase 3 — UCS Algorithm

### Goal
Implement the actual AI search algorithm.

### Tasks

Build:

- Search node structure
- Priority queue
- Frontier/Open List
- Explored/Closed Set
- Parent tracking
- Path-cost tracking
- Depth tracking
- Successor generation
- Goal detection
- Solution-path reconstruction
- Nodes-generated counter
- Nodes-expanded counter

### Critical Architecture Rule

Keep UCS completely independent from the UI.

The core algorithm should conceptually behave like:

```text
UCS(initialState, goalState)
        ↓
Search
        ↓
Solution + Search Trace
```

### Deliverable

A correct UCS implementation that can solve valid 8-Puzzle instances and return the solution path and search information.

---

# Phase 4 — Search Trace / Execution Model

### Goal
Make UCS observable instead of only returning the final answer.

### Tasks

Record every meaningful search event, such as:

```text
Node selected
    ↓
Node expanded
    ↓
Successors generated
    ↓
Frontier updated
    ↓
Explored updated
    ↓
Next node selected
```

Create a structured search history/trace containing enough information to replay the algorithm.

The trace should preserve information such as:

- Current node
- Generated successors
- Frontier state
- Explored state
- Current depth
- Parent
- Path cost
- Nodes generated
- Nodes expanded

### Deliverable

UCS can run once and produce a complete, replayable execution history.

---

# Phase 5 — Solver UI

### Goal
Connect the puzzle engine to the user interface.

### Tasks

Implement:

- Initial-state editor
- Goal-state editor
- Random puzzle button
- Puzzle grid
- Goal-state grid
- Current-state display
- Run button
- Reset button
- Validation/error messages

### Deliverable

A user can configure a puzzle, validate it, and start UCS.

---

# Phase 6 — Search Visualization

### Goal
Make the search process visually understandable.

This is one of the most important phases because the assignment specifically requires visualization of the search process.

### Visualize

- Current node
- Generated successor states
- Frontier/Open List
- Explored/Closed List
- Search depth
- Parent
- Path cost
- Nodes generated
- Nodes expanded

### Implement Controls

- Next Step
- Previous Step
- Pause
- Resume
- Speed control

### Deliverable

The user can literally watch UCS explore the state space step-by-step.

---

# Phase 7 — Solution Animation & Statistics

### Goal
Present the final result clearly.

### Tasks

Implement:

- Final solution path
- Blank-tile movement animation
- Step counter
- Solution found/not found
- Total moves
- Nodes generated
- Nodes expanded
- Maximum search depth
- Execution time
- Path cost
- Approximate memory usage

### Deliverable

A complete end-to-end solver experience from puzzle input through search visualization to final solution and statistics.

---

# Phase 8 — Comparison Page

### Goal
Satisfy the assignment's comparison requirement.

Create a comparison table containing:

| Algorithm | Solution | Nodes Expanded | Moves | Time | Memory |
|---|---|---:|---:|---:|---:|
| BFS | — | — | — | — | — |
| DFS | — | — | — | — | — |
| DLS | — | — | — | — | — |
| IDDLS | — | — | — | — | — |
| UCS | — | — | — | — | — |
| GBFS | — | — | — | — | — |
| A* | — | — | — | — | — |

### Important

Do not fabricate results for algorithms that have not actually been implemented.

The assignment document is internally inconsistent: it says the comparison should cover "all six algorithms," while the algorithm list includes seven algorithms when UCS is included. Clarify this with the faculty if necessary rather than silently inventing or omitting data.

### Deliverable

A comparison page that presents legitimate performance results and clearly identifies which algorithms are implemented/available.

---

# Phase 9 — Algorithm Documentation

### Goal
Build the academic explanation section.

### Tasks

For the algorithms specified by the assignment, document:

- Description
- Working principle
- Advantages
- Limitations
- Time complexity
- Space complexity
- Completeness
- Optimality

### Give UCS Extra Detail

Because UCS is the assigned implementation, explain:

- State-space representation
- Frontier/Open List
- Priority queue
- Path cost
- Node expansion
- Successor generation
- Goal testing
- Parent tracking
- Solution reconstruction
- How UCS behaves on the 8-Puzzle

### Deliverable

A clear Algorithm Information page suitable for both learning and faculty evaluation.

---

# Phase 10 — Testing, Polish & Deployment

### Goal
Make the project submission-ready.

## Testing

Test at minimum:

- Already-solved puzzle
- One-move puzzle
- Normal solvable puzzle
- Invalid input
- Unsolvable puzzle
- Random puzzle generation
- Reset during search
- Pause/resume
- Previous/next step
- Large search
- Duplicate states
- Empty frontier / no-solution condition

## UI Polish

Check:

- Responsive layout
- Loading states
- Empty states
- Error handling
- Clear visual hierarchy
- Consistent animations
- Disabled/enabled control states
- No unnecessary UI clutter
- No console errors

## README

Include:

- Project description
- Technologies used
- Search algorithms
- Screenshots
- GitHub Pages URL
- Student details
- References
- How to run the project

## Deployment

- Push project to GitHub
- Enable GitHub Pages
- Test the live URL
- Verify all pages and assets work after deployment
- Record the 3–5 minute demonstration video

### Deliverable

A polished, tested, deployed, and demonstration-ready project.

---

# Recommended Development Order

```text
Phase 1 — Foundation
        ↓
Phase 2 — Puzzle Engine
        ↓
Phase 3 — UCS
        ↓
Phase 4 — Search Trace
        ↓
Phase 5 — Solver UI
        ↓
Phase 6 — Visualization
        ↓
Phase 7 — Results + Animation
        ↓
Phase 8 — Comparison
        ↓
Phase 9 — Documentation
        ↓
Phase 10 — Testing + Deployment
```

---

# Architecture Principle

The application should maintain a clean separation between the algorithm and presentation layer.

```text
┌─────────────────────────────────────┐
│               UI Layer              │
│                                     │
│  Input │ Controls │ Visualization   │
│  Stats │ Pages    │ Animations      │
└──────────────────┬──────────────────┘
                   │
                   ↓
┌─────────────────────────────────────┐
│          Search Controller          │
│                                     │
│  Execution │ Playback │ State Sync  │
└──────────────────┬──────────────────┘
                   │
                   ↓
┌─────────────────────────────────────┐
│             UCS Engine              │
│                                     │
│ Priority Queue │ Frontier           │
│ Explored Set   │ Parent Tracking    │
│ Cost Tracking  │ Node Expansion     │
└──────────────────┬──────────────────┘
                   │
                   ↓
┌─────────────────────────────────────┐
│           Puzzle Engine             │
│                                     │
│ State │ Moves │ Validation          │
│ Successors │ Solvability            │
└─────────────────────────────────────┘
```

---

# Minimum Viable Implementation

If time is limited, prioritize these features first:

1. 8-Puzzle state representation
2. Puzzle validation
3. Solvability checking
4. Random solvable puzzle generation
5. UCS implementation
6. Priority queue
7. Solution reconstruction
8. Search trace
9. Puzzle visualization
10. Frontier/explored visualization
11. Search statistics
12. Step-by-step controls
13. Solution animation
14. GitHub Pages deployment

Then add documentation, comparison, and visual polish.

---

# Final Quality Bar

The application should **not feel like a console-based UCS algorithm wrapped in a webpage**.

The core deliverable is the **visual demonstration of the search process**.

A faculty evaluator should be able to:

1. Open the live application.
2. Enter or generate an 8-Puzzle.
3. Start UCS.
4. Watch nodes being explored.
5. Inspect the frontier and explored set.
6. Pause and resume execution.
7. Step forward and backward.
8. Observe the final solution path.
9. View accurate performance statistics.
10. Read the UCS explanation.
11. View the comparison information.
12. Understand how UCS reached the solution.

The implementation should prioritize **correctness first, observability second, and visual polish third**.
