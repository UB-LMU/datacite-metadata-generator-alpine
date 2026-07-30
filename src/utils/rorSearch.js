/**
 * @file rorSearch.js
 * @description Performs organisation lookup via ROR API.
 */

/**
 * Resolves the reactive target object for a given ROR context.
 *
 * @param {object} app     - Metadata app object
 * @param {string} context - One of: "creatorAffiliation", "creatorNameId",
 *                           "contributorAffiliation", "contributorNameId",
 *                           "publisher", "funder".
 * @param {number} index   - Creator/contributor/funding block index.
 * @param {number} i       - Affiliation or Name Identifier index.
 * @returns {object}       - The reactive sub-object to read/write.
 */
function resolveRorTarget(app, context, index, i) {
    switch (context) {
        case "creatorAffiliation":
            return app.creatorBlocks[index].affiliations[i];

        case "creatorNameId":
            return app.creatorBlocks[index].nameIdentifiers[i];

        case "contributorAffiliation":
            return app.contributorBlocks[index].affiliations[i];

        case "contributorNameId":
            return app.contributorBlocks[index].nameIdentifiers[i];

        case "publisher":
            return app.publisherSearch;

        case "funder":
            return app.fundingReferenceBlocks[index];

        default:
            throw new Error(`Unknown ROR context: "${context}"`);
    }
}

/**
 * Writes (or clears) the context-specific fields after a ROR selection or reset.
 * Shared by selectROR and clearROR to avoid duplicating the switch logic.
 *
 * @param {object} app      - Metadata app object
 * @param {string} context  - ROR context identifier (see resolveRorTarget).
 * @param {number} index    - Block index.
 * @param {object} id       - Resolved target object (from resolveRorTarget).
 * @param {object} values   - { name, identifier, identifierScheme, identifierSchemeURI } – pass empty strings to clear.
 */
function applyRorFields(
    app,
    context,
    index,
    id,
    {
        name = "",
        identifier = "",
        identifierScheme = "",
        identifierSchemeURI = "",
    } = {},
) {
    switch (context) {
        case "creatorAffiliation":
            id.creatorAffiliation = name;
            id.affiliationIdentifier = identifier;
            id.affiliationIdentifierScheme = identifierScheme;
            id.affiliationIdentifierSchemeURI = identifierSchemeURI;
            break;

        case "creatorNameId":
            app.creatorBlocks[index].creatorName = name;
            id.nameIdentifier = identifier;
            id.nameIdentifierScheme = identifierScheme;
            id.nameIdentifierSchemeURI = identifierSchemeURI;
            break;

        case "contributorAffiliation":
            id.contributorAffiliation = name;
            id.affiliationIdentifier = identifier;
            id.affiliationIdentifierScheme = identifierScheme;
            id.affiliationIdentifierSchemeURI = identifierSchemeURI;
            break;

        case "contributorNameId":
            app.contributorBlocks[index].contributorName = name;
            id.nameIdentifier = identifier;
            id.nameIdentifierScheme = identifierScheme;
            id.nameIdentifierSchemeURI = identifierSchemeURI;
            break;

        case "publisher":
            app.publisher = name;
            app.publisherIdentifier = identifier;
            app.publisherIdentifierScheme = identifierScheme;
            app.publisherIdentifierSchemeURI = identifierSchemeURI;
            break;

        case "funder":
            id.funderName = name;
            id.funderIdentifier = identifier;
            id.funderIdentifierType = identifierScheme;
            id.funderIdentifierTypeURI = identifierSchemeURI;
            break;
    }
}

/**
 * Queries the ROR API for the organisation name or ROR ID entered in the
 * affiliation search field, and populates the dropdown with up to 15
 * results. Requires at least 2 characters to trigger a request.
 *
 * @param {number} index - Block index.
 * @param {number} i     - Affiliation or Name Identifier index.
 * @param {string} context - ROR context identifier (see resolveRorTarget).
 * @returns {Promise<void>}
 */
export async function fetchResults(index, i, context) {
    const id = resolveRorTarget(this, context, index, i);

    // if search query has less than 2 characters, no search is performed
    if (id.rorSearchQuery.length < 2) {
        id.rorResults = [];
        id.rorHasSearched = false;
        return;
    }

    try {
        const response = await fetch(
            `https://api.ror.org/organizations?query=${encodeURIComponent(id.rorSearchQuery)}`,
        );

        if (!response.ok) {
            id.rorResults = [];
            id.rorHasSearched = true;
            return;
        }

        const data = await response.json();

        id.rorHasSearched = true;

        // shows max 15 results
        id.rorResults = (data.items ?? []).slice(0, 15).map((item) => ({
            id: item.id,
            name: getRorName(item.names),
            displayName: getRorDisplayName(item.names),
            location: getRorLocation(item.locations),
        }));
    } catch (e) {
        console.error("ROR API error:", e);
        id.rorResults = [];
        id.rorHasSearched = true;
    }
}

/**
 * Selects a ROR search result and writes the identifier and display name
 * into the respective fields, then closes the dropdown.
 *
 * @param {{id: string, displayName: string}} item - Selected ROR result.
 * @param {number} index - Creator block index.
 * @param {number} i     - Affiliation index.
 * @param {string} context - ROR context identifier (see resolveRorTarget).
 */
export function selectROR(item, index, i, context) {
    const id = resolveRorTarget(this, context, index, i);

    id.rorSearchQuery = item.id;
    id.rorDropdownOpen = false;
    id.rorResults = [];
    id.rorHasSearched = false;

    applyRorFields(this, context, index, id, {
        name: item.displayName,
        identifier: item.id,
        identifierScheme: "ROR",
        identifierSchemeURI: "https://ror.org/",
    });
}

/**
 * Clears the ROR search field, dropdown state, and the respective fields.
 *
 * @param {number} index - Creator block index.
 * @param {number} i     - Affiliation index.
 * @param {string} context - ROR context identifier (see resolveRorTarget).
 */
export function clearROR(index, i, context) {
    const id = resolveRorTarget(this, context, index, i);

    id.rorSearchQuery = "";
    id.rorDropdownOpen = false;
    id.rorResults = [];
    id.rorHasSearched = false;

    applyRorFields(this, context, index, id);
}

/**
 * Resolves the preferred ROR display name variant.
 *
 * @param {Array<{types: string[], value: string}>} names - ROR name variants.
 * @returns {string} Preferred display name.
 */
function getRorDisplayName(names) {
    return names.find((n) => n.types.includes("ror_display"))?.value ?? "";
}

/**
 * Builds a compact organisation label from display name and acronym.
 *
 * @param {Array<{types: string[], value: string}>} names - ROR name variants.
 * @returns {string} Search result label.
 */
function getRorName(names) {
    const display =
        names.find((n) => n.types.includes("ror_display"))?.value ?? "";

    const acronym = names.find((n) => n.types.includes("acronym"))?.value;

    return acronym ? `${display} (${acronym})` : display;
}

/**
 * Formats the first available ROR location for result display.
 *
 * @param {Array<object>} locations - ROR location entries.
 * @returns {string} Human-readable location string.
 */
function getRorLocation(locations) {
    const { name = "", country_name = "" } =
        locations?.[0]?.geonames_details ?? {};

    return [name, country_name].filter(Boolean).join(", ");
}
