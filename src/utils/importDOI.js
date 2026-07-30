/**
 * @file importDOI.js
 * @description Fetches and imports DataCite metadata by resolving a DOI
 * against the DataCite REST API. Delegates full-record mapping to
 * importFromJSON, and related-item mapping to importRelatedItem.
 */

import { importFromJSON } from "./importJSON.js";
import {
    createEmptyRelatedItemCreator,
    createEmptyRelatedItemTitle,
    createEmptyRelatedItemContributor,
    createEmptyRelatedItemBlock,
} from "./blockFactories.js";

import {
    normalizeVocabularyValue,
    normalizeLanguageCode,
} from "./validation.js";

/**
 * Strips URL prefixes and the "doi:" scheme from a user-entered DOI string,
 * returning a clean identifier suitable for API queries.
 *
 * @param {string} doi - Raw DOI input (may include https://doi.org/ prefix).
 * @returns {string} Normalised DOI string (e.g. "10.1234/example").
 */
function normalizeDOI(doi) {
    return doi
        .trim()
        .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
        .replace(/^doi:/i, "");
}

/**
 * Maps a parsed DataCite API response into a single relatedItemsBlock entry.
 *
 * @param {object} app - The Alpine.js data object.
 * @param {object} block  - The relatedItemsBlock[index] object to write into.
 * @param {object} data   - Parsed JSON response from the DataCite API.
 */
function importRelatedItem(app, block, data) {
    const attrs = data?.data?.attributes;
    if (!attrs) return;

    // Identifier (already set before the fetch, but ensure type is set)
    block.relatedItemIdentifierType = "DOI";

    // Resource type
    block.relatedItemType = normalizeVocabularyValue(
        attrs.types?.resourceTypeGeneral,
        app.resourceTypeGeneralList,
        "value",
        app.importVocabularyWarningsRelItem,
        "relatedItem.resourceTypeGeneral",
    );

    // Creators
    const remoteCreators = attrs.creators ?? [];
    block.creators = remoteCreators.length
        ? remoteCreators.map((c) => ({
              creatorName: c.name ?? "",
              creatorNameLanguage: normalizeLanguageCode(
                  c.lang,
                  app.languageCodes,
                  app.importVocabularyWarningsRelItem,
                  "relatedItem.creator.language",
              ),
              givenName: c.givenName ?? "",
              familyName: c.familyName ?? "",
              nameType: normalizeVocabularyValue(
                  c.nameType,
                  app.nameTypes,
                  "value",
                  app.importVocabularyWarningsRelItem,
                  "relatedItem.creator.nametype",
              ),
          }))
        : [createEmptyRelatedItemCreator()];

    // Titles
    const remoteTitles = attrs.titles ?? [];
    block.titles = remoteTitles.length
        ? remoteTitles.map((t) => ({
              title: t.title ?? "",
              titleType: normalizeVocabularyValue(
                  t.titleType,
                  app.titleTypes,
                  "value",
                  app.importVocabularyWarningsRelItem,
                  "relatedItem.titleType",
              ),
              titleLanguage: normalizeLanguageCode(
                  t.lang,
                  app.languageCodes,
                  app.importVocabularyWarningsRelItem,
                  "relatedItem.title.language",
              ),
          }))
        : [createEmptyRelatedItemTitle()];

    block.publicationYear = attrs.publicationYear ?? "";

    block.volume = "";
    block.issue = "";
    block.number = "";
    block.numberType = "";
    block.firstPage = "";
    block.lastPage = "";
    block.edition = "";

    block.publisher = attrs.publisher?.name ?? "";

    // Contributors
    const remoteContributors = attrs.contributors ?? [];
    block.contributors = remoteContributors.length
        ? remoteContributors.map((c) => ({
              contributorType: normalizeVocabularyValue(
                  c.contributorType,
                  app.contributorTypes,
                  "value",
                  app.importVocabularyWarningsRelItem,
                  "relatedItem.contributorType",
              ),
              contributorName: c.name ?? "",
              contributorNameLanguage: normalizeLanguageCode(
                  c.lang,
                  app.languageCodes,
                  app.importVocabularyWarningsRelItem,
                  "relatedItem.contributor.language",
              ),
              givenName: c.givenName ?? "",
              familyName: c.familyName ?? "",
              nameType: normalizeVocabularyValue(
                  c.nameType,
                  app.nameTypes,
                  "value",
                  app.importVocabularyWarningsRelItem,
                  "relatedItem.contributor.nameType",
              ),
          }))
        : [createEmptyRelatedItemContributor()];
}

