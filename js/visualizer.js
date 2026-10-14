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
     * Renders a 3x3 board inside the specified container element.
     * @param {HTMLElement|string} container
     * @param {Array<number>} state
     * @param {Object} [options]
     * @param {number|null} [options.tileMoved] The tile that slid during this transition
     */
    function renderBoard(container, state, options = {}) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el || !Array.isArray(state) || state.length !== 9) return;

        el.innerHTML = '';
        el.className = 'puzzle-board';

        for (let i = 0; i < 9; i++) {
            const val = state[i];
            const tileEl = document.createElement('div');
            tileEl.className = 'puzzle-tile';

            if (val === 0) {
                tileEl.classList.add('tile-blank');
                tileEl.setAttribute('aria-label', 'Blank tile');
            } else {
                tileEl.textContent = val;
                tileEl.setAttribute('aria-label', `Tile ${val}`);
                if (options.tileMoved !== undefined && options.tileMoved === val) {
                    tileEl.classList.add('tile-moved');
                }
            }
            el.appendChild(tileEl);
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
            if (el) el.textContent = val !== undefined ? val : '—';
        };

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

    /**
     * Renders the frontier (open list) items into a table or list container.
     * @param {HTMLElement|string} container
     * @param {Array<Object>} frontierItems Array of { item, priority }
     * @param {number} [maxDisplay=15] Limit items rendered to avoid DOM bloat
     */
    function renderFrontier(container, frontierItems = [], maxDisplay = 15) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;

        if (!frontierItems || frontierItems.length === 0) {
            el.innerHTML = '<div class="text-secondary small py-2">Frontier is currently empty.</div>';
            return;
        }

        const itemsToShow = frontierItems.slice(0, maxDisplay);
        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-dark table-hover mb-0 font-monospace small">
                    <thead>
                        <tr class="text-secondary border-bottom border-secondary-subtle">
                            <th>#</th>
                            <th>Cost g(n)</th>
                            <th>Depth</th>
                            <th>Action</th>
                            <th>State</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        itemsToShow.forEach((entry, idx) => {
            const node = entry.item;
            const stateStr = node.state ? node.state.join('') : '—';
            html += `
                <tr>
                    <td class="text-secondary">${idx + 1}</td>
                    <td class="fw-bold text-info">${entry.priority}</td>
                    <td>${node.depth !== undefined ? node.depth : '—'}</td>
                    <td><span class="badge bg-secondary-subtle text-light">${node.action || 'ROOT'}</span></td>
                    <td class="text-secondary">${stateStr}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        if (frontierItems.length > maxDisplay) {
            html += `<div class="text-secondary small mt-1 text-center">+ ${frontierItems.length - maxDisplay} more nodes in frontier</div>`;
        }

        el.innerHTML = html;
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

    return {
        renderBoard,
        renderMiniBoard,
        updateMetrics,
        renderFrontier,
        renderSuccessors
    };
}));
