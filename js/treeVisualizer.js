/**
 * treeVisualizer.js - Interactive State-Space Search Tree Visualization (D3.js SVG)
 *
 * Renders the actual state-space search tree explored by the Uniform Cost Search (UCS) engine.
 * Every displayed node corresponds strictly to an authentic generated search node.
 * Features miniature 3x3 puzzle boards, dynamic step-by-step sprouting animation,
 * automatic camera zoom & follow on the solution path, D3 panning/zooming, and node inspection.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TreeVisualizer = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // State variables
    let searchResult = null;
    let activePlaybackIndex = 0;
    let selectedNodeData = null;
    let exploredNodeIds = new Set();
    let goalNodeId = null;

    // D3 variables
    let svg = null;
    let gCanvas = null;
    let gLinks = null;
    let gNodes = null;
    let zoomBehavior = null;
    let rootHierarchy = null;
    let allHierarchyNodes = [];
    let allHierarchyLinks = [];

    // Layout configuration
    const NODE_WIDTH = 86;
    const NODE_HEIGHT = 98;
    const DX = 104; // horizontal node spacing
    const DY = 135; // vertical level spacing

    // D3 link generator
    const linkGenerator = d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y);

    /**
     * Initializes DOM event listeners for toolbar and tree controls.
     */
    function init() {
        // Zoom controls
        const btnZoomIn = document.getElementById('btn-tree-zoom-in');
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                if (svg && zoomBehavior) {
                    svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.3);
                }
            });
        }

        const btnZoomOut = document.getElementById('btn-tree-zoom-out');
        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                if (svg && zoomBehavior) {
                    svg.transition().duration(250).call(zoomBehavior.scaleBy, 0.77);
                }
            });
        }

        const btnZoomFit = document.getElementById('btn-tree-zoom-fit');
        if (btnZoomFit) {
            btnZoomFit.addEventListener('click', () => {
                fitToViewport(400);
            });
        }

        const btnZoomReset = document.getElementById('btn-tree-zoom-reset');
        if (btnZoomReset) {
            btnZoomReset.addEventListener('click', () => {
                if (svg && zoomBehavior) {
                    focusOnSolutionNode(activePlaybackIndex, 300);
                }
            });
        }

        // Detail panel buttons
        const btnCloseDetail = document.getElementById('btn-tree-close-detail');
        if (btnCloseDetail) {
            btnCloseDetail.addEventListener('click', () => {
                closeDetailPanel();
            });
        }

        const btnJumpStep = document.getElementById('btn-tree-jump-step');
        if (btnJumpStep) {
            btnJumpStep.addEventListener('click', () => {
                if (selectedNodeData && typeof selectedNodeData.solutionStepIndex === 'number') {
                    if (typeof AppController !== 'undefined' && AppController.jumpToStep) {
                        AppController.jumpToStep(selectedNodeData.solutionStepIndex);
                    }
                }
            });
        }
    }

    /**
     * Renders a fresh search tree based on the provided UCS search result.
     * Computes full hierarchy layout once, then initializes dynamic display at step 0.
     * @param {Object} ucsResult Output of UCSEngine.solveUCS
     */
    function render(ucsResult) {
        searchResult = ucsResult;
        activePlaybackIndex = 0;
        selectedNodeData = null;
        closeDetailPanel();

        if (!searchResult || !Array.isArray(searchResult.generatedNodes) || searchResult.generatedNodes.length === 0) {
            reset();
            return;
        }

        // Hide empty state placeholder, show SVG
        const placeholder = document.getElementById('tree-placeholder');
        const svgEl = document.getElementById('tree-svg');
        if (placeholder) placeholder.classList.add('d-none');
        if (svgEl) svgEl.classList.remove('d-none');

        buildHierarchyAndCanvas();
        updateVisibleTree(0, false);
        focusOnSolutionNode(0, 450);
    }

    /**
     * Constructs the full tree hierarchy layout and initializes SVG canvas.
     */
    function buildHierarchyAndCanvas() {
        if (typeof d3 === 'undefined') {
            console.error('D3.js library is not loaded.');
            return;
        }

        const svgEl = document.getElementById('tree-svg');
        if (!svgEl) return;

        // Clear previous SVG contents
        d3.select(svgEl).selectAll('*').remove();
        svg = d3.select(svgEl);

        // Zoomable master canvas group
        gCanvas = svg.append('g').attr('class', 'tree-canvas');
        gLinks = gCanvas.append('g').attr('class', 'links-group');
        gNodes = gCanvas.append('g').attr('class', 'nodes-group');

        // Setup Zoom behavior
        zoomBehavior = d3.zoom()
            .scaleExtent([0.15, 3.5])
            .on('zoom', (event) => {
                gCanvas.attr('transform', event.transform);
            });

        svg.call(zoomBehavior);

        // Map solution path steps
        const allNodes = searchResult.generatedNodes.slice(0, 800);
        const solutionPath = searchResult.solutionPath || [];
        const solutionStepMap = new Map();
        solutionPath.forEach((s, idx) => solutionStepMap.set(s.id, idx));

        goalNodeId = solutionPath.length > 0 ? solutionPath[solutionPath.length - 1].id : null;
        exploredNodeIds = new Set((searchResult.exploredNodes || []).map(n => n.id));

        // Annotate nodes with solution metadata and calculate step appearance
        allNodes.forEach(node => {
            if (solutionStepMap.has(node.id)) {
                node.isSolutionPath = true;
                node.solutionStepIndex = solutionStepMap.get(node.id);
            } else {
                node.isSolutionPath = false;
                node.solutionStepIndex = null;
            }
            node.isGoal = (node.id === goalNodeId);
        });

        // Convert flat array into D3 Stratified Hierarchy
        try {
            rootHierarchy = d3.stratify()
                .id(d => d.id)
                .parentId(d => d.parentId)
                (allNodes);
        } catch (err) {
            console.warn('Stratify error:', err);
            return;
        }

        // Apply D3 Tree Layout for stable, jitter-free node coordinates
        const treeLayout = d3.tree()
            .nodeSize([DX, DY])
            .separation((a, b) => (a.parent === b.parent ? 1.05 : 1.25));

        treeLayout(rootHierarchy);

        // Assign step appearance timeline:
        // Root appears at step 0
        // Children of node at step k appear when that node is expanded (step k + 1)
        rootHierarchy.each(d => {
            d.data._hNode = d;
            if (!d.parent) {
                d.data.appearStep = 0;
            } else if (d.parent.data.isSolutionPath) {
                d.data.appearStep = d.parent.data.solutionStepIndex + 1;
            } else {
                d.data.appearStep = (d.parent.data.appearStep !== undefined ? d.parent.data.appearStep : 0) + 1;
            }
        });

        allHierarchyNodes = rootHierarchy.descendants();
        allHierarchyLinks = rootHierarchy.links();
    }

    /**
     * Dynamically reveals nodes and edges that have sprouted up to currentStep.
     * Uses smooth enter/exit animations for newly revealed/hidden elements.
     * @param {number} currentStep Active playback step index
     * @param {boolean} animate Whether to animate growth
     */
    function updateVisibleTree(currentStep, animate = true) {
        if (!gCanvas || allHierarchyNodes.length === 0) return;

        // Filter nodes & links that exist at currentStep
        const visibleNodesData = allHierarchyNodes.filter(d => d.data.appearStep <= currentStep);
        const visibleNodeIds = new Set(visibleNodesData.map(d => d.data.id));
        const visibleLinksData = allHierarchyLinks.filter(
            d => visibleNodeIds.has(d.source.data.id) && visibleNodeIds.has(d.target.data.id)
        );

        // --- 1. Links Join ---
        const links = gLinks.selectAll('path.tree-link')
            .data(visibleLinksData, d => `${d.source.data.id}-${d.target.data.id}`);

        // Helper to check if a link is part of the traversed solution path
        const isLinkOnTraversedSolution = (d) => {
            if (!d.source.data.isSolutionPath || !d.target.data.isSolutionPath) return false;
            const targetStep = d.target.data.solutionStepIndex;
            return typeof targetStep === 'number' && targetStep <= currentStep;
        };

        // Enter Links (sprout smoothly from parent node coordinates)
        const linksEnter = links.enter()
            .append('path')
            .attr('class', d => isLinkOnTraversedSolution(d) ? 'tree-link link-solution' : 'tree-link')
            .attr('id', d => `link-${d.source.data.id}-${d.target.data.id}`)
            .attr('d', d => {
                const p = { x: d.source.x, y: d.source.y };
                return linkGenerator({ source: p, target: p });
            })
            .style('opacity', 0);

        if (animate) {
            linksEnter.transition().duration(320).ease(d3.easeCubicOut)
                .style('opacity', 1)
                .attr('d', linkGenerator);
        } else {
            linksEnter.style('opacity', 1).attr('d', linkGenerator);
        }

        // Update Links
        const allVisibleLinks = linksEnter.merge(links);
        allVisibleLinks
            .attr('class', d => isLinkOnTraversedSolution(d) ? 'tree-link link-solution' : 'tree-link');

        // Exit Links
        if (animate) {
            links.exit().transition().duration(200).style('opacity', 0).remove();
        } else {
            links.exit().remove();
        }

        // --- 2. Nodes Join ---
        const nodes = gNodes.selectAll('g.tree-node')
            .data(visibleNodesData, d => d.data.id);

        // Enter Nodes (sprout smoothly from parent node)
        const nodesEnter = nodes.enter()
            .append('g')
            .attr('class', d => getNodeClassNames(d.data))
            .attr('id', d => `tree-node-${d.data.id}`)
            .attr('transform', d => {
                const p = d.parent || d;
                return `translate(${p.x}, ${p.y}) scale(0.2)`;
            })
            .style('opacity', 0)
            .on('click', (event, d) => {
                event.stopPropagation();
                handleNodeClick(d.data);
            });

        // Append Node Visuals
        appendNodeVisualElements(nodesEnter);

        if (animate) {
            nodesEnter.transition().duration(360).ease(d3.easeBackOut.overshoot(1.15))
                .style('opacity', 1)
                .attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
        } else {
            nodesEnter.style('opacity', 1).attr('transform', d => `translate(${d.x}, ${d.y}) scale(1)`);
        }

        // Update All Nodes (merge enter and update selections)
        const allVisibleNodes = nodesEnter.merge(nodes);
        allVisibleNodes
            .attr('class', d => getNodeClassNames(d.data))
            .classed('node-selected', d => selectedNodeData && selectedNodeData.id === d.data.id);

        // Exit Nodes
        if (animate) {
            nodes.exit().transition().duration(200)
                .style('opacity', 0)
                .attr('transform', d => {
                    const p = d.parent || d;
                    return `translate(${p.x}, ${p.y}) scale(0.2)`;
                })
                .remove();
        } else {
            nodes.exit().remove();
        }
    }

    /**
     * Appends miniature 3x3 board, labels, cards, and glow rings to entering nodes.
     */
    function appendNodeVisualElements(selection) {
        // Glowing Aura Ring for Current State & Goal
        selection.append('rect')
            .attr('class', 'tree-node-glow-ring')
            .attr('x', -NODE_WIDTH / 2 - 5)
            .attr('y', -NODE_HEIGHT / 2 - 5)
            .attr('width', NODE_WIDTH + 10)
            .attr('height', NODE_HEIGHT + 10)
            .attr('rx', 12)
            .attr('ry', 12);

        // Node Background Card
        selection.append('rect')
            .attr('class', 'tree-node-bg')
            .attr('x', -NODE_WIDTH / 2)
            .attr('y', -NODE_HEIGHT / 2)
            .attr('width', NODE_WIDTH)
            .attr('height', NODE_HEIGHT)
            .attr('rx', 8)
            .attr('ry', 8);

        // Node Header Pill (Action + Cost & Depth)
        const headerGroup = selection.append('g')
            .attr('transform', `translate(0, ${-NODE_HEIGHT / 2 + 12})`);

        headerGroup.append('text')
            .attr('class', 'tree-node-action')
            .attr('text-anchor', 'middle')
            .text(d => d.data.action || 'ROOT');

        headerGroup.append('text')
            .attr('class', 'tree-node-meta')
            .attr('text-anchor', 'middle')
            .attr('y', 11)
            .text(d => `g:${d.data.cost} · d:${d.data.depth}`);

        // Mini 3x3 Puzzle Grid inside Node
        selection.append('g')
            .attr('transform', `translate(0, ${-NODE_HEIGHT / 2 + 28})`)
            .each(function (d) {
                renderSvgMiniGrid(d3.select(this), d.data.state);
            });
    }

    /**
     * Renders a 3x3 miniature puzzle board inside an SVG group.
     */
    function renderSvgMiniGrid(selection, state) {
        if (!Array.isArray(state) || state.length !== 9) return;

        const tileSize = 20;
        const gap = 2;
        const totalGridWidth = 3 * tileSize + 2 * gap; // 64px
        const startX = -totalGridWidth / 2;
        const startY = 0;

        for (let i = 0; i < 9; i++) {
            const val = state[i];
            const row = Math.floor(i / 3);
            const col = i % 3;
            const x = startX + col * (tileSize + gap);
            const y = startY + row * (tileSize + gap);

            // Tile Rectangle
            selection.append('rect')
                .attr('class', val === 0 ? 'tree-tile-rect tile-blank' : 'tree-tile-rect')
                .attr('x', x)
                .attr('y', y)
                .attr('width', tileSize)
                .attr('height', tileSize)
                .attr('rx', 3)
                .attr('ry', 3);

            // Tile Number Text (omit for blank tile)
            if (val !== 0) {
                selection.append('text')
                    .attr('class', 'tree-tile-text')
                    .attr('x', x + tileSize / 2)
                    .attr('y', y + tileSize / 2)
                    .text(val);
            }
        }
    }

    /**
     * Computes CSS class list for a tree node based on search status and solution path.
     */
    function getNodeClassNames(nodeData) {
        const classes = ['tree-node'];
        const status = deriveNodeStatusAtStep(nodeData);

        if (status) {
            classes.push(`status-${status}`);
        }

        if (selectedNodeData && selectedNodeData.id === nodeData.id) {
            classes.push('node-selected');
        }

        return classes.join(' ');
    }

    /**
     * Derives real-time search status (current, explored, frontier, goal, solution) at activePlaybackIndex.
     */
    function deriveNodeStatusAtStep(nodeData) {
        if (!searchResult) return 'frontier';

        const solutionPath = searchResult.solutionPath || [];
        const lastStepIndex = solutionPath.length > 0 ? solutionPath.length - 1 : 0;
        const isGoalReached = (activePlaybackIndex >= lastStepIndex);

        // 1. Goal Node: ONLY the goal node is green ('goal') once reached
        if (nodeData.isGoal && isGoalReached) {
            return 'goal';
        }

        // 2. Current Active Playback Node: Glowing Cyan
        if (nodeData.isSolutionPath && nodeData.solutionStepIndex === activePlaybackIndex) {
            return (nodeData.isGoal && isGoalReached) ? 'goal' : 'current';
        }

        // 3. Solution Path Nodes visited before activePlaybackIndex:
        // Expanded nodes along the solution path are Blue ('explored')
        if (nodeData.isSolutionPath && typeof nodeData.solutionStepIndex === 'number' && nodeData.solutionStepIndex < activePlaybackIndex) {
            return 'explored';
        }

        // 4. Check if this node has actually expanded any visible children into the tree:
        // A node is 'explored' (Blue) ONLY if its children have sprouted into the visible tree.
        const hNode = nodeData._hNode;
        const hasVisibleChildren = hNode && Array.isArray(hNode.children) && hNode.children.some(c => c.data.appearStep <= activePlaybackIndex);
        if (hasVisibleChildren) {
            return 'explored';
        }

        // 5. Otherwise, this is an unexpanded candidate leaf node in the current tree:
        // Always Amber / Orange ('frontier')!
        return 'frontier';
    }

    /**
     * Synchronizes tree node highlights and dynamic growth with playback index.
     * @param {number} stepIndex
     */
    function updateStep(stepIndex) {
        const isDifferent = (activePlaybackIndex !== stepIndex);
        activePlaybackIndex = stepIndex;

        // Dynamically update revealed nodes and links
        updateVisibleTree(stepIndex, isDifferent);

        // Smoothly glide camera and zoom into active solution node
        focusOnSolutionNode(stepIndex, 380);
    }

    /**
     * Smoothly pans and zooms the SVG camera to frame the active solution path node and its children.
     * @param {number} stepIndex
     * @param {number} [duration=380]
     */
    function focusOnSolutionNode(stepIndex, duration = 380) {
        if (!svg || !zoomBehavior || allHierarchyNodes.length === 0) return;
        const svgEl = document.getElementById('tree-svg');
        if (!svgEl) return;

        // Find the node corresponding to active playback step
        const targetNode = allHierarchyNodes.find(
            d => d.data.isSolutionPath && d.data.solutionStepIndex === stepIndex
        ) || allHierarchyNodes[0];

        if (!targetNode) return;

        const rect = svgEl.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 500;

        // Comfortable zoom level to keep mini 3x3 boards crisp and visible
        const k = 0.95;

        // Center horizontally; place node vertically at 35% so children below are in full view
        const targetX = width / 2 - targetNode.x * k;
        const targetY = height * 0.35 - targetNode.y * k;

        svg.transition()
            .duration(duration)
            .ease(d3.easeCubicInOut)
            .call(
                zoomBehavior.transform,
                d3.zoomIdentity.translate(targetX, targetY).scale(k)
            );
    }

    /**
     * Auto-fits the visible tree layout within the SVG viewport bounds.
     * @param {number} [duration=400]
     */
    function fitToViewport(duration = 400) {
        if (!svg || !zoomBehavior || allHierarchyNodes.length === 0) return;
        const svgEl = document.getElementById('tree-svg');
        if (!svgEl) return;

        const containerRect = svgEl.getBoundingClientRect();
        const width = containerRect.width || 800;
        const height = containerRect.height || 500;

        // Fit currently visible nodes
        const visibleNodes = allHierarchyNodes.filter(d => d.data.appearStep <= activePlaybackIndex);
        const nodesToFit = visibleNodes.length > 0 ? visibleNodes : allHierarchyNodes;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodesToFit.forEach(d => {
            if (d.x < minX) minX = d.x;
            if (d.x > maxX) maxX = d.x;
            if (d.y < minY) minY = d.y;
            if (d.y > maxY) maxY = d.y;
        });

        // Add padding around tree
        minX -= NODE_WIDTH;
        maxX += NODE_WIDTH;
        minY -= NODE_HEIGHT;
        maxY += NODE_HEIGHT;

        const treeWidth = maxX - minX;
        const treeHeight = maxY - minY;
        if (treeWidth <= 0 || treeHeight <= 0) return;

        const scale = Math.min(1.5, Math.max(0.18, 0.88 / Math.max(treeWidth / width, treeHeight / height)));
        const translateX = width / 2 - (minX + treeWidth / 2) * scale;
        const scaledHeight = treeHeight * scale;
        const translateY = (scaledHeight < height)
            ? (height - scaledHeight) / 2 - minY * scale
            : 35 - minY * scale;

        const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
        svg.transition().duration(duration).call(zoomBehavior.transform, transform);
    }

    /**
     * Handles clicking a node to inspect its metadata without altering the solver's playback.
     */
    function handleNodeClick(nodeData) {
        selectedNodeData = nodeData;

        // Re-apply selected class
        if (gNodes) {
            gNodes.selectAll('g.tree-node')
                .classed('node-selected', d => d.data.id === nodeData.id);
        }

        // Open inspection panel with node metadata
        const panel = document.getElementById('tree-node-details');
        if (!panel) return;

        panel.classList.remove('d-none');

        const elId = document.getElementById('tree-detail-id');
        const elStatus = document.getElementById('tree-detail-status');
        const elAction = document.getElementById('tree-detail-action');
        const elCost = document.getElementById('tree-detail-cost');
        const elDepth = document.getElementById('tree-detail-depth');
        const elParent = document.getElementById('tree-detail-parent');
        const btnJump = document.getElementById('btn-tree-jump-step');

        if (elId) elId.textContent = `Node #${nodeData.id}`;
        if (elAction) elAction.textContent = `Action: ${nodeData.action || 'ROOT'}`;
        if (elCost) elCost.textContent = `Cost g(n): ${nodeData.cost}`;
        if (elDepth) elDepth.textContent = `Depth: ${nodeData.depth}`;
        if (elParent) elParent.textContent = `Parent: ${nodeData.parentId ? '#' + nodeData.parentId : 'None (Root)'}`;

        const status = deriveNodeStatusAtStep(nodeData);
        if (elStatus) {
            elStatus.textContent = status ? status.toUpperCase() : 'UNKNOWN';
            elStatus.className = 'badge ' + (
                status === 'current' ? 'bg-info' :
                status === 'goal' ? 'bg-success' :
                status === 'explored' ? 'bg-primary' :
                status === 'frontier' ? 'bg-warning text-dark' : 'bg-secondary'
            );
        }

        // Show "Jump Solver to Step" button only if node lies on the solution path
        if (btnJump) {
            if (nodeData.isSolutionPath && typeof nodeData.solutionStepIndex === 'number') {
                btnJump.classList.remove('d-none');
                btnJump.textContent = `Jump Solver to Step ${nodeData.solutionStepIndex}`;
            } else {
                btnJump.classList.add('d-none');
            }
        }
    }

    /**
     * Closes the node detail panel.
     */
    function closeDetailPanel() {
        const panel = document.getElementById('tree-node-details');
        if (panel) panel.classList.add('d-none');

        selectedNodeData = null;
        if (gNodes) {
            gNodes.selectAll('g.tree-node').classed('node-selected', false);
        }
    }

    /**
     * Resets tree visualizer state back to empty.
     */
    function reset() {
        searchResult = null;
        activePlaybackIndex = 0;
        selectedNodeData = null;
        allHierarchyNodes = [];
        allHierarchyLinks = [];
        closeDetailPanel();

        const placeholder = document.getElementById('tree-placeholder');
        const svgEl = document.getElementById('tree-svg');

        if (placeholder) placeholder.classList.remove('d-none');
        if (svgEl) {
            svgEl.classList.add('d-none');
            if (typeof d3 !== 'undefined') d3.select(svgEl).selectAll('*').remove();
        }
    }

    return {
        init,
        render,
        updateStep,
        reset,
        fitToViewport,
        focusOnSolutionNode
    };
}));
