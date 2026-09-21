/**
 * panel.js
 * Gestion du panneau latéral (ouverture, remplissage, fermeture)
 * Compatible ES Modules & DSFR
 */

document.addEventListener('DOMContentLoaded', () => {
  // 🔍 Références DOM
  const panel   = document.getElementById('practitioner-panel');
  const overlay = document.getElementById('panel-overlay');
  const closeBtn = panel?.querySelector('.fr-btn--close');

  if (!panel || !overlay) {
    console.warn('[panel] Panneau ou overlay introuvable dans le DOM.');
    return;
  }

  // ── Déclaration d'indisponibilité par le régulateur (feature OSNP) ────────
  // État en mémoire pour la durée de la session (pas de backend sur ce mock) :
  // Map<offerId, { cause, start, end }>
  const regulatorUnavailability = new Map();
  let currentOfferId = null;

  function $ui(id) { return document.getElementById(id); }

  const CAUSE_LABELS = {
    absence:        'Absence de ce professionnel de santé',
    'cabinet-ferme': 'Cabinet fermé',
    'plus-dispo':    'Plus de disponibilité',
    autres:          'Autres',
  };

  function formatDateFr(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  function refreshCardFlag(offerId) {
    const card = document.querySelector(`.js-practitioner-card[data-offer-id="${offerId}"]`);
    const flagEl = card?.querySelector('[data-regulation-flag]');
    if (flagEl) flagEl.hidden = !regulatorUnavailability.has(offerId);
  }

  // Bascule entre les 3 états visuels de la section : 'empty' | 'form' | 'declared'
  function showUnavailState(state) {
    $ui('panel-unavail-empty').hidden    = state !== 'empty';
    $ui('panel-unavail-form').hidden     = state !== 'form';
    $ui('panel-unavail-declared').hidden = state !== 'declared';
  }

  function renderDeclaredSummary(offerId) {
    const rec = regulatorUnavailability.get(offerId);
    if (!rec) return;
    const causeLabel = CAUSE_LABELS[rec.cause] ?? rec.cause;
    $ui('panel-unavail-summary').textContent =
      `Le professionnel de santé a été déclaré indisponible du ${formatDateFr(rec.start)} `
      + `au ${formatDateFr(rec.end)} (${causeLabel}).`;
  }

  function checkUnavailabilityFormValidity() {
    const cause   = $ui('panel-unavail-cause').value;
    const start   = $ui('panel-unavail-start').value;
    const end     = $ui('panel-unavail-end').value;
    const confirm = $ui('panel-unavail-confirm').checked;
    $ui('panel-unavail-save').disabled = !(cause && start && end && confirm);
  }

  // Affiche l'état adapté à l'ouverture du panel : le formulaire vierge
  // n'est jamais montré directement — seulement 'empty' ou 'declared'.
  function resetUnavailabilityForm(offerId) {
    const existing = regulatorUnavailability.get(offerId);
    if (existing) {
      renderDeclaredSummary(offerId);
      showUnavailState('declared');
    } else {
      showUnavailState('empty');
    }
  }

  // Ouvre le formulaire vierge (nouvelle déclaration)
  function openCreateForm() {
    $ui('panel-unavail-cause').value     = '';
    $ui('panel-unavail-start').value     = '';
    $ui('panel-unavail-end').value       = '';
    $ui('panel-unavail-confirm').checked = false;
    checkUnavailabilityFormValidity();
    showUnavailState('form');
  }

  // Ouvre le formulaire pré-rempli avec la déclaration existante
  function openEditForm() {
    const existing = regulatorUnavailability.get(currentOfferId);
    $ui('panel-unavail-cause').value     = existing?.cause ?? '';
    $ui('panel-unavail-start').value     = existing?.start ?? '';
    $ui('panel-unavail-end').value       = existing?.end   ?? '';
    $ui('panel-unavail-confirm').checked = false;
    checkUnavailabilityFormValidity();
    showUnavailState('form');
  }

  function cancelForm() {
    resetUnavailabilityForm(currentOfferId);
  }

  function saveUnavailability() {
    if (!currentOfferId) return;

    const start = $ui('panel-unavail-start').value;
    const end   = $ui('panel-unavail-end').value;

    if (new Date(end) < new Date(start)) {
      alert("La date de fin doit être postérieure à la date de début.");
      return;
    }

    regulatorUnavailability.set(currentOfferId, {
      cause: $ui('panel-unavail-cause').value,
      start,
      end,
    });

    refreshCardFlag(currentOfferId);
    renderDeclaredSummary(currentOfferId);
    showUnavailState('declared');
  }

  function deleteUnavailability() {
    if (!currentOfferId) return;
    regulatorUnavailability.delete(currentOfferId);
    refreshCardFlag(currentOfferId);
    showUnavailState('empty');
  }

  ['panel-unavail-cause', 'panel-unavail-start', 'panel-unavail-end', 'panel-unavail-confirm']
    .forEach(id => $ui(id)?.addEventListener('change', checkUnavailabilityFormValidity));

  $ui('panel-unavail-create-btn')?.addEventListener('click', openCreateForm);
  $ui('panel-unavail-edit-btn')?.addEventListener('click', openEditForm);
  $ui('panel-unavail-cancel-btn')?.addEventListener('click', cancelForm);
  $ui('panel-unavail-save')?.addEventListener('click', saveUnavailability);
  $ui('panel-unavail-delete-btn')?.addEventListener('click', deleteUnavailability);

  // 📝 1. Remplir le panneau avec les données du professionnel
  function populatePanel(data) {
    const $ = (id) => document.getElementById(id);

    $('panel-title').textContent = data.identifier
      ? `${data.name || '—'} - [${data.identifier}]`
      : (data.name || '—');
    $('panel-specialty').textContent = data.specialty || '';
    $('panel-address').textContent   = data.address   || '';
    $('panel-phone').innerHTML = data.phone
      ? `<a href="tel:${data.phone}">${data.phone}</a>`
      : 'Non communiqué';

    // ── Lien vers les professionnels de la CPTS / MSP ─────────────────────
    // L'élément #panel-org-link est créé dynamiquement s'il n'existe pas encore
    // (évite de modifier index.html). Il est inséré après #panel-phone dans la
    // même <ul> de coordonnées.
    const phoneEl = $('panel-phone');
    let orgLinkEl = $('panel-org-link');

    if (!orgLinkEl && phoneEl?.parentNode) {
      orgLinkEl    = document.createElement('li');
      orgLinkEl.id = 'panel-org-link';
      orgLinkEl.className = 'fr-mb-0 fr-mt-1w';
      phoneEl.parentNode.appendChild(orgLinkEl);
    }

    if (orgLinkEl) {
      if (data.orgType && data.orgName) {
        const prefix = data.orgType === 'cpts' ? 'de la CPTS' : 'du MSP';
        const href   = data.orgId
          ? `?organization=${encodeURIComponent(data.orgId)}`
          : '#';

        orgLinkEl.hidden = false;
        orgLinkEl.innerHTML = `
          <a href="${href}" class="fr-link fr-link--sm fr-icon-group-line fr-link--icon-left">
            Voir les professionnels ${prefix} ${data.orgName}
          </a>`;
      } else {
        orgLinkEl.hidden = true;
      }
    }

    // ── Note / PS ──────────────────────────────────────────────────────────
    // (section supprimée — infos pratiques retirées de l'interface)

    // ── Information complémentaire ──────────────────────────────────────────
    const commentEl = $('panel-comment');
    if (commentEl) {
      commentEl.textContent = data.comment || 'Aucune information complémentaire renseignée.';
    }

    // ── Offre de soins : activité opérationnelle ────────────────────────────
    const activityEl = $('panel-operational-activity');
    if (activityEl) {
      activityEl.textContent = data.operationalActivity || 'Non renseignée.';
    }

    // ── Offre de soins : actes et équipements spécifiques ───────────────────
    const actsEl = $('panel-specific-acts');
    if (actsEl) {
      if (Array.isArray(data.specificActs) && data.specificActs.length) {
        actsEl.innerHTML = data.specificActs
          .map(act => `<span class="fr-badge fr-badge--sm fr-mr-1w fr-mb-1w">${act}</span>`)
          .join('');
      } else {
        actsEl.innerHTML = `<p class="fr-text--sm fr-text--default-grey fr-mb-0">Aucun acte spécifique renseigné.</p>`;
      }
    }
    // ── Information spécifique : déclaration d'indisponibilité (régulateur) ──
    currentOfferId = data.id ?? null;
    if (currentOfferId) {
      // Pré-alimente l'état en mémoire depuis la donnée du bundle (une
      // indisponibilité déjà déclarée en amont, pas via ce formulaire),
      // sans écraser une déclaration déjà faite pendant cette session.
      if (data.regulatorUnavailability && !regulatorUnavailability.has(currentOfferId)) {
        regulatorUnavailability.set(currentOfferId, data.regulatorUnavailability);
      }
      resetUnavailabilityForm(currentOfferId);
    }
  }

  // 🚪 2. Ouvrir le panneau
  function openPanelFromElement(triggerEl) {
    const card = triggerEl.closest('.js-practitioner-card');
    if (!card) return;

    const rawData = card.dataset.panel;
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData.replace(/&apos;/g, "'"));
      populatePanel(data);

      panel.hidden = false;
      requestAnimationFrame(() => {
        panel.classList.add('active');
        overlay.classList.add('active');
      });
      document.body.style.overflow = 'hidden';
    } catch (e) {
      console.error('[panel] Erreur de parsing data-panel:', e);
    }
  }

  // ❌ 3. Fermer le panneau
  function closePanel() {
    panel.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';

    setTimeout(() => {
      if (!panel.classList.contains('active')) {
        panel.hidden = true;
      }
    }, 300);
  }

  // 🎧 4. Écouteurs d'événements
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.js-open-panel');
    if (trigger) {
      e.preventDefault();
      openPanelFromElement(trigger);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.classList?.contains('js-open-panel') &&
        (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openPanelFromElement(e.target);
    }
    if (e.key === 'Escape' && panel.classList.contains('active')) {
      closePanel();
    }
  });
});