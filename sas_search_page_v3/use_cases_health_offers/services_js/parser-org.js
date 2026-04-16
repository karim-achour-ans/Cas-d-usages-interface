/**
 * parser-org.js
 * Maps resolved FHIR resources (Location + Organization + Slots)
 * to a normalized OrgOffer display object.
 * No fetching, no DOM, no side-effects.
 */

// ─── Organisation type classifier ─────────────────────────────────────────────

const ORG_TYPE_CODE_MAP = {
  SOS_MEDECINS:  'SOS Médecins',
  CENTRE_SANTE:  'Centre de santé',
  MMG:           'Maison médicale de garde',
};

/**
 * Detect the human-readable organisation type from Organization.type[].
 * Falls back gracefully to the raw code or the org name.
 *
 * @param {object|null} organization
 * @returns {string|null}
 */
function extractOrgType(organization) {
  const coding = organization?.type?.[0]?.coding?.[0];
  if (!coding) return null;
  return ORG_TYPE_CODE_MAP[coding.code] ?? coding.display ?? null;
}

/**
 * Extract the SOS subtype (PFG / PFC) from a Location's extension.
 * Only applies to SOS Médecins locations.
 * Extension URL: https://sas.esante.gouv.fr/fhir/StructureDefinition/sos-location-subtype
 *
 * @param {object|null} location
 * @returns {'PFG'|'PFC'|null}
 */
function extractSosSubtype(location) {
  return (
    location?.extension
      ?.find(e => e.url === 'https://sas.esante.gouv.fr/fhir/StructureDefinition/sos-location-subtype')
      ?.valueCode ?? null
  );
}

/**
 * Extract SAS participation info from Organization extensions.
 * Mirrors the same extension URL used for PractitionerRole.
 *
 * @param {object|null} organization
 * @returns {{ sasOk: boolean|null, sasTypes: string[] }}
 */
function extractSasParticipation(organization) {
  const sasExt = organization?.extension?.find(
    e => e.url === 'https://annuaire.sante.fr/fhir/StructureDefinition/practitioner-sas-participation'
  );
  if (!sasExt) return { sasOk: null, sasTypes: [] };

  const sasOk = sasExt.extension?.find(e => e.url === 'sasParticipation')?.valueBoolean ?? null;
  const sasTypes = sasExt.extension
    ?.filter(e => e.url === 'sasParticipationType')
    ?.map(e => e.valueCodeableConcept?.coding?.[0]?.display)
    ?.filter(Boolean) ?? [];

  return { sasOk, sasTypes };
}

/**
 * Extract a phone number from a FHIR telecom array.
 *
 * @param {Array|undefined} telecom
 * @returns {string|null}
 */
function extractPhone(telecom) {
  if (!Array.isArray(telecom)) return null;
  return (
    telecom
      .filter(t => t.system === 'phone')
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]?.value ?? null
  );
}

/**
 * Normalise a Location.address into a flat display object.
 *
 * @param {object|null} location
 * @returns {object|null}
 */
function extractAddress(location) {
  const addr = location?.address;
  if (!addr) return null;
  return {
    line:       addr.line ?? [],
    city:       addr.city        ?? null,
    postalCode: addr.postalCode  ?? null,
    country:    addr.country     ?? null,
    position:   location?.position ?? null,
  };
}

/**
 * Extract and sort slot start times (ISO strings).
 *
 * @param {object[]} slots
 * @returns {string[]}
 */
function extractSlotStarts(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return [];
  return slots
    .map(s => s.start)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));
}

/**
 * Extract slot serviceType codes (AMB / VR) to surface consultation mode.
 *
 * @param {object[]} slots
 * @returns {string[]}  e.g. ['AMB', 'VR']
 */
function extractServiceTypes(slots) {
  const codes = new Set();
  for (const slot of slots) {
    slot.serviceType?.forEach(st =>
      st.coding?.forEach(c => { if (c.code) codes.add(c.code); })
    );
  }
  return [...codes];
}

/**
 * Extract formatted hours of operation from a Location.
 *
 * @param {object|null} location
 * @returns {{ daysOfWeek: string[], openingTime: string|null, closingTime: string|null, allDay: boolean }[]}
 */
function extractHoursOfOperation(location) {
  return (location?.hoursOfOperation ?? []).map(h => ({
    daysOfWeek:  h.daysOfWeek  ?? [],
    openingTime: h.openingTime ?? null,
    closingTime: h.closingTime ?? null,
    allDay:      h.allDay      ?? false,
  }));
}

/**
 * Parse resolved FHIR resources into a normalized OrgOffer display object.
 * One OrgOffer = one Location (PFG / centre de santé / MMG).
 *
 * @param {{ location: object, organization: object|null, slots: object[] }} params
 * @returns {object}
 */
export function parseOrgOffer({ location, organization, slots = [] }) {
  const { sasOk, sasTypes } = extractSasParticipation(organization);

  return {
    // Identifiers
    id:              location?.id ?? null,
    bundleType:      'organization',            // discriminator for renderer

    // Location / structure names
    locationName:    location?.name        ?? null,
    description:     location?.description ?? null,
    orgName:         organization?.name    ?? null,
    orgType:         extractOrgType(organization),        // 'SOS Médecins' | 'Centre de santé' | 'MMG' | null
    sosSubtype:      extractSosSubtype(location),            // 'PFG' | 'PFC' | null

    // Contact
    phone:           extractPhone(location?.telecom) ?? extractPhone(organization?.telecom),
    address:         extractAddress(location),

    // Availability
    slotStarts:      extractSlotStarts(slots),
    serviceTypes:    extractServiceTypes(slots),   // ['AMB'] | ['VR'] | ['AMB','VR']
    hoursOfOperation: extractHoursOfOperation(location),

    // SAS participation
    sasOk,
    sasTypes,

    // Org identifier (SIRET / IDNST)
    siret:           organization?.identifier?.find(
                       id => id.system === 'urn:oid:1.2.250.1.71.4.2.2'
                     )?.value ?? null,
  };
}