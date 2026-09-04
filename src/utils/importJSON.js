/**
 * @file importJSON.js
 * @description Parses and imports a DataCite metadata JSON file into the
 * Alpine.js application state. Sanitises all string values against control
 * characters and normalises controlled vocabulary fields and language codes.
 */

import {
    normalizeVocabularyValue,
    normalizeLanguageCode,
    normalizeNameIdentifierSchemeURI,
} from "./validation.js";
import {
    createEmptyTitleBlock,
    createEmptyCreatorBlock,
    createEmptyContributorBlock,
    createEmptyNameIdentifier,
    createEmptyAffiliation,
    createEmptyPublisherSearch,
    createEmptyDescriptionBlock,
    createEmptySubjectBlock,
    createEmptyRightBlock,
    createEmptyDateBlock,
    createEmptyRelatedIdentifierBlock,
    createEmptyGeoLocationBlock,
    createEmptyAlternateIdentifierBlock,
    createEmptyFormatBlock,
    createEmptySizeBlock,
    createEmptyPolygonPoint,
    createEmptyGeoLocationPolygon,
    createEmptyFundingReferenceBlock,
    createEmptyRelatedItemCreator,
    createEmptyRelatedItemTitle,
    createEmptyRelatedItemContributor,
    createEmptyRelatedItemBlock,
} from "./blockFactories.js";

/**
 * Normalises a string value by applying Unicode NFC normalisation and
 * stripping non-printable control characters.
 *
 * @param {string} value - The raw input string.
 * @returns {string} The sanitised string.
 */
function normalizeInputString(value) {
    return String(value || "")
        .normalize("NFC")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/**
 * Recursively sanitises all string values in a parsed JSON structure
 * (objects, arrays, or primitives) using {@link normalizeInputString}.
 *
 * @param {*} value - Any parsed JSON value.
 * @returns {*} The sanitised value with the same structure.
 */
function sanitizeJsonValue(value) {
    if (typeof value === "string") {
        return normalizeInputString(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeJsonValue(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, entryValue]) => [
                key,
                sanitizeJsonValue(entryValue),
            ]),
        );
    }

    return value;
}

/**
 * Parses a DataCite JSON string or already-parsed object and maps all
 * recognised fields into the Alpine.js application state. Vocabulary values
 * are normalised; unknown values are collected in
 * `app.importVocabularyWarnings`.
 *
 * Accepts either:
 *   - a raw JSON string (e.g. from a file upload), or
 *   - an already-parsed object (e.g. from a fetch() response).
 *
 * Expected JSON root: `{ data: { attributes: { ... } } }`
 *
 * @param {object} app               - The Alpine.js data object.
 * @param {string|object} jsonOrObject - Raw JSON string or parsed object.
 * @returns {boolean} True on success, false on failure.
 */
