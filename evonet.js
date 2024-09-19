// Get the size of the container dynamically
function getGraphContainerSize() {
    const container = document.getElementById('graph-container');
    return {
        width: container.clientWidth,
        height: container.clientHeight
    };
}

let { width, height } = getGraphContainerSize();

// Initialize node ID counter and data arrays.
let nodeId = 1;
let nodes = [{ id: nodeId, active: true, mutated: false, birthTime: 0, extinctTime: -1 }];
let links = [];
let activeNodes = [nodes[0]]; // Start with the root node as the only active node.
let simulationStep = 0;
let maxSteps = parseInt(document.getElementById('maxSteps').value);
let simulationInterval = null; // To store the interval ID
let isRunning = false;

// Select the graph container and append the SVG to it.
const svg = d3.select("#graph-container").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto;");

// Initialize the force simulation with adjusted parameters.
const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(1))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("collision", d3.forceCollide().radius(15))
    .force("center", d3.forceCenter())
    .force("x", d3.forceX())
    .force("y", d3.forceY());

// Initialize link and node elements.
let link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("line");

// Change the node selection to 'g' elements to group circle and text together
let node = svg.append("g")
    .attr("stroke-width", 1.5)
    .selectAll("g");

// Function to update the graph based on the current data.
function updateGraph() {
    // Update links.
    link = link.data(links, d => `${d.source.id}-${d.target.id}`);
    link.exit().remove();
    link = link.enter().append("line").merge(link);

    // Update nodes.
    node = node.data(nodes, d => d.id);
    node.exit().remove();

    // Enter new nodes as 'g' elements
    const nodeEnter = node.enter().append("g")
        .call(drag(simulation));

    // Append circles to the 'g' elements with increased radius
    nodeEnter.append("circle")
        .attr("r", 10);

    // Append text to the 'g' elements with increased font size
    nodeEnter.append("text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(d => d.id)
        .style("fill", "white") // Adjust text color if needed
        .style("font-size", "12px"); // Increased font size

    // Append titles to the 'g' elements
    nodeEnter.append("title")
        .text(d => `Node ${d.id}${d.mutated ? " (mutated)" : ""}`);

    node = nodeEnter.merge(node);

    // Update the fill color based on the node's active and mutated status.
    node.select("circle")
        .attr("fill", d => d.active ? (d.mutated ? "red" : "black") : "gray")
        .attr("stroke", d => d.mutated ? "pink" : "white");

    // Update and restart the simulation.
    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();
}

// Simulation tick function to update positions.
simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    // Update the position of the node groups
    node.attr("transform", d => `translate(${d.x},${d.y})`);
});

// Random event simulation function.
function simulateStep() {
    if (activeNodes.length === 0) {
        console.log("No active nodes left. Stopping simulation.");
        pauseSimulation();
        return;
    }

    const events = ['birth', 'birth+mutation', 'extinction'];
    const eventProbabilities = [birthRate, mutateRate, deathRate]; // Probabilities for each event
    const event = randomChoice(events, eventProbabilities);

    if (event === 'birth' || event === 'birth+mutation') {
        // Randomly sample an active node.
        const parent = randomChoice(activeNodes);
        nodeId += 1;
        const newNode = {
            id: nodeId,
            active: true,
            mutated: event === 'birth+mutation',
            birthTime: simulationStep,
            extinctTime: -1
        };
        nodes.push(newNode);
        activeNodes.push(newNode);
        links.push({ source: parent.id, target: newNode.id });
    } else if (event === 'extinction') {
        // Randomly sample an active node to become extinct.
        const nodeToExtinct = randomActiveNode();

        if (nodeToExtinct) {
            nodeToExtinct.active = false;
            nodeToExtinct.extinctTime = simulationStep;
            activeNodes = activeNodes.filter(n => n.id !== nodeToExtinct.id);
        }
    }

    // Update the graph with new data.
    updateGraph();

    // Build L table and get accumulated mutations
    mstep = parseInt(document.getElementById('mstep').value) || 0;
    let { lTable, nodeAccumulatedMutations, coarsenedNodes, coarsenedLinks } = buildLTable(mstep);
    lastLTable = lTable; // Store for later use
    lastNodeAccumulatedMutations = nodeAccumulatedMutations; // Store for later use
    lastCoarsenedNodes = coarsenedNodes;
    lastCoarsenedLinks = coarsenedLinks;

    // Build trait table
    let traitModel = document.getElementById('traitModel').value;
    let traitDimension = parseInt(document.getElementById('traitDimensions').value) || 2;
    let nodeTraits = buildTraitTable(lastNodeAccumulatedMutations, traitModel);

    // First plot the trait data
    plotTraits(nodeTraits, traitDimension);

    // Now plot current data as newick tree
    plotCurrentData();

    // And plot the coarsened graph
    plotCoarsenedGraph(lastCoarsenedNodes, lastCoarsenedLinks);
}

