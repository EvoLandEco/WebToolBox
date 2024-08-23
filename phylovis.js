    // Define colors for nodes, edges, and labels corresponding to LaTeX tikz colors
    const rootNodeColor = "#80b3ff"; // Blue!50 -> Light Blue
    const internalNodeColor = "#ffd699"; // Orange!50 -> Light Orange
    const tipNodeColor = "#b3ff99"; // Lime!50 -> Light Lime Green
    const edgeColor = "black";
    const nodeLabelColor = "black";
    const edgeLabelColor = "gray";

    const nodeSize = 30; // Increase node size

    var network, nodesDataSet, edgesDataSet;

    document.getElementById('treeForm').addEventListener('submit', function(event) {
        event.preventDefault();
        var T = parseInt(document.getElementById('tipCount').value);
        generateYuleTree(T);
    });

    function generateYuleTree(T) {
        var nodes = [];
        var edges = [];
        var nextNodeId = 1;
        var nextEdgeId = 1;

        // Initialize tree with the root node
        nodes.push({ id: nextNodeId,
            label: `n${nextNodeId}`,
            shape: "circle",
            color: rootNodeColor,
            font: { color: nodeLabelColor },
            size: nodeSize,
        });

        var activeLineages = [nextNodeId];
        nextNodeId++;
        var currentTipCount = 1;

        while (currentTipCount < T) {
            // Randomly select a lineage to split
            var lineageIndex = Math.floor(Math.random() * activeLineages.length);
            var parent = activeLineages[lineageIndex];

            // Remove the selected lineage from active lineages
            activeLineages.splice(lineageIndex, 1);

            // Add two new nodes as children of the selected lineage
            var child1 = nextNodeId++;
            var child2 = nextNodeId++;

            nodes.push({ id: child1, label: `n${child1}`, shape: "circle", color: internalNodeColor, font: { color: nodeLabelColor }, size: nodeSize });
            nodes.push({ id: child2, label: `n${child2}`, shape: "circle", color: internalNodeColor, font: { color: nodeLabelColor }, size: nodeSize });

            edges.push({ from: parent, to: child1, label: `e${nextEdgeId++}`, font: { align: 'top', color: edgeLabelColor }, color: edgeColor });
            edges.push({ from: parent, to: child2, label: `e${nextEdgeId++}`, font: { align: 'top', color: edgeLabelColor }, color: edgeColor });

            // Add the new nodes to the active lineages
            activeLineages.push(child1, child2);

            // Increment the tip count
            currentTipCount += 1;
        }

        // Update tip nodes (those that are still in activeLineages)
        activeLineages.forEach(nodeId => {
            nodes = nodes.map(node =>
                node.id === nodeId
                    ? { ...node, shape: "circle", color: tipNodeColor }
                    : node
            );
        });

        // Set all edge colors to black
        edges.forEach((edge) => {
            edge.color = edgeColor;
        });

        // Relabel nodes starting with tip nodes, then root, then internal nodes
        var tipNodes = nodes.filter(node => node.color === tipNodeColor);
        var rootNode = nodes.find(node => node.color === rootNodeColor);
        var internalNodes = nodes.filter(node => node.color === internalNodeColor);

        var newLabelIndex = 1;

        tipNodes.forEach(node => {
            node.label = `n${newLabelIndex++}`;
        });

        if (rootNode) {
            rootNode.label = `n${newLabelIndex++}`;
        }

        internalNodes.forEach(node => {
            node.label = `n${newLabelIndex++}`;
        });

        // Update network data with sorted tip nodes
        nodesDataSet = new vis.DataSet([...tipNodes, rootNode, ...internalNodes]);
        edgesDataSet = new vis.DataSet(edges);

        var container = document.getElementById("mynetwork");
        var data = {
            nodes: nodesDataSet,
            edges: edgesDataSet,
        };
        var options = {
            layout: {
                hierarchical: {
                    direction: "UD",
                    sortMethod: "directed",
                    levelSeparation: 80,
                },
            },
            edges: {
                arrows: {
                    to: { enabled: true, scaleFactor: 1, type: "vee" },
                },
                chosen: {
                    edge: changeChosenEdge,
                },
            },
            nodes: {
                font: {
                    align: 'center',
                },
                chosen: {
                    node: changeChosenNode,
                },
            },
            interaction: {
                hover: true,
            },
        };
        network = new vis.Network(container, data, options);

        // Update adjacency list
        updateAdjacencyList(edges, nodesDataSet);
        // Update node features list
        updateNodeFeaturesList(edges, nodesDataSet);

        // Set up hover event listeners for the network
        network.on('hoverEdge', function(params) {
            highlightEdgeInLists(params.edge, true);
            // Set the edge to a new group
            edgesDataSet.update({ id: params.edge, group: 'highlight-edges' });
            // Set the edge to a new color
            edgesDataSet.update({ id: params.edge, color: 'yellow' });
        });

        network.on('blurEdge', function(params) {
            highlightEdgeInLists(params.edge, false);
            // Reset the edge group
            edgesDataSet.update({ id: params.edge, group: undefined });
            // Reset the edge color
            edgesDataSet.update({ id: params.edge, color: edgeColor });
        });

        network.on('hoverNode', function(params) {
            highlightNodeInLists(params.node, true);
            highlightNodeInNetwork(params.node, true);
        });

        network.on('blurNode', function(params) {
            highlightNodeInLists(params.node, false);
            highlightNodeInNetwork(params.node, false);
        });
    }

    // Function to update the adjacency list
    function updateAdjacencyList(edges, nodesDataSet) {
        const adjacencyList = {};
        let maxWidth = 0;

        // Calculate the max width for node labels
        nodesDataSet.forEach(node => {
            const nodeWidth = getTextWidth(node.label, '18px monospace');
            if (nodeWidth > maxWidth) {
                maxWidth = nodeWidth;
            }
        });

        edges.forEach(edge => {
            const fromNode = nodesDataSet.get(edge.from);
            const toNode = nodesDataSet.get(edge.to);
            const edgeLabel = `<span class="edge-label">${edge.label}</span>`;
            const colon = `<span class="colon">:</span>`;
            const fromLabel = `<span id="node-${fromNode.id}" class="node-container node-label-${fromNode.id}" style="color:${fromNode.color}; width:${maxWidth}px">${fromNode.label}</span>`;
            const comma = `<span class="brackets">,</span>`;
            const toLabel = `<span id="node-${toNode.id}" class="node-container node-label-${toNode.id}" style="color:${toNode.color}; width:${maxWidth}px">${toNode.label}</span>`;
            const brackets = `<span class="brackets">[</span>${fromLabel}${comma}${toLabel}<span class="brackets">]</span>`;

            adjacencyList[edge.id] = `<div id="row-${edge.id}" class="row-container">${edgeLabel}${colon}${brackets}</div>`;
        });

        let listString = '';
        Object.keys(adjacencyList).forEach(key => {
            listString += adjacencyList[key];
        });

        document.getElementById('adjacency-list').innerHTML = listString;

        // Add hover listeners to the adjacency list containers
        addHoverListenersToAdjacencyList();
    }

    // Function to update the node features list
    function updateNodeFeaturesList(edges, nodesDataSet) {
        const nodeFeaturesList = {};
        let maxWidth = 0;

        // Calculate the max width for edge labels
        edges.forEach(edge => {
            const edgeWidth = getTextWidth(edge.label, '18px monospace');
            if (edgeWidth > maxWidth) {
                maxWidth = edgeWidth;
            }
        });

        nodesDataSet.forEach(node => {
            const incomingEdge = edges.find(edge => edge.to === node.id);
            const outgoingEdges = edges.filter(edge => edge.from === node.id);

            const ancestorEdge = incomingEdge ? incomingEdge.label : '0';
            const daughterEdge1 = outgoingEdges[0] ? outgoingEdges[0].label : '0';
            const daughterEdge2 = outgoingEdges[1] ? outgoingEdges[1].label : '0';

            // Get node and edge colors
            const nodeColor = node.color || node.color.background;
            const edgeColor1 = incomingEdge ? edgeColor : 'gray'; // default to gray if no edge
            const edgeColor2 = outgoingEdges[0] ? edgeColor : 'gray';
            const edgeColor3 = outgoingEdges[1] ? edgeColor : 'gray';

            // Generate HTML with appropriate colors
            const edgeLabel1 = `<span id="edge-${incomingEdge ? incomingEdge.id : '0'}" class="edge-container" style="width:${maxWidth}px; color:${edgeColor1}">${ancestorEdge}</span>`;
            const edgeLabel2 = `<span id="edge-${outgoingEdges[0] ? outgoingEdges[0].id : '0'}" class="edge-container" style="width:${maxWidth}px; color:${edgeColor2}">${daughterEdge1}</span>`;
            const edgeLabel3 = `<span id="edge-${outgoingEdges[1] ? outgoingEdges[1].id : '0'}" class="edge-container" style="width:${maxWidth}px; color:${edgeColor3}">${daughterEdge2}</span>`;
            const colon = `<span class="colon">:</span>`;
            const brackets = `<span class="brackets">[</span>${edgeLabel1}<span class="brackets">,</span>${edgeLabel2}<span class="brackets">,</span>${edgeLabel3}<span class="brackets">]</span>`;

            nodeFeaturesList[node.id] = `<div id="node-feature-${node.id}" class="row-container">
            <span class="node-label" style="color:${nodeColor}">${node.label}</span>${colon}${brackets}</div>`;
        });

        let listString = '';
        Object.keys(nodeFeaturesList).forEach(key => {
            listString += nodeFeaturesList[key];
        });

        document.getElementById('node-features').innerHTML = listString;

        // Add hover listeners to the node features list containers
        addHoverListenersToNodeFeaturesList();
    }

    // Function to calculate text width
    function getTextWidth(text, font) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        context.font = font;
        const width = context.measureText(text).width;
        return width;
    }

    // Function to add hover listeners to the adjacency list containers
    function addHoverListenersToAdjacencyList() {
        // Hover listeners for rows (entire rows will highlight the corresponding edge)
        document.querySelectorAll('.row-container').forEach(container => {
            container.addEventListener('mouseenter', function() {
                const edgeId = container.id.replace('row-', '');
                highlightEdgeInNetwork(edgeId, true);
                highlightEdgeInLists(edgeId, true);
            });
            container.addEventListener('mouseleave', function() {
                const edgeId = container.id.replace('row-', '');
                highlightEdgeInNetwork(edgeId, false);
                highlightEdgeInLists(edgeId, false);
            });
        });

        // Hover listeners for nodes
        document.querySelectorAll('.node-container').forEach(container => {
            container.addEventListener('mouseenter', function() {
                const nodeId = container.id.replace('node-', '');
                // change node color to yellow
                highlightNodeInNetwork(nodeId, true);
                highlightNodeInLists(nodeId, true);
            });
            container.addEventListener('mouseleave', function() {
                const nodeId = container.id.replace('node-', '');
                highlightNodeInNetwork(nodeId, false);
                highlightNodeInLists(nodeId, false);
            });
        });
    }

    // Function to add hover listeners to the node features list containers
    function addHoverListenersToNodeFeaturesList() {
        // Hover listeners for rows (entire rows will highlight the corresponding node)
        document.querySelectorAll('.row-container').forEach(container => {
            container.addEventListener('mouseenter', function() {
                const nodeId = container.id.replace('node-feature-', '');
                highlightNodeInNetwork(nodeId, true);
                highlightNodeInLists(nodeId, true);
            });
            container.addEventListener('mouseleave', function() {
                const nodeId = container.id.replace('node-feature-', '');
                highlightNodeInNetwork(nodeId, false);
                highlightNodeInLists(nodeId, false);
            });
        });

        // Hover listeners for edges in node features
        document.querySelectorAll('.edge-container').forEach(container => {
            container.addEventListener('mouseenter', function() {
                const edgeId = container.id.replace('edge-', '');
                if (edgeId !== '0') {
                    highlightEdgeInNetwork(edgeId, true);
                    highlightEdgeInLists(edgeId, true);
                } else {
                    // Highlight the entire row if edge is 0 and disable row hover effect
                    const rowContainer = container.closest('.row-container');
                    rowContainer.classList.add('highlight-node-feature');
                    rowContainer.style.pointerEvents = 'none'; // Disable hover effect
                    highlightNodeInNetwork(rowContainer.id.replace('node-feature-', ''), true);
                    highlightNodeInLists(rowContainer.id.replace('node-feature-', ''), true);
                }
            });
            container.addEventListener('mouseleave', function() {
                const edgeId = container.id.replace('edge-', '');
                if (edgeId !== '0') {
                    highlightEdgeInNetwork(edgeId, false);
                    highlightEdgeInLists(edgeId, false);
                } else {
                    // Unhighlight the entire row if edge is 0 and re-enable row hover effect
                    const rowContainer = container.closest('.row-container');
                    rowContainer.classList.remove('highlight-node-feature');
                    rowContainer.style.pointerEvents = 'auto'; // Re-enable hover effect
                    highlightNodeInNetwork(rowContainer.id.replace('node-feature-', ''), false);
                    highlightNodeInLists(rowContainer.id.replace('node-feature-', ''), false);
                }
            });
        });
    }

    // Function to highlight or unhighlight an edge in both the adjacency list and node features list
    function highlightEdgeInLists(edgeId, highlight) {
        highlightEdgeInList(edgeId, highlight);
        highlightEdgeInNodeFeatures(edgeId, highlight);
    }

    // Function to highlight or unhighlight an edge in the adjacency list
    function highlightEdgeInList(edgeId, highlight) {
        const rowElement = document.getElementById(`row-${edgeId}`);
        if (rowElement) {
            if (highlight) {
                rowElement.classList.add('highlight');
            } else {
                rowElement.classList.remove('highlight');
            }
        }
    }

    // Function to highlight or unhighlight an edge in the node features list
    function highlightEdgeInNodeFeatures(edgeId, highlight) {
        const edgeElements = document.querySelectorAll(`.edge-container[id='edge-${edgeId}']`);
        edgeElements.forEach(element => {
            if (highlight) {
                element.classList.add('highlight');
            } else {
                element.classList.remove('highlight');
            }
        });
    }

    // Function to highlight or unhighlight node labels in both the adjacency list and node features list
    function highlightNodeInLists(nodeId, highlight) {
        highlightNodeInListLabels(nodeId, highlight);
        highlightNodeInNodeFeatures(nodeId, highlight);
    }

    // Function to highlight or unhighlight node labels in the adjacency list
    function highlightNodeInListLabels(nodeId, highlight) {
        const nodeElements = document.querySelectorAll(`.node-label-${nodeId}`);
        nodeElements.forEach(element => {
            if (highlight) {
                element.classList.add('label-highlight');
            } else {
                element.classList.remove('label-highlight');
            }
        });
    }

    // Function to highlight or unhighlight node labels in the node features list
    function highlightNodeInNodeFeatures(nodeId, highlight) {
        const rowElement = document.getElementById(`node-feature-${nodeId}`);
        if (rowElement) {
            if (highlight) {
                rowElement.classList.add('highlight-node-feature');
            } else {
                rowElement.classList.remove('highlight-node-feature');
                rowElement.classList.remove('highlight');
            }
        }
    }

    // Function to highlight or unhighlight an edge in the network
    function highlightEdgeInNetwork(edgeId, highlight) {
        const edgeOptions = highlight ? { color: { color: 'yellow' }, width: 3 } : { color: edgeColor, width: 1 };
        edgesDataSet.update({ id: edgeId, ...edgeOptions });
    }

    // Function to highlight or unhighlight a node in the network without altering the network structure
    function highlightNodeInNetwork(nodeId, highlight) {
        if (highlight) {
            network.selectNodes([nodeId], highlightEdges = false);
        } else {
            network.unselectAll();
        }
    }

    // Function to change the border dashes of a chosen node
    function changeChosenNode(values, id, selected, hovering) {
        values.borderDashes = [2, 2];
        values.borderColor = "blue";
        values.borderWidth = 2;
        values.shadowColor = "lightblue";
        values.shadowX = 0;
        values.shadowY = 0;
    }

    // Function to change the line dashes of a chosen edge
    function changeChosenEdge(values, id, selected, hovering) {
        values.dashes = [5, 5];
        values.edgeColor = "yellow";
    }

    // maintain a list of UD, LR, DU, RL,
    // create two functions for two rotation buttons (90 and -90) to change the layout by scrolling within the list
    var layoutList = ["UD", "LR", "DU", "RL"];
    var layoutIndex = 0;
    function rotateLayoutClockwise() {
        layoutIndex = (layoutIndex + 1) % layoutList.length;
        network.setOptions({
            layout: {
                hierarchical: {
                    direction: layoutList[layoutIndex],
                    sortMethod: "directed",
                },
            },
        });
    }

    function rotateLayoutCounterClockwise() {
        layoutIndex = (layoutIndex - 1 + layoutList.length) % layoutList.length;
        network.setOptions({
            layout: {
                hierarchical: {
                    direction: layoutList[layoutIndex],
                    sortMethod: "directed",
                },
            },
        });
    }