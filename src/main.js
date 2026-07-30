/**
 * @file main.js
 * @description Entry point for the DataCite Metadata Generator.
 *
 * Registers the Alpine.js `metadataApp` component, which manages all
 * application state and user interactions for building DataCite Kernel 4.6
 * metadata records. The component is mounted on the root `x-data` element
 * in index.html.
 *
 * Key responsibilities:
 *   - Maintain reactive state for all metadata fields (mandatory, recommended, other)
 *   - Trigger XML/JSON regeneration on any state change
 *   - Provide import (DOI, JSON, XML), export (download, clipboard), and reset logic
 *   - Validate mandatory fields and display contextual error navigation
 *   - Integrate external APIs: ORCID (person lookup) and ROR (organisation lookup)
 */

import Alpine from "alpinejs";
import "./style.css";
import { UI_TRANSLATIONS } from "./i18n/translations.js";

// Generators
import { generateXML, generateJSON, generateYAML } from "./utils/generators.js";

// DataCite requirements
import {
    descriptionTypes,
    titleTypes,
    nameTypes,
    nameIdentifierSchemes,
    affiliationIdentifierSchemes,
    identifierTypes,
    publisherIdentifierSchema,
    resourceTypeGeneralList,
    subjectSchemes,
    dateTypes,
    relatedIdentifierTypes,
    relationTypes,
    contributorTypes,
    funderIdentifierTypes,
    numberTypes,
} from "../data/dataCite-values";
import { languageCodes } from "../data/iso_639-1";
import licensesData from "../data/licenses.json";

// Other imports
import { importViaDOI } from "./utils/importDOI.js";
import { importFromJSON } from "./utils/importJSON.js";
import { importFromXML } from "./utils/importXML.js";
import { importFromYAML } from "./utils/importYAML.js";
import {
    validateTitle,
    validateCreatorName,
    validateContributorName,
    validateDescription,
    validateDescriptionType,
    validateYear,
    validateOrcid,
    validateIdentifier,
    validateIdentifierType,
    validatePublisher,
    validatePublisherLanguage,
    validatePublisherIdentifier,
    validatePublisherIdentifierScheme,
    validateResourceType,
    validateResourceTypeGeneral,
    validateSubject,
    validateDate,
    validateDateType,
    validateRelatedIdentifier,
    validateRelatedIdentifierType,
    validateRelationType,
    validateContributorFamilyName,
    validateContributorType,
    validateRight,
    validateAlternateIdentifier,
    validateAlternateIdentifierType,
    validateSize,
    validateFormat,
    validateFunderName,
    validateFunderIdentifierType,
    validateRelatedItemRelationType,
    validateRelatedItemType,
    validateGeoLongitude,
    validateGeoLatitude,
    validateGeoCoordinatePair,
    validateGeoBoxCompleteness,
} from "./utils/validation.js";
import {
    importOrcidInfo,
    orcidSearch,
    selectORCID,
    clearORCID,
} from "./utils/orcidSearch.js";
import { fetchResults, selectROR, clearROR } from "./utils/rorSearch.js";
import {
    createEmptyTitleBlock,
    createEmptyCreatorBlock,
    createEmptyContributorBlock,
    createEmptyNameIdentifier,
    createEmptyAffiliation,
    blockFactories,
    blockTargetArrays,
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
} from "./utils/blockFactories.js";

const MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMPORT_EXTENSIONS = [".json", ".xml", ".yaml", ".yml"];
const ALLOWED_IMPORT_MIME_TYPES = [
    "application/json",
    "text/json",
    "application/xml",
    "text/xml",
    "application/x-yaml",
    "text/yaml",
    "text/plain", // Some systems send YAML as plain text
    "",
];

// Define priority languages here to have them on top of the language list (languageCodes)
const priority = ["en", "de"];

const UI_LANGUAGE_STORAGE_KEY = "datacite-ui-lang";

/**
 * Restricts UI language values to the languages supported by the app.
 *
 * @param {string} candidate - Raw language code from UI, URL, or storage.
 * @returns {"de"|"en"} Normalized language code.
 */
function normalizeUiLang(candidate) {
    return candidate === "de" ? "de" : "en";
}

/**
 * Resolves the initial UI language from the query string or persisted storage.
 *
 * @returns {"de"|"en"} Initial UI language.
 */
function readInitialUiLang() {
    const queryLang = new URLSearchParams(window.location.search).get("lang");
    if (queryLang === "de" || queryLang === "en") {
        return queryLang;
    }

    try {
        const stored = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
        if (stored === "de" || stored === "en") {
            return stored;
        }
    } catch {
        // Ignore storage access errors and fall back to English.
    }

    return "en";
}

window.Alpine = Alpine;

Alpine.store("i18n", {
    lang: readInitialUiLang(),
    fallbackLang: "en",
    setLanguage(nextLang) {
        this.lang = normalizeUiLang(nextLang);

        try {
            window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, this.lang);
        } catch {
            // Ignore storage access errors.
        }
    },
    t(key, vars = {}) {
        const raw =
            UI_TRANSLATIONS[this.lang]?.[key] ||
            UI_TRANSLATIONS[this.fallbackLang]?.[key] ||
            key;

        if (typeof raw !== "string") {
            return raw;
        }

        return raw.replace(/\{(\w+)\}/g, (_, token) => {
            const replacement = vars?.[token];
            return replacement === undefined || replacement === null
                ? `{${token}}`
                : String(replacement);
        });
    },
});

