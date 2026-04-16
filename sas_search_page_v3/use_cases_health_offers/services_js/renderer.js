/**
 * renderer.js
 * Single responsibility: render normalized HealthOffer objects into the DOM.
 * No fetching, no parsing, no business logic.
 */

/**
 * Format a full display name from title, firstname and family name,
 * omitting null/empty parts gracefully.
 *
 * @param {Object} offer
 * @returns {string}
 */
function formatDisplayName(offer) {
  return [offer.title, offer.firstname, offer.name]
    .filter(Boolean)
    .join(' ');
}

/**
 * Format an address object into a single readable line.
 *
 * @param {Object|null} address
 * @returns {string}
 */
function formatAddress(address) {
  if (!address) return null;
  return [address.line?.[0], address.postalCode, address.city]
    .filter(Boolean)
    .join(', ');
}

/**
 * Format an ISO 8601 datetime string into a readable French date/time.
 *
 * @param {string} isoString
 * @returns {string} e.g. "05/11/2021 à 09h00"
 */
function formatSlotTime(isoString) {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const mins  = String(date.getMinutes()).padStart(2, '0');
  return `${hours}h${mins}`;
}

/**
 * Render a single offer card using the DSFR fr-card component.
 * Layout: left column (info) + right column (slots).
 *
 * @param {Object} offer - Parsed HealthOffer display object
 * @returns {string} HTML string
 */
function renderCard(offer) {
  const displayName = formatDisplayName(offer);
  const addressLine = formatAddress(offer.address);
  const hasSlots    = offer.slotStarts?.length > 0;
  
  // Données pour le panneau latéral
  const panelData = {
    name: displayName,
    specialty: [offer.profession, offer.specialty].filter(Boolean).join(' — '),
    phone: offer.phone,
    address: addressLine,
    slots: offer.slotStarts?.map(formatSlotTime) || [],
    sasOk: offer.sasOk,
    sasTypes: offer.sasTypes ?? [],
    comment: offer.comment,
    operationalActivity: offer.operationalActivity,
    specificActs: offer.specificActs ?? [],
    ps: offer.notes || "Aucune information complémentaire.",
    access: offer.accessibility || "Accessible PMR",
    tariffs: offer.tariffInfo || "Tarif conventionné Sécurité Sociale",
    languages: offer.languages || [],
  };

  // Badge SAS OK/KO
  const sasBadge = offer.sasOk === true
    ? `<span class="fr-badge fr-badge--success fr-badge--sm fr-ml-1w">Participe au SAS</span>`
    : offer.sasOk === false
    ? `<span class="fr-badge fr-badge--error fr-badge--sm fr-ml-1w">Ne participe pas au SAS</span>`
    : '';

  return `
    <article class="fr-col-12 js-practitioner-card"
             data-panel='${JSON.stringify(panelData).replace(/'/g, "&apos;")}'>
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content sas-card-layout">

            <!-- Left column: practitioner info -->
            <div class="sas-card-info">

              <h3 class="fr-card__title fr-mb-0 js-open-panel"
                  title="Voir les détails de ${displayName || 'ce professionnel'}"
                  tabindex="0" role="button"
                  aria-label="Ouvrir les détails de ${displayName || 'ce professionnel'}">
                ${displayName || '—'} ${sasBadge}
              </h3>

              ${offer.profession || offer.specialty ? `
              <p class="fr-card__detail fr-mb-0">
                ${[offer.profession, offer.specialty].filter(Boolean).join(' — ')}
              </p>` : ''}

              ${offer.operationalActivity ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                Activité : ${offer.operationalActivity}
              </p>` : ''}

              ${offer.specificActs?.length ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                ${offer.specificActs.map(a => `<span class="fr-badge fr-badge--sm fr-mr-1v">${a}</span>`).join('')}
              </p>` : ''}

              ${offer.phone ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                <a href="tel:${offer.phone}">${offer.phone}</a>
              </p>` : ''}

              ${addressLine ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                ${addressLine}
              </p>` : ''}

              ${offer.comment ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0 sas-comment">
                <em>${offer.comment}</em>
              </p>` : ''}

              <button class="fr-btn fr-btn--sm fr-mt-1w">
                Orientation hors disponibilité
              </button>
            </div>

            <!-- Right column: available slots -->
            <div class="sas-card-slots">
              ${hasSlots
                ? offer.slotStarts.map(start => `
                    <button class="fr-btn fr-btn--sm fr-btn--secondary sas-slot-btn js-open-panel">
                      ${formatSlotTime(start)}
                    </button>`).join('')
                : `<p class="fr-text--sm fr-text--mention-grey fr-mb-0">
                     Aucun créneau disponible
                   </p>`
              }
            </div>

          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render a loading state into the container.
 *
 * @param {string} containerId
 */
export function renderLoading(containerId = 'offers-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="fr-col-12 fr-py-6w">
      <div class="fr-loader fr-loader--lg fr-mx-auto" role="status"
           aria-label="Chargement des résultats">
        <span class="fr-loader__label">Chargement des professionnels...</span>
      </div>
    </div>
  `;
}

/**
 * Render an error alert into the container.
 *
 * @param {Error}  error
 * @param {string} containerId
 */
export function renderError(error, containerId = 'offers-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="fr-col-12">
      <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-4w">
        <h3 class="fr-alert__title">Erreur de chargement</h3>
        <p>${error.message}</p>
        <button class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-mt-1w"
                onclick="location.reload()">
          Réessayer
        </button>
      </div>
    </div>
  `;
}

/**
 * Render a list of parsed HealthOffer objects into the DOM.
 *
 * @param {Object[]} offers      - Array of parsed HealthOffer display objects
 * @param {string}   containerId - ID of the grid container element
 * @param {string}   countId     - ID of the results count element
 */
export function renderOffers(offers, containerId = 'offers-grid', countId = 'results-count') {
  const container    = document.getElementById(containerId);
  const countElement = document.getElementById(countId);

  if (!container) {
    console.warn(`[renderer] Container "#${containerId}" not found in DOM.`);
    return;
  }

  if (countElement) {
    const label = offers.length > 1 ? 'résultats' : 'résultat';
    countElement.textContent = `${offers.length} ${label}`;
  }

  if (!offers?.length) {
    container.innerHTML = `
      <div class="fr-col-12">
        <p class="fr-text--sm fr-text--mention-grey fr-m-2w">
          Aucun résultat trouvé.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = offers.map(renderCard).join('');

  if (typeof window.dsfr !== 'undefined') {
    window.dsfr.start();
  }
}