export function importFromJSON(app, jsonOrObject) {
    try {
        const dataRaw =
            typeof jsonOrObject === "string"
                ? sanitizeJsonValue(
                      JSON.parse(normalizeInputString(jsonOrObject)),
                  )
                : sanitizeJsonValue(jsonOrObject);

        const data = dataRaw?.data?.attributes;
        if (!data || typeof data !== "object") {
            throw new Error("Invalid DataCite JSON structure.");
        }

        app.importVocabularyWarnings = [];

        //Reset errors
        app.identifierError = "";
        app.identifierTypeError = "";
        app.publisherError = "";
        app.publisherLanguageError = "";
        app.publisherIdentifierSchemeError = "";
        app.resourceTypeError = "";
        app.resourceTypeGeneralError = "";
        app.importVocabularyWarningsRelItem = [];
        app.importMissingMandatoryFields = [];
        app.importValidationSummary = "";
        app.importValidationLevel = "";
        app.mandatoryMissingFields = [];
        app.mandatoryValidationSummary = "";
        app.mandatoryValidationLevel = "";
        app.doiStatus = "";

        // Titles
        const titles = data.titles || [];

        app.titleBlocks = titles.map((t) => ({
            title: t.title || "",
            titleType: normalizeVocabularyValue(
                t.titleType,
                app.titleTypes,
                "value",
                app.importVocabularyWarnings,
                "titleType",
            ),
            titleLanguage: normalizeLanguageCode(
                t.lang,
                app.languageCodes,
                app.importVocabularyWarnings,
                "titleLanguage",
            ),
            titleError: "",
        }));

        if (!app.titleBlocks.length) {
            app.titleBlocks = [createEmptyTitleBlock()];
        }

        // Identifier
        app.identifier = data.doi || "";
        app.identifierType = "DOI";

        // Publisher
        const publisherData = data.publisher || {};
        app.publisher = publisherData.name || "";
        app.publisherLanguage = normalizeLanguageCode(
            publisherData.lang,
            app.languageCodes,
            app.importVocabularyWarnings,
            "publisherLanguage",
        );
        app.publisherIdentifier = publisherData.publisherIdentifier || "";
        app.publisherIdentifierScheme = normalizeVocabularyValue(
            publisherData.publisherIdentifierScheme,
            app.publisherIdentifierSchema,
            "value",
            app.importVocabularyWarnings,
            "publisherIdentifierScheme",
        );
        // Accept URI format differences from external sources and normalize
        // to the standard scheme URI used by the app vocabulary.
        app.publisherIdentifierSchemeURI = normalizeVocabularyValue(
            publisherData.schemeUri,
            app.publisherIdentifierSchema,
            "uri",
            app.importVocabularyWarnings,
            "publisherIdentifierSchemeURI",
        );
        app.publisherSearch = createEmptyPublisherSearch();

        // Resource Type
        const resourceTypeData = data.types || {};
        app.resourceType = resourceTypeData.resourceType || "";
        app.resourceTypeGeneral = normalizeVocabularyValue(
            resourceTypeData.resourceTypeGeneral,
            app.resourceTypeGeneralList,
            "value",
            app.importVocabularyWarnings,
            "resourceTypeGeneral",
        );

        // Creators
        const creatorsData = data.creators || [];
        app.creatorBlocks = creatorsData.map((c) => ({
            creatorName: c.name || "",
            creatorNameLanguage: normalizeLanguageCode(
                c.lang,
                app.languageCodes,
                app.importVocabularyWarnings,
                "creatorNameLanguage",
            ),
            givenName: c.givenName || "",
            familyName: c.familyName || "",
            nameType: normalizeVocabularyValue(
                c.nameType,
                app.nameTypes,
                "value",
                app.importVocabularyWarnings,
                "creator.nameType",
            ),
            creatorNameError: "",
            nameIdentifiers: c.nameIdentifiers?.length
                ? c.nameIdentifiers.map((ni) => {
                      const normalizedScheme = normalizeVocabularyValue(
                          ni.nameIdentifierScheme,
                          app.nameIdentifierSchemes,
                          "value",
                          app.importVocabularyWarnings,
                          "creator.nameIdentifierScheme",
                      );

                      return {
                          nameIdentifierScheme: normalizedScheme,
                          nameIdentifierSchemeURI:
                              normalizeNameIdentifierSchemeURI(
                                  ni.schemeUri,
                                  normalizedScheme,
                                  app.nameIdentifierSchemes,
                                  app.importVocabularyWarnings,
                                  "creator.nameIdentifierSchemeURI",
                              ),
                          nameIdentifier: ni.nameIdentifier || "",
                          importState: "",
                          orcidSearchQuery: "",
                          orcidDropdownOpen: false,
                          orcidResults: [],
                          orcidHasSearched: false,
                          orcidLoading: false,
                          rorSearchQuery: "",
                          rorDropdownOpen: false,
                          rorResults: [],
                          rorHasSearched: false,
                      };
                  })
                : [createEmptyNameIdentifier()],

            affiliations: c.affiliation?.length
                ? c.affiliation.map((aff) => {
                      const affiliationIdentifierSchemeRaw =
                          aff.affiliationIdentifierScheme;
                      const normalizedAffiliationIdentifierScheme =
                          normalizeVocabularyValue(
                              affiliationIdentifierSchemeRaw,
                              app.affiliationIdentifierSchemes,
                              "value",
                              app.importVocabularyWarnings,
                              "creator.affiliationIdentifierScheme",
                          );

                      return {
                          creatorAffiliation: aff.name || "",
                          affiliationLanguage: normalizeLanguageCode(
                              aff.lang,
                              app.languageCodes,
                              app.importVocabularyWarnings,
                              "creator.affiliationLanguage",
                          ),
                          affiliationIdentifierScheme:
                              normalizedAffiliationIdentifierScheme,
                          affiliationIdentifierSchemeURI:
                              app.affiliationIdentifierSchemes.find(
                                  (a) =>
                                      a.value ===
                                      normalizedAffiliationIdentifierScheme,
                              )?.uri || "",
                          affiliationIdentifier:
                              aff.affiliationIdentifier || "",
                          rorSearchQuery: "",
                          rorDropdownOpen: false,
                          rorResults: [],
                          rorHasSearched: false,
                      };
                  })
                : [createEmptyAffiliation("creator")],
        }));

        if (!app.creatorBlocks.length) {
            app.creatorBlocks = [createEmptyCreatorBlock()];
        }

        // Publication Year
        app.publicationYear = data.publicationYear || "";

        // Descriptions
        const descriptionData = data.descriptions || [];
        app.descriptionBlocks = descriptionData.map((d) => ({
            description: d.description || "",
            descriptionType: normalizeVocabularyValue(
                d.descriptionType,
                app.descriptionTypes,
                "value",
                app.importVocabularyWarnings,
                "descriptionType",
            ),
            descriptionLanguage: normalizeLanguageCode(
                d.lang,
                app.languageCodes,
                app.importVocabularyWarnings,
                "descriptionLanguage",
            ),
            descriptionError: "",
            descriptionTypeError: "",
        }));

        if (!app.descriptionBlocks.length) {
            app.descriptionBlocks = [createEmptyDescriptionBlock()];
        }

        // Subjects
        const subjectsData = data.subjects || [];
        app.subjectBlocks = subjectsData.map((s) => ({
            selectSubjectScheme: "",
            subject: s.subject || "",
            subjectLanguage: normalizeLanguageCode(
                s.lang,
                app.languageCodes,
                app.importVocabularyWarnings,
                "subjectLanguage",
            ),
            subjectScheme: s.subjectScheme,
            subjectSchemeURI: s.schemeUri,
            valueURI: s.valueUri || "",
            classificationCode: s.classificationCode || "",
            subjectError: "",
        }));

        if (!app.subjectBlocks.length) {
            app.subjectBlocks = [createEmptySubjectBlock()];
        }

        // Dates
        const dateData = data.dates || [];
        app.dateBlocks = dateData.map((d) => ({
            date: d.date || "",
            dateType: normalizeVocabularyValue(
                d.dateType,
                app.dateTypes,
                "value",
                app.importVocabularyWarnings,
                "dateType",
            ),
            dateInformation: d.dateInformation || "",
            dateError: "",
            dateTypeError: "",
        }));

        if (!app.dateBlocks.length) {
            app.dateBlocks = [createEmptyDateBlock()];
        }

        // Related Identifiers
        const relatedIdentifiersData = data.relatedIdentifiers || [];
        app.relatedIdentifierBlocks = relatedIdentifiersData.map((ri) => ({
            relatedIdentifier: ri.relatedIdentifier || "",
            relatedIdentifierType: normalizeVocabularyValue(
                ri.relatedIdentifierType,
                app.relatedIdentifierTypes,
                "value",
                app.importVocabularyWarnings,
                "relatedIdentifierType",
            ),
            relationType: normalizeVocabularyValue(
                ri.relationType,
                app.relationTypes,
                "value",
                app.importVocabularyWarnings,
                "relationType",
            ),
            relationTypeInformation: ri.relationTypeInformation || "",
            relatedMetadataScheme: ri.relatedMetadataScheme || "",
            relatedMetadataSchemeURI: ri.schemeUri || "",
            relatedMetadataSchemeType: ri.schemeType || "",
            resourceTypeGeneral: normalizeVocabularyValue(
                ri.resourceTypeGeneral,
                app.resourceTypeGeneralList,
                "value",
                app.importVocabularyWarnings,
                "resourceTypeGeneral",
            ),
            relatedIdentifierError: "",
            relatedIdentifierTypeError: "",
            relationTypeError: "",
        }));

        if (!app.relatedIdentifierBlocks.length) {
            app.relatedIdentifierBlocks = [createEmptyRelatedIdentifierBlock()];
        }

        // Contributors
        const contributorsData = data.contributors || [];
        app.contributorBlocks = contributorsData.map((c) => ({
            contributorName: c.name || "",
            contributorNameLanguage: normalizeLanguageCode(
                c.lang,
                app.languageCodes,
                app.importVocabularyWarnings,
                "contributorNameLanguage",
            ),
            givenName: c.givenName || "",
            familyName: c.familyName || "",
            nameType: normalizeVocabularyValue(
                c.nameType,
                app.nameTypes,
                "value",
                app.importVocabularyWarnings,
                "contributor.nameType",
            ),
            contributorType: normalizeVocabularyValue(
                c.contributorType,
                app.contributorTypes,
                "value",
                app.importVocabularyWarnings,
                "contributorType",
            ),
            contributorTypeError: "",
            contributorNameError: "",
            nameIdentifiers: c.nameIdentifiers?.length
                ? c.nameIdentifiers.map((ni) => {
                      const normalizedScheme = normalizeVocabularyValue(
                          ni.nameIdentifierScheme,
                          app.nameIdentifierSchemes,
                          "value",
                          app.importVocabularyWarnings,
                          "contributor.nameIdentifierScheme",
                      );

                      return {
                          nameIdentifierScheme: normalizedScheme,
                          nameIdentifierSchemeURI:
                              normalizeNameIdentifierSchemeURI(
                                  ni.schemeUri,
                                  normalizedScheme,
                                  app.nameIdentifierSchemes,
                                  app.importVocabularyWarnings,
                                  "contributor.nameIdentifierSchemeURI",
                              ),
                          nameIdentifier: ni.nameIdentifier || "",
                          importState: "",
                          orcidSearchQuery: "",
                          orcidDropdownOpen: false,
                          orcidResults: [],
                          orcidHasSearched: false,
                          orcidLoading: false,
                          rorSearchQuery: "",
                          rorDropdownOpen: false,
                          rorResults: [],
                          rorHasSearched: false,
                      };
                  })
                : [createEmptyNameIdentifier()],
            affiliations: c.affiliation?.length
                ? c.affiliation.map((a) => ({
                      contributorAffiliation: a.name || "",
                      affiliationLanguage: normalizeLanguageCode(
                          a.lang,
                          app.languageCodes,
                          app.importVocabularyWarnings,
                          "contributor.affiliationLanguage",
                      ),
                      affiliationIdentifierScheme: normalizeVocabularyValue(
                          a.affiliationIdentifierScheme,
                          app.affiliationIdentifierSchemes,
                          "value",
                          app.importVocabularyWarnings,
                          "contributor.affiliationIdentifierScheme",
                      ),
                      affiliationIdentifierSchemeURI: a.schemeUri || "",
                      affiliationIdentifier: a.affiliationIdentifier || "",
                      rorSearchQuery: "",
                      rorDropdownOpen: false,
                      rorResults: [],
                      rorHasSearched: false,
                  }))
                : [createEmptyAffiliation("contributor")],
        }));

        if (!app.contributorBlocks.length) {
            app.contributorBlocks = [createEmptyContributorBlock()];
        }

        // Geo Location
        const geoLocationsData = data.geoLocations || [];
        app.geoLocationBlocks = geoLocationsData.map((g) => ({
            geoLocationPlace: g.geoLocationPlace ?? "",
            geoLocationPointLat: g.geoLocationPoint?.pointLatitude ?? "",
            geoLocationPointLong: g.geoLocationPoint?.pointLongitude ?? "",
            geoLocationBoxWest: g.geoLocationBox?.westBoundLongitude ?? "",
            geoLocationBoxEast: g.geoLocationBox?.eastBoundLongitude ?? "",
            geoLocationBoxSouth: g.geoLocationBox?.southBoundLatitude ?? "",
            geoLocationBoxNorth: g.geoLocationBox?.northBoundLatitude ?? "",
            geoErrors: [],
            geoLocationPolygon: g.geoLocationPolygon?.length
                ? [
                      {
                          polygonPoints: g.geoLocationPolygon
                              .filter((item) => item.polygonPoint)
                              .map((item) => ({
                                  polygonPointLat:
                                      item.polygonPoint?.pointLatitude ?? "",
                                  polygonPointLong:
                                      item.polygonPoint?.pointLongitude ?? "",
                              })),
                          inPolygonPointLat:
                              g.geoLocationPolygon.find(
                                  (item) => item.inPolygonPoint,
                              )?.inPolygonPoint?.pointLatitude ?? "",
                          inPolygonPointLong:
                              g.geoLocationPolygon.find(
                                  (item) => item.inPolygonPoint,
                              )?.inPolygonPoint?.pointLongitude ?? "",
                      },
                  ]
                : [createEmptyGeoLocationPolygon()],
        }));

        if (!app.geoLocationBlocks.length) {
            app.geoLocationBlocks = [createEmptyGeoLocationBlock()];
        }

        // Language
        app.language =
            app.languageCodes.find((l) => l.code === data.language)?.code || "";

        // Rights
        const rightsList = Array.isArray(data.rightsList)
            ? data.rightsList
            : [];

        app.rightsBlocks = rightsList.map((r) => ({
            selectLicense: "",
            right: r.rights || "",
            rightsLanguage: normalizeLanguageCode(
                r.lang,
                app.languageCodes,
                app.importVocabularyWarnings,
                "rightsLanguage",
            ),
            rightsURI: r.rightsUri || "",
            rightsIdentifier: r.rightsIdentifier || "",
            rightsIdentifierScheme: r.rightsIdentifierScheme || "",
            rightsIdentifierSchemeURI: r.schemeUri || "",
            rightError: "",
        }));

        if (!app.rightsBlocks.length) {
            app.rightsBlocks = [createEmptyRightBlock()];
        }

        // Funding Reference
        const fundingReferences = Array.isArray(data.fundingReferences)
            ? data.fundingReferences
            : [];

        app.fundingReferenceBlocks = fundingReferences.map((f) => ({
            funderName: f.funderName || "",
            funderIdentifier: f.funderIdentifier || "",
            funderIdentifierType:
                app.funderIdentifierTypes.find(
                    (fid) => fid.value === f.funderIdentifierType,
                )?.value || "",
            funderIdentifierTypeURI:
                app.funderIdentifierTypes.find(
                    (fid) => fid.value === f.funderIdentifierType,
                )?.uri || "",
            awardNumber: f.awardNumber || "",
            awardUri: f.awardUri || "",
            awardTitle: f.awardTitle || "",
            funderNameError: "",
            funderIdentifierTypeError: "",
            rorSearchQuery: "",
            rorSearchQuery: "",
            rorDropdownOpen: false,
            rorResults: [],
            rorHasSearched: false,
        }));

        if (!app.fundingReferenceBlocks.length) {
            app.fundingReferenceBlocks = [createEmptyFundingReferenceBlock()];
        }

        // Alternate Identifiers
        const alternateIdentifiers = Array.isArray(data.alternateIdentifiers)
            ? data.alternateIdentifiers
            : [];

        app.altIdentifierBlocks = alternateIdentifiers.map((aid) => ({
            alternateIdentifierType: aid.alternateIdentifierType || "",
            alternateIdentifier: aid.alternateIdentifier || "",
            alternateIdentifierError: "",
            alternateIdentifierTypeError: "",
        }));

        if (!app.altIdentifierBlocks.length) {
            app.altIdentifierBlocks = [createEmptyAlternateIdentifierBlock()];
        }

        // Sizes
        const sizes = Array.isArray(data.sizes) ? data.sizes : [];

        app.sizeBlocks = sizes.length
            ? sizes.filter(Boolean).map((s) => ({ size: s, sizeError: "" }))
            : [createEmptySizeBlock()];

        // Formats
        const formats = Array.isArray(data.formats) ? data.formats : [];

        app.formatBlocks = formats.length
            ? formats
                  .filter(Boolean)
                  .map((f) => ({ format: f, formatError: "" }))
            : [createEmptyFormatBlock()];

        // Version
        app.version = data.version || "";

        // Related Items
        const relatedItems = Array.isArray(data.relatedItems)
            ? data.relatedItems
            : [];

        app.relatedItemsBlock = relatedItems.length
            ? relatedItems.map((r) => {
                  const relatedItemIdentifier = r.relatedItemIdentifier || {};

                  return {
                      relatedItemIdentifierSearch: "",
                      relatedItemType: normalizeVocabularyValue(
                          r.relatedItemType,
                          app.resourceTypeGeneralList,
                          "value",
                          app.importVocabularyWarnings,
                          "relatedItemType",
                      ),
                      relatedItemIdentifier:
                          relatedItemIdentifier.relatedItemIdentifier || "",
                      relatedItemIdentifierType: normalizeVocabularyValue(
                          relatedItemIdentifier.relatedItemIdentifierType,
                          app.relatedIdentifierTypes,
                          "value",
                          app.importVocabularyWarnings,
                          "relatedItemIdentifierType",
                      ),
                      relatedMetadataScheme:
                          relatedItemIdentifier.relatedMetadataScheme || "",
                      relatedIdentifierSchemeURI:
                          relatedItemIdentifier.schemeUri || "",
                      relatedIdentifierSchemeType:
                          relatedItemIdentifier.schemeType || "",
                      relationType: normalizeVocabularyValue(
                          r.relationType,
                          app.relationTypes,
                          "value",
                          app.importVocabularyWarnings,
                          "relatedItem.relationType",
                      ),
                      relationTypeInformation: r.relationTypeInformation || "",
                      creators: r.creators?.length
                          ? r.creators.map((c) => ({
                                creatorName: c.name || "",
                                creatorNameLanguage: normalizeLanguageCode(
                                    c.lang,
                                    app.languageCodes,
                                    app.importVocabularyWarnings,
                                    "relatedItem.creatorNameLanguage",
                                ),
                                givenName: c.givenName || "",
                                familyName: c.familyName || "",
                                nameType: normalizeVocabularyValue(
                                    c.nameType,
                                    app.nameTypes,
                                    "value",
                                    app.importVocabularyWarnings,
                                    "relatedItem.creator.nameType",
                                ),
                            }))
                          : [createEmptyRelatedItemCreator()],
                      titles: r.titles?.length
                          ? r.titles.map((t) => ({
                                title: t.title || "",
                                titleType: normalizeVocabularyValue(
                                    t.titleType,
                                    app.titleTypes,
                                    "value",
                                    app.importVocabularyWarnings,
                                    "relatedItem.title.titleType",
                                ),
                                titleLanguage: normalizeLanguageCode(
                                    t.lang,
                                    app.languageCodes,
                                    app.importVocabularyWarnings,
                                    "relatedItem.titleLanguage",
                                ),
                            }))
                          : [createEmptyRelatedItemTitle()],
                      publicationYear: r.publicationYear || "",
                      volume: r.volume || "",
                      issue: r.issue || "",
                      number: r.number || "",
                      numberType: normalizeVocabularyValue(
                          r.numberType,
                          app.numberTypes,
                          "value",
                          app.importVocabularyWarnings,
                          "relatedItem.numberType",
                      ),
                      firstPage: r.firstPage || "",
                      lastPage: r.lastPage || "",
                      edition: r.edition || "",
                      publisher: r.publisher || "",
                      contributors: r.contributors?.length
                          ? r.contributors.map((co) => ({
                                contributorType: normalizeVocabularyValue(
                                    co.contributorType,
                                    app.contributorTypes,
                                    "value",
                                    app.importVocabularyWarnings,
                                    "relatedItem.contributor.contributorType",
                                ),
                                contributorName: co.name || "",
                                contributorNameLanguage: normalizeLanguageCode(
                                    co.lang,
                                    app.languageCodes,
                                    app.importVocabularyWarnings,
                                    "relatedItem.contributorNameLanguage",
                                ),
                                givenName: co.givenName || "",
                                familyName: co.familyName || "",
                                nameType: normalizeVocabularyValue(
                                    co.nameType,
                                    app.nameTypes,
                                    "value",
                                    app.importVocabularyWarnings,
                                    "relatedItem.contributor.nameType",
                                ),
                            }))
                          : [createEmptyRelatedItemContributor()],
                      doiImportState: "",
                  };
              })
            : [createEmptyRelatedItemBlock()];

        app.jsonStatus = "";

        // Refresh preview
        app.regenerateAll();
        return true;
    } catch (e) {
        const message =
            e instanceof Error && e.message
                ? e.message
                : app.t("import.unknownImportError");
        app.jsonStatus = app.t("import.invalidJSON", { message });
        return false;
    }
}
