**Product Requirements Document (PRD)**

**Interactive 8-Puzzle Problem Solver — Uniform Cost Search**

**Version:** 1.0  
**Project Type:** Academic AI Digital Assignment  
**Target:** Web application deployed through GitHub Pages  
**Primary Algorithm:** Uniform Cost Search (UCS)

**1\. Product Overview**

The project is an **interactive web-based 8-Puzzle solver** designed to demonstrate how a state-space search algorithm solves the 8-Puzzle problem.

The application will allow a user to provide an initial and goal puzzle state, execute **Uniform Cost Search (UCS)**, and visually observe how the algorithm explores states until it finds the goal.

The system must go beyond simply displaying the final answer. Its primary purpose is to **make the search process observable and understandable**, including the frontier, explored states, node expansion, path cost, search depth, and final solution.

The assignment requires HTML5, CSS3, JavaScript ES6, and one UI framework such as Bootstrap or Tailwind CSS.

**2\. Problem Statement**

The 8-Puzzle is a state-space search problem consisting of eight numbered tiles and one blank space arranged in a 3×3 grid.

Given an **initial state** and a **goal state**, the system must find a sequence of valid tile movements that transforms the initial state into the goal state.

The project should demonstrate how **Uniform Cost Search** systematically explores the state space and selects nodes based on accumulated path cost.

The assignment specifically requires students to implement the algorithm assigned to them.

**3\. Product Goals**

**Primary Goals**

1. **Correctly implement Uniform Cost Search**
   - Implement UCS in JavaScript.
   - Correctly maintain the frontier/open list.
   - Select the lowest-cost node for expansion.
   - Track parent relationships.
   - Reconstruct the solution path.
2. **Make the algorithm visually understandable**
   - Show the current state.
   - Show generated successors.
   - Show frontier/open list.
   - Show explored/closed states.
   - Animate the solution path.
3. **Provide meaningful search statistics**
   - Nodes generated
   - Nodes expanded
   - Search depth
   - Path cost
   - Execution time
   - Approximate memory usage
   - Solution status.
4. **Provide an interactive learning experience**
   - Run
   - Pause
   - Resume
   - Next Step
   - Previous Step
   - Reset
   - Change animation speed.
5. **Produce a submission-ready academic project**
   - Clean GitHub repository
   - README
   - GitHub Pages deployment
   - Demonstration-ready interface
   - Algorithm documentation.

**4\. Target Users**

**Primary User — Student**

A student studying Artificial Intelligence should be able to use the application to understand:

- State-space representation
- Uniform Cost Search
- Node expansion
- Frontier management
- Path cost
- Search depth
- Solution reconstruction.

**Secondary User — Faculty/Evaluator**

A faculty member should be able to quickly verify:

- The puzzle works correctly.
- UCS is implemented correctly.
- The search process is actually visualized.
- Statistics are being calculated.
- The UI is usable.
- The project is deployed and demonstrable.

**5\. Core User Journey**

Open Application

↓

View Introduction

↓

Enter Initial + Goal State

OR

Generate Random Solvable Puzzle

↓

Validate Puzzle

↓

Select Uniform Cost Search

↓

Configure / Start Search

↓

UCS Begins

↓

Display Search Process

↓

Expand Node

↓

Generate Successors

↓

Update Frontier + Explored

↓

Select Lowest-Cost Node

↓

Repeat

↓

Goal Found / No Solution

↓

Display Solution Path

↓

Display Performance Statistics

The required input options and visualization flow are specified by the assignment.

**6\. Functional Requirements**

**FR-01 — Home Page**

The home page must display:

- Course name
- Assignment title
- Student name
- Registration number
- Introduction to the 8-Puzzle
- Navigation menu.

**Acceptance Criteria**

- User can understand the purpose of the application without external explanation.
- Navigation to all major sections is available.

**FR-02 — Puzzle Input**

The application must support two input methods.

**Method A — Manual Input**

User can enter:

- Initial state
- Goal state

The UI should represent the blank tile clearly.

**Method B — Random Puzzle**

A **Generate Random Puzzle** button must create a random **solvable** puzzle.

