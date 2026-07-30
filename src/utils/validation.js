/**
 * @file validation.js
 * @description Field-level validation functions for DataCite metadata inputs,
 * plus utility functions for normalising controlled-vocabulary values and
 * ISO 639-1 language codes during import.
 *
 * All validate* functions return an error message string on failure,
 * or an empty string when the value is valid.
 *
 * Exported utilities:
 *   - {@link normalizeVocabularyValue} – maps raw values to known vocab entries
 *   - {@link normalizeLanguageCode}    – maps language strings to ISO 639-1 codes
 */

function t(key, fallback, vars = {}) {
    const store = window.Alpine?.store?.("i18n");
    const translated = store?.t ? store.t(key, vars) : null;
    if (!translated || translated === key) {
        return fallback;
    }
    return translated;
}

/**
 * Validates that a required field is not empty.
 *
 * @param {string} value     - The field value to check.
 * @param {string} fieldName - Human-readable field name used in the error message.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateRequired(value, fieldName = "Field") {
    if (!value || value.trim() === "") {
        return t("validation.required", `${fieldName} is required.`, {
            field: fieldName,
        });
    }
    return "";
}

// Year validation (DataCite publicationYear: YYYY)
/**
 * Validates the DataCite publication year format and rejects future years.
 *
 * @param {string|number} year - Candidate publication year.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateYear(year) {
    const value = String(year ?? "").trim();
    const yearPattern = /^\d{4}$/;

    if (!yearPattern.test(value)) {
        return t(
            "validation.publicationYearFormat",
            "Publication year must be a 4-digit year (YYYY).",
        );
    }

    const numericYear = Number(value);
    const currentYear = new Date().getFullYear();
    if (numericYear > currentYear) {
        return t(
            "validation.publicationYearFuture",
            "Publication year cannot be in the future.",
        );
    }

    return "";
}

// ORCID validation
/**
 * Validates ORCID format and checksum.
 *
 * @param {string} orcid - Candidate ORCID iD.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateOrcid(orcid) {
    const normalized = orcid.trim().toUpperCase();

    // check format
    if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(normalized)) {
        return t("validation.invalidOrcid", "Invalid ORCID format.");
    }

    // remove hyphens
    const digits = normalized.replace(/-/g, "");

    // calculate checksum
    let total = 0;
    for (let i = 0; i < 15; i++) {
        total = (total + Number(digits[i])) * 2;
    }

    const remainder = total % 11;
    const checkDigit = (12 - remainder) % 11;
    const expected = checkDigit === 10 ? "X" : String(checkDigit);

    if (digits[15] !== expected) {
        return t("validation.invalidOrcid", "Invalid ORCID.");
    }

    return "";
}

// Description validation
/**
 * Validates the presence of a description value.
 *
 * @param {string} desc - Description text.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateDescription(desc) {
    if (!desc || desc.trim() === "") {
        return t("validation.required", "Description is required.", {
            field: t("field.description", "Description"),
        });
    }
    return "";
}

/*
// Custom field validation
export function validateCustomPair(pair) {
    if (!pair.key || pair.key.trim() === "") {
        return "Custom field key is required.";
    }
    return "";
}
*/

// Identifier validation
/**
 * Validates the presence of the main identifier value.
 *
 * @param {string} value - Identifier value.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateIdentifier(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Identifier is required.", {
            field: t("field.identifier", "Identifier"),
        });
    }
    return "";
}

// Identifier type validation
/**
 * Validates the identifier type.
 *
 * The app currently fixes the identifier type to DOI, so the field is always valid.
 *
 * @param {string} value - Identifier type.
 * @returns {string} Always an empty string.
 */
export function validateIdentifierType(value) {
    // Identifier type is now fixed to DOI, always valid
    return "";
}

// Publisher validation
/**
 * Validates the presence of the publisher field.
 *
 * @param {string} value - Publisher name.
 * @returns {string} Error message, or empty string if valid.
 */
export function validatePublisher(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Publisher is required.", {
            field: t("field.publisher", "Publisher"),
        });
    }
    return "";
}

// Publisher language validation
/**
 * Validates the publisher language field.
 *
 * The field is optional, so the function always returns success.
 *
 * @param {string} value - Publisher language code.
 * @returns {string} Always an empty string.
 */
export function validatePublisherLanguage(value) {
    // Publisher Language is optional
    return "";
}

// Publisher identifier field validation
/**
 * Enforces that a publisher identifier is present once a scheme is selected.
 *
 * @param {string} identifier - Publisher identifier value.
 * @param {string} scheme - Publisher identifier scheme.
 * @returns {string} Error message, or empty string if valid.
 */
