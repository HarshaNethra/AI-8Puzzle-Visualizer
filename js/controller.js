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
        'medium-6': [1, 2, 3, 0, 4, 6, 7, 5, 8],
        'hard-14': [0, 8, 2, 5, 7, 3, 1, 4, 6],
        'unsolvable': [2, 1, 3, 4, 5, 6, 7, 8, 0]
    };

    let currentState = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    let goalState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let searchResult = null;
    let playbackIndex = 0;
    let isPlaying = false;
    let playTimer = null;
    let stepDelay = 500; // ms

    /**
     * Initializes the controller on page load.
     */
    function init() {
        bindEvents();
        loadInitialInputs(currentState, goalState);
        validateAndSync();
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
            speedSlider.addEventListener('input', (e) => {
                stepDelay = parseInt(e.target.value, 10);
                if (speedValue) speedValue.textContent = `${stepDelay} ms`;
                if (isPlaying) {
                    // Reset interval with new delay
                    handlePause();
                    handlePlay();
                }
            });
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

        // Render main board initially
        Visualizer.renderBoard('main-board', currentState);
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

        if (!searchResult.success) {
            showAlert(document.getElementById('validation-alert'), searchResult.error, 'danger');
            return;
        }

        // Update overall performance metrics
        Visualizer.updateMetrics(searchResult);

        // Update comparison table row for UCS
        updateComparisonTableRow(searchResult);

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

    function handleReset() {
        handlePause();
        searchResult = null;
        playbackIndex = 0;
        Visualizer.renderBoard('main-board', currentState);
        updateStateBadge(null, 0, 0);
        Visualizer.updateMetrics({
            nodesGenerated: 0,
            nodesExpanded: 0,
            pathCost: 0,
            maxDepth: 0,
            executionTimeMs: 0,
            approxMemoryBytes: 0
        });
        Visualizer.renderFrontier('frontier-container', []);
        Visualizer.renderSuccessors('successors-container', []);
        updateUIPlaybackControls(false);
    }

    function renderCurrentPlaybackStep() {
        if (!searchResult || !searchResult.solutionPath) return;
        const step = searchResult.solutionPath[playbackIndex];
        if (!step) return;

        Visualizer.renderBoard('main-board', step.state, { tileMoved: step.tileMoved });
        updateStateBadge(step.action, step.cost, step.depth);

        // Update step counter in UI
        const stepCounter = document.getElementById('step-counter');
        if (stepCounter) {
            stepCounter.textContent = `Step ${playbackIndex} of ${searchResult.totalMoves}`;
        }

        // Live successors display for the current state
        const successors = PuzzleEngine.getSuccessors(step.state);
        Visualizer.renderSuccessors('successors-container', successors);

        // Frontier queue display corresponding to current state expansion
        if (searchResult && Array.isArray(searchResult.trace)) {
            const stepKey = PuzzleEngine.serializeState(step.state);
            const expandEvent = searchResult.trace.find(
                e => e.type === 'EXPAND_NODE' && e.state && PuzzleEngine.serializeState(e.state) === stepKey
            );
            if (expandEvent && expandEvent.frontierSnapshot) {
                Visualizer.renderFrontier('frontier-container', expandEvent.frontierSnapshot);
            }
        }
    }

    function updateStateBadge(action, cost, depth) {
        const badgeAction = document.getElementById('badge-action');
        const badgeCost = document.getElementById('badge-cost');
        const badgeDepth = document.getElementById('badge-depth');

        if (badgeAction) badgeAction.textContent = action || 'INITIAL';
        if (badgeCost) badgeCost.textContent = cost !== undefined ? cost : 0;
        if (badgeDepth) badgeDepth.textContent = depth !== undefined ? depth : 0;
    }

    function updateUIPlaybackControls(running) {
        const btnRun = document.getElementById('btn-run');
        const btnPause = document.getElementById('btn-pause');
        const btnNext = document.getElementById('btn-step-next');
        const btnPrev = document.getElementById('btn-step-prev');

        if (btnRun) {
            btnRun.textContent = running ? 'Running...' : (searchResult && searchResult.success ? '▶ Resume' : '▶ Run Search');
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
        if (cells.length >= 6) {
            cells[1].textContent = metrics.success ? 'Yes' : 'No';
            cells[1].className = metrics.success ? 'text-success fw-bold' : 'text-danger fw-bold';
            cells[2].textContent = metrics.nodesExpanded;
            cells[3].textContent = metrics.totalMoves;
            cells[4].textContent = `${metrics.executionTimeMs} ms`;
            cells[5].textContent = `${(metrics.approxMemoryBytes / 1024).toFixed(1)} KB`;
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
        handleReset
    };
}));
