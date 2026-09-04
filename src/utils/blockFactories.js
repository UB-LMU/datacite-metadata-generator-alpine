/**
 * @file blockFactories.js
 * @description Factory functions that create empty/default objects for the
 * repeatable block structures used throughout the DataCite Metadata Generator
 * (titles, creators, contributors, descriptions, subjects, dates, etc.).
 *
 * Centralizing these here avoids duplicating the same object literals across
 * the initial Alpine state, addBlock()/addNestedBlock(), and clearAll().
 */

/**
 * Creates an empty title block with validation state.
 *
 * @returns {{title: string, titleLanguage: string, titleType: string, titleError: string}}
 * Fresh title block state.
 */
export function createEmptyTitleBlock() {
    return {
        title: "",
        titleLanguage: "",
        titleType: "",
        titleError: "",
    };
}

/**
 * Creates an empty description block.
 *
 * @returns {object} Fresh description block state.
 */
export function createEmptyDescriptionBlock() {
    return {
        description: "",
        descriptionLanguage: "",
        descriptionType: "",
        descriptionError: "",
        descriptionTypeError: "",
    };
}

/**
 * Creates an empty subject block.
 *
 * @returns {object} Fresh subject block state.
 */
export function createEmptySubjectBlock() {
    return {
        selectSubjectScheme: "",
        subject: "",
        subjectLanguage: "",
        subjectScheme: "",
        subjectSchemeURI: "",
        valueURI: "",
        classificationCode: "",
        subjectError: "",
    };
}

/**
 * Creates an empty rights/licence block.
 *
 * @returns {object} Fresh rights block state.
 */
export function createEmptyRightBlock() {
    return {
        selectLicense: "",
        right: "",
        rightsLanguage: "",
        rightsURI: "",
        rightsIdentifier: "",
        rightsIdentifierScheme: "",
        rightsIdentifierSchemeURI: "",
        rightError: "",
    };
}

/**
 * Creates an empty date block.
 *
 * @returns {object} Fresh date block state.
 */
export function createEmptyDateBlock() {
    return {
        date: "",
        dateType: "",
        dateInformation: "",
        dateError: "",
        dateTypeError: "",
    };
}

/**
 * Creates an empty related-identifier block.
 *
 * @returns {object} Fresh related identifier block state.
 */
export function createEmptyRelatedIdentifierBlock() {
    return {
        relatedIdentifier: "",
        relatedIdentifierType: "",
        relationType: "",
        relationTypeInformation: "",
        relatedMetadataScheme: "",
        relatedMetadataSchemeURI: "",
        relatedMetadataSchemeType: "",
        resourceTypeGeneral: "",
        relatedIdentifierError: "",
        relatedIdentifierTypeError: "",
        relationTypeError: "",
    };
}

/**
 * Creates an empty name-identifier block, including search-related UI state.
 *
 * @returns {object} Fresh name identifier state.
 */