export function validatePublisherIdentifier(identifier, scheme) {
    const hasIdentifier = String(identifier ?? "").trim() !== "";
    const hasScheme = String(scheme ?? "").trim() !== "";

    if (!hasIdentifier && hasScheme) {
        return t(
            "validation.publisherIdentifierRequired",
            "Publisher identifier is required when a publisher identifier scheme is selected.",
        );
    }

    return "";
}

// Publisher identifier scheme field validation
/**
 * Enforces that a publisher identifier scheme is present once an identifier exists.
 *
 * @param {string} identifier - Publisher identifier value.
 * @param {string} scheme - Publisher identifier scheme.
 * @returns {string} Error message, or empty string if valid.
 */
export function validatePublisherIdentifierScheme(identifier, scheme) {
    const hasIdentifier = String(identifier ?? "").trim() !== "";
    const hasScheme = String(scheme ?? "").trim() !== "";

    if (hasIdentifier && !hasScheme) {
        return t(
            "validation.publisherIdentifierSchemeRequired",
            "Publisher identifier scheme is required when a publisher identifier is provided.",
        );
    }

    return "";
}

// Resource type validation
/**
 * Validates the free-text resource type field.
 *
 * The field is optional in the current UI flow.
 *
 * @param {string} value - Resource type text.
 * @returns {string} Always an empty string.
 */
export function validateResourceType(value) {
    // Resource type is now optional; only resourceTypeGeneral is required
    return "";
}

