/* ==================================================================
   Arrière-guichet SAS — PILOTAGE PLATEFORME
   Consultation seule. Informations strictement issues du schéma sasstore :
     Offre de soins    : practitioner, location, organization
     Orientation SAS   : appointment (+ appointment_metadata,
                         appointment_practitioner, appointment_organization,
                         appointment_regulator, appointment_interop)
     Participation SAS : practitioner_participation,
                         practitioner_participation_modality,
                         organization_participation
   Seule la table appointment porte un territoire : le gestionnaire de
   comptes ne voit que les rendez-vous de ses territoires.
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id){ return document.getElementById(id); }
function fmt(n){ return Number(n).toLocaleString("fr-FR"); }

const RDV_PAGE = "../sas_appointment_evolution/index.html";

const PL_SECTIONS = [
  { key: "offre",         label: "Offre de soins",    icon: "fr-icon-stethoscope-line" },
  { key: "orientation",   label: "Orientation SAS",   icon: "fr-icon-map-pin-2-line" },
  { key: "participation", label: "Participation SAS", icon: "fr-icon-user-line" },
];

/* Libellés des énumérations entières (organization.type,
   organization_participation.structure_type, modality, type de modalité).
   Correspondance supposée pour la démo — à confirmer avec l'équipe. */
const STRUCTURE_TYPES = { 1: "CDS", 2: "SOS Médecins", 3: "MMG" };
const MODALITIES      = { 1: "Via CPTS", 2: "Via MSP", 3: "Individuelle" };
const MODALITY_TYPES  = { 1: "CPTS", 2: "MSP" };
const APPT_TYPES      = { 1: "Orientation SAS", 2: "Orientation PDSA" };
const APPT_SOURCES    = { 1: "Agenda SAS", 2: "Agenda interfacé", 3: "Place de marché", 4: "Surnuméraire" };
const APPT_STATUSES   = { 1: "RDV pris et confirmé", 2: "RDV honoré", 3: "RDV annulé", 4: "RDV en attente" };
const HUB_SYNC        = ["SYNCED", "SYNCED", "SYNCED", "PENDING", "ERROR"];
const TERRITORIES     = ["SAS-75","SAS-92","SAS-93","SAS-69","SAS-59","SAS-31","SAS-13","SAS-33"];

/* ── Compteurs (COUNT sur les tables) — valeurs fictives ───────── */
const COUNTS = {
  practitioner: 17240,                 // SELECT COUNT(*) FROM practitioner
  organization: 266,                   // SELECT COUNT(*) FROM organization
  location: 21480,                     // SELECT COUNT(*) FROM location
  appointment: 118600,                 // SELECT COUNT(*) FROM appointment
  practitionerParticipant: 10380,      // practitioner_participation WHERE sas_participant
  organizationParticipant: 198,        // organization_participation WHERE sas_participant
};