/**
 * Fetches DataCite metadata for a given DOI and either populates the full
 * Alpine.js form (mode "full") or a single relatedItemsBlock entry
 * (mode "relatedItem").
 *
 * @param {object} app            - The Alpine.js data object (passed as `this` context).
 * @param {object} [options]
 * @param {"full"|"relatedItem"}  [options.mode="full"]  - Import mode.
 * @param {number}                [options.index=0]      - relatedItemsBlock index (only used in "relatedItem" mode)
 * @returns {Promise<boolean>} True on success, false on any failure.
 */
export async function importViaDOI(app, { mode = "full", index = 0 } = {}) {
    // Resolve the DOI source depending on mode
    const rawDOI =
        mode === "relatedItem"
            ? app.relatedItemsBlock[index]?.relatedItemIdentifierSearch
            : app.doi;

    if (!rawDOI) {
        if (mode === "relatedItem") {
            app.relatedItemsBlock[index].doiImportState =
                app.t("import.doiRequired");
            app.relatedItemsBlock[index].doiImportStateType = "error";
        } else {
            app.doiStatus = app.t("import.doiRequired");
        }
        return false;
    }

    const cleanDOI = normalizeDOI(rawDOI);

    // Update status
    if (mode === "relatedItem") {
        app.relatedItemsBlock[index].doiImportState = app.t(
            "import.loadingRecord",
        );
        app.relatedItemsBlock[index].doiImportStateType = "info";
        // Write back the normalised DOI
        app.relatedItemsBlock[index].relatedItemIdentifier = cleanDOI;
    } else {
        app.doiStatus = app.t("import.loadingRecord");
    }

    try {
        const response = await fetch(
            `https://api.datacite.org/dois/${cleanDOI}?publisher=true&affiliation=true`,
        );

        if (!response.ok) {
            if (mode === "relatedItem") {
                app.relatedItemsBlock[index].doiImportState =
                    response.status === 404
                        ? app.t("import.noRecordInRegistry")
                        : app.t("import.noRecordFound");
                app.relatedItemsBlock[index].doiImportStateType = "error";
            } else {
                app.doiStatus =
                    response.status === 404
                        ? app.t("import.noRecordInRegistry")
                        : app.t("import.noRecordFound");
            }
            return false;
        }

        const data = await response.json();

        if (mode === "relatedItem") {
            importRelatedItem(app, app.relatedItemsBlock[index], data);
            const title =
                app.relatedItemsBlock[index].titles?.[0]?.title || cleanDOI;
            app.relatedItemsBlock[index].doiImportState = app.t(
                "import.relatedItemSuccess",
                { title },
            );
            app.relatedItemsBlock[index].doiImportStateType = "success";
            app.regenerateAll();
            return true;
        }

        // Default: full record import via existing importFromJSON
        return importFromJSON(app, data);
    } catch (e) {
        const msg = app.t("import.loadError");
        if (mode === "relatedItem") {
            app.relatedItemsBlock[index].doiImportState = app.t(
                "import.relatedItemError",
                { message: msg },
            );
            app.relatedItemsBlock[index].doiImportStateType = "error";
        } else {
            app.doiStatus = msg;
        }
        return false;
    }
}
