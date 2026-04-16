/**
 * assembler-org.js
 * Handles the Organization-based SAS Bundle:
 *   Slot → Schedule.actor[Location] → Location.managingOrganization → Organization
 *
 * One HealthOffer card is produced per Location (= Point Fixe de Garde / structure).
 * All slots attached to that Location's schedule(s) are aggregated onto the card.
 */

import { loadBundle }    from './fhir-loader.js';
import { parseOrgOffer } from './parser-org.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function indexEntries(entries) {
  const index = new Map();
  for (const entry of entries) {
    const r = entry.resource;
    if (r?.resourceType && r?.id) {
      index.set(`${r.resourceType}/${r.id}`, r);
    }
  }
  return index;
}

function extractByType(index, resourceType) {
  return [...index.values()].filter(r => r.resourceType === resourceType);
}

function resolve(reference, index) {
  if (!reference) return null;
  const r = index.get(reference) ?? null;
  if (!r) console.warn(`[assembler-org] Unresolved reference "${reference}"`);
  return r;
}

/**
 * Detect whether this Bundle is Organization-based (SOS / structure type).
 * Heuristic: at least one Schedule whose actor references a Location (not a PractitionerRole).
 *
 * @param {Map} index
 * @returns {boolean}
 */
export function isOrganizationBundle(index) {
  const schedules = extractByType(index, 'Schedule');
  return schedules.some(s =>
    s.actor?.some(a => a.reference?.startsWith('Location/'))
  );
}

/**
 * Build a map of   Location id  →  Slot[]
 * by walking  Slot → Schedule.actor[Location].
 *
 * @param {Map} index
 * @returns {Map<string, object[]>}
 */
function mapSlotsToLocations(index) {
  const slotsByLocationId = new Map();

  const slots     = extractByType(index, 'Slot');
  const schedules = extractByType(index, 'Schedule');

  const scheduleById = new Map(schedules.map(s => [s.id, s]));

  for (const slot of slots) {
    const schedRef  = slot.schedule?.reference;        // "Schedule/ScheduleOrg1"
    if (!schedRef) continue;

    const schedId   = schedRef.split('/')[1];
    const schedule  = scheduleById.get(schedId);
    if (!schedule) continue;

    // Find the Location actor in this Schedule
    const locRef = schedule.actor?.find(a =>
      a.reference?.startsWith('Location/')
    )?.reference;
    if (!locRef) continue;

    const locId = locRef.split('/')[1];
    if (!slotsByLocationId.has(locId)) slotsByLocationId.set(locId, []);
    slotsByLocationId.get(locId).push(slot);
  }

  return slotsByLocationId;
}

/**
 * Load an Organization-based FHIR Bundle and return one HealthOffer per Location.
 *
 * @param {string} bundleUrl
 * @returns {Promise<object[]>}
 */
export async function buildOrgOffersFromBundle(bundleUrl) {
  const bundle          = await loadBundle(bundleUrl);
  const index           = indexEntries(bundle.entry);
  const slotsByLocId    = mapSlotsToLocations(index);
  const locations       = extractByType(index, 'Location');

  return locations.map(location => {
    const orgRef      = location.managingOrganization?.reference;
    const organization = resolve(orgRef, index);
    const slots        = slotsByLocId.get(location.id) ?? [];

    return parseOrgOffer({ location, organization, slots });
  });
}
