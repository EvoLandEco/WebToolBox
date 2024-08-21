var tempRaw = [];
var temp = [];
var rotatingGroup;
var staticGroup;
var tempRotateDegree = 0;
var lastRotateDegree = 0;
var tempYear = 2000;
var line;
var area
var x;
var y;
const tonePalette = d3.quantize(
    (t) => d3.interpolateLab("steelblue", "brown")(t),
    32
);
var pickedThemeTone;
var lighterThemeTone;
var darkerThemeTone;
const dataDisplaySize = "14px";
const dataDisplaySizeLarge = "17px";
const rotationOffsetZeroMark = 90;
metric = "avg";

async function initChart(tempYear) {

    // URL of the CSV file
    const csvUrl = "../files/sfo-temperature.csv";

    // Load the CSV file and wait for it to finish
    tempRaw = await d3.csv(csvUrl);

    temp = d3
        .groups(
            tempRaw,
            ({ DATE }) => {
                const date = new Date(DATE);
                return new Date(Date.UTC(2000, date.getUTCMonth(), date.getUTCDate()));// group by day of year
            }
        )
        .sort(([a], [b]) => d3.ascending(a, b)) // sort chronologically
        .map(([date, v]) => ({
            date,
            avg: d3.mean(v, (d) => d.TAVG || NaN),
            min: d3.mean(v, (d) => d.TMIN || NaN),
            max: d3.mean(v, (d) => d.TMAX || NaN),
            minmin: d3.min(v, (d) => d.TMIN || NaN),
            maxmax: d3.max(v, (d) => d.TMAX || NaN),
            minavg: d3.min(v, (d) => d.TAVG || NaN),
            maxavg: d3.max(v, (d) => d.TAVG || NaN)
        }))

    const width = 928;
    const height = width;
    const margin = width / 100;
    const innerRadius = width / 5;
    const outerRadius = width / 2 - margin;
    const nudgeTextStep = innerRadius * 0.13;
    const nudgeFromIcon = innerRadius * 0.1;
    const dataDisplayHPos = 0.41 * innerRadius;

    function getMonthFromDegree(degree) {
        // Ensure the degree is within the 0-360 range
        degree = degree % 360;
        if (degree < 0) degree += 360; // Handle negative degrees

        // List of months
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];

        // Calculate the corresponding month
        const monthIndex = Math.floor(degree / 30); // 30 degrees per month

        return months[monthIndex];
    }

    x = d3
        .scaleUtc()
        .domain([new Date("2000-01-01"), new Date("2001-01-01") - 1])
        .range([0, 2 * Math.PI]);

    y = d3
        .scaleRadial()
        .domain([d3.min(temp, (d) => d.minmin), d3.max(temp, (d) => d.maxmax)])
        .range([innerRadius, outerRadius]);

    line = d3
        .lineRadial()
        .curve(d3.curveLinearClosed)
        .angle((d) => x(d.date));

    area = d3
        .areaRadial()
        .curve(d3.curveLinearClosed)
        .angle((d) => x(d.date));


    const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "width: 100%; height: auto; font: 10px sans-serif;")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

    const gradient = svg.append("defs")
        .append("radialGradient")
        .attr("id", "line-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", "70.41%")

    gradient.append("stop")
        .attr("offset", "40%")
        .attr("stop-color", "steelblue");

    gradient.append("stop")
        .attr("offset", "60%")
        .attr("stop-color", "brown");

    // Group static elements
    staticGroup = svg.append("g");
    staticGroup
        .append("svg:defs")
        .attr("class", "arrow-defs")
        .selectAll("marker")
        .data(["end"]) // Different link/path types can be defined here
        .enter()
        .append("svg:marker") // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 0 448 512")
        .attr("refX", -45)
        .attr("refY", 256)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto-start-reverse")
        .append("svg:path")
        .attr(
            "d",
            "M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"
        );

    // Zero degree mark
    staticGroup
        .append("g")
        .attr("class", "zero-degree-mark")
        .selectAll()
        .data([x.ticks()[3]]) // At April
        .join("g")
        .each((d, i) => (d.id = uid("month")))
        .call((g) =>
            g
                .append("path")
                .attr("stroke-width", 4)
                .attr("stroke-opacity", 0.7)
                .attr("stroke-linecap", "butt")
                .attr("stroke-dasharray", [10, 5])
                .attr("marker-start", "url(#end)")
                .attr(
                    "d",
                    (d) => `
                        M${d3.pointRadial(
                        x(d),
                        outerRadius - 0.15 * (outerRadius - innerRadius)
                    )}
                        L${d3.pointRadial(x(d), outerRadius)}
                    `
                )
        )
        .call((g) =>
            g
                .append("path")
                .attr("class", "zero-degree-mark")
                .attr("stroke-width", 4)
                .attr("stroke-opacity", 0.7)
                .attr("stroke-linecap", "butt")
                .attr("stroke-dasharray", [10, 5])
                .attr("marker-start", "url(#end)")
                .attr(
                    "d",
                    (d) => `
                        M${d3.pointRadial(
                        x(d),
                        innerRadius + 0.15 * (outerRadius - innerRadius)
                    )}
                        L${d3.pointRadial(x(d), innerRadius)}
                    `
                )
        )
        .attr("transform", `rotate(0.5)`); // Fix misalignment

    // Y-axis
    staticGroup
        .append("g")
        .attr("text-anchor", "middle")
        .selectAll()
        .data(y.ticks(7).reverse())
        .join("g")
        .call((g) =>
            g
                .append("circle")
                .attr("fill", "none")
                .attr("stroke", "currentColor")
                .attr("stroke-opacity", 0.2)
                .attr("r", y)
        )
        .call((g) =>
            g
                .append("text")
                .attr("y", (d) => -y(d))
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("fill", "currentColor")
                .attr("paint-order", "stroke")
                .text((x, i) => `${x.toFixed(0)}${i ? "" : "°F"}`)
                .clone(true)
                .attr("y", (d) => y(d))
        )
        // Attach center data display to Y-axis object
        .call((g) =>
            g
                .append("text")
                .attr("class", "data-display-year")
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 -
                    4 * nudgeTextStep
                ) // Center the text vertically
                .attr("text-anchor", "middle") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("fill", "currentColor")
                .attr("paint-order", "stroke")
                .style("font-size", dataDisplaySizeLarge)
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "data-display-date")
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos +
                    nudgeFromIcon
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 -
                    2.5 * nudgeTextStep
                ) // Center the text vertically
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("fill", "currentColor")
                .attr("paint-order", "stroke")
                .style("font-size", dataDisplaySize)
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "data-display-avg")
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos +
                    nudgeFromIcon
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 -
                    1.5 * nudgeTextStep
                ) // Center the text vertically
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("fill", "currentColor")
                .attr("paint-order", "stroke")
                .style("font-size", dataDisplaySize)
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "data-display-min")
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos +
                    nudgeFromIcon
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 -
                    0.5 * nudgeTextStep
                ) // Center the text vertically
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("fill", "currentColor")
                .attr("paint-order", "stroke")
                .style("font-size", dataDisplaySize)
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "data-display-max")
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos +
                    nudgeFromIcon
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 +
                    0.5 * nudgeTextStep
                ) // Center the text vertically
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("fill", "currentColor")
                .attr("paint-order", "stroke")
                .style("font-size", dataDisplaySize)
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "data-display-minmin")
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos +
                    nudgeFromIcon
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 +
                    1.5 * nudgeTextStep
                ) // Center the text vertically
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("fill", "currentColor")
                .attr("paint-order", "stroke")
                .style("font-size", dataDisplaySize)
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "data-display-maxmax")
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos +
                    nudgeFromIcon
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 +
                    2.5 * nudgeTextStep
                ) // Center the text vertically
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 5)
                .attr("fill", "currentColor")
                .attr("paint-order", "stroke")
                .style("font-size", dataDisplaySize)
        )

        // Respective Font Awesome Icons
        .call((g) =>
            g
                .append("text")
                .attr("class", "fa-display-date")
                .attr("class", "fa") // Give it the font-awesome class
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 -
                    2.5 * nudgeTextStep
                )
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .style("font-size", dataDisplaySize)
                .text("\uf073")
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "fa-display-avg")
                .attr("class", "fa") // Give it the font-awesome class
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 -
                    1.5 * nudgeTextStep
                )
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .style("font-size", dataDisplaySize)
                .text("\uf2c9")
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "fa-display-min")
                .attr("class", "fa") // Give it the font-awesome class
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 -
                    0.5 * nudgeTextStep
                )
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .style("font-size", dataDisplaySize)
                .text("\uf76b")
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "fa-display-max")
                .attr("class", "fa") // Give it the font-awesome class
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 +
                    0.5 * nudgeTextStep
                )
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .style("font-size", dataDisplaySize)
                .text("\uf769")
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "fa-display-minmin")
                .attr("class", "fa") // Give it the font-awesome class
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 +
                    1.5 * nudgeTextStep
                )
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .style("font-size", dataDisplaySize)
                .text("\ue03f")
        )
        .call((g) =>
            g
                .append("text")
                .attr("class", "fa-display-maxmax")
                .attr("class", "fa") // Give it the font-awesome class
                .attr(
                    "x",
                    svg.node().getBBox().x +
                    svg.node().getBBox().width / 2 -
                    dataDisplayHPos
                ) // Center the text horizontally
                .attr(
                    "y",
                    svg.node().getBBox().y +
                    svg.node().getBBox().height / 2 +
                    2.5 * nudgeTextStep
                )
                .attr("text-anchor", "start") // Align the text to the center horizontally
                .attr("dominant-baseline", "middle") // Align the text to the center vertically
                .attr("dy", "0.35em")
                .style("font-size", dataDisplaySize)
                .text("\ue040")
        );

    // Group element to apply rotation
    rotatingGroup = svg.append("g");

    // Draw ribbon of historical extreme temperature range
    rotatingGroup.append("path")
        .attr("class", "ribbon-historical-extreme")
        .attr("fill-opacity", 0.2)
        .attr(
            "d",
            area.innerRadius((d) => y(d.minmin)).outerRadius((d) => y(d.maxmax))(temp)
        )

    // Draw ribbon of daily temperature range averaged across years
    rotatingGroup.append("path")
        .attr("class", "ribbon-daily-avg")
        .attr("fill-opacity", 0.2)
        .attr(
            "d",
            area.innerRadius((d) => y(d.min)).outerRadius((d) => y(d.max))(temp)
        )

    // Draw line of daily average temperature averaged across years
    rotatingGroup.append("path")
        .attr("class", "line-daily-avg")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "3,4")
        .attr("stroke-opacity", 0.7)
        .attr("d", line.radius((d) => y(d.avg))(temp))

    // Draw the month labels (X-axis)
    rotatingGroup.append("g")
        .selectAll()
        .data(x.ticks())
        .join("g")
        .each((d, i) => (d.id = uid("month")))
        .call((g) =>
            g.append("path")
                .attr("stroke", "#000")
                .attr("stroke-opacity", 0.2)
                .attr("d", (d) => `
                    M${d3.pointRadial(x(d), innerRadius)}
                    L${d3.pointRadial(x(d), outerRadius)}
                `)
        )
        .call((g) =>
            g.append("path")
                .attr("id", (d) => d.id.id)
                .datum((d) => [d, d3.utcMonth.offset(d, 1)])
                .attr("fill", "none")
                .attr("d", ([a, b]) => `
                    M${d3.pointRadial(x(a), innerRadius)}
                    A${innerRadius},${innerRadius} 0,0,1 ${d3.pointRadial(x(b), innerRadius)}
                `)
        )
        .call((g) =>
            g.append("text")
                .append("textPath")
                .attr("startOffset", 6)
                .attr("xlink:href", (d) => d.id.href)
                .text(d3.utcFormat("%B"))
        );

    rotatingGroup.append("g")
        .attr("text-anchor", "middle")
        .selectAll()
        .data(y.ticks(7).reverse())
        .join("g")
        .call((g) =>
            g.append("circle")
                .attr("fill", "none")
                .attr("stroke", "currentColor")
                .attr("stroke-opacity", 0.2)
                .attr("r", y)
        )

    updateTempPath(tempYear, metric);  // Draw the initial temperature line
    updateTempRotateDegree(tempRotateDegree);  // Rotate the chart to the initial degree
    document.getElementById('figure').appendChild(svg.node());
}

