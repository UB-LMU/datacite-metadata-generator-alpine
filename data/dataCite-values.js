/**
 * @file dataCite-values.js
 * @description Controlled-vocabulary lists used throughout the DataCite
 * Metadata Generator. All values correspond to the DataCite Metadata Schema
 * Kernel 4.7 specification.
 *
 * Each exported constant is an array of option objects with at minimum
 * a `value` property (the schema value) and, where applicable, a `label`
 * (display text) and a `uri` (scheme URI).
 *
 * Exported constants:
 *   descriptionTypes, titleTypes, nameTypes, nameIdentifierSchemes,
 *   affiliationIdentifierSchemes, identifierTypes, publisherIdentifierSchema,
 *   resourceTypeGeneralList, subjectSchemes, dateTypes, relatedIdentifierTypes,
 *   relationTypes, contributorTypes
 */

export const descriptionTypes = [
    { value: "Abstract", label: "Abstract" },
    { value: "Methods", label: "Methods" },
    { value: "SeriesInformation", label: "Series Information" },
    { value: "TableOfContents", label: "Table Of Contents" },
    { value: "TechnicalInfo", label: "Technical Info" },
    { value: "Other", label: "Other" },
];

export const titleTypes = [
    { value: "AlternativeTitle", label: "Alternative Title" },
    { value: "Subtitle", label: "Subtitle" },
    { value: "TranslatedTitle", label: "Translated Title" },
    { value: "Other", label: "Other" },
];

export const nameTypes = [
    { value: "Personal", label: "Personal" },
    { value: "Organizational", label: "Organizational" },
];

export const nameIdentifierSchemes = [
    { value: "ORCID", label: "ORCID", uri: "https://orcid.org/" },
    { value: "ROR", label: "ROR", uri: "https://ror.org/" },
    { value: "GND", label: "GND", uri: "http://d-nb.info/gnd/" },
    { value: "GRID", label: "GRID", uri: "" },
    { value: "ISNI", label: "ISNI", uri: "https://isni.org/isni/" },
];

export const affiliationIdentifierSchemes = [
    { value: "ROR", label: "ROR", uri: "https://ror.org/" },
    { value: "GRID", label: "GRID", uri: "" },
    { value: "ISNI", label: "ISNI", uri: "https://isni.org/isni/" },
    {
        value: "Wikidata",
        label: "Wikidata",
        uri: "https://www.wikidata.org/wiki/",
    },
    { value: "CrossrefFunderID", label: "Crossref Funder ID", uri: "" },
    { value: "Other", label: "Other", uri: "" },
];

export const funderIdentifierTypes = [
    { value: "ROR", label: "ROR", uri: "https://ror.org/" },
    { value: "Crossref Funder ID", label: "Crossref Funder ID", uri: "" },
    { value: "GRID", label: "GRID", uri: "" },
    { value: "ISNI", label: "ISNI", uri: "https://isni.org/isni/" },
    { value: "Other", label: "Other", uri: "" },
];

export const identifierTypes = [
    { value: "DOI" },
];

export const publisherIdentifierSchema = [
    { value: "ROR", label: "ROR", uri: "https://ror.org/" }, 
    { value: "re3data", label: "re3data", uri: "https://re3data.org/" },
    { value: "VIAF", label: "VIAF", uri: "https://viaf.org/" },
    {
        value: "Wikidata",
        label: "Wikidata",
        uri: "https://www.wikidata.org/wiki/",
    },
    { value: "CrossrefFunderID", label: "Crossref Funder ID", uri: "https://data.crossref.org/fundingdata/funder/" },
    { value: "ISNI", label: "ISNI", uri: "https://isni.org/isni/" },
    { value: "OpenDOAR", label: "OpenDOAR", uri: "https://opendoar.ac.uk/repository/" },
    { value: "FAIRsharing", label: "FAIRsharing", uri: "https://fairsharing.org/" },
    { value: "ISSN", label: "ISSN", uri: "" },
    { value: "Other", label: "Other", uri: "" },
];
export const resourceTypeGeneralList = [
    { value: "Audiovisual", label: "Audiovisual" },
    { value: "Award", label: "Award" },
    { value: "Book", label: "Book" },
    { value: "BookChapter", label: "Book Chapter" },
    { value: "Collection", label: "Collection" },
    { value: "ComputationalNotebook", label: "Computational Notebook" },
    { value: "ConferencePaper", label: "Conference Paper" },
    { value: "ConferenceProceeding", label: "Conference Proceeding" },
    { value: "DataPaper", label: "Data Paper" },
    { value: "Dataset", label: "Dataset" },
    { value: "Dissertation", label: "Dissertation" },
    { value: "Event", label: "Event" },
    { value: "Image", label: "Image" },
    { value: "InteractiveResource", label: "Interactive Resource" },
    { value: "Instrument", label: "Instrument" },
    { value: "Journal", label: "Journal" },
    { value: "JournalArticle", label: "Journal Article" },
    { value: "Model", label: "Model" },
    { value: "OutputManagementPlan", label: "Output Management Plan" },
    { value: "PeerReview", label: "Peer Review" },
    { value: "PhysicalObject", label: "Physical Object" },
    { value: "Poster", label: "Poster" },
    { value: "Preprint", label: "Preprint" },
    { value: "Presentation", label: "Presentation" },
    { value: "Project", label: "Project" },
    { value: "Report", label: "Report" },
    { value: "Service", label: "Service" },
    { value: "Software", label: "Software" },
    { value: "Sound", label: "Sound" },
    { value: "Standard", label: "Standards" },
    { value: "StudyRegistration", label: "Study Registration" },
    { value: "Text", label: "Text" },
    { value: "Workflow", label: "Workflow" },
    { value: "Other", label: "Other" },
];

