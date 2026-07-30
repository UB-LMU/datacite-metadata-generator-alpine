/**
 * @file generators.js
 * @description Generates DataCite-compliant XML and JSON output from the
 * current Alpine.js application state. Both formats follow the
 * DataCite Metadata Schema Kernel 4.6.
 *
 * Exported functions:
 *   - {@link generateXML}  – produces a formatted XML string
 *   - {@link generateJSON} – produces a pretty-printed JSON string
 *   - {@link generateYAML}  – produces a formatted YAML string
 */

import { stringify as yamlStringify } from "yaml";

/**
 * Escapes special XML characters in a string to prevent malformed output
 * or accidental markup injection.
 *
 * @param {string} str - The raw string value to escape.
 * @returns {string} The XML-safe string.
 */
function escapeXml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Generates a DataCite Kernel 4.6 XML string from the current app state.
 *
 * Only fields that contain a non-empty value are included in the output.
 * Attributes are serialised with {@link escapeXml} to ensure valid XML.
 *
 * @param {object} state - The Alpine.js data object (passed as `this` context).
 * @returns {string} A formatted, multi-line XML string.
 */
export function generateXML(state) {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push("<resource xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns='http://datacite.org/schema/kernel-4' xsi:schemaLocation='http://datacite.org/schema/kernel-4 https://schema.datacite.org/meta/kernel-4/metadata.xsd'>");

    const push = (space, tag, val) =>
        lines.push(`${space}<${tag}>${escapeXml(val)}</${tag}>`);
    const push_attr = (space, tag, val, attrs = {}) => {
        const attrString = Object.entries(attrs)
            .filter(([_, v]) => v !== "" && v !== undefined && v !== null)
            .map(([key, value]) => `${key}="${escapeXml(value)}"`)
            .join(" ");
        lines.push(
            `${space}<${tag}${attrString ? " " + attrString : ""}>${escapeXml(
                val,
            )}</${tag}>`,
        );
    };

    // Identifier
    if (state.identifier && state.identifierType) {
        push_attr("  ", "identifier", state.identifier, {
            identifierType: state.identifierType,
        });
    }

    // Creators
    const creators = (state.creatorBlocks || []).filter(c => c?.creatorName !== "" || (c?.familyName !== "" && c?.givenName !== ""));
    if (creators.length) {
      lines.push("  <creators>");
      creators.forEach((c) => {
        lines.push("    <creator>");
        if (c.creatorName != "") {
          push_attr("      ", "creatorName", c.creatorName, {
            nameType: c.nameType,
            "xml:lang": c.creatorNameLanguage,
          });
        } else {
          push_attr(
            "      ",
            "creatorName",
            `${c.familyName.trim()}, ${c.givenName.trim()}`,
            {
              nameType: c.nameType,
              "xml:lang": c.creatorNameLanguage,
            },
          );
        }
        if (c.familyName != "" && c.givenName != "") {
          push("      ", "givenName", c.givenName.trim());
          push("      ", "familyName", c.familyName.trim());
        }
        const nameIds = (c.nameIdentifiers || []).filter(
          (id) => id?.nameIdentifierScheme !== "",
        );
        nameIds.forEach((id) => {
          push_attr("      ", "nameIdentifier", id.nameIdentifier, {
            schemeURI: id.nameIdentifierSchemeURI,
            nameIdentifierScheme: id.nameIdentifierScheme,
          });
        });
        const affiliations = (c.affiliations || []).filter(
          (a) => a?.creatorAffiliation !== "",
        );
        affiliations.forEach((id) => {
          push_attr("      ", "affiliation", id.creatorAffiliation, {
            affiliationIdentifier: id.affiliationIdentifier,
            affiliationIdentifierScheme: id.affiliationIdentifierScheme,
            schemeURI: id.affiliationIdentifierSchemeURI,
          });
        });
        lines.push("    </creator>");
      });
      lines.push("  </creators>");
    }

    // Titles
    const titles = (state.titleBlocks || []).filter(t => t?.title !== "");
    if (titles.length) {
        lines.push("  <titles>");
        titles.forEach((t) => {
            push_attr("    ", "title", t.title, {
                "xml:lang": t.titleLanguage || "",
                titleType: t.titleType || "",
            });
        });
        lines.push("  </titles>");
    }

    // Publisher
    if (state.publisher) {
        const publisherAttrs = {
            "xml:lang": state.publisherLanguage || "",
        };
        if (state.publisherIdentifier && state.publisherIdentifierScheme) {
            publisherAttrs.publisherIdentifier = state.publisherIdentifier;
            publisherAttrs.publisherIdentifierScheme =
                state.publisherIdentifierScheme;
            publisherAttrs.schemeURI = state.publisherIdentifierSchemeURI || "";
        }
        push_attr("  ", "publisher", state.publisher, publisherAttrs);
    }

    // Publication year
    if (state.publicationYear && !state.isPublicationYearInvalid) {
        push("  ", "publicationYear", state.publicationYear);
    }

    // Resource Type
    if (state.resourceType && state.resourceTypeGeneral) {
        push_attr("  ", "resourceType", state.resourceType, {
            resourceTypeGeneral: state.resourceTypeGeneral,
        });
    }

    // Subjects (from subjectBlocks)
    const subjects = (state.subjectBlocks || []).filter(s => s?.subject !== "");

    if (subjects.length) {
        lines.push("  <subjects>");
        subjects.forEach((s) => {
            if (s.subject) {
                push_attr("    ", "subject", s.subject, {
                    "xml:lang": s.subjectLanguage || "",
                    subjectScheme: s.subjectScheme || "",
                    schemeURI: s.subjectSchemeURI || "",
                    valueURI: s.valueURI || "",
                    classificationCode: s.classificationCode || "",
                });
            }
        });
        lines.push("  </subjects>");
    }

    // Contributors
    const contributors = (state.contributorBlocks || []).filter(c => c?.contributorName !== "" || (c?.familyName !== "" && c?.givenName !== ""));
    if (contributors.length) {
        lines.push("  <contributors>");
        contributors.forEach((c) => {
          lines.push(
            `    <contributor ${c.contributorType ? `contributorType="${escapeXml(c.contributorType)}"` : ""}>`,
          );
          push_attr("      ", "contributorName", c.contributorName, {
            nameType: c.nameType,
            "xml:lang": c.contributorNameLanguage,
          });
          if (c.familyName != "" && c.givenName != "") {
            push("      ", "givenName", c.givenName.trim());
            push("      ", "familyName", c.familyName.trim());
          }

          const nameIds = (c.nameIdentifiers || []).filter(
            (id) => id?.nameIdentifierScheme !== "",
          );
          nameIds.forEach((id) => {
            push_attr("      ", "nameIdentifier", id.nameIdentifier, {
              schemeURI: id.nameIdentifierSchemeURI,
              nameIdentifierScheme: id.nameIdentifierScheme,
            });
          });

          const affiliations = (c.affiliations || []).filter(
            (a) => a?.contributorAffiliation !== "",
          );
          affiliations.forEach((id) => {
            push_attr("      ", "affiliation", id.contributorAffiliation, {
              affiliationIdentifier: id.affiliationIdentifier,
              affiliationIdentifierScheme: id.affiliationIdentifierScheme,
              schemeURI: id.affiliationIdentifierSchemeURI,
            });
          });

          lines.push(`    </contributor>`);
        });
        lines.push("  </contributors>");
    }

    // Dates
    const dates = (state.dateBlocks || []).filter(d => d?.date !== "");
    if (dates.length) {
        lines.push("  <dates>");
        dates.forEach((d) => {
            if (d.date) {
                push_attr("    ", "date", d.date, {
                    dateType: d.dateType || "",
                    dateInformation: d.dateInformation || "",
                });
            }
        });
        lines.push("  </dates>");
    }

    // Language
    if (state.language) {
        push("  ", "language", state.language);
    }

    // Alternate Identifiers
    const altIds = (state.altIdentifierBlocks || []).filter(
        a => a?.alternateIdentifier !== ""
    );
    if (altIds.length) {
        lines.push("  <alternateIdentifiers>");
        altIds.forEach((aid) => {
            push_attr("    ", "alternateIdentifier", aid.alternateIdentifier, {
                alternateIdentifierType: aid.alternateIdentifierType || "",
            });
        });
        lines.push("  </alternateIdentifiers>");
    }

    // Related Identifiers
    const relatedIdentifiers = (state.relatedIdentifierBlocks || []).filter(
        ri => ri?.relatedIdentifier !== ""
    );
    if (relatedIdentifiers.length) {
      lines.push("  <relatedIdentifiers>");
      relatedIdentifiers.forEach((ri) => {
        if (
          ri.relationType === "HasMetadata" ||
          ri.relationType === "IsMetadataFor"
        ) {
          push_attr("    ", "relatedIdentifier", ri.relatedIdentifier, {
            relatedIdentifierType: ri.relatedIdentifierType || "",
            relationType: ri.relationType || "",
            relatedMetadataScheme: ri.relatedMetadataScheme || "",
            schemeURI: ri.relatedMetadataSchemeURI || "",
            schemeType: ri.relatedMetadataSchemeType || "",
            resourceTypeGeneral: ri.resourceTypeGeneral || "",
          });
        } else {
          push_attr("    ", "relatedIdentifier", ri.relatedIdentifier, {
            relatedIdentifierType: ri.relatedIdentifierType || "",
            relationType: ri.relationType || "",
            resourceTypeGeneral: ri.resourceTypeGeneral || "",
          });
        }
      });
      lines.push("  </relatedIdentifiers>");
    }

    // Size
    const sizes = (state.sizeBlocks || []).filter(s => s?.size !== "");
    if (sizes.length) {
        lines.push("  <sizes>");
        sizes.forEach((s) => {
            push("    ", "size", s.size);
        });
        lines.push("  </sizes>");
    }

    // Format
    const formats = (state.formatBlocks || []).filter(f => f?.format !== "");
    if (formats.length) {
        lines.push("  <formats>");
        formats.forEach((f) => {
            push("    ", "format", f.format);
        });
        lines.push("  </formats>");
    }

    // Version
    if (state.version) {
        push("  ", "version", state.version);
    }

    // Rights
    const rights = (state.rightsBlocks || []).filter(r => r?.right !== "");
    if (rights.length) {
        lines.push("  <rightsList>");
        rights.forEach((r) => {
            push_attr("    ", "rights", r.right, {
                "xml:lang": r.rightsLanguage || "",
                schemeURI: r.rightsIdentifierSchemeURI || "",
                rightsIdentifierScheme: r.rightsIdentifierScheme || "",
                rightsIdentifier: r.rightsIdentifier || "",
                rightsURI: r.rightsURI || "",
            });
        });
        lines.push("  </rightsList>");
    }

    // Descriptions
    const descriptions = (state.descriptionBlocks || []).filter(
        d => d?.description !== ""
    );
    if (descriptions.length) {
        lines.push("  <descriptions>");
        descriptions.forEach((d) => {
            push_attr("    ", "description", d.description, {
                "xml:lang": d.descriptionLanguage || "",
                descriptionType: d.descriptionType || "",
            });
        });
        lines.push("  </descriptions>");
    }

    // Geo Location
    const geoLocations = state.geoLocationBlocks || [];

    const validGeoLocations = geoLocations.filter(
        (g) =>
            g.geoLocationPlace ||
            (g.geoLocationPointLat && g.geoLocationPointLong) ||
            (g.geoLocationBoxEast &&
                g.geoLocationBoxNorth &&
                g.geoLocationBoxSouth &&
                g.geoLocationBoxWest) ||
            g.geoLocationPolygon.some(
                (p) =>
                    p.polygonPoints.some(
                        (pp) => pp.polygonPointLat || pp.polygonPointLong,
                    ) ||
                    p.inPolygonPointLat ||
                    p.inPolygonPointLong,
            ),
    );

    if (validGeoLocations.length) {
        lines.push("  <geoLocations>");

        validGeoLocations.forEach((g) => {
            const hasContent =
                g.geoLocationPlace ||
                (g.geoLocationPointLat && g.geoLocationPointLong) ||
                (g.geoLocationBoxEast &&
                    g.geoLocationBoxNorth &&
                    g.geoLocationBoxSouth &&
                    g.geoLocationBoxWest) ||
                g.geoLocationPolygon.some(
                    (p) =>
                        p.polygonPoints.some(
                            (pp) => pp.polygonPointLat || pp.polygonPointLong,
                        ) ||
                        p.inPolygonPointLat ||
                        p.inPolygonPointLong,
                );

            if (!hasContent) return;

            lines.push(`    <geoLocation>`);

            if (g.geoLocationPlace != "") {
                push("      ", "geoLocationPlace", g.geoLocationPlace);
            }

            if (g.geoLocationPointLat != "" && g.geoLocationPointLong != "") {
                lines.push(`      <geoLocationPoint>`);
                push("        ", "pointLatitude", g.geoLocationPointLat);
                push("        ", "pointLongitude", g.geoLocationPointLong);
                lines.push(`      </geoLocationPoint>`);
            }

            if (
                g.geoLocationBoxEast != "" &&
                g.geoLocationBoxNorth != "" &&
                g.geoLocationBoxSouth != "" &&
                g.geoLocationBoxWest != ""
            ) {
                lines.push(`      <geoLocationBox>`);
                push("        ", "westBoundLongitude", g.geoLocationBoxWest);
                push("        ", "eastBoundLongitude", g.geoLocationBoxEast);
                push("        ", "southBoundLatitude", g.geoLocationBoxSouth);
                push("        ", "northBoundLatitude", g.geoLocationBoxNorth);
                lines.push(`      </geoLocationBox>`);
            }

            if (g.geoLocationPolygon.length) {
                g.geoLocationPolygon.forEach((p) => {
                    if (
                        p.polygonPoints.some(
                            (pp) => pp.polygonPointLat || pp.polygonPointLong,
                        ) ||
                        p.inPolygonPointLat ||
                        p.inPolygonPointLong
                    ) {
                        lines.push(`      <geoLocationPolygon>`);

                        p.polygonPoints.forEach((pp) => {
                            if (pp.polygonPointLat && pp.polygonPointLong) {
                                lines.push(`        <polygonPoint>`);
                                push(
                                    "          ",
                                    "pointLatitude",
                                    pp.polygonPointLat,
                                );
                                push(
                                    "          ",
                                    "pointLongitude",
                                    pp.polygonPointLong,
                                );
                                lines.push(`        </polygonPoint>`);
                            }
                        });

                        if (
                            p.inPolygonPointLat != "" &&
                            p.inPolygonPointLong != ""
                        ) {
                            lines.push(`        <inPolygonPoint>`);
                            push(
                                "          ",
                                "pointLatitude",
                                p.inPolygonPointLat,
                            );
                            push(
                                "          ",
                                "pointLongitude",
                                p.inPolygonPointLong,
                            );
                            lines.push(`        </inPolygonPoint>`);
                        }
                        lines.push(`      </geoLocationPolygon>`);
                    }
                });
            }
            lines.push(`    </geoLocation>`);
        });
        lines.push("  </geoLocations>");
    }

    // Funding Reference
    const funding = (state.fundingReferenceBlocks || []).filter(
        f => f?.funderName !== ""
    );
    if (funding.length) {
        lines.push("  <fundingReferences>");
        funding.forEach((f) => {
            lines.push("    <fundingReference>");
            push("      ", "funderName", f.funderName);
            push_attr("      ", "funderIdentifier", f.funderIdentifier, {
                funderIdentifierType: f.funderIdentifierType || "",
                schemeURI: f.funderIdentifierTypeURI || "",
            });
            if (f.awardNumber) {
                push_attr("      ", "awardNumber", f.awardNumber, {
                    awardURI: f.awardUri || "",
                });
            }
            if (f.awardTitle) {
                push("      ", "awardTitle", f.awardTitle);
            }
            lines.push("    </fundingReference>");
        });
        lines.push("  </fundingReferences>");
    }

    // Related Item
    const relatedItems = (state.relatedItemsBlock || []).filter(
        r => r?.relatedItemType || r?.relationType
    );
    if (relatedItems.length)
    {
        lines.push("  <relatedItems>");
        relatedItems.forEach((r) => {
            if (r.relatedItemType && r.relationType) {
                lines.push(
                    `    <relatedItem ${r.relatedItemType ? `relatedItemType="${escapeXml(r.relatedItemType)}"` : ""} ${r.relationType ? `relationType="${escapeXml(r.relationType)}"` : ""}>`,
                );
            } else {
                lines.push("    <relatedItem>");
            }
            if (r.relatedItemIdentifier) {
                push_attr(
                    "      ",
                    "relatedItemIdentifier",
                    r.relatedItemIdentifier,
                    {
                        relatedItemIdentifierType:
                            r.relatedItemIdentifierType || "",
                        relatedMetadataScheme: r.relatedMetadataScheme || "",
                        schemeURI: r.relatedIdentifierSchemeURI || "",
                        schemeType: r.relatedIdentifierSchemeType || "",
                    },
                );
            }
            if (r.creators.length && r.creators[0]?.creatorName) {
                lines.push("      <creators>");
                r.creators.forEach((rc) => {
                    lines.push("        <creator>");
                    push_attr("          ", "creatorName", rc.creatorName, {
                        nameType: rc.nameType,
                        "xml:lang": rc.creatorNameLanguage,
                    });
                    if (rc.givenName || rc.familyName) {
                        push("          ", "givenName", rc.givenName.trim());
                        push("          ", "familyName", rc.familyName.trim());
                    }
                    lines.push("        </creator>");
                });
                lines.push("      </creators>");
            }
            if (r.titles.length && r.titles[0]?.title) {
                lines.push("      <titles>");
                r.titles.forEach((rt) => {
                    if (rt.titleType || rt.titleLanguage) {
                        push_attr("          ", "title", rt.title, {
                            titleType: rt.titleType,
                            "xml:lang": rt.titleLanguage,
                        });
                    } else {
                        push("          ", "title", rt.title);
                    }
                });
                lines.push("      </titles>");
            }
            if (r.publicationYear)
                push("      ", "publicationYear", r.publicationYear);
            if (r.volume) push("      ", "volume", r.volume);
            if (r.issue) push("      ", "issue", r.issue);
            if (r.number && r.numberType) {
                push_attr("      ", "number", r.number, {
                    numberType: r.numberType,
                });
            } else if (r.number) {
                push("      ", "number", r.number);
            }
            if (r.firstPage) push("      ", "firstPage", r.firstPage);
            if (r.lastPage) push("      ", "lastPage", r.lastPage);
            if (r.publisher) push("      ", "publisher", r.publisher);
            if (r.edition) push("      ", "edition", r.edition);
            if (r.contributors.length && r.contributors[0]?.contributorName) {
                lines.push("      <contributors>");
                r.contributors.forEach((rco) => {
                    lines.push(
                        `        <contributor ${rco.contributorType ? `contributorType="${escapeXml(rco.contributorType)}"` : ""}>`,
                    );
                    if (rco.nameType) {
                        push_attr(
                            "          ",
                            "contributorName",
                            rco.contributorName,
                            {
                                nameType: rco.nameType,
                                "xml:lang": rco.contributorNameLanguage,
                            },
                        );
                    } else {
                        if (rco.contributorNameLanguage) {
                            push_attr(
                                "          ",
                                "contributorName",
                                rco.contributorName,
                                { "xml:lang": rco.contributorNameLanguage },
                            );
                        } else {
                            push(
                                "          ",
                                "contributorName",
                                rco.contributorName,
                            );
                        }
                    }
                    if (rco.givenName)
                        push("          ", "givenName", rco.givenName.trim());
                    if (rco.familyName)
                        push("          ", "familyName", rco.familyName.trim());
                    lines.push("        </contributor>");
                });
                lines.push("      </contributors>");
            }
            lines.push("    </relatedItem>");
        });
        lines.push("  </relatedItems>");
    }

    lines.push("</resource>");
    return lines.join("\n");
}

