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
 * Format an ISO 8601 datetime string to "HHhMM".
 *
 * @param {string} isoString
 * @returns {string} e.g. "09h00"
 */
function formatSlotTime(isoString) {
  const date  = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const mins  = String(date.getMinutes()).padStart(2, '0');
  return `${hours}h${mins}`;
}

/**
 * Format a Date object to a "YYYY-MM-DD" key for grouping.
 *
 * @param {Date} date
 * @returns {string}
 */
function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Format a Date object to a short French label "jeu. 04/11".
 *
 * @param {Date} date
 * @returns {string}
 */
function formatDayLabel(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

/**
 * Build the 3-column slot structure from an array of ISO slot starts.
 * The reference day is the date of the earliest slot found (D).
 * Columns: D, D+1, D+2.
 * If no slots exist, all three columns are empty.
 *
 * @param {string[]} slotStarts - Sorted ISO 8601 datetime strings
 * @returns {{ label: string, key: string, slots: string[] }[]} Array of 3 day columns
 */
function buildSlotColumns(slotStarts) {
  if (!slotStarts?.length) {
    // No slots: return 3 empty placeholder columns with generic labels
    const today = new Date();
    return [0, 1, 2].map(offset => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return { label: formatDayLabel(d), key: toDateKey(d), slots: [] };
    });
  }

  // Use the earliest slot's date as D
  const earliest = new Date(slotStarts[0]);
  const columns  = [0, 1, 2].map(offset => {
    const d = new Date(earliest);
    d.setDate(d.getDate() + offset);
    return { label: formatDayLabel(d), key: toDateKey(d), slots: [] };
  });

  // Distribute slots into their matching column
  for (const iso of slotStarts) {
    const key = toDateKey(new Date(iso));
    const col = columns.find(c => c.key === key);
    if (col) col.slots.push(iso);
  }

  return columns;
}

/**
 * Render the 3-day slot columns HTML for a card.
 *
 * @param {string[]} slotStarts
 * @returns {string} HTML string
 */
function renderSlotColumns(slotStarts) {
  const columns = buildSlotColumns(slotStarts);

  return columns.map(col => `
    <div class="sas-slot-day">
      <p class="sas-slot-day-label">${col.label}</p>
      <div class="sas-slot-day-list">
        ${col.slots.length
          ? col.slots.map(iso => `
              <button class="fr-btn fr-btn--sm fr-btn--secondary sas-slot-btn js-open-panel">
                ${formatSlotTime(iso)}
              </button>`).join('')
          : `<p class="fr-text--xs fr-text--mention-grey fr-mb-0">—</p>`
        }
      </div>
    </div>
  `).join('');
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

  // Panel data
  const panelData = {
    name:                displayName,
    specialty:           [offer.profession, offer.specialty].filter(Boolean).join(' — '),
    phone:               offer.phone,
    address:             addressLine,
    slots:               offer.slotStarts?.map(formatSlotTime) || [],
    sasOk:               offer.sasOk,
    sasTypes:            offer.sasTypes ?? [],
    comment:             offer.comment,
    operationalActivity: offer.operationalActivity,
    specificActs:        offer.specificActs ?? [],
    ps:                  offer.notes || "Aucune information complémentaire.",
    access:              offer.accessibility || "Accessible PMR",
    tariffs:             offer.tariffInfo || "Tarif conventionné Sécurité Sociale",
    languages:           offer.languages || [],
  };

  // SAS badge — sasTypes is an array
  const SAS_LABEL_MAP = {
    'Cabinet':          'Participe au SAS',
    'cpts':             'Participe au SAS via CPTS',
    'msp':              'Participe au SAS via MSP',
    'Téléconsultation': 'Participe au SAS (téléconsultation)',
  };

  const matchedType = offer.sasTypes?.find(t => t in SAS_LABEL_MAP);
  const sasBadge = offer.sasOk === true && matchedType
    ? `<span class="fr-badge fr-badge--success fr-badge--sm">${SAS_LABEL_MAP[matchedType]}</span>`
    : '';

  return `
    <article class="fr-col-12 js-practitioner-card"
             data-sas="${offer.sasOk === true ? 'true' : 'false'}"
             data-pdsa="false"
             data-orgtype="ps-indiv"
             data-panel='${JSON.stringify(panelData).replace(/'/g, "&apos;")}'>
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content sas-card-layout">

            <!-- Col 1: practitioner identity -->
            <div class="sas-card-info">
              <h3 class="fr-card__title fr-mb-0 js-open-panel"
                  title="Voir les détails de ${displayName || 'ce professionnel'}"
                  tabindex="0" role="button"
                  aria-label="Ouvrir les détails de ${displayName || 'ce professionnel'}">
                ${displayName || '—'}
              </h3>

              ${sasBadge}

              ${offer.phone ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                <a href="tel:${offer.phone}">${offer.phone}</a>
              </p>` : ''}

              ${addressLine ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                ${addressLine}
              </p>` : ''}
            </div>

            <!-- Col 2: phone + comment -->
            <div class="sas-card-comment">

              ${(offer.profession !== "Médecin" || offer.specialty) ? `
                <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                  <strong>${[
                    offer.profession !== "Médecin" ? offer.profession : null,
                    offer.specialty
                  ].filter(Boolean).join(' — ')}</strong>
                </p>` : ''}
              
              ${offer.operationalActivity ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0 sas-comment">
                ${offer.operationalActivity}
              </p>` : ''}

              ${offer.comment ? `
                <figure class="fr-quote">
              <p class="fr-text--md">  
              <em>${offer.comment}</em>
              </p>
               </figure>
               ` : ''}
            </div>

            <!-- Col 3: 3-day slot columns + action button -->
            <div class="sas-card-slots">
              <div class="sas-slots-grid">
                ${renderSlotColumns(offer.slotStarts)}
              </div>
              <button class="fr-btn fr-btn--sm fr-mt-1w sas-btn-full">
                Orientation hors disponibilité
              </button>
                <button class="fr-btn--secondary fr-btn--sm fr-mt-1w sas-btn-full ">
                Demande de prise en charge
              </button>
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