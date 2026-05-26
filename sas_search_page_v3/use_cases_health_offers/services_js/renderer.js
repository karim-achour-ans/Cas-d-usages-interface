/**
 * renderer.js
 * Single responsibility: render normalized HealthOffer objects into the DOM.
 * No fetching, no parsing, no business logic.
 */

// ─── Formatting helpers ────────────────────────────────────────────────────

function formatDisplayName(offer) {
  return [offer.title, offer.firstname, offer.name].filter(Boolean).join(' ');
}

function formatAddress(address) {
  if (!address) return null;
  return [address.line?.[0], address.postalCode, address.city].filter(Boolean).join(', ');
}

/**
 * Format an ISO 8601 datetime to "HHhMM".
 * @param {string} iso
 * @returns {string} e.g. "09h00"
 */
function formatSlotTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

// ─── Slot button (maquette) ────────────────────────────────────────────────

/**
 * Render a single slot button matching the design mockup.
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │  08h15–8h30          [0/1]  │  ← header row
 *   │  [🏥] [📷]      [🗑] [✏️]  │  ← icons row
 *   └─────────────────────────────┘
 *
 * Background colour is controlled by the parent .sas-slot-day nth-child rule in CSS.
 *
 * @param {{ start: string, end: string|null }} slot
 * @returns {string} HTML string
 */
export function renderSlotButton(slot) {
  const startLabel = formatSlotTime(slot.start);
  const endLabel   = slot.end ? formatSlotTime(slot.end) : null;
  const timeRange  = endLabel ? `${startLabel}–${endLabel}` : startLabel;

  return `
    <button class="sas-slot-btn js-open-panel" type="button"
            aria-label="Créneau ${timeRange}">
      <span class="sas-slot-time">${timeRange}</span>
      <div class="sas-slot-footer">
        <span class="sas-slot-counter" aria-label="0 réservation sur 1">0/1</span>
        <span class="sas-slot-icon" aria-label="Téléconsultation">T</span>
        <span class="sas-slot-icon" aria-label="Consultation">C</span>
        <span class="sas-slot-icon" aria-label="Visite">V</span>
      </div>
    </button>`;
}

// ─── Slot columns ──────────────────────────────────────────────────────────

/**
 * Build the 3-column day structure from a { start, end }[] array.
 * Reference day D = date of the earliest slot.
 *
 * @param {{ start: string, end: string|null }[]} slots
 * @returns {{ label: string, key: string, slots: { start: string, end: string|null }[] }[]}
 */
function buildSlotColumns(slots) {
  const slotArray = slots ?? [];

  if (!slotArray.length) {
    const today = new Date();
    return [0, 1, 2].map(offset => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return { label: formatDayLabel(d), key: toDateKey(d), slots: [] };
    });
  }

  const earliest = new Date(slotArray[0].start);
  const columns  = [0, 1, 2].map(offset => {
    const d = new Date(earliest);
    d.setDate(d.getDate() + offset);
    return { label: formatDayLabel(d), key: toDateKey(d), slots: [] };
  });

  for (const slot of slotArray) {
    const key = toDateKey(new Date(slot.start));
    const col = columns.find(c => c.key === key);
    if (col) col.slots.push(slot);
  }

  return columns;
}

/**
 * Render the 3-day slot columns HTML.
 * Accepts { start, end }[] from offer.slots (preferred)
 * or falls back to string[] from offer.slotStarts.
 *
 * @param {{ start: string, end: string|null }[] | string[]} slots
 * @returns {string} HTML
 */
export function renderSlotColumns(slots) {
  // Normalise: accept legacy string[] as { start, end: null }[]
  const normalised = (slots ?? []).map(s =>
    typeof s === 'string' ? { start: s, end: null } : s
  );

  const columns = buildSlotColumns(normalised);

  return columns.map(col => `
    <div class="sas-slot-day">
      <p class="sas-slot-day-label">${col.label}</p>
      <div class="sas-slot-day-list">
        ${col.slots.length
          ? col.slots.map(renderSlotButton).join('')
          : `<p class="fr-text--xs fr-text--mention-grey fr-mb-0">—</p>`
        }
      </div>
    </div>`).join('');
}

// ─── Availability / mode helpers ───────────────────────────────────────────

function computeDispo(slotStarts) {
  if (!slotStarts?.length) return '';
  const diffH = (new Date(slotStarts[0]) - Date.now()) / 3_600_000;
  if (diffH < 4)  return 'sous4h';
  if (diffH < 8)  return '4a8h';
  return 'plus12h';
}

function computeMode(offer) {
  return 'cabinet';
}

