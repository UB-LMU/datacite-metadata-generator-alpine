/**
 * @file importXML.js
 * @description Parses and imports a DataCite Kernel 4 XML file into the
 * Alpine.js application state. Includes security checks against forbidden
 * XML constructs (DOCTYPE, external entities, script tags) before parsing.
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
 * Removes formatting artefacts from imported XML text values.
 * Collapses repeated whitespace (including newlines/tabs) and trims edges.
 *
 * @param {string} value - Raw text value from XML content.
 * @returns {string} Cleaned text for form fields.
 */
function normalizeImportedText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Recursively normalises all string fields in imported data structures.
 *
 * @param {any} value - Imported value, array, or plain object.
 * @returns {any} Sanitized value.
 */
function sanitizeImportedData(value) {
    if (typeof value === "string") {
        return normalizeImportedText(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeImportedData(item));
    }

    if (value && typeof value === "object") {
        const result = {};
        Object.entries(value).forEach(([key, currentValue]) => {
            result[key] = sanitizeImportedData(currentValue);
        });
        return result;
    }

    return value;
}

/**
 * Checks whether an XML string contains forbidden constructs that could
 * be used for injection attacks (XXE, XSS, etc.).
 * Blocked patterns: DOCTYPE declarations, ENTITY definitions,
 * script elements, and xml-stylesheet processing instructions.
 *
 * @param {string} xmlText - The raw XML string to inspect.
 * @returns {boolean} True if forbidden markup is detected.
 */
function containsForbiddenXmlMarkup(xmlText) {
    const forbiddenPattern =
        /<!DOCTYPE|<!ENTITY|<\s*script\b|<\?xml-stylesheet/i;
    return forbiddenPattern.test(xmlText);
}

/**
 * Removes XML comments before parsing so human-written annotations do not
 * interfere with import handling.
 *
 * @param {string} xmlText - Raw XML input.
 * @returns {string} XML without comment nodes.
 */
