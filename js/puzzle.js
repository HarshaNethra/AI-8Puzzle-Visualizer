/**
 * puzzle.js - 8-Puzzle Domain Engine
 *
 * Implements core 8-puzzle domain logic completely decoupled from UI and search algorithms.
 * Handles state representation, transitions, validation, solvability, and random generation.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node / CommonJS
        module.exports = factory();
    } else {
        // Browser Global
        root.PuzzleEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Standard goal state:
     * [1, 2, 3]
     * [4, 5, 6]
     * [7, 8, 0]  (0 represents the empty / blank tile)
     */
    const DEFAULT_GOAL_STATE = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 0]);

    /**
     * Move definitions describing blank tile movement in (dRow, dCol).
     */
    const MOVES = Object.freeze({
        UP: Object.freeze({ name: 'UP', dRow: -1, dCol: 0, cost: 1 }),
        DOWN: Object.freeze({ name: 'DOWN', dRow: 1, dCol: 0, cost: 1 }),
        LEFT: Object.freeze({ name: 'LEFT', dRow: 0, dCol: -1, cost: 1 }),
        RIGHT: Object.freeze({ name: 'RIGHT', dRow: 0, dCol: 1, cost: 1 })
    });

    /**
     * Finds the 0-indexed position of the blank tile (0).
     * @param {Array<number>} state
     * @returns {number} Index of the blank tile, or -1 if not found.
     */
    function findBlank(state) {
        if (!Array.isArray(state)) return -1;
        return state.indexOf(0);
    }

    /**
     * Converts a 1D index (0-8) to (row, col) coordinates (0-2).
     * @param {number} index
     * @returns {{row: number, col: number}}
     */
    function indexToCoords(index) {
        return {
            row: Math.floor(index / 3),
            col: index % 3
        };
    }

    /**
     * Converts (row, col) coordinates (0-2) to a 1D index (0-8).
     * @param {number} row
     * @param {number} col
     * @returns {number}
     */
    function coordsToIndex(row, col) {
        return row * 3 + col;
    }

    /**
     * Validates whether a state is a valid 8-puzzle configuration.
     * Must be an array of length 9 containing numbers 0-8 exactly once.
     * @param {Array<number>} state
     * @returns {{isValid: boolean, error: string | null}}
     */
    function validateState(state) {
        if (!Array.isArray(state)) {
            return { isValid: false, error: 'State must be an array.' };
        }
        if (state.length !== 9) {
            return { isValid: false, error: `State must contain exactly 9 tiles, got ${state.length}.` };
        }

        const seen = new Set();
        for (let i = 0; i < state.length; i++) {
            const val = state[i];
            if (typeof val !== 'number' || !Number.isInteger(val)) {
                return { isValid: false, error: `Tile at index ${i} is not an integer: ${val}.` };
            }
            if (val < 0 || val > 8) {
                return { isValid: false, error: `Tile value ${val} at index ${i} is out of bounds (0-8).` };
            }
            if (seen.has(val)) {
                return { isValid: false, error: `Duplicate tile value ${val} found.` };
            }
            seen.add(val);
        }

        if (!seen.has(0)) {
            return { isValid: false, error: 'State must contain exactly one blank tile (0).' };
        }

        return { isValid: true, error: null };
    }

    /**
     * Serializes a state array into a unique string key.
     * @param {Array<number>} state
     * @returns {string}
     */
    function serializeState(state) {
        return state.join(',');
    }

    /**
     * Deserializes a string key back into a numeric state array.
     * @param {string} key
     * @returns {Array<number>}
     */
    function deserializeState(key) {
        return key.split(',').map(n => parseInt(n, 10));
    }

    /**
     * Checks if two states have identical tile arrangements.
     * @param {Array<number>} stateA
     * @param {Array<number>} stateB
     * @returns {boolean}
     */
    function areStatesEqual(stateA, stateB) {
        if (!stateA || !stateB || stateA.length !== stateB.length) return false;
        for (let i = 0; i < stateA.length; i++) {
            if (stateA[i] !== stateB[i]) return false;
        }
        return true;
    }

    /**
     * Counts the number of inversions in an 8-puzzle state.
     * An inversion is a pair of tiles (a, b) such that a > b, ignoring the blank tile (0).
     * @param {Array<number>} state
     * @returns {number}
     */
    function countInversions(state) {
        const filtered = state.filter(tile => tile !== 0);
        let inversions = 0;
        for (let i = 0; i < filtered.length - 1; i++) {
            for (let j = i + 1; j < filtered.length; j++) {
                if (filtered[i] > filtered[j]) {
                    inversions++;
                }
            }
        }
        return inversions;
    }

    /**
     * Determines whether the initial state can reach the goal state.
     * In an 8-puzzle (odd grid width = 3), legal moves preserve inversion count parity.
     * Thus, initialState is solvable to reach goalState if and only if both states
     * have the same inversion parity (even/even or odd/odd).
     * @param {Array<number>} initialState
     * @param {Array<number>} [goalState=DEFAULT_GOAL_STATE]
     * @returns {boolean}
     */
    function isSolvable(initialState, goalState = DEFAULT_GOAL_STATE) {
        const valInit = validateState(initialState);
        const valGoal = validateState(goalState);
        if (!valInit.isValid || !valGoal.isValid) return false;

        const initInversions = countInversions(initialState);
        const goalInversions = countInversions(goalState);
        return (initInversions % 2) === (goalInversions % 2);
    }

    /**
     * Returns the valid move directions for the blank tile from a given blank index.
     * @param {number} blankIndex
     * @returns {Array<string>} Array of valid move names ('UP', 'DOWN', 'LEFT', 'RIGHT')
     */
    function getValidMoves(blankIndex) {
        const { row, col } = indexToCoords(blankIndex);
        const valid = [];

        if (row > 0) valid.push('UP');
        if (row < 2) valid.push('DOWN');
        if (col > 0) valid.push('LEFT');
        if (col < 2) valid.push('RIGHT');

        return valid;
    }

    /**
     * Applies a move direction to the blank tile in the given state.
     * Pure function: Does NOT mutate the input state array.
     * @param {Array<number>} state
     * @param {'UP' | 'DOWN' | 'LEFT' | 'RIGHT'} moveName
     * @returns {{newState: Array<number>, tileMoved: number, action: string, cost: number} | null}
     */
    function applyMove(state, moveName) {
        const blankIndex = findBlank(state);
        if (blankIndex === -1) return null;

        const { row, col } = indexToCoords(blankIndex);
        const move = MOVES[moveName];
        if (!move) return null;

        const targetRow = row + move.dRow;
        const targetCol = col + move.dCol;

        if (targetRow < 0 || targetRow > 2 || targetCol < 0 || targetCol > 2) {
            return null; // Invalid move outside grid boundaries
        }

        const targetIndex = coordsToIndex(targetRow, targetCol);
        const tileMoved = state[targetIndex];

        const newState = state.slice();
        newState[blankIndex] = tileMoved;
        newState[targetIndex] = 0;

        return {
            newState,
            tileMoved,
            action: moveName,
            cost: move.cost
        };
    }

    /**
     * Generates all valid successor states from a given puzzle state.
     * @param {Array<number>} state
     * @returns {Array<{state: Array<number>, action: string, tileMoved: number, cost: number}>}
     */
    function getSuccessors(state) {
        const blankIndex = findBlank(state);
        if (blankIndex === -1) return [];

        const validMoves = getValidMoves(blankIndex);
        const successors = [];

        for (let i = 0; i < validMoves.length; i++) {
            const result = applyMove(state, validMoves[i]);
            if (result) {
                successors.push({
                    state: result.newState,
                    action: result.action,
                    tileMoved: result.tileMoved,
                    cost: result.cost
                });
            }
        }

        return successors;
    }

    /**
     * Generates a random solvable 8-puzzle configuration.
     * Generates a state via a non-reversing random walk from the goal state.
     * This guarantees solvability while keeping the state space exploration within practical
     * limits for real-time uninformed browser execution without freezing the UI thread.
     * @param {Array<number>} [goalState=DEFAULT_GOAL_STATE]
     * @param {boolean} [allowSolved=false] If false, guarantees the state is not already solved.
     * @param {number} [walkLength=14] Number of random moves from the goal
     * @returns {Array<number>}
     */
    function generateRandomSolvableState(goalState = DEFAULT_GOAL_STATE, allowSolved = false, walkLength = 14) {
        const opposites = { 'UP': 'DOWN', 'DOWN': 'UP', 'LEFT': 'RIGHT', 'RIGHT': 'LEFT' };
        let candidate = goalState.slice();
        let lastMove = null;
        const movesToMake = Math.max(8, walkLength + Math.floor(Math.random() * 5));

        for (let step = 0; step < movesToMake; step++) {
            const blank = findBlank(candidate);
            let valid = getValidMoves(blank);
            // Avoid immediately undoing the previous move
            if (lastMove && valid.length > 1) {
                const filtered = valid.filter(m => m !== opposites[lastMove]);
                if (filtered.length > 0) valid = filtered;
            }
            const move = valid[Math.floor(Math.random() * valid.length)];
            const applied = applyMove(candidate, move);
            if (applied) {
                candidate = applied.newState;
                lastMove = move;
            }
        }

        if (!allowSolved && areStatesEqual(candidate, goalState)) {
            // Apply one valid move to make it non-solved
            const blank = findBlank(candidate);
            const valid = getValidMoves(blank);
            candidate = applyMove(candidate, valid[0]).newState;
        }

        return candidate;
    }

    /**
     * Formats a 1D state array into a 3x3 2D array representation.
     * @param {Array<number>} state
     * @returns {Array<Array<number>>}
     */
    function to2D(state) {
        return [
            state.slice(0, 3),
            state.slice(3, 6),
            state.slice(6, 9)
        ];
    }

    return {
        DEFAULT_GOAL_STATE,
        MOVES,
        findBlank,
        indexToCoords,
        coordsToIndex,
        validateState,
        serializeState,
        deserializeState,
        areStatesEqual,
        countInversions,
        isSolvable,
        getValidMoves,
        applyMove,
        getSuccessors,
        generateRandomSolvableState,
        to2D
    };
}));
