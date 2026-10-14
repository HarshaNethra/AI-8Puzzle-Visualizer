/**
 * ucs.js - Uniform Cost Search (UCS) Engine
 *
 * Implements the core Uniform Cost Search algorithm for the 8-puzzle problem.
 * Completely decoupled from the presentation layer / UI.
 * Produces search statistics, reconstructed solution path, and an execution trace.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node / CommonJS
        const PuzzleEngine = require('./puzzle.js');
        const PriorityQueue = require('./priorityQueue.js');
        module.exports = factory(PuzzleEngine, PriorityQueue);
    } else {
        // Browser Global
        root.UCSEngine = factory(root.PuzzleEngine, root.PriorityQueue);
    }
}(typeof self !== 'undefined' ? self : this, function (PuzzleEngine, PriorityQueue) {
    'use strict';

    /**
     * Search Node representing a state in the state-space search graph.
     * @typedef {Object} SearchNode
     * @property {number} id Unique sequential node identifier
     * @property {Array<number>} state 1D puzzle state representation
     * @property {SearchNode | null} parent Reference to parent search node
     * @property {string | null} action Action taken from parent to reach this state ('UP', 'DOWN', 'LEFT', 'RIGHT', or null)
     * @property {number | null} tileMoved Number on the tile that slid into the blank
     * @property {number} cost Accumulated path cost g(n) from start state to this node
     * @property {number} depth Depth level in the search tree (number of steps from root)
     */

    /**
     * Reconstructs the solution path from the goal node back to the root node.
     * @param {SearchNode} goalNode
     * @returns {Array<{state: Array<number>, action: string | null, tileMoved: number | null, depth: number, cost: number}>}
     */
    function reconstructPath(goalNode) {
        const path = [];
        let curr = goalNode;
        while (curr !== null) {
            path.push({
                state: curr.state.slice(),
                action: curr.action,
                tileMoved: curr.tileMoved,
                depth: curr.depth,
                cost: curr.cost
            });
            curr = curr.parent;
        }
        return path.reverse();
    }

    /**
     * Estimates approximate memory usage of the search structures in bytes.
     * @param {number} totalNodesInFrontier
     * @param {number} totalNodesInExplored
     * @returns {number} Memory in bytes
     */
    function estimateMemoryBytes(totalNodesInFrontier, totalNodesInExplored) {
        // Approximate: each node object + array + map entry ≈ 200 bytes in V8
        const bytesPerNode = 200;
        return (totalNodesInFrontier + totalNodesInExplored) * bytesPerNode;
    }

    /**
     * Solves the 8-puzzle using Uniform Cost Search (UCS).
     *
     * In UCS, the node with the lowest cumulative path cost g(n) is always selected
     * for expansion from the priority queue. Goal testing occurs when a node is
     * selected/popped from the frontier, guaranteeing optimality.
     *
     * @param {Array<number>} initialState 1D array of 9 tiles
     * @param {Array<number>} [goalState=PuzzleEngine.DEFAULT_GOAL_STATE]
     * @param {Object} [options]
     * @param {number} [options.maxExpanded=50000] Safety limit to prevent runaway searches
     * @param {boolean} [options.recordTrace=true] Whether to capture full replay trace
     * @returns {Object} Solution result, performance statistics, and search trace
     */
    function solveUCS(initialState, goalState = PuzzleEngine.DEFAULT_GOAL_STATE, options = {}) {
        const startTime = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();

        const maxExpanded = options.maxExpanded || 50000;
        const recordTrace = options.recordTrace !== false;

        // 1. Validation Checks
        const initVal = PuzzleEngine.validateState(initialState);
        if (!initVal.isValid) {
            return {
                success: false,
                error: `Invalid initial state: ${initVal.error}`,
                solutionPath: [],
                totalMoves: 0,
                pathCost: 0,
                nodesGenerated: 0,
                nodesExpanded: 0,
                maxDepth: 0,
                executionTimeMs: 0,
                approxMemoryBytes: 0,
                trace: []
            };
        }

        const goalVal = PuzzleEngine.validateState(goalState);
        if (!goalVal.isValid) {
            return {
                success: false,
                error: `Invalid goal state: ${goalVal.error}`,
                solutionPath: [],
                totalMoves: 0,
                pathCost: 0,
                nodesGenerated: 0,
                nodesExpanded: 0,
                maxDepth: 0,
                executionTimeMs: 0,
                approxMemoryBytes: 0,
                trace: []
            };
        }

        // 2. Solvability Verification
        if (!PuzzleEngine.isSolvable(initialState, goalState)) {
            const endTime = (typeof performance !== 'undefined' && performance.now)
                ? performance.now()
                : Date.now();
            return {
                success: false,
                error: 'The puzzle configuration is mathematically unsolvable.',
                solutionPath: [],
                totalMoves: 0,
                pathCost: 0,
                nodesGenerated: 1,
                nodesExpanded: 0,
                maxDepth: 0,
                executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
                approxMemoryBytes: estimateMemoryBytes(0, 0),
                trace: [{
                    type: 'UNSOLVABLE',
                    message: 'Puzzle has mismatched inversion parity and cannot reach the goal.'
                }]
            };
        }

        // 3. Initialize Search Data Structures
        const frontier = new PriorityQueue();
        const explored = new Map(); // stateKey -> best known cost
        const frontierBestCost = new Map(); // stateKey -> best cost in frontier

        let nodeCounter = 0;
        let nodesGenerated = 0;
        let nodesExpanded = 0;
        let maxDepth = 0;
        const trace = [];

        // Helper to record trace steps
        function addTraceStep(step) {
            if (recordTrace) {
                trace.push(step);
            }
        }

        // Root Node
        const rootNode = {
            id: ++nodeCounter,
            state: initialState.slice(),
            parent: null,
            action: null,
            tileMoved: null,
            cost: 0,
            depth: 0
        };

        const initialKey = PuzzleEngine.serializeState(initialState);
        const goalKey = PuzzleEngine.serializeState(goalState);

        frontier.enqueue(rootNode, rootNode.cost);
        frontierBestCost.set(initialKey, 0);
        nodesGenerated = 1;

        addTraceStep({
            type: 'INIT',
            nodeId: rootNode.id,
            state: rootNode.state.slice(),
            cost: 0,
            depth: 0,
            frontierSize: 1,
            exploredSize: 0,
            nodesGenerated,
            nodesExpanded
        });

        let solutionNode = null;
        let terminatedReason = null;

        // 4. Main Search Loop
        while (!frontier.isEmpty()) {
            // Select node with minimum path cost g(n)
            const currentNode = frontier.dequeue();
            const currentKey = PuzzleEngine.serializeState(currentNode.state);

            // Clean up frontierBestCost entry if it matches this node
            if (frontierBestCost.get(currentKey) === currentNode.cost) {
                frontierBestCost.delete(currentKey);
            }

            // If a cheaper path to this state was already explored, discard it
            if (explored.has(currentKey) && explored.get(currentKey) <= currentNode.cost) {
                continue;
            }

            // Add to explored set (Closed List)
            explored.set(currentKey, currentNode.cost);
            nodesExpanded++;
            if (currentNode.depth > maxDepth) {
                maxDepth = currentNode.depth;
            }

            addTraceStep({
                type: 'SELECT_NODE',
                nodeId: currentNode.id,
                state: currentNode.state.slice(),
                action: currentNode.action,
                tileMoved: currentNode.tileMoved,
                cost: currentNode.cost,
                depth: currentNode.depth,
                parentId: currentNode.parent ? currentNode.parent.id : null,
                frontierSize: frontier.size(),
                exploredSize: explored.size,
                nodesGenerated,
                nodesExpanded
            });

            // Goal Test upon node selection (required for UCS optimality)
            if (currentKey === goalKey) {
                solutionNode = currentNode;
                addTraceStep({
                    type: 'GOAL_FOUND',
                    nodeId: currentNode.id,
                    state: currentNode.state.slice(),
                    cost: currentNode.cost,
                    depth: currentNode.depth,
                    totalMoves: currentNode.depth
                });
                break;
            }

            // Check safety limit
            if (nodesExpanded >= maxExpanded) {
                terminatedReason = `Search limit reached: expanded ${nodesExpanded} nodes without finding solution.`;
                break;
            }

            // Generate Successors
            const successors = PuzzleEngine.getSuccessors(currentNode.state);
            const generatedThisStep = [];

            for (let i = 0; i < successors.length; i++) {
                const succ = successors[i];
                const succKey = PuzzleEngine.serializeState(succ.state);
                const stepCost = (typeof succ.cost === 'number') ? succ.cost : 1;
                const newCost = currentNode.cost + stepCost;

                // If already explored with a smaller or equal cost, skip
                if (explored.has(succKey) && explored.get(succKey) <= newCost) {
                    continue;
                }

                // If already in frontier with a smaller or equal cost, skip
                if (frontierBestCost.has(succKey) && frontierBestCost.get(succKey) <= newCost) {
                    continue;
                }

                // Create successor search node
                const childNode = {
                    id: ++nodeCounter,
                    state: succ.state,
                    parent: currentNode,
                    action: succ.action,
                    tileMoved: succ.tileMoved,
                    cost: newCost,
                    depth: currentNode.depth + 1
                };

                nodesGenerated++;
                frontier.enqueue(childNode, childNode.cost);
                frontierBestCost.set(succKey, newCost);

                generatedThisStep.push({
                    nodeId: childNode.id,
                    state: childNode.state.slice(),
                    action: childNode.action,
                    tileMoved: childNode.tileMoved,
                    cost: childNode.cost,
                    depth: childNode.depth
                });
            }

            addTraceStep({
                type: 'EXPAND_NODE',
                nodeId: currentNode.id,
                successorsCount: generatedThisStep.length,
                successors: generatedThisStep,
                frontierSize: frontier.size(),
                exploredSize: explored.size,
                nodesGenerated,
                nodesExpanded
            });
        }

        const endTime = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();
        const executionTimeMs = Math.round((endTime - startTime) * 100) / 100;

        if (solutionNode) {
            const solutionPath = reconstructPath(solutionNode);
            return {
                success: true,
                solutionPath,
                totalMoves: solutionPath.length > 0 ? solutionPath.length - 1 : 0,
                pathCost: solutionNode.cost,
                nodesGenerated,
                nodesExpanded,
                maxDepth,
                executionTimeMs,
                approxMemoryBytes: estimateMemoryBytes(frontier.size(), explored.size),
                trace
            };
        } else {
            return {
                success: false,
                error: terminatedReason || 'Frontier exhausted. No solution found.',
                solutionPath: [],
                totalMoves: 0,
                pathCost: 0,
                nodesGenerated,
                nodesExpanded,
                maxDepth,
                executionTimeMs,
                approxMemoryBytes: estimateMemoryBytes(frontier.size(), explored.size),
                trace
            };
        }
    }

    return {
        solveUCS,
        reconstructPath,
        estimateMemoryBytes
    };
}));