export function createEmptyNameIdentifier() {
    return {
        nameIdentifierScheme: "",
        nameIdentifierSchemeURI: "",
        nameIdentifier: "",
        importState: "",
        importStateType: "",
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
}

/**
 * @param {"creator"|"contributor"} ownerKey - Determines which property
 *        holds the affiliation name ("creatorAffiliation" vs "contributorAffiliation").
 * @returns {object} Fresh affiliation state for the chosen owner type.
 */
export function createEmptyAffiliation(ownerKey = "creator") {
    const nameKey =
        ownerKey === "contributor"
            ? "contributorAffiliation"
            : "creatorAffiliation";

    return {
        [nameKey]: "",
        affiliationIdentifierScheme: "",
        affiliationIdentifierSchemeURI: "",
        affiliationIdentifier: "",
        rorSearchQuery: "",
        rorDropdownOpen: false,
        rorResults: [],
        rorHasSearched: false,
        searchType: "",
    };
}

/**
 * Creates an empty creator block with one identifier slot and one affiliation slot.
 *
 * @returns {object} Fresh creator block state.
 */
export function createEmptyCreatorBlock() {
    return {
        creatorName: "",
        creatorNameLanguage: "",
        givenName: "",
        familyName: "",
        nameType: "",
        creatorNameError: "",
        searchType: "",
        nameIdentifiers: [createEmptyNameIdentifier()],
        affiliations: [createEmptyAffiliation("creator")],
    };
}

/**
 * Creates an empty contributor block with one identifier slot and one affiliation slot.
 *
 * @returns {object} Fresh contributor block state.
 */
export function createEmptyContributorBlock() {
    return {
        contributorType: "",
        contributorName: "",
        contributorNameLanguage: "",
        givenName: "",
        familyName: "",
        nameType: "",
        contributorTypeError: "",
        contributorNameError: "",
        contributorTouched: false,
        searchType: "",
        nameIdentifiers: [createEmptyNameIdentifier()],
        affiliations: [createEmptyAffiliation("contributor")],
    };
}

/**
 * Creates an empty polygon point.
 *
 * @returns {{polygonPointLong: string, polygonPointLat: string}} Empty polygon point.
 */
export function createEmptyPolygonPoint() {
    return { polygonPointLong: "", polygonPointLat: "" };
}

/**
 * Creates an empty geolocation polygon with the default four point slots.
 *
 * @returns {object} Fresh polygon state.
 */
export function createEmptyGeoLocationPolygon() {
    return {
        polygonPoints: [
            createEmptyPolygonPoint(),
            createEmptyPolygonPoint(),
            createEmptyPolygonPoint(),
            createEmptyPolygonPoint(),
        ],
        inPolygonPointLong: "",
        inPolygonPointLat: "",
    };
}

/**
 * Creates an empty geolocation block.
 *
 * @returns {object} Fresh geolocation block state.
 */
export function createEmptyGeoLocationBlock() {
    return {
        geoLocationPlace: "",
        geoLocationPointLong: "",
        geoLocationPointLat: "",
        geoLocationBoxWest: "",
        geoLocationBoxEast: "",
        geoLocationBoxSouth: "",
        geoLocationBoxNorth: "",
        geoErrors: [],
        geoLocationPolygon: [createEmptyGeoLocationPolygon()],
    };
}

/**
 * Creates an empty format block.
 *
 * @returns {{format: string, formatError: string}} Fresh format state.
 */
export function createEmptyFormatBlock() {
    return { format: "", formatError: "" };
}

/**
 * Creates an empty size block.
 *
 * @returns {{size: string, sizeError: string}} Fresh size state.
 */
export function createEmptySizeBlock() {
    return { size: "", sizeError: "" };
}

/**
 * Creates an empty alternate-identifier block.
 *
 * @returns {object} Fresh alternate identifier state.
 */
export function createEmptyAlternateIdentifierBlock() {
    return {
        alternateIdentifier: "",
        alternateIdentifierType: "",
        alternateIdentifierError: "",
        alternateIdentifierTypeError: "",
    };
}

/**
 * Creates an empty funding reference block.
 *
 * @returns {object} Fresh funding reference state.
 */
export function createEmptyFundingReferenceBlock() {
    return {
        funderName: "",
        funderIdentifier: "",
        funderIdentifierType: "",
        funderIdentifierTypeURI: "",
        awardNumber: "",
        awardUri: "",
        awardTitle: "",
        funderNameError: "",
        funderIdentifierTypeError: "",
        rorSearchQuery: "",
        rorDropdownOpen: false,
        rorResults: [],
        rorHasSearched: false,
        searchType: "",
    };
}

/**
 * Creates the transient publisher ROR search state.
 *
 * @returns {object} Fresh publisher search state.
 */
export function createEmptyPublisherSearch() {
    return {
        rorSearchQuery: "",
        rorDropdownOpen: false,
        rorResults: [],
        rorHasSearched: false,
    };
}

/**
 * Creates an empty nested creator block for related items.
 *
 * @returns {object} Fresh related-item creator state.
 */
export function createEmptyRelatedItemCreator() {
    return {
        creatorName: "",
        creatorNameLanguage: "",
        givenName: "",
        familyName: "",
        nameType: "",
    };
}

/**
 * Creates an empty nested title block for related items.
 *
 * @returns {object} Fresh related-item title state.
 */
export function createEmptyRelatedItemTitle() {
    return {
        title: "",
        titleType: "",
        titleLanguage: "",
    };
}

/**
 * Creates an empty nested contributor block for related items.
 *
 * @returns {object} Fresh related-item contributor state.
 */
export function createEmptyRelatedItemContributor() {
    return {
        contributorType: "",
        contributorName: "",
        contributorNameLanguage: "",
        givenName: "",
        familyName: "",
        nameType: "",
    };
}

/**
 * Creates an empty related item block including nested title, creator, and contributor arrays.
 *
 * @returns {object} Fresh related item state.
 */
export function createEmptyRelatedItemBlock() {
    return {
        relatedItemIdentifierSearch: "",
        relatedItemType: "",
        relatedItemIdentifier: "",
        relatedItemIdentifierType: "",
        relationType: "",
        relationTypeInformation: "",
        relatedMetadataScheme: "",
        relatedIdentifierSchemeURI: "",
        relatedIdentifierSchemeType: "",
        relationTypeError: "",
        relatedItemTypeError: "",
        relatedItemErrors: [],
        creators: [createEmptyRelatedItemCreator()],
        titles: [createEmptyRelatedItemTitle()],
        publicationYear: "",
        volume: "",
        issue: "",
        number: "",
        numberType: "",
        firstPage: "",
        lastPage: "",
        edition: "",
        publisher: "",
        contributors: [createEmptyRelatedItemContributor()],
        doiImportState: "",
        doiImportStateType: "",
    };
}

/**
 * Lookup maps used by addBlock()/removeBlock() in main.js to avoid long
 * if-chains. Keys correspond to the `type` argument used throughout main.js.
 */
export const blockFactories = {
    title: createEmptyTitleBlock,
    description: createEmptyDescriptionBlock,
    subject: createEmptySubjectBlock,
    right: createEmptyRightBlock,
    date: createEmptyDateBlock,
    relatedIdentifier: createEmptyRelatedIdentifierBlock,
    creator: createEmptyCreatorBlock,
    contributor: createEmptyContributorBlock,
    geoLocation: createEmptyGeoLocationBlock,
    format: createEmptyFormatBlock,
    size: createEmptySizeBlock,
    alternateIdentifier: createEmptyAlternateIdentifierBlock,
    funding: createEmptyFundingReferenceBlock,
    relatedItem: createEmptyRelatedItemBlock,
};

/**
 * Maps block type keys to the corresponding Alpine state array name.
 */
export const blockTargetArrays = {
    title: "titleBlocks",
    description: "descriptionBlocks",
    subject: "subjectBlocks",
    right: "rightsBlocks",
    date: "dateBlocks",
    relatedIdentifier: "relatedIdentifierBlocks",
    creator: "creatorBlocks",
    contributor: "contributorBlocks",
    geoLocation: "geoLocationBlocks",
    format: "formatBlocks",
    size: "sizeBlocks",
    alternateIdentifier: "altIdentifierBlocks",
    funding: "fundingReferenceBlocks",
    relatedItem: "relatedItemsBlock",
};
