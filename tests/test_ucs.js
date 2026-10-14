/**
 * test_ucs.js - Automated tests for PriorityQueue and UCS Engine (Phases 3 & 4)
 */

const assert = require('assert');
const PriorityQueue = require('../js/priorityQueue.js');
const PuzzleEngine = require('../js/puzzle.js');
const UCSEngine = require('../js/ucs.js');

console.log('--- Running PriorityQueue & UCS Tests ---');

// --- 1. PriorityQueue Tests ---
console.log('Test 1: PriorityQueue operations');
const pq = new PriorityQueue();
assert.strictEqual(pq.isEmpty(), true);
assert.strictEqual(pq.size(), 0);

pq.enqueue('Task C', 10);
pq.enqueue('Task A', 2);
pq.enqueue('Task B', 5);
pq.enqueue('Task A2', 2); // Same priority as Task A, should dequeue after Task A (FIFO)

assert.strictEqual(pq.isEmpty(), false);
assert.strictEqual(pq.size(), 4);
assert.strictEqual(pq.peek(), 'Task A');
assert.strictEqual(pq.peekPriority(), 2);

assert.strictEqual(pq.dequeue(), 'Task A');
assert.strictEqual(pq.dequeue(), 'Task A2');
assert.strictEqual(pq.dequeue(), 'Task B');
assert.strictEqual(pq.dequeue(), 'Task C');
assert.strictEqual(pq.isEmpty(), true);

// --- 2. UCS: Already solved puzzle ---
console.log('Test 2: UCS with already-solved puzzle');
const solvedState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const resSolved = UCSEngine.solveUCS(solvedState, solvedState);
assert.strictEqual(resSolved.success, true);
assert.strictEqual(resSolved.totalMoves, 0);
assert.strictEqual(resSolved.pathCost, 0);
assert.strictEqual(resSolved.nodesExpanded, 1);
assert.strictEqual(resSolved.solutionPath.length, 1);
assert.deepStrictEqual(resSolved.solutionPath[0].state, solvedState);

// --- 3. UCS: 1-move puzzle ---
console.log('Test 3: UCS with 1-move puzzle');
// Blank at 7, 8 at 8. Goal: blank at 8, 8 at 7.
// Blank moving RIGHT reaches goal.
const oneMoveState = [1, 2, 3, 4, 5, 6, 7, 0, 8];
const resOneMove = UCSEngine.solveUCS(oneMoveState);
assert.strictEqual(resOneMove.success, true);
assert.strictEqual(resOneMove.totalMoves, 1);
assert.strictEqual(resOneMove.pathCost, 1);
assert.strictEqual(resOneMove.solutionPath.length, 2);
assert.strictEqual(resOneMove.solutionPath[1].action, 'RIGHT');
assert.strictEqual(resOneMove.solutionPath[1].tileMoved, 8);
assert.deepStrictEqual(resOneMove.solutionPath[1].state, solvedState);

// --- 4. UCS: 2-move puzzle ---
console.log('Test 4: UCS with 2-move puzzle');
// Blank at 6. Moves: RIGHT -> blank at 7, RIGHT -> blank at 8 (goal).
const twoMoveState = [1, 2, 3, 4, 5, 6, 0, 7, 8];
const resTwoMove = UCSEngine.solveUCS(twoMoveState);
assert.strictEqual(resTwoMove.success, true);
assert.strictEqual(resTwoMove.totalMoves, 2);
assert.strictEqual(resTwoMove.pathCost, 2);
assert.strictEqual(resTwoMove.solutionPath.length, 3);
assert.deepStrictEqual(resTwoMove.solutionPath[2].state, solvedState);

// Validate transitions along solution path
for (let i = 0; i < resTwoMove.solutionPath.length - 1; i++) {
    const from = resTwoMove.solutionPath[i];
    const to = resTwoMove.solutionPath[i + 1];
    const applied = PuzzleEngine.applyMove(from.state, to.action);
    assert.deepStrictEqual(applied.newState, to.state);
    assert.strictEqual(applied.tileMoved, to.tileMoved);
}

// --- 5. UCS: Moderate puzzle (6 moves) ---
console.log('Test 5: UCS with moderate depth puzzle (6 moves)');
// Initial: [1, 2, 3, 0, 4, 6, 7, 5, 8]
const testState = [1, 2, 3, 0, 4, 6, 7, 5, 8];
const resTest = UCSEngine.solveUCS(testState);
assert.strictEqual(resTest.success, true);
assert(resTest.totalMoves > 0, 'Moves should be > 0');
assert.strictEqual(resTest.pathCost, resTest.totalMoves);
assert.deepStrictEqual(resTest.solutionPath[resTest.solutionPath.length - 1].state, solvedState);
assert(resTest.nodesExpanded > 0);
assert(resTest.nodesGenerated > 0);
assert(resTest.trace.length > 0, 'Trace should be populated');

// --- 6. UCS: Unsolvable puzzle ---
console.log('Test 6: UCS with mathematically unsolvable puzzle');
const unsolvable = [2, 1, 3, 4, 5, 6, 7, 8, 0];
const resUnsolvable = UCSEngine.solveUCS(unsolvable);
assert.strictEqual(resUnsolvable.success, false);
assert(resUnsolvable.error.includes('unsolvable'));

// --- 7. UCS: Invalid inputs ---
console.log('Test 7: UCS with invalid inputs');
const resInvalid = UCSEngine.solveUCS([1, 2, 3]);
assert.strictEqual(resInvalid.success, false);
assert(resInvalid.error.includes('Invalid initial state'));

// --- 8. UCS: Search Trace Verification ---
console.log('Test 8: Search Trace events inspection');
const trace = resTwoMove.trace;
assert(trace.some(t => t.type === 'INIT'), 'Must have INIT trace event');
assert(trace.some(t => t.type === 'SELECT_NODE'), 'Must have SELECT_NODE event');
assert(trace.some(t => t.type === 'EXPAND_NODE'), 'Must have EXPAND_NODE event');
assert(trace.some(t => t.type === 'GOAL_FOUND'), 'Must have GOAL_FOUND event');

console.log('All PriorityQueue & UCSEngine tests PASSED successfully!');