/**
 * Recursively removes all empty strings, null, and undefined values from
 * an object or array. Used to produce clean JSON output without empty fields.
 *
 * @param {*} obj - The value to clean (object, array, or primitive).
 * @returns {*} The cleaned value with all empty entries removed.
 */
function removeEmpty(obj) {
    if (Array.isArray(obj)) {
        return obj
            .map(removeEmpty)
            .filter(
                (v) =>
                    v !== "" &&
                    v !== null &&
                    v !== undefined &&
                    !(typeof v === "object" && Object.keys(v).length === 0),
            );
    }

    if (typeof obj === "object" && obj !== null) {
        return Object.fromEntries(
            Object.entries(obj)
                .map(([k, v]) => [k, removeEmpty(v)])
                .filter(
                    ([_, v]) =>
                        v !== "" &&
                        v !== null &&
                        v !== undefined &&
                        !(typeof v === "object" && Object.keys(v).length === 0),
                ),
        );
    }

    return obj;
}

/**
 * Generates a DataCite Kernel 4.6 JSON string from the current app state.
 *
 * The output follows the DataCite REST API JSON structure
 * (`data.attributes.*`). Empty fields are stripped via {@link removeEmpty}
 * before serialisation.
 *
 * @param {object} state - The Alpine.js data object (passed as `this` context).
 * @returns {string} A pretty-printed (2-space indent) JSON string.
 */