export const subjectSchemes = [
    {
        value: "DDC",
        label: "Dewey Decimal Classification (DDC)",
        uri: "",
    },
    {
        value: "GND",
        label: "Gemeinsame Normdatei (GND)",
        uri: "http://d-nb.info/gnd/",
    },
    {
        value: "Wikidata",
        label: "Wikidata",
        uri: "https://www.wikidata.org/wiki/",
    },
    {
        value: "LCSH",
        label: "Library of Congress Subject Headings (LCSH)",
        uri: "https://id.loc.gov/authorities/subjects/",
    },
    {
        value: "MESH",
        label: "Medical Subject Headings (MeSH)",
        uri: "https://id.nlm.nih.gov/mesh/",
    },
];

export const dateTypes = [
    { value: "Accepted" },
    { value: "Available" },
    { value: "Copyrighted" },
    { value: "Collected" },
    { value: "Coverage" },
    { value: "Created" },
    { value: "Issued" },
    { value: "Submitted" },
    { value: "Updated" },
    { value: "Valid" },
    { value: "Withdrawn" },
    { value: "Other" },
];

export const relatedIdentifierTypes = [
    { value: "ARK" },
    { value: "arXiv" },
    { value: "bibcode" },
    { value: "CSTR" },
    { value: "DOI" },
    { value: "EAN13" },
    { value: "EISSN" },
    { value: "Handle" },
    { value: "IGSN" },
    { value: "ISBN" },
    { value: "ISSN" },
    { value: "ISTC" },
    { value: "LISSN" },
    { value: "LSID" },
    { value: "PMID" },
    { value: "PURL" },
    { value: "RAiD" },
    { value: "RRID" },
    { value: "SWHID" },
    { value: "UPC" },
    { value: "URL" },
    { value: "URN" },
    { value: "w3id" },
];

export const relationTypes = [
    { value: "IsCitedBy", label: "Is Cited By" },
    { value: "Cites", label: "Cites" },
    { value: "IsSupplementTo", label: "Is Supplement To" },
    { value: "IsSupplementedBy", label: "Is Supplemented By" },
    { value: "IsContinuedBy", label: "Is Continued By" },
    { value: "Continues", label: "Continues" },
    { value: "IsDescribedBy", label: "Is Described By" },
    { value: "Describes", label: "Describes" },
    { value: "HasMetadata", label: "Has Metadata" },
    { value: "IsMetadataFor", label: "Is Metadata For" },
    { value: "HasVersion", label: "Has Version" },
    { value: "IsVersionOf", label: "Is Version Of" },
    { value: "IsNewVersionOf", label: "Is New Version Of" },
    { value: "IsPreviousVersionOf", label: "Is Previous Version Of" },
    { value: "IsPartOf", label: "Is Part Of" },
    { value: "HasPart", label: "Has Part" },
    { value: "IsPublishedIn", label: "Is Published In" },
    { value: "IsReferencedBy", label: "Is Referenced By" },
    { value: "References", label: "References" },
    { value: "IsDocumentedBy", label: "Is Documented By" },
    { value: "Documents", label: "Documents" },
    { value: "IsCompiledBy", label: "Is Compiled By" },
    { value: "Compiles", label: "Compiles" },
    { value: "IsVariantFormOf", label: "Is Variant Form Of" },
    { value: "IsOriginalFormOf", label: "Is Original Form Of" },
    { value: "IsIdenticalTo", label: "Is Identical To" },
    { value: "IsReviewedBy", label: "Is Reviewed By" },
    { value: "Reviews", label: "Reviews" },
    { value: "IsDerivedFrom", label: "Is Derived From" },
    { value: "IsSourceOf", label: "Is Source Of" },
    { value: "IsRequiredBy", label: "Is Required By" },
    { value: "Requires", label: "Requires" },
    { value: "IsObsoletedBy", label: "Is Obsoleted By" },
    { value: "Obsoletes", label: "Obsoletes" },
    { value: "IsCollectedBy", label: "Is Collected By" },
    { value: "Collects", label: "Collects" },
    { value: "IsTranslationOf", label: "Is Translation Of" },
    { value: "HasTranslation", label: "Has Translation" },
    { value: "Other", label: "Other" },
];

export const contributorTypes = [
    { value: "ContactPerson", label: "Contact Person" },
    { value: "DataCollector", label: "Data Collector" },
    { value: "DataCurator", label: "Data Curator" },
    { value: "DataManager", label: "Data Manager" },
    { value: "Distributor", label: "Distributor" },
    { value: "Editor", label: "Editor" },
    { value: "HostingInstitution", label: "Hosting Institution" },
    { value: "Producer", label: "Producer" },
    { value: "ProjectLeader", label: "Project Leader" },
    { value: "ProjectManager", label: "Project Manager" },
    { value: "ProjectMember", label: "Project Member" },
    { value: "RegistrationAgency", label: "Registration Agency" },
    { value: "RegistrationAuthority", label: "Registration Authority" },
    { value: "RelatedPerson", label: "Related Person" },
    { value: "Researcher", label: "Researcher" },
    { value: "ResearchGroup", label: "Research Group" },
    { value: "RightsHolder", label: "Rights Holder" },
    { value: "Sponsor", label: "Sponsor" },
    { value: "Supervisor", label: "Supervisor" },
    { value: "Translator", label: "Translator" },
    { value: "WorkPackageLeader", label: "Work Package Leader" },
    { value: "Other", label: "Other" },
];

export const numberTypes = [
    { value: "Article", label: "Article" },
    { value: "Chapter", label: "Chapter" },
    { value: "Report", label: "Report" },
    { value: "Other", label: "Other" },
];