// Randomly selects an active node (to ensure extinction can happen on active nodes only).
function randomActiveNode() {
    if (activeNodes.length === 0) return null;
    return randomChoice(activeNodes);
}

// Utility function to select a random item with optional probabilities.
function randomChoice(items, probabilities) {
    if (!probabilities) {
        return items[Math.floor(Math.random() * items.length)];
    }
    const cumulative = [];
    let sum = 0;
    for (let p of probabilities) {
        sum += p;
        cumulative.push(sum);
    }
    const r = Math.random() * sum;
    for (let i = 0; i < cumulative.length; i++) {
        if (r < cumulative[i]) {
            return items[i];
        }
    }
}

// Drag behavior functions.
function drag(simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

// Start or resume the simulation.
function startResumeSimulation() {
    if (isRunning) return;

    maxSteps = parseInt(document.getElementById('maxSteps').value);

    simulationInterval = d3.interval(() => {
        if (simulationStep >= maxSteps) {
            pauseSimulation();
            return;
        }
        simulateStep();
        simulationStep++;
    }, 1000); // Adjust the interval as needed.

    isRunning = true;
    toggleButtons();
}

// Stop the simulation (pause).
function pauseSimulation() {
    if (simulationInterval) {
        simulationInterval.stop();
        isRunning = false;
        toggleButtons();
    }
}

// Reset the simulation to its initial state.
function resetSimulation() {
    // Clear existing graph and reinitialize nodes and links.
    nodeId = 1;
    nodes = [{ id: nodeId, active: true, mutated: false, birthTime: 0, extinctTime: -1 }];
    links = [];
    activeNodes = [nodes[0]];
    simulationStep = 0;

    updateGraph();
    pauseSimulation(); // Ensure it's in a paused state.
    toggleButtons(true); // Set to initial state with "Start" enabled.

    // Clear the trait table display
    document.getElementById('trait-container').innerHTML = '';

    // Clear the coarsened graph display
    document.getElementById('coarsened-graph-container').innerHTML = '';

    // Clear the Newick visualization
    document.getElementById('plot-container').innerHTML = '';
}

// Toggle button states based on the simulation status.
function toggleButtons(isInitial = false) {
    document.getElementById('startButton').disabled = isRunning;
    document.getElementById('pauseButton').disabled = !isRunning;
}

// Initialize the graph.
updateGraph();

// Event listeners for the buttons.
document.getElementById('startButton').addEventListener('click', startResumeSimulation);
document.getElementById('pauseButton').addEventListener('click', pauseSimulation);
document.getElementById('resetButton').addEventListener('click', resetSimulation);

// Initialize the state to be ready for the first start.
toggleButtons(true);

function buildLTable(mstep) {
    // Initialize L table and coarsened graph data
    let lTable = [];
    let lTableIds = {}; // mapping from simulation node ids to L table ids
    let nodeAccumulatedMutations = {}; // mapping from node ids to accumulated mutations
    let coarsenedNodes = []; // Nodes in the coarsened graph
    let coarsenedLinks = []; // Links in the coarsened graph

    // Build child map for traversal
    let childMap = {};
    links.forEach(link => {
        let sourceId = link.source.id || link.source;
        let targetId = link.target.id || link.target;
        if (!childMap[sourceId]) {
            childMap[sourceId] = [];
        }
        childMap[sourceId].push(targetId);
    });

    // Assign initial L table id for node 1
    lTableIds[1] = 1; // initial node has L table id 1

    // First row of L table
    let initialNode = nodes.find(n => n.id === 1);
    lTable.push({
        eventTime: initialNode.birthTime,
        parentId: 0,
        childId: lTableIds[1],
        extinctTime: initialNode.extinctTime
    });

    // Add initial node to coarsened graph
    coarsenedNodes.push({ id: 1, active: initialNode.active, mutated: initialNode.mutated });

    // Initialize nodeAccumulatedMutations for the initial node
    nodeAccumulatedMutations[1] = 1; // Starting with 1 as per your instructions

    // Start traversal from node 1
    traverse(1, lTableIds[1], 0, lTableIds[1], 1, 0, 1);

    // Function to traverse the tree
    function traverse(nodeId, parentLTableId, mutationsEncountered, lastRecordedLTableId, accumulatedMutations, accumulatedMutationsInPath, parentInCoarsenedGraph) {
        let node = nodes.find(n => n.id === nodeId);

        if (mstep === 0) {
            // Assign L table id
            lTableIds[nodeId] = nodeId;

            // Record accumulated mutations
            nodeAccumulatedMutations[nodeId] = accumulatedMutations;

            // Record entry in L table
            if (nodeId !== 1) { // Skip initial node since it's already added
                lTable.push({
                    eventTime: node.birthTime,
                    parentId: parentLTableId,
                    childId: lTableIds[nodeId],
                    extinctTime: node.extinctTime
                });
            }

            // Add this node to coarsened graph
            if (nodeId !== 1) {
                coarsenedNodes.push({ id: nodeId, active: node.active, mutated: node.mutated });
                coarsenedLinks.push({ source: parentInCoarsenedGraph, target: nodeId });
                parentInCoarsenedGraph = nodeId; // Update for children
            }

            // Traverse the children
            if (childMap[nodeId]) {
                childMap[nodeId].forEach(childId => {
                    traverse(childId, lTableIds[nodeId], mutationsEncountered, lTableIds[nodeId], accumulatedMutations + 1, accumulatedMutationsInPath, parentInCoarsenedGraph);
                });
            }
        } else {
            // mstep > 0
            let newMutationsEncountered = mutationsEncountered;
            if (node.mutated) {
                newMutationsEncountered += 1;
            }

            let shouldRecord = false;

            if (node.mutated && newMutationsEncountered === mstep) {
                shouldRecord = true;
                newMutationsEncountered = 0; // Reset counter after recording
            }

            if (shouldRecord) {
                // Assign L table id
                lTableIds[nodeId] = nodeId;

                // Record accumulated mutations
                nodeAccumulatedMutations[nodeId] = accumulatedMutationsInPath + 1;

                // Record entry in L table
                lTable.push({
                    eventTime: node.birthTime,
                    parentId: lastRecordedLTableId,
                    childId: lTableIds[nodeId],
                    extinctTime: node.extinctTime
                });

                // Add this node to coarsened graph
                coarsenedNodes.push({ id: nodeId, active: node.active, mutated: node.mutated });
                coarsenedLinks.push({ source: parentInCoarsenedGraph, target: nodeId });
                parentInCoarsenedGraph = nodeId;

                lastRecordedLTableId = lTableIds[nodeId];
                accumulatedMutationsInPath = 0; // Reset after recording
            } else {
                accumulatedMutationsInPath += node.mutated ? 1 : 0;
            }

            // Traverse the children
            if (childMap[nodeId]) {
                childMap[nodeId].forEach(childId => {
                    traverse(childId, parentLTableId, newMutationsEncountered, lastRecordedLTableId, accumulatedMutations, accumulatedMutationsInPath, parentInCoarsenedGraph);
                });
            }
        }
    }

    // Sort the L table based on the childId (third column)
    lTable.sort((a, b) => a.childId - b.childId);

    // Return the L table, the accumulated mutations, and the coarsened graph
    return { lTable, nodeAccumulatedMutations, coarsenedNodes, coarsenedLinks };
}

// Store a global trait table
let previousNodeTraits = {};

function buildTraitTable(nodeAccumulatedMutations, model) {
    let traitDimension = parseInt(document.getElementById('traitDimensions').value) || 2;

    // Ensure traitDimension is between 1 and 6
    traitDimension = Math.min(Math.max(traitDimension, 1), 6);

    // Define the variance for the step size (slight deviation from 1)
    const variance = 0.1; // You can adjust this to increase or decrease the variance

    // For new trait values or nodes that don't have a record in `previousNodeTraits`
    let nodeTraits = Object.assign({}, previousNodeTraits); // Start with previous values

    // For each node, perform the trait change model
    for (let nodeId in nodeAccumulatedMutations) {
        // Check if the nodeId already has traits in the existing `nodeTraits`
        if (!nodeTraits.hasOwnProperty(nodeId)) {
            let steps = nodeAccumulatedMutations[nodeId];
            let coordinate = Array(traitDimension).fill(0); // Start from the origin for new nodes

            if (model === 'brownian') {
                // Brownian Motion model
                for (let i = 0; i < steps; i++) {
                    // Randomly select a dimension
                    let dim = Math.floor(Math.random() * traitDimension);
                    
                    // Randomly decide to increment or decrement, with a small variance on top of 1
                    let delta = (Math.random() < 0.5 ? -1 : 1) * (1 + (Math.random() * variance * 2 - variance));
                    
                    // Update the coordinate
                    coordinate[dim] += delta;
                }
            } else {
                // Implement other models here
            }

            // Store the result in nodeTraits for new nodes
            nodeTraits[nodeId] = coordinate;
        }
    }

    // Update global `previousNodeTraits` so we keep the results for future calls
    previousNodeTraits = nodeTraits;

    return nodeTraits;
}

// Function to display the L table using DataTables
function displayLTable(lTable) {
    let container = document.getElementById('lTableContainer');
    container.innerHTML = ''; // Clear previous content

    // Create a table element with the required structure
    let table = document.createElement('table');
    table.id = 'lTable';
    table.className = 'display'; // DataTables requires the 'display' class

    let thead = document.createElement('thead');
    let headerRow = document.createElement('tr');

    ['Event Time', 'Parent ID', 'Child ID', 'Extinct Time'].forEach(text => {
        let th = document.createElement('th');
        th.innerText = text;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    let tbody = document.createElement('tbody');
    lTable.forEach(entry => {
        let row = document.createElement('tr');
        let cellEventTime = document.createElement('td');
        cellEventTime.innerText = entry.eventTime;
        let cellParentId = document.createElement('td');
        cellParentId.innerText = entry.parentId;
        let cellChildId = document.createElement('td');
        cellChildId.innerText = entry.childId;
        let cellExtinctTime = document.createElement('td');
        cellExtinctTime.innerText = entry.extinctTime;

        row.appendChild(cellEventTime);
        row.appendChild(cellParentId);
        row.appendChild(cellChildId);
        row.appendChild(cellExtinctTime);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Apply DataTables to the table
    $(document).ready(function () {
        $('#lTable').DataTable({
            paging: true,
            searching: true,
            ordering: true,
            info: true
        });
    });
}


function LTableToNewick(LTable, age, pruneExtinct) {
    // Make a deep copy of the LTable to avoid modifying the original
    let L2 = JSON.parse(JSON.stringify(LTable));

    // Order L2 based on the absolute value of Child ID
    L2.sort((a, b) => Math.abs(a.childId) - Math.abs(b.childId));

    // Set the Event Time of the first row to -1
    L2[0].eventTime = -1;

    // Compute tend for each row
    L2.forEach(row => {
        row.tend = (row.extinctTime === -1) ? age : row.extinctTime;
    });

    // Remove extinctTime from L2
    L2.forEach(row => {
        delete row.extinctTime;
    });

    // Build linlist
    let linlist = L2.map(row => {
        return {
            eventTime: row.eventTime,
            parentId: row.parentId,
            childId: row.childId,
            label: 't' + Math.abs(row.childId),
            tend: row.tend
        };
    });

    let done = false;
    while (!done) {
        // Find index j of the row with maximum eventTime
        let j = linlist.reduce((maxIndex, row, index, arr) => {
            return row.eventTime > arr[maxIndex].eventTime ? index : maxIndex;
        }, 0);

        let parent = linlist[j].parentId;
        // Find index where childId equals parent
        let parentj = linlist.findIndex(row => row.childId === parent);

        if (parentj !== -1) {
            // Build spec1 and spec2
            let spec1 = linlist[parentj].label + ':' + (linlist[parentj].tend - linlist[j].eventTime);
            let spec2 = linlist[j].label + ':' + (linlist[j].tend - linlist[j].eventTime);
            // Update parent row
            linlist[parentj].label = '(' + spec1 + ',' + spec2 + ')';
            linlist[parentj].tend = linlist[j].eventTime;
            // Remove row j
            linlist.splice(j, 1);
        } else {
            // Update linlist[j] with the row from L2 where childId equals parent
            let parentRow = L2.find(row => row.childId === parent);
            if (parentRow) {
                linlist[j].eventTime = parentRow.eventTime;
                linlist[j].parentId = parentRow.parentId;
                linlist[j].childId = parentRow.childId;
            } else {
                // If parent not found, break the loop
                done = true;
            }
        }

        if (linlist.length === 1) {
            done = true;
        }
    }

    // Append root length and semicolon
    let newickString = linlist[0].label + ':' + linlist[0].tend + ';';

    if (pruneExtinct) {
        // Parse the Newick string
        let treeData = parseNewick(newickString);

        // Collect labels of extinct species
        let extinctLabels = LTable.filter(row => row.extinctTime !== -1)
            .map(row => 't' + Math.abs(row.childId));

        // Remove extinct tips from the tree
        treeData = pruneTree(treeData, extinctLabels);

        // Serialize back to Newick string
        newickString = serializeNewick(treeData) + ';';
    }

    return newickString;
}

function pruneTree(node, labelsToRemove) {
    if (!node) return null;

    // If node is a tip
    if (!node.branchset || node.branchset.length === 0) {
        // If node.name is in labelsToRemove, return null to prune
        if (labelsToRemove.includes(node.name)) {
            return null;
        } else {
            return node;
        }
    }

    // If node has branches
    let newBranches = [];
    for (let child of node.branchset) {
        let prunedChild = pruneTree(child, labelsToRemove);
        if (prunedChild) {
            newBranches.push(prunedChild);
        }
    }

    // If after pruning, no branches remain, return null to prune this node
    if (newBranches.length === 0) {
        return null;
    }

    // Otherwise, set the new branchset
    node.branchset = newBranches;
    return node;
}

function serializeNewick(node) {
    if (!node) return '';

    let result = '';

    if (node.branchset && node.branchset.length > 0) {
        let childrenStr = node.branchset.map(child => serializeNewick(child)).join(',');
        result += '(' + childrenStr + ')';
    }

    if (node.name) {
        result += node.name;
    }

    if (node.length !== undefined) {
        result += ':' + node.length;
    }

    return result;
}



function parseNewick(a) {
    for (var e = [], r = {}, s = a.split(/\s*(;|\(|\)|,|:)\s*/), t = 0; t < s.length; t++) {
        var n = s[t];
        switch (n) {
            case "(":
                var c = {};
                r.branchset = [c];
                e.push(r);
                r = c;
                break;
            case ",":
                var c = {};
                e[e.length - 1].branchset.push(c);
                r = c;
                break;
            case ")":
                r = e.pop();
                break;
            case ":":
                break;
            default:
                var h = s[t - 1];
                ")" == h || "(" == h || "," == h ? r.name = n : ":" == h && (r.length = parseFloat(n));
        }
    }
    return r;
}

function newwickvisShowLength() {
    const checkbox = document.getElementById('newickvis-showLengthCheckbox');
    return checkbox.checked;
}

function newickvisDrawRadialTree(d3, data, cluster, setRadius, innerRadius, maxLength, outerRadius, width, linkExtensionConstant, linkConstant, linkExtensionVariable, linkVariable) {
    const root = d3.hierarchy(data, d => d.branchset)
        .sum(d => d.branchset ? 0 : 1)
        .sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));

    cluster(root);
    setRadius(root, root.data.length = 0, innerRadius / maxLength(root));

    const svg = d3.create("svg")
        .attr("id", "newickvis-chart")
        .attr("viewBox", [-outerRadius, -outerRadius, outerRadius * 2, outerRadius * 2]) // Adjust to fit chart within the container
        .attr("width", width) // Ensure SVG scales to fit the full container width
        .attr("font-family", "sans-serif")
        .attr("font-size", 40);

    svg.append("style").text(`
        .link--active {
            stroke: #000 !important;
            stroke-width: 1.5px;
            filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.5));
        }
        .link-extension--active {
            stroke-opacity: .6;
            stroke-width: 1.5px;
            stroke-dasharray: 3,2;
        }
        .label--active {
            font-weight: bold;
        }`
    );

    const linkExtension = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-opacity", 0.25)
        .selectAll("path")
        .data(root.links().filter(d => !d.target.children))
        .join("path")
        .each(function (d) { d.target.linkExtensionNode = this; })
        .attr("d", linkExtensionConstant);

    const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .selectAll("path")
        .data(root.links())
        .join("path")
        .each(function (d) { d.target.linkNode = this; })
        .attr("d", linkConstant)
        .attr("stroke", d => d.target.color);

    svg.append("g")
        .selectAll("text")
        .data(root.leaves())
        .join("text")
        .attr("dy", ".31em")
        .attr("transform", d => `rotate(${d.x - 90}) translate(${innerRadius + 4},0)${d.x < 180 ? "" : " rotate(180)"}`)
        .attr("text-anchor", d => d.x < 180 ? "start" : "end")
        .text(d => d.data.name.replace(/_/g, " "))
        .on("mouseover", newickvisMouseovered(true))
        .on("mouseout", newickvisMouseovered(false));

    function newickvisUpdate(checked) {
        const t = d3.transition().duration(750);
        linkExtension.transition(t).attr("d", checked ? linkExtensionVariable : linkExtensionConstant);
        link.transition(t).attr("d", checked ? linkVariable : linkConstant);
    }

    function newickvisMouseovered(active) {
        return function (event, d) {
            d3.select(this).classed("label--active", active);
            d3.select(d.linkExtensionNode).classed("link-extension--active", active).raise();
            do d3.select(d.linkNode).classed("link--active", active).raise();
            while (d = d.parent);
        };
    }

    return Object.assign(svg.node(), { newickvisUpdate });
}

function plotCurrentData() {
    let age = simulationStep;

    // Get the value of pruneExtinct checkbox
    let pruneExtinct = document.getElementById('pruneExtinct').checked;

    // Get the value of showBranchLengths checkbox
    let showBranchLengths = document.getElementById('showBranchLengths').checked;

    // Get the updated mstep value
    let mstep = parseInt(document.getElementById('mstep').value) || 0;

    // Rebuild the L table and accumulated mutations based on the new mstep
    let { lTable, nodeAccumulatedMutations } = buildLTable(mstep);
    lastLTable = lTable; // Update the lastLTable

    let newickString;

    // Check if L table has only one row
    if (lTable.length === 1) {
        // If there's only one node, use a fixed Newick format string for a single node with 0 branch length
        newickString = "(t1:0);"; // Newick string for one node with no branch length
    } else {
        // Convert L table to Newick string
        newickString = LTableToNewick(lastLTable, age, pruneExtinct);
    }

    // Parse Newick string back into a dataset
    let newickData = parseNewick(newickString);

    // Display the L table
    // displayLTable(lTable);

    // Plot the data, passing the showBranchLengths parameter
    plotNewickData(newickData, showBranchLengths);
}


function plotNewickData(data, showBranchLengths) {
    let plotContainer = document.getElementById('plot-container');

    // Function to get plot container size
    function getPlotContainerSize() {
        return {
            width: plotContainer.clientWidth,
            height: plotContainer.clientHeight
        };
    }

    let { width, height } = getPlotContainerSize();

    // Remove any previous chart
    let existingChart = plotContainer.querySelector('#newickvis-chart');
    if (existingChart) {
        plotContainer.removeChild(existingChart);
    }

    const outerRadius = width * 1.4;
    const innerRadius = outerRadius - 170;
    const cluster = d3.cluster()
        .size([360, innerRadius])
        .separation((a, b) => 1);

    const maxLength = function maxLength(d) {
        return d.data.length + (d.children ? d3.max(d.children, maxLength) : 0);
    };

    const setRadius = function setRadius(d, y0, k) {
        d.radius = (y0 += d.data.length) * k;
        if (d.children) d.children.forEach(d => setRadius(d, y0, k));
    };

    // Link helper functions
    const linkStep = function linkStep(startAngle, startRadius, endAngle, endRadius) {
        const c0 = Math.cos(startAngle = (startAngle - 90) / 180 * Math.PI);
        const s0 = Math.sin(startAngle);
        const c1 = Math.cos(endAngle = (endAngle - 90) / 180 * Math.PI);
        const s1 = Math.sin(endAngle);
        return "M" + startRadius * c0 + "," + startRadius * s0
            + (endAngle === startAngle ? "" : "A" + startRadius + "," + startRadius + " 0 0 " + (endAngle > startAngle ? 1 : 0) + " " + startRadius * c1 + "," + startRadius * s1)
            + "L" + endRadius * c1 + "," + endRadius * s1;
    };

    const linkConstant = function linkConstant(d) {
        return linkStep(d.source.x, d.source.y, d.target.x, d.target.y);
    };

    const linkExtensionConstant = function linkExtensionConstant(d) {
        return linkStep(d.target.x, d.target.y, d.target.x, innerRadius);
    };

    const linkVariable = function linkVariable(d) {
        return linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius);
    };

    const linkExtensionVariable = function linkExtensionVariable(d) {
        return linkStep(d.target.x, d.target.radius, d.target.x, innerRadius);
    };

    // Remove any previous chart
    d3.select("#newickvis-chart").selectAll("*").remove();

    // Create the chart
    lastChart = newickvisDrawRadialTree(d3, data, cluster, setRadius, innerRadius, maxLength, outerRadius, width, linkExtensionConstant, linkConstant, linkExtensionVariable, linkVariable);

    // Append the chart to the body
    plotContainer.appendChild(lastChart);

    lastChart.newickvisUpdate(showBranchLengths);
}

// Function to get the size of the container dynamically
function getCoarsenedGraphContainerSize() {
    const container = document.getElementById('coarsened-graph-container');
    return {
        width: container.clientWidth,
        height: container.clientHeight
    };
}

// Function to plot the coarsened graph
function plotCoarsenedGraph(coarsenedNodes, coarsenedLinks) {
    // Clear the plot container
    let plotContainer = document.getElementById('coarsened-graph-container');
    plotContainer.innerHTML = ''; // Clear any previous content

    // Get dynamic container size
    let { width, height } = getCoarsenedGraphContainerSize();

    // Create SVG for the coarsened graph
    const svg = d3.select('#coarsened-graph-container').append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-width / 2, -height / 2, width, height])
        .attr('style', 'max-width: 100%; height: auto;');

    // Initialize simulation for the coarsened graph
    const coarsenedSimulation = d3.forceSimulation(coarsenedNodes)
        .force('link', d3.forceLink(coarsenedLinks).id(d => d.id).distance(100).strength(1))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('collision', d3.forceCollide().radius(15))
        .force('center', d3.forceCenter())
        .force('x', d3.forceX())
        .force('y', d3.forceY());

    // Initialize link and node elements for the coarsened graph
    let link = svg.append('g')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .selectAll('line')
        .data(coarsenedLinks)
        .enter().append('line');

    let node = svg.append('g')
        .attr('stroke-width', 1.5)
        .selectAll('g')
        .data(coarsenedNodes)
        .enter().append('g')
        .call(drag(coarsenedSimulation));

    // Append circles to the 'g' elements with increased radius for coarsened nodes
    node.append('circle')
        .attr('r', 10)
        .attr('fill', d => d.active ? (d.mutated ? 'red' : 'black') : 'gray')
        .attr('stroke', d => d.mutated ? 'pink' : 'white');

    // Append text to the 'g' elements for coarsened nodes
    node.append('text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .text(d => d.id)
        .style('fill', 'white')
        .style('font-size', '12px');

    // Simulation tick function for the coarsened graph
    coarsenedSimulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag behavior function for the coarsened graph nodes
    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
}
// Function to plot traits based on their dimensions
function plotTraits(nodeTraits, traitDimension) {
    let plotContainer = document.getElementById('trait-container');
    console.log(nodeTraits);
    // Function to get plot container size
    function getPlotContainerSize() {
        return {
            width: plotContainer.clientWidth,
            height: plotContainer.clientHeight
        };
    }

    let { width, height } = getPlotContainerSize();

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const colors = d3.scaleOrdinal(d3.schemeCategory10); // Unique colors for nodes

    // Clear the trait container for a fresh plot
    const container = d3.select("#trait-container");
    container.selectAll("*").remove();

    // Create the SVG canvas
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Set up scales
    const xScale = d3.scaleLinear()
        .domain([-10, 10]) // Customize the domain based on expected trait values
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([-10, 10]) // Customize the domain based on expected trait values
        .range([height, 0]);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale));

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Create circles for nodes with unique colors and transition
    const nodes = Object.keys(nodeTraits).map(nodeId => ({
        id: nodeId,
        traits: nodeTraits[nodeId]
    }));

    if (traitDimension === 1) {
        // Plot on the X-axis
        svg.selectAll("circle")
            .data(nodes, d => d.id)
            .join("circle")
            .attr("cx", d => xScale(d.traits[0]))
            .attr("cy", yScale(0)) // All nodes are on the Y=0 line
            .attr("r", 5)
            .attr("fill", d => colors(d.id))
            .transition() // Apply animation
            .duration(1000)
            .attr("cx", d => xScale(d.traits[0]));

    } else if (traitDimension === 2) {
        // Plot on a 2D plane
        svg.selectAll("circle")
            .data(nodes, d => d.id)
            .join("circle")
            .attr("cx", d => xScale(d.traits[0]))
            .attr("cy", d => yScale(d.traits[1]))
            .attr("r", 5)
            .attr("fill", d => colors(d.id))
            .transition() // Apply animation
            .duration(1000)
            .attr("cx", d => xScale(d.traits[0]))
            .attr("cy", d => yScale(d.traits[1]));

    } else {
        // For trait dimensions > 2, apply dimension reduction (e.g., PCA)
        // Perform basic PCA (Principal Component Analysis)
        const pcaData = performPCA(nodes.map(d => d.traits), 2);

        console.log(pcaData);
        // Plot the reduced PCA values
        svg.selectAll("circle")
            .data(nodes.map((node, i) => ({
                id: node.id,
                traits: pcaData[i]
            })))
            .join("circle")
            .attr("cx", d => xScale(d.traits[0]))
            .attr("cy", d => yScale(d.traits[1]))
            .attr("r", 5)
            .attr("fill", d => colors(d.id))
            .transition() // Apply animation
            .duration(1000)
            .attr("cx", d => xScale(d.traits[0]))
            .attr("cy", d => yScale(d.traits[1]));
    }
}

