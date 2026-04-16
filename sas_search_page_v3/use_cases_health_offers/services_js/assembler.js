/**
 * assembler.js
 * Single responsibility: index a FHIR Bundle, resolve cross-references,
 * and delegate parsing to parser.js.
 * No DOM manipulation, no fetching, no rendering.
 */

import { loadBundle} from 'http://localhost:8000/sas_search_page_v3/use_cases_health_offers/services_js/fhir-loader.js';
import { parseOffer }       from 'http://localhost:8000/sas_search_page_v3/use_cases_health_offers/services_js/parser.js';

/**
 * Build an index of all Bundle entries keyed by "ResourceType/id".
 * This allows O(1) reference resolution instead of repeated array scans.
 *
 * @param {Object[]} entries - Bundle.entry array
 * @returns {Map<string, Object>} Map of "ResourceType/id" → resource
 */
function indexEntries(entries) {
  const index = new Map();
 
  for (const entry of entries) {
    const resource = entry.resource;
    if (resource?.resourceType && resource?.id) {
      index.set(`${resource.resourceType}/${resource.id}`, resource);
    }
  }
 
  return index;
}
 
/**
 * Resolve a FHIR reference string against the Bundle index.
 *
 * @param {string}          reference - e.g. "Practitioner/ExamplePractitioner2"
 * @param {Map<string, Object>} index - Bundle entry index
 * @returns {Object|null}
 */
function resolveReference(reference, index) {
  if (!reference) return null;
 
  const resource = index.get(reference) ?? null;
 
  if (!resource) {
    console.warn(`[assembler] Could not resolve reference "${reference}" in Bundle.`);
  }
 
  return resource;
}
 
/**
 * Extract all resources of a given resourceType from the Bundle index.
 *
 * @param {Map<string, Object>} index
 * @param {string} resourceType
 * @returns {Object[]}
 */
function extractByType(index, resourceType) {
  return [...index.values()].filter(r => r.resourceType === resourceType);
}
 
/**
 * Build a map of PractitionerRole id → Slot[] by walking the chain:
 * Slot.schedule → Schedule.actor (PractitionerRole reference).
 *
 * @param {Map<string, Object>} index - Full Bundle entry index
 * @returns {Map<string, Object[]>} Map of "PractitionerRole id" → Slot array
 */
function mapSlotsToRoles(index) {
  const slotsByRoleId = new Map();
 
  const slots     = extractByType(index, "Slot");
  const schedules = extractByType(index, "Schedule");
 
  // Index schedules by id for O(1) lookup
  const scheduleById = new Map(schedules.map(s => [s.id, s]));
 
  for (const slot of slots) {
    const scheduleRef = slot.schedule?.reference; // e.g. "Schedule/ExampleSchedule1"
    if (!scheduleRef) continue;
 
    const scheduleId = scheduleRef.split('/')[1];
    const schedule   = scheduleById.get(scheduleId);
    if (!schedule) continue;
 
    // Find the PractitionerRole actor reference in this Schedule
    const roleRef = schedule.actor?.find(a =>
      a.reference?.startsWith("PractitionerRole/")
    )?.reference;
    if (!roleRef) continue;
 
    const roleId = roleRef.split('/')[1];
 
    if (!slotsByRoleId.has(roleId)) {
      slotsByRoleId.set(roleId, []);
    }
    slotsByRoleId.get(roleId).push(slot);
  }
 
  return slotsByRoleId;
}
 
/**
 * Load a FHIR Bundle from a URL and parse one HealthOffer per PractitionerRole.
 * Each card includes the slots linked to that PractitionerRole via its Schedule.
 *
 * @param {string} bundleUrl - URL to the FHIR Bundle JSON file
 * @returns {Promise<Object[]>} Array of parsed HealthOffer display objects
 */
export async function buildOffersFromBundle(bundleUrl) {
  const bundle       = await loadBundle(bundleUrl);
  const index        = indexEntries(bundle.entry);
  const roles        = extractByType(index, "PractitionerRole");
  const slotsByRoleId = mapSlotsToRoles(index);
 
  return roles.map(practitionerRole => {
    const practitionerRef    = practitionerRole.practitioner?.reference;
    const practitioner       = resolveReference(practitionerRef, index);
    const slots              = slotsByRoleId.get(practitionerRole.id) ?? [];

    const healthcareServiceRef = practitionerRole.healthcareService?.[0]?.reference;
    const healthcareService    = resolveReference(healthcareServiceRef, index);

    return parseOffer({ practitioner, practitionerRole, slots, healthcareService });
  });
}