/* ==================================================================
   Arrière-guichet SAS — mock autonome (aucune dépendance, aucun serveur)
   Menu fixe · liste en lignes · CRUD utilisateurs (rôles multiples,
   structures multiples) · CRUD territoires SAS.
   ================================================================== */
"use strict";

/* ---------------------------------------------------------------- *
 *  RÉFÉRENTIELS
 * ---------------------------------------------------------------- */
const ROLES = [
  { value: "administrateur",        label: "Administrateur",           desc: "Accès complet à la plateforme et à tous les territoires." },
  { value: "gestionnaire_compte",   label: "Gestionnaire de Compte",   desc: "Gère les utilisateurs rattachés à son territoire SAS." },
  { value: "gestionnaire_structure",label: "Gestionnaire de Structure",desc: "Gère une ou plusieurs structures d'effection (SOS, CDS, CPTS/MSP)." },
  { value: "regulateur_osnp",       label: "Régulateur OSNP",          desc: "Régulation des soins non programmés." },
  { value: "effecteur",             label: "Effecteur",                desc: "Professionnel de santé effecteur, identifié par son n° RPPS." },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]));

const STRUCTURE_TYPES = [
  { value: "sos_medecins", label: "SOS Médecins" },
  { value: "cds",          label: "Centre de Santé (CDS)" },
  { value: "cpts_msp",     label: "CPTS / MSP" },
];
const STRUCTURE_LABEL = Object.fromEntries(STRUCTURE_TYPES.map(s => [s.value, s.label]));
/* Libellés courts pour la liste (SOS Médecins / CDS / CPTS-MSP) */
const STRUCTURE_SHORT = { sos_medecins: "SOS Médecins", cds: "CDS", cpts_msp: "CPTS/MSP" };

/* Territoires SAS — format « SAS-[n° département] » (référentiel modifiable) */
const SEED_TERRITOIRES = [
  { code: "SAS-75", dep: "Paris" },
  { code: "SAS-92", dep: "Hauts-de-Seine" },
  { code: "SAS-93", dep: "Seine-Saint-Denis" },
  { code: "SAS-69", dep: "Rhône" },
  { code: "SAS-13", dep: "Bouches-du-Rhône" },
  { code: "SAS-33", dep: "Gironde" },
  { code: "SAS-31", dep: "Haute-Garonne" },
  { code: "SAS-59", dep: "Nord" },
  { code: "SAS-44", dep: "Loire-Atlantique" },
  { code: "SAS-35", dep: "Ille-et-Vilaine" },
  { code: "SAS-67", dep: "Bas-Rhin" },
  { code: "SAS-34", dep: "Hérault" },
];

/* Annuaire FINESS (mock) */
const FINESS_DIRECTORY = [
  { finess: "750000015", type: "sos_medecins", nom: "SOS Médecins Paris",   ville: "75014 Paris" },
  { finess: "690000024", type: "sos_medecins", nom: "SOS Médecins Lyon",    ville: "69003 Lyon" },
  { finess: "330000037", type: "sos_medecins", nom: "SOS Médecins Bordeaux",ville: "33000 Bordeaux" },
  { finess: "590000041", type: "sos_medecins", nom: "SOS Médecins Lille",   ville: "59000 Lille" },
  { finess: "750100056", type: "cds", nom: "Centre de Santé Marcadet",      ville: "75018 Paris" },
  { finess: "930100063", type: "cds", nom: "Centre Municipal de Santé de Montreuil", ville: "93100 Montreuil" },
  { finess: "130100070", type: "cds", nom: "Centre de Santé Le Corbusier",  ville: "13008 Marseille" },
  { finess: "440100088", type: "cds", nom: "Centre de Santé Bellevue",      ville: "44100 Nantes" },
  { finess: "750200091", type: "cpts_msp", nom: "CPTS Paris 13",            ville: "75013 Paris" },
  { finess: "310200104", type: "cpts_msp", nom: "MSP Toulouse Rangueil",    ville: "31400 Toulouse" },
  { finess: "350200117", type: "cpts_msp", nom: "CPTS Rennes Métropole",    ville: "35000 Rennes" },
  { finess: "670200120", type: "cpts_msp", nom: "MSP Strasbourg Neudorf",   ville: "67100 Strasbourg" },
  // Entrées supplémentaires (permet le rattachement à plusieurs structures du même type)
  { finess: "750000023", type: "sos_medecins", nom: "SOS Médecins Paris Est",   ville: "75020 Paris" },
  { finess: "750000031", type: "sos_medecins", nom: "SOS Médecins Paris Ouest", ville: "75016 Paris" },
  { finess: "750100064", type: "cds", nom: "Centre de Santé Réaumur",        ville: "75002 Paris" },
  { finess: "750100072", type: "cds", nom: "Centre de Santé Belleville",     ville: "75019 Paris" },
  { finess: "750200108", type: "cpts_msp", nom: "MSP Paris 18",              ville: "75018 Paris" },
  { finess: "750200116", type: "cpts_msp", nom: "CPTS Paris Centre",         ville: "75001 Paris" },
  { finess: "750200124", type: "cpts_msp", nom: "MSP Paris 20",              ville: "75020 Paris" },
  { finess: "690200131", type: "cpts_msp", nom: "CPTS Lyon Métropole",       ville: "69007 Lyon" },
];
const FINESS_BY_ID = Object.fromEntries(FINESS_DIRECTORY.map(x => [x.finess, x]));

/* Annuaire RPPS (mock — Annuaire Santé) */
const RPPS_DIRECTORY = [
  { rpps: "10001234567", nom: "Durand",   prenom: "Claire",  profession: "Médecin",              specialite: "Médecine générale" },
  { rpps: "10002345678", nom: "Martin",   prenom: "Julien",  profession: "Médecin",              specialite: "Médecine d'urgence" },
  { rpps: "10003456789", nom: "Bernard",  prenom: "Sophie",  profession: "Médecin",              specialite: "Pédiatrie" },
  { rpps: "10004567890", nom: "Petit",    prenom: "Thomas",  profession: "Médecin",              specialite: "Médecine générale" },
  { rpps: "10005678901", nom: "Robert",   prenom: "Nadia",   profession: "Infirmier",            specialite: "Infirmier en pratique avancée" },
  { rpps: "10006789012", nom: "Richard",  prenom: "Marc",    profession: "Médecin",              specialite: "Cardiologie" },
  { rpps: "10007890123", nom: "Moreau",   prenom: "Élodie",  profession: "Sage-femme",           specialite: "Maïeutique" },
  { rpps: "10008901234", nom: "Simon",    prenom: "Antoine", profession: "Médecin",              specialite: "Gériatrie" },
  { rpps: "10009012345", nom: "Roussel",  prenom: "Léa",     profession: "Chirurgien-dentiste",  specialite: "Chirurgie orale" },
  { rpps: "10010123456", nom: "Lopez",    prenom: "Manuel",  profession: "Infirmier",            specialite: "Soins généraux" },
  { rpps: "10011234567", nom: "Meyer",    prenom: "Chloé",   profession: "Médecin",              specialite: "Dermatologie" },
  { rpps: "10012345678", nom: "Blanc",    prenom: "Lucas",   profession: "Médecin",              specialite: "Ophtalmologie" },
  { rpps: "10013456789", nom: "Henry",    prenom: "Inès",    profession: "Médecin",              specialite: "Psychiatrie" },
  { rpps: "10014567890", nom: "Roy",      prenom: "Julie",   profession: "Médecin",              specialite: "Gynécologie-obstétrique" },
  { rpps: "10015678901", nom: "Da Silva", prenom: "Hugo",    profession: "Chirurgien-dentiste",  specialite: "Orthodontie" },
  { rpps: "10016789012", nom: "Perrin",   prenom: "Manon",   profession: "Sage-femme",           specialite: "Maïeutique" },
];