function updateTempPath(tempYear, metric) {
    const tempPerYear = getTempPerYear(tempRaw, tempYear);

    // Check if temp-path exists
    if (rotatingGroup.selectAll(".temp-path").size() > 0) {
        rotatingGroup.selectAll(".temp-path")
            .transition()
            .duration(150)
            .attr("d", line.radius((d) => y(d[metric]))(tempPerYear));  // Update the path dynamically based on metric
    } else {
        rotatingGroup
            .append("path")
            .attr("class", "temp-path")  // Class to identify the temp path
            .attr("fill", "none")
            .attr("stroke", "url(#line-gradient)")
            .attr("stroke-width", 1.5)
            .attr("d", line.radius((d) => y(d[metric]))(tempPerYear))  // Generate the path dynamically based on metric
            .transition()
            .duration(150)
    }

    // Update the year display text content
    staticGroup.selectAll(".data-display-year")
        .text(tempYear)
        .style("fill", pickedThemeTone);
}

function updateTempRotateDegree(tempRotateDegree) {
    const tolerance = 86400000; // 1 day in milliseconds (adjust based on data granularity)

    function degreeToDate(degree) {
        const radians = (degree * Math.PI) / 180;
        return x.invert(radians); // Map radians back to date
    }

    function getDataAtDate(mappedDrate) {
        return temp.find((d) => Math.abs(d.date - mappedDate) < tolerance);
    }

    var mappedDate = degreeToDate(tempRotateDegree); // Convert degree to date
    var dataAtDate = getDataAtDate(mappedDate); // Retrieve data at that date

    const minAvg = d3.min(temp, (d) => d.avg);
    const maxAvg = d3.max(temp, (d) => d.avg);

    function mapAvgToTonePalette(dataAtDate, tonePalette, minAvg, maxAvg) {
        // Normalize the avg value to a range between 0 and 1
        const normalizedAvg =
            (dataAtDate.avg - minAvg) / (maxAvg - minAvg);

        // Map the normalized value to the tonePalette array index
        const colorIndex = Math.floor(normalizedAvg * (tonePalette.length - 1));

        // Return the corresponding color from the palette
        return tonePalette[colorIndex];
    }

    // Get the corresponding color for the avg value
    pickedThemeTone = mapAvgToTonePalette(
        dataAtDate,
        tonePalette,
        minAvg,
        maxAvg
    );

    toLighterThemeTone = (pickedThemeTone) =>
        d3.hsl(pickedThemeTone).brighter(1.4).toString();

    toDarkerThemeTone = (pickedThemeTone) =>
        d3.hsl(pickedThemeTone).darker(1.4).toString();

    lighterThemeTone = toLighterThemeTone(pickedThemeTone);
    darkerThemeTone = toDarkerThemeTone(pickedThemeTone);

    if (staticGroup) {
        // Update the color of the arrow
        staticGroup.selectAll(".arrow-defs").style("fill", darkerThemeTone);

        // Update the color of the zero degree mark
        staticGroup.selectAll(".zero-degree-mark").style("stroke", pickedThemeTone);

        // Update data display text content
        staticGroup.selectAll(".data-display-date").text(
            `Date: ${new Date(dataAtDate.date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}`
        )
            .style("fill", pickedThemeTone);
        staticGroup.selectAll(".data-display-avg").text(
            `Day Average: ${dataAtDate.avg.toFixed(2)}°F`
        )
            .style("fill", pickedThemeTone);
        staticGroup.selectAll(".data-display-min").text(
            `Day Lowest: ${dataAtDate.min.toFixed(2)}°F`
        )
            .style("fill", pickedThemeTone);
        staticGroup.selectAll(".data-display-max").text(
            `Day Highest: ${dataAtDate.max.toFixed(2)}°F`
        )
            .style("fill", pickedThemeTone);
        staticGroup.selectAll(".data-display-minmin").text(
            `Historical Lowest: ${dataAtDate.minmin}°F`
        )
            .style("fill", pickedThemeTone);
        staticGroup.selectAll(".data-display-maxmax").text(
            `Historical Highest: ${dataAtDate.maxmax}°F`
        )
            .style("fill", pickedThemeTone);

        // Update the color of the data display fa icons
        staticGroup.selectAll(".fa").style("fill", pickedThemeTone);
    }

    // Calculate the duration of the rotation transition based on the difference in degrees
    rotateTransitionDuration = Math.abs(tempRotateDegree - lastRotateDegree) * 1;

    if (rotatingGroup) {
        // Rotate the chart to the selected degree
        rotatingGroup
            .transition()
            .duration(rotateTransitionDuration)
            .attr("transform", `rotate(${-tempRotateDegree + rotationOffsetZeroMark})`);

        // Update the color of the ribbons and line
        rotatingGroup.selectAll(".ribbon-historical-extreme").style("fill", lighterThemeTone);
        rotatingGroup.selectAll(".ribbon-daily-avg").style("fill", pickedThemeTone);
        rotatingGroup.selectAll(".line-daily-avg").style("stroke", pickedThemeTone);
        staticGroup.selectAll(".data-display-year").style("fill", pickedThemeTone);
    }

    // Record last selected degree
    lastRotateDegree = tempRotateDegree;
}