function performPCA(data, numComponents = 2) {
    const matrix = numeric.transpose(data);
    console.log(matrix);
    const svdResult = numeric.svd(matrix);
    const U = svdResult.U;
    const S = svdResult.S;
    const V = svdResult.V;

    // Select the top components (principal components)
    const topComponents = V.slice(0, numComponents).map(row => row.slice(0, numComponents));

    // Project data onto the top principal components
    const reducedData = numeric.dot(data, numeric.transpose(topComponents));

    return reducedData;
}

// Add global variables to store the last L table and accumulated mutations
let lastLTable = null;
let lastNodeAccumulatedMutations = null;

// Event listener for the Prune Extinct Lineages checkbox
document.getElementById('pruneExtinct').addEventListener('change', () => {
    // Re-plot the data without advancing simulation step
    if (lastLTable && lastNodeAccumulatedMutations) {
        plotCurrentData();
    }
});

let lastChart = null;

// Event listener for the Show Branch Lengths checkbox
document.getElementById('showBranchLengths').addEventListener('change', () => {
    // Re-plot the data without advancing simulation step
    if (lastLTable && lastNodeAccumulatedMutations && lastChart) {
        // Get the current state of the checkbox
        let showBranchLengths = document.getElementById('showBranchLengths').checked;
        lastChart.newickvisUpdate(showBranchLengths);
    }
});

