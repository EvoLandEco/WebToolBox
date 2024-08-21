# WebToolBox

A collection of handy and reusable Node.js and vanilla JS scripts. More scripts will be added gradually based on their usefulness.

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

3. Start express server:
```sh
node server.js --path . --port 3000
```

4. Now you can open the html files located at /examples:
```
http://localhost:3000/examples/treeview.html
```

## Introduction

### *server.js* - an express server

<details><summary>Click to see the details</summary>

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

#### Preview

![Console Output](/preview/server.png)

</details>

---

### *pdfgen.js* - convert html to pdf

<details><summary>Click to see the details</summary>

The `pdfgen` script generates a PDF from a specified HTML URL using headless browser. It provides various customization options including DPI, scale, page size, margins, and background settings.

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

#### Preview

![Console Output](/preview/pdfgen.png)

</details>

---

### *treeview.js* - better directory tree viewer

<details><summary>Click to see the details</summary>

The `treeview` script is an enhanced version of [Directory Tree Viewer (Vanilla JS)](https://codepen.io/vidox/pen/jOvWwqw). Now the sub-directory icons are nudged to the right by 23px level-wise. I added support to display distinguishable icons for a number of file extensions. I also added a button to conveniently expand and collapse all the directories.

Express server is required to run a minimal examplary html file. `/styles/treeview.css` will be sourced by the html file.

#### Examples
```
http://localhost:3000/examples/treeview.html
```

#### Preview

![Preview](/preview/treeview.png)

</details>

---

### *csvtable.js* - display a table from csv

<details><summary>Click to see the details</summary>

The `csvtable` script uses `jquery` to fetch a csv file and display it as a table. The script also requires `dataTables` and `PapaParse` to function.

Express server is required to run a minimal examplary html file. 

#### Examples
```
http://localhost:3000/examples/csvtable.html
```

#### Preview

![Preview](/preview/csvtable.png)

</details>

---

### *phylovis.html* - a playground for phylogenetic encodings

<details><summary>Click to see the details</summary>

The `phylovis` script provides functions to simulate and visualize phylogenies under the Yule model and display corresponding encodings of the underlying graph representations. It supports interactive highlighting on-hover to easily trace connections between nodes/edges and their entries in the encodings. Graph visualization is based on `vis.js`.

Express server is required to run a minimal examplary html file. 

#### Examples
```
http://localhost:3000/examples/phylovis.html
```

#### Preview

![Preview](/preview/phylovis.png)

</details>

---

### *heatwave.js* - interactive climate data visualizer

<details><summary>Click to see the details</summary>

The `heatwave` script is empowered by `d3.js`. One step further from the static [Radial area chart](https://observablehq.com/@d3/radial-area-chart/2?intent=fork), `heatwave` redefines interactive visualization of periodic time series data.

Express server is required to run a minimal examplary html file. 

#### Examples
```
http://localhost:3000/examples/heatwave.html
```

#### Preview

![alt text](/preview/heatwave.png)

</details>

---
