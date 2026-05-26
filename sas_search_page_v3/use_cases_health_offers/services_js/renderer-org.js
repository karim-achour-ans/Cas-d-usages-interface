/**
 * renderer-org.js
 * Renders normalized OrgOffer objects (Location/Organization bundle type)
 * into DSFR fr-card components that slot into the same #offers-grid container.
 *
 * Slot columns are rendered via the shared renderSlotColumns from renderer.js
 * to guarantee visual consistency (T/C/V icons, counter badge, time range).
 */

import {
  renderLoading,
  renderError,
  renderSlotColumns,
} from './renderer.js';

export { renderLoading, renderError };

// ── Formatting helpers ─────────────────────────────────────────────────────────

function formatAddress(address) {
  if (!address) return null;
  return [address.line?.[0], address.postalCode, address.city]
    .filter(Boolean)
    .join(', ');
}

function formatSlotTime(isoString) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatHours(hoursOfOperation) {
  if (!hoursOfOperation?.length) return null;
  const dayNames = { mon:'Lun', tue:'Mar', wed:'Mer', thu:'Jeu', fri:'Ven', sat:'Sam', sun:'Dim' };
  return hoursOfOperation.map(h => {
    const days  = (h.daysOfWeek ?? []).map(d => dayNames[d] ?? d).join(', ');
    if (h.allDay) return `${days} : 24h/24`;
    const open  = h.openingTime?.slice(0, 5) ?? '?';
    const close = h.closingTime?.slice(0, 5) ?? '?';
    return `${days} : ${open}–${close}`;
  }).join(' | ');
}

// ── Availability & mode helpers ────────────────────────────────────────────────

function computeDispo(slotStarts) {
  if (!slotStarts?.length) return '';
  const diffH = (new Date(slotStarts[0]) - Date.now()) / 3_600_000;
  if (diffH < 4)  return 'sous4h';
  if (diffH < 8)  return '4a8h';
  return 'plus12h';
}

function computeOrgMode(serviceTypes) {
  if (!serviceTypes?.length) return 'cabinet';
  const modes = [];
  if (serviceTypes.includes('AMB')) modes.push('cabinet');
  if (serviceTypes.includes('VR'))  modes.push('visio');
  return modes.join(' ') || 'cabinet';
}

// ── Badges ─────────────────────────────────────────────────────────────────────

const ORG_TYPE_BADGE = {
  'SOS Médecins':             'fr-badge--blue-cumulus',
  'Centre de santé':          'fr-badge--blue-cumulus',
  'Maison médicale de garde': 'fr-badge--blue-cumulus',
};

const SOS_SUBTYPE_LABEL = {
  PFG: 'Point Fixe de Garde',
  PFC: 'Point Fixe de Consultation',
};

function renderOrgTypeBadge(orgType, sosSubtype) {
  if (!orgType) return '';
  const cls   = ORG_TYPE_BADGE[orgType] ?? 'fr-badge--info';
  const label = orgType === 'SOS Médecins' && sosSubtype
    ? `SOS Médecins — ${SOS_SUBTYPE_LABEL[sosSubtype] ?? sosSubtype}`
    : orgType;
  return `<span class="fr-badge fr-badge--sm ${cls}">${label}</span>`;
}

function renderSasBadge(sasOk) {
  return sasOk === true
    ? `<span class="fr-badge fr-badge--success fr-badge--sm">Participe au SAS</span>`
    : '';
}

// ── Card renderer ──────────────────────────────────────────────────────────────

