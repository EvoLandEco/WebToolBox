// JavaScript logic in an external file

function newwickvisShowLength() {
    const checkbox = document.getElementById('newickvis-showLengthCheckbox');
    return checkbox.checked;
}

function newickvisDrawRadialTree(d3, data, cluster, setRadius, innerRadius, maxLength, setColor, outerRadius, width, linkExtensionConstant, linkConstant, linkExtensionVariable, linkVariable) {
    const root = d3.hierarchy(data, d => d.branchset)
        .sum(d => d.branchset ? 0 : 1)
        .sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));

    cluster(root);
    setRadius(root, root.data.length = 0, innerRadius / maxLength(root));
    setColor(root);

    const svg = d3.create("svg")
        .attr("viewBox", [-outerRadius, -outerRadius, width, width])
        .attr("font-family", "sans-serif")
        .attr("font-size", 10);

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

// Function to extract unique subclades (traverse multiple times to ensure all instances are found)
function newickvisGetUniqueSubclades(data) {
    const subclades = new Set();
    let hasNoSubclade = false;

    function extractSubclades(node) {
        if (node.name && node.name.includes("_subclade")) {
            subclades.add(node.name);
        }
        if (node.branchset) {
            node.branchset.forEach(child => extractSubclades(child));
        }
    }

    // Traverse the tree multiple times to ensure all subclades are captured
    let nodesToVisit = [data];
    while (nodesToVisit.length > 0) {
        const nextLevel = [];
        nodesToVisit.forEach(node => {
            extractSubclades(node);
            if (node.branchset) {
                nextLevel.push(...node.branchset);
            }
        });
        nodesToVisit = nextLevel;
    }

    return Array.from(subclades);
}

