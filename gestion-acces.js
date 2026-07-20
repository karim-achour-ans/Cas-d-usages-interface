/* ==================================================================
   Gestion des accès — réservé à l'Admin BO.
   Crée / gère les comptes d'administration et fixe, par arrière-guichet,
   le niveau d'habilitation : Aucun / Lecture / Écriture.
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id){ return document.getElementById(id); }

const GA_KEY = "bo-sas-admins-v1";
const GA_SEED = [
  { id:"ga-1", prenom:"Marie",  nom:"Durand",  email:"marie.durand@sas.gouv.fr",  hab:{ utilisateurs:"ecriture", sasdata:"ecriture", offre_soins:"ecriture", interop:"ecriture" } },
  { id:"ga-2", prenom:"Luc",    nom:"Bernard", email:"luc.bernard@sas.gouv.fr",   hab:{ utilisateurs:"lecture",  sasdata:"lecture",  offre_soins:"lecture",  interop:"lecture" } },
  { id:"ga-3", prenom:"Sophie", nom:"Petit",   email:"sophie.petit@sas.gouv.fr",  hab:{ utilisateurs:null,      sasdata:null,      offre_soins:"ecriture", interop:null } },
];
function loadAdmins(){ try { const r = localStorage.getItem(GA_KEY); if (r) return JSON.parse(r); } catch(e){} return JSON.parse(JSON.stringify(GA_SEED)); }
function saveAdmins(){ try { localStorage.setItem(GA_KEY, JSON.stringify(state.admins)); } catch(e){} }

const state = {
  identityIdx: currentIdentityIdx(),
  admins: loadAdmins(),
  creating: false,
  draft: null,
};
function identity(){ return IDENTITIES[state.identityIdx]; }

const LEVEL_OPTS = [{ v:"", l:"Aucun" }, { v:"lecture", l:"Lecture" }, { v:"ecriture", l:"Écriture" }];
function levelSelect(adminId, gkey, current) {
  return `<select class="ga-level" data-admin="${esc(adminId)}" data-guichet="${gkey}">
    ${LEVEL_OPTS.map(o => `<option value="${o.v}" ${(current||"")===o.v?"selected":""}>${o.l}</option>`).join("")}
  </select>`;
}

function renderSidebar() {
  const nav = el("sidebar-nav");
  nav.innerHTML =
    `<a class="nav-item nav-portal" href="${urlWithIdentity("index.html", state.identityIdx)}">
       <span class="fr-icon-arrow-left-line" aria-hidden="true"></span>Portail
     </a>
     <button class="nav-item is-active"><span class="fr-icon-user-line" aria-hidden="true"></span>Comptes d'administration</button>`;
  const sel = el("identity-select");
  sel.innerHTML = IDENTITIES.map((i, k) => `<option value="${k}">${esc(i.label)}</option>`).join("");
  sel.value = state.identityIdx;
  sel.onchange = () => gotoWithIdentity("gestion-acces.html", Number(sel.value));
}

function adminRow(a) {
  return `<tr>
    <td><strong>${esc(a.prenom)} ${esc(a.nom)}</strong><div class="mock-note">${esc(a.email)}</div></td>
    ${GUICHETS.map(g => `<td>${levelSelect(a.id, g.key, a.hab[g.key])}</td>`).join("")}
    <td style="text-align:right;"><button class="fr-link" style="color:#ce0500" data-del="${esc(a.id)}">Supprimer</button></td>
  </tr>`;
}

function renderCreate() {
  const d = state.draft;
  return `
    <div class="ga-form">
      <h2 class="fr-h6" style="margin-top:0;">Nouveau compte d'administration</h2>
      ${d.error ? `<p class="fr-error-text">${esc(d.error)}</p>` : ""}
      <div class="fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-12 fr-col-md-3"><div class="fr-input-group"><label class="fr-label" for="ga-prenom">Prénom</label>
          <input class="fr-input" id="ga-prenom" value="${esc(d.prenom)}"></div></div>
        <div class="fr-col-12 fr-col-md-3"><div class="fr-input-group"><label class="fr-label" for="ga-nom">Nom</label>
          <input class="fr-input" id="ga-nom" value="${esc(d.nom)}"></div></div>
        <div class="fr-col-12 fr-col-md-6"><div class="fr-input-group"><label class="fr-label" for="ga-email">Email</label>
          <input class="fr-input" id="ga-email" type="email" value="${esc(d.email)}" placeholder="prenom.nom@sas.gouv.fr"></div></div>
      </div>
      <p class="fr-text--sm fr-text--bold" style="margin:.25rem 0 .5rem;">Habilitations par arrière-guichet</p>
      <div class="ga-draft-grid">
        ${GUICHETS.map(g => `<div class="ga-draft-cell">
          <label class="fr-label fr-text--sm" for="ga-d-${g.key}">${esc(g.title)}<span class="mock-note"> · ${esc(g.tech)}</span></label>
          <select class="fr-select" id="ga-d-${g.key}" data-draft="${g.key}">
            ${LEVEL_OPTS.map(o => `<option value="${o.v}" ${(d.hab[g.key]||"")===o.v?"selected":""}>${o.l}</option>`).join("")}
          </select>
        </div>`).join("")}
      </div>
      <div style="display:flex;gap:.5rem;margin-top:1rem;">
        <button class="fr-btn fr-btn--sm" id="ga-create">Créer le compte</button>
        <button class="fr-btn fr-btn--sm fr-btn--secondary" id="ga-cancel">Annuler</button>
      </div>
    </div>`;
}

function render() {
  renderSidebar();
  const main = el("ga-view");

  if (!isAdminBO(identity())) {
    main.innerHTML = `
      <div class="fr-alert fr-alert--warning" style="margin-top:1rem;">
        <h1 class="fr-alert__title" style="font-size:1.1rem;">Accès non autorisé</h1>
        <p>La gestion des accès est réservée à l'Admin BO. Le profil « ${esc(identity().label)} » n'est pas Admin BO.</p>
        <p><a class="fr-link" href="${urlWithIdentity("index.html", state.identityIdx)}">← Retour au portail</a></p>
      </div>`;
    return;
  }

  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">Gestion des accès</h1>
        <p class="page-sub">Comptes d'administration et niveau d'habilitation par arrière-guichet.</p>
      </div>
      ${state.creating ? "" : `<button class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-user-add-line" id="ga-add">Créer un compte</button>`}
    </div>
    ${state.creating ? renderCreate() : ""}
    <div class="ga-wrap" style="margin-top:1rem;">
      <table class="ga-table">
        <thead><tr>
          <th>Compte</th>
          ${GUICHETS.map(g => `<th>${esc(g.tech)}<div class="mock-note" style="font-weight:400;">${esc(g.title)}</div></th>`).join("")}
          <th></th>
        </tr></thead>
        <tbody>${state.admins.map(adminRow).join("")}</tbody>
      </table>
    </div>
    <p class="mock-note" style="margin-top:.75rem;">Écriture ⊃ Lecture. Modifications enregistrées automatiquement (navigateur).</p>`;

  bindEvents();
}

function bindEvents() {
  const root = el("ga-view");

  root.querySelectorAll(".ga-level").forEach(sel => sel.onchange = () => {
    const a = state.admins.find(x => x.id === sel.dataset.admin);
    if (a) { a.hab[sel.dataset.guichet] = sel.value || null; saveAdmins(); }
  });
  root.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const a = state.admins.find(x => x.id === b.dataset.del);
    if (a && confirm(`Supprimer le compte ${a.prenom} ${a.nom} ?`)) { state.admins = state.admins.filter(x => x.id !== a.id); saveAdmins(); render(); }
  });

  const add = root.querySelector("#ga-add");
  if (add) add.onclick = () => { state.creating = true; state.draft = { prenom:"", nom:"", email:"", hab:{}, error:"" }; render(); };

  if (state.creating) {
    const d = state.draft;
    root.querySelector("#ga-prenom").oninput = e => d.prenom = e.target.value;
    root.querySelector("#ga-nom").oninput = e => d.nom = e.target.value;
    root.querySelector("#ga-email").oninput = e => d.email = e.target.value;
    root.querySelectorAll("[data-draft]").forEach(sel => sel.onchange = () => { d.hab[sel.dataset.draft] = sel.value || null; });
    root.querySelector("#ga-cancel").onclick = () => { state.creating = false; state.draft = null; render(); };
    root.querySelector("#ga-create").onclick = () => {
      if (!d.prenom.trim() || !d.nom.trim() || !d.email.includes("@")) { d.error = "Renseignez prénom, nom et un email valide."; render(); return; }
      state.admins.push({
        id: "ga-" + Math.random().toString(36).slice(2,7),
        prenom: d.prenom.trim(), nom: d.nom.trim(), email: d.email.trim(),
        hab: { utilisateurs: d.hab.utilisateurs||null, sasdata: d.hab.sasdata||null, offre_soins: d.hab.offre_soins||null, interop: d.hab.interop||null },
      });
      saveAdmins();
      state.creating = false; state.draft = null; render();
    };
  }
}

document.addEventListener("DOMContentLoaded", render);