function renderOrgCard(offer) {
  const addressLine = formatAddress(offer.address);
  const hoursLabel  = formatHours(offer.hoursOfOperation);
  const displayName = offer.locationName ?? offer.orgName ?? '—';

  // Normalise slots: prefer { start, end }[] from offer.slots,
  // fallback to string[] from offer.slotStarts for backward compat.
  const slots = offer.slots?.length
    ? offer.slots
    : (offer.slotStarts ?? []).map(s => ({ start: s, end: null }));

  const panelData = {
    name:                displayName,
    specialty:           [offer.orgType, offer.orgName].filter(Boolean).join(' — '),
    phone:               offer.phone,
    address:             addressLine,
    slots:               offer.slotStarts?.map(formatSlotTime) ?? [],
    sasOk:               offer.sasOk,
    sasTypes:            offer.sasTypes ?? [],
    comment:             offer.description ?? null,
    operationalActivity: hoursLabel,
    specificActs:        offer.serviceTypes?.map(c => c === 'AMB' ? 'Consultation sur place' : 'Téléconsultation') ?? [],
    ps:                  offer.siret ? `SIRET : ${offer.siret}` : 'Aucune information complémentaire.',
    access:              'Accessible PMR',
    tariffs:             'Tarif conventionné Sécurité Sociale',
    languages:           [],
    bundleType:          'organization',
  };

  const orgTypeCode = (() => {
    if (offer.orgType === 'SOS Médecins')             return offer.sosSubtype ?? 'PFG';
    if (offer.orgType === 'Maison médicale de garde') return 'MMG';
    return 'CENTRE_SANTE';
  })();

  const isPdsa = orgTypeCode === 'PFG' || orgTypeCode === 'MMG';

  return `
    <article class="fr-col-12 js-practitioner-card"
             data-sas="${offer.sasOk ? 'true' : 'false'}"
             data-pdsa="${isPdsa ? 'true' : 'false'}"
             data-orgtype="${orgTypeCode}"
             data-profession=""
             data-specialty=""
             data-dispo="${computeDispo(offer.slotStarts)}"
             data-mode="${computeOrgMode(offer.serviceTypes)}"
             data-panel='${JSON.stringify(panelData).replace(/'/g, "&apos;")}'>
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content sas-card-layout">

            <!-- ── Col 1 : identité de la structure ───────────────────── -->
            <div class="sas-card-info">
              <h3 class="fr-card__title fr-mb-0 js-open-panel"
                  tabindex="0" role="button"
                  aria-label="Ouvrir les détails de ${displayName}">
                ${displayName}
              </h3>

              <div class="fr-badges-group fr-mt-1w">
                ${renderOrgTypeBadge(offer.orgType, offer.sosSubtype)}
                ${renderSasBadge(offer.sasOk)}
              </div>

              ${offer.phone ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0 fr-mt-1w">
                <a href="tel:${offer.phone}">${offer.phone}</a>
              </p>` : ''}

              ${addressLine ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                ${addressLine}
              </p>` : ''}
            </div>

            <!-- ── Col 2 : description + horaires ─────────────────────── -->
            <div class="sas-card-comment">
              ${offer.orgName && offer.orgName !== offer.locationName ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                <strong>${offer.orgName}</strong>
              </p>` : ''}

              ${hoursLabel ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0 sas-comment">
                ${hoursLabel}
              </p>` : ''}

              ${offer.description ? `
              <figure class="fr-callout fr-p-2w fr-mt-1w">
                <p class="fr-text--md">${offer.description}</p>
              </figure>` : ''}
            </div>

            <!-- ── Col 3 : créneaux + actions ─────────────────────────── -->
            <div class="sas-card-slots">
              <div class="sas-slots-grid">
                ${renderSlotColumns(slots)}
              </div>
              <button class="fr-btn fr-btn--sm fr-mt-1w sas-btn-full">
                Orientation hors disponibilité
              </button>
              <button class="fr-btn fr-btn--secondary fr-btn--sm fr-mt-1w sas-btn-full">
                Demande de prise en charge
              </button>
            </div>

          </div>
        </div>
      </div>
    </article>`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Render a list of OrgOffer objects into the #offers-grid container.
 *
 * @param {object[]} offers
 * @param {string}   containerId
 * @param {string}   countId
 */
export function renderOrgOffers(offers, containerId = 'offers-grid', countId = 'results-count') {
  const container    = document.getElementById(containerId);
  const countElement = document.getElementById(countId);

  if (!container) {
    console.warn(`[renderer-org] Container "#${containerId}" not found.`);
    return;
  }

  if (countElement) {
    const n = offers.length;
    countElement.textContent = `${n} résultat${n > 1 ? 's' : ''}`;
  }

  if (!offers?.length) {
    container.innerHTML = `
      <div class="fr-col-12">
        <p class="fr-text--sm fr-text--mention-grey fr-m-2w">Aucun résultat trouvé.</p>
      </div>`;
    return;
  }

  container.innerHTML = offers.map(renderOrgCard).join('');
  if (typeof window.dsfr !== 'undefined') window.dsfr.start();
}

/**
 * Merge and render PS-indiv offers and Org offers in the same grid.
 * PS-indiv cards first, org cards appended after.
 *
 * @param {object[]} psOffers
 * @param {object[]} orgOffers
 * @param {string}   containerId
 * @param {string}   countId
 */
export function renderMergedOffers(psOffers = [], orgOffers = [], containerId = 'offers-grid', countId = 'results-count') {
  const container    = document.getElementById(containerId);
  const countElement = document.getElementById(countId);

  if (!container) {
    console.warn(`[renderer-org] Container "#${containerId}" not found.`);
    return;
  }

  const total = psOffers.length + orgOffers.length;

  if (!total) {
    if (countElement) countElement.textContent = '0 résultat';
    container.innerHTML = `
      <div class="fr-col-12">
        <p class="fr-text--sm fr-text--mention-grey fr-m-2w">Aucun résultat trouvé.</p>
      </div>`;
    return;
  }

  import('./renderer.js').then(({ renderOffers }) => {
    // 1. Render PS-indiv cards (sets innerHTML + count)
    renderOffers(psOffers, containerId, countId);

    // 2. Append org cards
    container.insertAdjacentHTML('beforeend', orgOffers.map(renderOrgCard).join(''));

    // 3. Update total count
    if (countElement) {
      countElement.textContent = `${total} résultat${total > 1 ? 's' : ''}`;
    }

    if (typeof window.dsfr !== 'undefined') window.dsfr.start();
  });
}