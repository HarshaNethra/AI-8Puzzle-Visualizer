/**
 * visualizer.js - Puzzle & Search State DOM Rendering Engine
 *
 * Handles DOM rendering for 3x3 puzzle boards, mini boards, frontier inspection,
 * successor previews, and real-time KPI metrics.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.Visualizer = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Renders a 3x3 board inside the specified container element with smooth sliding animations.
     * @param {HTMLElement|string} container
     * @param {Array<number>} state
     * @param {Object} [options]
     * @param {number|null} [options.tileMoved] The tile that slid during this transition
     * @param {number} [options.duration] Slide duration in ms
     * @param {boolean} [options.animate=true] Whether to animate the slide transition
     */
    function renderBoard(container, state, options = {}) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el || !Array.isArray(state) || state.length !== 9) return;

        el.className = 'puzzle-board';

        if (options.duration !== undefined) {
            el.style.setProperty('--slide-duration', `${options.duration}ms`);
        }

        const isStandardPermutation = state.every(v => typeof v === 'number' && v >= 0 && v <= 8) && new Set(state).size === 9;
        const existingTiles = el.querySelectorAll('.puzzle-tile');
        const hasExisting = existingTiles.length === 9;

        // Skip animation on initial mount or when explicit animate: false
        const skipAnimation = options.animate === false || !hasExisting;

        if (skipAnimation) {
            el.classList.add('no-transition');
        }

        if (isStandardPermutation) {
            // Ensure persistent tiles for 0..8 exist
            if (!hasExisting || el.dataset.mode !== 'permutation') {
                el.innerHTML = '';
                el.dataset.mode = 'permutation';
                for (let val = 0; val <= 8; val++) {
                    const tileEl = document.createElement('div');
                    tileEl.className = 'puzzle-tile';
                    tileEl.dataset.val = val;

                    if (val === 0) {
                        tileEl.classList.add('tile-blank');
                        tileEl.setAttribute('aria-label', 'Blank tile');
                    } else {
                        tileEl.textContent = val;
                        tileEl.setAttribute('aria-label', `Tile ${val}`);
                    }
                    el.appendChild(tileEl);
                }
            }

            // Reposition all 9 tiles according to their coordinates in `state`
            for (let i = 0; i < 9; i++) {
                const val = state[i];
                const row = Math.floor(i / 3);
                const col = i % 3;
                const tileEl = el.querySelector(`.puzzle-tile[data-val="${val}"]`);

                if (tileEl) {
                    tileEl.style.transform = `translate(${col * 94}px, ${row * 94}px)`;

                    if (val !== 0) {
                        if (options.tileMoved !== undefined && options.tileMoved === val) {
                            tileEl.classList.add('tile-moved');
                        } else {
                            tileEl.classList.remove('tile-moved');
                        }
                    }
                }
            }
        } else {
            // Fallback for non-standard or intermediate manual input
            el.innerHTML = '';
            el.dataset.mode = 'raw';
            for (let i = 0; i < 9; i++) {
                const val = state[i];
                const row = Math.floor(i / 3);
                const col = i % 3;
                const tileEl = document.createElement('div');
                tileEl.className = 'puzzle-tile';
                tileEl.dataset.val = val;
                tileEl.style.transform = `translate(${col * 94}px, ${row * 94}px)`;

                if (val === 0) {
                    tileEl.classList.add('tile-blank');
                    tileEl.setAttribute('aria-label', 'Blank tile');
                } else {
                    tileEl.textContent = val;
                    tileEl.setAttribute('aria-label', `Tile ${val}`);
                }
                el.appendChild(tileEl);
            }
        }

        if (skipAnimation) {
            void el.offsetHeight; // Force DOM reflow
            requestAnimationFrame(() => {
                el.classList.remove('no-transition');
            });
        }
    }

    /**
     * Renders a compact 3x3 mini board for quick reference (Initial/Goal reference cards).
     * @param {HTMLElement|string} container
     * @param {Array<number>} state
     */
    function renderMiniBoard(container, state) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el || !Array.isArray(state) || state.length !== 9) return;

        el.innerHTML = '';
        el.className = 'puzzle-board-mini';

        for (let i = 0; i < 9; i++) {
            const val = state[i];
            const tileEl = document.createElement('div');
            tileEl.className = 'puzzle-tile-mini';

            if (val === 0) {
                tileEl.classList.add('tile-blank');
            } else {
                tileEl.textContent = val;
            }
            el.appendChild(tileEl);
        }
    }

    /**
     * Updates the performance statistics KPI widgets.
     * @param {Object} metrics
     */
    function updateMetrics(metrics = {}) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val !== undefined && val !== null ? val : '—';
        };

        const solEl = document.getElementById('metric-solution');
        if (solEl) {
            if (metrics.success === true) {
                solEl.textContent = 'Found';
                solEl.className = 'text-success small fw-bold';
            } else if (metrics.success === false) {
                solEl.textContent = 'Not Found';
                solEl.className = 'text-danger small fw-bold';
            } else {
                solEl.textContent = '—';
                solEl.className = 'text-secondary small';
            }
        }

        const movesVal = metrics.totalMoves !== undefined 
            ? metrics.totalMoves 
            : (metrics.moves !== undefined ? metrics.moves : (metrics.solutionPath ? Math.max(0, metrics.solutionPath.length - 1) : undefined));
        setVal('metric-moves', movesVal);

        setVal('metric-generated', metrics.nodesGenerated);
        setVal('metric-expanded', metrics.nodesExpanded);
        setVal('metric-cost', metrics.pathCost !== undefined ? metrics.pathCost : metrics.currentCost);
        setVal('metric-depth', metrics.maxDepth !== undefined ? metrics.maxDepth : metrics.currentDepth);
        setVal('metric-time', metrics.executionTimeMs !== undefined ? `${metrics.executionTimeMs} ms` : '—');
        
        if (metrics.approxMemoryBytes !== undefined) {
            const kb = (metrics.approxMemoryBytes / 1024).toFixed(1);
            setVal('metric-memory', `${kb} KB`);
        } else {
            setVal('metric-memory', '—');
        }
    }

    let frontierViewMode = 'grid'; // 'grid' | 'table'
    let exploredViewMode = 'grid'; // 'grid' | 'table'
    let lastFrontierArgs = null;
    let lastExploredArgs = null;

    /**
     * Toggles view mode ('grid' or 'table') for Frontier.
     * @param {'grid'|'table'} mode
     */
    function setFrontierViewMode(mode) {
        frontierViewMode = mode;
        if (lastFrontierArgs) {
            renderFrontier(lastFrontierArgs.container, lastFrontierArgs.items, lastFrontierArgs.total, lastFrontierArgs.maxDisplay);
        }
    }

    /**
     * Toggles view mode ('grid' or 'table') for Explored set.
     * @param {'grid'|'table'} mode
     */
    function setExploredViewMode(mode) {
        exploredViewMode = mode;
        if (lastExploredArgs) {
            renderExplored(lastExploredArgs.container, lastExploredArgs.nodes, lastExploredArgs.maxDisplay);
        }
    }

    /**
     * Formats a 9-element puzzle state into a compact, human-readable 3x3 string: [1 2 3 | 4 0 5 | 6 7 8]
     * @param {Array<number>} state
     * @returns {string}
     */
    function formatStateCompact(state) {
        if (!Array.isArray(state) || state.length !== 9) return '—';
        return `[${state.slice(0, 3).join(' ')} | ${state.slice(3, 6).join(' ')} | ${state.slice(6, 9).join(' ')}]`;
    }

    /**
     * Generates HTML for an inline 3x3 compact board with individual tiles.
     * @param {Array<number>} state
     * @returns {string}
     */
    function renderCompactBoardHTML(state) {
        if (!Array.isArray(state) || state.length !== 9) return '';
        let tiles = '';
        for (let i = 0; i < 9; i++) {
            const val = state[i];
            if (val === 0) {
                tiles += '<div class="compact-tile tile-blank"></div>';
            } else {
                tiles += `<div class="compact-tile">${val}</div>`;
            }
        }
        return `<div class="compact-grid">${tiles}</div>`;
    }

    /**
     * Renders the frontier (open list) items as horizontal 3x3 node cards (first 10) or table.
     * If there are >10 items, appends a clickable "10+" card that toggles to the detailed table.
     * @param {HTMLElement|string} container
     * @param {Array<Object>} frontierItems Array of { item, priority }
     * @param {number} [totalQueueSize] Total items in queue if snapshot was trimmed
     * @param {number} [maxDisplay=30] Limit table items rendered to avoid DOM bloat
     */
    function renderFrontier(container, frontierItems = [], totalQueueSize = null, maxDisplay = 30) {
        lastFrontierArgs = { container, items: frontierItems, total: totalQueueSize, maxDisplay };
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;

        if (!frontierItems || frontierItems.length === 0) {
            el.innerHTML = '<div class="text-secondary small py-3 text-center font-monospace">Frontier (Open List) is currently empty.</div>';
            return;
        }

        const total = totalQueueSize !== null ? totalQueueSize : frontierItems.length;

        if (frontierViewMode === 'grid') {
            // Horizontal 3x3 grids view for the first 10 nodes
            const itemsToShow = frontierItems.slice(0, 10);
            let html = '<div class="nodes-horizontal-ribbon">';

            itemsToShow.forEach((entry, idx) => {
                const node = entry.item;
                const isPeek = idx === 0;
                const peekBadge = isPeek
                    ? '<span class="badge bg-success-subtle text-success py-0 px-1 font-monospace" style="font-size: 0.6rem;">Peek</span>'
                    : '';
                const boardHtml = renderCompactBoardHTML(node.state);

                html += `
                    <div class="frontier-node-card ${isPeek ? 'card-peek' : ''} d-flex flex-column justify-content-between">
                        <div class="d-flex justify-content-between align-items-center w-100">
                            <span class="badge bg-secondary-subtle text-light font-monospace py-0 px-1" style="font-size: 0.65rem;">#${idx + 1}</span>
                            ${peekBadge}
                            <span class="badge bg-info-subtle text-info fw-bold font-monospace py-0 px-1" style="font-size: 0.65rem;">g=${entry.priority}</span>
                        </div>
                        ${boardHtml}
                        <div class="d-flex justify-content-between align-items-center w-100 text-secondary" style="font-size: 0.65rem;">
                            <span class="badge bg-dark border border-secondary-subtle text-secondary py-0 px-1" style="font-size: 0.6rem;">${node.action || 'ROOT'}</span>
                            <span class="font-monospace text-light opacity-75">d:${node.depth !== undefined ? node.depth : 0}</span>
                        </div>
                    </div>
                `;
            });

            // If more than 10, append the "+X more" card at the end
            if (total > 10) {
                const remaining = total - 10;
                html += `
                    <div class="frontier-node-card node-card-more d-flex flex-column align-items-center justify-content-center text-center p-2" onclick="Visualizer.setFrontierViewMode('table')" role="button" title="Click to view detailed table">
                        <div class="text-primary fw-bold font-monospace fs-5">+${remaining}</div>
                        <div class="text-light fw-semibold small mt-1">more states</div>
                        <div class="text-info small mt-2" style="font-size: 0.68rem;">View Table &rarr;</div>
                    </div>
                `;
            }

            html += '</div>';
            el.innerHTML = html;
        } else {
            // Table View
            const itemsToShow = frontierItems.slice(0, maxDisplay);
            let html = `
                <div class="d-flex justify-content-between align-items-center px-2 py-1 bg-dark border-bottom border-secondary-subtle">
                    <small class="text-secondary font-monospace" style="font-size: 0.75rem;">Showing ${itemsToShow.length} of ${total} nodes in Frontier</small>
                    <button type="button" class="btn btn-outline-info btn-sm py-0 px-2 font-monospace" style="font-size: 0.7rem;" onclick="Visualizer.setFrontierViewMode('grid')">
                        &larr; Switch to 3&times;3 Grid
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm table-dark table-hover align-middle mb-0 font-monospace small table-sticky-header">
                        <thead>
                            <tr class="text-secondary border-bottom border-secondary-subtle">
                                <th style="width: 50px;">Queue #</th>
                                <th style="width: 90px;">Cost g(n)</th>
                                <th style="width: 70px;">Depth</th>
                                <th style="width: 90px;">Action</th>
                                <th>State [Row 1 | Row 2 | Row 3]</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            itemsToShow.forEach((entry, idx) => {
                const node = entry.item;
                const stateStr = node.state ? formatStateCompact(node.state) : '—';
                const isPeek = idx === 0;
                const costBadge = isPeek
                    ? `<span class="badge bg-success-subtle text-success fw-bold">${entry.priority} (Min)</span>`
                    : `<span class="fw-bold text-info">${entry.priority}</span>`;

                html += `
                    <tr class="${isPeek ? 'table-active' : ''}">
                        <td class="text-secondary">${idx + 1}</td>
                        <td>${costBadge}</td>
                        <td class="text-light">${node.depth !== undefined ? node.depth : '—'}</td>
                        <td><span class="badge bg-secondary-subtle text-light">${node.action || 'ROOT'}</span></td>
                        <td class="text-light opacity-90">${stateStr}</td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            if (total > itemsToShow.length) {
                html += `<div class="text-secondary small py-1 text-center font-monospace border-top border-secondary-subtle">+ ${total - itemsToShow.length} more states waiting in priority queue (Open List)</div>`;
            }

            el.innerHTML = html;
        }
    }

    /**
     * Renders generated successor states for the currently expanded node.
     * @param {HTMLElement|string} container
     * @param {Array<Object>} successors
     */
    function renderSuccessors(container, successors = []) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;

        if (!successors || successors.length === 0) {
            el.innerHTML = '<div class="text-secondary small py-2">No successors generated yet.</div>';
            return;
        }

        el.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'd-flex flex-wrap gap-2';

        successors.forEach(succ => {
            const item = document.createElement('div');
            item.className = 'successor-item d-flex flex-column align-items-center';

            const header = document.createElement('div');
            header.className = 'small fw-bold mb-1 text-info';
            header.textContent = `${succ.action} (cost ${succ.cost})`;

            const miniBoard = document.createElement('div');
            renderMiniBoard(miniBoard, succ.state);

            item.appendChild(header);
            item.appendChild(miniBoard);
            grid.appendChild(item);
        });

        el.appendChild(grid);
    }

    /**
     * Renders the explored (closed list) items as horizontal 3x3 node cards (first 10) or table.
     * If there are >10 items, appends a clickable "10+" card that toggles to the detailed table.
     * @param {HTMLElement|string} container
     * @param {Array<Object>} exploredNodes
     * @param {number} [maxDisplay=30]
     */
    function renderExplored(container, exploredNodes = [], maxDisplay = 30) {
        lastExploredArgs = { container, nodes: exploredNodes, maxDisplay };
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;

        if (!exploredNodes || exploredNodes.length === 0) {
            el.innerHTML = '<div class="text-secondary small py-3 text-center font-monospace">Explored set (Closed List) is currently empty.</div>';
            return;
        }

        const total = exploredNodes.length;

        if (exploredViewMode === 'grid') {
            // Horizontal 3x3 grids view for the first 10 nodes
            const itemsToShow = exploredNodes.slice(0, 10);
            let html = '<div class="nodes-horizontal-ribbon">';

            itemsToShow.forEach((node, idx) => {
                const boardHtml = renderCompactBoardHTML(node.state);
                html += `
                    <div class="frontier-node-card d-flex flex-column justify-content-between">
                        <div class="d-flex justify-content-between align-items-center w-100">
                            <span class="badge bg-secondary-subtle text-light font-monospace py-0 px-1" style="font-size: 0.65rem;">#${idx + 1}</span>
                            <span class="badge bg-info-subtle text-info fw-bold font-monospace py-0 px-1" style="font-size: 0.65rem;">g=${node.cost}</span>
                        </div>
                        ${boardHtml}
                        <div class="d-flex justify-content-between align-items-center w-100 text-secondary" style="font-size: 0.65rem;">
                            <span class="badge bg-dark border border-secondary-subtle text-secondary py-0 px-1" style="font-size: 0.6rem;">${node.action || 'ROOT'}</span>
                            <span class="font-monospace text-light opacity-75">ID:#${node.id}</span>
                        </div>
                    </div>
                `;
            });

            // If more than 10, append the "+X more" card at the end
            if (total > 10) {
                const remaining = total - 10;
                html += `
                    <div class="frontier-node-card node-card-more d-flex flex-column align-items-center justify-content-center text-center p-2" onclick="Visualizer.setExploredViewMode('table')" role="button" title="Click to view detailed table">
                        <div class="text-secondary fw-bold font-monospace fs-5">+${remaining}</div>
                        <div class="text-light fw-semibold small mt-1">more states</div>
                        <div class="text-info small mt-2" style="font-size: 0.68rem;">View Table &rarr;</div>
                    </div>
                `;
            }

            html += '</div>';
            el.innerHTML = html;
        } else {
            // Table View
            const itemsToShow = exploredNodes.slice(0, maxDisplay);
            let html = `
                <div class="d-flex justify-content-between align-items-center px-2 py-1 bg-dark border-bottom border-secondary-subtle">
                    <small class="text-secondary font-monospace" style="font-size: 0.75rem;">Showing ${itemsToShow.length} of ${total} explored states</small>
                    <button type="button" class="btn btn-outline-info btn-sm py-0 px-2 font-monospace" style="font-size: 0.7rem;" onclick="Visualizer.setExploredViewMode('grid')">
                        &larr; Switch to 3&times;3 Grid
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm table-dark table-hover align-middle mb-0 font-monospace small table-sticky-header">
                        <thead>
                            <tr class="text-secondary border-bottom border-secondary-subtle">
                                <th style="width: 50px;">Order</th>
                                <th style="width: 80px;">Node ID</th>
                                <th style="width: 90px;">Cost g(n)</th>
                                <th style="width: 70px;">Depth</th>
                                <th style="width: 90px;">Action</th>
                                <th style="width: 80px;">Parent</th>
                                <th>State [Row 1 | Row 2 | Row 3]</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            itemsToShow.forEach((node, idx) => {
                const stateStr = node.state ? formatStateCompact(node.state) : '—';
                const parentStr = node.parentId ? `#${node.parentId}` : 'ROOT';
                html += `
                    <tr>
                        <td class="text-secondary">${idx + 1}</td>
                        <td class="text-light fw-bold">#${node.id}</td>
                        <td class="fw-bold text-info">${node.cost}</td>
                        <td class="text-light">${node.depth !== undefined ? node.depth : '—'}</td>
                        <td><span class="badge bg-secondary-subtle text-light">${node.action || 'ROOT'}</span></td>
                        <td class="text-secondary">${parentStr}</td>
                        <td class="text-light opacity-90">${stateStr}</td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            if (exploredNodes.length > maxDisplay) {
                html += `<div class="text-secondary small py-1 text-center font-monospace border-top border-secondary-subtle">+ ${exploredNodes.length - maxDisplay} more explored states in Closed List</div>`;
            }

            el.innerHTML = html;
        }
    }

    /**
     * Renders a full visual showcase of the entire reconstructed solution path.
     * @param {HTMLElement|string} container
     * @param {Array<Object>} solutionPath
     * @param {number} [activeStepIndex=0]
     * @param {Function} [onStepClick] Callback when a step card is clicked
     */
    function renderSolutionPath(container, solutionPath = [], activeStepIndex = 0, onStepClick = null) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;

        if (!solutionPath || solutionPath.length === 0) {
            el.innerHTML = '<div class="text-secondary small py-4 text-center">Run search to reconstruct and inspect the full visual solution path.</div>';
            return;
        }

        el.innerHTML = '';

        const headerInfo = document.createElement('div');
        headerInfo.className = 'd-flex justify-content-between align-items-center mb-2 px-1';
        headerInfo.innerHTML = `
            <span class="small text-light fw-semibold">Optimal Sequence: <strong>${solutionPath.length - 1} Moves</strong></span>
            <span class="small text-secondary">Click any step to inspect on board</span>
        `;
        el.appendChild(headerInfo);

        const listContainer = document.createElement('div');
        listContainer.className = 'd-flex flex-column gap-2';

        solutionPath.forEach((step, idx) => {
            const item = document.createElement('div');
            item.className = 'solution-step-item d-flex align-items-center justify-content-between p-2 rounded-3 border';
            if (idx === activeStepIndex) {
                item.classList.add('active-step');
            }

            // Left: Mini board
            const miniBoard = document.createElement('div');
            renderMiniBoard(miniBoard, step.state);

            // Center: Details
            const details = document.createElement('div');
            details.className = 'ms-3 flex-grow-1 text-start';

            const isGoal = idx === solutionPath.length - 1;
            const stepTitle = idx === 0 
                ? 'Step 0: Initial State' 
                : (isGoal ? `Step ${idx}: Goal Reached` : `Step ${idx}: ${step.action || 'Move'}`);

            const badgeClass = isGoal ? 'bg-success text-white' : (idx === 0 ? 'bg-secondary text-white' : 'bg-primary-subtle text-info border border-info-subtle');

            details.innerHTML = `
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge ${badgeClass} font-monospace">${stepTitle}</span>
                </div>
                <div class="small text-secondary font-monospace">
                    Cost g(n): <strong class="text-info">${step.cost}</strong> | 
                    Depth: <strong class="text-light">${step.depth}</strong> | 
                    Parent: <strong class="text-light">${step.parentId ? '#' + step.parentId : 'Root'}</strong>
                </div>
            `;

            // Right: Jump button
            const jumpBtn = document.createElement('button');
            jumpBtn.type = 'button';
            jumpBtn.className = 'btn btn-sm btn-outline-secondary font-monospace';
            jumpBtn.textContent = idx === activeStepIndex ? 'Active' : 'Jump';
            if (idx === activeStepIndex) {
                jumpBtn.classList.replace('btn-outline-secondary', 'btn-primary');
            }

            item.appendChild(miniBoard);
            item.appendChild(details);
            item.appendChild(jumpBtn);

            item.addEventListener('click', () => {
                if (typeof onStepClick === 'function') {
                    onStepClick(idx);
                }
            });

            listContainer.appendChild(item);
        });

        el.appendChild(listContainer);
    }

    return {
        renderBoard,
        renderMiniBoard,
        updateMetrics,
        renderFrontier,
        renderSuccessors,
        renderExplored,
        renderSolutionPath,
        setFrontierViewMode,
        setExploredViewMode,
        getFrontierViewMode: () => frontierViewMode,
        getExploredViewMode: () => exploredViewMode
    };
}));