Alpine.data("metadataApp", () => ({
    tab: "mandatory",
    previewTab: "XML",
    //State
    titleBlocks: [createEmptyTitleBlock()],
    titleTypes,
    identifier: "",
    identifierType: "DOI",
    identifierError: "",
    identifierTypeError: "",
    identifierTypes,
    creatorBlocks: [createEmptyCreatorBlock()],
    affiliationIdentifierSchemes,
    nameIdentifierSchemes,
    nameTypes,
    publisher: "",
    publisherLanguage: "",
    publisherIdentifier: "",
    publisherIdentifierScheme: "",
    publisherIdentifierSchemeURI: "",
    publisherError: "",
    publisherLanguageError: "",
    publisherIdentifierError: "",
    publisherIdentifierSchemeError: "",
    publisherIdentifierSchema,
    publisherSearchType: "",
    publisherSearch: createEmptyPublisherSearch(),
    publicationYear: "",
    resourceType: "",
    resourceTypeGeneral: "",
    resourceTypeError: "",
    resourceTypeGeneralError: "",
    resourceTypeGeneralList,
    descriptionBlocks: [createEmptyDescriptionBlock()],
    descriptionTypes,
    subjectBlocks: [createEmptySubjectBlock()],
    subjectSchemes,
    rightsBlocks: [createEmptyRightBlock()],
    licensesData,
    dateBlocks: [createEmptyDateBlock()],
    dateTypes,
    relatedIdentifierBlocks: [createEmptyRelatedIdentifierBlock()],
    relatedIdentifierTypes,
    relationTypes,
    contributorBlocks: [createEmptyContributorBlock()],
    contributorTypes,
    geoLocationBlocks: [createEmptyGeoLocationBlock()],
    language: "",
    altIdentifierBlocks: [createEmptyAlternateIdentifierBlock()],
    formatBlocks: [createEmptyFormatBlock()],
    sizeBlocks: [createEmptySizeBlock()],
    fundingReferenceBlocks: [createEmptyFundingReferenceBlock()],
    funderIdentifierTypes,
    version: "",
    relatedItemsBlock: [createEmptyRelatedItemBlock()],
    numberTypes,
    languageCodes: languageCodes.sort((a, b) => {
        const aPriority = priority.indexOf(a.code);
        const bPriority = priority.indexOf(b.code);

        if (aPriority !== -1 && bPriority !== -1) {
            return aPriority - bPriority;
        }

        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;

        return a.name.localeCompare(b.name);
    }),
    doi: "",
    doiStatus: "",
    xml: "",
    xmlStatus: "",
    json: "",
    jsonStatus: "",
    importValidationSummary: "",
    importValidationLevel: "",
    importMissingMandatoryFields: [],
    importValidationSource: "",
    importVocabularyWarnings: [],
    importVocabularyWarningsRelItem: [],
    mandatoryValidationSummary: "",
    mandatoryValidationLevel: "",
    mandatoryMissingFields: [],
    helpModalOpen: false,
    helpModalUrl: "",
    helpModalTextKey: "help.placeholderText",

    importOrcidInfo,
    orcidSearch,
    selectORCID,
    clearORCID,
    fetchResults,
    selectROR,
    clearROR,

    /**
     * Delegates translation lookup to the global Alpine i18n store.
     *
     * @param {string} key - Translation key.
     * @param {object} [vars={}] - Placeholder replacements.
     * @returns {string} Translated UI string.
     */
    t(key, vars = {}) {
        return Alpine.store("i18n").t(key, vars);
    },

    /**
     * Opens the help modal for a guide URL and optional placeholder text key.
     *
     * @param {string} url - External help URL.
     * @param {string} [textKey="help.placeholderText"] - Translation key for placeholder/help text.
     */
    openHelp(url, textKey = "help.placeholderText") {
        this.helpModalUrl = String(url || "");
        this.helpModalTextKey = String(textKey || "help.placeholderText");
        this.helpModalOpen = !!this.helpModalUrl;
    },

    /**
     * Closes the contextual help modal and resets its state.
     */
    closeHelp() {
        this.helpModalOpen = false;
        this.helpModalUrl = "";
        this.helpModalTextKey = "help.placeholderText";
    },

    /**
     * Advances to the next top-level form tab and scrolls back to the top.
     */
    goToNextTab() {
        const tabOrder = ["mandatory", "recommended", "optional", "import"];
        const currentIndex = tabOrder.indexOf(this.tab);
        const nextIndex =
            currentIndex < 0 ? 0 : (currentIndex + 1) % tabOrder.length;
        this.tab = tabOrder[nextIndex];
        this.scrollToTop();
    },

    /**
     * Scrolls the app root, or the window as fallback, back to the top.
     */
    scrollToTop() {
        if (this.$root?.scrollIntoView) {
            this.$root.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    },

    /**
     * Generate the current metadata as XML / JSON / YAML and stores it in `this.xml` / `this.json` / `this.yaml`.
     * These are called automatically by {@link regenerateAll} when form data changes.
     */
    generateXML() {
        try {
            this.xml = generateXML(this);
        } catch (error) {
            this.xml = `Error generating XML: ${error.message}`;
        }
        return this.xml;
    },

    /**
     * Generates the current metadata as JSON and stores it in `this.json`.
     *
     * @returns {string} Generated JSON preview.
     */
    generateJSON() {
        try {
            this.json = generateJSON(this);
        } catch (error) {
            this.json = `Error generating JSON: ${error.message}`;
        }
        return this.json;
    },

    /**
     * Generates the current metadata as YAML and stores it in `this.yaml`.
     *
     * @returns {string} Generated YAML preview.
     */
    generateYAML() {
        try {
            this.yaml = generateYAML(this);
        } catch (error) {
            this.yaml = `Error generating YAML: ${error.message}`;
        }
        return this.yaml;
    },

    /**
     * Regenerates XML, JSON, and YAML preview output and, if a previous import
     * was performed in this session, re-runs the post-import mandatory check
     * so that the validation summary stays up to date.
     */
    regenerateAll() {
        this.generateXML();
        this.generateJSON();
        this.generateYAML();
        this.validateMandatoryCoreFields();
        this.validateRecommendedFields();
        this.validateOtherFields();

        if (this.importValidationSource) {
            this.runPostImportMandatoryCheck(this.importValidationSource);
        }
    },

    /**
     * Appends a new empty block (repeatable field group) of the given type
     * to the matching blocks array, then regenerates the preview output.
     *
     * @param {string} type - Block type: 'title' | 'description' | 'subject' |
     *                         'date' | 'relatedIdentifier' | 'creator' | 'contributor'
     */
    addBlock(type) {
        const factory = blockFactories[type];
        const arrayKey = blockTargetArrays[type];
        if (factory && arrayKey) {
            this[arrayKey].push(factory());
        }
        this.regenerateAll();
    },

    /**
     * Inserts a new empty subject block directly after the given subject index.
     *
     * @param {number} index - Subject block index after which a new block is inserted.
     */
    insertSubjectAfter(index) {
        this.subjectBlocks.splice(index + 1, 0, createEmptySubjectBlock());
        this.regenerateAll();
    },

    /**
     * Appends a new empty nested block (e.g. a name identifier or affiliation)
     * inside an existing creator or contributor block.
     *
     * @param {number} index - Index of the parent block (creator or contributor).
     * @param {string} type  - Nested block type: 'nameIdentifier' | 'creatorAffiliation' |
     *                          'contributorNameIdentifier' | 'contributorAffiliation'
     */
    addNestedBlock(index, type, i = null) {
        if (type === "nameIdentifier") {
            this.creatorBlocks[index].nameIdentifiers.push(
                createEmptyNameIdentifier(),
            );
        }
        if (type === "creatorAffiliation") {
            this.creatorBlocks[index].affiliations.push(
                createEmptyAffiliation("creator"),
            );
        }
        if (type === "contributorNameIdentifier") {
            this.contributorBlocks[index].nameIdentifiers.push(
                createEmptyNameIdentifier(),
            );
        }
        if (type === "contributorAffiliation") {
            this.contributorBlocks[index].affiliations.push(
                createEmptyAffiliation("contributor"),
            );
        }
        if (type === "geoLocationPolygon") {
            this.geoLocationBlocks[index].geoLocationPolygon.push(
                createEmptyGeoLocationPolygon(),
            );
        }
        if (type === "polygonPoints") {
            this.geoLocationBlocks[index].geoLocationPolygon[
                i
            ].polygonPoints.push(createEmptyPolygonPoint());
        }
        if (type === "relatedItemCreators") {
            this.relatedItemsBlock[index].creators.push(
                createEmptyRelatedItemCreator(),
            );
        }
        if (type === "relatedItemTitles") {
            this.relatedItemsBlock[index].titles.push(
                createEmptyRelatedItemTitle(),
            );
        }
        if (type === "relatedItemContributors") {
            this.relatedItemsBlock[index].contributors.push(
                createEmptyRelatedItemContributor(),
            );
        }
        this.regenerateAll();
    },

    /**
     * Removes the block at position `i` from the matching blocks array.
     *
     * @param {number} i    - Index of the block to remove.
     * @param {string} type - Block type: same values as {@link addBlock}.
     */
    removeBlock(i, type) {
        const arrayKey = blockTargetArrays[type];
        if (arrayKey) {
            this[arrayKey].splice(i, 1);
        }
        this.regenerateAll();
    },

    /**
     * Removes a nested block at position `i` inside a parent block at `index`.
     *
     * @param {number} index - Index of the parent block.
     * @param {number} i     - Index of the nested block to remove.
     * @param {string} type  - Nested block type: same values as {@link addNestedBlock}.
     * @param {number|null} [j=null] - Nested polygon point index when removing polygon points.
     */
    removeNestedBlock(index, i, type, j = null) {
        if (type === "nameIdentifier")
            this.creatorBlocks[index].nameIdentifiers.splice(i, 1);
        if (type === "creatorAffiliation")
            this.creatorBlocks[index].affiliations.splice(i, 1);
        if (type === "contributorNameIdentifier")
            this.contributorBlocks[index].nameIdentifiers.splice(i, 1);
        if (type === "contributorAffiliation")
            this.contributorBlocks[index].affiliations.splice(i, 1);
        if (type === "geoLocationPolygon")
            this.geoLocationBlocks[index].geoLocationPolygon.splice(i, 1);
        if (type === "polygonPoints")
            this.geoLocationBlocks[index].geoLocationPolygon[
                i
            ].polygonPoints.splice(j, 1);
        if (type === "relatedItemCreators")
            this.relatedItemsBlock[index].creators.splice(i, 1);
        if (type === "relatedItemTitles")
            this.relatedItemsBlock[index].titles.splice(i, 1);
        if (type === "relatedItemContributors")
            this.relatedItemsBlock[index].contributors.splice(i, 1);
        this.regenerateAll();
    },

    //Validation
    /**
     * Validates the main identifier field and updates its inline error state.
     */
    validateIdentifierField() {
        this.identifierError = validateIdentifier(this.identifier);
    },

    /**
     * Validates the identifier type field.
     */
    validateIdentifierTypeField() {
        this.identifierTypeError = validateIdentifierType(this.identifierType);
    },

    /**
     * Validates the publisher field.
     */
    validatePublisherField() {
        this.publisherError = validatePublisher(this.publisher);
    },

    /**
     * Validates the optional publisher language field.
     */
    validatePublisherLanguageField() {
        this.publisherLanguageError = validatePublisherLanguage(
            this.publisherLanguage,
        );
    },

    /**
     * Validates the publisher identifier field against the selected scheme.
     */
    validatePublisherIdentifierField() {
        this.publisherIdentifierError = validatePublisherIdentifier(
            this.publisherIdentifier,
            this.publisherIdentifierScheme,
        );
    },

    /**
     * Validates the publisher identifier scheme field against the identifier value.
     */
    validatePublisherIdentifierSchemeField() {
        this.publisherIdentifierSchemeError = validatePublisherIdentifierScheme(
            this.publisherIdentifier,
            this.publisherIdentifierScheme,
        );
    },

    /**
     * Runs both publisher identifier pairing validations.
     */
    validatePublisherIdentifierFields() {
        this.validatePublisherIdentifierField();
        this.validatePublisherIdentifierSchemeField();
    },

    /**
     * Validates the free-text resource type field.
     */
    validateResourceTypeField() {
        this.resourceTypeError = validateResourceType(this.resourceType);
    },

    /**
     * Validates the mandatory resource type general field.
     */
    validateResourceTypeGeneralField() {
        this.resourceTypeGeneralError = validateResourceTypeGeneral(
            this.resourceTypeGeneral,
        );
    },

    /**
     * Runs validation for the mandatory top-level DataCite core fields.
     */
    validateMandatoryCoreFields() {
        this.titleBlocks.forEach((block) => this.validateTitleBlock(block));
        this.creatorBlocks.forEach((block) => this.validateCreatorBlock(block));
        this.validateIdentifierField();
        this.validateIdentifierTypeField();
        this.validatePublisherIdentifierFields();
        this.validatePublisherField();
        this.validateResourceTypeGeneralField();
    },

    /**
     * Validates a title block and writes any missing-title error.
     *
     * @param {object} block - Title block to validate.
     */
    validateTitleBlock(block) {
        const hasTitle = this.hasTextValue(block.title);

        block.titleError = !hasTitle ? validateTitle(block.title) : "";
    },

    /**
     * Validates a creator block, including identifier/scheme pair requirements.
     *
     * @param {object} block - Creator block to validate.
     */
    validateCreatorBlock(block) {
        const isActive = this.blockHasContent({
            creatorName: block.creatorName,
            givenName: block.givenName,
            familyName: block.familyName,
            nameType: block.nameType,
            nameIdentifiers: block.nameIdentifiers,
            affiliations: block.affiliations,
        });

        const hasName =
            this.hasTextValue(block.creatorName) ||
            this.hasTextValue(block.familyName) ||
            this.hasTextValue(block.givenName);

        block.creatorNameError =
            isActive && !hasName ? validateCreatorName(block.creatorName) : "";

        // DataCite requires the scheme once a name identifier value is present.
        (block.nameIdentifiers || []).forEach((id) => {
            const hasIdentifier = this.hasTextValue(id.nameIdentifier);
            const hasScheme = this.hasTextValue(id.nameIdentifierScheme);

            id.nameIdentifierSchemeError =
                hasIdentifier && !hasScheme
                    ? this.t("validation.required", {
                          field: this.t("field.nameIdentifierScheme"),
                      })
                    : "";
        });

        // Affiliation identifiers follow the same identifier/scheme pairing rule.
        (block.affiliations || []).forEach((affiliation) => {
            const hasIdentifier = this.hasTextValue(
                affiliation.affiliationIdentifier,
            );
            const hasScheme = this.hasTextValue(
                affiliation.affiliationIdentifierScheme,
            );

            affiliation.affiliationIdentifierSchemeError =
                hasIdentifier && !hasScheme
                    ? this.t("validation.required", {
                          field: this.t("field.affiliationIdentifierScheme"),
                      })
                    : "";
        });
    },

    /**
     * Checks whether a value contains non-whitespace text.
     *
     * @param {*} value - Candidate value.
     * @returns {boolean} True when the value contains text.
     */
    hasTextValue(value) {
        return String(value ?? "").trim() !== "";
    },

    /**
     * Recursively detects whether a repeatable block contains any user-entered data.
     *
     * @param {*} value - Block, array, or primitive value to inspect.
     * @returns {boolean} True when any non-error field contains content.
     */
    blockHasContent(value) {
        if (Array.isArray(value)) {
            return value.some((item) => this.blockHasContent(item));
        }

        if (value && typeof value === "object") {
            return Object.entries(value).some(([key, nestedValue]) => {
                if (key.endsWith("Error")) {
                    return false;
                }

                return this.blockHasContent(nestedValue);
            });
        }

        return this.hasTextValue(value);
    },

    /**
     * Detects whether a polygon candidate degenerates to a straight line.
     *
     * @param {Array<{long: number, lat: number}>} points - Distinct polygon points.
     * @returns {boolean} True when all points lie on one line.
     */
    arePointsCollinear(points) {
        if (!Array.isArray(points) || points.length < 3) {
            return false;
        }

        const [firstPoint, secondPoint] = points;
        const deltaX = secondPoint.long - firstPoint.long;
        const deltaY = secondPoint.lat - firstPoint.lat;

        return points.slice(2).every((point) => {
            const crossProduct =
                (point.long - firstPoint.long) * deltaY -
                (point.lat - firstPoint.lat) * deltaX;

            return Math.abs(crossProduct) < 1e-9;
        });
    },

    /**
     * Validates a description block.
     *
     * @param {object} block - Description block to validate.
     */
    validateDescriptionBlock(block) {
        const isActive = this.blockHasContent({
            description: block.description,
            descriptionLanguage: block.descriptionLanguage,
            descriptionType: block.descriptionType,
        });

        block.descriptionError = isActive
            ? validateDescription(block.description)
            : "";
        block.descriptionTypeError = isActive
            ? validateDescriptionType(block.descriptionType)
            : "";
    },

    validateSubjectBlock(block) {
        const isActive = this.blockHasContent({
            selectSubjectScheme: block.selectSubjectScheme,
            subject: block.subject,
            subjectLanguage: block.subjectLanguage,
            subjectScheme: block.subjectScheme,
            subjectSchemeURI: block.subjectSchemeURI,
            valueURI: block.valueURI,
            classificationCode: block.classificationCode,
        });

        block.subjectError = isActive ? validateSubject(block.subject) : "";
    },

    /**
     * Validates a subject block.
     *
     * @param {object} block - Subject block to validate.
     */
    validateDateBlock(block) {
        const isActive = this.blockHasContent({
            date: block.date,
            dateType: block.dateType,
            dateInformation: block.dateInformation,
        });

        block.dateError = isActive ? validateDate(block.date) : "";
        block.dateTypeError = isActive ? validateDateType(block.dateType) : "";
    },

    /**
     * Validates a date block.
     *
     * @param {object} block - Date block to validate.
     */
    validateContributorBlock(block) {
        const hasName =
            this.hasTextValue(block.contributorName) ||
            this.hasTextValue(block.familyName) ||
            this.hasTextValue(block.givenName);

        const hasIdentifierContent = (block.nameIdentifiers || []).some(
            (id) =>
                this.hasTextValue(id.nameIdentifier) ||
                this.hasTextValue(id.nameIdentifierScheme) ||
                this.hasTextValue(id.nameIdentifierSchemeURI),
        );

        const hasAffiliationContent = (block.affiliations || []).some(
            (affiliation) =>
                this.hasTextValue(affiliation.contributorAffiliation) ||
                this.hasTextValue(affiliation.affiliationIdentifier) ||
                this.hasTextValue(affiliation.affiliationIdentifierScheme) ||
                this.hasTextValue(affiliation.affiliationIdentifierSchemeURI),
        );

        const isUsed =
            this.hasTextValue(block.contributorType) ||
            hasName ||
            hasIdentifierContent ||
            hasAffiliationContent;

        const isActive = block.contributorTouched || isUsed;

        block.contributorTypeError = isActive
            ? validateContributorType(block.contributorType)
            : "";
        block.contributorNameError =
            isActive && !hasName
                ? validateContributorName(block.contributorName)
                : "";

        // Contributor identifiers reuse the same conditional scheme requirement.
        (block.nameIdentifiers || []).forEach((id) => {
            const hasIdentifier = this.hasTextValue(id.nameIdentifier);
            const hasScheme = this.hasTextValue(id.nameIdentifierScheme);

            id.nameIdentifierSchemeError =
                hasIdentifier && !hasScheme
                    ? this.t("validation.required", {
                          field: this.t("field.nameIdentifierScheme"),
                      })
                    : "";
        });

        // Contributor affiliations must also declare a scheme when an identifier exists.
        (block.affiliations || []).forEach((affiliation) => {
            const hasIdentifier = this.hasTextValue(
                affiliation.affiliationIdentifier,
            );
            const hasScheme = this.hasTextValue(
                affiliation.affiliationIdentifierScheme,
            );

            affiliation.affiliationIdentifierSchemeError =
                hasIdentifier && !hasScheme
                    ? this.t("validation.required", {
                          field: this.t("field.affiliationIdentifierScheme"),
                      })
                    : "";
        });
    },

    /**
     * Validates a contributor block, including touched-state gating and nested identifier rules.
     *
     * @param {object} block - Contributor block to validate.
     */
    validateRelatedIdentifierBlock(block) {
        const isActive = this.blockHasContent({
            relatedIdentifier: block.relatedIdentifier,
            relatedIdentifierType: block.relatedIdentifierType,
            relationType: block.relationType,
            relatedMetadataScheme: block.relatedMetadataScheme,
            relatedMetadataSchemeURI: block.relatedMetadataSchemeURI,
            relatedMetadataSchemeType: block.relatedMetadataSchemeType,
            resourceTypeGeneral: block.resourceTypeGeneral,
        });

        block.relatedIdentifierError = isActive
            ? validateRelatedIdentifier(block.relatedIdentifier)
            : "";
        block.relatedIdentifierTypeError = isActive
            ? validateRelatedIdentifierType(block.relatedIdentifierType)
            : "";
        block.relationTypeError = isActive
            ? validateRelationType(block.relationType)
            : "";
    },

    /**
     * Validates a related identifier block.
     *
     * @param {object} block - Related identifier block to validate.
     */
    validateGeoLocationBlock(block) {
        const errors = [];

        const pointLongFilled = this.hasTextValue(block.geoLocationPointLong);
        const pointLatFilled = this.hasTextValue(block.geoLocationPointLat);
        if (pointLongFilled || pointLatFilled) {
            const pairError = validateGeoCoordinatePair(
                block.geoLocationPointLong,
                block.geoLocationPointLat,
                this.t("section.geoLocationPoint"),
            );
            if (pairError) {
                errors.push(pairError);
            }

            const longError = validateGeoLongitude(
                block.geoLocationPointLong,
                this.t("field.pointLongitude"),
            );
            if (longError) {
                errors.push(longError);
            }

            const latError = validateGeoLatitude(
                block.geoLocationPointLat,
                this.t("field.pointLatitude"),
            );
            if (latError) {
                errors.push(latError);
            }
        }

        const boxValues = [
            block.geoLocationBoxWest,
            block.geoLocationBoxEast,
            block.geoLocationBoxSouth,
            block.geoLocationBoxNorth,
        ];
        const filledBoxCount = boxValues.filter((value) =>
            this.hasTextValue(value),
        ).length;

        const boxCompletenessError = validateGeoBoxCompleteness(
            block.geoLocationBoxWest,
            block.geoLocationBoxEast,
            block.geoLocationBoxSouth,
            block.geoLocationBoxNorth,
        );

        if (boxCompletenessError) {
            errors.push(boxCompletenessError);
        }

        if (filledBoxCount === 4) {
            const westError = validateGeoLongitude(
                block.geoLocationBoxWest,
                this.t("field.westBoundLongitude"),
            );
            if (westError) {
                errors.push(westError);
            }

            const eastError = validateGeoLongitude(
                block.geoLocationBoxEast,
                this.t("field.eastBoundLongitude"),
            );
            if (eastError) {
                errors.push(eastError);
            }

            const southError = validateGeoLatitude(
                block.geoLocationBoxSouth,
                this.t("field.southBoundLatitude"),
            );
            if (southError) {
                errors.push(southError);
            }

            const northError = validateGeoLatitude(
                block.geoLocationBoxNorth,
                this.t("field.northBoundLatitude"),
            );
            if (northError) {
                errors.push(northError);
            }
        }

        (block.geoLocationPolygon || []).forEach((poly, polyIndex) => {
            // Enforce the structural DataCite polygon rules before coordinate range checks.
            const hasPolygonData =
                (poly.polygonPoints || []).some(
                    (point) =>
                        this.hasTextValue(point.polygonPointLong) ||
                        this.hasTextValue(point.polygonPointLat),
                ) ||
                this.hasTextValue(poly.inPolygonPointLong) ||
                this.hasTextValue(poly.inPolygonPointLat);

            const completePolygonPoints = (poly.polygonPoints || [])
                .filter(
                    (point) =>
                        this.hasTextValue(point.polygonPointLong) &&
                        this.hasTextValue(point.polygonPointLat),
                )
                .map((point) => ({
                    long: String(point.polygonPointLong).trim(),
                    lat: String(point.polygonPointLat).trim(),
                }));

            if (hasPolygonData && completePolygonPoints.length < 4) {
                errors.push(
                    this.t("validation.geoPolygon.minPoints", {
                        index: polyIndex + 1,
                    }),
                );
            }

            if (completePolygonPoints.length >= 4) {
                const firstPoint = completePolygonPoints[0];
                const lastPoint =
                    completePolygonPoints[completePolygonPoints.length - 1];

                if (
                    firstPoint.long !== lastPoint.long ||
                    firstPoint.lat !== lastPoint.lat
                ) {
                    errors.push(
                        this.t("validation.geoPolygon.closed", {
                            index: polyIndex + 1,
                        }),
                    );
                }

                const uniquePoints = new Set(
                    completePolygonPoints.map(
                        (point) => `${point.long}|${point.lat}`,
                    ),
                );

                if (uniquePoints.size < 3) {
                    errors.push(
                        this.t("validation.geoPolygon.distinctPoints", {
                            index: polyIndex + 1,
                        }),
                    );
                } else {
                    const distinctPoints = [...uniquePoints].map((point) => {
                        const [long, lat] = point.split("|");
                        return {
                            long: Number(long),
                            lat: Number(lat),
                        };
                    });

                    if (this.arePointsCollinear(distinctPoints)) {
                        errors.push(
                            this.t("validation.geoPolygon.nonAligned", {
                                index: polyIndex + 1,
                            }),
                        );
                    }
                }
            }

            (poly.polygonPoints || []).forEach((point, pointIndex) => {
                const pointLong = this.hasTextValue(point.polygonPointLong);
                const pointLat = this.hasTextValue(point.polygonPointLat);

                if (pointLong || pointLat) {
                    const polygonPointContext = this.t(
                        "validation.geoContext.polygonPoint",
                        {
                            polygonIndex: polyIndex + 1,
                            pointIndex: pointIndex + 1,
                        },
                    );

                    const pairError = validateGeoCoordinatePair(
                        point.polygonPointLong,
                        point.polygonPointLat,
                        polygonPointContext,
                    );
                    if (pairError) {
                        errors.push(pairError);
                    }

                    const longError = validateGeoLongitude(
                        point.polygonPointLong,
                        this.t("validation.geoContext.longitude", {
                            context: polygonPointContext,
                        }),
                    );
                    if (longError) {
                        errors.push(longError);
                    }

                    const latError = validateGeoLatitude(
                        point.polygonPointLat,
                        this.t("validation.geoContext.latitude", {
                            context: polygonPointContext,
                        }),
                    );
                    if (latError) {
                        errors.push(latError);
                    }
                }
            });

            const inPointLong = this.hasTextValue(poly.inPolygonPointLong);
            const inPointLat = this.hasTextValue(poly.inPolygonPointLat);

            if (inPointLong || inPointLat) {
                const inPolygonContext = this.t(
                    "validation.geoContext.inPolygonPoint",
                    { index: polyIndex + 1 },
                );

                const pairError = validateGeoCoordinatePair(
                    poly.inPolygonPointLong,
                    poly.inPolygonPointLat,
                    inPolygonContext,
                );
                if (pairError) {
                    errors.push(pairError);
                }

                const longError = validateGeoLongitude(
                    poly.inPolygonPointLong,
                    this.t("validation.geoContext.longitude", {
                        context: inPolygonContext,
                    }),
                );
                if (longError) {
                    errors.push(longError);
                }

                const latError = validateGeoLatitude(
                    poly.inPolygonPointLat,
                    this.t("validation.geoContext.latitude", {
                        context: inPolygonContext,
                    }),
                );
                if (latError) {
                    errors.push(latError);
                }
            }
        });

        block.geoErrors = [...new Set(errors)];
    },

    /**
     * Validates all recommended-section blocks.
     */
    validateRecommendedFields() {
        this.descriptionBlocks.forEach((block) =>
            this.validateDescriptionBlock(block),
        );
        this.subjectBlocks.forEach((block) => this.validateSubjectBlock(block));
        this.dateBlocks.forEach((block) => this.validateDateBlock(block));
        this.contributorBlocks.forEach((block) =>
            this.validateContributorBlock(block),
        );
        this.relatedIdentifierBlocks.forEach((block) =>
            this.validateRelatedIdentifierBlock(block),
        );
        this.geoLocationBlocks.forEach((block) =>
            this.validateGeoLocationBlock(block),
        );
    },

    /**
     * Validates a rights block.
     *
     * @param {object} block - Rights block to validate.
     */
    validateRightBlock(block) {
        const isActive = this.blockHasContent({
            selectLicense: block.selectLicense,
            right: block.right,
            rightsURI: block.rightsURI,
            rightsIdentifier: block.rightsIdentifier,
            rightsIdentifierScheme: block.rightsIdentifierScheme,
            rightsIdentifierSchemeURI: block.rightsIdentifierSchemeURI,
        });

        block.rightError = isActive ? validateRight(block.right) : "";
    },

    /**
     * Validates an alternate identifier block.
     *
     * @param {object} block - Alternate identifier block to validate.
     */
    validateAlternateIdentifierBlock(block) {
        const hasIdentifier = this.hasTextValue(block.alternateIdentifier);
        const hasType = this.hasTextValue(block.alternateIdentifierType);
        const isActive = hasIdentifier || hasType;

        block.alternateIdentifierError =
            isActive && !hasIdentifier
                ? validateAlternateIdentifier(block.alternateIdentifier)
                : "";
        block.alternateIdentifierTypeError =
            isActive && !hasType
                ? validateAlternateIdentifierType(block.alternateIdentifierType)
                : "";
    },

    /**
     * Validates a size block.
     *
     * @param {object} block - Size block to validate.
     */
    validateSizeBlock(block) {
        const isActive = this.blockHasContent({ size: block.size });
        block.sizeError = isActive ? validateSize(block.size) : "";
    },

    /**
     * Validates a format block.
     *
     * @param {object} block - Format block to validate.
     */
    validateFormatBlock(block) {
        const isActive = this.blockHasContent({ format: block.format });
        block.formatError = isActive ? validateFormat(block.format) : "";
    },

    /**
     * Validates a funding reference block.
     *
     * @param {object} block - Funding reference block to validate.
     */
    validateFundingReferenceBlock(block) {
        const isActive = this.blockHasContent({
            funderName: block.funderName,
            funderIdentifier: block.funderIdentifier,
            funderIdentifierType: block.funderIdentifierType,
            awardNumber: block.awardNumber,
            awardUri: block.awardUri,
            awardTitle: block.awardTitle,
        });

        const hasIdentifier = this.hasTextValue(block.funderIdentifier);
        const hasIdentifierType = this.hasTextValue(block.funderIdentifierType);

        block.funderNameError = isActive
            ? validateFunderName(block.funderName)
            : "";
        block.funderIdentifierTypeError =
            isActive && hasIdentifier && !hasIdentifierType
                ? validateFunderIdentifierType(block.funderIdentifierType)
                : "";
    },

    /**
     * Validates a related item block and its nested minimum requirements.
     *
     * @param {object} block - Related item block to validate.
     */
    validateRelatedItemBlock(block) {
        const isActive = this.blockHasContent({
            relatedItemType: block.relatedItemType,
            relatedItemIdentifier: block.relatedItemIdentifier,
            relatedItemIdentifierType: block.relatedItemIdentifierType,
            relationType: block.relationType,
            relatedMetadataScheme: block.relatedMetadataScheme,
            relatedIdentifierSchemeURI: block.relatedIdentifierSchemeURI,
            relatedIdentifierSchemeType: block.relatedIdentifierSchemeType,
            publicationYear: block.publicationYear,
            volume: block.volume,
            issue: block.issue,
            number: block.number,
            numberType: block.numberType,
            firstPage: block.firstPage,
            lastPage: block.lastPage,
            edition: block.edition,
            publisher: block.publisher,
            creators: block.creators,
            titles: block.titles,
            contributors: block.contributors,
        });

        block.relationTypeError = isActive
            ? validateRelatedItemRelationType(block.relationType)
            : "";
        block.relatedItemTypeError = isActive
            ? validateRelatedItemType(block.relatedItemType)
            : "";

        const nestedErrors = [];

        if (isActive) {
            // Related items become subject to their own nested minimum set once used.
            const hasTitle = (block.titles || []).some((titleBlock) =>
                this.hasTextValue(titleBlock.title),
            );

            if (!hasTitle) {
                nestedErrors.push(
                    this.t("validation.relatedItem.titleRequired"),
                );
            }

            (block.creators || []).forEach((creator) => {
                const creatorActive = this.blockHasContent(creator);
                if (!creatorActive) {
                    return;
                }

                const hasCreatorName =
                    this.hasTextValue(creator.creatorName) ||
                    this.hasTextValue(creator.familyName) ||
                    this.hasTextValue(creator.givenName);

                if (!hasCreatorName) {
                    nestedErrors.push(
                        this.t("validation.relatedItem.creatorNameRequired"),
                    );
                }
            });

            (block.contributors || []).forEach((contributor) => {
                const contributorActive = this.blockHasContent(contributor);
                if (!contributorActive) {
                    return;
                }

                if (!this.hasTextValue(contributor.contributorType)) {
                    nestedErrors.push(
                        this.t(
                            "validation.relatedItem.contributorTypeRequired",
                        ),
                    );
                }

                const hasContributorName =
                    this.hasTextValue(contributor.contributorName) ||
                    this.hasTextValue(contributor.familyName) ||
                    this.hasTextValue(contributor.givenName);

                if (!hasContributorName) {
                    nestedErrors.push(
                        this.t(
                            "validation.relatedItem.contributorNameRequired",
                        ),
                    );
                }
            });
        }

        block.relatedItemErrors = [...new Set(nestedErrors)];
    },

    /**
     * Validates all optional-section blocks.
     */
    validateOtherFields() {
        this.rightsBlocks.forEach((block) => this.validateRightBlock(block));
        this.altIdentifierBlocks.forEach((block) =>
            this.validateAlternateIdentifierBlock(block),
        );
        this.sizeBlocks.forEach((block) => this.validateSizeBlock(block));
        this.formatBlocks.forEach((block) => this.validateFormatBlock(block));
        this.fundingReferenceBlocks.forEach((block) =>
            this.validateFundingReferenceBlock(block),
        );
        this.relatedItemsBlock.forEach((block) =>
            this.validateRelatedItemBlock(block),
        );
    },

    /**
     * Indicates whether the current publication year fails validation.
     *
     * @returns {boolean} True when the publication year is invalid.
     */
    get isPublicationYearInvalid() {
        return !!validateYear(this.publicationYear);
    },

    /**
     * Returns the current publication year validation message.
     *
     * @returns {string} Publication year error message, if any.
     */
    get yearErrorMessage() {
        return validateYear(this.publicationYear);
    },

    //Import
    /**
     * Imports a full metadata record from the DOI field and updates import summaries.
     *
     * @returns {Promise<void>}
     */
    async importViaDOI() {
        this.doiStatus = this.t("status.searching");
        this.importValidationSummary = "";
        this.importValidationLevel = "";
        this.importMissingMandatoryFields = [];
        this.importValidationSource = "";
        this.importVocabularyWarnings = [];

        const ok = await importViaDOI(this);

        if (ok) {
            this.importValidationSource = "DOI";
            this.runPostImportMandatoryCheck(this.importValidationSource);
            // Keep only the unified import summary for successful imports.
            this.doiStatus = "";
        } else {
            this.importValidationSummary = "";
            this.importValidationLevel = "";
            this.importMissingMandatoryFields = [];
            this.importValidationSource = "";
        }
    },

    // Import – relatedItem via DOI
    /**
     * Imports a related item from the DOI entered in the given related item block.
     *
     * @param {number} index - Related item block index.
     * @returns {Promise<void>}
     */
    async importRelatedItemViaDOI(index) {
        this.relatedItemsBlock[index].doiImportState =
            this.t("status.searching");
        this.relatedItemsBlock[index].doiImportStateType = "info";
        this.importVocabularyWarningsRelItem = [];

        await importViaDOI(this, { mode: "relatedItem", index });
    },

    /**
     * Imports metadata from JSON text and updates the import summaries.
     *
     * @param {string|object} text - JSON string or parsed DataCite object.
     */
    importFromJSON(text) {
        const ok = importFromJSON(this, text);

        if (ok) {
            this.importValidationSource = "JSON";
            this.runPostImportMandatoryCheck(this.importValidationSource);
            // Keep only the unified import summary for successful imports.
            this.jsonStatus = "";
        } else {
            this.importValidationSummary = "";
            this.importValidationLevel = "";
            this.importMissingMandatoryFields = [];
            this.importValidationSource = "";
        }
    },

    /**
     * Imports metadata from XML text and updates the import summaries.
     *
     * @param {string} text - XML document as text.
     */
    importFromXML(text) {
        const ok = importFromXML(this, text);
        this.regenerateAll();

        if (ok) {
            this.importValidationSource = "XML";
            this.runPostImportMandatoryCheck(this.importValidationSource);
            // Keep only the unified import summary for successful imports.
            this.xmlStatus = "";
        } else {
            this.importValidationSummary = "";
            this.importValidationLevel = "";
            this.importMissingMandatoryFields = [];
            this.importValidationSource = "";
        }
    },

    /**
     * Imports metadata from YAML text and updates the import summaries.
     *
     * @param {string} text - YAML document as text.
     * @returns {Promise<void>}
     */
    async importFromYAMLFile(text) {
        const ok = importFromYAML(this, text);
        this.regenerateAll();

        if (ok) {
            this.importValidationSource = "YAML";
            this.runPostImportMandatoryCheck(this.importValidationSource);
            // Clear any previous error messages
            this.xmlStatus = "";
            this.jsonStatus = "";
        } else {
            this.importValidationSummary = "";
            this.importValidationLevel = "";
            this.importMissingMandatoryFields = [];
            this.importValidationSource = "";
        }
    },

    /**
     * Switches to the mandatory-elements tab and scrolls to the field
     * identified by `fieldKey`, briefly highlighting it with the
     * `mandatory-highlight` CSS class to draw the user's attention.
     *
     * @param {string} fieldKey - The `data-mandatory-field` attribute value of the target element.
     */
    jumpToMandatoryField(fieldKey) {
        this.tab = "mandatory";

        this.$nextTick(() => {
            const element = document.querySelector(
                `[data-mandatory-field="${fieldKey}"]`,
            );

            if (!element) {
                return;
            }

            document
                .querySelectorAll(".mandatory-highlight")
                .forEach((item) =>
                    item.classList.remove("mandatory-highlight"),
                );

            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.focus();
            element.classList.add("mandatory-highlight");

            window.setTimeout(() => {
                element.classList.remove("mandatory-highlight");
            }, 1800);
        });
    },

    /**
     * Renders technical import warnings with user-facing, translated labels.
     *
     * Input warnings are collected as "fieldLabel: rawValue" in import utils.
     * This formatter keeps the raw value and translates the field label.
     *
     * @param {string} warning - Raw warning text from import normalization.
     * @returns {string} UI-friendly warning text.
     */
    formatImportWarning(warning) {
        const rawWarning = String(warning || "");
        const separatorIndex = rawWarning.indexOf(":");

        if (separatorIndex < 0) {
            return rawWarning;
        }

        const rawFieldLabel = rawWarning.slice(0, separatorIndex).trim();
        const rawValue = rawWarning.slice(separatorIndex + 1).trim();

        const friendlyLabel = this.getImportWarningFieldLabel(rawFieldLabel);
        return rawValue ? `${friendlyLabel}: ${rawValue}` : friendlyLabel;
    },

    /**
     * Converts technical warning field labels (e.g. creator.nameType)
     * into translated UI labels with optional context.
     *
     * @param {string} fieldLabel - Technical field label from import helpers.
     * @returns {string} Translated field label.
     */
    getImportWarningFieldLabel(fieldLabel) {
        const label = String(fieldLabel || "").trim();
        if (!label) {
            return "";
        }

        const parts = label.split(".");
        const leaf = parts[parts.length - 1];

        const fieldKeyMap = {
            titleType: "field.titleType",
            titleLanguage: "field.language",
            identifierType: "field.identifierType",
            publisherLanguage: "field.language",
            publisherIdentifierScheme: "field.publisherIdentifierScheme",
            publisherIdentifierSchemeURI: "field.schemeURI",
            resourceTypeGeneral: "field.resourceTypeGeneral",
            descriptionType: "field.descriptionType",
            descriptionLanguage: "field.language",
            subjectLanguage: "field.language",
            dateType: "field.dateType",
            relatedIdentifierType: "field.relatedIdentifierType",
            relationType: "field.relationType",
            contributorType: "field.contributorType",
            nameType: "field.nameType",
            nameIdentifierScheme: "field.nameIdentifierScheme",
            nameIdentifierSchemeURI: "field.schemeURI",
            affiliationIdentifierScheme: "field.affiliationIdentifierScheme",
            affiliationIdentifierSchemeURI: "field.schemeURI",
            numberType: "field.numberType",
            relatedItemType: "field.relatedItemType",
            relatedItemIdentifierType: "field.relatedItemIdentifierType",
        };

        const contextKeyMap = {
            creator: "section.creators",
            contributor: "section.contributors",
            publisher: "section.publisher",
            relatedItem: "section.relatedItems",
            title: "section.titles",
            description: "section.descriptions",
            subject: "section.subjects",
            date: "section.dates",
            funder: "section.fundingReference",
        };

        const fieldTranslationKey = fieldKeyMap[leaf] || fieldKeyMap[label];
        const translatedField = fieldTranslationKey
            ? this.t(fieldTranslationKey)
            : leaf
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (char) => char.toUpperCase());

        const contextToken = parts.length > 1 ? parts[0] : "";
        const contextTranslationKey = contextKeyMap[contextToken];

        if (!contextTranslationKey) {
            return translatedField;
        }

        return `${translatedField} (${this.t(contextTranslationKey)})`;
    },

    /**
     * Inspects all mandatory DataCite fields and returns an array of
     * descriptors for any that are empty or invalid.
     *
     * @returns {Array.<{key: string, label: string}>} Array of missing field descriptors.
     */
    collectMissingMandatoryFields() {
        const missingFields = [];

        if (!this.identifier || !this.identifier.trim()) {
            missingFields.push({
                key: "identifier",
                label: this.t("field.identifier"),
            });
        }

        if (!this.identifierType || !this.identifierType.trim()) {
            missingFields.push({
                key: "identifierType",
                label: this.t("field.identifierType"),
            });
        }

        const hasTitle = (this.titleBlocks || []).some(
            (block) => block.title && block.title.trim(),
        );
        if (!hasTitle) {
            missingFields.push({ key: "title", label: this.t("field.title") });
        }

        const hasCreator = (this.creatorBlocks || []).some((block) => {
            const creatorName = String(block?.creatorName || "").trim();
            const familyName = String(block?.familyName || "").trim();
            const givenName = String(block?.givenName || "").trim();
            return !!(creatorName || familyName || givenName);
        });
        if (!hasCreator) {
            missingFields.push({
                key: "creator",
                label: this.t("section.creators"),
            });
        }

        if (!this.publisher || !this.publisher.trim()) {
            missingFields.push({
                key: "publisher",
                label: this.t("field.publisher"),
            });
        }

        if (!this.publicationYear || !this.publicationYear.toString().trim()) {
            missingFields.push({
                key: "publicationYear",
                label: this.t("section.publicationYear"),
            });
        }

        if (
            this.publicationYear &&
            this.publicationYear.toString().trim() &&
            validateYear(this.publicationYear)
        ) {
            missingFields.push({
                key: "publicationYear",
                label: this.t("summary.publicationYearValidRequired"),
            });
        }

        // resourceType optional

        if (validateResourceTypeGeneral(this.resourceTypeGeneral)) {
            missingFields.push({
                key: "resourceTypeGeneral",
                label: this.t("field.resourceTypeGeneral"),
            });
        }

        return missingFields;
    },

    /**
     * Runs the mandatory-field check and updates the validation summary
     * displayed in the preview panel. Used before download and copy actions.
     *
     * @param {string} contextLabel - Label shown in the summary message (e.g. "XML export").
     * @returns {{isValid: boolean, missingFields: Array.<object>}}
     */
    runGlobalMandatoryCheck(contextLabel = this.t("import.contextValidation")) {
        const missingFields = this.collectMissingMandatoryFields();

        if (!missingFields.length) {
            this.mandatoryValidationSummary = this.t(
                "summary.mandatoryAllPresent",
                { context: contextLabel },
            );
            this.mandatoryValidationLevel = "success";
            this.mandatoryMissingFields = [];
            return { isValid: true, missingFields };
        }

        this.mandatoryValidationSummary = this.t("summary.mandatoryMissing", {
            context: contextLabel,
            count: missingFields.length,
        });
        this.mandatoryValidationLevel = "warning";
        this.mandatoryMissingFields = missingFields;
        return { isValid: false, missingFields };
    },

    /**
     * Runs the mandatory-field check after a successful import and updates
     * both the import validation summary and the preview panel summary.
     *
     * @param {string} sourceFormat - Import source label: 'DOI' | 'JSON' | 'XML'.
     */
    runPostImportMandatoryCheck(sourceFormat) {
        const missingFields = this.collectMissingMandatoryFields();

        this.runGlobalMandatoryCheck(
            this.t(`import.context${sourceFormat}Import`),
        );

        if (!missingFields.length) {
            this.importValidationSummary = this.t("summary.importAllPresent", {
                source: sourceFormat,
            });
            this.importValidationLevel = "success";
            this.importMissingMandatoryFields = [];
            return;
        }

        this.importMissingMandatoryFields = missingFields;

        this.importValidationSummary = this.t("summary.importMissing", {
            source: sourceFormat,
            count: missingFields.length,
        });
        this.importValidationLevel = "warning";
    },

    /**
     * Handles file selection from the import file input. Validates the file
     * size and type before reading its contents and dispatching to either
     * {@link importFromJSON} or {@link importFromXML}.
     *
     * @param {Event} event - The `change` event from the file input element.
     * @returns {Promise<void>}
     */
    async importFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.jsonStatus = "";
        this.xmlStatus = "";
        this.importValidationSummary = "";
        this.importValidationLevel = "";
        this.importMissingMandatoryFields = [];
        this.importValidationSource = "";
        this.importVocabularyWarnings = [];

        if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
            const maxSizeMb = MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024);
            const message = this.t("import.fileTooLarge", { maxSizeMb });
            this.jsonStatus = message;
            this.xmlStatus = message;
            event.target.value = "";
            return;
        }

        const lowerFileName = file.name.toLowerCase();
        const hasAllowedExtension = ALLOWED_IMPORT_EXTENSIONS.some((ext) =>
            lowerFileName.endsWith(ext),
        );

        const mimeType = (file.type || "").toLowerCase();
        const hasAllowedMimeType = ALLOWED_IMPORT_MIME_TYPES.includes(mimeType);

        if (!hasAllowedExtension || !hasAllowedMimeType) {
            const message = this.t("import.unsupportedUploadType");
            this.jsonStatus = message;
            this.xmlStatus = message;
            event.target.value = "";
            return;
        }

        let text = "";
        try {
            text = await file.text();
        } catch {
            const message = this.t("import.fileReadError");
            this.jsonStatus = message;
            this.xmlStatus = message;
            event.target.value = "";
            return;
        }

        if (lowerFileName.endsWith(".json")) {
            this.importFromJSON(text);
        } else if (lowerFileName.endsWith(".xml")) {
            this.importFromXML(text);
        } else if (
            lowerFileName.endsWith(".yaml") ||
            lowerFileName.endsWith(".yml")
        ) {
            await this.importFromYAMLFile(text);
        } else {
            const message = this.t("import.unsupportedSelectedType");
            this.jsonStatus = message;
            this.xmlStatus = message;
        }
    },

    /**
     * Triggers a browser download of the current metadata as an XML file.
     * Runs the mandatory-field check first to update the validation summary.
     */
    downloadXML() {
        this.runGlobalMandatoryCheck(this.t("import.contextXMLExport"));

        const blob = new Blob([this.xml || this.generateXML()], {
            type: "application/xml;charset=utf-8",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${this.filename}.xml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    /**
     * Triggers a browser download of the current metadata as a JSON file.
     * Runs the mandatory-field check first to update the validation summary.
     */
    downloadJSON() {
        this.runGlobalMandatoryCheck(this.t("import.contextJSONExport"));

        const blob = new Blob([this.json || this.generateJSON()], {
            type: "application/json",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${this.filename}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    /**
     * Triggers a browser download of the current metadata as a YAML file.
     * Runs the mandatory-field check first to update the validation summary.
     * Regenerates YAML if not already available.
     */
    downloadYAML() {
        this.runGlobalMandatoryCheck(this.t("import.contextYAMLExport"));

        const blob = new Blob([this.yaml || this.generateYAML()], {
            type: "application/x-yaml;charset=utf-8",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${this.filename}.yaml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    /**
     * Copies the given content (XML by default, or JSON) to the clipboard.
     * Runs the mandatory-field check first, then shows a brief alert.
     *
     * @param {string} [content=this.xml] - The string to copy; pass `this.json` for JSON.
     * @returns {Promise<void>}
     */
    async copyToClipboard(content = this.xml) {
        const targetName =
            content === this.json
                ? this.t("import.contextJSONCopy")
                : this.t("import.contextXMLCopy");
        this.runGlobalMandatoryCheck(targetName);

        try {
            await navigator.clipboard.writeText(content || "");
            alert(this.t("status.copySuccess"));
        } catch (err) {
            alert(this.t("status.copyError"));
        }
    },

    /**
     * Derives a download filename from the first title and today's date.
     * Special characters are stripped; spaces become underscores.
     * Falls back to "metadata" when no title is set.
     *
     * @returns {string} Filename without extension, e.g. "2026-03-18_My_Dataset".
     */
    get filename() {
        const base = this.titleBlocks[0].title
            ? this.titleBlocks[0].title
                  .replace(/\s+/g, "_")
                  .replace(/[^\w\-_.]/g, "")
            : "metadata";
        const d = new Date().toISOString().slice(0, 10);
        return `${d}_${base}`;
    },

    //Reset
    /**
     * Resets the entire metadata form, validation state, previews, and help modal.
     */
    clearAll() {
        this.titleBlocks = [createEmptyTitleBlock()];
        this.creatorBlocks = [createEmptyCreatorBlock()];
        this.publicationYear = "";
        this.descriptionBlocks = [createEmptyDescriptionBlock()];
        this.subjectBlocks = [createEmptySubjectBlock()];
        this.dateBlocks = [createEmptyDateBlock()];
        this.relatedIdentifierBlocks = [createEmptyRelatedIdentifierBlock()];
        this.contributorBlocks = [createEmptyContributorBlock()];
        this.identifier = "";
        this.identifierType = "DOI";
        this.identifierError = "";
        this.identifierTypeError = "";
        this.publisher = "";
        this.publisherLanguage = "";
        this.publisherIdentifier = "";
        this.publisherIdentifierScheme = "";
        this.publisherIdentifierSchemeURI = "";
        this.publisherError = "";
        this.publisherLanguageError = "";
        this.publisherIdentifierError = "";
        this.publisherIdentifierSchemeError = "";
        this.publisherSearchType = "";
        this.publisherSearch = createEmptyPublisherSearch();
        this.resourceType = "";
        this.resourceTypeGeneral = "";
        this.resourceTypeError = "";
        this.resourceTypeGeneralError = "";
        this.language = "";
        this.rightsBlocks = [createEmptyRightBlock()];
        this.formatBlocks = [createEmptyFormatBlock()];
        this.sizeBlocks = [createEmptySizeBlock()];
        this.altIdentifierBlocks = [createEmptyAlternateIdentifierBlock()];
        this.geoLocationBlocks = [createEmptyGeoLocationBlock()];
        this.version = "";
        this.fundingReferenceBlocks = [createEmptyFundingReferenceBlock()];
        this.relatedItemsBlock = [createEmptyRelatedItemBlock()];
        this.doi = "";
        this.doiStatus = "";
        this.xml = "";
        this.xmlStatus = "";
        this.json = "";
        this.jsonStatus = "";
        ((this.yaml = ""), (this.importValidationSummary = ""));
        this.importValidationLevel = "";
        this.importMissingMandatoryFields = [];
        this.importValidationSource = "";
        this.importVocabularyWarnings = [];
        this.importVocabularyWarningsRelItem = [];
        this.mandatoryValidationSummary = "";
        this.mandatoryValidationLevel = "";
        this.mandatoryMissingFields = [];
        this.helpModalOpen = false;
        this.helpModalUrl = "";
        this.helpModalTextKey = "help.placeholderText";
        this.$refs.fileInput.value = "";
        this.regenerateAll();
    },
}));

Alpine.start();

// Some browsers restore this page from bfcache on Back navigation.
// Reload once on persisted restore so Alpine state and DOM are fully in sync.
window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});
