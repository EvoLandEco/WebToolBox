# WebToolBox

A collection of handy and reusable Node.js scripts. Currently, the repository contains two scripts: `pdfgen` and `server`. More scripts will be added gradually based on their usefulness.

## Installation

1. Clone the repository:
```sh
git clone https://github.com/EvoLandEco/WebToolBox
cd WebToolBox
```

2. Install dependencies:
```sh
npm install
```

## Contributing
Feel free to submit issues or pull requests if you have any suggestions or improvements.

## Scripts

### *pdfgen.js*

The `pdfgen` script generates a PDF from a specified HTML URL. It provides various customization options including DPI, scale, page size, margins, and background settings.

#### Usage

```sh
node pdfgen.js --url <string> --output <string> [--dpi <number>] [--scale <number>] [--pageSize <string> | --width <number> --height <number>] [--top <number>] [--right <number>] [--bottom <number>] [--left <number>] [--no-background] [--no-margin]
```

#### Examples
With default parameters:
```sh
node pdfgen.js --url http://localhost:3000/example.html --output c:/test/test.pdf
```
With custom page size and margins:
```sh
node pdfgen.js --url http://localhost:3000/example.html --output c:/test/test.pdf --width 8.5 --height 11 --top 10 --right 10 --bottom 10 --left 10
```

### *server.js*
The server script sets up a simple Express server to serve static files from a specified directory.

#### Usage
```sh
node server.js --path <string> --port <number>
```

#### Example
To serve files from the public directory on port 3000:
```sh
node server.js --path ./public --port 3000
```
