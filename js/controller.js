/**
 * controller.js - Search Playback & UI Controller
 *
 * Coordinates user interactions, input synchronization, playback state machine
 * (Play, Pause, Step Next/Prev, Reset, Speed), and communicates with PuzzleEngine, UCSEngine, and Visualizer.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AppController = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Preset configurations for easy evaluation and testing
    const PRESETS = {
        'solved': [1, 2, 3, 4, 5, 6, 7, 8, 0],
        'easy-1': [1, 2, 3, 4, 5, 6, 7, 0, 8],
        'easy-2': [1, 2, 3, 4, 5, 6, 0, 7, 8],
        'medium-6': [1, 2, 3, 4, 0, 8, 7, 6, 5],
        'hard-14': [0, 8, 2, 5, 7, 3, 1, 4, 6],
        'unsolvable': [2, 1, 3, 4, 5, 6, 7, 8, 0]
    };

    let currentState = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    let goalState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let searchResult = null;
    let playbackIndex = 0;
    let isPlaying = false;
    let playTimer = null;
    let stepDelay = 1000; // ms

    /**
     * Initializes the controller on page load.
     */
    function init() {
        // Synchronize speed slider value on load / browser reload
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        if (speedSlider) {
            stepDelay = parseInt(speedSlider.value, 10) || 1000;
            if (speedValue) {
                speedValue.textContent = `${stepDelay} ms`;
            }
        }

        bindEvents();
        loadInitialInputs(currentState, goalState);
        validateAndSync();

        // Initialize Tree Visualizer
        if (typeof TreeVisualizer !== 'undefined' && TreeVisualizer.init) {
            TreeVisualizer.init();
        }
    }

    /**
     * Binds UI event listeners to controls and inputs.
     */
    function bindEvents() {
        // Preset select
        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (PRESETS[val]) {
                    setInitialState(PRESETS[val]);
                    e.target.value = '';
                }
            });
        }

        // Random solvable puzzle button
        const btnRandom = document.getElementById('btn-random');
        if (btnRandom) {
            btnRandom.addEventListener('click', () => {
                const randomState = PuzzleEngine.generateRandomSolvableState(goalState);
                setInitialState(randomState);
            });
        }

        // Reset goal button
        const btnResetGoal = document.getElementById('btn-reset-goal');
        if (btnResetGoal) {
            btnResetGoal.addEventListener('click', () => {
                setGoalState(PuzzleEngine.DEFAULT_GOAL_STATE);
            });
        }

        // Playback control buttons
        const btnRun = document.getElementById('btn-run');
        if (btnRun) {
            btnRun.addEventListener('click', handleRunOrResume);
        }

        const btnPause = document.getElementById('btn-pause');
        if (btnPause) {
            btnPause.addEventListener('click', handlePause);
        }

        const btnNext = document.getElementById('btn-step-next');
        if (btnNext) {
            btnNext.addEventListener('click', handleStepNext);
        }

        const btnPrev = document.getElementById('btn-step-prev');
        if (btnPrev) {
            btnPrev.addEventListener('click', handleStepPrev);
        }

        const btnReset = document.getElementById('btn-reset');
        if (btnReset) {
            btnReset.addEventListener('click', handleReset);
        }

        // Speed slider
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        if (speedSlider) {
            const handleSpeedChange = (val) => {
                stepDelay = parseInt(val, 10);
                if (speedValue) speedValue.textContent = `${stepDelay} ms`;
                if (isPlaying) {
                    handlePause();
                    handlePlay();
                }
            };
            speedSlider.addEventListener('input', (e) => handleSpeedChange(e.target.value));
            speedSlider.addEventListener('change', (e) => handleSpeedChange(e.target.value));
        }

        // Interactive tile clicking on main board to slide into blank space
        const mainBoard = document.getElementById('main-board');
        if (mainBoard) {
            mainBoard.addEventListener('click', (e) => {
                if (isPlaying) return;
                const tile = e.target.closest('.puzzle-tile');
                if (!tile || !tile.dataset.val) return;
                const val = parseInt(tile.dataset.val, 10);
                if (val === 0) return;

                const valIdx = currentState.indexOf(val);
                const blankIdx = currentState.indexOf(0);
                if (valIdx === -1 || blankIdx === -1) return;

                const valCoords = PuzzleEngine.indexToCoords(valIdx);
                const blankCoords = PuzzleEngine.indexToCoords(blankIdx);
                const dist = Math.abs(valCoords.row - blankCoords.row) + Math.abs(valCoords.col - blankCoords.col);
                if (dist === 1) {
                    const newState = currentState.slice();
                    newState[blankIdx] = val;
                    newState[valIdx] = 0;
                    currentState = newState;

                    updateGridInputs('init-grid', currentState);

                    if (searchResult) {
                        searchResult = null;
                        playbackIndex = 0;
                        updateUIPlaybackControls(false);
                    }

                    Visualizer.renderBoard('main-board', currentState, {
                        tileMoved: val,
                        duration: 250,
                        animate: true
                    });

                    const valInit = PuzzleEngine.validateState(currentState);
                    const valGoal = PuzzleEngine.validateState(goalState);
                    const alertEl = document.getElementById('validation-alert');
                    const btnRun = document.getElementById('btn-run');
                    updateStateBadge(null, 0, 0);

                    if (!valInit.isValid) {
                        showAlert(alertEl, 'Invalid initial state.', 'danger');
                        if (btnRun) btnRun.disabled = true;
                    } else if (!valGoal.isValid) {
                        showAlert(alertEl, 'Invalid goal state.', 'danger');
                        if (btnRun) btnRun.disabled = true;
                    } else {
                        const solvable = PuzzleEngine.isSolvable(currentState, goalState);
                        if (!solvable) {
                            showAlert(alertEl, 'Unsolvable Configuration (inversion parity mismatch).', 'warning');
                            if (btnRun) btnRun.disabled = true;
                        } else {
                            showAlert(alertEl, 'Configuration is valid and mathematically solvable.', 'success');
                            if (btnRun) btnRun.disabled = false;
                        }
                    }
                }
            });
        }

        // View tabs switching (Tree vs Animated Solution)
        const tabBtnTree = document.getElementById('tab-btn-tree');
        const tabBtnBoard = document.getElementById('tab-btn-board');
        const zoomToolbar = document.getElementById('tree-zoom-toolbar');

        if (tabBtnTree) {
            tabBtnTree.addEventListener('shown.bs.tab', () => {
                if (zoomToolbar) zoomToolbar.classList.remove('d-none');
                if (typeof TreeVisualizer !== 'undefined' && TreeVisualizer.focusOnSolutionNode) {
                    TreeVisualizer.focusOnSolutionNode(playbackIndex, 0);
                }
            });
        }

        if (tabBtnBoard) {
            tabBtnBoard.addEventListener('shown.bs.tab', () => {
                if (zoomToolbar) zoomToolbar.classList.add('d-none');
                if (searchResult && searchResult.solutionPath && searchResult.solutionPath[playbackIndex]) {
                    Visualizer.renderBoard('main-board', searchResult.solutionPath[playbackIndex].state, { animate: false });
                } else {
                    Visualizer.renderBoard('main-board', currentState, { animate: false });
                }
            });
        }

        // Horizontal mouse-wheel scrolling & isolated scroll trapping on Frontier / Explored card
        const frontierExploredCard = document.getElementById('frontier-explored-card');
        if (frontierExploredCard) {
            frontierExploredCard.addEventListener('wheel', (e) => {
                const activePane = frontierExploredCard.querySelector('.tab-pane.active');
                if (!activePane) {
                    e.preventDefault();
                    return;
                }
                const ribbon = activePane.querySelector('.nodes-horizontal-ribbon');
                if (ribbon) {
                    const scrollDelta = (e.deltaY !== 0) ? e.deltaY : e.deltaX;
                    ribbon.scrollLeft += scrollDelta;
                    e.preventDefault();
                    return;
                }
                const tableContainer = activePane.querySelector('.table-responsive') || frontierExploredCard.querySelector('.card-body');
                if (tableContainer) {
                    tableContainer.scrollTop += e.deltaY;
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
            }, { passive: false });
        }

        // Isolated scroll on State-Space Tree viewport (#tree-container):
        // Prevents page scrolling while mouse is within tree viewport (where wheel zooms tree)
        // Note: Animated Solution tab allows normal page scrolling/chaining
        const treeContainer = document.getElementById('tree-container');
        if (treeContainer) {
            treeContainer.addEventListener('wheel', (e) => {
                e.preventDefault();
            }, { passive: false });
        }
    }

    /**
     * Populates interactive 3x3 input cells for initial and goal states.
     */
    function loadInitialInputs(initSt, goalSt) {
        populateGridInputs('init-grid', initSt, (newState) => {
            currentState = newState;
            validateAndSync();
        });

        populateGridInputs('goal-grid', goalSt, (newState) => {
            goalState = newState;
            validateAndSync();
        });
    }

    function populateGridInputs(containerId, state, onChangeCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'input-tile';
            input.dataset.index = i;
            input.value = state[i] === 0 ? '' : state[i];
            if (state[i] === 0) input.classList.add('input-blank');

            input.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                const num = val === '' || val === '0' ? 0 : parseInt(val, 10);
                if (isNaN(num) || num < 0 || num > 8) {
                    e.target.value = '';
                    return;
                }
                e.target.value = num === 0 ? '' : num;
                if (num === 0) {
                    e.target.classList.add('input-blank');
                } else {
                    e.target.classList.remove('input-blank');
                }

                // Read current grid values
                const currentGrid = [];
                const inputs = container.querySelectorAll('.input-tile');
                inputs.forEach(inp => {
                    const raw = inp.value.trim();
                    currentGrid.push(raw === '' || raw === '0' ? 0 : parseInt(raw, 10));
                });
                onChangeCallback(currentGrid);
            });

            container.appendChild(input);
        }
    }

    function setInitialState(state) {
        currentState = state.slice();
        updateGridInputs('init-grid', currentState);
        validateAndSync();
    }

    function setGoalState(state) {
        goalState = state.slice();
        updateGridInputs('goal-grid', goalState);
        validateAndSync();
    }

    function updateGridInputs(containerId, state) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const inputs = container.querySelectorAll('.input-tile');
        inputs.forEach((inp, idx) => {
            const val = state[idx];
            inp.value = val === 0 ? '' : val;
            if (val === 0) inp.classList.add('input-blank');
            else inp.classList.remove('input-blank');
        });
    }

    /**
     * Validates both puzzle states and updates validation badges.
     */
    function validateAndSync() {
        handleReset();

        const valInit = PuzzleEngine.validateState(currentState);
        const valGoal = PuzzleEngine.validateState(goalState);
        const alertEl = document.getElementById('validation-alert');
        const btnRun = document.getElementById('btn-run');

        // Render main board initially without animation
        Visualizer.renderBoard('main-board', currentState, { animate: false });
        updateStateBadge(null, 0, 0);

        if (!valInit.isValid) {
            showAlert(alertEl, 'Invalid initial state.', 'danger');
            if (btnRun) btnRun.disabled = true;
            return false;
        }

        if (!valGoal.isValid) {
            showAlert(alertEl, 'Invalid goal state.', 'danger');
            if (btnRun) btnRun.disabled = true;
            return false;
        }

        const solvable = PuzzleEngine.isSolvable(currentState, goalState);
        if (!solvable) {
            showAlert(alertEl, 'Unsolvable Configuration (inversion parity mismatch).', 'warning');
            if (btnRun) btnRun.disabled = true;
            return false;
        }

        showAlert(alertEl, 'Configuration is valid and mathematically solvable.', 'success');
        if (btnRun) btnRun.disabled = false;
        return true;
    }

    function showAlert(alertEl, msg, type) {
        if (!alertEl) return;
        alertEl.className = `alert alert-${type} py-2 px-3 small mb-3`;
        alertEl.textContent = msg;
    }

    /**
     * Executes the UCS search and initiates visualization.
     */
    function handleRunOrResume() {
        if (isPlaying) {
            return;
        }

        if (searchResult && searchResult.success) {
            // Already solved, resume playback
            handlePlay();
            return;
        }

        // Run fresh UCS search
        searchResult = UCSEngine.solveUCS(currentState, goalState);

        const alertEl = document.getElementById('validation-alert');
        if (!searchResult.success) {
            showAlert(alertEl, `No Solution Found: ${searchResult.error}`, 'danger');
            updateSolutionSummary(searchResult);
            Visualizer.updateMetrics(searchResult);
            return;
        }

        showAlert(alertEl, 'Solution Found', 'success');

        // Update solution summary card & overall performance metrics
        updateSolutionSummary(searchResult);

        // Update comparison table row for UCS
        updateComparisonTableRow(searchResult);

        // Render Explored (Closed List) nodes
        Visualizer.renderExplored('explored-container', searchResult.exploredNodes);

        // Render Solution Path showcase
        Visualizer.renderSolutionPath('path-container', searchResult.solutionPath, 0, jumpToStep);

        // Render State-Space Tree Visualization
        if (typeof TreeVisualizer !== 'undefined' && TreeVisualizer.render) {
            TreeVisualizer.render(searchResult);
        }

        // Automatically activate the Solution Path inspector tab so user sees the full path immediately
        const pathTabBtn = document.getElementById('path-tab');
        if (pathTabBtn && typeof bootstrap !== 'undefined') {
            const bsTab = bootstrap.Tab.getOrCreateInstance(pathTabBtn);
            if (bsTab) bsTab.show();
        }

        // Begin playback of the solution trace / path
        playbackIndex = 0;
        updateUIPlaybackControls(true);
        renderCurrentPlaybackStep();
        handlePlay();
    }

    function handlePlay() {
        if (!searchResult || !searchResult.solutionPath || searchResult.solutionPath.length === 0) return;
        isPlaying = true;
        updateUIPlaybackControls(true);

        clearInterval(playTimer);
        playTimer = setInterval(() => {
            if (playbackIndex < searchResult.solutionPath.length - 1) {
                playbackIndex++;
                renderCurrentPlaybackStep();
            } else {
                handlePause();
            }
        }, stepDelay);
    }

    function handlePause() {
        isPlaying = false;
        clearInterval(playTimer);
        updateUIPlaybackControls(false);
    }

    function handleStepNext() {
        if (!searchResult || !searchResult.solutionPath) return;
        handlePause();
        if (playbackIndex < searchResult.solutionPath.length - 1) {
            playbackIndex++;
            renderCurrentPlaybackStep();
        }
    }

    function handleStepPrev() {
        if (!searchResult || !searchResult.solutionPath) return;
        handlePause();
        if (playbackIndex > 0) {
            playbackIndex--;
            renderCurrentPlaybackStep();
        }
    }

    function jumpToStep(index) {
        if (!searchResult || !searchResult.solutionPath || index < 0 || index >= searchResult.solutionPath.length) return;
        handlePause();
        playbackIndex = index;
        renderCurrentPlaybackStep();
    }

    function handleReset() {
        handlePause();
        searchResult = null;
        playbackIndex = 0;
        Visualizer.renderBoard('main-board', currentState, { animate: false });
        updateStateBadge(null, 0, 0, null);
        const stepCounter = document.getElementById('step-counter');
        if (stepCounter) {
            stepCounter.textContent = 'Initial State';
        }
        Visualizer.updateMetrics({
            success: null,
            totalMoves: '—',
            nodesGenerated: 0,
            nodesExpanded: 0,
            pathCost: 0,
            maxDepth: 0,
            executionTimeMs: 0,
            approxMemoryBytes: 0
        });
        if (typeof Visualizer.setFrontierViewMode === 'function') Visualizer.setFrontierViewMode('grid');
        if (typeof Visualizer.setExploredViewMode === 'function') Visualizer.setExploredViewMode('grid');
        Visualizer.renderFrontier('frontier-container', []);
        Visualizer.renderSuccessors('successors-container', []);
        Visualizer.renderExplored('explored-container', []);
        Visualizer.renderSolutionPath('path-container', []);
        updateSolutionSummary(null);

        const frontierBadge = document.getElementById('frontier-badge-count');
        if (frontierBadge) frontierBadge.textContent = '0';
        const exploredBadge = document.getElementById('explored-badge-count');
        if (exploredBadge) exploredBadge.textContent = '0';
        const stepIndicator = document.getElementById('lists-step-indicator');
        if (stepIndicator) stepIndicator.textContent = 'Playback Step: 0';

        // Reset Tree Visualizer
        if (typeof TreeVisualizer !== 'undefined' && TreeVisualizer.reset) {
            TreeVisualizer.reset();
        }

        const alertEl = document.getElementById('validation-alert');
        showAlert(alertEl, 'Configuration is valid and mathematically solvable.', 'success');
        updateUIPlaybackControls(false);
    }

    function renderCurrentPlaybackStep() {
        if (!searchResult || !searchResult.solutionPath) return;
        const step = searchResult.solutionPath[playbackIndex];
        if (!step) return;

        const animDuration = Math.min(320, Math.max(50, Math.round(stepDelay * 0.65)));
        Visualizer.renderBoard('main-board', step.state, {
            tileMoved: step.tileMoved,
            duration: animDuration,
            animate: true
        });
        updateStateBadge(step.action, step.cost, step.depth, step.parentId, step.id);

        // Update active step in Solution Path showcase
        Visualizer.renderSolutionPath('path-container', searchResult.solutionPath, playbackIndex, jumpToStep);

        // Update active step in State-Space Tree Visualization
        if (typeof TreeVisualizer !== 'undefined' && TreeVisualizer.updateStep) {
            TreeVisualizer.updateStep(playbackIndex);
        }

        // Update step counter in UI
        const stepCounter = document.getElementById('step-counter');
        if (stepCounter) {
            stepCounter.textContent = `Step ${playbackIndex} of ${searchResult.totalMoves}`;
        }

        // Live successors display for the current state
        const successors = PuzzleEngine.getSuccessors(step.state);
        Visualizer.renderSuccessors('successors-container', successors);

        // Frontier queue, Explored list, & Search Metrics synchronized with tree at current playback step
        let activeFrontierSnapshot = [];
        let activeFrontierSize = 0;
        let activeExploredCount = 0;
        let activeExploredNodes = [];
        let activeGenerated = 1;
        let activeExpanded = 0;

        const treeMetrics = (typeof TreeVisualizer !== 'undefined' && typeof TreeVisualizer.getTreeMetricsAtStep === 'function')
            ? TreeVisualizer.getTreeMetricsAtStep(playbackIndex)
            : null;

        if (treeMetrics) {
            activeGenerated = treeMetrics.totalGenerated;
            activeExpanded = treeMetrics.nodesExpanded;
            activeFrontierSize = treeMetrics.frontierSize;
            activeExploredCount = treeMetrics.exploredSize;
            activeFrontierSnapshot = treeMetrics.frontierItems;
            activeExploredNodes = treeMetrics.exploredNodes;
        } else if (searchResult && Array.isArray(searchResult.trace)) {
            if (playbackIndex === 0) {
                const initEvent = searchResult.trace.find(e => e.type === 'INIT');
                if (initEvent) {
                    activeFrontierSnapshot = initEvent.frontierSnapshot || [];
                    activeFrontierSize = (typeof initEvent.frontierSize === 'number') ? initEvent.frontierSize : activeFrontierSnapshot.length;
                    activeExploredCount = 0;
                    activeGenerated = (typeof initEvent.nodesGenerated === 'number') ? initEvent.nodesGenerated : 1;
                    activeExpanded = (typeof initEvent.nodesExpanded === 'number') ? initEvent.nodesExpanded : 0;
                }
            } else if (playbackIndex === searchResult.solutionPath.length - 1) {
                const goalEvent = searchResult.trace.find(e => e.type === 'GOAL_FOUND');
                if (goalEvent) {
                    activeFrontierSnapshot = goalEvent.frontierSnapshot || [];
                    activeFrontierSize = (typeof goalEvent.frontierSize === 'number') ? goalEvent.frontierSize : activeFrontierSnapshot.length;
                    activeExploredCount = goalEvent.exploredSize || (searchResult.exploredNodes ? searchResult.exploredNodes.length : 0);
                    activeGenerated = (typeof goalEvent.nodesGenerated === 'number') ? goalEvent.nodesGenerated : searchResult.nodesGenerated;
                    activeExpanded = (typeof goalEvent.nodesExpanded === 'number') ? goalEvent.nodesExpanded : searchResult.nodesExpanded;
                } else {
                    activeFrontierSnapshot = [];
                    activeFrontierSize = 0;
                    activeExploredCount = searchResult.exploredNodes ? searchResult.exploredNodes.length : 0;
                    activeGenerated = searchResult.nodesGenerated;
                    activeExpanded = searchResult.nodesExpanded;
                }
            } else {
                const prevStep = searchResult.solutionPath[playbackIndex - 1];
                const expandEvent = searchResult.trace.find(
                    e => e.type === 'EXPAND_NODE' && e.nodeId === prevStep.id
                );
                if (expandEvent) {
                    activeFrontierSnapshot = expandEvent.frontierSnapshot || [];
                    activeFrontierSize = (typeof expandEvent.frontierSize === 'number') ? expandEvent.frontierSize : activeFrontierSnapshot.length;
                    activeExploredCount = expandEvent.exploredSize || expandEvent.nodesExpanded;
                    activeGenerated = (typeof expandEvent.nodesGenerated === 'number') ? expandEvent.nodesGenerated : searchResult.nodesGenerated;
                    activeExpanded = (typeof expandEvent.nodesExpanded === 'number') ? expandEvent.nodesExpanded : searchResult.nodesExpanded;
                } else {
                    const lastTrace = searchResult.trace[searchResult.trace.length - 1];
                    if (lastTrace) {
                        activeFrontierSnapshot = lastTrace.frontierSnapshot || [];
                        activeFrontierSize = lastTrace.frontierSize || activeFrontierSnapshot.length;
                        activeExploredCount = searchResult.exploredNodes ? searchResult.exploredNodes.length : 0;
                        activeGenerated = (typeof lastTrace.nodesGenerated === 'number') ? lastTrace.nodesGenerated : searchResult.nodesGenerated;
                        activeExpanded = (typeof lastTrace.nodesExpanded === 'number') ? lastTrace.nodesExpanded : searchResult.nodesExpanded;
                    }
                }
            }

            activeExploredNodes = (playbackIndex === 0)
                ? []
                : (searchResult.exploredNodes ? searchResult.exploredNodes.slice(0, activeExploredCount || playbackIndex) : []);
        }

        Visualizer.renderFrontier('frontier-container', activeFrontierSnapshot, activeFrontierSize);
        Visualizer.renderExplored('explored-container', activeExploredNodes);

        // Update badge counters & step indicator
        const frontierBadge = document.getElementById('frontier-badge-count');
        if (frontierBadge) frontierBadge.textContent = activeFrontierSize;

        const exploredBadge = document.getElementById('explored-badge-count');
        if (exploredBadge) exploredBadge.textContent = activeExploredCount;

        const stepIndicator = document.getElementById('lists-step-indicator');
        if (stepIndicator) stepIndicator.textContent = `Step ${playbackIndex} / ${searchResult.totalMoves}`;

        // Dynamically update Search Performance Metrics per playback step
        const movesDisplay = (searchResult.totalMoves === 0)
            ? 0
            : (playbackIndex === searchResult.solutionPath.length - 1
                ? `${searchResult.totalMoves}`
                : `${playbackIndex} / ${searchResult.totalMoves}`);

        Visualizer.updateMetrics({
            success: true,
            totalMoves: movesDisplay,
            nodesGenerated: activeGenerated,
            nodesExpanded: activeExpanded,
            currentCost: step.cost,
            currentDepth: step.depth,
            executionTimeMs: searchResult.executionTimeMs,
            approxMemoryBytes: searchResult.approxMemoryBytes
        });

        // If goal state reached at end of playback
        if (playbackIndex === searchResult.solutionPath.length - 1 && searchResult.totalMoves > 0) {
            const alertEl = document.getElementById('validation-alert');
            showAlert(alertEl, 'Solution Found', 'success');
        }
    }

    function updateStateBadge(action, cost, depth, parentId, nodeId) {
        const badgeNode = document.getElementById('badge-node');
        const badgeAction = document.getElementById('badge-action');
        const badgeCost = document.getElementById('badge-cost');
        const badgeDepth = document.getElementById('badge-depth');
        const badgeParent = document.getElementById('badge-parent');

        if (badgeNode) badgeNode.textContent = nodeId !== undefined && nodeId !== null ? `#${nodeId}` : '#1 (Root)';
        if (badgeAction) badgeAction.textContent = action || 'INITIAL';
        if (badgeCost) badgeCost.textContent = cost !== undefined ? cost : 0;
        if (badgeDepth) badgeDepth.textContent = depth !== undefined ? depth : 0;
        if (badgeParent) {
            badgeParent.textContent = parentId ? `Node #${parentId}` : 'None (Root)';
        }
    }

    function updateSolutionSummary(result) {
        const card = document.getElementById('solution-summary-card');
        if (!card) return;
        if (!result) {
            card.classList.add('d-none');
            return;
        }

        card.classList.remove('d-none');
        const badge = document.getElementById('summary-status-badge');
        const sumStatus = document.getElementById('sum-status');
        const sumMoves = document.getElementById('sum-moves');
        const sumGenerated = document.getElementById('sum-generated');
        const sumExpanded = document.getElementById('sum-expanded');
        const sumDepth = document.getElementById('sum-depth');
        const sumTime = document.getElementById('sum-time');
        const sumCost = document.getElementById('sum-cost');
        const sumMemory = document.getElementById('sum-memory');

        if (result.success) {
            if (badge) {
                badge.className = 'badge bg-success';
                badge.textContent = 'Solution Found';
            }
            if (sumStatus) {
                sumStatus.className = 'text-success fw-bold';
                sumStatus.textContent = 'Solution Found';
            }
            if (sumMoves) sumMoves.textContent = result.totalMoves;
            if (sumGenerated) sumGenerated.textContent = result.nodesGenerated;
            if (sumExpanded) sumExpanded.textContent = result.nodesExpanded;
            if (sumDepth) sumDepth.textContent = result.maxDepth;
            if (sumTime) sumTime.textContent = `${result.executionTimeMs} ms`;
            if (sumCost) sumCost.textContent = result.pathCost;
            if (sumMemory) sumMemory.textContent = `${(result.approxMemoryBytes / 1024).toFixed(1)} KB`;
        } else {
            if (badge) {
                badge.className = 'badge bg-danger';
                badge.textContent = 'Not Found';
            }
            if (sumStatus) {
                sumStatus.className = 'text-danger fw-bold';
                sumStatus.textContent = 'Solution Not Found';
            }
            if (sumMoves) sumMoves.textContent = '—';
            if (sumGenerated) sumGenerated.textContent = result.nodesGenerated || 0;
            if (sumExpanded) sumExpanded.textContent = result.nodesExpanded || 0;
            if (sumDepth) sumDepth.textContent = result.maxDepth || 0;
            if (sumTime) sumTime.textContent = `${result.executionTimeMs || 0} ms`;
            if (sumCost) sumCost.textContent = '—';
            if (sumMemory) sumMemory.textContent = result.approxMemoryBytes ? `${(result.approxMemoryBytes / 1024).toFixed(1)} KB` : '—';
        }
    }

    function updateUIPlaybackControls(running) {
        const btnRun = document.getElementById('btn-run');
        const btnPause = document.getElementById('btn-pause');
        const btnNext = document.getElementById('btn-step-next');
        const btnPrev = document.getElementById('btn-step-prev');

        if (btnRun) {
            btnRun.textContent = running ? 'Running...' : (searchResult && searchResult.success ? 'Resume' : 'Run Search');
            btnRun.classList.toggle('btn-success', !running);
            btnRun.classList.toggle('btn-secondary', running);
        }
        if (btnPause) {
            btnPause.disabled = !running;
        }
        if (btnNext) {
            btnNext.disabled = running || (!searchResult || playbackIndex >= (searchResult.solutionPath.length - 1));
        }
        if (btnPrev) {
            btnPrev.disabled = running || (!searchResult || playbackIndex <= 0);
        }
    }

    function updateComparisonTableRow(metrics) {
        const row = document.getElementById('row-ucs');
        if (!row) return;

        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            cells[2].textContent = metrics.success ? 'Yes' : 'No';
            cells[2].className = metrics.success ? 'text-success fw-bold' : 'text-danger fw-bold';
            cells[3].textContent = metrics.nodesExpanded;
            cells[4].textContent = metrics.totalMoves;
            cells[5].textContent = `${metrics.executionTimeMs} ms`;
            cells[6].textContent = `${(metrics.approxMemoryBytes / 1024).toFixed(1)} KB`;
        }
    }

    return {
        init,
        PRESETS,
        setInitialState,
        setGoalState,
        handleRunOrResume,
        handlePause,
        handleStepNext,
        handleStepPrev,
        handleReset,
        jumpToStep
    };
}));
