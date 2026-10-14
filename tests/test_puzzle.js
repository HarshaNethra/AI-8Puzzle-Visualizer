/**
 * test_puzzle.js - Automated tests for Phase 2 Puzzle Engine
 */

const assert = require('assert');
const PuzzleEngine = require('../js/puzzle.js');

console.log('--- Running PuzzleEngine Tests ---');

// 1. Validation Tests
console.log('Test 1: State validation');
assert.strictEqual(PuzzleEngine.validateState([1, 2, 3, 4, 5, 6, 7, 8, 0]).isValid, true);
assert.strictEqual(PuzzleEngine.validateState([1, 2, 3, 4, 5, 6, 7, 8]).isValid, false, 'Should fail length != 9');
assert.strictEqual(PuzzleEngine.validateState([1, 2, 3, 4, 5, 6, 7, 8, 8]).isValid, false, 'Should fail duplicate tile');
assert.strictEqual(PuzzleEngine.validateState([1, 2, 3, 4, 5, 6, 7, 8, 9]).isValid, false, 'Should fail tile > 8');
assert.strictEqual(PuzzleEngine.validateState([1, 2, 3, 4, 5, 6, 7, 8, -1]).isValid, false, 'Should fail tile < 0');
assert.strictEqual(PuzzleEngine.validateState([1, 2, 3, 4, 5, 6, 7, 8, 1.5]).isValid, false, 'Should fail non-integer');
assert.strictEqual(PuzzleEngine.validateState('not an array').isValid, false, 'Should fail non-array');

// 2. Blank detection & Coordinate mapping
console.log('Test 2: Blank detection & coordinates');
assert.strictEqual(PuzzleEngine.findBlank([1, 2, 3, 4, 0, 5, 6, 7, 8]), 4);
assert.strictEqual(PuzzleEngine.findBlank([0, 1, 2, 3, 4, 5, 6, 7, 8]), 0);
assert.strictEqual(PuzzleEngine.findBlank([1, 2, 3, 4, 5, 6, 7, 8, 0]), 8);

const centerCoords = PuzzleEngine.indexToCoords(4);
assert.deepStrictEqual(centerCoords, { row: 1, col: 1 });
assert.strictEqual(PuzzleEngine.coordsToIndex(1, 1), 4);
assert.strictEqual(PuzzleEngine.coordsToIndex(0, 0), 0);
assert.strictEqual(PuzzleEngine.coordsToIndex(2, 2), 8);

// 3. Valid Moves
console.log('Test 3: Valid moves per board position');
// Corner: index 0 (top-left) -> only DOWN, RIGHT
const cornerMoves = PuzzleEngine.getValidMoves(0);
assert.deepStrictEqual(cornerMoves.sort(), ['DOWN', 'RIGHT']);

// Center: index 4 -> UP, DOWN, LEFT, RIGHT
const centerMoves = PuzzleEngine.getValidMoves(4);
assert.deepStrictEqual(centerMoves.sort(), ['DOWN', 'LEFT', 'RIGHT', 'UP']);

// Edge: index 1 (top-middle) -> DOWN, LEFT, RIGHT
const edgeMoves = PuzzleEngine.getValidMoves(1);
assert.deepStrictEqual(edgeMoves.sort(), ['DOWN', 'LEFT', 'RIGHT']);

// Bottom-right: index 8 -> UP, LEFT
const brMoves = PuzzleEngine.getValidMoves(8);
assert.deepStrictEqual(brMoves.sort(), ['LEFT', 'UP']);

// 4. Applying moves & immutability
console.log('Test 4: Apply moves & immutability');
const startState = [1, 2, 3, 4, 0, 5, 6, 7, 8]; // blank at 4
const originalCopy = [...startState];