**Acceptance Criteria**

- Every generated puzzle is solvable.
- Invalid manually entered states are rejected.
- Duplicate tiles are rejected.
- Exactly one blank tile must exist.
- Both states must contain the same set of tiles.

**7\. FR-03 — Algorithm Selection**

The assignment's UI specification lists:

- BFS
- DFS
- DLS
- IDDLS
- GBFS
- A\*

However, the document separately lists **Uniform Cost Search as algorithm #5** and assigns each student one algorithm.

**Project Scope**

For this implementation:

**Uniform Cost Search is the student's assigned algorithm and is the algorithm that must be implemented.**

The application architecture should nevertheless keep the search engine modular enough that additional algorithms could be added later.

**8\. FR-04 — Uniform Cost Search Engine**

The UCS engine must:

1. Represent each puzzle configuration as a search state.
2. Generate valid successor states by moving the blank tile.
3. Assign a path cost to each transition.
4. Maintain the frontier ordered by cumulative path cost.
5. Select the lowest-cost node for expansion.
6. Track explored states.
7. Track parent nodes.
8. Continue until:
   - Goal is found, or
   - No nodes remain in the frontier.
9. Reconstruct the solution path when the goal is reached.

**Important Design Requirement**

The **algorithm logic must be separated from the UI**.

Recommended architecture:

UI

│

├── Puzzle Input

├── Visualization

├── Controls

└── Statistics

│

↓

Search Controller

│

↓

UCS Engine

│

├── Frontier / Priority Queue

├── Explored Set

├── State Generator

└── Parent Tracking

This makes the algorithm testable independently of the visual interface.

**9\. FR-05 — Puzzle Visualization**

The application must display:

- Initial state
- Goal state
- Current state
- Generated successor states
- Final solution path.

The solution path must animate the blank tile moving between states.

**Visualization States**

Each search step should make it clear:

Current Node

↓

Generate Successors

↓

Successor States

↓

Frontier Updated

↓

Explored Updated

↓

Next Node Selected

**10\. FR-06 — Search Process Visualization**

During execution, display:

| **Information**        | **Required** |
| ---------------------- | ------------ |
| Current node           | Yes          |
| Nodes generated        | Yes          |
| Nodes expanded         | Yes          |
| Frontier / Open List   | Yes          |
| Explored / Closed List | Yes          |
| Current depth          | Yes          |
| Parent node            | Yes          |
| Path cost              | Yes          |

These requirements come directly from the assignment specification.

**UCS-Specific Information**

The UI should prominently show:

Current Node

Cost g(n)

Depth

Parent

Frontier Position

Unlike GBFS/A\*, **heuristic values are not required for UCS**.

**11\. FR-07 — Interactive Controls**

The application must provide:

- **Run**
- **Pause**
- **Resume**
- **Next Step**
- **Previous Step**
- **Reset**
- **Change Speed**.

**Control Behavior**

**Run**

- Starts the search.

**Pause**

- Freezes the current visualization state.

**Resume**

- Continues execution.

**Next Step**

- Executes/displays one search step.

**Previous Step**

- Moves visualization backward through recorded search states.

**Reset**

- Returns to the initial configuration.

**Change Speed**

- Adjusts animation/search playback speed.

**12\. FR-08 — Solution Summary**

After execution, display:

Solution Found: Yes/No

Total Moves: X

Nodes Generated: X

Nodes Expanded: X

Maximum Search Depth: X

Execution Time: X ms

Path Cost: X

Approximate Memory Usage: X

These metrics are explicitly required by the assignment.

**13\. FR-09 — Comparison Page**

The assignment requires a comparison table showing algorithm performance on the **same puzzle instance**.

The table should contain:

| **Algorithm** | **Solution** | **Nodes Expanded** | **Moves** | **Time** | **Memory** |
| ------------- | ------------ | ------------------ | --------- | -------- | ---------- |
| BFS           | —            | —                  | —         | —        | —          |
| DFS           | —            | —                  | —         | —        | —          |
| DLS           | —            | —                  | —         | —        | —          |
| IDDLS         | —            | —                  | —         | —        | —          |
| UCS           | —            | —                  | —         | —        | —          |
| GBFS          | —            | —                  | —         | —        | —          |
| A\*           | —            | —                  | —         | —        | —          |