function stripXmlComments(xmlText) {
    return String(xmlText || "").replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Finds the first direct child element by namespace and local tag name.
 *
 * @param {Element} parent - Parent element.
 * @param {string} ns - Expected namespace URI.
 * @param {string} localName - Local element name.
 * @returns {Element|undefined} Matching child element, if present.
 */
function findDirectChildByName(parent, ns, localName) {
    return Array.from(parent.childNodes).find(
        (node) =>
            node.nodeType === 1 &&
            node.localName === localName &&
            node.namespaceURI === ns,
    );
}

/**
 * Parses a DataCite Kernel 4 XML string and maps all recognised elements
 * into the Alpine.js application state. Vocabulary values are normalised;
 * unknown values are collected in `app.importVocabularyWarnings`.
 *
 * Security checks are applied before parsing to prevent XXE and XSS vectors.
 * The document must use the DataCite Kernel 4 namespace
 * (`http://datacite.org/schema/kernel-4`).
 *
 * @param {object} app     - The Alpine.js data object (passed as `this` context).
 * @param {string} xmlText - Raw XML file content as a string.
 * @returns {boolean}
 */
export function importFromXML(app, xmlText) {
    try {
        app.importVocabularyWarnings = [];

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

        const normalizedXmlText = stripXmlComments(
            normalizeInputString(xmlText),
        );
        if (containsForbiddenXmlMarkup(normalizedXmlText)) {
            throw new Error(app.t("import.forbiddenXMLMarkup"));
        }

        const parser = new DOMParser();
        const xml = parser.parseFromString(
            normalizedXmlText,
            "application/xml",
        );

        if (xml.querySelector("parsererror")) {
            throw new Error(app.t("import.invalidXMLSyntax"));
        }
        
        const ns = xml.documentElement.namespaceURI;
        const root = xml.documentElement;

        
        // Check if this is a DataCite XML
        if (
            root.localName !== "resource" ||
            root.namespaceURI !== "http://datacite.org/schema/kernel-4"
        ) {
            throw new Error(app.t("import.invalidDataCiteXML"));
        }

        // Creators
        const creatorsElement = findDirectChildByName(root, ns, "creators");
        const creators = creatorsElement
            ? Array.from(creatorsElement.getElementsByTagNameNS(ns, "creator"))
            : [];

        app.creatorBlocks = creators.map((creator) => {
            const creatorNameEl = creator.getElementsByTagNameNS(
                ns,
                "creatorName",
            )[0];

            const nameIdentifiers = Array.from(
                creator.getElementsByTagNameNS(ns, "nameIdentifier"),
            ).map((ni) => {
                const normalizedScheme = normalizeVocabularyValue(
                    ni.getAttribute("nameIdentifierScheme"),
                    app.nameIdentifierSchemes,
                    "value",
                    app.importVocabularyWarnings,
                    "nameIdentifierScheme",
                );

                return {
                    nameIdentifier: ni.textContent || "",
                    nameIdentifierScheme: normalizedScheme,
                    nameIdentifierSchemeURI: normalizeNameIdentifierSchemeURI(
                        ni.getAttribute("schemeURI"),
                        normalizedScheme,
                        app.nameIdentifierSchemes,
                        app.importVocabularyWarnings,
                        "nameIdentifierSchemeURI",
                    ),
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
            });

            if (!nameIdentifiers.length) {
                nameIdentifiers.push(
                    createEmptyNameIdentifier()
                );
            }

            const affiliations = Array.from(
                creator.getElementsByTagNameNS(ns, "affiliation"),
            ).map((aff) => ({
                creatorAffiliation: aff.textContent || "",
                affiliationIdentifier:
                    aff.getAttribute("affiliationIdentifier") || "",
                affiliationIdentifierScheme: normalizeVocabularyValue(
                    aff.getAttribute("affiliationIdentifierScheme"),
                    app.affiliationIdentifierSchemes,
                    "value",
                    app.importVocabularyWarnings,
                    "affiliationIdentifierScheme",
                ),
                affiliationIdentifierSchemeURI: normalizeVocabularyValue(
                    aff.getAttribute("schemeURI"),
                    app.affiliationIdentifierSchemes,
                    "uri",
                    app.importVocabularyWarnings,
                    "affiliationIdentifierSchemeURI",
                ),
                rorSearchQuery: "",
                rorDropdownOpen: false,
                rorResults: [],
                rorHasSearched: false,
            }));

            if (!affiliations.length) {
                affiliations.push(
                    createEmptyAffiliation("creator")
                );
            }

            return {
                creatorName: creatorNameEl?.textContent || "",
                creatorNameLanguage: normalizeLanguageCode(
                    creatorNameEl?.getAttribute("xml:lang"),
                    app.languageCodes,
                    app.importVocabularyWarnings,
                    "creatorNameLanguage",
                ),
                givenName:
                    creator.getElementsByTagNameNS(ns, "givenName")[0]
                        ?.textContent || "",
                familyName:
                    creator.getElementsByTagNameNS(ns, "familyName")[0]
                        ?.textContent || "",
                nameType: normalizeVocabularyValue(
                    creatorNameEl?.getAttribute("nameType"),
                    app.nameTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "nameType",
                ),
                nameIdentifiers,
                affiliations,
            };
        });

        if (!app.creatorBlocks.length) {
            app.creatorBlocks = [
                createEmptyCreatorBlock()
            ];
        }

        // Titles
        const titlesElement = findDirectChildByName(root, ns, "titles");
        const titles = titlesElement
            ? Array.from(titlesElement.getElementsByTagNameNS(ns, "title"))
            : [];

        app.titleBlocks = titles.map((t) => ({
            title: t.textContent || "",
            titleType: normalizeVocabularyValue(
                t.getAttribute("titleType"),
                app.titleTypes,
                "value",
                app.importVocabularyWarnings,
                "titleType",
            ),
            titleLanguage: normalizeLanguageCode(
                t.getAttribute("xml:lang"),
                app.languageCodes,
                app.importVocabularyWarnings,
                "titleLanguage",
            ),
            titleError: "",
        }));

        if (!app.titleBlocks.length) {
            app.titleBlocks = [
                createEmptyTitleBlock()
            ];
        }

        // Identifier
        app.identifier =
            xml.getElementsByTagNameNS(ns, "identifier")[0]?.textContent || "";
        app.identifierType = "DOI";

        // Publisher
        const publisherEl = xml.getElementsByTagNameNS(ns, "publisher")[0];
        app.publisher = publisherEl?.textContent || "";
        app.publisherLanguage = normalizeLanguageCode(
            publisherEl?.getAttribute("xml:lang"),
            app.languageCodes,
            app.importVocabularyWarnings,
            "publisherLanguage",
        );
        app.publisherIdentifier =
            publisherEl?.getAttribute("publisherIdentifier") || "";
        app.publisherIdentifierScheme = normalizeVocabularyValue(
            publisherEl?.getAttribute("publisherIdentifierScheme"),
            app.publisherIdentifierSchema,
            "value",
            app.importVocabularyWarnings,
            "publisherIdentifierScheme",
        );
        // Use URI-aware normalization so both slash/no-slash variants map to
        // the standard scheme URI in the controlled vocabulary.
        app.publisherIdentifierSchemeURI = normalizeVocabularyValue(
            publisherEl?.getAttribute("schemeURI"),
            app.publisherIdentifierSchema,
            "uri",
            app.importVocabularyWarnings,
            "publisherIdentifierSchemeURI",
        );
        app.publisherSearch = createEmptyPublisherSearch();

        // Publication Year
        app.publicationYear =
            xml.getElementsByTagNameNS(ns, "publicationYear")[0]?.textContent ||
            "";

        // Resource Type
        const resourceTypeEl = xml.getElementsByTagNameNS(
            ns,
            "resourceType",
        )[0];
        app.resourceType = resourceTypeEl?.textContent || "";
        app.resourceTypeGeneral = normalizeVocabularyValue(
            resourceTypeEl?.getAttribute("resourceTypeGeneral"),
            app.resourceTypeGeneralList,
            "value",
            app.importVocabularyWarnings,
            "resourceTypeGeneral",
        );

        // Descriptions
        const descriptions = Array.from(
            xml.getElementsByTagNameNS(ns, "description"),
        );

        app.descriptionBlocks = descriptions.map((d) => ({
            description: d.textContent || "",
            descriptionType: normalizeVocabularyValue(
                d.getAttribute("descriptionType"),
                app.descriptionTypes,
                "value",
                app.importVocabularyWarnings,
                "descriptionType",
            ),
            descriptionLanguage: normalizeLanguageCode(
                d.getAttribute("xml:lang"),
                app.languageCodes,
                app.importVocabularyWarnings,
                "descriptionLanguage",
            ),
            descriptionError: "",
            descriptionTypeError: "",
        }));

        if (!app.descriptionBlocks.length) {
            app.descriptionBlocks = [
                createEmptyDescriptionBlock()
            ];
        }

        // Subjects
        const subjects = Array.from(xml.getElementsByTagNameNS(ns, "subject"));
        app.subjectBlocks = subjects.map((s) => ({
            selectSubjectScheme: "",
            subject: s.textContent || "",
            subjectLanguage: normalizeLanguageCode(
                s.getAttribute("xml:lang"),
                app.languageCodes,
                app.importVocabularyWarnings,
                "subjectLanguage",
            ),
            subjectScheme: s.getAttribute("subjectScheme"),
            subjectSchemeURI: s.getAttribute("schemeURI"),
            valueURI: s.getAttribute("valueURI") || "",
            classificationCode: s.getAttribute("classificationCode") || "",
            subjectError: "",
        }));

        if (!app.subjectBlocks.length) {
            app.subjectBlocks = [
                createEmptySubjectBlock()
            ];
        }

        // Dates
        const dates = Array.from(xml.getElementsByTagNameNS(ns, "date"));
        app.dateBlocks = dates.map((d) => ({
            date: d.textContent || "",
            dateType: normalizeVocabularyValue(
                d.getAttribute("dateType"),
                app.dateTypes,
                "value",
                app.importVocabularyWarnings,
                "dateType",
            ),
            dateInformation: d.getAttribute("dateInformation") || "",
            dateError: "",
            dateTypeError: "",
        }));

        if (!app.dateBlocks.length) {
            app.dateBlocks = [
                createEmptyDateBlock()
            ];
        }

        // Related Identifiers
        const relatedIdentifiers = Array.from(
            xml.getElementsByTagNameNS(ns, "relatedIdentifier"),
        );
        app.relatedIdentifierBlocks = relatedIdentifiers.map((ri) => ({
            relatedIdentifier: ri.textContent || "",
            relatedIdentifierType: normalizeVocabularyValue(
                ri.getAttribute("relatedIdentifierType"),
                app.relatedIdentifierTypes,
                "value",
                app.importVocabularyWarnings,
                "relatedIdentifierType",
            ),
            relationType: normalizeVocabularyValue(
                ri.getAttribute("relationType"),
                app.relationTypes,
                "value",
                app.importVocabularyWarnings,
                "relationType",
            ),
            relatedMetadataScheme:
                ri.getAttribute("relatedMetadataScheme") || "",
            relatedMetadataSchemeURI: ri.getAttribute("schemeURI") || "",
            relatedMetadataSchemeType: ri.getAttribute("schemeType") || "",
            resourceTypeGeneral: normalizeVocabularyValue(
                ri.getAttribute("resourceTypeGeneral"),
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
            app.relatedIdentifierBlocks = [
                createEmptyRelatedIdentifierBlock()
            ];
        }

        // Contributors
        const contributorsElement = findDirectChildByName(
            root,
            ns,
            "contributors",
        );

        const contributors = contributorsElement
            ? Array.from(
                  contributorsElement.getElementsByTagNameNS(ns, "contributor"),
              )
            : [];

        app.contributorBlocks = contributors.map((contributor) => {
            const nameIdentifiers = Array.from(
                contributor.getElementsByTagNameNS(ns, "nameIdentifier"),
            ).map((ni) => {
                const normalizedScheme = normalizeVocabularyValue(
                    ni.getAttribute("nameIdentifierScheme"),
                    app.nameIdentifierSchemes,
                    "value",
                    app.importVocabularyWarnings,
                    "nameIdentifierScheme",
                );

                return {
                    nameIdentifierScheme: normalizedScheme,
                    nameIdentifierSchemeURI: normalizeNameIdentifierSchemeURI(
                        ni.getAttribute("schemeURI"),
                        normalizedScheme,
                        app.nameIdentifierSchemes,
                        app.importVocabularyWarnings,
                        "nameIdentifierSchemeURI",
                    ),
                    nameIdentifier: ni.textContent || "",
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
            });

            if (!nameIdentifiers.length) {
                nameIdentifiers.push(
                    createEmptyNameIdentifier()
                );
            }

            const affiliations = Array.from(
                contributor.getElementsByTagNameNS(ns, "affiliation"),
            ).map((aff) => ({
                contributorAffiliation: aff.textContent || "",
                affiliationIdentifierScheme: normalizeVocabularyValue(
                    aff.getAttribute("affiliationIdentifierScheme"),
                    app.affiliationIdentifierSchemes,
                    "value",
                    app.importVocabularyWarnings,
                    "affiliationIdentifierScheme",
                ),
                affiliationIdentifierSchemeURI: normalizeVocabularyValue(
                    aff.getAttribute("schemeURI"),
                    app.affiliationIdentifierSchemes,
                    "uri",
                    app.importVocabularyWarnings,
                    "affiliationIdentifierSchemeURI",
                ),
                affiliationIdentifier:
                    aff.getAttribute("affiliationIdentifier") || "",
                rorSearchQuery: "",
                rorDropdownOpen: false,
                rorResults: [],
                rorHasSearched: false,
            }));

            if (!affiliations.length) {
                affiliations.push(
                    createEmptyAffiliation("contributor")
                );
            }

            return {
                contributorName:
                    contributor.getElementsByTagNameNS(ns, "contributorName")[0]
                        ?.textContent || "",
                contributorNameLanguage: normalizeLanguageCode(
                    contributor
                        .getElementsByTagNameNS(ns, "contributorName")[0]
                        ?.getAttribute("xml:lang"),
                    app.languageCodes,
                    app.importVocabularyWarnings,
                    "contributorNameLanguage",
                ),
                givenName:
                    contributor.getElementsByTagNameNS(ns, "givenName")[0]
                        ?.textContent || "",
                familyName:
                    contributor.getElementsByTagNameNS(ns, "familyName")[0]
                        ?.textContent || "",
                nameType: normalizeVocabularyValue(
                    contributor
                        .getElementsByTagNameNS(ns, "contributorName")[0]
                        ?.getAttribute("nameType"),
                    app.nameTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "nameType",
                ),
                contributorType: normalizeVocabularyValue(
                    contributor?.getAttribute("contributorType"),
                    app.contributorTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "contributorType",
                ),
                contributorTypeError: "",
                contributorNameError: "",
                nameIdentifiers,
                affiliations,
            };
        });

        if (!app.contributorBlocks.length) {
            app.contributorBlocks = [
                createEmptyContributorBlock()
            ];
        }

        // Geo Location
        const geoLocations = Array.from(
            root.getElementsByTagNameNS(ns, "geoLocation"),
        );

        app.geoLocationBlocks = geoLocations.length
            ? geoLocations.map((g) => {
                  const geoLocationPolygon = Array.from(
                      g.getElementsByTagNameNS(ns, "geoLocationPolygon"),
                  ).map((poly) => {
                      const polygonPoints = Array.from(
                          poly.getElementsByTagNameNS(ns, "polygonPoint"),
                      ).map((p) => ({
                          polygonPointLong:
                              p.getElementsByTagNameNS(ns, "pointLongitude")[0]
                                  ?.textContent || "",
                          polygonPointLat:
                              p.getElementsByTagNameNS(ns, "pointLatitude")[0]
                                  ?.textContent || "",
                      }));

                      if (!polygonPoints.length) {
                          polygonPoints.push(
                              { polygonPointLong: "", polygonPointLat: "" },
                              { polygonPointLong: "", polygonPointLat: "" },
                              { polygonPointLong: "", polygonPointLat: "" },
                              { polygonPointLong: "", polygonPointLat: "" },
                          );
                      }

                      return {
                          polygonPoints,
                          inPolygonPointLong:
                              poly
                                  .getElementsByTagNameNS(
                                      ns,
                                      "inPolygonPoint",
                                  )[0]
                                  ?.getElementsByTagNameNS(
                                      ns,
                                      "pointLongitude",
                                  )[0]?.textContent || "",
                          inPolygonPointLat:
                              poly
                                  .getElementsByTagNameNS(
                                      ns,
                                      "inPolygonPoint",
                                  )[0]
                                  ?.getElementsByTagNameNS(
                                      ns,
                                      "pointLatitude",
                                  )[0]?.textContent || "",
                      };
                  });

                  if (!geoLocationPolygon.length) {
                      geoLocationPolygon.push(
                        createEmptyGeoLocationPolygon()
                      );
                  }

                  return {
                      geoLocationPlace:
                          g.getElementsByTagNameNS(ns, "geoLocationPlace")[0]
                              ?.textContent || "",
                      geoLocationPointLong:
                          g
                              .getElementsByTagNameNS(ns, "geoLocationPoint")[0]
                              ?.getElementsByTagNameNS(ns, "pointLongitude")[0]
                              ?.textContent || "",
                      geoLocationPointLat:
                          g
                              .getElementsByTagNameNS(ns, "geoLocationPoint")[0]
                              ?.getElementsByTagNameNS(ns, "pointLatitude")[0]
                              ?.textContent || "",
                      geoLocationBoxWest:
                          g.getElementsByTagNameNS(ns, "westBoundLongitude")[0]
                              ?.textContent || "",
                      geoLocationBoxEast:
                          g.getElementsByTagNameNS(ns, "eastBoundLongitude")[0]
                              ?.textContent || "",
                      geoLocationBoxSouth:
                          g.getElementsByTagNameNS(ns, "southBoundLatitude")[0]
                              ?.textContent || "",
                      geoLocationBoxNorth:
                          g.getElementsByTagNameNS(ns, "northBoundLatitude")[0]
                              ?.textContent || "",
                      geoErrors: [],
                      geoLocationPolygon,
                  };
              })
            : [
                  createEmptyGeoLocationBlock()
              ];

        // Language
        const importedLanguage = normalizeImportedText(
            xml.getElementsByTagNameNS(ns, "language")[0]?.textContent,
        );
        app.language =
            app.languageCodes.find((l) => l.code === importedLanguage)?.code ||
            "";

        // Rights
        const rights = Array.from(
            root.getElementsByTagNameNS(ns, "rights"),
        );

        app.rightsBlocks = rights.length
            ? rights.map((r) => ({
                  selectLicense: "",
                  right: r.textContent || "",
                  rightsLanguage: normalizeLanguageCode(
                      r.getAttribute("xml:lang"),
                      app.languageCodes,
                      app.importVocabularyWarnings,
                      "rightsLanguage",
                  ),
                  rightsURI: r.getAttribute("rightsURI") || "",
                  rightsIdentifier: r.getAttribute("rightsIdentifier") || "",
                  rightsIdentifierScheme:
                      r.getAttribute("rightsIdentifierScheme") || "",
                  rightsIdentifierSchemeURI: r.getAttribute("schemeURI") || "",
                  rightError: "",
              }))
            : [
                    createEmptyRightBlock()
              ];

        // Funding Reference
        const funders = Array.from(
            root.getElementsByTagNameNS(ns, "fundingReference"),
        );

        app.fundingReferenceBlocks = funders.length
            ? funders.map((f) => ({
                  funderName:
                      f.getElementsByTagNameNS(ns, "funderName")[0]
                          ?.textContent || "",
                  funderIdentifier:
                      f.getElementsByTagNameNS(ns, "funderIdentifier")[0]
                          ?.textContent || "",
                  funderIdentifierType: normalizeVocabularyValue(
                      f
                          .getElementsByTagNameNS(ns, "funderIdentifier")[0]
                          ?.getAttribute("funderIdentifierType"),
                      app.funderIdentifierTypes,
                      "value",
                      app.importVocabularyWarnings,
                      "funderIdentifierType",
                  ),
                  funderIdentifierTypeURI:
                      f
                          .getElementsByTagNameNS(ns, "funderIdentifier")[0]
                          ?.getAttribute("schemeURI") || "",
                  awardNumber:
                      f.getElementsByTagNameNS(ns, "awardNumber")[0]
                          ?.textContent || "",
                  awardUri:
                      f
                          .getElementsByTagNameNS(ns, "awardNumber")[0]
                          ?.getAttribute("awardURI") || "",
                  awardTitle:
                      f.getElementsByTagNameNS(ns, "awardTitle")[0]
                          ?.textContent || "",
                  funderNameError: "",
                  funderIdentifierTypeError: "",
                  rorSearchQuery: "",
                  rorDropdownOpen: false,
                  rorResults: [],
                  rorHasSearched: false,
              }))
            : [
                  createEmptyFundingReferenceBlock()
              ];

        // Alternate Identifier
        const altIdentifiers = Array.from(
            root.getElementsByTagNameNS(ns, "alternateIdentifier"),
        );

        app.altIdentifierBlocks = altIdentifiers.length
            ? altIdentifiers.map((aid) => ({
                  alternateIdentifier: aid.textContent || "",
                  alternateIdentifierType:
                      aid.getAttribute("alternateIdentifierType") || "",
                  alternateIdentifierError: "",
                  alternateIdentifierTypeError: "",
              }))
            : [
                  createEmptyAlternateIdentifierBlock()
              ];

        // Size
        const sizes = Array.from(root.getElementsByTagNameNS(ns, "size"));

        app.sizeBlocks = sizes.length
            ? sizes.map((s) => ({ size: s.textContent || "", sizeError: "" }))
            : [createEmptySizeBlock()];

        // Format
        const formats = Array.from(
            root.getElementsByTagNameNS(ns, "format"),
        );

        app.formatBlocks = formats.length
            ? formats.map((f) => ({
                  format: f.textContent || "",
                  formatError: "",
              }))
            : [createEmptyFormatBlock()];

        // Version
        app.version =
            xml.getElementsByTagNameNS(ns, "version")[0]?.textContent || "";

        // Related Items
        const relatedItemsElement = findDirectChildByName(
            root,
            ns,
            "relatedItems",
        );
        const relatedItems = relatedItemsElement
            ? Array.from(
                  relatedItemsElement.getElementsByTagNameNS(ns, "relatedItem"),
              )
            : [];

        app.relatedItemsBlock = relatedItems.map((relatedItem) => {
            const creators = Array.from(
                relatedItem.getElementsByTagNameNS(ns, "creator"),
            ).map((c) => ({
                creatorName:
                    c.getElementsByTagNameNS(ns, "creatorName")[0]
                        ?.textContent || "",
                creatorNameLanguage: normalizeLanguageCode(
                    c
                        .getElementsByTagNameNS(ns, "creatorName")[0]
                        ?.getAttribute("xml:lang"),
                    app.languageCodes,
                    app.importVocabularyWarnings,
                    "creatorNameLanguage",
                ),
                givenName:
                    c.getElementsByTagNameNS(ns, "givenName")[0]?.textContent ||
                    "",
                familyName:
                    c.getElementsByTagNameNS(ns, "familyName")[0]
                        ?.textContent || "",
                nameType: normalizeVocabularyValue(
                    c
                        .getElementsByTagNameNS(ns, "creatorName")[0]
                        ?.getAttribute("nameType"),
                    app.nameTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "nameType",
                ),
            }));

            if (!creators.length) {
                creators.push(
                    createEmptyRelatedItemCreator()
                );
            }

            const titles = Array.from(
                relatedItem.getElementsByTagNameNS(ns, "title"),
            ).map((t) => ({
                title: t.textContent || "",
                titleType: normalizeVocabularyValue(
                    t.getAttribute("titleType"),
                    app.titleTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "titleType",
                ),
                titleLanguage: normalizeLanguageCode(
                    t.getAttribute("xml:lang"),
                    app.languageCodes,
                    app.importVocabularyWarnings,
                    "titleLanguage",
                ),
            }));

            if (!titles.length) {
                titles.push(
                    createEmptyRelatedItemTitle()
                );
            }

            const contributors = Array.from(
                relatedItem.getElementsByTagNameNS(ns, "contributor"),
            ).map((co) => ({
                contributorType: normalizeVocabularyValue(
                    co.getAttribute("contributorType"),
                    app.contributorTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "contributorType",
                ),
                contributorName:
                    co.getElementsByTagNameNS(ns, "contributorName")[0]
                        ?.textContent || "",
                contributorNameLanguage: normalizeLanguageCode(
                    co
                        .getElementsByTagNameNS(ns, "contributorName")[0]
                        ?.getAttribute("xml:lang"),
                    app.languageCodes,
                    app.importVocabularyWarnings,
                    "contributorNameLanguage",
                ),
                givenName:
                    co.getElementsByTagNameNS(ns, "givenName")[0]
                        ?.textContent || "",
                familyName:
                    co.getElementsByTagNameNS(ns, "familyName")[0]
                        ?.textContent || "",
                nameType: normalizeVocabularyValue(
                    co
                        .getElementsByTagNameNS(ns, "contributorName")[0]
                        ?.getAttribute("nameType"),
                    app.nameTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "nameType",
                ),
            }));

            if (!contributors.length) {
                contributors.push(
                    createEmptyRelatedItemContributor()
                );
            }

            return {
                relatedItemIdentifierSearch: "",
                relatedItemType: normalizeVocabularyValue(
                    relatedItem.getAttribute("relatedItemType"),
                    app.resourceTypeGeneralList,
                    "value",
                    app.importVocabularyWarnings,
                    "relatedItemType",
                ),
                relatedItemIdentifier:
                    relatedItem.getElementsByTagNameNS(
                        ns,
                        "relatedItemIdentifier",
                    )[0]?.textContent || "",
                relatedItemIdentifierType: normalizeVocabularyValue(
                    relatedItem
                        .getElementsByTagNameNS(ns, "relatedItemIdentifier")[0]
                        ?.getAttribute("relatedItemIdentifierType"),
                    app.relatedIdentifierTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "relatedItemIdentifierType",
                ),
                relationType: normalizeVocabularyValue(
                    relatedItem.getAttribute("relationType"),
                    app.relationTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "relationType",
                ),
                relatedMetadataScheme:
                    relatedItem
                        .getElementsByTagNameNS(ns, "relatedItemIdentifier")[0]
                        ?.getAttribute("relatedMetadataScheme") || "",
                relatedIdentifierSchemeURI:
                    relatedItem
                        .getElementsByTagNameNS(ns, "relatedItemIdentifier")[0]
                        ?.getAttribute("schemeUri") || "",
                relatedIdentifierSchemeType:
                    relatedItem
                        .getElementsByTagNameNS(ns, "relatedItemIdentifier")[0]
                        ?.getAttribute("schemeType") || "",
                creators,
                titles,
                publicationYear:
                    relatedItem.getElementsByTagNameNS(ns, "publicationYear")[0]
                        ?.textContent || "",
                volume:
                    relatedItem.getElementsByTagNameNS(ns, "volume")[0]
                        ?.textContent || "",
                issue:
                    relatedItem.getElementsByTagNameNS(ns, "issue")[0]
                        ?.textContent || "",
                number:
                    relatedItem.getElementsByTagNameNS(ns, "number")[0]
                        ?.textContent || "",
                numberType: normalizeVocabularyValue(
                    relatedItem
                        .getElementsByTagNameNS(ns, "number")[0]
                        ?.getAttribute("numberType"),
                    app.numberTypes,
                    "value",
                    app.importVocabularyWarnings,
                    "numberType",
                ),
                firstPage:
                    relatedItem.getElementsByTagNameNS(ns, "firstPage")[0]
                        ?.textContent || "",
                lastPage:
                    relatedItem.getElementsByTagNameNS(ns, "lastPage")[0]
                        ?.textContent || "",
                edition:
                    relatedItem.getElementsByTagNameNS(ns, "edition")[0]
                        ?.textContent || "",
                publisher:
                    relatedItem.getElementsByTagNameNS(ns, "publisher")[0]
                        ?.textContent || "",
                contributors,
                relationTypeError: "",
                relatedItemTypeError: "",
                doiImportState: "",
            };
        });

        if (!app.relatedItemsBlock.length) {
            app.relatedItemsBlock = [
                createEmptyRelatedItemBlock()
            ];
        }

        // Strip indentation/newline artefacts from pretty-printed XML inputs.
        app.identifier = normalizeImportedText(app.identifier);
        app.publisher = normalizeImportedText(app.publisher);
        app.publicationYear = normalizeImportedText(app.publicationYear);
        app.resourceType = normalizeImportedText(app.resourceType);
        app.version = normalizeImportedText(app.version);

        app.creatorBlocks = sanitizeImportedData(app.creatorBlocks);
        app.titleBlocks = sanitizeImportedData(app.titleBlocks);
        app.descriptionBlocks = sanitizeImportedData(app.descriptionBlocks);
        app.subjectBlocks = sanitizeImportedData(app.subjectBlocks);
        app.dateBlocks = sanitizeImportedData(app.dateBlocks);
        app.relatedIdentifierBlocks = sanitizeImportedData(
            app.relatedIdentifierBlocks,
        );
        app.contributorBlocks = sanitizeImportedData(app.contributorBlocks);
        app.geoLocationBlocks = sanitizeImportedData(app.geoLocationBlocks);
        app.rightsBlocks = sanitizeImportedData(app.rightsBlocks);
        app.fundingReferenceBlocks = sanitizeImportedData(
            app.fundingReferenceBlocks,
        );
        app.altIdentifierBlocks = sanitizeImportedData(app.altIdentifierBlocks);
        app.sizeBlocks = sanitizeImportedData(app.sizeBlocks);
        app.formatBlocks = sanitizeImportedData(app.formatBlocks);
        app.relatedItemsBlock = sanitizeImportedData(app.relatedItemsBlock);

        app.xmlStatus = app.t("import.xmlSuccess");

        app.regenerateAll();
        return true;
    } catch (e) {
        const message =
            e instanceof Error && e.message
                ? e.message
                : app.t("import.unknownImportError");
        app.xmlStatus = app.t("import.invalidXML", { message });
        return false;
    }
}