const movedUp = PuzzleEngine.applyMove(startState, 'UP');
// Blank (4) moves UP -> swaps with tile at index 1 (value 2)
assert.deepStrictEqual(movedUp.newState, [1, 0, 3, 4, 2, 5, 6, 7, 8]);
assert.strictEqual(movedUp.tileMoved, 2);
assert.strictEqual(movedUp.action, 'UP');
assert.strictEqual(movedUp.cost, 1);
assert.deepStrictEqual(startState, originalCopy, 'applyMove must be immutable');

// Invalid move boundary check (cannot move UP when blank is at row 0)
const topState = [0, 1, 2, 3, 4, 5, 6, 7, 8];
assert.strictEqual(PuzzleEngine.applyMove(topState, 'UP'), null);

// 5. Successor Generation
console.log('Test 5: Successors generation');
const successorsFromCenter = PuzzleEngine.getSuccessors(startState);
assert.strictEqual(successorsFromCenter.length, 4);
const actions = successorsFromCenter.map(s => s.action).sort();
assert.deepStrictEqual(actions, ['DOWN', 'LEFT', 'RIGHT', 'UP']);

// 6. Serialization / Deserialization & Equality
console.log('Test 6: Serialization, deserialization, and equality');
const ser = PuzzleEngine.serializeState([1, 2, 3, 4, 5, 6, 7, 8, 0]);
assert.strictEqual(ser, '1,2,3,4,5,6,7,8,0');
const deser = PuzzleEngine.deserializeState(ser);
assert.deepStrictEqual(deser, [1, 2, 3, 4, 5, 6, 7, 8, 0]);
assert.strictEqual(PuzzleEngine.areStatesEqual(startState, [1, 2, 3, 4, 0, 5, 6, 7, 8]), true);
assert.strictEqual(PuzzleEngine.areStatesEqual(startState, deser), false);

// 7. Inversion count & Solvability
console.log('Test 7: Inversions and Solvability');
// Goal: 1, 2, 3, 4, 5, 6, 7, 8, 0 -> 0 inversions (even)
assert.strictEqual(PuzzleEngine.countInversions([1, 2, 3, 4, 5, 6, 7, 8, 0]), 0);
assert.strictEqual(PuzzleEngine.isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 0]), true);

// Known solvable state (e.g. 1 move away): blank swapped with 8
// State: [1, 2, 3, 4, 5, 6, 7, 0, 8] -> 0 inversions -> solvable
assert.strictEqual(PuzzleEngine.isSolvable([1, 2, 3, 4, 5, 6, 7, 0, 8]), true);

// Classic impossible state: 1 swap between tiles 1 and 2
// [2, 1, 3, 4, 5, 6, 7, 8, 0] -> 1 inversion (odd) -> unsolvable
assert.strictEqual(PuzzleEngine.countInversions([2, 1, 3, 4, 5, 6, 7, 8, 0]), 1);
assert.strictEqual(PuzzleEngine.isSolvable([2, 1, 3, 4, 5, 6, 7, 8, 0]), false);

// Another unsolvable state: 7 and 8 swapped
// [1, 2, 3, 4, 5, 6, 8, 7, 0] -> 1 inversion -> unsolvable
assert.strictEqual(PuzzleEngine.isSolvable([1, 2, 3, 4, 5, 6, 8, 7, 0]), false);

// 8. Random solvable generation
console.log('Test 8: Random solvable puzzle generator (50 samples)');
for (let i = 0; i < 50; i++) {
    const randomPuzzle = PuzzleEngine.generateRandomSolvableState();
    const val = PuzzleEngine.validateState(randomPuzzle);
    assert.strictEqual(val.isValid, true, `Random puzzle ${i} failed validation: ${val.error}`);
    assert.strictEqual(PuzzleEngine.isSolvable(randomPuzzle), true, `Random puzzle ${i} must be solvable`);
    assert.strictEqual(PuzzleEngine.areStatesEqual(randomPuzzle, PuzzleEngine.DEFAULT_GOAL_STATE), false, 'Should not be solved by default');
}

console.log('All PuzzleEngine tests PASSED successfully!');
