/**
 * panel.js
 * Gestion du panneau latéral (ouverture, remplissage, fermeture)
 * Compatible ES Modules & DSFR
 */

document.addEventListener('DOMContentLoaded', () => {
  // 🔍 Références DOM
  const panel = document.getElementById('practitioner-panel');
  const overlay = document.getElementById('panel-overlay');
  const closeBtn = panel?.querySelector('.fr-btn--close');

  if (!panel || !overlay) {
    console.warn('[panel] Panneau ou overlay introuvable dans le DOM.');
    return;
  }

  // 📝 1. Remplir le panneau avec les données du professionnel
  function populatePanel(data) {
    const $ = (id) => document.getElementById(id);
    
    $('panel-title').textContent = data.name || '—';
    $('panel-specialty').textContent = data.specialty || '';
    $('panel-address').textContent = data.address || '';
    $('panel-phone').innerHTML = data.phone 
      ? `<a href="tel:${data.phone}">${data.phone}</a>` 
      : 'Non communiqué';

    // Créneaux
    const slotsContainer = $('panel-slots');
    const noSlots = $('panel-no-slots');
    slotsContainer.innerHTML = '';
    
    if (data.slots?.length) {
      noSlots.hidden = true;
      data.slots.forEach(time => {
        const tag = document.createElement('span');
        tag.className = 'fr-tag fr-tag--sm fr-mr-1w fr-mb-1w';
        tag.textContent = time;
        slotsContainer.appendChild(tag);
      });
    } else {
      noSlots.hidden = false;
    }

    // Infos pratiques
    $('panel-access').innerHTML = 
      `<span class="fr-icon-wheelchair-line fr-mr-1w" aria-hidden="true"></span> ${data.access || '—'}`;
    $('panel-tariffs').innerHTML = 
      `<span class="fr-icon-money-euro-circle-line fr-mr-1w" aria-hidden="true"></span> ${data.tariffs || '—'}`;

    // Langues (optionnel)
    const langEl = $('panel-languages');
    if (data.languages?.length) {
      langEl.hidden = false;
      langEl.innerHTML = `<span class="fr-icon-global-line fr-mr-1w" aria-hidden="true"></span> Langues : ${data.languages.join(', ')}`;
    } else {
      langEl.hidden = true;
    }

    // ⭐ Note / PS
    $('panel-ps').textContent = data.ps || 'Aucune information complémentaire.';
  }

  // 🚪 2. Ouvrir le panneau
  function openPanelFromElement(triggerEl) {
    const card = triggerEl.closest('.js-practitioner-card');
    if (!card) return;

    const rawData = card.dataset.panel;
    if (!rawData) return;

    try {
      // Nettoyage des apostrophes encodées puis parsing
      const data = JSON.parse(rawData.replace(/&apos;/g, "'"));
      populatePanel(data); // ✅ Fonction maintenant bien définie et accessible

      panel.hidden = false;
      requestAnimationFrame(() => {
        panel.classList.add('active');
        overlay.classList.add('active');
      });
      document.body.style.overflow = 'hidden'; // Bloque le scroll arrière
    } catch (e) {
      console.error('[panel] Erreur de parsing data-panel:', e);
    }
  }

  // ❌ 3. Fermer le panneau
  function closePanel() {
    panel.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Attendre la fin de la transition CSS avant de masquer
    setTimeout(() => {
      if (!panel.classList.contains('active')) {
        panel.hidden = true;
      }
    }, 300);
  }

  // 🎧 4. Écouteurs d'événements
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  // Clic sur n'importe quel élément déclencheur (.js-open-panel)
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.js-open-panel');
    if (trigger) {
      e.preventDefault();
      openPanelFromElement(trigger);
    }
  });

  // Accessibilité clavier (Entrée / Espace sur le titre)
  document.addEventListener('keydown', (e) => {
    if (e.target.classList?.contains('js-open-panel') && 
        (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openPanelFromElement(e.target);
    }
    // Fermeture avec Échap
    if (e.key === 'Escape' && panel.classList.contains('active')) {
      closePanel();
    }
  });
});