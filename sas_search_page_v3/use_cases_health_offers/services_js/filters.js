/* ─────────────────────────────
   HELPERS
───────────────────────────── */
function getCards() {
  return Array.from(document.querySelectorAll('.js-practitioner-card'));
}

function getChecked(ids) {
  return ids
    .map(id => document.getElementById(id))
    .filter(el => el?.checked)
    .map(el => el.value);
}

/* ─────────────────────────────
   FILTER STATE
───────────────────────────── */
function getFilters() {
  return {
    type:      getChecked(['filter-sas', 'filter-pdsa']),
    // Unified filter: profession (PS) + specialty (PS) + org type (structures)
    category:  getChecked(['filter-medecin', 'filter-mg', 'filter-infirmier', 'filter-kine',
                           'filter-sos', 'filter-mmg', 'filter-cds']),
    dispo:     getChecked(['filter-4h', 'filter-8h', 'filter-12h']),
    mode:      getChecked(['filter-cabinet', 'filter-domicile', 'filter-visio']),
  };
}

/* ─────────────────────────────
   APPLY FILTERS
───────────────────────────── */
function applyFilters() {
  const filters = getFilters();
  const cards = getCards();

  cards.forEach(card => {
    let visible = true;

    // ── TYPE filter (SAS / PDSA) ──────────────────────────────────────────
    // SAS  → cards where data-sas="true"
    // PDSA → cards where data-pdsa="true" (PFG + MMG)
    if (filters.type.length) {
      const isSas  = card.dataset.sas  === 'true';
      const isPdsa = card.dataset.pdsa === 'true';
      visible =
        (filters.type.includes('sas')  && isSas)  ||
        (filters.type.includes('pdsa') && isPdsa);
    }

    // ── CATEGORY filter (profession | specialty | org type) ─────────────
    if (visible && filters.category.length) {
      const prof    = (card.dataset.profession ?? '').toLowerCase();
      const spec    = (card.dataset.specialty  ?? '').toLowerCase();
      const orgType = (card.dataset.orgtype    ?? '').toLowerCase();

      visible = filters.category.some(cat => {
        switch (cat) {
          case 'medecin':   return prof === 'medecin';
          case 'mg':        return spec.includes('générale') || spec.includes('generale');
          case 'infirmier': return prof === 'infirmier';
          case 'kine':      return prof === 'kine';
          case 'sos':       return orgType === 'pfg' || orgType === 'pfc';
          case 'mmg':       return orgType === 'mmg';
          case 'cds':       return orgType === 'centre_sante';
          default:          return false;
        }
      });
    }

    // ── DISPONIBILITÉ filter ─────────────────────────────────────────────
    if (visible && filters.dispo.length) {
      visible = filters.dispo.includes(card.dataset.dispo);
    }

    // ── MODE filter (multi-value: "cabinet visio") ────────────────────────
    if (visible && filters.mode.length) {
      const cardModes = (card.dataset.mode ?? '').split(' ').filter(Boolean);
      visible = filters.mode.some(m => cardModes.includes(m));
    }

    card.style.display = visible ? '' : 'none';
  });

  renderTags(filters);
  updateCount();
  updateFilterCounts();
}

/* ─────────────────────────────
   MULTI SELECT DROPDOWN (DSFR STYLE)
───────────────────────────── */
function initMultiSelectDropdown(btnId, panelId) {
  const btn = document.getElementById(btnId);
  const panel = document.getElementById(panelId);

  if (!btn || !panel) return;

  const open = () => {
    btn.setAttribute('aria-expanded', 'true');
    panel.style.display = 'block';
  };

  const close = () => {
    btn.setAttribute('aria-expanded', 'false');
    panel.style.display = 'none';
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    isOpen ? close() : open();
  });

  panel.addEventListener('click', (e) => {
    e.stopPropagation(); // allow checkbox clicks
  });

  document.addEventListener('click', close);
}

/* ─────────────────────────────
   SELECT ALL (TYPE ONLY)
───────────────────────────── */
function initSelectAll() {
  const btn = document.getElementById('toggle-all-type');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const boxes = ['filter-sas', 'filter-pdsa']
      .map(id => document.getElementById(id))
      .filter(Boolean);

    const allChecked = boxes.every(b => b.checked);

    boxes.forEach(b => (b.checked = !allChecked));

    applyFilters();
  });
}