/* Communes (source : Base Adresse Nationale — extrait mock) */
const COMMUNES = [
  "75001 Paris","75012 Paris","75013 Paris","75014 Paris","75015 Paris","75018 Paris",
  "92100 Boulogne-Billancourt","93100 Montreuil","69002 Lyon","69003 Lyon",
  "13008 Marseille","33000 Bordeaux","31400 Toulouse","35000 Rennes",
  "59000 Lille","44100 Nantes","67100 Strasbourg","34000 Montpellier",
];

/* Identités de démonstration (qui consulte l'arrière-guichet) */
const IDENTITES = [
  { label: "Administrateur national",         role: "administrateur" },
  { label: "Gestionnaire de compte — SAS-75", role: "gestionnaire_compte", territoire: "SAS-75" },
  { label: "Gestionnaire de compte — SAS-69", role: "gestionnaire_compte", territoire: "SAS-69" },
  { label: "Gestionnaire de compte — SAS-59", role: "gestionnaire_compte", territoire: "SAS-59" },
];

/* Utilisateurs de démonstration (roles = tableau, structures = tableau) */
const SEED_USERS = [
  { id:"u-001", idNational:"SASN-100001", email:"admin.national@sas.gouv.fr", nom:"Lefevre", prenom:"Isabelle", roles:["administrateur"],        ville:"75007 Paris",     territoire:"SAS-75", actif:true },
  { id:"u-002", idNational:"SASN-100002", email:"g.compte.paris@sas.gouv.fr", nom:"Garnier", prenom:"Paul",     roles:["gestionnaire_compte"],   ville:"75012 Paris",     territoire:"SAS-75", actif:true },
  { id:"u-003", idNational:"SASN-100003", email:"g.compte.lyon@sas.gouv.fr",  nom:"Faure",   prenom:"Camille",  roles:["gestionnaire_compte"],   ville:"69002 Lyon",      territoire:"SAS-69", actif:true },
  { id:"u-004", idNational:"SASN-100004", email:"regul.osnp.paris@sas.gouv.fr", nom:"Roux",  prenom:"David",    roles:["regulateur_osnp","gestionnaire_compte"], ville:"75015 Paris", territoire:"SAS-75", actif:true },
  { id:"u-005", idNational:"SASN-100005", email:"claire.durand@effecteur.fr", nom:"Durand",  prenom:"Claire",   roles:["effecteur"],             ville:"75014 Paris",     territoire:"SAS-75", actif:true,  rpps:"10001234567", profession:"Médecin", specialite:"Médecine générale" },
  { id:"u-006", idNational:"SASN-100006", email:"sos.paris@structure.fr",     nom:"Leroy",   prenom:"Nathalie", roles:["gestionnaire_structure"],ville:"75014 Paris",     territoire:"SAS-75", actif:true,
    structures:[ {type:"sos_medecins",finess:"750000015",nom:"SOS Médecins Paris"}, {type:"sos_medecins",finess:"750000023",nom:"SOS Médecins Paris Est"}, {type:"cds",finess:"750100056",nom:"Centre de Santé Marcadet"}, {type:"cpts_msp",finess:"750200091",nom:"CPTS Paris 13"}, {type:"cpts_msp",finess:"750200108",nom:"MSP Paris 18"} ] },
  { id:"u-007", idNational:"SASN-100007", email:"cpts.rennes@structure.fr",   nom:"Girard",  prenom:"Hugo",     roles:["gestionnaire_structure","effecteur"], ville:"35000 Rennes", territoire:"SAS-35", actif:true,
    rpps:"10004567890", profession:"Médecin", specialite:"Médecine générale",
    structures:[ {type:"cpts_msp",finess:"350200117",nom:"CPTS Rennes Métropole"} ] },
  { id:"u-008", idNational:"SASN-100008", email:"julien.martin@effecteur.fr", nom:"Martin",  prenom:"Julien",   roles:["effecteur"],             ville:"69003 Lyon",      territoire:"SAS-69", actif:false, rpps:"10002345678", profession:"Médecin", specialite:"Médecine d'urgence" },
  { id:"u-009", idNational:"SASN-100009", email:"cds.montreuil@structure.fr", nom:"Fontaine",prenom:"Sarah",    roles:["gestionnaire_structure"],ville:"93100 Montreuil", territoire:"SAS-93", actif:true,
    structures:[ {type:"cds",finess:"930100063",nom:"Centre Municipal de Santé de Montreuil"} ] },
  { id:"u-010", idNational:"SASN-100010", email:"g.compte.lille@sas.gouv.fr", nom:"Chevalier",prenom:"Marion",  roles:["gestionnaire_compte"],   ville:"59000 Lille",     territoire:"SAS-59", actif:true },
  { id:"u-011", idNational:"SASN-100011", email:"lea.roussel@effecteur.fr",   nom:"Roussel", prenom:"Léa",      roles:["effecteur"],             ville:"31400 Toulouse",  territoire:"SAS-31", actif:true,  rpps:"10009012345", profession:"Chirurgien-dentiste", specialite:"Chirurgie orale" },
  { id:"u-012", idNational:"SASN-100012", email:"manuel.lopez@effecteur.fr",  nom:"Lopez",   prenom:"Manuel",   roles:["effecteur"],             ville:"33000 Bordeaux",  territoire:"SAS-33", actif:true,  rpps:"10010123456", profession:"Infirmier", specialite:"Soins généraux" },
  { id:"u-013", idNational:"SASN-100013", email:"chloe.meyer@effecteur.fr",   nom:"Meyer",   prenom:"Chloé",    roles:["effecteur"],             ville:"67100 Strasbourg",territoire:"SAS-67", actif:true,  rpps:"10011234567", profession:"Médecin", specialite:"Dermatologie" },
  { id:"u-014", idNational:"SASN-100014", email:"lucas.blanc@effecteur.fr",   nom:"Blanc",   prenom:"Lucas",    roles:["effecteur"],             ville:"13008 Marseille", territoire:"SAS-13", actif:true,  rpps:"10012345678", profession:"Médecin", specialite:"Ophtalmologie" },
  { id:"u-015", idNational:"SASN-100015", email:"manon.perrin@effecteur.fr",  nom:"Perrin",  prenom:"Manon",    roles:["effecteur"],             ville:"44100 Nantes",    territoire:"SAS-44", actif:true,  rpps:"10016789012", profession:"Sage-femme", specialite:"Maïeutique" },
  // Régulateurs OSNP
  { id:"u-016", idNational:"SASN-100016", email:"regul.osnp.lyon@sas.gouv.fr",   nom:"Nguyen",   prenom:"Linh",     roles:["regulateur_osnp"], ville:"69003 Lyon",      territoire:"SAS-69", actif:true },
  { id:"u-017", idNational:"SASN-100017", email:"regul.osnp.lille@sas.gouv.fr",  nom:"Dubois",   prenom:"Antoine",  roles:["regulateur_osnp"], ville:"59000 Lille",     territoire:"SAS-59", actif:true },
  { id:"u-018", idNational:"SASN-100018", email:"regul.osnp.marseille@sas.gouv.fr", nom:"Barbier", prenom:"Léa",   roles:["regulateur_osnp"], ville:"13008 Marseille", territoire:"SAS-13", actif:true },
  { id:"u-019", idNational:"SASN-100019", email:"regul.osnp.paris2@sas.gouv.fr", nom:"Colin",    prenom:"Maxime",   roles:["regulateur_osnp"], ville:"75015 Paris",     territoire:"SAS-75", actif:false },
  { id:"u-020", idNational:"SASN-100020", email:"regul.osnp.rennes@sas.gouv.fr", nom:"Guerin",   prenom:"Sophie",   roles:["regulateur_osnp"], ville:"35000 Rennes",    territoire:"SAS-35", actif:true },
];

/* ---------------------------------------------------------------- *
 *  ÉTAT
 * ---------------------------------------------------------------- */
const USERS_KEY = "bo-sas-users-v6";
const TERR_KEY  = "bo-sas-territoires-v1";
const DEP_KEY   = "bo-sas-departements-v1";
const SUP_KEY   = "bo-sas-support-v1";

const EMPTY_FILTERS = { q: "", role: "", territoire: "", ville: "", profSpec: "", structure: "", statut: "" };