// Resource type general validation
/**
 * Validates the mandatory resourceTypeGeneral field.
 *
 * @param {string} value - Resource type general value.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateResourceTypeGeneral(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Resource type general is required.", {
            field: t("field.resourceTypeGeneral", "Resource type general"),
        });
    }
    return "";
}

// Subject validation
/**
 * Validates the presence of a subject value.
 *
 * @param {string} value - Subject text.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateSubject(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Subject is required.", {
            field: t("field.subject", "Subject"),
        });
    }
    return "";
}

// Date validation
/**
 * Validates the presence of a date value.
 *
 * @param {string} value - Date string.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateDate(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Date is required.", {
            field: t("field.date", "Date"),
        });
    }
    return "";
}

// Date type validation
/**
 * Validates the presence of a date type.
 *
 * @param {string} value - Date type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateDateType(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Date type is required.", {
            field: t("field.dateType", "Date type"),
        });
    }
    return "";
}

// Related identifier validation
/**
 * Validates the presence of a related identifier.
 *
 * @param {string} value - Related identifier value.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateRelatedIdentifier(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Related identifier is required.", {
            field: t("field.relatedIdentifier", "Related identifier"),
        });
    }
    return "";
}

// Related identifier type validation
/**
 * Validates the presence of a related identifier type.
 *
 * @param {string} value - Related identifier type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateRelatedIdentifierType(value) {
    if (!value || value.trim() === "") {
        return t(
            "validation.required",
            "Related identifier type is required.",
            {
                field: t(
                    "field.relatedIdentifierType",
                    "Related identifier type",
                ),
            },
        );
    }
    return "";
}

// Relation type validation
/**
 * Validates the presence of a relation type.
 *
 * @param {string} value - Relation type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateRelationType(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Relation type is required.", {
            field: t("field.relationType", "Relation type"),
        });
    }
    return "";
}

// Contributor family name validation
/**
 * Validates the presence of a contributor family name.
 *
 * @param {string} value - Family name.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateContributorFamilyName(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Family name is required.", {
            field: t("field.familyName", "Family name"),
        });
    }
    return "";
}

// Contributor type validation
/**
 * Validates the presence of a contributor type.
 *
 * @param {string} value - Contributor type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateContributorType(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Contributor type is required.", {
            field: t("field.contributorType", "Contributor type"),
        });
    }
    return "";
}

/**
 * Validates the presence of a title value.
 *
 * @param {string} value - Title text.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateTitle(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Title is required.", {
            field: t("field.title", "Title"),
        });
    }
    return "";
}

/**
 * Validates the presence of a creator name.
 *
 * @param {string} value - Creator name value.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateCreatorName(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Creator name is required.", {
            field: t("field.creatorNameRequired", "Creator name"),
        });
    }
    return "";
}

/**
 * Validates the presence of a contributor name.
 *
 * @param {string} value - Contributor name value.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateContributorName(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Contributor name is required.", {
            field: t("field.name", "Contributor name"),
        });
    }
    return "";
}

/**
 * Validates the presence of a description type.
 *
 * @param {string} value - Description type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateDescriptionType(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Description type is required.", {
            field: t("field.descriptionType", "Description type"),
        });
    }
    return "";
}

/**
 * Validates the presence of a rights statement.
 *
 * @param {string} value - Rights text.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateRight(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Right is required.", {
            field: t("field.right", "Right"),
        });
    }
    return "";
}

/**
 * Validates the presence of an alternate identifier.
 *
 * @param {string} value - Alternate identifier value.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateAlternateIdentifier(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Alternate identifier is required.", {
            field: t("field.alternateIdentifier", "Alternate identifier"),
        });
    }
    return "";
}

/**
 * Validates the presence of an alternate identifier type.
 *
 * @param {string} value - Alternate identifier type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateAlternateIdentifierType(value) {
    if (!value || value.trim() === "") {
        return t(
            "validation.required",
            "Alternate identifier type is required.",
            {
                field: t(
                    "field.alternateIdentifierType",
                    "Alternate identifier type",
                ),
            },
        );
    }
    return "";
}

/**
 * Validates the presence of a size value.
 *
 * @param {string} value - Size value.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateSize(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Size is required.", {
            field: t("field.size", "Size"),
        });
    }
    return "";
}

/**
 * Validates the presence of a format value.
 *
 * @param {string} value - Format value.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateFormat(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Format is required.", {
            field: t("field.format", "Format"),
        });
    }
    return "";
}

/**
 * Validates the presence of a funder name.
 *
 * @param {string} value - Funder name.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateFunderName(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Funder name is required.", {
            field: t("field.funderName", "Funder name"),
        });
    }
    return "";
}

/**
 * Validates the presence of a funder identifier type.
 *
 * @param {string} value - Funder identifier type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateFunderIdentifierType(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Funder identifier type is required.", {
            field: t("field.funderIdentifierType", "Funder identifier type"),
        });
    }
    return "";
}

/**
 * Validates the relation type for a related item.
 *
 * @param {string} value - Related item relation type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateRelatedItemRelationType(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Relation type is required.", {
            field: t("field.relationType", "Relation type"),
        });
    }
    return "";
}

/**
 * Validates the type of a related item.
 *
 * @param {string} value - Related item type.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateRelatedItemType(value) {
    if (!value || value.trim() === "") {
        return t("validation.required", "Related item type is required.", {
            field: t("field.relatedItemType", "Related item type"),
        });
    }
    return "";
}

/**
 * Validates that a longitude value is numeric and within the valid range.
 *
 * @param {string|number} value - Longitude value to validate.
 * @param {string} [context="Longitude"] - Human-readable field context.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateGeoLongitude(value, context = "Longitude") {
    const raw = String(value ?? "")
        .trim()
        .replace(/,/g, ".");
    if (!raw) {
        return "";
    }

    const numericValue = Number(raw);
    if (
        Number.isNaN(numericValue) ||
        numericValue < -180 ||
        numericValue > 180
    ) {
        return t(
            "validation.longitudeRange",
            `${context} must be between -180 and 180.`,
            { context },
        );
    }

    return "";
}

/**
 * Validates that a latitude value is numeric and within the valid range.
 *
 * @param {string|number} value - Latitude value to validate.
 * @param {string} [context="Latitude"] - Human-readable field context.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateGeoLatitude(value, context = "Latitude") {
    const raw = String(value ?? "")
        .trim()
        .replace(/,/g, ".");
    if (!raw) {
        return "";
    }

    const numericValue = Number(raw);
    if (Number.isNaN(numericValue) || numericValue < -90 || numericValue > 90) {
        return t(
            "validation.latitudeRange",
            `${context} must be between -90 and 90.`,
            { context },
        );
    }

    return "";
}

/**
 * Validates that coordinate pairs are provided together.
 *
 * @param {string|number} longitude - Longitude component.
 * @param {string|number} latitude - Latitude component.
 * @param {string} [context="Geo coordinates"] - Human-readable field context.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateGeoCoordinatePair(
    longitude,
    latitude,
    context = "Geo coordinates",
) {
    const hasLongitude = String(longitude ?? "").trim() !== "";
    const hasLatitude = String(latitude ?? "").trim() !== "";

    if (hasLongitude || hasLatitude) {
        if (!hasLongitude || !hasLatitude) {
            return t(
                "validation.geoPair",
                `${context} require both longitude and latitude.`,
                { context },
            );
        }
    }

    return "";
}

/**
 * Ensures that a GeoLocationBox is either completely empty or fully specified.
 *
 * @param {string|number} west - West bound longitude.
 * @param {string|number} east - East bound longitude.
 * @param {string|number} south - South bound latitude.
 * @param {string|number} north - North bound latitude.
 * @returns {string} Error message, or empty string if valid.
 */
export function validateGeoBoxCompleteness(west, east, south, north) {
    const values = [west, east, south, north];
    const filledCount = values.filter(
        (value) => String(value ?? "").trim() !== "",
    ).length;

    if (filledCount > 0 && filledCount < 4) {
        return t(
            "validation.geoBoxCompleteness",
            "Geo Location Box requires west, east, south, and north values.",
        );
    }

    return "";
}