/* ── Générateur déterministe (jeu de démo stable) ─────────────── */
function rng(seed){ let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function int(r, a, b){ return a + Math.floor(r() * (b - a + 1)); }
function pick(r, arr){ return arr[Math.floor(r() * arr.length)]; }
function ts(r){ const y = int(r, 2023, 2026), m = int(r, 1, y === 2026 ? 9 : 12), d = int(r, 1, 28);
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y} ${String(int(r, 7, 20)).padStart(2,"0")}:${String(int(r, 0, 59)).padStart(2,"0")}`; }
function finess(r){ return String(int(r, 1, 95)).padStart(2, "0") + String(int(r, 0, 9999999)).padStart(7, "0"); }
function siret(r){ return String(int(r, 100000000, 999999999)) + String(int(r, 10000, 99999)); }
function nid(r){ return "8" + String(int(r, 10000000000, 10999999999)); }
function yn(v){ return v == null ? "" : v ? "Oui" : "Non"; }
const AUTHORS = ["admin.national@sas.gouv.fr","gest.sas75@sas.gouv.fr","gest.sas69@sas.gouv.fr","import-batch","effecteur (self-service)"];

/* ── Exports (une requête SQL par fichier) ────────────────────── */

// organization
const COLS_ORG = ["ID structure","FINESS","SIRET","Type de structure","Créée le","Mise à jour le"];
function rowsOrg(){
  const r = rng(11);
  return Array.from({ length: 30 }, (_, i) => {
    const type = pick(r, [1, 1, 2, 3]); const c = ts(r);
    return [i + 1, finess(r), type === 2 ? siret(r) : "", STRUCTURE_TYPES[type], c, c];
  });
}

// practitioner + location (une ligne par lieu d'exercice)
const COLS_PS = ["Identifiant national","Professionnel créé le","Professionnel mis à jour le","ID lieu","FINESS géographique","Activité PS","ID structure","Lieu créé le","Lieu mis à jour le"];
function rowsPS(){
  const r = rng(55);
  return Array.from({ length: 40 }, () => {
    const c = ts(r), viaOrg = r() < 0.25;
    return [nid(r), c, ts(r), int(r, 1, 21480), r() < 0.7 ? finess(r) : "", "PA-" + int(r, 100000, 999999),
            viaOrg ? int(r, 1, 266) : "", c, ts(r)];
  });
}

// practitioner_participation (+ identifiant national via practitioner)
const COLS_PP = ["Identifiant national","Participant SAS","Modalité","Logiciel éditeur","Créneaux éditeur affichés","Disponibilité horaires confirmée","FINESS","Créée le","Mise à jour le","Dernier auteur"];
function rowsPP(){
  const r = rng(22);
  return Array.from({ length: 40 }, () => {
    const part = r() < 0.6; const mod = part ? pick(r, [1, 2, 3, 3]) : null;
    const editor = part ? r() < 0.55 : null;
    return [nid(r), yn(part), mod ? MODALITIES[mod] : "", yn(editor), editor ? yn(r() < 0.8) : "",
            part ? yn(r() < 0.7) : "", mod && mod !== 3 ? finess(r) : "", ts(r), ts(r), pick(r, AUTHORS)];
  });
}

// practitioner_participation_modality
const COLS_PPM = ["Identifiant national","ID lieu (location)","Type de modalité","FINESS géographique","Créée le","Mise à jour le","Dernier auteur"];
function rowsPPM(){
  const r = rng(33);
  return Array.from({ length: 30 }, () => [nid(r), int(r, 1, 21480), MODALITY_TYPES[pick(r, [1, 2])], finess(r), ts(r), ts(r), pick(r, AUTHORS)]);
}

// appointment + métadonnées
const COLS_APPT = ["UUID","ID technique","Début","Fin","Type","Source","Statut","Territoire","Statut synchro Hub","Créé le","Mis à jour le",
  "Identifiant national effecteur","Prénom","Nom","Adresse effecteur","Profession","Spécialités",
  "Structure","Adresse structure","SIRET","FINESS",
  "Identifiant régulateur","Territoires régulateur","Version du flux","ID éditeur"];
const PRENOMS = ["Camille","Julie","Nicolas","Sophie","Thomas","Claire","Antoine","Laura","Hugo","Emma","Lucas","Léa"];
const NOMS = ["Martin","Bernard","Dubois","Durand","Leroy","Moreau","Simon","Laurent","Lefebvre","Michel","Garcia","Roux"];
const VILLES = ["75011 Paris","92140 Clamart","93200 Saint-Denis","69003 Lyon","59000 Lille","31000 Toulouse","13005 Marseille","33000 Bordeaux"];
const APPT_ROWS = (() => {
  const r = rng(66);
  return Array.from({ length: 120 }, () => {
    const terr = pick(r, TERRITORIES); const src = int(r, 1, 4); const interop = src === 2;
    const viaOrg = r() < 0.2; const d = ts(r); const [day, hour] = d.split(" ");
    const h = Number(hour.slice(0, 2));
    const hex = () => Math.floor(r() * 0xffff).toString(16).padStart(4, "0");
    return [
      `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-a${hex().slice(1)}-${hex()}${hex()}${hex()}`,
      interop ? `${int(r, 3456700000, 3456799999)}/${int(r, 11240000, 11249999)}` : "",
      `${day} ${String(h).padStart(2,"0")}:00`, src === 4 ? "" : `${day} ${String(h).padStart(2,"0")}:20`,
      APPT_TYPES[r() < 0.94 ? 1 : 2], APPT_SOURCES[src], APPT_STATUSES[int(r, 1, 4)], terr, pick(r, HUB_SYNC), d, d,
      nid(r), pick(r, PRENOMS), pick(r, NOMS), `${int(r, 1, 120)} rue de la République, ${pick(r, VILLES)}`, "Médecin", "Médecine générale",
      viaOrg ? `CDS ${pick(r, NOMS)}` : "", viaOrg ? `${int(r, 1, 80)} avenue Jean Jaurès, ${pick(r, VILLES)}` : "", "", viaOrg ? finess(r) : "",
      `REG-${int(r, 1000, 9999)}`, terr, interop ? pick(r, ["v1.2", "v2.0"]) : "", interop ? int(r, 1, 12) : "",
    ];
  });
})();
function rowsAppt(){
  const terrs = scopeTerritories();
  return terrs ? APPT_ROWS.filter(row => terrs.includes(row[7])) : APPT_ROWS;
}

// organization_participation (+ FINESS via organization)
const COLS_OP = ["ID structure","FINESS","Type de structure","Participant SAS","Disponibilité horaires confirmée","Nombre de praticiens","Créée le","Mise à jour le","Dernier auteur"];
function rowsOP(){
  const r = rng(44);
  return Array.from({ length: 30 }, (_, i) => {
    const part = r() < 0.75;
    return [i + 1, finess(r), STRUCTURE_TYPES[pick(r, [1, 1, 2, 3])], yn(part), part ? yn(r() < 0.7) : "", int(r, 2, 45), ts(r), ts(r), pick(r, AUTHORS)];
  });
}

/* ── Export CSV « Excel-ready » : UTF-8 + BOM, séparateur « ; » ── */
const EXPORTS = {};
function toCsv(cols, rows){
  const cell = v => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [cols, ...rows].map(r => r.map(cell).join(";")).join("\r\n");
}
function download(id){
  const x = EXPORTS[id]; if (!x) return;
  const blob = new Blob([toCsv(x.cols, x.rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = x.filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Export « ${x.filename} » téléchargé.`);
}
function toast(msg){
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("toast--out"), 2600); setTimeout(() => t.remove(), 3100);
}
function today(){ const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`; }

/* ── Briques d'affichage ──────────────────────────────────────── */
function kpis(items){
  return `<div class="stat-kpis pl-kpis">${items.map(k => `
    <div class="stat-kpi">
      <span class="stat-kpi__n">${k.n}</span>
      <span class="stat-kpi__l">${esc(k.l)}</span>
    </div>`).join("")}</div>`;
}

function linkCard({ href, title, desc, icon, disabledReason }){
  if (disabledReason) return `
    <div class="pl-card pl-card--link is-disabled" aria-disabled="true">
      <span class="pl-card__icon ${icon}" aria-hidden="true"></span>
      <div><div class="pl-card__title">${esc(title)}</div><p class="pl-card__desc">${esc(desc)}</p>
      <span class="bo-tile__locked">${esc(disabledReason)}</span></div>
    </div>`;
  return `
    <a class="pl-card pl-card--link" href="${esc(href)}">
      <span class="pl-card__icon ${icon}" aria-hidden="true"></span>
      <div><div class="pl-card__title">${esc(title)}</div><p class="pl-card__desc">${esc(desc)}</p>
      <span class="bo-tile__cta">Ouvrir <span class="fr-icon-arrow-right-line" aria-hidden="true"></span></span></div>
    </a>`;
}

function exportCard({ id, title, desc, cols, rows, filename }){
  EXPORTS[id] = { cols, rows, filename };
  return `
    <div class="pl-card pl-card--export">
      <div class="pl-card__head">
        <div>
          <div class="pl-card__title"><span class="fr-icon-file-text-line" aria-hidden="true"></span> ${esc(title)}</div>
          <p class="pl-card__desc">${esc(desc)}</p>
        </div>
        <button class="fr-btn fr-btn--sm" data-export="${esc(id)}">Télécharger (.csv · Excel)</button>
      </div>
      <details class="pl-preview">
        <summary>Aperçu du fichier — ${cols.length} colonnes</summary>
        <div class="pl-preview__wrap">
          <table class="pl-table pl-table--small">
            <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
            <tbody>${rows.slice(0, 3).map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
      </details>
    </div>`;
}

function header(section, sub){
  return `
    <div class="pl-head">
      <div>
        <h1 class="fr-h4" style="margin:0;">${esc(section.label)}</h1>
        <p class="page-sub">${esc(sub)}</p>
      </div>
      <span class="lvl lvl--read">Lecture</span>
    </div>`;
}

/* ── Rubrique 1 : Offre de soins ──────────────────────────────── */
function viewOffre(){
  const canOS = habHas(identity(), "offre_soins");
  return `
    ${header(PL_SECTIONS[0], "Offres de soins inscrites au SAS")}
    ${kpis([
      { n: fmt(COUNTS.practitioner), l: "Professionnels de santé inscrits" },
      { n: fmt(COUNTS.location),     l: "Lieux d'exercice" },
      { n: fmt(COUNTS.organization), l: "Structures inscrites" },
    ])}
    <div class="pl-stack">
      ${linkCard({
        href: urlWithIdentity("opensearch.html", state.identityIdx),
        icon: "fr-icon-search-line",
        title: "Consulter les offres de soins de la plateforme",
        desc: "Recherche et fiche détaillée de chaque offre (arrière-guichet Open-Search).",
        disabledReason: canOS ? null : "Nécessite l'habilitation « Offre de soins »",
      })}
      ${exportCard({
        id: "ps",
        title: "Liste des professionnels de santé inscrits au SAS",
        desc: "Une ligne par lieu d'exercice d'un professionnel.",
        cols: COLS_PS, rows: rowsPS(),
        filename: `sas_professionnels_inscrits_${today()}.csv`,
      })}
      ${exportCard({
        id: "structures",
        title: "Liste des structures inscrites au SAS",
        desc: "Une ligne par structure.",
        cols: COLS_ORG, rows: rowsOrg(),
        filename: `sas_structures_inscrites_${today()}.csv`,
      })}
    </div>`;
}

/* ── Rubrique 2 : Orientation SAS ─────────────────────────────── */
function scopeTerritories(){
  if (identity().role !== "gestionnaire_compte") return null;          // tous les territoires
  return identityTerritoires(identity());
}
function viewOrientation(){
  const terrs = scopeTerritories();
  const rows = rowsAppt();
  const n = terrs ? Math.round(COUNTS.appointment * rows.length / APPT_ROWS.length) : COUNTS.appointment;
  return `
    ${header(PL_SECTIONS[1], terrs ? `Rendez-vous pris par la régulation SAS — ${terrs.join(", ")}` : "Rendez-vous pris par la régulation SAS")}
    ${kpis([{ n: fmt(n), l: "Rendez-vous enregistrés" }])}
    <div class="pl-stack">
      ${linkCard({
        href: RDV_PAGE,
        icon: "fr-icon-list-unordered",
        title: "Suivi des rendez-vous",
        desc: "Liste et statut des rendez-vous pris via le SAS.",
      })}
      ${exportCard({
        id: "appt",
        title: "Liste des rendez-vous",
        desc: "Une ligne par rendez-vous : rendez-vous, effecteur, structure, régulateur, flux d'interopérabilité.",
        cols: COLS_APPT, rows,
        filename: `sas_rendez_vous_${terrs ? terrs.join("_") : "national"}_${today()}.csv`,
      })}
    </div>`;
}

/* ── Rubrique 3 : Participation SAS ───────────────────────────── */
function viewParticipation(){
  return `
    ${header(PL_SECTIONS[2], "Participation au SAS des professionnels de santé et des structures")}
    ${kpis([
      { n: fmt(COUNTS.practitionerParticipant), l: "Professionnels de santé participant au SAS" },
      { n: fmt(COUNTS.organizationParticipant), l: "Structures participant au SAS" },
    ])}
    <div class="pl-stack">
      ${exportCard({
        id: "pp",
        title: "Participation des professionnels de santé",
        desc: "Une ligne par professionnel : participation, modalité, logiciel éditeur, disponibilité.",
        cols: COLS_PP, rows: rowsPP(),
        filename: `sas_participation_professionnels_${today()}.csv`,
      })}
      ${exportCard({
        id: "ppm",
        title: "Modalités de participation par lieu d'exercice",
        desc: "Une ligne par lieu d'exercice participant via une CPTS ou une MSP.",
        cols: COLS_PPM, rows: rowsPPM(),
        filename: `sas_modalites_participation_${today()}.csv`,
      })}
      ${exportCard({
        id: "op",
        title: "Participation des structures",
        desc: "Une ligne par structure : participation, disponibilité, nombre de praticiens.",
        cols: COLS_OP, rows: rowsOP(),
        filename: `sas_participation_structures_${today()}.csv`,
      })}
    </div>`;
}

/* ── État & rendu ─────────────────────────────────────────────── */
const urlView = new URLSearchParams(location.search).get("view");
const state = {
  identityIdx: currentIdentityIdx(),
  view: PL_SECTIONS.some(s => s.key === urlView) ? urlView : "offre",
};
function identity(){ return IDENTITIES[state.identityIdx]; }
function plLevel(){ return habLevel(identity(), "pilotage"); }

function renderSidebar(){
  const nav = el("sidebar-nav");
  let html = `<a class="nav-item nav-portal" href="${urlWithIdentity("index.html", state.identityIdx)}">
      <span class="fr-icon-arrow-left-line" aria-hidden="true"></span>Portail
    </a>`;
  if (plLevel()) {
    html += `<div class="nav-section">Données de pilotage</div>`;
    html += PL_SECTIONS.map(s => `
      <button class="nav-item ${state.view === s.key ? "is-active" : ""}" data-view="${s.key}">
        <span class="${s.icon}" aria-hidden="true"></span>${esc(s.label)}
      </button>`).join("");
  }
  nav.innerHTML = html;
  nav.querySelectorAll(".nav-item[data-view]").forEach(b => b.onclick = () => {
    state.view = b.dataset.view;
    const u = new URL(location.href); u.searchParams.set("view", state.view); history.replaceState(null, "", u);
    render();
  });

  const sel = el("identity-select");
  sel.innerHTML = IDENTITIES.map((i, k) => `<option value="${k}">${esc(i.label)}</option>`).join("");
  sel.value = state.identityIdx;
  sel.onchange = () => gotoWithIdentity("pilotage.html?view=" + state.view, Number(sel.value));
}

function render(){
  renderSidebar();
  const main = el("pl-view");
  if (!plLevel()) {
    main.innerHTML = `
      <div class="fr-alert fr-alert--warning" style="margin-top:1rem;">
        <h1 class="fr-alert__title" style="font-size:1.1rem;">Accès non autorisé</h1>
        <p>Le profil « ${esc(identity().label)} » n'a pas d'habilitation sur « Pilotage plateforme ».</p>
        <p><a class="fr-link" href="${urlWithIdentity("index.html", state.identityIdx)}">← Retour au portail</a></p>
      </div>`;
    return;
  }
  main.innerHTML = state.view === "orientation" ? viewOrientation()
                 : state.view === "participation" ? viewParticipation()
                 : viewOffre();
  main.querySelectorAll("[data-export]").forEach(b => b.onclick = () => download(b.dataset.export));
}

document.addEventListener("DOMContentLoaded", render);
