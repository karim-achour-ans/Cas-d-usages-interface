/**
 * parser.js
 * Single responsibility: map resolved FHIR resources to a normalized
 * display object. No fetching, no DOM, no side effects.
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

function extractIdentifier(practitioner) {
  return (
    practitioner?.identifier?.find(
      id => id.system === "urn:oid:1.2.250.1.71.4.2.1"
    )?.value ?? null
  );
}

function extractFirstDisplay(codeableConceptArray) {
  return codeableConceptArray?.[0]?.coding?.[0]?.display ?? null;
}

function extractPhone(telecom) {
  if (!Array.isArray(telecom)) return null;
  return (
    telecom
      .filter(t => t.system === "phone")
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]?.value ?? null
  );
}

function resolveContainedLocation(practitionerRole) {
  const locationRef = practitionerRole?.location?.[0]?.reference;
  if (!locationRef?.startsWith("#")) return null;
  const containedId = locationRef.slice(1);
  return (
    practitionerRole.contained?.find(
      r => r.resourceType === "Location" && r.id === containedId
    ) ?? null
  );
}

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
 * Extract ISO start strings sorted chronologically.
 * Kept for backward compat (panel, dispo filter).
 */
function extractSlotStarts(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return [];
  return slots
    .map(s => s.start)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));
}

/**
 * Extract slot objects { start, end } sorted chronologically.
 * Used by the renderer for the time-range button display.
 *
 * @param {Object[]} slots - FHIR Slot resources
 * @returns {{ start: string, end: string|null }[]}
 */
function extractSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return [];
  return slots
    .filter(s => s.start)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map(s => ({ start: s.start, end: s.end ?? null }));
}

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
 * Extract the conventionnement (CNAM agreement sector) from PractitionerRole.
 * Extension : practitioner-role-conventionnement
 * Système NOS : TRE_R75-TypeDeConventionnement
 * Codes : "1" Secteur 1 | "2" Secteur 2 | "3" Non conventionné
 */
function extractConventionnement(practitionerRole) {
  const convExt = practitionerRole?.extension?.find(
    e => e.url === "https://annuaire.sante.fr/fhir/StructureDefinition/practitioner-role-conventionnement"
  );
  if (!convExt) return { conventionnementCode: null, conventionnementDisplay: null };

  const coding =
    convExt.valueCoding ??
    convExt.valueCodeableConcept?.coding?.[0] ??
    null;

  if (!coding) return { conventionnementCode: null, conventionnementDisplay: null };

  return {
    conventionnementCode:    coding.code    ?? null,
    conventionnementDisplay: coding.display ?? null,
  };
}

function extractOperationalActivity(healthcareService) {
  return (
    healthcareService?.specialty
      ?.find(s => s.coding?.[0]?.system?.includes("JDV_J17-ActiviteOperationnelle-ROR"))
      ?.coding?.[0]?.display ?? null
  );
}

function extractSpecificActs(healthcareService) {
  return (
    healthcareService?.characteristic
      ?.filter(c => c.coding?.[0]?.system?.includes("JDV_J16-ActeSpecifique-ROR"))
      ?.map(c => c.coding?.[0]?.display)
      ?.filter(Boolean) ?? []
  );
}

/**
 * Extract the org type ('cpts' | 'msp' | null) from an Organization resource.
 *
 * Parcourt Organization.type[].coding[].code (ValueSet ANS).
 * Normalise en minuscules pour cohérence avec SAS_LABEL_MAP (renderer.js).
 *
 * @param {Object|null} organization - FHIR Organization resource
 * @returns {'cpts'|'msp'|null}
 */
function extractOrgType(organization) {
  if (!organization) return null;

  for (const type of organization.type ?? []) {
    for (const coding of type.coding ?? []) {
      const code = coding.code?.toLowerCase();
      if (code === 'cpts' || code === 'msp') return code;
    }
  }

  return null;
}

/**
 * Parse a resolved set of FHIR resources into a normalized HealthOffer object.
 * One card = one PractitionerRole.
 *
 * @param {{ practitioner, practitionerRole, slots, healthcareService, organization }} params
 * @returns {Object} HealthOffer display object
 */
export function parseOffer({
  practitioner,
  practitionerRole,
  slots            = [],
  healthcareService = null,
  organization      = null,   // FHIR Organization (CPTS / MSP) — peut être null
}) {
  const { title, firstname, name }                        = extractName(practitioner);
  const containedLocation                                 = resolveContainedLocation(practitionerRole);
  const { sasOk, sasTypes }                               = extractSasParticipation(practitionerRole);
  const { conventionnementCode, conventionnementDisplay } = extractConventionnement(practitionerRole);

  return {
    id:                      practitionerRole?.id ?? null,
    title,
    firstname,
    name,
    identifier:              extractIdentifier(practitioner),
    profession:              extractFirstDisplay(practitionerRole?.code),
    specialty:               extractFirstDisplay(practitionerRole?.specialty),
    phone:                   extractPhone(practitionerRole?.telecom),
    address:                 extractAddress(containedLocation),
    // slotStarts: string[] — backward compat pour panel, dispo, filtres
    slotStarts:              extractSlotStarts(slots),
    // slots: { start, end }[] — utilisé par le renderer pour les boutons créneaux
    slots:                   extractSlots(slots),
    sasOk,
    sasTypes,
    conventionnementCode,
    conventionnementDisplay,
    comment:                 healthcareService?.comment ?? null,
    operationalActivity:     extractOperationalActivity(healthcareService),
    specificActs:            extractSpecificActs(healthcareService),
    // ── Organisation (CPTS / MSP) ─────────────────────────────────────────
    // null pour les PS libéraux sans rattachement CPTS/MSP : comportement nominal.
    orgId:                   organization?.id   ?? null,
    orgName:                 organization?.name ?? null,
    orgType:                 extractOrgType(organization),
  };
}