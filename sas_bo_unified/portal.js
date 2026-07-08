/* ==================================================================
   Portail — page d'accueil de la suite Arrière-guichet SAS.
   Affiche une tuile par arrière-guichet (composant technique) ;
   accessible uniquement si l'identité active porte l'habilitation.
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

// Libellé du rôle selon le périmètre d'habilitation
function acRoleLabel(hab) {
  const map = { administrateur: "Administrateur", gestionnaire_compte: "Gestionnaire de compte" };
  const r = map[hab.role] || hab.role;
  return hab.territoire ? `${r} — ${hab.territoire}` : r;
}
function interopRoleLabel(hab) { return INTEROP_ROLE_LABEL[hab.role] || hab.role; }

// Arrière-guichets de la suite — un élément par composant technique.
// `require` = habilitation nécessaire ("acces" ou "interop").
const ARRIERE_GUICHETS = [
  {
    key: "keycloak", require: "acces", page: "acces.html?component=keycloak",
    icon: "fr-icon-user-line", tech: "Keycloak",
    title: "Gestion des utilisateurs",
    desc: "Comptes, rôles et habilitations des utilisateurs de la plateforme.",
    roleLabel: acRoleLabel,
  },
  {
    key: "sasdata", require: "acces", page: "acces.html?component=sasdata",
    icon: "fr-icon-building-line", tech: "SAS-DATA",
    title: "Territoires, départements & support",
    desc: "Référentiel des territoires SAS, paramétrage des départements et mails de réorientation.",
    roleLabel: acRoleLabel,
  },
  {
    key: "opensearch", require: "acces", page: "opensearch.html",
    icon: "fr-icon-search-line", tech: "Open-Search",
    title: "Offre de soins",
    desc: "Professionnels de santé et adresses d'activité de l'index de recherche de la plateforme.",
    roleLabel: acRoleLabel,
  },
  {
    key: "interop", require: "interop", page: "interop.html",
    icon: "fr-icon-settings-5-line", tech: "Interopérabilité",
    title: "Gestion des flux d'API",
    desc: "Comptes régulateurs, flux éditeurs, messages d'erreur, contrôleur FHIR…",
    roleLabel: interopRoleLabel,
  },
];

function render() {
  const idx = currentIdentityIdx();
  const identity = IDENTITIES[idx];

  // Sélecteur d'identité
  const sel = document.getElementById("identity-select");
  sel.innerHTML = IDENTITIES.map((i, k) => `<option value="${k}">${esc(i.label)}</option>`).join("");
  sel.value = idx;
  sel.onchange = () => { persistIdentityIdx(Number(sel.value)); history.replaceState(null, "", urlWithIdentity("index.html", Number(sel.value))); render(); };

  // Tuiles (un arrière-guichet par composant technique)
  const grid = document.getElementById("portal-grid");
  grid.innerHTML = ARRIERE_GUICHETS.map(ag => {
    const hab = identity[ag.require];
    if (hab) {
      return `<a class="bo-tile" href="${urlWithIdentity(ag.page, idx)}">
        <span class="bo-tile__icon ${ag.icon}" aria-hidden="true" style="font-size:2rem;"></span>
        <span class="bo-tile__tech">${esc(ag.tech)}</span>
        <span class="bo-tile__title">${esc(ag.title)}</span>
        <span class="bo-tile__desc">${esc(ag.desc)}</span>
        <span class="bo-tile__role">Votre rôle : ${esc(ag.roleLabel(hab))}</span>
        <span class="bo-tile__cta">Ouvrir <span class="fr-icon-arrow-right-line" aria-hidden="true"></span></span>
      </a>`;
    }
    return `<div class="bo-tile bo-tile--disabled" aria-disabled="true">
        <span class="bo-tile__icon ${ag.icon}" aria-hidden="true" style="font-size:2rem;"></span>
        <span class="bo-tile__tech">${esc(ag.tech)}</span>
        <span class="bo-tile__title">${esc(ag.title)}</span>
        <span class="bo-tile__desc">${esc(ag.desc)}</span>
        <span class="bo-tile__locked">Accès non autorisé pour ce profil</span>
      </div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", render);
