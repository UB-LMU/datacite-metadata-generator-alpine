/**
 * @file orcidSearch.js
 * @description Performs person lookup via ORCID API.
 */

import { validateOrcid } from "./validation.js";

/**
 * Resolves the creator or contributor block for an ORCID interaction.
 *
 * @param {object} app - Alpine application state.
 * @param {number} index - Block index.
 * @param {string} context - Either `creator` or `contributor`.
 * @returns {object} Matching creator/contributor block.
 */
function getBlock(app, index, context) {
    return context === "contributor"
        ? app.contributorBlocks[index]
        : app.creatorBlocks[index];
}

/**
 * Resolves the current name-identifier slot inside a creator or contributor block.
 *
 * @param {object} app - Alpine application state.
 * @param {number} index - Block index.
 * @param {number} i - Identifier index.
 * @param {string} context - Either `creator` or `contributor`.
 * @returns {object} Matching identifier slot.
 */
function getIdentifier(app, index, i, context) {
    return getBlock(app, index, context).nameIdentifiers[i];
}

/**
 * Fetches creator details (given name, family name) from the ORCID public
 * API for the ORCID iD stored in the identifier of different properties.
 * Updates the fields and the import state message.
 * Also imports the current employment affiliation if a ROR ID is available.
 * Used for: Creator and Contributor Name Identifier
 *
 * @param {number} index - Creator / Contributor block index.
 * @param {number} i     - Name identifier index within that creator / contributor block.
 * @param {string} context - "creator" or "contributor".
 * @returns {Promise<void>}
 */
export async function importOrcidInfo(index, i, context = "creator") {
    const block = getBlock(this, index, context);
    const identifier = block.nameIdentifiers[i];

    identifier.importState = this.t("status.searching");
    identifier.importStateType = "info";

    let orcid = identifier.nameIdentifier;

    // Remove prefix if included
    const prefix = "https://orcid.org/";

    if (orcid.startsWith(prefix)) {
        orcid = orcid.slice(prefix.length);
        identifier.nameIdentifier = orcid;
    }

    // Check if ORCID has a valid format
    const error = validateOrcid(orcid);

    if (error) {
        identifier.importState = error;
        identifier.importStateType = "error";
        return;
    }

    // Fetch creator information from ORCID API
    try {
        const response = await fetch(
            `https://pub.orcid.org/v3.0/${orcid.trim()}`,
            {
                headers: {
                    Accept: "application/json",
                },
            },
        );

        if (!response.ok) {
            identifier.importState = this.t("status.noEntryFound");
            identifier.importStateType = "error";
            return;
        }

        const data = await response.json();

        // Extract name and fill form field (name) automatically
        fillName(block, data, context);
        fillAffiliation(block, data, i, context);

        // Status message
        identifier.importState = block.givenName
            ? this.t("status.orcidFound", {
                  givenName: block.givenName,
                  familyName: block.familyName,
              })
            : this.t("status.orcidFoundNoName");

        identifier.importStateType = "success";

        this.regenerateAll();
    } catch {
        identifier.importState = this.t("status.orcidInquiryError");
        identifier.importStateType = "error";
    }
}

/**
 * Queries the ORCID expanded-search API for the search string entered by
 * the user, then populates the dropdown with up to 15 results.
 *
 * @param {number} index - Creator / Contributor block index.
 * @param {number} i     - Name identifier index within that creator / contributor block.
 * @param {string} context - "creator" or "contributor".
 * @returns {Promise<void>}
 */
export async function orcidSearch(index, i, context = "creator") {
    const identifier = getIdentifier(this, index, i, context);

    identifier.orcidLoading = true;
    identifier.orcidDropdownOpen = true;

    const query = identifier.orcidSearchQuery.replace(/ /g, "+AND+");

    try {
        const response = await fetch(
            `https://pub.orcid.org/v3.0/expanded-search/?q=${encodeURIComponent(query)}`,
            {
                headers: {
                    Accept: "application/json",
                },
            },
        );

        const data = await response.json();

        // shows max 15 results
        identifier.orcidResults = (data["expanded-result"] ?? [])
            .slice(0, 15)
            .map((r) => ({
                id: r["orcid-id"],
                firstName: r["given-names"],
                familyName: r["family-names"],
                institution: r["institution-name"],
            }));
    } catch {
        identifier.importState = this.t("status.orcidSearchFailed");
        identifier.importStateType = "error";
    }

    identifier.orcidLoading = false;
    identifier.orcidHasSearched = true;
}

/**
 * Selects an ORCID search result, triggers {@link importOrcidInfo} to
 * fill the creator / contributor fields, and closes the dropdown.
 *
 * @param {{id: string, firstName: string, familyName: string}} item - Selected result.
 * @param {number} index - Creator / Contributor block index.
 * @param {number} i     - Name identifier index.
 * @param {string} context - "creator" or "contributor".
 */