const state = {
  users: loadUsers(),
  territoires: loadTerritoires(),
  departements: loadDepartements(),
  support: loadSupport(),
  identityIdx: 0,
  view: "list",   // "list" | "create" | "territoires" | "departements" | "support"
  editId: null,   // utilisateur en cours de modification
  filters: { ...EMPTY_FILTERS },
  form: newForm(),
  terr: null,     // { mode:'create'|'edit', code, num, dep, error }
  depSearch: "",  // recherche dans la page Départements
  depEdits: {},   // { [code]: { countyRadius?, cityDefaultRadius? } } — modifications en attente
  supCat: "support_n1", // catégorie active de Gestion Support
  supSearch: "",  // recherche dans la page Gestion Support
  supEdits: {},   // { [`${catKey}||${territory}`]: "email1, email2" } — modifications en attente
};

function normalizeUser(u) {
  if (!u.roles) u.roles = u.role ? [u.role] : [];
  delete u.role;
  return u;
}
function loadUsers() {
  try { const raw = localStorage.getItem(USERS_KEY); if (raw) return JSON.parse(raw).map(normalizeUser); } catch (e) {}
  return SEED_USERS.map(u => ({ ...u }));
}
function saveUsers() { try { localStorage.setItem(USERS_KEY, JSON.stringify(state.users)); } catch (e) {} }
function loadTerritoires() {
  try { const raw = localStorage.getItem(TERR_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return SEED_TERRITOIRES.map(t => ({ ...t }));
}
function saveTerritoires() { try { localStorage.setItem(TERR_KEY, JSON.stringify(state.territoires)); } catch (e) {} }
function loadDepartements() {
  try { const raw = localStorage.getItem(DEP_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return DEPARTEMENTS.map(d => ({ ...d }));
}
function saveDepartements() { try { localStorage.setItem(DEP_KEY, JSON.stringify(state.departements)); } catch (e) {} }
function loadSupport() {
  try { const raw = localStorage.getItem(SUP_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return JSON.parse(JSON.stringify(SUPPORT_REORIENTATIONS));
}
function saveSupport() { try { localStorage.setItem(SUP_KEY, JSON.stringify(state.support)); } catch (e) {} }

function newForm() {
  return { roles: [], idNational:"", email:"", nom:"", prenom:"", ville:"", territoire:"",
           rpps:"", pro:null,
           structures: [],            // [{ type, finess, nom, ville }] — plusieurs par type possible
           draftType: "sos_medecins", // type sélectionné dans le sélecteur d'ajout
           errors:{}, success:null };
}
function formFromUser(u) {
  const f = newForm();
  f.roles = [...(u.roles || [])];
  f.idNational = u.idNational || "";
  f.email = u.email; f.nom = u.nom; f.prenom = u.prenom; f.ville = u.ville; f.territoire = u.territoire;
  if (u.roles && u.roles.includes("effecteur") && u.profession) {
    f.rpps = u.rpps || "";
    f.pro = { nom: u.nom, prenom: u.prenom, profession: u.profession, specialite: u.specialite, rpps: u.rpps };
  }
  f.structures = (u.structures || []).map(s => {
    const e = FINESS_BY_ID[s.finess];
    return { type: s.type, finess: s.finess, nom: (e ? e.nom : s.nom), ville: (e ? e.ville : (s.ville || "")) };
  });
  return f;
}
function identity() { return IDENTITES[state.identityIdx]; }

/* ---------------------------------------------------------------- *
 *  UTILITAIRES
 * ---------------------------------------------------------------- */
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id) { return document.getElementById(id); }
function structuresOf(u) { return u.structures || []; }
function rolesOf(u) { return u.roles || []; }
function depOf(code) { const t = state.territoires.find(x => x.code === code); return t ? t.dep : ""; }

/* Modale simple de confirmation */
function showModal({ title, bodyHtml, confirmLabel = "Confirmer", cancelLabel = "Annuler", onConfirm }) {
  const root = el("modal-root");
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-box__head"><h2>${esc(title)}</h2></div>
        <div class="modal-box__body">${bodyHtml}</div>
        <div class="modal-box__foot">
          <button class="fr-btn fr-btn--secondary fr-btn--sm" id="modal-cancel">${esc(cancelLabel)}</button>
          <button class="fr-btn fr-btn--sm" id="modal-confirm">${esc(confirmLabel)}</button>
        </div>
      </div>
    </div>`;
  const close = () => { root.innerHTML = ""; };
  el("modal-cancel").onclick = close;
  root.querySelector(".modal-overlay").onclick = (e) => { if (e.target.classList.contains("modal-overlay")) close(); };
  el("modal-confirm").onclick = () => { close(); if (onConfirm) onConfirm(); };
}

/* ---------------------------------------------------------------- *
 *  MENU VERTICAL (sidebar)
 * ---------------------------------------------------------------- */
function renderSidebar() {
  const nav = el("sidebar-nav");
  const isAdmin = identity().role === "administrateur";
  const items = [
    { view:"list",   icon:"fr-icon-user-line",     label:"Utilisateurs" },
    { view:"create", icon:"fr-icon-user-add-line", label:"Créer un utilisateur" },
  ];
  if (isAdmin) items.push({ view:"territoires", icon:"fr-icon-map-pin-2-line", label:"Territoires SAS" });
  // Départements & Gestion Support : admin (tous) + gestionnaire de compte (son territoire)
  items.push({ view:"departements", icon:"fr-icon-building-line", label:"Départements" });
  items.push({ view:"support", icon:"fr-icon-mail-line", label:"Gestion Support" });

  nav.innerHTML = items.map(i => {
    const active = state.view === i.view && !(i.view === "create" && state.editId);
    return `<button class="nav-item ${active?"is-active":""}" data-view="${i.view}">
       <span class="${i.icon}" aria-hidden="true"></span>${i.label}
     </button>`;
  }).join("");
  nav.querySelectorAll(".nav-item").forEach(b => b.onclick = () => {
    state.view = b.dataset.view;
    if (state.view === "create") { state.form = newForm(); state.editId = null; }
    if (state.view === "territoires") state.terr = null;
    render();
  });

  const sel = el("identity-select");
  sel.innerHTML = IDENTITES.map((i, idx) => `<option value="${idx}">${esc(i.label)}</option>`).join("");
  sel.value = state.identityIdx;
  sel.onchange = () => {
    state.identityIdx = Number(sel.value);
    state.filters.territoire = "";
    state.depEdits = {}; state.supEdits = {}; // abandonner les modifications en attente
    if (state.view === "territoires" && identity().role !== "administrateur") state.view = "list";
    render();
  };
}

/* ================================================================ *
 *  VUE LISTE UTILISATEURS
 * ================================================================ */
function visibleUsers() {
  const id = identity();
  if (id.role === "administrateur") return state.users;
  if (id.role === "gestionnaire_compte") return state.users.filter(u => u.territoire === id.territoire);
  return [];
}
function filteredUsers() {
  const f = state.filters;
  const q = f.q.trim().toLowerCase();
  return visibleUsers().filter(u => {
    if (f.role && !rolesOf(u).includes(f.role)) return false;
    if (f.territoire && u.territoire !== f.territoire) return false;
    if (f.ville && u.ville !== f.ville) return false;
    if (f.profSpec && u.profession !== f.profSpec && u.specialite !== f.profSpec) return false;
    if (f.structure && !structuresOf(u).some(s => s.type === f.structure)) return false;
    if (f.statut === "actif" && !u.actif) return false;
    if (f.statut === "inactif" && u.actif) return false;
    if (!q) return true;
    const hay = [u.nom,u.prenom,u.email,u.idNational,u.ville,u.territoire,u.rpps,u.profession,u.specialite,
      ...rolesOf(u).map(r => ROLE_LABEL[r]),
      ...structuresOf(u).flatMap(s => [s.nom, s.finess, STRUCTURE_LABEL[s.type]])
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function roleBadge(role) { return `<span class="fr-badge fr-badge--sm badge-role badge-${role}">${esc(ROLE_LABEL[role])}</span>`; }

function userRow(u) {
  const statut = u.actif
    ? `<span class="fr-badge fr-badge--sm fr-badge--success">Actif</span>`
    : `<span class="fr-badge fr-badge--sm">Inactif</span>`;
  const parts = [];
  if (u.specialite) parts.push(`${esc(u.profession || "")} — ${esc(u.specialite)}`);
  if (structuresOf(u).length) parts.push(structuresOf(u).map(s => `${STRUCTURE_SHORT[s.type]} : ${esc(s.nom)}`).join(", "));
  const extra = parts.length ? " · " + parts.join(" · ") : "";
  return `
    <div class="user-row">
      <div class="user-row__body">
        <div class="user-row__l1">
          <span class="user-row__name">${esc(u.prenom)} ${esc(u.nom)}</span>
          ${rolesOf(u).map(roleBadge).join(" ")} ${statut}
        </div>
        <div class="user-row__l2" title="${esc(u.email)}">
          ${esc(u.email)} · ${esc(u.ville)}${u.territoire ? " · " + esc(u.territoire) : ""}${extra}
        </div>
      </div>
      <div class="user-row__actions">
        <button class="act-edit"   data-edit="${u.id}">Modifier</button>
        <button class="act-toggle" data-toggle="${u.id}">${u.actif ? "Désactiver" : "Activer"}</button>
        <button class="act-del"    data-del="${u.id}">Supprimer</button>
      </div>
    </div>`;
}

function selectField(key, label, options, includeAll = "Tous") {
  const opts = `<option value="">${includeAll}</option>` +
    options.map(o => `<option value="${esc(o.value)}" ${state.filters[key]===o.value?"selected":""}>${esc(o.label)}</option>`).join("");
  return `<div class="f-field">
      <label class="fr-label" for="flt-${key}">${esc(label)}</label>
      <select class="fr-select" id="flt-${key}" data-filter="${key}">${opts}</select>
    </div>`;
}

function renderList() {
  const id = identity();
  const isAdmin = id.role === "administrateur";
  const list = filteredUsers();
  const total = visibleUsers().length;
  const f = state.filters;
  const hasFilters = f.q || f.role || f.territoire || f.ville || f.profSpec || f.structure || f.statut;
  const villes = [...new Set(visibleUsers().map(u => u.ville))].sort();
  // Professions + spécialités présentes dans le périmètre visible
  const profSpecs = [...new Set(visibleUsers().flatMap(u => [u.profession, u.specialite]).filter(Boolean))].sort();

  el("view-list").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">Utilisateurs</h1>
        <p class="page-sub">${isAdmin
          ? "Vue administrateur — tous les territoires."
          : "Vue gestionnaire de compte — territoire <strong>"+esc(id.territoire)+"</strong>."}</p>
      </div>
      <button class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-user-add-line" data-goto="create">Créer un utilisateur</button>
    </div>

    <div class="filters">
      <div class="f-search">
        <label class="fr-label" for="flt-q">Rechercher</label>
        <input class="fr-input" type="search" id="flt-q" placeholder="Nom, email, ville, RPPS, FINESS…" value="${esc(f.q)}">
      </div>
      ${selectField("role", "Rôle", ROLES.map(r => ({ value:r.value, label:r.label })))}
      ${isAdmin ? selectField("territoire", "Territoire", state.territoires.map(t => ({ value:t.code, label:`${t.code} · ${t.dep}` }))) : ""}
      ${selectField("ville", "Ville", villes.map(v => ({ value:v, label:v })))}
      ${selectField("profSpec", "Profession / Spécialité", profSpecs.map(v => ({ value:v, label:v })))}
      ${selectField("structure", "Structure", STRUCTURE_TYPES.map(s => ({ value:s.value, label:s.label })))}
      ${selectField("statut", "Statut", [{value:"actif",label:"Actif"},{value:"inactif",label:"Inactif"}])}
      ${hasFilters ? `<div class="f-field"><button class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline" id="reset-filters">Réinitialiser</button></div>` : ""}
    </div>

    <p class="result-count">${list.length} utilisateur${list.length>1?"s":""}${hasFilters?` sur ${total}`:""}</p>
    <div class="user-list" id="user-list">${renderRows(list)}</div>

    <p class="mock-note" style="margin-top:1.5rem;">
      Données de démonstration (navigateur). <a href="#" id="reset-seed">Réinitialiser le jeu de démonstration</a>
    </p>`;

  bindListEvents();
}

function renderRows(list) {
  if (!list.length) return `<p class="mock-note" style="padding:1rem 0;">Aucun utilisateur ne correspond aux critères.</p>`;
  return list.map(userRow).join("");
}

function bindRowActions(root) {
  root.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const u = state.users.find(x => x.id === b.dataset.edit);
    if (u) { state.form = formFromUser(u); state.editId = u.id; state.view = "create"; render(); window.scrollTo({top:0}); }
  });
  root.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => {
    const u = state.users.find(x => x.id === b.dataset.toggle);
    if (u) { u.actif = !u.actif; saveUsers(); render(); }
  });
  root.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const u = state.users.find(x => x.id === b.dataset.del);
    if (u && confirm(`Supprimer ${u.prenom} ${u.nom} ?`)) { state.users = state.users.filter(x => x.id !== u.id); saveUsers(); render(); }
  });
}

function bindListEvents() {
  const root = el("view-list");
  root.querySelector("[data-goto='create']").onclick = () => { state.view="create"; state.form=newForm(); state.editId=null; render(); };

  root.querySelector("#flt-q").oninput = (e) => {
    state.filters.q = e.target.value;
    const list = filteredUsers();
    el("user-list").innerHTML = renderRows(list);
    bindRowActions(el("user-list"));
    const total = visibleUsers().length;
    const f = state.filters;
    const hasFilters = f.q || f.role || f.territoire || f.ville || f.profSpec || f.structure || f.statut;
    root.querySelector(".result-count").textContent =
      `${list.length} utilisateur${list.length>1?"s":""}${hasFilters?` sur ${total}`:""}`;
  };

  root.querySelectorAll("[data-filter]").forEach(sel => sel.onchange = () => { state.filters[sel.dataset.filter] = sel.value; render(); });
  const reset = root.querySelector("#reset-filters");
  if (reset) reset.onclick = () => { state.filters = { ...EMPTY_FILTERS }; render(); };
  root.querySelector("#reset-seed").onclick = (e) => {
    e.preventDefault();
    if (confirm("Réinitialiser toutes les données de démonstration ?")) {
      state.users = SEED_USERS.map(u=>({...u}));
      state.territoires = SEED_TERRITOIRES.map(t=>({...t}));
      state.departements = DEPARTEMENTS.map(d=>({...d}));
      saveUsers(); saveTerritoires(); saveDepartements(); render();
    }
  };
  bindRowActions(root);
}

/* ================================================================ *
 *  VUE CRÉATION / MODIFICATION UTILISATEUR
 * ================================================================ */
function renderCreate() {
  const f = state.form;
  const editing = !!state.editId;
  const isEffecteur = f.roles.includes("effecteur");
  const isStructure = f.roles.includes("gestionnaire_structure");
  const hasRoles = f.roles.length > 0;
  // Le rôle administrateur seul n'a pas besoin de territoire
  const needsTerritoire = f.roles.some(r => r !== "administrateur");
  const locked = isEffecteur && f.pro;
  const err = (k) => f.errors[k] ? `<p class="fr-error-text">${esc(f.errors[k])}</p>` : "";
  const grp = (k) => `fr-input-group ${f.errors[k]?"fr-input-group--error":""}`;
  const req = ' <span style="color:#ce0500">*</span>';

  const success = f.success ? `
    <div class="fr-alert fr-alert--success fr-mb-3w">
      <h3 class="fr-alert__title">Utilisateur ${f.success.mode==='edit'?'modifié':'créé'}</h3>
      <p>${esc(f.success.prenom)} ${esc(f.success.nom)} (${esc(f.success.email)}) a été ${f.success.mode==='edit'?'mis à jour':'créé'}.</p>
      <button class="fr-btn fr-btn--sm" data-goto-list>Voir la liste</button>
    </div>` : "";

  const rolesCheckboxes = ROLES.map(r => `
    <div class="fr-checkbox-group">
      <input type="checkbox" id="role-${r.value}" data-role="${r.value}" ${f.roles.includes(r.value)?"checked":""}>
      <label class="fr-label" for="role-${r.value}">${esc(r.label)}</label>
    </div>`).join("");

  // Bloc structures — placé juste sous le champ Rôle.
  // Rattachement à PLUSIEURS structures, y compris du même type
  // (ex. 2 CPTS + 3 MSP + 2 SOS Médecins).
  const addedItems = f.structures.map((s, i) => `
    <div class="struct-item">
      <div><strong>${esc(STRUCTURE_SHORT[s.type])}</strong> — ${esc(s.nom)} <span class="mock-note">FINESS ${esc(s.finess)}</span></div>
      <button type="button" class="fr-link" data-struct-remove="${i}">Retirer</button>
    </div>`).join("");
  const typeOpts = STRUCTURE_TYPES.map(s => `<option value="${s.value}" ${f.draftType===s.value?"selected":""}>${esc(s.label)}</option>`).join("");
  const finessOpts = FINESS_DIRECTORY.filter(x => x.type===f.draftType).map(x => `${esc(x.nom)} — FINESS ${x.finess} (${esc(x.ville)})`);
  const structureBlock = isStructure ? `
    <fieldset class="struct-fieldset ${f.errors.structures?'has-err':''}">
      <legend>Structures rattachées${req}</legend>
      <p class="fr-hint-text" style="margin-top:0;">Un gestionnaire peut être rattaché à plusieurs structures, y compris du même type (ex. 2 CPTS + 3 MSP + 2 SOS Médecins).</p>
      ${addedItems}
      <p class="struct-count">${f.structures.length} structure${f.structures.length>1?"s":""} rattachée${f.structures.length>1?"s":""}</p>
      <div class="struct-add">
        <div class="fr-input-group sa-type">
          <label class="fr-label" for="struct-type">Type</label>
          <select class="fr-select" id="struct-type">${typeOpts}</select>
        </div>
        <div class="fr-input-group sa-finess">
          <label class="fr-label" for="struct-finess">Structure (${esc(STRUCTURE_LABEL[f.draftType])})</label>
          <input class="fr-input" id="struct-finess" list="struct-finess-list" placeholder="Rechercher…">
          <datalist id="struct-finess-list">${finessOpts.map(o=>`<option value="${esc(o)}">`).join("")}</datalist>
        </div>
        <button class="fr-btn fr-btn--sm" type="button" id="struct-add-btn">Ajouter</button>
      </div>
      ${err('structures')}
    </fieldset>` : "";

  const rppsBlock = isEffecteur ? `
    <div class="${grp('rpps')}">
      <label class="fr-label" for="rpps">Numéro RPPS${req}
        <span class="fr-hint-text">Pré-remplit automatiquement nom, prénom, profession et spécialité (Annuaire Santé).</span></label>
      <div style="display:flex;gap:.5rem;">
        <input class="fr-input" id="rpps" inputmode="numeric" placeholder="Ex : 10001234567" value="${esc(f.rpps)}">
        <button class="fr-btn" type="button" id="rpps-search">Rechercher</button>
      </div>
      ${f.pro ? `<div class="fr-alert fr-alert--info fr-alert--sm fr-mt-1w"><p><strong>${esc(f.pro.prenom)} ${esc(f.pro.nom)}</strong> — ${esc(f.pro.profession)} · ${esc(f.pro.specialite)}</p></div>` : ""}
      ${err('rpps')}
      <p class="mock-note" style="margin-top:.4rem;">RPPS de démo : 10001234567, 10002345678, 10003456789…</p>
    </div>` : "";

  const territoireOptions = `<option value="">— Sélectionner —</option>` +
    state.territoires.map(t => `<option value="${t.code}" ${f.territoire===t.code?"selected":""}>${esc(t.code)} · ${esc(t.dep)}</option>`).join("");

  el("view-create").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">${editing ? "Modifier l'utilisateur" : "Créer un utilisateur"}</h1>
    <p class="page-sub" style="margin-bottom:1.25rem;">Les champs varient selon les rôles sélectionnés.</p>
    ${success}
    <form class="bo-form" id="create-form" novalidate>
      <div class="${grp('roles')}">
        <label class="fr-label">Rôle(s)${req}<span class="fr-hint-text">Un utilisateur peut cumuler plusieurs rôles.</span></label>
        <div class="roles-checkboxes">${rolesCheckboxes}</div>
        ${err('roles')}
      </div>

      ${structureBlock}

      ${hasRoles ? `
        ${rppsBlock}
        <div class="${grp('prenom')}">
          <label class="fr-label" for="prenom">Prénom${req}${locked?' <span class="readonly-note">(via RPPS)</span>':''}</label>
          <input class="fr-input" id="prenom" value="${esc(f.prenom)}" ${locked?"readonly":""}>${err('prenom')}
        </div>
        <div class="${grp('nom')}">
          <label class="fr-label" for="nom">Nom${req}${locked?' <span class="readonly-note">(via RPPS)</span>':''}</label>
          <input class="fr-input" id="nom" value="${esc(f.nom)}" ${locked?"readonly":""}>${err('nom')}
        </div>
        ${(isEffecteur && f.pro) ? `
          <div class="fr-input-group"><label class="fr-label">Profession</label><input class="fr-input" value="${esc(f.pro.profession)}" readonly></div>
          <div class="fr-input-group"><label class="fr-label">Spécialité</label><input class="fr-input" value="${esc(f.pro.specialite)}" readonly></div>` : ""}
        <div class="${grp('idNational')}">
          <label class="fr-label" for="idNational">Identifiant national${req}<span class="fr-hint-text">Identifiant national du compte utilisateur</span></label>
          <input class="fr-input" id="idNational" placeholder="Ex : SASN-100016" value="${esc(f.idNational)}">${err('idNational')}
        </div>
        <div class="${grp('email')}">
          <label class="fr-label" for="email">Adresse électronique${req}</label>
          <input class="fr-input" type="email" id="email" placeholder="prenom.nom@exemple.fr" value="${esc(f.email)}">${err('email')}
        </div>
        <div class="${grp('ville')}">
          <label class="fr-label" for="ville">Ville${req}<span class="fr-hint-text">Commune de rattachement (Base Adresse Nationale)</span></label>
          <input class="fr-input" id="ville" list="communes-list" placeholder="Commune ou code postal…" value="${esc(f.ville)}">
          <datalist id="communes-list">${COMMUNES.map(c=>`<option value="${esc(c)}">`).join("")}</datalist>${err('ville')}
        </div>
        ${needsTerritoire ? `
        <div class="${grp('territoire')}">
          <label class="fr-label" for="territoire">Territoire SAS${req}<span class="fr-hint-text">Format SAS-[n° département]</span></label>
          <select class="fr-select" id="territoire">${territoireOptions}</select>${err('territoire')}
        </div>` : `
        <p class="mock-note" style="margin:-.25rem 0 1rem;">Rôle administrateur : accès à tous les territoires, aucun territoire à renseigner.</p>`}
      ` : ""}
      <div style="display:flex;gap:.5rem;margin-top:1rem;">
        <button class="fr-btn" type="submit">${editing ? "Enregistrer les modifications" : "Créer l'utilisateur"}</button>
        <button class="fr-btn fr-btn--secondary" type="button" data-goto-list>Annuler</button>
      </div>
    </form>`;

  bindCreateEvents();
}

function bindCreateEvents() {
  const root = el("view-create");
  const f = state.form;

  root.querySelectorAll("[data-goto-list]").forEach(b => b.onclick = () => { state.view="list"; state.editId=null; render(); });

  root.querySelectorAll("[data-role]").forEach(cb => cb.onchange = () => {
    const val = cb.dataset.role;
    if (cb.checked) { if (!f.roles.includes(val)) f.roles.push(val); }
    else f.roles = f.roles.filter(r => r !== val);
    // Nettoyage des champs devenus inutiles
    if (!f.roles.includes("effecteur")) { f.rpps=""; f.pro=null; }
    if (!f.roles.includes("gestionnaire_structure")) f.structures = [];
    delete f.errors.roles;
    render();
  });

  const bind = (id, key) => { const e = root.querySelector("#"+id); if (e) e.oninput = () => { f[key] = e.value; }; };
  bind("email","email"); bind("nom","nom"); bind("prenom","prenom"); bind("ville","ville"); bind("idNational","idNational");
  const terr = root.querySelector("#territoire");
  if (terr) terr.onchange = () => { f.territoire = terr.value; };

  const rppsInput = root.querySelector("#rpps");
  if (rppsInput) rppsInput.oninput = () => { f.rpps = rppsInput.value; f.pro = null; };
  const rppsBtn = root.querySelector("#rpps-search");
  if (rppsBtn) rppsBtn.onclick = () => {
    const entry = RPPS_DIRECTORY.find(x => x.rpps === f.rpps.trim());
    if (entry) { f.pro = entry; f.nom = entry.nom; f.prenom = entry.prenom; delete f.errors.rpps; }
    else { f.pro = null; f.errors.rpps = "Aucun professionnel trouvé pour ce n° RPPS."; }
    render();
  };

  // Ajout de structures (plusieurs, même type autorisé)
  const typeSel = root.querySelector("#struct-type");
  if (typeSel) typeSel.onchange = () => { f.draftType = typeSel.value; render(); };
  const addBtn = root.querySelector("#struct-add-btn");
  if (addBtn) addBtn.onclick = () => {
    const inp = root.querySelector("#struct-finess");
    const m = inp.value.match(/FINESS (\d+)/);
    const entry = m ? FINESS_BY_ID[m[1]] : null;
    if (!entry || entry.type !== f.draftType) { f.errors.structures = "Choisissez une structure dans la liste."; render(); return; }
    if (f.structures.some(s => s.finess === entry.finess)) { f.errors.structures = "Cette structure est déjà rattachée."; render(); return; }
    f.structures.push({ type: entry.type, finess: entry.finess, nom: entry.nom, ville: entry.ville });
    delete f.errors.structures;
    render();
  };
  root.querySelectorAll("[data-struct-remove]").forEach(b => b.onclick = () => {
    f.structures.splice(Number(b.dataset.structRemove), 1); render();
  });

  root.querySelector("#create-form").onsubmit = (e) => { e.preventDefault(); submitForm(); };
}

function submitForm() {
  const f = state.form;
  const editing = !!state.editId;
  const isEffecteur = f.roles.includes("effecteur");
  const isStructure = f.roles.includes("gestionnaire_structure");
  const errors = {};
  if (!f.roles.length) errors.roles = "Sélectionnez au moins un rôle.";
  if (!f.idNational.trim()) errors.idNational = "Identifiant national requis.";
  if (!f.email.trim() || !f.email.includes("@")) errors.email = "Email invalide.";
  if (!f.nom.trim()) errors.nom = "Nom requis.";
  if (!f.prenom.trim()) errors.prenom = "Prénom requis.";
  if (!f.ville.trim()) errors.ville = "Ville requise.";
  const needsTerritoire = f.roles.some(r => r !== "administrateur");
  if (needsTerritoire && !f.territoire) errors.territoire = "Territoire SAS requis.";
  if (isEffecteur && !f.pro) errors.rpps = "Renseignez un n° RPPS valide.";
  if (isStructure && f.structures.length === 0) errors.structures = "Ajoutez au moins une structure.";
  f.errors = errors;
  if (Object.keys(errors).length) { render(); return; }

  const base = {
    idNational: f.idNational.trim(), email: f.email.trim(), nom: f.nom.trim(), prenom: f.prenom.trim(),
    roles: [...f.roles], ville: f.ville.trim(), territoire: needsTerritoire ? f.territoire : "",
  };
  if (isEffecteur && f.pro) { base.rpps = f.rpps.trim(); base.profession = f.pro.profession; base.specialite = f.pro.specialite; }
  if (isStructure) {
    base.structures = f.structures.map(s => ({ type: s.type, finess: s.finess, nom: s.nom, ville: s.ville }));
  }

  let saved;
  if (editing) {
    const u = state.users.find(x => x.id === state.editId);
    delete u.rpps; delete u.profession; delete u.specialite; delete u.structures; delete u.role;
    Object.assign(u, base);
    saved = u;
  } else {
    saved = { id: "u-" + Math.random().toString(36).slice(2, 8), actif: true, ...base };
    state.users.unshift(saved);
  }
  saveUsers();

  const mode = editing ? "edit" : "create";
  state.editId = null;
  state.form = newForm();
  state.form.success = { prenom: saved.prenom, nom: saved.nom, email: saved.email, mode };
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================================================================ *
 *  VUE TERRITOIRES SAS (CRUD)
 * ================================================================ */
function usersInTerritoire(code) { return state.users.filter(u => u.territoire === code).length; }

function renderTerritoires() {
  const t = state.terr;
  const rows = state.territoires.map(x => {
    const n = usersInTerritoire(x.code);
    return `<tr>
      <td><strong>${esc(x.code)}</strong></td>
      <td>${esc(x.dep)}</td>
      <td>${n}</td>
      <td>
        <button class="fr-link" data-terr-edit="${esc(x.code)}">Modifier</button>
        <button class="fr-link" style="color:#ce0500" data-terr-del="${esc(x.code)}">Supprimer</button>
      </td>
    </tr>`;
  }).join("");

  let formHtml = "";
  if (t) {
    const editing = t.mode === "edit";
    const codePreview = t.num ? `SAS-${esc(t.num.trim())}` : "SAS-…";
    formHtml = `
      <div class="terr-form">
        <h2 class="fr-h6" style="margin-top:0;">${editing ? "Modifier le territoire" : "Nouveau territoire"}</h2>
        <div class="row">
          <div class="fr-input-group ${t.error&&!t.num?'fr-input-group--error':''}" style="flex:0 0 150px;">
            <label class="fr-label" for="terr-num">N° département <span style="color:#ce0500">*</span></label>
            <input class="fr-input" id="terr-num" inputmode="text" placeholder="Ex : 75, 2A" value="${esc(t.num)}">
          </div>
          <div class="fr-input-group" style="flex:1 1 220px;">
            <label class="fr-label" for="terr-dep">Nom du département <span style="color:#ce0500">*</span></label>
            <input class="fr-input" id="terr-dep" placeholder="Ex : Paris" value="${esc(t.dep)}">
          </div>
        </div>
        <p class="terr-code-preview">Code du territoire : ${codePreview}</p>
        ${t.error ? `<p class="fr-error-text">${esc(t.error)}</p>` : ""}
        <div style="display:flex;gap:.5rem;margin-top:.5rem;">
          <button class="fr-btn fr-btn--sm" id="terr-save">${editing ? "Enregistrer" : "Ajouter"}</button>
          <button class="fr-btn fr-btn--sm fr-btn--secondary" id="terr-cancel">Annuler</button>
        </div>
      </div>`;
  }

  el("view-territoires").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">Territoires SAS</h1>
        <p class="page-sub">Référentiel des territoires — format SAS-[n° département].</p>
      </div>
      ${t ? "" : `<button class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-user-add-line" id="terr-add">Ajouter un territoire</button>`}
    </div>
    ${formHtml}
    <table class="terr-table">
      <thead><tr><th>Code</th><th>Département</th><th>Utilisateurs</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  bindTerritoiresEvents();
}

function bindTerritoiresEvents() {
  const root = el("view-territoires");
  const add = root.querySelector("#terr-add");
  if (add) add.onclick = () => { state.terr = { mode:"create", code:null, num:"", dep:"", error:"" }; render(); };

  root.querySelectorAll("[data-terr-edit]").forEach(b => b.onclick = () => {
    const x = state.territoires.find(v => v.code === b.dataset.terrEdit);
    if (x) { state.terr = { mode:"edit", code:x.code, num:x.code.replace(/^SAS-/,""), dep:x.dep, error:"" }; render(); }
  });
  root.querySelectorAll("[data-terr-del]").forEach(b => b.onclick = () => {
    const code = b.dataset.terrDel;
    const n = usersInTerritoire(code);
    const msg = n ? `Le territoire ${code} est rattaché à ${n} utilisateur(s). Le supprimer quand même ?` : `Supprimer le territoire ${code} ?`;
    if (confirm(msg)) { state.territoires = state.territoires.filter(v => v.code !== code); saveTerritoires(); render(); }
  });

  const t = state.terr;
  if (t) {
    const numI = root.querySelector("#terr-num");
    const depI = root.querySelector("#terr-dep");
    numI.oninput = () => { t.num = numI.value; root.querySelector(".terr-code-preview").textContent = "Code du territoire : SAS-" + (t.num.trim() || "…"); };
    depI.oninput = () => { t.dep = depI.value; };
    root.querySelector("#terr-cancel").onclick = () => { state.terr = null; render(); };
    root.querySelector("#terr-save").onclick = () => saveTerritoireForm();
  }
}

function saveTerritoireForm() {
  const t = state.terr;
  const num = t.num.trim().toUpperCase();
  const dep = t.dep.trim();
  if (!num || !dep) { t.error = "Renseignez le numéro et le nom du département."; render(); return; }
  const code = "SAS-" + num;
  const clash = state.territoires.find(x => x.code === code && code !== t.code);
  if (clash) { t.error = `Le territoire ${code} existe déjà.`; render(); return; }

  if (t.mode === "edit") {
    const x = state.territoires.find(v => v.code === t.code);
    const oldCode = x.code;
    x.code = code; x.dep = dep;
    // Répercuter le changement de code sur les utilisateurs rattachés
    if (oldCode !== code) state.users.forEach(u => { if (u.territoire === oldCode) u.territoire = code; });
    saveUsers();
  } else {
    state.territoires.push({ code, dep });
  }
  state.territoires.sort((a,b) => a.code.localeCompare(b.code, "fr", { numeric:true }));
  saveTerritoires();
  state.terr = null;
  render();
}

/* ================================================================ *
 *  VUE DÉPARTEMENTS (rayons de recherche par défaut)
 * ================================================================ */
function depVisible() {
  const id = identity();
  if (id.role === "administrateur") return state.departements;
  // Gestionnaire de compte : uniquement le département de son territoire SAS
  return state.departements.filter(d => (d.territory || []).some(t => t.name === id.territoire));
}
function depFiltered() {
  const q = state.depSearch.trim().toLowerCase();
  const list = depVisible();
  if (!q) return list;
  return list.filter(d => (d.code + " " + d.label + " " + d.region + " " + (d.territory||[]).map(t=>t.name).join(" ")).toLowerCase().includes(q));
}
function depPending(code, field, orig) {
  return (state.depEdits[code] && field in state.depEdits[code]) ? state.depEdits[code][field] : orig;
}
function depChanged(code, field, orig) {
  return state.depEdits[code] && field in state.depEdits[code] && state.depEdits[code][field] !== orig;
}
function depEditCount() {
  let n = 0;
  for (const code in state.depEdits) n += Object.keys(state.depEdits[code]).length;
  return n;
}
function depRows(list) {
  if (!list.length) return `<tr><td colspan="7" style="padding:1rem;color:#666;">Aucun département.</td></tr>`;
  return list.map(d => `
    <tr>
      <td><strong>${esc(d.code)}</strong></td>
      <td>${esc(d.label)}</td>
      <td>${esc(d.region)}</td>
      <td>${esc((d.territory||[]).map(t=>t.name).join(", "))}</td>
      <td class="num">${esc(d.area)}</td>
      <td class="num"><input class="dep-radius-input ${depChanged(d.code,'countyRadius',d.countyRadius)?'changed':''}" type="number" min="0" step="1" value="${esc(depPending(d.code,'countyRadius',d.countyRadius))}" data-dep-county="${esc(d.code)}"></td>
      <td class="num"><input class="dep-radius-input ${depChanged(d.code,'cityDefaultRadius',d.cityDefaultRadius)?'changed':''}" type="number" min="0" step="0.5" value="${esc(depPending(d.code,'cityDefaultRadius',d.cityDefaultRadius))}" data-dep-city="${esc(d.code)}"></td>
    </tr>`).join("");
}

function renderDepartements() {
  const id = identity();
  const isAdmin = id.role === "administrateur";
  const list = depFiltered();
  const n = depEditCount();

  el("view-departements").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Départements</h1>
    <p class="page-sub">${isAdmin ? "Tous les territoires SAS." : "Territoire <strong>"+esc(id.territoire)+"</strong>."} Paramétrez les rayons de recherche par défaut.</p>
    <div class="save-bar">
      <button class="fr-btn fr-btn--sm" id="dep-save" ${n?"":"disabled"}>Enregistrer</button>
      <span class="mock-note" id="dep-pending">${n ? `${n} modification${n>1?"s":""} en attente` : "Aucune modification"}</span>
    </div>
    <div class="fr-input-group" style="max-width:340px;margin:.25rem 0 .25rem;">
      <label class="fr-label" for="dep-q">Rechercher</label>
      <input class="fr-input" type="search" id="dep-q" placeholder="Code, département, région…" value="${esc(state.depSearch)}">
    </div>
    <p class="result-count" id="dep-count">${list.length} département${list.length>1?"s":""}</p>
    <div class="dep-wrap">
      <table class="dep-table">
        <thead><tr>
          <th>Code</th><th>Département</th><th>Région</th><th>Territoire SAS</th>
          <th class="num">Superficie (km²)</th>
          <th class="num" title="Rayon de recherche par défaut">Rayon défaut (km)</th>
          <th class="num" title="Rayon de recherche par défaut pour les villes de ce département">Rayon villes (km)</th>
        </tr></thead>
        <tbody id="dep-body">${depRows(list)}</tbody>
      </table>
    </div>`;

  bindDepartementsEvents();
}

function depUpdateSaveBar() {
  const n = depEditCount();
  const btn = el("dep-save"); if (btn) btn.disabled = n === 0;
  const info = el("dep-pending"); if (info) info.textContent = n ? `${n} modification${n>1?"s":""} en attente` : "Aucune modification";
}
function depSetEdit(code, field, orig, raw) {
  const val = raw === "" ? 0 : Number(raw);
  if (val === orig) { if (state.depEdits[code]) { delete state.depEdits[code][field]; if (!Object.keys(state.depEdits[code]).length) delete state.depEdits[code]; } }
  else { state.depEdits[code] = state.depEdits[code] || {}; state.depEdits[code][field] = val; }
}
function bindDepRowInputs(root) {
  root.querySelectorAll("[data-dep-county]").forEach(inp => inp.oninput = () => {
    const d = state.departements.find(x => x.code === inp.dataset.depCounty);
    if (!d) return;
    depSetEdit(d.code, "countyRadius", d.countyRadius, inp.value);
    inp.classList.toggle("changed", depChanged(d.code, "countyRadius", d.countyRadius));
    depUpdateSaveBar();
  });
  root.querySelectorAll("[data-dep-city]").forEach(inp => inp.oninput = () => {
    const d = state.departements.find(x => x.code === inp.dataset.depCity);
    if (!d) return;
    depSetEdit(d.code, "cityDefaultRadius", d.cityDefaultRadius, inp.value);
    inp.classList.toggle("changed", depChanged(d.code, "cityDefaultRadius", d.cityDefaultRadius));
    depUpdateSaveBar();
  });
}
function bindDepartementsEvents() {
  const root = el("view-departements");
  root.querySelector("#dep-q").oninput = (e) => {
    state.depSearch = e.target.value;
    const list = depFiltered();
    el("dep-body").innerHTML = depRows(list);
    el("dep-count").textContent = `${list.length} département${list.length>1?"s":""}`;
    bindDepRowInputs(el("dep-body"));
  };
  root.querySelector("#dep-save").onclick = () => {
    const items = [];
    for (const code in state.depEdits) {
      const d = state.departements.find(x => x.code === code);
      const e = state.depEdits[code];
      if ("countyRadius" in e) items.push(`<li><strong>${esc(code)} ${esc(d.label)}</strong> — Rayon défaut : <span class="old">${esc(d.countyRadius)}</span> → <span class="new">${esc(e.countyRadius)} km</span></li>`);
      if ("cityDefaultRadius" in e) items.push(`<li><strong>${esc(code)} ${esc(d.label)}</strong> — Rayon villes : <span class="old">${esc(d.cityDefaultRadius)}</span> → <span class="new">${esc(e.cityDefaultRadius)} km</span></li>`);
    }
    showModal({
      title: "Confirmer l'enregistrement",
      bodyHtml: `<p class="fr-text--sm">Les valeurs suivantes vont être enregistrées :</p><ul class="modal-changes">${items.join("")}</ul>`,
      confirmLabel: "Enregistrer",
      onConfirm: () => {
        for (const code in state.depEdits) {
          const d = state.departements.find(x => x.code === code);
          Object.assign(d, state.depEdits[code]);
        }
        state.depEdits = {};
        saveDepartements();
        render();
      },
    });
  };
  bindDepRowInputs(root);
}

/* ================================================================ *
 *  VUE GESTION SUPPORT (mails de réorientation)
 * ================================================================ */
function supTerrToken(t) { return String(t).split(" ")[0]; }
function supVisibleTerritories(cat) {
  const id = identity();
  if (id.role === "administrateur") return cat.territories;
  return cat.territories.filter(x => supTerrToken(x.territory) === id.territoire);
}
function supCurrentCat() { return state.support.find(c => c.reorientation_key === state.supCat) || state.support[0]; }
function supKey(catKey, territory) { return catKey + "||" + territory; }
function supDisplay(catKey, entry) {
  const k = supKey(catKey, entry.territory);
  return (k in state.supEdits) ? state.supEdits[k] : entry.emails.join(", ");
}
function supEditCount() { return Object.keys(state.supEdits).length; }
function supParseEmails(str) { return str.split(/[;,]/).map(s => s.trim()).filter(Boolean); }

function supRows(cat, list) {
  if (!list.length) return `<tr><td colspan="2" style="padding:1rem;color:#666;">Aucun territoire.</td></tr>`;
  return list.map(entry => {
    const k = supKey(cat.reorientation_key, entry.territory);
    const changed = (k in state.supEdits) && state.supEdits[k] !== entry.emails.join(", ");
    return `<tr>
      <td class="terr">${esc(entry.territory)}</td>
      <td><input class="sup-emails-input ${changed?'changed':''}" value="${esc(supDisplay(cat.reorientation_key, entry))}"
        data-sup-territory="${esc(entry.territory)}" placeholder="email1@ex.fr, email2@ex.fr"></td>
    </tr>`;
  }).join("");
}

function renderSupport() {
  const id = identity();
  const isAdmin = id.role === "administrateur";
  const cat = supCurrentCat();
  const q = state.supSearch.trim().toLowerCase();
  let list = supVisibleTerritories(cat);
  if (q) list = list.filter(x => x.territory.toLowerCase().includes(q) || x.emails.join(" ").toLowerCase().includes(q));
  const n = supEditCount();

  el("view-support").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Gestion Support</h1>
    <p class="page-sub">${isAdmin ? "Tous les territoires." : "Territoire <strong>"+esc(id.territoire)+"</strong>."} Mails de réorientation par catégorie.</p>
    <div class="sup-tabs">
      ${state.support.map(c => `<button class="sup-tab ${c.reorientation_key===state.supCat?'is-active':''}" data-sup-cat="${esc(c.reorientation_key)}">${esc(c.reorientation_name)}</button>`).join("")}
    </div>
    <div class="save-bar">
      <button class="fr-btn fr-btn--sm" id="sup-save" ${n?"":"disabled"}>Enregistrer</button>
      <span class="mock-note" id="sup-pending">${n ? `${n} modification${n>1?"s":""} en attente` : "Aucune modification"}</span>
    </div>
    <div class="fr-input-group" style="max-width:340px;margin:.25rem 0;">
      <label class="fr-label" for="sup-q">Rechercher</label>
      <input class="fr-input" type="search" id="sup-q" placeholder="Territoire ou email…" value="${esc(state.supSearch)}">
    </div>
    <p class="result-count" id="sup-count">${list.length} territoire${list.length>1?"s":""}</p>
    <table class="sup-table">
      <thead><tr><th>Territoire</th><th>Emails (séparés par une virgule)</th></tr></thead>
      <tbody id="sup-body">${supRows(cat, list)}</tbody>
    </table>`;

  bindSupportEvents();
}

function supUpdateSaveBar() {
  const n = supEditCount();
  const btn = el("sup-save"); if (btn) btn.disabled = n === 0;
  const info = el("sup-pending"); if (info) info.textContent = n ? `${n} modification${n>1?"s":""} en attente` : "Aucune modification";
}
function bindSupRowInputs(root) {
  const cat = supCurrentCat();
  root.querySelectorAll("[data-sup-territory]").forEach(inp => inp.oninput = () => {
    const territory = inp.dataset.supTerritory;
    const entry = cat.territories.find(x => x.territory === territory);
    const k = supKey(cat.reorientation_key, territory);
    const original = entry.emails.join(", ");
    if (inp.value === original) delete state.supEdits[k];
    else state.supEdits[k] = inp.value;
    inp.classList.toggle("changed", (k in state.supEdits));
    supUpdateSaveBar();
  });
}
function bindSupportEvents() {
  const root = el("view-support");
  root.querySelectorAll("[data-sup-cat]").forEach(b => b.onclick = () => { state.supCat = b.dataset.supCat; render(); });
  root.querySelector("#sup-q").oninput = (e) => {
    state.supSearch = e.target.value;
    const cat = supCurrentCat();
    const q = state.supSearch.trim().toLowerCase();
    let list = supVisibleTerritories(cat);
    if (q) list = list.filter(x => x.territory.toLowerCase().includes(q) || x.emails.join(" ").toLowerCase().includes(q));
    el("sup-body").innerHTML = supRows(cat, list);
    el("sup-count").textContent = `${list.length} territoire${list.length>1?"s":""}`;
    bindSupRowInputs(el("sup-body"));
  };
  root.querySelector("#sup-save").onclick = () => {
    const items = [];
    for (const k in state.supEdits) {
      const [catKey, territory] = k.split("||");
      const cat = state.support.find(c => c.reorientation_key === catKey);
      const entry = cat.territories.find(x => x.territory === territory);
      items.push(`<li><strong>${esc(cat.reorientation_name)} — ${esc(territory)}</strong><br><span class="old">${esc(entry.emails.join(", "))}</span> → <span class="new">${esc(supParseEmails(state.supEdits[k]).join(", "))}</span></li>`);
    }
    showModal({
      title: "Confirmer l'enregistrement",
      bodyHtml: `<p class="fr-text--sm">Les mails suivants vont être enregistrés :</p><ul class="modal-changes">${items.join("")}</ul>`,
      confirmLabel: "Enregistrer",
      onConfirm: () => {
        for (const k in state.supEdits) {
          const [catKey, territory] = k.split("||");
          const cat = state.support.find(c => c.reorientation_key === catKey);
          const entry = cat.territories.find(x => x.territory === territory);
          entry.emails = supParseEmails(state.supEdits[k]);
        }
        state.supEdits = {};
        saveSupport();
        render();
      },
    });
  };
  bindSupRowInputs(root);
}

/* ================================================================ *
 *  RENDU GLOBAL
 * ================================================================ */
function render() {
  renderSidebar();
  el("view-list").hidden        = state.view !== "list";
  el("view-create").hidden      = state.view !== "create";
  el("view-territoires").hidden = state.view !== "territoires";
  el("view-departements").hidden= state.view !== "departements";
  el("view-support").hidden     = state.view !== "support";
  if (state.view === "list") renderList();
  else if (state.view === "create") renderCreate();
  else if (state.view === "territoires") renderTerritoires();
  else if (state.view === "departements") renderDepartements();
  else if (state.view === "support") renderSupport();
}

document.addEventListener("DOMContentLoaded", render);