// Event listener for the mstep input field
document.getElementById('mstep').addEventListener('input', () => {
    // Re-plot the data when mstep changes
    if (lastLTable && lastNodeAccumulatedMutations) {
        plotCurrentData();
    }
});

// Event listener for the trait model selection
document.getElementById('traitModel').addEventListener('change', () => {
    // Re-plot the data when trait model changes
    if (lastLTable && lastNodeAccumulatedMutations) {
        plotCurrentData();
    }
});

// Event listener for the trait dimensions input field
document.getElementById('traitDimensions').addEventListener('input', () => {
    // Re-plot the data when trait dimensions change
    if (lastLTable && lastNodeAccumulatedMutations) {
        plotCurrentData();
    }
});

// Declare global data variables for coarsened graph
let lastCoarsenedNodes = null;
let lastCoarsenedLinks = null;

// Event listener for the coarsen level input field
document.getElementById('mstep').addEventListener('change', () => {
    // Re-plot the data when coarsen level changes
    let mstep = parseInt(document.getElementById('mstep').value) || 0;
    if (lastCoarsenedNodes && lastCoarsenedLinks) {
        let { lTable, nodeAccumulatedMutations, coarsenedNodes, coarsenedLinks } = buildLTable(mstep);
        lastCoarsenedNodes = coarsenedNodes;
        lastCoarsenedLinks = coarsenedLinks;
        plotCoarsenedGraph(lastCoarsenedNodes, lastCoarsenedLinks);
    }
});

