/**
 * @file importYAML.js
 * @description Parses and imports a DataCite metadata YAML file into the
 * Alpine.js application state. Converts YAML to JSON and uses the existing
 * JSON import logic for normalization and validation.
 */

import { parse as yamlParse } from "yaml";
import { importFromJSON } from "./importJSON.js";

/**
 * Parses a DataCite YAML string and maps all recognised fields into the
 * Alpine.js application state. Internally converts YAML to JSON and delegates
 * to {@link importFromJSON} for all data mapping and validation.
 *
 * @param {object} app - The Alpine.js application data object.
 * @param {string} yamlString - The raw YAML string to parse.
 * @throws {Error} If YAML parsing fails or structure is invalid.
 */
export function importFromYAML(app, yamlString) {
    try {
        // Parse YAML string to JavaScript object
        const yamlData = yamlParse(yamlString);

        // Delegate to importFromJSON for all the data mapping logic
        // This ensures consistency between YAML and JSON imports
        return importFromJSON(app, yamlData);
    } catch (error) {
        throw new Error(
            `Failed to parse YAML: ${error.message || "Unknown error"}`,
        );
    }
}
