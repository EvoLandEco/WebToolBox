const puppeteer = require('puppeteer');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Define standard page sizes in inches
const pageSizes = {
    A4: { width: 8.27, height: 11.69 },
    Letter: { width: 8.5, height: 11 },
    Legal: { width: 8.5, height: 14 },
    Tabloid: { width: 11, height: 17 },
    Executive: { width: 7.25, height: 10.5 },
    A5: { width: 5.83, height: 8.27 },
    A3: { width: 11.69, height: 16.54 }
};

// Set up yargs for command line argument parsing and help
const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 --url <string> --output <string> [--dpi <number>] [--scale <number>] [--pageSize <string> | --width <number> --height <number>] [--top <number>] [--right <number>] [--bottom <number>] [--left <number>] [--no-background] [--no-margin]')
    .demandOption(['url', 'output'])
    .describe('dpi', 'The DPI (dots per inch) for the PDF')
    .describe('scale', 'The scale factor for the PDF')
    .describe('url', 'The URL of the HTML file to convert to PDF')
    .describe('output', 'The file path to write the generated PDF')
    .describe('pageSize', 'The standard page size (A4, Letter, Legal, Tabloid, Executive, A5, A3)')
    .describe('width', 'The custom width for the PDF (in inches)')
    .describe('height', 'The custom height for the PDF (in inches)')
    .describe('top', 'Top margin in mm')
    .describe('right', 'Right margin in mm')
    .describe('bottom', 'Bottom margin in mm')
    .describe('left', 'Left margin in mm')
    .describe('no-background', 'Disable printing background (default: false)')
    .describe('no-margin', 'Set all margins to 0 (conflicts with individual margin settings)')
    .default('dpi', 300)
    .default('scale', 1.0)
    .default('pageSize', 'A4')
    .default('top', 10)
    .default('right', 10)
    .default('bottom', 10)
    .default('left', 10)
    .boolean('no-background')
    .boolean('no-margin')
    .conflicts('no-margin', ['top', 'right', 'bottom', 'left'])
    .help('h')
    .alias('h', 'help')
    .argv;

const dpi = parseInt(argv.dpi, 10);
const scale = parseFloat(argv.scale);
const url = argv.url;
const outputPath = argv.output;
const noBackground = argv['no-background'];
const noMargin = argv['no-margin'];

let width, height;

// Determine the page size
if (argv.pageSize) {
    const pageSize = pageSizes[argv.pageSize];
    if (pageSize) {
        width = pageSize.width;
        height = pageSize.height;
    } else {
        console.error('Invalid page size. Valid options are: A4, Letter, Legal, Tabloid, Executive, A5, A3.');
        process.exit(1);
    }
} else if (argv.width && argv.height) {
    width = parseFloat(argv.width);
    height = parseFloat(argv.height);
} else {
    console.error('Please provide either a standard page size or custom width and height.');
    process.exit(1);
}

// Convert width and height to pixels based on DPI
const widthPx = Math.round(width * dpi);
const heightPx = Math.round(height * dpi);

// Determine margins
let top, right, bottom, left;
if (noMargin) {
    top = right = bottom = left = 0;
} else {
    top = parseFloat(argv.top);
    right = parseFloat(argv.right);
    bottom = parseFloat(argv.bottom);
    left = parseFloat(argv.left);
}

// Convert margins to inches (since puppeteer requires margins in inches)
const topInches = top / 25.4;
const rightInches = right / 25.4;
const bottomInches = bottom / 25.4;
const leftInches = left / 25.4;

async function generatePDF(url, outputPath) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Set the viewport to match the specified size at the specified DPI
    await page.setViewport({
        width: widthPx,
        height: heightPx,
        deviceScaleFactor: 1,
    });

    // Generate the PDF with the specified DPI and scale settings
    await page.pdf({
        path: outputPath,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        printBackground: !noBackground,
        margin: {
            top: topInches,
            right: rightInches,
            bottom: bottomInches,
            left: leftInches
        },
        scale: scale
    });

    await browser.close();
}

// Usage example
generatePDF(url, outputPath)
    .then(() => console.log('PDF generated successfully'))
    .catch(err => console.error('Error generating PDF:', err));