// Event listener for the sliders controlling rates
const birthRateSlider = document.getElementById('birthRate');
const mutateRateSlider = document.getElementById('mutateRate');
const deathRateSlider = document.getElementById('deathRate');

const birthRateValue = document.getElementById('birthRateValue');
const mutateRateValue = document.getElementById('mutateRateValue');
const deathRateValue = document.getElementById('deathRateValue');

let birthRate = parseFloat(birthRateSlider.value);
let mutateRate = parseFloat(mutateRateSlider.value);
let deathRate = parseFloat(deathRateSlider.value);

birthRateSlider.addEventListener('input', function () {
    birthRateValue.textContent = parseFloat(birthRateSlider.value).toFixed(2);
    birthRate = parseFloat(birthRateSlider.value);
});

mutateRateSlider.addEventListener('input', function () {
    mutateRateValue.textContent = parseFloat(mutateRateSlider.value).toFixed(2);
    mutateRate = parseFloat(mutateRateSlider.value);
});

deathRateSlider.addEventListener('input', function () {
    deathRateValue.textContent = parseFloat(deathRateSlider.value).toFixed(2);
    deathRate = parseFloat(deathRateSlider.value);
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        plotCurrentData(); // Re-render plot after resizing ends
        updateGraph(); // Update graph after resizing ends
    }, 10); // Adjust delay as needed
});