var count = 0;

function uid(name) {
    return new Id("O-" + (name == null ? "" : name + "-") + ++count);
}

function Id(id) {
    this.id = id;
    this.href = new URL(`#${id}`, location) + "";
}

Id.prototype.toString = function () {
    return "url(" + this.href + ")";
};

// Initialize the chart with the default year
initChart(2000);

// Event listener for the year slider
const yearSlider = document.getElementById('year-slider');
const yearValue = document.getElementById('year-value');

yearSlider.addEventListener('input', function () {
    tempYear = +yearSlider.value;
    yearValue.textContent = tempYear;

    updateTempPath(tempYear, metric);  // Update temperature line for the selected year
});

// // Event listener for the rotation slider
// const rotationSlider = document.getElementById('rotation-slider');
// const rotationValue = document.getElementById('rotation-value');

// rotationSlider.addEventListener('input', function () {
//     tempRotateDegree = +rotationSlider.value;
//     rotationValue.textContent = tempRotateDegree;

//     updateTempRotateDegree(tempRotateDegree);
// });
(function () {
    $(document).ready(function () {
        var is_dragging;
        is_dragging = false;

        function degreeChangeCallback(angle) {
            tempRotateDegree = 360 - angle;
            updateTempRotateDegree(tempRotateDegree);
        }

        $(document).on("mousedown touchstart", ".dot", function (e) {
            is_dragging = true;
        });

        $(document).on("mouseup touchend", function (e) {
            is_dragging = false;
        });

        $(window).on("mousemove touchmove", function (e) {
            var angle, center_x, center_y, circle, delta_x, delta_y, pos_x, pos_y, touch;

            if (is_dragging) {
                circle = $(".circle");
                touch = void 0;

                if (e.originalEvent.touches) {
                    touch = e.originalEvent.touches[0];
                }

                center_x = ($(circle).outerWidth() / 2) + $(circle).offset().left;
                center_y = ($(circle).outerHeight() / 2) + $(circle).offset().top;
                pos_x = e.pageX || touch.pageX;
                pos_y = e.pageY || touch.pageY;
                delta_y = center_y - pos_y;
                delta_x = center_x - pos_x;
                angle = Math.atan2(delta_y, delta_x) * (180 / Math.PI);
                angle -= 90;

                if (angle - 90 < 0) {
                    angle = 360 + angle;
                }

                angle = Math.round(angle);

                $(".dot").css("transform", "rotate(" + angle + "deg)");
                $(".debug").html(angle + "deg");

                // Call the callback function with the current angle
                degreeChangeCallback(angle - 90);
            }
        });
    });
}).call(this);

