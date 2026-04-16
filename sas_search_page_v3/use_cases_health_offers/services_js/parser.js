/**
 * parser.js
 * Single responsibility: map resolved FHIR resources to a normalized
 * display object. No fetching, no DOM, no side effects.
 */

/**
 * Extract the display name from a Practitioner resource.
 * Falls back gracefully if prefix, given or family are missing.
 *
 * @param {Object} practitioner - FHIR Practitioner resource
 * @returns {{ title: string|null, firstname: string|null, name: string|null }}
 */
function extractName(practitioner) {
  const nameEntry =
    practitioner?.name?.find(n => n.use === "official") ??
    practitioner?.name?.[0] ??
    {};

  return {
    title:     nameEntry.prefix?.[0] ?? null,
    firstname: nameEntry.given?.[0]  ?? null,
    name:      nameEntry.family       ?? null,
  };
}

/**
 * Extract the RPPS/IDNPS identifier value from a Practitioner.
 * Matches on system urn:oid:1.2.250.1.71.4.2.1 (RPPS/IDNPS).
 *
 * @param {Object} practitioner - FHIR Practitioner resource
 * @returns {string|null}
 */
function extractIdentifier(practitioner) {
  return (
    practitioner?.identifier?.find(
      id => id.system === "urn:oid:1.2.250.1.71.4.2.1"
    )?.value ?? null
  );
}

/**
 * Extract the first coding display from a CodeableConcept array.
 *
 * @param {Array} codeableConceptArray
 * @returns {string|null}
 */
function extractFirstDisplay(codeableConceptArray) {
  return codeableConceptArray?.[0]?.coding?.[0]?.display ?? null;
}

/**
 * Extract the phone number from a telecom array.
 * Picks the entry with the lowest rank, or the first phone found.
 *
 * @param {Array} telecom - FHIR ContactPoint array
 * @returns {string|null}
 */
function extractPhone(telecom) {
  if (!Array.isArray(telecom)) return null;

  return (
    telecom
      .filter(t => t.system === "phone")
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]?.value ?? null
  );
}

/**
 * Resolve a contained Location from a PractitionerRole.
 * Contained references use the format "#resourceId".
 *
 * @param {Object} practitionerRole - FHIR PractitionerRole resource
 * @returns {Object|null} The contained Location resource, or null
 */
function resolveContainedLocation(practitionerRole) {
  const locationRef = practitionerRole?.location?.[0]?.reference;
  if (!locationRef?.startsWith("#")) return null;

  const containedId = locationRef.slice(1); // strip leading "#"
  return (
    practitionerRole.contained?.find(
      r => r.resourceType === "Location" && r.id === containedId
    ) ?? null
  );
}

/**
 * Normalize a FHIR Address into a flat display-ready object.
 *
 * @param {Object|null} location - FHIR Location resource
 * @returns {Object|null}
 */
function extractAddress(location) {
  const addr = location?.address;
  if (!addr) return null;

  return {
    line:       addr.line ?? [],
    city:       addr.city       ?? null,
    postalCode: addr.postalCode ?? null,
    country:    addr.country    ?? null,
    position:   location?.position ?? null,
  };
}

/**
 * Extract and sort slot start times from a Slot array.
 * Returns ISO strings sorted chronologically.
 *
 * @param {Object[]} slots - Array of FHIR Slot resources
 * @returns {string[]} Sorted array of ISO 8601 start datetime strings
 */
function extractSlotStarts(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return [];

  return slots
    .map(slot => slot.start)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));
}

/**
 * Extract SAS participation info from PractitionerRole extensions.
 *
 * @param {Object} practitionerRole
 * @returns {{ sasOk: boolean|null, sasTypes: string[] }}
 */
function extractSasParticipation(practitionerRole) {
  const sasExt = practitionerRole?.extension?.find(
    e => e.url === "https://annuaire.sante.fr/fhir/StructureDefinition/practitioner-sas-participation"
  );
  if (!sasExt) return { sasOk: null, sasTypes: [] };

  const sasOk = sasExt.extension?.find(e => e.url === "sasParticipation")?.valueBoolean ?? null;
  const sasTypes = sasExt.extension
    ?.filter(e => e.url === "sasParticipationType")
    ?.map(e => e.valueCodeableConcept?.coding?.[0]?.display)
    ?.filter(Boolean) ?? [];

  return { sasOk, sasTypes };
}

/**
 * Extract the operational activity from a HealthcareService specialty slice.
 * Discriminated by JDV_J17-ActiviteOperationnelle-ROR system.
 *
 * @param {Object|null} healthcareService
 * @returns {string|null}
 */
function extractOperationalActivity(healthcareService) {
  return (
    healthcareService?.specialty
      ?.find(s => s.coding?.[0]?.system?.includes("JDV_J17-ActiviteOperationnelle-ROR"))
      ?.coding?.[0]?.display ?? null
  );
}

/**
 * Extract all specific acts from HealthcareService.characteristic.
 * Discriminated by JDV_J16-ActeSpecifique-ROR system.
 *
 * @param {Object|null} healthcareService
 * @returns {string[]}
 */
function extractSpecificActs(healthcareService) {
  return (
    healthcareService?.characteristic
      ?.filter(c => c.coding?.[0]?.system?.includes("JDV_J16-ActeSpecifique-ROR"))
      ?.map(c => c.coding?.[0]?.display)
      ?.filter(Boolean) ?? []
  );
}

/**
 * Parse a resolved set of FHIR resources into a normalized HealthOffer
 * display object (one card = one PractitionerRole).
 *
 * @param {Object} params
 * @param {Object}      params.practitioner     - FHIR Practitioner resource
 * @param {Object}      params.practitionerRole - FHIR PractitionerRole resource
 * @param {Object[]}    params.slots            - FHIR Slot resources linked to this role
 * @returns {{
 *   id: string|null,
 *   title: string|null,
 *   firstname: string|null,
 *   name: string|null,
 *   identifier: string|null,
 *   profession: string|null,
 *   specialty: string|null,
 *   phone: string|null,
 *   address: Object|null,
 *   slotStarts: string[],
 * }}
 */
export function parseOffer({ practitioner, practitionerRole, slots = [], healthcareService = null }) {
  const { title, firstname, name } = extractName(practitioner);
  const containedLocation          = resolveContainedLocation(practitionerRole);
  const { sasOk, sasTypes }        = extractSasParticipation(practitionerRole);

  return {
    id:                  practitionerRole?.id ?? null,
    title,
    firstname,
    name,
    identifier:          extractIdentifier(practitioner),
    profession:          extractFirstDisplay(practitionerRole?.code),
    specialty:           extractFirstDisplay(practitionerRole?.specialty),
    phone:               extractPhone(practitionerRole?.telecom),
    address:             extractAddress(containedLocation),
    slotStarts:          extractSlotStarts(slots),
    sasOk,
    sasTypes,
    comment:             healthcareService?.comment ?? null,
    operationalActivity: extractOperationalActivity(healthcareService),
    specificActs:        extractSpecificActs(healthcareService),
  };
}