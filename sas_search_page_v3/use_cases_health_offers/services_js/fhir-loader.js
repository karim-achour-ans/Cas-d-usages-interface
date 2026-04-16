/**
 * fhir-loader.js
 * Single responsibility: fetch and validate a FHIR Bundle from a URL.
 * Returns the raw Bundle object. No parsing, no business logic.
 */

/**
 * Fetch a FHIR Bundle from a given URL and validate its structure.
 *
 * @param {string} url - URL to the FHIR Bundle JSON file
 * @returns {Promise<Object>} Raw FHIR Bundle object
 * @throws {Error} If the fetch fails or the response is not a valid FHIR Bundle
 */
export async function loadBundle(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load Bundle at "${url}": HTTP ${response.status}`);
  }

  const bundle = await response.json();

  if (bundle?.resourceType !== "Bundle") {
    throw new Error(
      `Invalid resource at "${url}": expected resourceType "Bundle", ` +
      `got "${bundle?.resourceType}"`
    );
  }

  if (!Array.isArray(bundle.entry) || bundle.entry.length === 0) {
    throw new Error(`Bundle at "${url}" has no entries.`);
  }

  return bundle;
}