// Event listener for the metric select
const metricSelect = document.getElementById('metric-slider');
const metricValue = document.getElementById('metric-value');

metricSelect.addEventListener('input', function () {
    metricIndex = metricSelect.value;
    if (metricIndex == 0) {
        metric = "min";
        metricValue.textContent = "Minimum";
    } else if (metricIndex == 1) {
        metric = "avg";
        metricValue.textContent = "Average";
    } else if (metricIndex == 2) {
        metric = "max";
        metricValue.textContent = "Maximum";
    } else {
        metric = "avg";
        metricValue.textContent = "Average";
    }

    updateTempPath(tempYear, metric);
});

function getTempPerYear(tempRaw, tempYear) {
    const tempYearStart = `${tempYear}-01-01`;
    const tempYearEnd = `${tempYear}-12-31`;

    // Convert to date objects for comparison
    const startDate = new Date(tempYearStart);
    const endDate = new Date(tempYearEnd);

    // Function to filter and clean the data, converting DATE to JavaScript Date object
    const tempPerYear = tempRaw
        .filter(({ DATE }) => {
            const date = new Date(DATE); // Parse DATE to a Date object
            return date >= startDate && date <= endDate; // Keep dates within the desired year
        })
        .map((d) => ({
            date: new Date(d.DATE), // Convert the string DATE to a JavaScript Date object
            avg: d.TAVG ? parseFloat(d.TAVG) : NaN, // Fill missing or NaN values with NaN
            max: d.TMAX ? parseFloat(d.TMAX) : NaN,
            min: d.TMIN ? parseFloat(d.TMIN) : NaN
        }));

    // Function to interpolate 0s with the mean of left and right non-zero values
    function interpolateZeros(data, key) {
        for (let i = 0; i < data.length; i++) {
            if (data[i][key] === 0 || isNaN(data[i][key])) {
                let leftValue = NaN,
                    rightValue = NaN;

                // Find the nearest non-zero left value
                for (let left = i - 1; left >= 0; left--) {
                    if (data[left][key] !== 0 && !isNaN(data[left][key])) {
                        leftValue = data[left][key];
                        break;
                    }
                }

                // Find the nearest non-zero right value
                for (let right = i + 1; right < data.length; right++) {
                    if (data[right][key] !== 0 && !isNaN(data[right][key])) {
                        rightValue = data[right][key];
                        break;
                    }
                }

                // Interpolate the value as the mean of left and right non-zero values
                if (!isNaN(leftValue) && !isNaN(rightValue)) {
                    data[i][key] = (leftValue + rightValue) / 2;
                } else if (!isNaN(leftValue)) {
                    data[i][key] = leftValue;
                } else if (!isNaN(rightValue)) {
                    data[i][key] = rightValue;
                }
            }
        }
    }

    // Interpolate 0 or NaN values for avg, max, and min fields
    interpolateZeros(tempPerYear, "avg");
    interpolateZeros(tempPerYear, "max");
    interpolateZeros(tempPerYear, "min");

    return tempPerYear;
}