function normalizeProfession(profession) {
  if (!profession) return '';
  const p = profession.toLowerCase();
  if (p.includes('médecin') || p.includes('medecin')) return 'medecin';
  if (p.includes('infirmier'))                          return 'infirmier';
  if (p.includes('kinésithérapeute') || p.includes('masseur')) return 'kine';
  return p;
}

// ─── Conventionnement badge ────────────────────────────────────────────────

const CONVENTIONNEMENT_MAP = {
  '1': { label: 'Secteur 1',        modifier: 'fr-badge--info',  title: 'Conventionné secteur 1 — tarifs Sécurité Sociale' },
  '2': { label: 'Secteur 2',        modifier: 'fr-badge--info',  title: "Conventionné secteur 2 — dépassements d'honoraires autorisés" },
  '3': { label: 'Non conventionné', modifier: 'fr-badge--error', title: 'Non conventionné par la CNAM' },
};

function renderConventionnementBadge(code, display) {
  if (!code) return '';
  const config = CONVENTIONNEMENT_MAP[code];
  if (config) {
    return `<span class="fr-badge fr-badge--sm ${config.modifier}" title="${config.title}">${config.label}</span>`;
  }
  const fallback = display ?? `Conventionnement ${code}`;
  return `<span class="fr-badge fr-badge--sm" title="Conventionnement CNAM">${fallback}</span>`;
}

// ─── SAS badge ─────────────────────────────────────────────────────────────

const SAS_LABEL_MAP = {
  'Cabinet':          'Participe au SAS',
  'cpts':             'Participe au SAS via CPTS',
  'msp':              'Participe au SAS via MSP',
  'Téléconsultation': 'Participe au SAS (téléconsultation)',
};

function renderSasBadge(sasOk, sasTypes) {
  const matchedType = sasTypes?.find(t => t in SAS_LABEL_MAP);
  return matchedType
    ? sasOk === true
      ? `<span class="fr-badge fr-badge--success fr-badge--sm">${SAS_LABEL_MAP[matchedType]}</span>`
      : `<span class="fr-badge fr-badge--error fr-badge--sm">${SAS_LABEL_MAP[matchedType]} — Non inscrit</span>`
    : `<span class="fr-badge fr-badge--error fr-badge--sm">Non inscrit au SAS</span>`;
}

// ─── Org link (CPTS / MSP) ────────────────────────────────────────────────

/**
 * Resolve the org type from the offer.
 * Priority: offer.orgType (explicit) → inferred from offer.sasTypes.
 *
 * @param {{ orgType?: string, sasTypes?: string[] }} offer
 * @returns {'cpts'|'msp'|null}
 */
function resolveOrgType(offer) {
  if (offer.orgType === 'cpts' || offer.orgType === 'msp') return offer.orgType;
  if (offer.sasTypes?.includes('cpts')) return 'cpts';
  if (offer.sasTypes?.includes('msp'))  return 'msp';
  return null;
}

/**
 * Render a link to the professionals list of the CPTS or MSP
 * the practitioner belongs to.
 *
 * Requires at minimum:
 *   - offer.sasTypes containing 'cpts' or 'msp'  (or offer.orgType set explicitly)
 *   - offer.orgName  — display name of the structure (e.g. "CPTS Paris 19")
 *
 * Optional:
 *   - offer.orgId    — identifier used as ?organization= query param
 *                      (e.g. FINESS, or the FHIR Organization.id)
 *                      Falls back to '#' when absent.
 *
 * Expected offer fields (populated by the assembler from FHIR data):
 *   PractitionerRole.organization → Organization.name   → offer.orgName
 *   PractitionerRole.organization → Organization.id     → offer.orgId
 *   Organization.type (CPTS|MSP)                        → offer.orgType
 *
 * @param {{ sasTypes?: string[], orgType?: string, orgName?: string, orgId?: string }} offer
 * @returns {string} HTML string, or empty string when the link does not apply
 */
function renderOrgLink(offer) {
  const orgType = resolveOrgType(offer);
  if (!orgType || !offer.orgName) return '';

  const labelPrefix = orgType === 'cpts'
    ? `Voir les professionnels de la CPTS`
    : `Voir les professionnels de la MSP`;

  const label = `${labelPrefix} ${offer.orgName}`;

  const href = offer.orgId
    ? `?organization=${encodeURIComponent(offer.orgId)}`
    : '#';

  return `
    <a class="sas-card-org-link fr-link fr-link--sm fr-mt-1w"
       href="${href}"
       aria-label="${label}">
      <span class="fr-icon-group-line fr-mr-1v" aria-hidden="true"></span>
      ${label}
    </a>`;
}

