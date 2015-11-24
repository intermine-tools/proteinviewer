# About

This is a Steps / Intermine 2.0 wrapper around the [BioJS Protein Features Viewer](http://biojs.io/d/biojs-vis-proteinfeaturesviewer)

It's designed to be included in [Steps](https://github.com/intermine/staircase) as an IFrame Tool.

#Packaging

To build the project, assuming you have npm and node, `npm install` the dependencies, then run ` webpack --display-error-details --watch ` for nice verbose errors and automatic re-compiling when you modify files, or ` webpack -p` for a minified production build.

Your entry point if modifying this is `js/tool.js`, and the output file is `js/steps-protein-viewer.js`.