export function selectORCID(item, index, i, context = "creator") {
    const identifier = getIdentifier(this, index, i, context);

    identifier.nameIdentifier = item.id;
    identifier.nameIdentifierScheme = "ORCID";
    identifier.nameIdentifierSchemeURI = "https://orcid.org/";

    this.importOrcidInfo(index, i, context);

    identifier.orcidSearchQuery = item.id;
    identifier.orcidDropdownOpen = false;
    identifier.orcidResults = [];
    identifier.orcidHasSearched = false;
    identifier.orcidLoading = false;
}

/**
 * Clears the ORCID search field, dropdown state, creator name fields,
 * and the resolved ORCID iD for the given identifier slot.
 *
 * @param {number} index - Creator / Contributor block index.
 * @param {number} i     - Name identifier index.
 * @param {string} context - "creator" or "contributor".
 */
export function clearORCID(index, i, context = "creator") {
    const block = getBlock(this, index, context);
    const identifier = block.nameIdentifiers[i];
    const affiliation = block.affiliations[i];

    identifier.orcidSearchQuery = "";
    identifier.orcidDropdownOpen = false;
    identifier.orcidResults = [];
    identifier.orcidHasSearched = false;
    identifier.orcidLoading = false;
    identifier.importState = "";
    identifier.importStateType = "";

    identifier.nameIdentifier = "";
    identifier.nameIdentifierScheme = "";
    identifier.nameIdentifierSchemeURI = "";

    block.givenName = "";
    block.familyName = "";

    if (context === "contributor") {
        block.contributorName = "";
        affiliation.contributorAffiliation = "";
    } else {
        block.creatorName = "";
        affiliation.creatorAffiliation = "";
    }

    affiliation.affiliationIdentifier = "";
    affiliation.affiliationIdentifierScheme = "";
    affiliation.affiliationIdentifierSchemeURI = "";
}

/**
 * Extracts the preferred personal name from the ORCID response and writes it
 * into the creator/contributor name fields.
 *
 * @param {object} block - Target creator/contributor block.
 * @param {object} data - Parsed ORCID API response.
 * @param {string} context - Either `creator` or `contributor`.
 */
function fillName(block, data, context) {
    const name = data?.person?.name;

    block.givenName = name?.["given-names"]?.value || "";
    block.familyName = name?.["family-name"]?.value || "";

    const fullName =
        block.familyName || block.givenName
            ? `${block.familyName}, ${block.givenName}`
                  .trim()
                  .replace(/^,\s*|\s*,$/g, "")
            : "";

    if (context === "contributor") {
        block.contributorName = fullName;
    } else {
        block.creatorName = fullName;
    }
}

/**
 * Extracts the current ROR-backed affiliation from an ORCID profile and writes
 * it into the matching affiliation slot.
 *
 * @param {object} block - Target creator/contributor block.
 * @param {object} data - Parsed ORCID API response.
 * @param {number} i - Affiliation slot index.
 * @param {string} context - Either `creator` or `contributor`.
 */
function fillAffiliation(block, data, i, context) {
    // Current affiliation with ROR ID
    // Walks all employment entries and picks the first current one
    // (end-date === null) whose organisation is disambiguated via ROR.
    const groups =
        data?.["activities-summary"]?.employments?.["affiliation-group"] ?? [];

    // Flatten all employment-summary objects from all groups
    const employments = groups.flatMap(
        (group) =>
            group.summaries
                ?.map((s) => s?.["employment-summary"])
                .filter(Boolean) ?? [],
    );

    // Find the first current (no end-date) employment with a ROR identifier
    const current = employments.find((emp) => {
        const disambig = emp?.organization?.["disambiguated-organization"];

        return (
            emp["end-date"] === null &&
            disambig?.["disambiguation-source"] === "ROR"
        );
    });

    if (!current) return;

    const org = current.organization;
    const disambig = org["disambiguated-organization"];

    // Write into the affiliation slot of this creator/contributor.

    const affiliation = block.affiliations[i];

    if (context === "contributor") {
        affiliation.contributorAffiliation = org.name ?? "";
    } else {
        affiliation.creatorAffiliation = org.name ?? "";
    }

    affiliation.affiliationIdentifier =
        disambig["disambiguated-organization-identifier"] ?? "";

    affiliation.affiliationIdentifierScheme =
        disambig["disambiguation-source"] ?? "";

    affiliation.affiliationIdentifierSchemeURI = "https://ror.org/";
    affiliation.rorSearchQuery = affiliation.affiliationIdentifier;
}