// ─── Card ──────────────────────────────────────────────────────────────────

function renderCard(offer) {
  const displayName = formatDisplayName(offer);
  const addressLine = formatAddress(offer.address);

  const panelData = {
    name:                    displayName,
    specialty:               [offer.profession, offer.specialty].filter(Boolean).join(' — '),
    phone:                   offer.phone,
    address:                 addressLine,
    // Panel uses formatted strings (backward compat with panel.js)
    slots:                   offer.slotStarts?.map(formatSlotTime) || [],
    sasOk:                   offer.sasOk,
    sasTypes:                offer.sasTypes ?? [],
    conventionnementCode:    offer.conventionnementCode,
    conventionnementDisplay: offer.conventionnementDisplay,
    comment:                 offer.comment,
    operationalActivity:     offer.operationalActivity,
    specificActs:            offer.specificActs ?? [],
    ps:                      offer.notes || "Aucune information complémentaire.",
    access:                  offer.accessibility || "Accessible PMR",
    tariffs:                 offer.tariffInfo || "Tarif conventionné Sécurité Sociale",
    languages:               offer.languages || [],
    // ── Organisation (CPTS / MSP) ──────────────────────────────────────────
    // Populated by the assembler from PractitionerRole.organization → Organization
    orgType:                 resolveOrgType(offer),
    orgName:                 offer.orgName  ?? null,
    orgId:                   offer.orgId    ?? null,
  };

  const sasBadge              = renderSasBadge(offer.sasOk, offer.sasTypes);
  const conventionnementBadge = renderConventionnementBadge(
    offer.conventionnementCode,
    offer.conventionnementDisplay,
  );
  const orgLink               = renderOrgLink(offer);

  return `
    <article class="fr-col-12 js-practitioner-card"
             data-sas="${offer.sasOk === true ? 'true' : 'false'}"
             data-pdsa="false"
             data-orgtype="ps-indiv"
             data-profession="${normalizeProfession(offer.profession)}"
             data-specialty="${offer.specialty ?? ''}"
             data-dispo="${computeDispo(offer.slotStarts)}"
             data-mode="${computeMode(offer)}"
             data-panel='${JSON.stringify(panelData).replace(/'/g, "&apos;")}'>
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content sas-card-layout">

            <!-- ── Col 1 : identité du PS ─────────────────────────────── -->
            <div class="sas-card-info">
              <h3 class="fr-card__title fr-mb-0 js-open-panel"
                  tabindex="0" role="button"
                  title="Voir les détails de ${displayName || 'ce professionnel'}"
                  aria-label="Ouvrir les détails de ${displayName || 'ce professionnel'}">
                ${displayName || '—'}
              </h3>

              <div class="fr-badges-group fr-mt-1w">
                ${sasBadge}
                ${conventionnementBadge}
              </div>

              ${offer.phone ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0 fr-mt-1w">
                <a href="tel:${offer.phone}">${offer.phone}</a>
              </p>` : ''}

              ${addressLine ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                ${addressLine}
              </p>` : ''}

              ${orgLink}
            </div>

            <!-- ── Col 2 : commentaire + activité ────────────────────── -->
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
                <figure class="fr-callout fr-p-2w fr-mt-1w">
                  <p class="fr-text--md">${offer.comment}</p>
                </figure>` : ''}
            </div>

            <!-- ── Col 3 : créneaux + actions ────────────────────────── -->
            <div class="sas-card-slots">
              <div class="sas-slots-grid">
                ${renderSlotColumns(offer.slots ?? offer.slotStarts)}
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

// ─── Public exports ────────────────────────────────────────────────────────

export function renderLoading(containerId = 'offers-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="fr-col-12 fr-py-6w">
      <div class="fr-loader fr-loader--lg fr-mx-auto" role="status"
           aria-label="Chargement des résultats">
        <span class="fr-loader__label">Chargement des professionnels...</span>
      </div>
    </div>`;
}

export function renderError(error, containerId = 'offers-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="fr-col-12">
      <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-4w">
        <h3 class="fr-alert__title">Erreur de chargement</h3>
        <p>${error.message}</p>
        <button class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-mt-1w"
                onclick="location.reload()">Réessayer</button>
      </div>
    </div>`;
}

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
        <p class="fr-text--sm fr-text--mention-grey fr-m-2w">Aucun résultat trouvé.</p>
      </div>`;
    return;
  }

  container.innerHTML = offers.map(renderCard).join('');

  if (typeof window.dsfr !== 'undefined') window.dsfr.start();
}