/* ─────────────────────────────
   TAGS (DSFR STYLE)
───────────────────────────── */
function renderTags(filters) {
  const container = document.getElementById('active-filters');
  const group = container?.querySelector('.fr-tags-group');

  if (!container || !group) return;

  group.innerHTML = '';

  const labels = {
    // Type
    sas:      'SAS',
    pdsa:     'PDSA',
    // Category (profession / specialty / org type)
    medecin:  'Médecin',
    mg:       'Médecine générale',
    infirmier:'Infirmier',
    kine:     'Kiné',
    sos:      'SOS Médecins',
    mmg:      'Maison médicale de garde',
    cds:      'Centre de santé',
    // Dispo
    sous4h:   '< 4h',
    '4a8h':   '4–8h',
    plus12h:  '> 12h',
    // Mode
    cabinet:  'Cabinet',
    domicile: 'Domicile',
    visio:    'Visio',
  };

  let hasFilters = false;

  Object.entries(filters).forEach(([_, values]) => {
    values.forEach(v => {
      hasFilters = true;

      const tag = document.createElement('button');
      tag.className = 'fr-tag fr-tag--dismiss';
      tag.type = 'button';
      tag.textContent = labels[v] || v;

      tag.addEventListener('click', () => {
        const el = document.querySelector(`input[value="${v}"]`);
        if (el) el.checked = false;
        applyFilters();
      });

      group.appendChild(tag);
    });
  });

  container.hidden = !hasFilters;
}

/* ─────────────────────────────
   RESET + COUNT
───────────────────────────── */
function resetFilters() {
  document
    .querySelectorAll('#filters-section input[type="checkbox"]')
    .forEach(i => (i.checked = false));

  applyFilters();
}

function updateCount() {
  const visible = getCards().filter(c => c.style.display !== 'none');
  const el = document.getElementById('results-count');
  if (el) el.textContent = visible.length;
}

/* ─────────────────────────────
   🚀 AUTO-INITIALISATION (Module Scope)
───────────────────────────── */
(function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFilters);
  } else {
    // Petit délai pour laisser le temps au rendu dynamique des cartes
    setTimeout(setupFilters, 150);
  }
})();

function setupFilters() {
  // 1. Initialisation des dropdowns multi-select
  initMultiSelectDropdown('type-filter-btn', 'type-filter-panel');
  initMultiSelectDropdown('category-filter-btn', 'category-filter-panel');
  initMultiSelectDropdown('dispo-filter-btn', 'dispo-filter-panel');
  initMultiSelectDropdown('mode-filter-btn', 'mode-filter-panel');

  // 2. Event delegation sur les checkboxes (plus robuste)
  const filtersSection = document.getElementById('filters-section');
  if (filtersSection) {
    filtersSection.addEventListener('change', (e) => {
      if (e.target.matches('input[type="checkbox"]')) {
        applyFilters();
      }
    });
  }

  // 3. Bouton reset
  document.getElementById('reset-filters')
    ?.addEventListener('click', resetFilters);

  // 4. Select all (si présent dans le HTML)
  initSelectAll();

  // 5. Mise à jour initiale du compteur
  updateCount();
}

/* ─────────────────────────────
   UPDATE FILTER COUNT BADGES
───────────────────────────── */
function updateFilterCounts() {
  const counts = {
    type:     getChecked(['filter-sas', 'filter-pdsa']).length,
    category: getChecked(['filter-medecin', 'filter-mg', 'filter-infirmier', 'filter-kine',
                          'filter-sos', 'filter-mmg', 'filter-cds']).length,
    dispo:    getChecked(['filter-4h', 'filter-8h', 'filter-12h']).length,
    mode:     getChecked(['filter-cabinet', 'filter-domicile', 'filter-visio']).length,
  };

  Object.entries(counts).forEach(([key, count]) => {
    const badge = document.getElementById(`${key}-filter-count`);
    if (badge) {
      badge.textContent = count;
      badge.hidden = count === 0;
      // Change de style si > 1 filtre sélectionné
      badge.classList.toggle('fr-badge--success', count > 1);
      badge.classList.toggle('fr-badge--info', count <= 1);
    }
  });
}

/* ─────────────────────────────
   EXPORT (optionnel, si besoin d'appel manuel)
───────────────────────────── */
export { applyFilters, resetFilters, updateCount };