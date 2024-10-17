// Define grid size
const gridRadius = 10;

// Define hexagon size
const hexDimension = 24;

// Define method to select initial hexagon
const methodHexZero = 'center';

// Define global environmental variables
const globalBetaN = -0.01; // Effect size of species richness on speciation rate
const globalBetaPhi = -0.01; // Effect size of evolutionary relatedness on speciation rate
const globalGammaN = 0.01; // Effect size of species richness on extinction rate
const globalGammaPhi = 0.001; // Effect size of evolutionary relatedness on extinction rate
const globalDeltaN = 0.01; // Effect size of species richness on migration rate
const globalDeltaPhi = 0.00; // Effect size of evolutionary relatedness on migration rate

// Define intrinsic species properties
const intrinsicBirthRate = 0.5;
const intrinsicMutationRate = 0.5;
const intrinsicDeathRate = 0.2;
const intrinsicMigrationRate = 0.5;

// Define simulation length in time units
const simulationTime = 50;
let currentTime = 0;

// Define the base Hex class
const BaseHex = Honeycomb.defineHex(
    {
      dimensions: hexDimension
    }
);

// Define the custom Hex class by extending the base class
class Hex extends BaseHex {
  constructor(...args) {
    super(...args); // Call the base class constructor
    // Initialize custom properties
    this.speciesData = null;
    this.environmentData = null;
    this.cubeCoordinates = null; // Adding cube coordinates for hexagons
  }

  // Add methods to get and set the data
  getSpeciesData() {
    return this.speciesData;
  }
  setSpeciesData(data) {
    this.speciesData = data;
  }
  getEnvironmentData() {
    return this.environmentData;
  }
  setEnvironmentData(data) {
    this.environmentData = data;
  }
  addSpecies(species) {
    if (!this.speciesData) {
      this.speciesData = [];
    }
    this.speciesData.push(species);
    species.setHex(this);
  }
  removeSpecies(species) {
    if (this.speciesData) {
      this.speciesData = this.speciesData.filter(s => s !== species);
    }
  }
  migrateSpecies(species, targetHex) {
    this.removeSpecies(species);
    targetHex.addSpecies(species);
    species.setHex(targetHex);
  }
}

// Maintain a global species index array
const speciesIndexArray = [];

// Define the species class with unique index and intrinsic species properties
class Species {
  constructor(index, parent = null, hex, timeBirth = 0, timeDeath = -1) {
    this.index = index;
    this.parent = parent;
    this.hex = hex;
    this.birthRate = intrinsicBirthRate;
    this.mutationRate = intrinsicMutationRate;
    this.deathRate = intrinsicDeathRate;
    this.migrationRate = intrinsicMigrationRate;
    this.active = true;
    this.timeBirth = timeBirth;
    this.timeDeath = timeDeath;
  }

  // Getters and setters of the rates and status (extinct or not)
  getIndex() {
    return this.index;
  }
  getParentIndex() {
    return this.parent;
  }
  getHex() {
    return this.hex;
  }
  setHex(hex) {
    this.hex = hex;
  }
  getTimeBirth() {
    return this.timeBirth;
  }
  getTimeDeath() {
    return this.timeDeath;
  }
  getBirthRate() {
    return this.birthRate;
  }
  setBirthRate(rate) {
    this.birthRate = rate;
  }
  getMutationRate() {
    return this.mutationRate;
  }
  setMutationRate(rate) {
    this.mutationRate = rate;
  }
  getDeathRate() {
    return this.deathRate;
  }
  setDeathRate(rate) {
    this.deathRate = rate;
  }
  getMigrationRate() {
    return this.migrationRate;
  }
  setMigrationRate(rate) {
    this.migrationRate = rate;
  }
  isActive() {
    return this.active;
  }
  setExtinct(time) {
    this.active = false;
    this.timeDeath = time;
  }
  setMigrate(hex) {
    this.hex = hex;
  }
}

// Function to create a child species from a non-extinct (active) species
function createChildSpecies(parentSpecies) {
  if (parentSpecies.isActive()) {
    const newIndex = speciesIndexArray.length;
    const childSpecies = new Species(newIndex, parentSpecies.index, parentSpecies.getHex());
    speciesIndexArray.push(childSpecies);
    parentSpecies.getHex().addSpecies(childSpecies);
    return childSpecies;
  }
  return null;
}

// Function to set a species to extinct
function setSpeciesExtinct(species, time) {
  species.setExtinct(time);
}

const customHex = new Hex();

// Set up the grid dimensions
const grid = new Honeycomb.Grid(Hex, Honeycomb.spiral({ start: [0,0], radius: gridRadius }))

