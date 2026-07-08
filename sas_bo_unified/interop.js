/* ==================================================================
   BO Interopérabilité — coquille (pages vides).
   Rôles : ROLE_AUTHENTICATED_USER, ROLE_MANAGER, ROLE_ADMINISTRATOR.
   Accessible uniquement aux identités portant l'habilitation « interop ».
   Premier flux prévu : « GESTION COMPTES RÉGULATEURS » (6 onglets).
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id){ return document.getElementById(id); }

// Sections & onglets du BO (pour l'instant en pages vides)
const INTEROP_NAV = [
  { section: "Gestion comptes régulateurs", items: [
    { key: "flux-editeurs",    icon: "fr-icon-list-unordered", label: "Gestion des flux éditeurs" },
    { key: "regulateurs",      icon: "fr-icon-list-unordered", label: "Gestion des régulateurs" },
    { key: "messages-erreur",  icon: "fr-icon-list-unordered", label: "Messages d'erreur" },
    { key: "controleur-fhir",  icon: "fr-icon-settings-5-line", label: "Contrôleur FHIR" },
    { key: "relance-flux",     icon: "fr-icon-settings-5-line", label: "Relance flux régulateur" },
    { key: "curl",             icon: "fr-icon-settings-5-line", label: "Requêtes cURL paramétrables" },
  ]},
];
const ALL_ITEMS = INTEROP_NAV.flatMap(s => s.items);

const state = {
  identityIdx: currentIdentityIdx(),
  view: ALL_ITEMS[0].key,
};
function identity(){ return IDENTITIES[state.identityIdx]; }
function interopHab(){ return identity().interop; }

function renderSidebar() {
  const nav = el("sidebar-nav");
  const denied = !interopHab();

  let html = `<a class="nav-item nav-portal" href="${urlWithIdentity("index.html", state.identityIdx)}">
      <span class="fr-icon-arrow-left-line" aria-hidden="true"></span>Portail
    </a>`;
  if (!denied) {
    INTEROP_NAV.forEach(sec => {
      html += `<div class="nav-section">${esc(sec.section)}</div>`;
      html += sec.items.map(it => `
        <button class="nav-item ${state.view === it.key ? "is-active" : ""}" data-view="${it.key}">
          <span class="${it.icon}" aria-hidden="true"></span>${esc(it.label)}
        </button>`).join("");
    });
  }
  nav.innerHTML = html;
  nav.querySelectorAll(".nav-item[data-view]").forEach(b => b.onclick = () => { state.view = b.dataset.view; render(); });

  const sel = el("identity-select");
  sel.innerHTML = IDENTITIES.map((i, k) => `<option value="${k}">${esc(i.label)}</option>`).join("");
  sel.value = state.identityIdx;
  sel.onchange = () => gotoWithIdentity("interop.html", Number(sel.value));
}

function render() {
  renderSidebar();
  const hab = interopHab();
  const main = el("interop-view");

  if (!hab) {
    main.innerHTML = `
      <div class="fr-alert fr-alert--warning" style="margin-top:1rem;">
        <h1 class="fr-alert__title" style="font-size:1.1rem;">Accès non autorisé</h1>
        <p>Le profil « ${esc(identity().label)} » n'a pas d'habilitation sur l'arrière-guichet Interopérabilité.</p>
        <p><a class="fr-link" href="${urlWithIdentity("index.html", state.identityIdx)}">← Retour au portail</a></p>
      </div>`;
    return;
  }

  const item = ALL_ITEMS.find(i => i.key === state.view) || ALL_ITEMS[0];
  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">${esc(item.label)}</h1>
        <p class="page-sub">Gestion comptes régulateurs</p>
      </div>
      <span class="fr-badge fr-badge--sm fr-badge--info">${esc(INTEROP_ROLE_LABEL[hab.role] || hab.role)}</span>
    </div>
    <div class="stub">
      <div class="stub__icon ${esc(item.icon)}" aria-hidden="true"></div>
      <h2>${esc(item.label)}</h2>
      <p>Page en construction — fonctionnalités à définir.</p>
    </div>`;
}

document.addEventListener("DOMContentLoaded", render);
