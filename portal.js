/* ==================================================================
   Portail — page d'accueil de la suite Arrière-guichet SAS.
   Une tuile par arrière-guichet, visible selon le niveau d'habilitation
   (Lecture / Écriture) de l'identité active. L'Admin BO dispose en plus
   d'une entrée « Gestion des accès ».
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

function levelPill(level) {
  const cls = level === "ecriture" ? "lvl--write" : "lvl--read";
  return `<span class="lvl ${cls}">${esc(levelLabel(level))}</span>`;
}

function render() {
  const idx = currentIdentityIdx();
  const identity = IDENTITIES[idx];

  const sel = document.getElementById("identity-select");
  sel.innerHTML = IDENTITIES.map((i, k) => `<option value="${k}">${esc(i.label)}</option>`).join("");
  sel.value = idx;
  sel.onchange = () => { persistIdentityIdx(Number(sel.value)); history.replaceState(null, "", urlWithIdentity("index.html", Number(sel.value))); render(); };

  // Bandeau Admin BO
  const banner = document.getElementById("portal-banner");
  banner.innerHTML = isAdminBO(identity)
    ? `<div class="adminbo-banner"><span class="fr-icon-settings-5-line" aria-hidden="true"></span>
         <div><strong>Admin BO</strong> — accès en écriture à tous les arrière-guichets et gestion des accès.</div>
         <a class="fr-btn fr-btn--sm" href="${urlWithIdentity("gestion-acces.html", idx)}">Gestion des accès</a>
       </div>`
    : "";

  const grid = document.getElementById("portal-grid");
  grid.innerHTML = GUICHETS.map(g => {
    const level = habLevel(identity, g.key);
    if (level) {
      const scope = (identity.role === "gestionnaire_compte" && identity.territoire && g.key !== "interop")
        ? `<span class="bo-tile__role">Territoire : ${esc(identity.territoire)}</span>` : "";
      return `<a class="bo-tile" href="${urlWithIdentity(g.page, idx)}">
        <span class="bo-tile__icon ${g.icon}" aria-hidden="true" style="font-size:2rem;"></span>
        <span class="bo-tile__tech">${esc(g.tech)}</span>
        <span class="bo-tile__title">${esc(g.title)}</span>
        ${levelPill(level)}
        ${scope}
        <span class="bo-tile__cta">Ouvrir <span class="fr-icon-arrow-right-line" aria-hidden="true"></span></span>
      </a>`;
    }
    return `<div class="bo-tile bo-tile--disabled" aria-disabled="true">
        <span class="bo-tile__icon ${g.icon}" aria-hidden="true" style="font-size:2rem;"></span>
        <span class="bo-tile__tech">${esc(g.tech)}</span>
        <span class="bo-tile__title">${esc(g.title)}</span>
        <span class="bo-tile__locked">Aucune habilitation pour ce profil</span>
      </div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", render);