// Function to render subclade checkboxes and set up event listeners
function newickvisRenderSubcladeControls(subclades, updateChartColors) {
    const container = document.getElementById('newickvis-subclade-controls');
    container.innerHTML = ''; // Clear any previous content

    subclades.forEach(subclade => {
        const displayName = subclade.replace("_subclade", ""); // Remove the "_subclade" suffix
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="newickvis-subclade-checkbox" value="${subclade}" checked> ${displayName}`;
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
    });

    // Set up event listeners for each checkbox
    document.querySelectorAll('.newickvis-subclade-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateChartColors);
    });
}

// Function to update the color domains based on selected subclades
function newickvisUpdateColorsBasedOnSelection(data) {
    const selectedSubclades = Array.from(document.querySelectorAll('.newickvis-subclade-checkbox:checked')).map(cb => cb.value);

    // Update the color function based on selected subclades
    const color = d3.scaleOrdinal()
        .domain(selectedSubclades)
        .range(d3.schemeCategory10.slice(0, selectedSubclades.length));

    const setColor = function setColor(d) {
        if (selectedSubclades.includes(d.data.name)) {
            d.color = color(d.data.name);
        } else if (d.parent) {
            d.color = d.parent.color;
        }
        if (d.children) d.children.forEach(setColor);
    };

    // Re-render the tree with updated colors and legend
    newickvisRenderTree(data, setColor);
    newickvisRenderLegend(selectedSubclades, color);
}

// Function to update the legend based on selected subclades
function newickvisUpdateLegendBasedOnSelection(selectedSubclades, color) {
    return function(svg) {
        // Clear the existing legend
        svg.selectAll(".legend").remove();

        // Create a new legend
        const legendGroup = svg.append("g").attr("class", "legend");

        const legendItems = legendGroup.selectAll("g")
            .data(selectedSubclades)
            .join("g")
            .attr("transform", (d, i) => `translate(${-300},${-200 + i * 20})`);

        legendItems.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", d => color(d));

        legendItems.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .text(d => d.replace("_subclade", "")); // Remove the "_subclade" suffix in the legend
    };
}

// Function to render the chart
function newickvisRenderTree(data, setColor) {
    const width = 954;
    const outerRadius = width / 2;
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
    const chart = newickvisDrawRadialTree(d3, data, cluster, setRadius, innerRadius, maxLength, setColor, outerRadius, width, linkExtensionConstant, linkConstant, linkExtensionVariable, linkVariable);

    // Append the chart to the body
    document.getElementById('newickvis-chart').appendChild(chart);

    // Add event listener to the checkbox to toggle branch length
    const checkbox = document.getElementById('newickvis-showLengthCheckbox');
    checkbox.addEventListener('change', () => {
        chart.newickvisUpdate(checkbox.checked);
    });
}

function newickvisRenderLegend(clades, color) {
    // Remove any previous legend
    d3.select("#newickvis-legend").selectAll("*").remove();

    // Compute the legend dimensions
    const width = 200;
    const height = (clades.length + 1) * 20; // Add one more entry for "Unclassified"

    // Create the legend
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

    const legend = svg.selectAll(".newickvis-legend")
        .data([...clades, "Unclassified"]) // Add the additional legend entry
        .enter().append("g")
        .attr("class", "newickvis-legend")
        .attr("transform", (d, i) => `translate(0,${i * 20})`);

    legend.append("rect")
        .attr("x", 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", d => d === "Unclassified" ? "#000" : color(d)); // Default color for non-subclade

    legend.append("text")
        .attr("x", 40)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(d => d.replace("_subclade", "")); // Display the subclade name or the default text

    // Append the legend to the body
    document.getElementById('newickvis-legend').appendChild(svg.node());
}

// Load and parse the data
async function newickvisLoadData(defaultFile = true) {
    let newickText;

    if (defaultFile) {
        const response = await fetch('../files/example_phylo.txt'); // Update the file path as necessary
        newickText = await response.text();
    } else {
        const fileInput = document.getElementById('newickvis-fileInput');
        const file = fileInput.files[0];
        if (!file) {
            alert("Please select a file.");
            return;
        }
        newickText = await file.text();
    }

    const data = newickvisParseNewick(newickText);

    // Extract unique subclades and render checkboxes
    const subclades = newickvisGetUniqueSubclades(data);
    newickvisRenderSubcladeControls(subclades, () => newickvisUpdateColorsBasedOnSelection(data));

    // Initially render the tree with the default color scheme
    newickvisUpdateColorsBasedOnSelection(data);
}

// Parse Newick format function
function newickvisParseNewick(a) {
    for (var e = [], r = {}, s = a.split(/\s*(;|\(|\)|,|:)\s*/), t = 0; t < s.length; t++) {
        var n = s[t];
        switch (n) {
            case "(":
                var c = {};
                r.branchset = [c], e.push(r), r = c;
                break;
            case ",":
                var c = {};
                e[e.length - 1].branchset.push(c), r = c;
                break;
            case ")":
                r = e.pop();
                break;
            case ":":
                break;
            default:
                var h = s[t - 1];
                ")" == h || "(" == h || "," == h ? r.name = n : ":" == h && (r.length = parseFloat(n))
        }
    }
    return r;
}

// Load the default tree when the page loads
window.onload = () => {
    newickvisLoadData();

    // Add event listener for file upload
    const fileInput = document.getElementById('newickvis-fileInput');
    fileInput.addEventListener('change', () => {
        const newickvisShowLengthCheckbox = document.getElementById('newickvis-showLengthCheckbox');
        newickvisShowLengthCheckbox.checked = false;
        loadData(false)
    });
};

// Reference to the checkbox for toggling the legend visibility
const newickvistoggleLegendCheckbox = document.getElementById('newickvis-toggleLegendCheckbox');
const newickLegend = document.getElementById('newickvis-legend');
const newickChart = document.getElementById('newickvis-chart');

// Event listener to toggle the legend and resize the chart
newickvistoggleLegendCheckbox.addEventListener('change', function () {
    if (newickvistoggleLegendCheckbox.checked) {
        newickLegend.classList.remove('hidden');
        newickChart.classList.remove('expanded');
    } else {
        newickLegend.classList.add('hidden');
        newickChart.classList.add('expanded');
    }
});