export function generateJSON(state) {
    const data = {
        data: {
            id: state.identifier || "",
            type: state.identifier ? "dois" : "",
            attributes: {
                doi: state.identifier || "",
                alternateIdentifiers: (state.altIdentifierBlocks || []).map(
                    (aid) => ({
                        alternateIdentifierType:
                            aid.alternateIdentifierType || "",
                        alternateIdentifier: aid.alternateIdentifier || "",
                    }),
                ),
                creators: (state.creatorBlocks || []).map((c) => ({
                    name: c.creatorName || "",
                    lang: c.creatorNameLanguage || "",
                    nameType: c.nameType || "",
                    givenName: c.givenName || "",
                    familyName: c.familyName || "",
                    affiliation: (c.affiliations || []).map((id) => ({
                        affiliationIdentifier: id.affiliationIdentifier || "",
                        affiliationIdentifierScheme:
                            id.affiliationIdentifierScheme || "",
                        name: id.creatorAffiliation || "",
                        schemeUri: id.affiliationIdentifierSchemeURI || "",
                    })),
                    nameIdentifiers: (c.nameIdentifiers || []).map((id) => ({
                        schemeUri: id.nameIdentifierSchemeURI || "",
                        nameIdentifier: id.nameIdentifier || "",
                        nameIdentifierScheme: id.nameIdentifierScheme || "",
                    })),
                })),
                titles: (state.titleBlocks || []).map((t) => ({
                    lang: t.titleLanguage || "",
                    title: t.title || "",
                    titleType: t.titleType || "",
                })),
                publisher: {
                    name: state.publisher || "",
                    publisherIdentifier: state.publisherIdentifier || "",
                    publisherIdentifierScheme:
                        state.publisherIdentifierScheme || "",
                    schemeUri: state.publisherIdentifierSchemeURI || "",
                    lang: state.publisherLanguage || "",
                },
                publicationYear: state.publicationYear || "",
                subjects: (state.subjectBlocks || []).map((s) => ({
                    subject: s.subject || "",
                    schemeUri: s.subjectSchemeURI || "",
                    valueUri: s.valueURI || "",
                    subjectScheme: s.subjectScheme || "",
                    classificationCode: s.classificationCode || "",
                    lang: s.subjectLanguage || "",
                })),
                contributors: (state.contributorBlocks || []).map((c) => ({
                    name: c.contributorName || "",
                    lang: c.contributorNameLanguage || "",
                    nameType: c.nameType || "",
                    givenName: c.givenName || "",
                    familyName: c.familyName || "",
                    affiliation: (c.affiliations || []).map((a) => ({
                        affiliationIdentifier: a.affiliationIdentifier || "",
                        affiliationIdentifierScheme:
                            a.affiliationIdentifierScheme || "",
                        name: a.contributorAffiliation || "",
                        schemeUri: a.affiliationIdentifierSchemeURI || "",
                    })),
                    contributorType: c.contributorType || "",
                    nameIdentifiers: (c.nameIdentifiers || []).map((ni) => ({
                        schemeUri: ni.nameIdentifierSchemeURI || "",
                        nameIdentifier: ni.nameIdentifier || "",
                        nameIdentifierScheme: ni.nameIdentifierScheme || "",
                    })),
                })),
                dates: (state.dateBlocks || []).map((d) => ({
                    date: d.date || "",
                    dateType: d.dateType || "",
                    dateInformation: d.dateInformation || "",
                })),
                language: state.language || "",
                types: {
                    resourceType: state.resourceType || "",
                    resourceTypeGeneral: state.resourceTypeGeneral || "",
                },
                relatedIdentifiers: (state.relatedIdentifierBlocks || []).map(
                    (ri) => ({
                        relationType: ri.relationType || "",
                        relatedIdentifier: ri.relatedIdentifier || "",
                        resourceTypeGeneral: ri.resourceTypeGeneral || "",
                        relatedIdentifierType: ri.relatedIdentifierType || "",
                        schemeUri: ri.relatedMetadataSchemeURI || "",
                        schemeType: ri.relatedMetadataSchemeType || "",
                        relatedMetadataScheme: ri.relatedMetadataScheme || "",
                    }),
                ),
                relatedItems: (state.relatedItemsBlock || []).map((ri) => ({
                    issue: ri.issue || "",
                    number: ri.number || "",
                    titles: (ri.titles || "").map((rit) => ({
                        title: rit.title || "",
                        titleType: rit.titleType || "",
                        lang: rit.titleLanguage || "",
                    })),
                    volume: ri.volume || "",
                    edition: ri.edition || "",
                    creators: (ri.creators || []).map((ric) => ({
                        name: ric.creatorName || "",
                        lang: ric.creatorNameLanguage || "",
                        nameType: ric.nameType || "",
                        givenName: ric.givenName || "",
                        familyName: ric.familyName || "",
                    })),
                    lastPage: ri.lastPage || "",
                    firstPage: ri.firstPage || "",
                    publisher: ri.publisher || "",
                    numberType: ri.numberType || "",
                    contributors: (ri.contributors || []).map((rico) => ({
                        name: rico.contributorName || "",
                        lang: rico.contributorNameLanguage || "",
                        nameType: rico.nameType || "",
                        givenName: rico.givenName || "",
                        familyName: rico.familyName || "",
                        contributorType: rico.contributorType || "",
                    })),
                    relationType: ri.relationType || "",
                    publicationYear: ri.publicationYear || "",
                    relatedItemType: ri.relatedItemType || "",
                    relatedItemIdentifier: {
                        relatedItemIdentifier: ri.relatedItemIdentifier || "",
                        relatedItemIdentifierType:
                            ri.relatedItemIdentifierType || "",
                    },
                    relatedMetadataScheme: ri.relatedMetadataScheme || "",
                    schemeUri: ri.relatedIdentifierSchemeURI || "",
                    schemeType: ri.relatedIdentifierSchemeType || "",
                })),
                sizes: (state.sizeBlocks || [])
                    .map((s) => s?.size)
                    .filter(Boolean),
                formats: (state.formatBlocks || [])
                    .map((f) => f?.format)
                    .filter(Boolean),
                version: state.version || "",
                rightsList: (state.rightsBlocks || []).map((li) => ({
                    rights: li.right || "",
                    lang: li.rightsLanguage || "",
                    rightsUri: li.rightsURI || "",
                    schemeUri: li.rightsIdentifierSchemeURI || "",
                    rightsIdentifier: li.rightsIdentifier || "",
                    rightsIdentifierScheme: li.rightsIdentifierScheme || "",
                })),
                descriptions: (state.descriptionBlocks || []).map((d) => ({
                    description: d.description || "",
                    lang: d.descriptionLanguage || "",
                    descriptionType: d.descriptionType || "",
                })),
                geoLocations: (state.geoLocationBlocks || []).map((p) => ({
                    geoLocationPlace: p.geoLocationPlace || "",
                    geoLocationPoint: {
                        pointLatitude:
                            p.geoLocationPointLat !== "" &&
                            p.geoLocationPointLat !== null
                                ? parseFloat(p.geoLocationPointLat)
                                : "",
                        pointLongitude:
                            p.geoLocationPointLong !== "" &&
                            p.geoLocationPointLong !== null
                                ? parseFloat(p.geoLocationPointLong)
                                : "",
                    },
                    geoLocationBox: {
                        eastBoundLongitude: p.geoLocationBoxEast || "",
                        northBoundLatitude: p.geoLocationBoxNorth || "",
                        southBoundLatitude: p.geoLocationBoxSouth || "",
                        westBoundLongitude: p.geoLocationBoxWest || "",
                    },
                    geoLocationPolygon: (p.geoLocationPolygon || []).flatMap(
                        (po) => [
                            ...(po.polygonPoints || []).map((poly) => ({
                                polygonPoint: {
                                    pointLatitude:
                                        poly.polygonPointLat !== "" &&
                                        poly.polygonPointLat !== null
                                            ? parseFloat(poly.polygonPointLat)
                                            : "",
                                    pointLongitude:
                                        poly.polygonPointLong !== "" &&
                                        poly.polygonPointLong !== null
                                            ? parseFloat(poly.polygonPointLong)
                                            : "",
                                },
                            })),
                            {
                                inPolygonPoint: {
                                    pointLatitude: po.inPolygonPointLat || "",
                                    pointLongitude: po.inPolygonPointLong || "",
                                },
                            },
                        ],
                    ),
                })),
                fundingReferences: (state.fundingReferenceBlocks || []).map(
                    (f) => ({
                        awardUri: f.awardUri || "",
                        awardTitle: f.awardTitle || "",
                        funderName: f.funderName || "",
                        awardNumber: f.awardNumber || "",
                        funderIdentifier: f.funderIdentifier || "",
                        funderIdentifierType: f.funderIdentifierType || "",
                        schemeURI: f.funderIdentifierTypeURI || "",
                    }),
                ),
            },
        },
    };

    return JSON.stringify(removeEmpty(data), null, 2);
}

/**
 * Generates a DataCite Kernel 4.6 YAML string from the current app state.
 * Internally uses the same data structure as {@link generateJSON} but
 * serialises it as YAML for human-friendly output.
 *
 * @param {object} state - The Alpine.js data object (passed as `this` context).
 * @returns {string} A formatted YAML string.
 */
export function generateYAML(state) {
    // Keep YAML fully in sync with JSON by reusing the exact JSON payload.
    const jsonPayload = JSON.parse(generateJSON(state));
    return yamlStringify(jsonPayload, { indent: 2 });
}