**Important:** the source document says "all six algorithms" on the comparison page, but its algorithm list contains **seven algorithms including UCS**. This is an inconsistency in the assignment document and should be clarified with faculty rather than silently deciding which one to omit.

**14\. FR-10 — Algorithm Information Page**

Provide educational information for the algorithms specified by the assignment:

- Description
- Working principle
- Advantages
- Limitations
- Time complexity
- Space complexity
- Completeness
- Optimality.

UCS should receive the most detailed treatment because it is the implemented algorithm.

**15\. Non-Functional Requirements**

**Performance**

- Search should execute entirely in the browser.
- UI should remain responsive during visualization.
- Search execution and animation should be decoupled so visualization does not corrupt algorithm execution.

**Usability**

- Puzzle states must be visually obvious.
- Current node must be clearly distinguishable.
- Frontier and explored states must be easy to inspect.
- Controls should have obvious enabled/disabled states.

**Responsiveness**

The application should work on:

- Desktop
- Laptop
- Tablet/mobile-sized screens.

**Reliability**

The application must gracefully handle:

- Invalid puzzle input
- Unsolvable puzzles
- Duplicate states
- Very large search spaces
- Search reset while running
- Pause/resume
- Empty frontier.

**16\. Data Model**

A search node should conceptually contain:

SearchNode

├── state

├── parent

├── action

├── depth

├── pathCost

└── metadata

A search execution should maintain:

SearchExecution

├── initialState

├── goalState

├── frontier

├── explored

├── currentNode

├── generatedCount

├── expandedCount

├── maxDepth

├── executionTime

├── solutionPath

└── visualizationHistory

**17\. Recommended Project Structure**

AI-8Puzzle-Visualizer/

│

├── index.html

│

├── css/

│ ├── style.css

│ └── responsive.css

│

├── js/

│ ├── app.js

│ ├── puzzle.js

│ ├── ucs.js

│ ├── priorityQueue.js

│ ├── visualizer.js

│ ├── controller.js

│ └── statistics.js

│

├── images/

│

├── docs/

│

└── README.md

This follows the repository organization suggested in the assignment.

**18\. Out of Scope**

For the student's UCS implementation, the following are **not core implementation requirements**:

- Backend/server
- Database
- User authentication
- Cloud infrastructure
- Machine learning
- AI API integration
- LLM integration
- Persistent user accounts
- Real-time multiplayer
- Mobile native application.

The project is fundamentally a client-side educational visualization application.

**19\. Success Criteria**

The project is successful when a faculty evaluator can:

1. Open the GitHub Pages URL.
2. Enter or generate an 8-Puzzle.
3. Start UCS.
4. Watch the search process.
5. Inspect frontier and explored nodes.
6. Pause/resume execution.
7. Step through the search.
8. See the final solution path.
9. View accurate performance statistics.
10. Read UCS documentation.
11. View the algorithm comparison.
12. Understand how UCS reached the solution.

The assignment also requires successful GitHub Pages deployment and a 3–5 minute demonstration covering algorithms, puzzle solving, comparison, heuristics, and overall features.

**20\. MVP vs Final Scope**

**Absolute MVP**

- 8-Puzzle input
- Random solvable puzzle
- UCS implementation
- Priority queue
- Solution generation
- Puzzle visualization
- Basic statistics
- GitHub Pages deployment

**Assignment-Complete**

Everything in MVP **plus**:

- Search-process visualization
- Frontier/explored display
- Step-by-step execution
- Pause/resume
- Previous/next step
- Speed control
- Comparison page
- Algorithm information page
- Responsive UI
- Proper README
- Demonstration-ready UX

**Quality Bar**

The application should **not feel like a console-based UCS algorithm wrapped in a webpage**. The core deliverable is the **visual demonstration of the search process**, not merely obtaining the correct solution.

The assignment's rubric gives **2 marks specifically to interactive visualization**, alongside marks for algorithm correctness, UI, statistics/documentation, repository quality, and deployment.