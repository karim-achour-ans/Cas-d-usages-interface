/**
 * renderer-org.js
 * Renders normalized OrgOffer objects (Location/Organization bundle type)
 * into DSFR fr-card components that slot into the same #offers-grid container.
 *
 * Re-uses the shared slot-column helpers from renderer.js via import,
 * but produces a dedicated card layout suited to structures (no practitioner name).
 */

import {
  renderLoading,
  renderError,
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

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function buildSlotColumns(slotStarts) {
  const base = slotStarts?.length ? new Date(slotStarts[0]) : new Date();
  const columns = [0, 1, 2].map(offset => {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    return { label: formatDayLabel(d), key: toDateKey(d), slots: [] };
  });
  for (const iso of (slotStarts ?? [])) {
    const key = toDateKey(new Date(iso));
    const col = columns.find(c => c.key === key);
    if (col) col.slots.push(iso);
  }
  return columns;
}

function renderSlotColumns(slotStarts) {
  return buildSlotColumns(slotStarts).map(col => `
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

// ── Organisation type badge ────────────────────────────────────────────────────

const ORG_TYPE_BADGE = {
  'SOS Médecins':             'fr-badge--blue-cumulus',
  'Centre de santé':          'fr-badge--blue-cumulus',
  'Maison médicale de garde': 'fr-badge--blue-cumulus',
};

// Human-readable SOS subtype labels
const SOS_SUBTYPE_LABEL = {
  PFG: 'Point Fixe de Garde',
  PFC: 'Point Fixe de Consultation',
};

/**
 * Render the organisation type badge.
 * For SOS Médecins, appends the PFG/PFC subtype label.
 */
function renderOrgTypeBadge(orgType, sosSubtype) {
  if (!orgType) return '';
  const cls   = ORG_TYPE_BADGE[orgType] ?? 'fr-badge--info';
  const label = orgType === 'SOS Médecins' && sosSubtype
    ? `SOS Médecins — ${SOS_SUBTYPE_LABEL[sosSubtype] ?? sosSubtype}`
    : orgType;
  return `<span class="fr-badge fr-badge--sm ${cls}">${label}</span>`;
}

function renderSasBadge(sasOk, sasTypes) {
  if (sasOk !== true) return '';
  const label = sasTypes?.length
    ? `Participe au SAS`
    : 'Participe au SAS';
  return `<span class="fr-badge fr-badge--success fr-badge--sm">${label}</span>`;
}

function renderServiceTypeBadges(serviceTypes) {
  const labels = { AMB: 'Cabinet', VR: 'Téléconsultation' };
  return (serviceTypes ?? []).map(code =>
    labels[code]
      ? `<span class="fr-badge fr-badge--sm fr-badge--info">${labels[code]}</span>`
      : ''
  ).join('');
}

function formatHours(hoursOfOperation) {
  if (!hoursOfOperation?.length) return null;
  const dayNames = { mon:'Lun', tue:'Mar', wed:'Mer', thu:'Jeu', fri:'Ven', sat:'Sam', sun:'Dim' };
  return hoursOfOperation.map(h => {
    const days = (h.daysOfWeek ?? []).map(d => dayNames[d] ?? d).join(', ');
    if (h.allDay) return `${days} : 24h/24`;
    const open  = h.openingTime?.slice(0,5) ?? '?';
    const close = h.closingTime?.slice(0,5) ?? '?';
    return `${days} : ${open}–${close}`;
  }).join(' | ');
}

// ── Card renderer ──────────────────────────────────────────────────────────────

function renderOrgCard(offer) {
  const addressLine = formatAddress(offer.address);
  const hoursLabel  = formatHours(offer.hoursOfOperation);

  const panelData = {
    name:         offer.locationName ?? offer.orgName ?? '—',
    specialty:    [offer.orgType, offer.orgName].filter(Boolean).join(' — '),
    phone:        offer.phone,
    address:      addressLine,
    slots:        offer.slotStarts?.map(formatSlotTime) ?? [],
    sasOk:        offer.sasOk,
    sasTypes:     offer.sasTypes ?? [],
    comment:      offer.description ?? null,
    operationalActivity: hoursLabel,
    specificActs: offer.serviceTypes?.map(c => c === 'AMB' ? 'Consultation sur place' : 'Téléconsultation') ?? [],
    ps:           offer.siret ? `SIRET : ${offer.siret}` : 'Aucune information complémentaire.',
    access:       'Accessible PMR',
    tariffs:      'Tarif conventionné Sécurité Sociale',
    languages:    [],
    bundleType:   'organization',
  };

  // Compute the filter-facing orgtype value:
  // SOS_MEDECINS → PFG or PFC depending on sosSubtype
  // MMG → 'MMG', CENTRE_SANTE → 'CENTRE_SANTE'
  const orgTypeCode = (() => {
    const base = offer.orgType;
    if (base === 'SOS Médecins') return offer.sosSubtype ?? 'PFG'; // PFG or PFC
    if (base === 'Maison médicale de garde') return 'MMG';
    return 'CENTRE_SANTE';
  })();

  // PDSA filter applies to PFG and MMG
  const isPdsa = orgTypeCode === 'PFG' || orgTypeCode === 'MMG';
  const displayName = offer.locationName ?? offer.orgName ?? '—';


  return `
<article class="fr-col-12 js-practitioner-card"
         data-sas="${offer.sasOk ? 'true' : 'false'}"
         data-pdsa="${isPdsa ? 'true' : 'false'}"
         data-orgtype="${orgTypeCode}"
         data-panel='${JSON.stringify(panelData).replace(/'/g, "&apos;")}'>
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content sas-card-layout">

            <!-- Col 1: structure identity -->
            <div class="sas-card-info">
              <h3 class="fr-card__title fr-mb-0 js-open-panel"
                  tabindex="0" role="button"
                  aria-label="Ouvrir les détails de ${displayName}">
                ${displayName}
              </h3>

              <div class="fr-badge-group fr-mt-1w" style="flex-wrap:wrap;gap:.3rem;">
                ${renderOrgTypeBadge(offer.orgType, offer.sosSubtype)}
                ${renderSasBadge(offer.sasOk, offer.sasTypes)}
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

            <!-- Col 2: description + hours + service types -->
            <div class="sas-card-comment">

              ${offer.orgName && offer.orgName !== offer.locationName ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                <strong>${offer.orgName}</strong>
              </p>` : ''}

              ${offer.description ? `
              <figure class="fr-quote">
                <p class="fr-text--md"><em>${offer.description}</em></p>
              </figure>` : ''}

              ${hoursLabel ? `
              <p class="fr-text--xs fr-text--mention-grey fr-mb-0">
                🕐 ${hoursLabel}
              </p>` : ''}

              <div class="fr-badge-group fr-mt-1w" style="flex-wrap:wrap;gap:.3rem;">
                ${renderServiceTypeBadges(offer.serviceTypes)}
              </div>
            </div>

            <!-- Col 3: slot columns + CTA -->
            <div class="sas-card-slots">
              <div class="sas-slots-grid">
                ${renderSlotColumns(offer.slotStarts)}
              </div>
              <button class="fr-btn fr-btn--sm fr-mt-1w sas-btn-full">
                Orientation hors disponibilité
              </button>
              <button class="fr-btn--secondary fr-btn--sm fr-mt-1w sas-btn-full">
                Demande de prise en charge
              </button>
            </div>

          </div>
        </div>
      </div>
    </article>
  `;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Render a list of OrgOffer objects into the #offers-grid container.
 * Can be called standalone or merged with PS-indiv results.
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
 * Merge and render both PS-indiv offers and Org offers in the same grid.
 * PS-indiv cards appear first; org cards follow.
 *
 * @param {object[]} psOffers   - From assembler.js / renderer.js renderCard logic
 * @param {object[]} orgOffers  - From assembler-org.js / parser-org.js
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

  if (countElement) {
    countElement.textContent = `${total} résultat${total > 1 ? 's' : ''}`;
  }

  if (!total) {
    container.innerHTML = `
      <div class="fr-col-12">
        <p class="fr-text--sm fr-text--mention-grey fr-m-2w">Aucun résultat trouvé.</p>
      </div>`;
    return;
  }

  // Import renderOffers lazily to produce PS-indiv HTML
  // We render org cards here; PS-indiv cards are rendered via the shared renderCard
  // by delegating to the existing renderOffers from renderer.js.
  // Strategy: build a combined innerHTML — org cards use renderOrgCard,
  // PS cards rely on renderer.js's internal renderCard (not exported).
  // To avoid duplicating renderCard, we render PS cards first via renderOffers,
  // then append org cards.
  import('./renderer.js').then(({ renderOffers }) => {
    // Render PS offers
    renderOffers(psOffers, containerId, countId);

    // Append org offers
    const orgHtml = orgOffers.map(renderOrgCard).join('');
    container.insertAdjacentHTML('beforeend', orgHtml);

    // Update count
    if (countElement) {
      countElement.textContent = `${total} résultat${total > 1 ? 's' : ''}`;
    }

    if (typeof window.dsfr !== 'undefined') window.dsfr.start();
  });
}