// Define methods to select a hex-zero to place the common ancestor
function getRandomBorderHex(grid) {
  const borderHexes = grid.filter(hex => {
    const { q, r, s } = hex.cubeCoordinates;
    return Math.abs(q) === gridRadius || Math.abs(r) === gridRadius || Math.abs(s) === gridRadius;
  });
  return borderHexes[Math.floor(Math.random() * borderHexes.length)];
}

function getCenterHex(grid) {
  return grid.getHex([0, 0]);
}

// Method to completely randomly select a hexagon from the grid
function getRandomHex(grid) {
  return grid[Math.floor(Math.random() * grid.length)];
}

// Hex-zero selector with above defined methods
function selectHexZero(method) {
  switch (method) {
    case 'center':
      return getCenterHex(grid);
    case 'random':
      return getRandomHex(grid);
    case 'border':
      return getRandomBorderHex(grid);
    default:
      return getCenterHex(grid);
  }
}

// Initialize the hexagons
grid.forEach(hex => {
  // Calculate cube coordinates for the hex
  hex.cubeCoordinates = { q: hex.q, r: hex.r, s: hex.s };

  hex.environmentData = {
    betaN: globalBetaN,
    betaPhi: globalBetaPhi,
    gammaN: globalGammaN,
    gammaPhi: globalGammaPhi,
    deltaN: globalDeltaN,
    deltaPhi: globalDeltaPhi
  };
});

// Select initial hexagon
const hexZero = selectHexZero(methodHexZero);

// Place the initial common ancestor in the selected hex-zero
if (hexZero) {
  const initialSpecies = new Species(0, null, hexZero);
  hexZero.addSpecies(initialSpecies);
  speciesIndexArray.push(initialSpecies);
}

// Function to compute the number of non-extinct species within a hexagon
function countNonExtinctSpecies(hex) {
  if (!hex.speciesData) {
    return 0;
  }
  return hex.speciesData.filter(species => species.isActive()).length;
}

// Function to update the rates of species within a hexagon according to the number of species
function updateRates(hex) {
  const nonExtinctCount = countNonExtinctSpecies(hex);
  if (hex.speciesData) {
    hex.speciesData.forEach(species => {
      species.setBirthRate(intrinsicBirthRate + globalBetaN * nonExtinctCount);
      species.setDeathRate(intrinsicDeathRate + globalGammaN * nonExtinctCount);
      species.setMigrationRate(intrinsicMigrationRate + globalDeltaN * nonExtinctCount);
    });
  }
}

// Update rates for each hexagon in the grid
grid.forEach(hex => {
  updateRates(hex);
});

// Function to simulate events based on Gillespie's algorithm
function simulateNextEvent() {
  // Create a list of all events with their rates
  const events = [];

  grid.forEach(hex => {
    if (hex.speciesData) {
      hex.speciesData.forEach(species => {
        if (species.isActive()) {
          // Birth event
          events.push({
            type: 'birth',
            species,
            hex,
            rate: species.getBirthRate()
          });
          // Death event
          events.push({
            type: 'death',
            species,
            hex,
            rate: species.getDeathRate()
          });
          // Migration event
          events.push({
            type: 'migration',
            species,
            hex,
            rate: species.getMigrationRate()
          });
        }
      });
    }
  });

  // Calculate total rate
  const totalRate = events.reduce((sum, event) => sum + event.rate, 0);
  if (totalRate === 0) {
    return null; // No more events to process
  }

  // Sample time interval for the next event
  const timeInterval = -Math.log(Math.random()) / totalRate;
  currentTime += timeInterval;
  if (currentTime > simulationTime) {
    currentTime = simulationTime;
    return null;
  }

  // Select which event happens
  let cumulativeRate = 0;
  const randomValue = Math.random() * totalRate;
  for (const event of events) {
    cumulativeRate += event.rate;
    if (randomValue <= cumulativeRate) {
      return event;
    }
  }
  return null;
}

// Function to get the neighbors of a hexagon
function getHexNeighbors(hex, grid) {
  neighbors = [];
  const { q, r, s } = hex.cubeCoordinates;
  neighbors.push(grid.neighborOf([q, r], Honeycomb.Direction.E));
  neighbors.push(grid.neighborOf([q, r], Honeycomb.Direction.N));
  neighbors.push(grid.neighborOf([q, r], Honeycomb.Direction.NE));
  neighbors.push(grid.neighborOf([q, r], Honeycomb.Direction.NW));
  neighbors.push(grid.neighborOf([q, r], Honeycomb.Direction.S));
  neighbors.push(grid.neighborOf([q, r], Honeycomb.Direction.SE));
  neighbors.push(grid.neighborOf([q, r], Honeycomb.Direction.SW));
  neighbors.push(grid.neighborOf([q, r], Honeycomb.Direction.W));
  
  return neighbors.filter(neighbor => neighbor !== null);
}