/**
 * Normalises a raw import value against a list of known controlled-vocabulary
 * options. Tries an exact match first, then a case-insensitive match.
 * Unknown values are recorded in `unknownCollector` for user feedback.
 *
 * @param {string}   value            - The raw value from the imported file.
 * @param {object[]} options          - Array of vocabulary option objects.
 * @param {string}   optionKey        - The property name to match against (e.g. "value" or "uri").
 * @param {string[]|null} unknownCollector - Array to collect unrecognised values, or null.
 * @param {string}   fieldLabel       - Label shown in the warning message.
 * @returns {string} The normalised value, or empty string if unrecognised.
 */
export function normalizeVocabularyValue(
    value,
    options = [],
    optionKey = "value",
    unknownCollector = null,
    fieldLabel = "",
) {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
        return "";
    }

    const normalizeUriForMatch = (uri) =>
        String(uri || "")
            .trim()
            .replace(/^http:\/\//i, "https://")
            .replace(/\/+$/, "")
            .toLowerCase();

    const exactMatch = options.find(
        (option) => option?.[optionKey] === rawValue,
    );
    if (exactMatch) {
        return exactMatch[optionKey] || "";
    }

    const caseInsensitiveMatch = options.find(
        (option) =>
            String(option?.[optionKey] || "").toLowerCase() ===
            rawValue.toLowerCase(),
    );

    if (optionKey === "uri") {
        // URI imports frequently vary by trailing slash or http/https.
        // Unify both sides before comparison to reduce false warnings.
        const normalizedRawUri = normalizeUriForMatch(rawValue);
        const uriMatch = options.find(
            (option) =>
                normalizeUriForMatch(option?.[optionKey] || "") ===
                normalizedRawUri,
        );

        if (uriMatch) {
            return uriMatch[optionKey] || "";
        }
    }

    if (
        !caseInsensitiveMatch &&
        Array.isArray(unknownCollector) &&
        fieldLabel
    ) {
        const warning = `${fieldLabel}: ${rawValue}`;
        if (!unknownCollector.includes(warning)) {
            unknownCollector.push(warning);
        }
    }

    return caseInsensitiveMatch ? caseInsensitiveMatch[optionKey] || "" : "";
}

/**
 * Normalises NameIdentifier scheme URIs with a special ORCID normalization.
 *
 * Accepts common ORCID variants such as missing trailing slash or http scheme
 * and rewrites them to `https://orcid.org/`.
 *
 * @param {string} value - Raw scheme URI from import.
 * @param {string} schemeValue - Normalized nameIdentifierScheme value.
 * @param {object[]} schemeOptions - nameIdentifierSchemes vocabulary list.
 * @param {string[]|null} unknownCollector - Array to collect unrecognised values.
 * @param {string} fieldLabel - Label shown in import warnings.
 * @returns {string} Normalized/matched URI, or empty string if unrecognised.
 */
export function normalizeNameIdentifierSchemeURI(
    value,
    schemeValue,
    schemeOptions = [],
    unknownCollector = null,
    fieldLabel = "nameIdentifierSchemeURI",
) {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
        return "";
    }

    const normalizedProtocol = rawValue.replace(/^http:\/\//i, "https://");
    const trimmedTrailingSlashes = normalizedProtocol.replace(/\/+$/, "");

    const isOrcidScheme =
        String(schemeValue || "").toUpperCase() === "ORCID" ||
        /^https:\/\/orcid\.org$/i.test(trimmedTrailingSlashes);

    if (isOrcidScheme) {
        return "https://orcid.org/";
    }

    return normalizeVocabularyValue(
        normalizedProtocol,
        schemeOptions,
        "uri",
        unknownCollector,
        fieldLabel,
    );
}

/**
 * Normalises a raw language value to a valid ISO 639-1 code by comparing
 * against the loaded language list (case-insensitive).
 * Unknown values are recorded in `unknownCollector` for user feedback.
 *
 * @param {string}   value            - The raw language string from the imported file.
 * @param {object[]} languageOptions  - Array of language objects with a `code` property.
 * @param {string[]|null} unknownCollector - Array to collect unrecognised values, or null.
 * @param {string}   fieldLabel       - Label shown in the warning message.
 * @returns {string} The matched ISO 639-1 code, or empty string if unrecognised.
 */
export function normalizeLanguageCode(
    value,
    languageOptions = [],
    unknownCollector = null,
    fieldLabel = "",
) {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
        return "";
    }

    const normalizedValue = rawValue.toLowerCase();
    const match = languageOptions.find(
        (option) =>
            String(option?.code || "").toLowerCase() === normalizedValue,
    );

    if (!match && Array.isArray(unknownCollector) && fieldLabel) {
        const warning = `${fieldLabel}: ${rawValue}`;
        if (!unknownCollector.includes(warning)) {
            unknownCollector.push(warning);
        }
    }

    return match ? match.code || "" : "";
}
