const express = require('express');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Set up yargs for command line argument parsing and help
const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 --path <string> --port <number>')
    .demandOption(['path', 'port'])
    .describe('path', 'The path to the directory to serve files from')
    .describe('port', 'The port to run the Express server on')
    .help('h')
    .alias('h', 'help')
    .argv;

const directoryPath = path.resolve(argv.path);
const port = parseInt(argv.port, 10);

const app = express();

// Serve static files from the specified directory
app.use(express.static(directoryPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(directoryPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Serving files from ${directoryPath}`);
});