// Function to execute the selected event
function executeEvent(event) {
    const { type, species, hex } = event;
    switch (type) {
      case 'birth':
        createChildSpecies(species);
        updateRates(hex);
        break;
      case 'death':
        setSpeciesExtinct(species, currentTime);
        updateRates(hex);
        break;
      case 'migration':
        const neighbors = getHexNeighbors(hex, grid);
        if (neighbors.length > 0) {
          const targetHex = neighbors[Math.floor(Math.random() * neighbors.length)];
          hex.migrateSpecies(species, targetHex);
          updateRates(hex);
          updateRates(targetHex);
        }
        break;
    }
}

// Compute the maximum non-extinct species count for color scaling
function computeMaxCount() {
  const counts = grid.map(hex => countNonExtinctSpecies(hex));
  return d3.max(counts) || 1;
}

let maxCount = computeMaxCount();

// Function to get color based on non-extinct species count
function getColor(count, scaleType = 'viridis') {
  // If count is 0, return dark grey
  if (count === 0) {
    return '#a5a5a5';  // Dark grey color
  }

  // Define the color scale based on scaleType
  let colorScale;
  switch (scaleType) {
    case 'blues':
      colorScale = d3.scaleSequential(d3.interpolateBlues);
      break;
    case 'reds':
      colorScale = d3.scaleSequential(d3.interpolateReds);
      break;
    case 'cool':
      colorScale = d3.scaleSequential(d3.interpolateCool); // Blue to Red gradient
      break;
    case 'RdBu':
      colorScale = d3.scaleSequential(d3.interpolateRdBu); // Red to Blue diverging
      break;
    case 'plasma':
      colorScale = d3.scaleSequential(d3.interpolatePlasma); // Purple to yellow
      break;
    case 'custom-blue-red':
      colorScale = d3.scaleLinear().range(["blue", "red"]); // Custom Blue to Red
      break;
    default:
      colorScale = d3.scaleSequential(d3.interpolateViridis); // Default Viridis scale
  }

  // Apply the color scale for non-zero values
  return colorScale.domain([0, maxCount])(count);
}

// Set up the SVG canvas dimensions
const svgWidth = 1400;
const svgHeight = 1400;
const gapScale = 0;
const svg = d3.select('#svgCanvas')
  .attr('width', svgWidth)
  .attr('height', svgHeight);

function renderHexagons(hex) {
  // Compute the pixel coordinates of the hex's position
  const point = Honeycomb.hexToPoint(hex);
  const x = point.x * gapScale + svgWidth / 2;  // Center the grid in the SVG canvas
  const y = point.y * gapScale + svgHeight / 2;

  // Get the corners of the hexagon
  const corners = hex.corners.map(corner => {
    const xCorner = corner.x + x;
    const yCorner = corner.y + y;
    return [xCorner, yCorner];
  });

  // Convert corners to string for the 'points' attribute
  const points = corners.map(point => point.join(',')).join(' ');

  // Get the fill color based on the number of non-extinct species
  const nonExtinctCount = countNonExtinctSpecies(hex);
  const fillColor = getColor(nonExtinctCount);

  // Append the hexagon to the SVG canvas
  svg.append('polygon')
      .attr('class', 'hexagon')
      .attr('points', points)
      .attr('fill', fillColor)
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5);
}

function updateVisualization() {
  maxCount = computeMaxCount(); // Recompute maxCount for color scaling

  // Bind data
  const hexagons = svg.selectAll('.hexagon')
      .data(grid, hex => `${hex.q},${hex.r}`);

  // Enter selection (only executed once for new hexagons)
  hexagons.enter()
      .append('polygon')
      .attr('class', 'hexagon')
      .attr('points', hex => {
        const point = Honeycomb.hexToPoint(hex);
        const x = point.x * gapScale + svgWidth / 2;
        const y = point.y * gapScale + svgHeight / 2;
        const corners = hex.corners.map(corner => [
          corner.x + x,
          corner.y + y
        ]);
        return corners.map(point => point.join(',')).join(' ');
      })
      .attr('fill', hex => getColor(countNonExtinctSpecies(hex)))
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5);

  // Update selection (update existing hexagons)
  hexagons
      .attr('fill', hex => getColor(countNonExtinctSpecies(hex)));

  // Exit selection (if any hexagons are removed)
  hexagons.exit().remove();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSimulation() {
  while (currentTime < simulationTime) {
    console.log('Current time:', currentTime);
    console.log('Species count:', speciesIndexArray.length);

    const event = simulateNextEvent();
    console.log('Event:', event);
    if (!event) {
      console.log('No more events to process.');
      break;
    }

    executeEvent(event);

    // Update visualization
    updateVisualization();

    // Wait for 100ms
    await sleep(200);
  }

  console.log('Simulation completed.');
}

// Start the simulation
runSimulation();