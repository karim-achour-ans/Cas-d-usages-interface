/* ==================================================================
   Portail — page d'accueil de la suite Arrière-guichet SAS.
   Affiche une tuile par back-office ; accessible uniquement si
   l'identité active porte l'habilitation correspondante.
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

// Définition des back-offices de la suite
const BACK_OFFICES = [
  {
    key: "acces",
    page: "acces.html",
    icon: "fr-icon-user-line",
    title: "Accès & Utilisateurs",
    desc: "Gestion des utilisateurs, rôles, territoires SAS, départements et mails de support.",
    roleLabel: (hab) => {
      const map = { administrateur: "Administrateur", gestionnaire_compte: "Gestionnaire de compte" };
      const r = map[hab.role] || hab.role;
      return hab.territoire ? `${r} — ${hab.territoire}` : r;
    },
  },
  {
    key: "interop",
    page: "interop.html",
    icon: "fr-icon-settings-5-line",
    title: "Interopérabilité",
    desc: "Gestion des flux d'API : comptes régulateurs, flux éditeurs, messages d'erreur, contrôleur FHIR…",
    roleLabel: (hab) => INTEROP_ROLE_LABEL[hab.role] || hab.role,
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

  // Tuiles
  const grid = document.getElementById("portal-grid");
  grid.innerHTML = BACK_OFFICES.map(bo => {
    const hab = identity[bo.key];
    if (hab) {
      return `<a class="bo-tile" href="${urlWithIdentity(bo.page, idx)}">
        <span class="bo-tile__icon ${bo.icon}" aria-hidden="true" style="font-size:2rem;"></span>
        <span class="bo-tile__title">${esc(bo.title)}</span>
        <span class="bo-tile__desc">${esc(bo.desc)}</span>
        <span class="bo-tile__role">Votre rôle : ${esc(bo.roleLabel(hab))}</span>
        <span class="bo-tile__cta">Ouvrir <span class="fr-icon-arrow-right-line" aria-hidden="true"></span></span>
      </a>`;
    }
    return `<div class="bo-tile bo-tile--disabled" aria-disabled="true">
        <span class="bo-tile__icon ${bo.icon}" aria-hidden="true" style="font-size:2rem;"></span>
        <span class="bo-tile__title">${esc(bo.title)}</span>
        <span class="bo-tile__desc">${esc(bo.desc)}</span>
        <span class="bo-tile__locked">Accès non autorisé pour ce profil</span>
      </div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", render);
