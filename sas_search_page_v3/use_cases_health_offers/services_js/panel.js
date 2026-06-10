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

  // 📝 1. Remplir le panneau avec les données du professionnel
  function populatePanel(data) {
    const $ = (id) => document.getElementById(id);

    $('panel-title').textContent     = data.name     || '—';
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