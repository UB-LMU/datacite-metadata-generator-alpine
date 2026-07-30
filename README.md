# DataCite Metadata Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A lightweight, browser-based tool for creating, validating, importing, and exporting DataCite-compliant metadata in XML, JSON, and YAML formats.
The application runs entirely client-side, requires no backend and is ideal for researchers, research institutions, repositories, libraries
and anyone who wants to generate or edit DataCite-compliant metadata.

---

## DataCite Metadata Schema 4.6

This application is based on the **DataCite Metadata Schema 4.6**. It implements the schema's core metadata elements, controlled vocabularies, identifier relationships, and validation rules to support the creation of DataCite-compliant metadata records.

DataCite Metadata Working Group. (2024). DataCite Metadata Schema for the Publication and Citation of Research Data and Other Research Outputs. Version 4.6. DataCite e.V. [DOI: 10.14454/mzv1-5b55](https://doi.org/10.14454/mzv1-5b55)

| Application version | DataCite Metadata Schema |
|---------------------|--------------------------|
| 1.0.x               | 4.6                      |

In addition, the DataCite Metadata Generator is based on the DataCite Best Practice Guide: 

Bayer, Christiane, Frech, Andreas, Gabriel, Vanessa, Kuemmet, Sonja, Luecke, Stephan, Meier, Laura, Munke, Johannes, Putnings, Markus, Rohrwild, Juergen, Schulz, Julian, Spenger, Martin, & Weber, Tobias. (2025). DataCite Best Practice Guide (Version 4.0). Zenodo. [DOI: 10.5281/zenodo.15607293](https://doi.org/10.5281/zenodo.15607293)

---

## Features

- **Form-based entry** of all core DataCite metadata fields
- **Live preview** for XML, JSON, and YAML
- **Bilingual UI** with English/German language switching
- **DOI import** via the DataCite REST API
- **Import of existing metadata files** (JSON, XML, YAML)
- **PID validation via REST APIs** (e.g. ORCID, ROR)
- **Centralized validation** of mandatory, conditional, and geospatial rules
- **Inline validation feedback** directly in the form
- **Export metadata as XML, JSON, and YAML**
- **Separate legal notice pages** for English and German
- **Completely client-side** (no backend dependencies)
- **Alpine.js-based UI**
- **Modular code structure** (generators, validators, importers)
- **Consistent UI spacing and separators** for better form readability
- **In-page navigation helpers** (next tab / back to top)

---

## Installation & Getting started

The project uses Vite for development and bundling.

```bash
npm install
```

Start locally (development):

```bash
npm run dev
```

Then open http://localhost:5173 in your browser.

Production build:

```bash
npm run build
```

This generates an optimized `dist/` directory with bundled and minified files for deployment on any static web server. 
It also updates the THIRD-PARTY-NOTICES.md.

The generated build contains the following deployable entry points:

- `dist/index.html`
- `dist/legal-notice.html`
- `dist/legal-notice-de.html`
- `dist/assets/`
- `dist/media/`

Generate API documentation:

```bash
npm run docs
```

This generates JSDoc HTML documentation in the `docs/` directory, documenting all modules, functions, and utilities.

Generate third-party license notices:

```bash
npm run notices
```

This scans all npm dependencies and updates `THIRD-PARTY-NOTICES.md` with
their respective licenses.

---

## Usage

- Metadata creation
    - Create metadata in compliance with DataCite Metadata Schema 4.6
    - Inline validation highlights errors directly in the form
    - Assisted input using REST API lookups (e.g. ORCID, ROR)
    - Publisher identifier scheme can be inferred from common identifier patterns

- Live Preview
    - XML, JSON, and YAML are updated automatically
    - Copy button for quick copying
    - Clear button to reset the entire form

- Import functions
    - DOI import: Enter a DataCite DOI to fetch existing metadata
    - File import: Upload valid XML, JSON, or YAML files
    - XML comments are tolerated and stripped before XML parsing
    - ORCID `schemeURI` values are normalized to `https://orcid.org/`

- Language handling
    - The interface can be switched between English and German
    - Legal notice links route to the matching language page
    - The chosen UI language is restored from the URL or local storage

- Export
    - Export metadata as XML
    - Export metadata as JSON
    - Export metadata as YAML

---

## Project structure

```text
datacite-metadata-generator-alpine.js/
│
├── index.html                        # Main page, Alpine.js app setup & DOM
├── legal-notice.html                 # English legal notice / references page
├── legal-notice-de.html              # German legal notice / references page
│
├── public/
│   └── media/                        # Static images copied unchanged into dist/media
│
├── src/
│   ├── style.css                     # Tailwind CSS custom classes & styling
│   ├── main.js                       # Alpine.js app state & event handlers
│   ├── i18n/
│   │   └── translations.js           # UI translation dictionary (EN/DE)
│   └── utils/
│       ├── blockFactories.js         # Centralized creation of repeated blocks
│       ├── generators.js             # XML, JSON, and YAML generation logic
│       ├── importDOI.js              # DataCite API integration
│       ├── importJSON.js             # JSON import with sanitization
│       ├── importXML.js              # XML import with security checks
│       ├── importYAML.js             # YAML import via JSON mapping
│       ├── orcidSearch.js            # Load personal information via ORCID API
│       ├── rorSearch.js              # Load affiliation information via ROR API
│       └── validation.js             # Central validation rules & normalization
│
├── data/
│   ├── dataCite-values.js            # DataCite Kernel 4.6 controlled vocabularies
│   ├── iso_639-1.js                  # ISO 639-1 language code reference
│   └── licenses.json                 # SPDX licenses reference: [SPDX Data for the Version 3.28.0 of the license list](https://github.com/spdx/license-list-data), 
│
├── jsdoc.config.json                 # JSDoc documentation configuration
├── vite.config.js                    # Vite build configuration
├── package.json                      # Project configuration, scripts, and dependencies
├── package-lock.json                 # Locks the exact versions of all installed dependencies
├── .gitignore                        # Specifies files and directories that Git should ignore
│
├── CITATION.cff                      # Citation information
├── LICENSE                           # MIT License text
├── THIRD-PARTY-NOTICES.md            # Full list of included packages and their respective licenses
├── generate-notices.js               # Checks third party dependencies and generates THIRD-PARTY-NOTICES.md 
└── README.md                         # This file
```

---

## Technologies

- **Alpine.js 3.15.12** — Lightweight reactive UI framework
- **Tailwind CSS 4.3.2** — Utility-first CSS framework
- **Vite 7.3.6** — Modern build tool and development server
- **yaml 2.9.0** — YAML parsing and serialization
- **Heroicons** — Icon library for UI elements
- **JSDoc 4.0.5** — API documentation generation (dev dependency)

---

## Validation

All input fields are validated using a shared validation layer:

- Mandatory DataCite core fields
- Conditional rules such as “if used, then required”
- Identifier/scheme dependency checks (e.g. nameIdentifier + scheme)
- Format validation (e.g. publication year, ORCID)
- Publication year validation disallows future years
- Geolocation validation including coordinate ranges, box completeness, and polygon structure
- Geolocation decimal comma support (e.g. `33,3406`)
- Inline feedback with consistent color semantics (errors red, warnings amber, success green)

---

## Documentation

Auto-generated API documentation is built from JSDoc comments in the source code.

Generate it locally with:

```bash
npm run docs
```

Then open `docs/index.html` in your browser to view the API reference, or access `docs/global.html` for the complete function index.

For development, all modules include comprehensive JSDoc headers describing:

- Function purpose, parameters, and return types
- Data structures (controlled vocabularies, validation rules)
- Import workflows and security considerations
- Integration points (ORCID, ROR, DataCite APIs)

The generated documentation is refreshed after updating source comments or this README, because the JSDoc build embeds the repository README into the HTML docs.

---

## Deployment

Deploy the contents of `dist/` to a static web server.

The application currently assumes it is served from the web root (`/`). If it needs to run from a subdirectory, the Vite base path and absolute asset links must be adjusted accordingly.

---

## Design decisions

The application was designed with interoperability, extensibility, and maintainability in mind. We chose to integrate the APIs of ROR and ORCID because they are the most widely adopted persistent identifier (PID) systems in this domain. For data import and export, we support both XML and JSON, as these are the formats officially supported by DataCite, ensuring compatibility with established metadata workflows. In addition, YAML was included to accommodate a specific local use case.

The codebase follows a modular architecture, allowing individual components to be reused, replaced, or extended with minimal effort. This design makes it straightforward to integrate additional PID providers, metadata formats, or external systems, enabling the application to be adapted to institution-specific requirements while maintaining a standards-based approach.

---

## Contact

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. 

Also feel free to reach out via mail: [forschungsdaten@ub.uni-muenchen.de](mailto:forschungsdaten@ub.uni-muenchen.de)

---

## Authors and acknowledgement

The DataCite Metadata Generator was developed by [LMU Center for Digital Humanities](https://www.itg.uni-muenchen.de/) and [University Library of LMU Munich](https://www.ub.lmu.de/de/). It is part of the project [Aufbau HITS FDM (Digitalverbund Bayern)](https://digitalverbund.bayern/projekte/aufbau-hits-fdm/), 2025-2027.

- Caroline Strolz, IT-Gruppe Geisteswissenschaften (LMU München)
- Laura Meier, Universitätsbibliothek der LMU München (ORCID: [0000-0003-1368-2306](https://orcid.org/0000-0003-1368-2306))

This tool was developed with funding and expertise from [PID Network Deutschland](https://www.pid-network.de/) as part of the implementation phase of the [practical guidelines for DataCite DOI metadata providers](https://doi.org/10.5281/zenodo.17065202), funded by the [German Research Foundation](https://www.dfg.de/) (DFG, project number [506475377](https://gepris.dfg.de/gepris/projekt/506475377)).

--- 

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project also includes third-party open-source dependencies.
See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for a full list of
included packages and their respective licenses.

---