/* ==================================================================
   Arrière-guichet SAS — PILOTAGE PLATEFORME
   Un tableau par onglet. Les colonnes peuvent être retirées / ajoutées ;
   l'export Excel reprend exactement les colonnes affichées.
   Données fictives. Le gestionnaire de comptes ne voit que ses territoires.
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id){ return document.getElementById(id); }

/* ── Générateur déterministe (jeu de démo stable) ─────────────── */
function rng(seed){ let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function int(r, a, b){ return a + Math.floor(r() * (b - a + 1)); }
function pick(r, arr){ return arr[Math.floor(r() * arr.length)]; }
function pad(n){ return String(n).padStart(2, "0"); }
function date(r, y0 = 2023){ const y = int(r, y0, 2026), m = int(r, 1, y === 2026 ? 10 : 12); return `${pad(int(r, 1, 28))}/${pad(m)}/${y}`; }
function hour(r){ return `${pad(int(r, 8, 20))}:${pick(r, ["00","15","30","45"])}`; }
function rpps(r){ return "10" + String(int(r, 0, 999999999)).padStart(9, "0"); }
function finess(r, dep){ return dep.slice(0, 2) + String(int(r, 0, 9999999)).padStart(7, "0"); }

const TERR = [
  { code: "SAS-75", communes: [["Paris","75011","75111"],["Paris","75018","75118"],["Paris","75015","75115"]], tel: "01" },
  { code: "SAS-92", communes: [["Clamart","92140","92023"],["Nanterre","92000","92050"],["Boulogne-Billancourt","92100","92012"]], tel: "01" },
  { code: "SAS-93", communes: [["Saint-Denis","93200","93066"],["Montreuil","93100","93048"],["Bobigny","93000","93008"]], tel: "01" },
  { code: "SAS-69", communes: [["Lyon","69003","69383"],["Villeurbanne","69100","69266"],["Vénissieux","69200","69259"]], tel: "04" },
  { code: "SAS-59", communes: [["Lille","59000","59350"],["Roubaix","59100","59512"],["Tourcoing","59200","59599"]], tel: "03" },
  { code: "SAS-31", communes: [["Toulouse","31000","31555"],["Colomiers","31770","31149"],["Muret","31600","31395"]], tel: "05" },
];
const PRENOMS = ["Camille","Julie","Nicolas","Sophie","Thomas","Claire","Antoine","Laura","Hugo","Emma","Lucas","Léa","Mathieu","Sarah","Karim","Amina","Yanis","Inès"];
const NOMS = ["Martin","Bernard","Dubois","Durand","Leroy","Moreau","Simon","Laurent","Lefebvre","Michel","Garcia","Roux","Fontaine","Rousseau","Benali","Nguyen","Petit","Girard"];
const VOIES = ["Rue de la République","Avenue Jean Jaurès","Boulevard Voltaire","Rue Victor Hugo","Place de la Mairie","Rue du Général de Gaulle","Avenue de la Gare","Rue Pasteur"];
const PROFESSIONS = [
  ["Médecin", "Médecine générale"], ["Médecin", "Médecine générale"], ["Médecin", "Médecine générale"],
  ["Médecin", "Pédiatrie"], ["Infirmier", ""], ["Masseur-kinésithérapeute", ""], ["Chirurgien-dentiste", "Chirurgie dentaire"],
];
const MODES = ["Individuelle", "Individuelle", "Via CPTS", "Via MSP"];
const MODALITES_AGENDA = ["Agenda SAS", "Agenda interfacé", "Agenda interfacé", "Disponibilités déclaratives"];

/* ── Tableau 1 : Orientation ──────────────────────────────────── */
const ORIENT_COLS = ["Type offre de soins","Mode de participation SAS","Date d'orientation","Heure du rendez-vous","Professionnel","RPPS","Mise à jour du RDV","Statut du RDV","Territoire SAS"];
const ORIENT_ROWS = (() => {
  const r = rng(101);
  return Array.from({ length: 60 }, () => {
    const t = pick(r, TERR); const type = pick(r, ["Professionnel de santé","Professionnel de santé","Professionnel de santé","Centre de santé","SOS Médecins"]);
    const mode = type === "Professionnel de santé" ? pick(r, MODES) : "Structure";
    const d = date(r, 2025);
    return { "Type offre de soins": type, "Mode de participation SAS": mode, "Date d'orientation": d, "Heure du rendez-vous": hour(r),
      "Professionnel": `Dr ${pick(r, PRENOMS)} ${pick(r, NOMS)}`, "RPPS": rpps(r), "Mise à jour du RDV": `${d} ${hour(r)}`,
      "Statut du RDV": pick(r, ["RDV pris et confirmé","RDV pris et confirmé","RDV honoré","RDV honoré","RDV annulé","RDV en attente"]),
      "Territoire SAS": t.code };
  }).sort((a, b) => b["Date d'orientation"].split("/").reverse().join("").localeCompare(a["Date d'orientation"].split("/").reverse().join("")));
})();

/* ── Tableau 2 : Participation SAS — professionnels de santé ──── */
const PS_COLS = ["Date d'inscription à la PTF SAS","Date de mise à jour SAS","Profession","Libellé savoir-faire","RPPS","Nom","Prénom","Ville","Code postal","Code Commune","Numéro Voie","Adresse","Téléphone","Mode de participation","Modalité d'agenda","FINESS","Intitulé de la Structure","Territoire SAS"];
const PS_ROWS = (() => {
  const r = rng(202);
  return Array.from({ length: 60 }, () => {
    const t = pick(r, TERR); const [ville, cp, insee] = pick(r, t.communes); const [prof, sf] = pick(r, PROFESSIONS);
    const mode = pick(r, MODES); const via = mode !== "Individuelle";
    const key = d => d.split("/").reverse().join("");
    const [ins, maj] = [date(r, 2022), date(r, 2024)].sort((a, b) => key(a).localeCompare(key(b)));
    return { "Date d'inscription à la PTF SAS": ins, "Date de mise à jour SAS": maj, "Profession": prof, "Libellé savoir-faire": sf,
      "RPPS": rpps(r), "Nom": pick(r, NOMS).toUpperCase(), "Prénom": pick(r, PRENOMS), "Ville": ville, "Code postal": cp, "Code Commune": insee,
      "Numéro Voie": String(int(r, 1, 140)), "Adresse": pick(r, VOIES),
      "Téléphone": `${t.tel} ${pad(int(r, 10, 99))} ${pad(int(r, 10, 99))} ${pad(int(r, 10, 99))} ${pad(int(r, 10, 99))}`,
      "Mode de participation": mode, "Modalité d'agenda": pick(r, MODALITES_AGENDA),
      "FINESS": via ? finess(r, cp) : "", "Intitulé de la Structure": via ? `${mode === "Via CPTS" ? "CPTS" : "MSP"} de ${ville}` : "",
      "Territoire SAS": t.code };
  });
})();

/* ── Tableau 3 : Participation SAS — structures ───────────────── */
const ST_COLS = ["Territoire SAS","Nom du Centre de santé","Num. Finess","Date de mise à jour"];
const ST_ROWS = (() => {
  const r = rng(303);
  const rows = [];
  TERR.forEach(t => t.communes.forEach(([ville, cp]) => {
    const n = int(r, 1, 3);
    for (let i = 0; i < n; i++) rows.push({
      "Territoire SAS": t.code,
      "Nom du Centre de santé": `${pick(r, ["Centre de santé", "Centre municipal de santé", "Centre de santé médical"])} ${pick(r, ["Pasteur","Les Lilas","du Centre","Simone Veil","de la Gare","Jean Moulin"])} — ${ville}`,
      "Num. Finess": finess(r, cp),
      "Date de mise à jour": date(r, 2024),
    });
  }));
  return rows;
})();

/* ── Onglets ──────────────────────────────────────────────────── */
const TABS = [
  { key: "orientation", label: "Orientation", icon: "fr-icon-map-pin-2-line", title: "Orientation",
    sub: "Une ligne par rendez-vous pris via le SAS.", cols: ORIENT_COLS, rows: ORIENT_ROWS, file: "sas_orientation" },
  { key: "participation-ps", label: "Participation SAS PS", icon: "fr-icon-user-line", title: "Participation SAS — professionnels de santé",
    sub: "Une ligne par professionnel de santé inscrit au SAS.", cols: PS_COLS, rows: PS_ROWS, file: "sas_participation_ps" },
  { key: "participation-structure", label: "Participation SAS structure", icon: "fr-icon-building-line", title: "Participation SAS — structures",
    sub: "Une ligne par centre de santé inscrit au SAS.", cols: ST_COLS, rows: ST_ROWS, file: "sas_participation_structures" },
];
const TAB_BY_KEY = Object.fromEntries(TABS.map(t => [t.key, t]));

/* ── État ──────────────────────────────────────────────────────── */
const urlView = new URLSearchParams(location.search).get("view");
const state = {
  identityIdx: currentIdentityIdx(),
  view: TAB_BY_KEY[urlView] ? urlView : TABS[0].key,
  visible: Object.fromEntries(TABS.map(t => [t.key, [...t.cols]])),   // colonnes affichées, dans l'ordre
};
function identity(){ return IDENTITIES[state.identityIdx]; }
function plLevel(){ return habLevel(identity(), "pilotage"); }
function scopeTerritories(){ return identity().role === "gestionnaire_compte" ? identityTerritoires(identity()) : null; }
function tabRows(tab){ const terrs = scopeTerritories(); return terrs ? tab.rows.filter(r => terrs.includes(r["Territoire SAS"])) : tab.rows; }

/* ── Export Excel : CSV UTF-8 + BOM, séparateur « ; » ─────────── */
function exportTab(tab){
  const cols = state.visible[tab.key]; const rows = tabRows(tab);
  const cell = v => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = "﻿" + [cols, ...rows.map(r => cols.map(c => r[c]))].map(l => l.map(cell).join(";")).join("\r\n");
  const d = new Date(); const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const name = `${tab.file}_${stamp}.csv`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Export « ${name} » — ${cols.length} colonne${cols.length > 1 ? "s" : ""}, ${rows.length} ligne${rows.length > 1 ? "s" : ""}.`);
}
function toast(msg){
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("toast--out"), 2600); setTimeout(() => t.remove(), 3100);
}

/* ── Vue tableau ──────────────────────────────────────────────── */
function viewTab(tab){
  const cols = state.visible[tab.key];
  const hidden = tab.cols.filter(c => !cols.includes(c));
  const rows = tabRows(tab);
  const terrs = scopeTerritories();
  return `
    <div class="pl-head">
      <div>
        <h1 class="fr-h4" style="margin:0;">${esc(tab.title)}</h1>
        <p class="page-sub">${esc(tab.sub)}${terrs ? ` Périmètre : ${esc(terrs.join(", "))}.` : ""}</p>
      </div>
      <button class="fr-btn fr-btn--sm" id="pl-export" ${cols.length ? "" : "disabled"}>Exporter (Excel)</button>
    </div>

    <div class="pl-cols" aria-label="Colonnes du tableau">
      <span class="pl-cols__label">Colonnes</span>
      ${cols.map(c => `<span class="pl-chip">${esc(c)}<button type="button" class="pl-chip__x" data-remove="${esc(c)}" aria-label="Retirer la colonne ${esc(c)}" title="Retirer">×</button></span>`).join("")}
      ${hidden.length ? `
        <select class="pl-cols__add" id="pl-add" aria-label="Ajouter une colonne">
          <option value="">+ Ajouter une colonne</option>
          ${hidden.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}
        </select>
        <button type="button" class="fr-link pl-cols__reset" id="pl-reset">Toutes les colonnes</button>` : ""}
    </div>

    <p class="result-count">${rows.length} ligne${rows.length > 1 ? "s" : ""} · ${cols.length} colonne${cols.length > 1 ? "s" : ""}</p>
    ${cols.length ? `
    <div class="pl-table-wrap">
      <table class="pl-table">
        <thead><tr>${cols.map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>` : `<div class="stub"><p>Aucune colonne affichée — ajoutez au moins une colonne.</p></div>`}`;
}

/* ── Rendu ─────────────────────────────────────────────────────── */
function renderSidebar(){
  const nav = el("sidebar-nav");
  let html = `<a class="nav-item nav-portal" href="${urlWithIdentity("index.html", state.identityIdx)}">
      <span class="fr-icon-arrow-left-line" aria-hidden="true"></span>Portail
    </a>`;
  if (plLevel()) {
    html += `<div class="nav-section">Données de pilotage</div>`;
    html += TABS.map(t => `
      <button class="nav-item ${state.view === t.key ? "is-active" : ""}" data-view="${t.key}">
        <span class="${t.icon}" aria-hidden="true"></span>${esc(t.label)}
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
  const tab = TAB_BY_KEY[state.view];
  main.innerHTML = viewTab(tab);

  const vis = state.visible[tab.key];
  main.querySelectorAll("[data-remove]").forEach(b => b.onclick = () => {
    state.visible[tab.key] = vis.filter(c => c !== b.dataset.remove); render();
  });
  const add = el("pl-add");
  if (add) add.onchange = () => {
    if (!add.value) return;
    const next = [...vis, add.value];
    state.visible[tab.key] = tab.cols.filter(c => next.includes(c));     // conserve l'ordre d'origine
    render();
  };
  const reset = el("pl-reset"); if (reset) reset.onclick = () => { state.visible[tab.key] = [...tab.cols]; render(); };
  el("pl-export").onclick = () => exportTab(tab);
}

document.addEventListener("DOMContentLoaded", render);
