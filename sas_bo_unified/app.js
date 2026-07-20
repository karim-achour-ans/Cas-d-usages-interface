/* ==================================================================
   Arrière-guichet SAS — mock autonome (aucune dépendance, aucun serveur)
   Menu fixe · liste en lignes · CRUD utilisateurs (rôles multiples,
   structures multiples) · CRUD territoires SAS.
   ================================================================== */
"use strict";

/* ---------------------------------------------------------------- *
 *  RÉFÉRENTIELS
 * ---------------------------------------------------------------- */
/* Rôles gérés. Le rôle « Administrateur » a été retiré : l'administrateur du BO
   a par défaut l'accès national (voir habilitations, identities.js). */
const ROLES = [
  { value: "gestionnaire_compte",   label: "Gestionnaire de Compte",   desc: "Gère les utilisateurs rattachés à son territoire SAS." },
  { value: "gestionnaire_structure",label: "Gestionnaire de Structure",desc: "Gère une ou plusieurs structures d'effection (SOS, CDS, CPTS/MSP)." },
  { value: "regulateur_osnp",       label: "Régulateur OSNP",          desc: "Régulation des soins non programmés (OSNP)." },
  { value: "regulateur_su",         label: "Régulateur SU",            desc: "Régulation SU — droits identiques au Régulateur OSNP." },
  { value: "effecteur",             label: "Effecteur",                desc: "Professionnel de santé effecteur, identifié par son n° RPPS." },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]));

/* Environnements (rattachement d'un compte, fixé par l'administrateur du BO) */
const ENVIRONNEMENTS = ["Production", "PréProduction", "Intégration", "Formation"];

/* Régions (référentiel) + dérivation territoire SAS → région via les départements */
const REGIONS = [
  "Auvergne-Rhône-Alpes","Bourgogne-Franche-Comté","Bretagne","Centre-Val de Loire","Corse",
  "Grand Est","Hauts-de-France","Ile-de-France","Normandie","Nouvelle-Aquitaine","Occitanie",
  "Pays de la Loire","Provence-Alpes-Côte d'Azur","Guadeloupe","Martinique","Guyane","La Réunion","Mayotte",
];
function territoireRegion(code) {
  const d = (typeof DEPARTEMENTS !== "undefined" ? DEPARTEMENTS : []).find(x => (x.territory||[]).some(t => t.name === code));
  return d ? d.region : "";
}
const MODE_CONNEXION = { PSC: "France Connect / PSC", MdP: "Login / mot de passe" };

// Rôles/tags réservés : assignables uniquement par un administrateur,
// et les utilisateurs qui les portent ne sont visibles/filtrables que par les admins.
const ADMIN_TAGS = [
  { value: "referent_territoriale", label: "Referent Territoriale" },
  { value: "ambassadeur",           label: "Ambassadeur" },
  { value: "testlrm",               label: "TestLRM" },
];
const ADMIN_TAG_KEYS = ADMIN_TAGS.map(t => t.value);
ADMIN_TAGS.forEach(t => { ROLE_LABEL[t.value] = t.label; });

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

/* Les identités sont définies dans identities.js (compte unique multi-périmètres).
   Le BO Accès n'utilise que l'habilitation « acces » de l'identité. */

/* Utilisateurs de démonstration (roles = tableau, structures = tableau) */
const SEED_USERS = [
  { id:"u-001", idNational:"SASN-100001", email:"admin.national@sas.gouv.fr", nom:"Lefevre", prenom:"Isabelle", roles:["administrateur"],        ville:"75007 Paris",     territoire:"SAS-75", actif:true },
  { id:"u-002", idNational:"SASN-100002", email:"g.compte.paris@sas.gouv.fr", nom:"Garnier", prenom:"Paul",     roles:["gestionnaire_compte","referent_territoriale"], ville:"75012 Paris", territoire:"SAS-75", actif:true },
  { id:"u-003", idNational:"SASN-100003", email:"g.compte.lyon@sas.gouv.fr",  nom:"Faure",   prenom:"Camille",  roles:["gestionnaire_compte"],   ville:"69002 Lyon",      territoire:"SAS-69", actif:true },
  { id:"u-004", idNational:"SASN-100004", email:"regul.osnp.paris@sas.gouv.fr", nom:"Roux",  prenom:"David",    roles:["regulateur_osnp","gestionnaire_compte"], ville:"75015 Paris", territoire:"SAS-75", actif:true },
  { id:"u-005", idNational:"SASN-100005", email:"claire.durand@effecteur.fr", nom:"Durand",  prenom:"Claire",   roles:["effecteur","ambassadeur"], ville:"75014 Paris",     territoire:"SAS-75", actif:true,  rpps:"10001234567", profession:"Médecin", specialite:"Médecine générale" },
  { id:"u-006", idNational:"SASN-100006", email:"sos.paris@structure.fr",     nom:"Leroy",   prenom:"Nathalie", roles:["gestionnaire_structure"],ville:"75014 Paris",     territoire:"SAS-75", actif:true,
    structures:[ {type:"sos_medecins",finess:"750000015",nom:"SOS Médecins Paris"}, {type:"sos_medecins",finess:"750000023",nom:"SOS Médecins Paris Est"}, {type:"cds",finess:"750100056",nom:"Centre de Santé Marcadet"}, {type:"cpts_msp",finess:"750200091",nom:"CPTS Paris 13"}, {type:"cpts_msp",finess:"750200108",nom:"MSP Paris 18"} ] },
  { id:"u-007", idNational:"SASN-100007", email:"cpts.rennes@structure.fr",   nom:"Girard",  prenom:"Hugo",     roles:["gestionnaire_structure","effecteur"], ville:"35000 Rennes", territoire:"SAS-35", actif:true,
    rpps:"10004567890", profession:"Médecin", specialite:"Médecine générale",
    structures:[ {type:"cpts_msp",finess:"350200117",nom:"CPTS Rennes Métropole"} ] },
  { id:"u-008", idNational:"SASN-100008", email:"julien.martin@effecteur.fr", nom:"Martin",  prenom:"Julien",   roles:["effecteur","testlrm"],   ville:"69003 Lyon",      territoire:"SAS-69", actif:false, rpps:"10002345678", profession:"Médecin", specialite:"Médecine d'urgence" },
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
  // Régulateurs SU
  { id:"u-021", idNational:"SASN-100021", email:"regul.su.paris@sas.gouv.fr",  nom:"Lambert",  prenom:"Inès",     roles:["regulateur_su"],  ville:"75012 Paris",     territoire:"SAS-75", actif:true },
  { id:"u-022", idNational:"SASN-100022", email:"regul.su.lyon@sas.gouv.fr",   nom:"Marchand", prenom:"Karim",    roles:["regulateur_su"],  ville:"69002 Lyon",      territoire:"SAS-69", actif:true },
];

/* Enrichissement des comptes de démonstration (champs Lot 1 : région, environnements,
   mode de connexion, date de création, dernière connexion — variété déterministe). */
SEED_USERS.forEach((u, i) => {
  u.roles = (u.roles || []).filter(r => r !== "administrateur");
  if (!u.roles.length) u.roles = ["gestionnaire_compte"];
  u.region = u.region || territoireRegion(u.territoire);
  u.environnements = u.environnements || (i % 4 === 0 ? ["Production", "Formation"] : ["Production"]);
  u.modeConnexion = u.modeConnexion || (i % 3 === 0 ? "PSC" : "MdP");
  u.created_at = u.created_at || new Date(2025, i % 12, 1 + (i % 27)).toISOString();
  // Quelques comptes ne se sont jamais connectés
  u.derniereConnexion = (i % 5 === 2) ? null : new Date(2026, i % 6, 2 + (i % 25)).toISOString();
});

/* Conditions générales d'utilisation (texte éditable par l'administrateur) */
const CGU_SEED = {
  version: "1.3",
  updatedAt: "2026-01-15T09:00:00.000Z",
  title: "Conditions générales d'utilisation — Arrière-guichet SAS",
  body: [
    "1. Objet",
    "Les présentes conditions générales d'utilisation (CGU) encadrent l'accès et l'usage des arrière-guichets du Service d'Accès aux Soins (SAS) par les utilisateurs habilités.",
    "",
    "2. Accès au service",
    "L'accès est réservé aux professionnels habilités disposant d'un compte nominatif. La connexion s'effectue via Pro Santé Connect (PSC) ou par identifiant et mot de passe.",
    "",
    "3. Protection des données",
    "Les données à caractère personnel sont traitées conformément au RGPD. Chaque utilisateur s'engage à ne consulter que les données nécessaires à l'exercice de ses missions.",
    "",
    "4. Responsabilités",
    "L'utilisateur est responsable de la confidentialité de ses identifiants et des actions réalisées sous son compte.",
  ].join("\n"),
};

/* ---------------------------------------------------------------- *
 *  ÉTAT
 * ---------------------------------------------------------------- */
const USERS_KEY = "bo-sas-users-v8";
const TERR_KEY  = "bo-sas-territoires-v1";
const DEP_KEY   = "bo-sas-departements-v1";
const SUP_KEY   = "bo-sas-support-v1";
const CGU_KEY   = "bo-sas-cgu-v1";

const EMPTY_FILTERS = { q: "", role: "", territoire: "", region: "", ville: "", profSpec: "", structure: "", statut: "" };

const state = {
  users: loadUsers(),
  territoires: loadTerritoires(),
  departements: loadDepartements(),
  support: loadSupport(),
  cgu: loadCgu(),
  identityIdx: currentIdentityIdx(),
  view: "list",   // "list" | "create" | "statistiques" | "cgu" | "territoires" | "departements" | "support"
  editId: null,   // utilisateur en cours de modification
  filters: { ...EMPTY_FILTERS },
  form: newForm(),
  terr: null,     // { mode:'create'|'edit', code, num, dep, error }
  depSearch: "",  // recherche dans la page Départements
  depEdits: {},   // { [code]: { countyRadius?, cityDefaultRadius? } } — modifications en attente
  supCat: "support_n1", // catégorie active de Gestion Support
  supSearch: "",  // recherche dans la page Gestion Support
  supEdits: {},   // { [`${catKey}||${territory}`]: "email1, email2" } — modifications en attente
  stat: { level: "national", region: "", territoire: "" }, // périmètre de la page Statistiques
  cguDraft: null, // { body, version } — édition CGU en attente
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
function loadCgu() {
  try { const raw = localStorage.getItem(CGU_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return JSON.parse(JSON.stringify(CGU_SEED));
}
function saveCgu() { try { localStorage.setItem(CGU_KEY, JSON.stringify(state.cgu)); } catch (e) {} }

function newForm() {
  return { roles: [], idNational:"", email:"", nom:"", prenom:"", ville:"", territoire:"",
           region:"", environnements:[], modeConnexion:"MdP",
           rpps:"", pro:null,
           structures: [],            // [{ type, finess, nom, ville }] — plusieurs par type possible
           draftType: "sos_medecins", // type sélectionné dans le sélecteur d'ajout
           regionAuto:true,           // la région suit le territoire tant qu'on ne la modifie pas à la main
           errors:{}, success:null };
}
function formFromUser(u) {
  const f = newForm();
  f.roles = [...(u.roles || [])];
  f.idNational = u.idNational || "";
  f.email = u.email; f.nom = u.nom; f.prenom = u.prenom; f.ville = u.ville; f.territoire = u.territoire;
  f.region = u.region || territoireRegion(u.territoire);
  f.regionAuto = !u.region || u.region === territoireRegion(u.territoire);
  f.environnements = [...(u.environnements || [])];
  f.modeConnexion = u.modeConnexion || "MdP";
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
/* Ville par défaut d'un CDS pour préremplissage (première structure CDS trouvée) */
function cdsPrefillVille(structures) {
  const cds = (structures || []).find(s => s.type === "cds");
  if (!cds) return "";
  const e = FINESS_BY_ID[cds.finess];
  return (e && e.ville) || cds.ville || "";
}
function identity() { return IDENTITIES[state.identityIdx]; }
function acRole() { return identity().role || null; }            // administrateur | gestionnaire_compte
function acTerr() { return identity().territoire || null; }      // territoire du gestionnaire de compte

/* Composant technique ouvert (Keycloak / SAS-DATA), passé par l'URL depuis le portail */
const AC_COMPONENTS = {
  keycloak: { key: "utilisateurs", title: "Keycloak", sub: "Gestion des utilisateurs",           views: ["list","create","statistiques","cgu"] },
  sasdata:  { key: "sasdata",      title: "SAS-DATA", sub: "Territoires · Départements · Support", views: ["territoires","departements","support"] },
};
function currentComponent() {
  try { const c = new URLSearchParams(location.search).get("component"); if (c && AC_COMPONENTS[c]) return c; } catch (e) {}
  return "keycloak";
}
function acCompKey() { return AC_COMPONENTS[currentComponent()].key; }   // "utilisateurs" | "sasdata"
function acLevel()   { return habLevel(identity(), acCompKey()); }       // null | "lecture" | "ecriture"
function acHasAccess() { return acLevel() != null; }
function acWrite()   { return acLevel() === "ecriture"; }
function acPage()    { return "acces.html?component=" + currentComponent(); }
function allowedViews() {
  return AC_COMPONENTS[currentComponent()].views.filter(v => {
    if (v === "territoires" && acRole() !== "administrateur") return false; // territoires = admin uniquement
    if (v === "cgu" && acRole() !== "administrateur") return false;         // édition des CGU = admin uniquement
    if (v === "create" && !acWrite()) return false;                        // création = écriture uniquement
    return true;
  });
}

/* ---------------------------------------------------------------- *
 *  UTILITAIRES
 * ---------------------------------------------------------------- */
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id) { return document.getElementById(id); }
function structuresOf(u) { return u.structures || []; }
function rolesOf(u) { return u.roles || []; }
function hasAdminTag(u) { return rolesOf(u).some(r => ADMIN_TAG_KEYS.includes(r)); }
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

  // Marque selon le composant technique ouvert
  const comp = AC_COMPONENTS[currentComponent()];
  const bt = el("brand-title"), bs = el("brand-sub");
  if (bt) bt.textContent = comp.title;
  if (bs) bs.textContent = comp.sub;

  const ALL_ITEMS = {
    list:         { view:"list",         icon:"fr-icon-user-line",         label:"Utilisateurs" },
    create:       { view:"create",       icon:"fr-icon-user-add-line",     label:"Créer un utilisateur" },
    statistiques: { view:"statistiques", icon:"fr-icon-line-chart-line",   label:"Statistiques" },
    cgu:          { view:"cgu",          icon:"fr-icon-file-text-line",    label:"Édition des CGU" },
    territoires:  { view:"territoires",  icon:"fr-icon-map-pin-2-line",    label:"Territoires SAS" },
    departements: { view:"departements", icon:"fr-icon-building-line",     label:"Départements" },
    support:      { view:"support",      icon:"fr-icon-mail-line",         label:"Gestion Support" },
  };
  const items = acHasAccess() ? allowedViews().map(v => ALL_ITEMS[v]) : [];

  nav.innerHTML =
    `<a class="nav-item nav-portal" href="${urlWithIdentity("index.html", state.identityIdx)}">
       <span class="fr-icon-arrow-left-line" aria-hidden="true"></span>Portail
     </a>` +
    (acHasAccess() ? `<div class="nav-level lvl ${acWrite()?"lvl--write":"lvl--read"}">${acWrite()?"Écriture":"Lecture seule"}</div>` : "") +
    items.map(i => {
      const active = state.view === i.view && !(i.view === "create" && state.editId);
      return `<button class="nav-item ${active?"is-active":""}" data-view="${i.view}">
         <span class="${i.icon}" aria-hidden="true"></span>${i.label}
       </button>`;
    }).join("");
  nav.querySelectorAll(".nav-item[data-view]").forEach(b => b.onclick = () => {
    state.view = b.dataset.view;
    if (state.view === "create") { state.form = newForm(); state.editId = null; }
    if (state.view === "territoires") state.terr = null;
    render();
  });

  const sel = el("identity-select");
  sel.innerHTML = IDENTITIES.map((i, idx) => `<option value="${idx}">${esc(i.label)}</option>`).join("");
  sel.value = state.identityIdx;
  // Changer d'identité recharge la page en conservant le composant ouvert
  sel.onchange = () => gotoWithIdentity(acPage(), Number(sel.value));
}

/* ================================================================ *
 *  VUE LISTE UTILISATEURS
 * ================================================================ */
function visibleUsers() {
  const id = identity();
  if (acRole() === "administrateur") return state.users;
  // Les utilisateurs porteurs d'un rôle réservé ne sont visibles que par les admins
  if (acRole() === "gestionnaire_compte") return state.users.filter(u => u.territoire === acTerr() && !hasAdminTag(u));
  return [];
}
function filteredUsers() {
  const f = state.filters;
  const q = f.q.trim().toLowerCase();
  return visibleUsers().filter(u => {
    if (f.role && !rolesOf(u).includes(f.role)) return false;
    if (f.territoire && u.territoire !== f.territoire) return false;
    if (f.region && (u.region || territoireRegion(u.territoire)) !== f.region) return false;
    if (f.ville && u.ville !== f.ville) return false;
    if (f.profSpec && u.profession !== f.profSpec && u.specialite !== f.profSpec) return false;
    if (f.structure && !structuresOf(u).some(s => s.type === f.structure)) return false;
    if (f.statut && statutEtat(u).key !== f.statut) return false;
    if (!q) return true;
    const hay = [u.nom,u.prenom,u.email,u.idNational,u.ville,u.territoire,u.rpps,u.profession,u.specialite,
      ...rolesOf(u).map(r => ROLE_LABEL[r]),
      ...structuresOf(u).flatMap(s => [s.nom, s.finess, STRUCTURE_LABEL[s.type]])
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function roleBadge(role) { return `<span class="fr-badge fr-badge--sm badge-role badge-${role}">${esc(ROLE_LABEL[role])}</span>`; }

/* Statut à 3 états : Aucune connexion (jamais connecté) / Actif / Inactif.
   Badges plats (sans icône) pour rester cohérent avec les badges de rôle. */
function statutEtat(u) {
  if (!u.derniereConnexion) return { key: "aucune", label: "Aucune connexion", cls: "badge-statut-aucune" };
  if (u.actif) return { key: "actif", label: "Actif", cls: "badge-statut-actif" };
  return { key: "inactif", label: "Inactif", cls: "badge-statut-inactif" };
}
const STATUT_OPTS = [
  { value: "actif",   label: "Actif" },
  { value: "inactif", label: "Inactif" },
  { value: "aucune",  label: "Aucune connexion" },
];
function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch (e) { return "—"; }
}
function modeConnexionLabel(m) { return MODE_CONNEXION[m] || MODE_CONNEXION.MdP; }

function userRow(u) {
  const et = statutEtat(u);
  const statut = `<span class="fr-badge fr-badge--sm ${et.cls}">${et.label}</span>`;
  const modeBadge = `<span class="fr-badge fr-badge--sm badge-mode badge-mode-${(u.modeConnexion||"MdP")}" title="Mode de connexion">${u.modeConnexion === "PSC" ? "PSC" : "Mot de passe"}</span>`;
  const parts = [];
  if (u.specialite) parts.push(`${esc(u.profession || "")} — ${esc(u.specialite)}`);
  if (structuresOf(u).length) parts.push(structuresOf(u).map(s => `${STRUCTURE_SHORT[s.type]} : ${esc(s.nom)}`).join(", "));
  const extra = parts.length ? " · " + parts.join(" · ") : "";
  const region = u.region || territoireRegion(u.territoire);
  const canResend = acWrite() && !u.derniereConnexion;
  return `
    <div class="user-row">
      <div class="user-row__body">
        <div class="user-row__l1">
          <span class="user-row__name">${esc(u.prenom)} ${esc(u.nom)}</span>
          ${rolesOf(u).map(roleBadge).join(" ")} ${statut} ${modeBadge}
        </div>
        <div class="user-row__l2" title="${esc(u.email)}">
          ${esc(u.email)} · ${esc(u.ville)}${u.territoire ? " · " + esc(u.territoire) : ""}${region ? " · " + esc(region) : ""}${extra}
        </div>
        <div class="user-row__meta">
          Créé le ${fmtDate(u.created_at)} · ${u.derniereConnexion ? "Dernière connexion le " + fmtDate(u.derniereConnexion) : "Jamais connecté"}
        </div>
      </div>
      ${acWrite() ? `<div class="user-row__actions">
        <button class="act-edit"   data-edit="${u.id}">Modifier</button>
        ${canResend ? `<button class="act-resend" data-resend="${u.id}">Renvoyer le mail d'activation</button>` : ""}
        <button class="act-toggle" data-toggle="${u.id}">${u.actif ? "Désactiver" : "Activer"}</button>
        <button class="act-del"    data-del="${u.id}">Supprimer</button>
      </div>` : ""}
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
  const isAdmin = acRole() === "administrateur";
  const list = filteredUsers();
  const total = visibleUsers().length;
  const f = state.filters;
  const hasFilters = f.q || f.role || f.territoire || f.region || f.ville || f.profSpec || f.structure || f.statut;
  const villes = [...new Set(visibleUsers().map(u => u.ville))].sort();
  // Professions + spécialités présentes dans le périmètre visible
  const profSpecs = [...new Set(visibleUsers().flatMap(u => [u.profession, u.specialite]).filter(Boolean))].sort();
  // Régions présentes dans le périmètre visible
  const regions = [...new Set(visibleUsers().map(u => u.region || territoireRegion(u.territoire)).filter(Boolean))].sort();

  el("view-list").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">Utilisateurs</h1>
        <p class="page-sub">${isAdmin
          ? "Vue administrateur — tous les territoires."
          : "Vue gestionnaire de compte — territoire <strong>"+esc(acTerr())+"</strong>."}</p>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="fr-btn fr-btn--sm fr-btn--secondary" id="export-csv">Exporter (CSV)</button>
        ${acWrite() ? `<button class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-user-add-line" data-goto="create">Créer un utilisateur</button>` : ""}
      </div>
    </div>

    <div class="filters">
      <div class="f-search">
        <label class="fr-label" for="flt-q">Rechercher</label>
        <input class="fr-input" type="search" id="flt-q" placeholder="Nom, email, ville, RPPS, FINESS…" value="${esc(f.q)}">
      </div>
      ${selectField("role", "Rôle", (isAdmin ? [...ROLES, ...ADMIN_TAGS] : ROLES).map(r => ({ value:r.value, label:r.label })))}
      ${isAdmin ? selectField("territoire", "Territoire", state.territoires.map(t => ({ value:t.code, label:`${t.code} · ${t.dep}` }))) : ""}
      ${selectField("region", "Région", regions.map(v => ({ value:v, label:v })))}
      ${selectField("ville", "Ville", villes.map(v => ({ value:v, label:v })))}
      ${selectField("profSpec", "Profession / Spécialité", profSpecs.map(v => ({ value:v, label:v })))}
      ${selectField("structure", "Structure", STRUCTURE_TYPES.map(s => ({ value:s.value, label:s.label })))}
      ${selectField("statut", "Statut", STATUT_OPTS)}
      ${hasFilters ? `<div class="f-field"><button class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline" id="reset-filters">Réinitialiser</button></div>` : ""}
    </div>

    <p class="result-count">${list.length} utilisateur${list.length>1?"s":""}${hasFilters?` sur ${total}`:""}</p>
    <div class="user-list" id="user-list">${renderRows(list)}</div>

    <p class="mock-note" style="margin-top:1.5rem;">
      Données de démonstration (navigateur).${acWrite() ? ` <a href="#" id="reset-seed">Réinitialiser le jeu de démonstration</a>` : ""}
    </p>`;

  bindListEvents();
}

function renderRows(list) {
  if (!list.length) return `<p class="mock-note" style="padding:1rem 0;">Aucun utilisateur ne correspond aux critères.</p>`;
  return list.map(userRow).join("");
}

/* Petit bandeau de confirmation éphémère (toast) */
function showToast(msg) {
  const root = el("modal-root");
  if (!root) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => { t.classList.add("toast--out"); setTimeout(() => t.remove(), 400); }, 2600);
}

/* Export CSV — email, rôle(s), région, territoire, structure(s), statut (actif/inactif/aucune
   connexion), mode de connexion. Sert notamment de liste de diffusion et distingue les
   comptes login/mot de passe des comptes PSC/France Connect. */
function exportUsersCsv(list) {
  const cols = ["Email","Prénom","Nom","Identifiant national","Rôle(s)","Région","Territoire","Ville",
                "Structure(s)","Statut","Mode de connexion","Liste de diffusion","Date de création","Dernière connexion"];
  const cell = (v) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = list.map(u => {
    const et = statutEtat(u);
    const structs = structuresOf(u).map(s => `${STRUCTURE_SHORT[s.type]} ${s.nom}`).join(" | ");
    const roles = rolesOf(u).map(r => ROLE_LABEL[r] || r).join(" | ");
    return [
      u.email, u.prenom, u.nom, u.idNational || "", roles,
      u.region || territoireRegion(u.territoire), u.territoire || "", u.ville || "",
      structs, et.label, modeConnexionLabel(u.modeConnexion), u.email,
      fmtDate(u.created_at), u.derniereConnexion ? fmtDate(u.derniereConnexion) : "Jamais",
    ].map(cell).join(";");
  });
  const csv = "﻿" + [cols.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url; a.download = `utilisateurs-sas-${stamp}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`Export CSV — ${list.length} utilisateur${list.length > 1 ? "s" : ""}.`);
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
  root.querySelectorAll("[data-resend]").forEach(b => b.onclick = () => {
    const u = state.users.find(x => x.id === b.dataset.resend);
    if (u) showModal({
      title: "Mail d'activation",
      bodyHtml: `<p>Un nouveau mail d'activation va être envoyé à&nbsp;: <strong>${esc(u.email)}</strong>.</p>
                 <p class="mock-note">Maquette&nbsp;: aucun mail n'est réellement envoyé.</p>`,
      confirmLabel: "Envoyer",
      onConfirm: () => showToast(`Mail d'activation renvoyé à ${u.email}.`),
    });
  });
  root.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const u = state.users.find(x => x.id === b.dataset.del);
    if (u && confirm(`Supprimer ${u.prenom} ${u.nom} ?`)) { state.users = state.users.filter(x => x.id !== u.id); saveUsers(); render(); }
  });
}

function bindListEvents() {
  const root = el("view-list");
  const gotoCreate = root.querySelector("[data-goto='create']");
  if (gotoCreate) gotoCreate.onclick = () => { state.view="create"; state.form=newForm(); state.editId=null; render(); };

  root.querySelector("#flt-q").oninput = (e) => {
    state.filters.q = e.target.value;
    const list = filteredUsers();
    el("user-list").innerHTML = renderRows(list);
    bindRowActions(el("user-list"));
    const total = visibleUsers().length;
    const f = state.filters;
    const hasFilters = f.q || f.role || f.territoire || f.region || f.ville || f.profSpec || f.structure || f.statut;
    root.querySelector(".result-count").textContent =
      `${list.length} utilisateur${list.length>1?"s":""}${hasFilters?` sur ${total}`:""}`;
  };

  const exportBtn = root.querySelector("#export-csv");
  if (exportBtn) exportBtn.onclick = () => exportUsersCsv(filteredUsers());

  root.querySelectorAll("[data-filter]").forEach(sel => sel.onchange = () => { state.filters[sel.dataset.filter] = sel.value; render(); });
  const reset = root.querySelector("#reset-filters");
  if (reset) reset.onclick = () => { state.filters = { ...EMPTY_FILTERS }; render(); };
  const resetSeed = root.querySelector("#reset-seed");
  if (resetSeed) resetSeed.onclick = (e) => {
    e.preventDefault();
    if (confirm("Réinitialiser toutes les données de démonstration ?")) {
      state.users = SEED_USERS.map(u=>({...u}));
      state.territoires = SEED_TERRITOIRES.map(t=>({...t}));
      state.departements = DEPARTEMENTS.map(d=>({...d}));
      state.support = JSON.parse(JSON.stringify(SUPPORT_REORIENTATIONS));
      state.cgu = JSON.parse(JSON.stringify(CGU_SEED));
      state.cguDraft = null;
      saveUsers(); saveTerritoires(); saveDepartements(); saveSupport(); saveCgu(); render();
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
  const needsTerritoire = f.roles.some(r => r !== "administrateur" && !ADMIN_TAG_KEYS.includes(r));
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

  const canAssignTags = acRole() === "administrateur";
  const roleCheckbox = (r) => `
    <div class="fr-checkbox-group">
      <input type="checkbox" id="role-${r.value}" data-role="${r.value}" ${f.roles.includes(r.value)?"checked":""}>
      <label class="fr-label" for="role-${r.value}">${esc(r.label)}</label>
    </div>`;
  const rolesCheckboxes = ROLES.map(roleCheckbox).join("");
  const tagsCheckboxes = ADMIN_TAGS.map(roleCheckbox).join("");

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

  const regionOptions = `<option value="">— Sélectionner —</option>` +
    REGIONS.map(r => `<option value="${esc(r)}" ${f.region===r?"selected":""}>${esc(r)}</option>`).join("");
  const regionBlock = `
    <div class="${grp('region')}">
      <label class="fr-label" for="region">Région
        <span class="fr-hint-text">Renseignée automatiquement d'après le territoire SAS ; modifiable.</span></label>
      <select class="fr-select" id="region">${regionOptions}</select>${err('region')}
    </div>`;

  const modeBlock = `
    <div class="fr-input-group">
      <label class="fr-label" for="modeConnexion">Mode de connexion
        <span class="fr-hint-text">France Connect / Pro Santé Connect (PSC) ou identifiant / mot de passe.</span></label>
      <select class="fr-select" id="modeConnexion">
        <option value="MdP" ${f.modeConnexion!=="PSC"?"selected":""}>${esc(MODE_CONNEXION.MdP)}</option>
        <option value="PSC" ${f.modeConnexion==="PSC"?"selected":""}>${esc(MODE_CONNEXION.PSC)}</option>
      </select>
    </div>`;

  // Environnement(s) — réservé à l'Admin BO (création multi-environnement)
  const isAdminBOUser = isAdminBO(identity());
  const envBlock = isAdminBOUser ? `
    <div class="${grp('environnements')}">
      <label class="fr-label">Environnement(s)
        <span class="fr-hint-text">Création multi-environnement (réservé à l'Admin BO).</span></label>
      <div class="roles-checkboxes">
        ${ENVIRONNEMENTS.map(e => `
          <div class="fr-checkbox-group">
            <input type="checkbox" id="env-${esc(e)}" data-env="${esc(e)}" ${f.environnements.includes(e)?"checked":""}>
            <label class="fr-label" for="env-${esc(e)}">${esc(e)}</label>
          </div>`).join("")}
      </div>${err('environnements')}
    </div>` : "";

  el("view-create").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">${editing ? "Modifier l'utilisateur" : "Créer un utilisateur"}</h1>
    <p class="page-sub" style="margin-bottom:1.25rem;">Les champs varient selon les rôles sélectionnés.</p>
    ${success}
    <form class="bo-form" id="create-form" novalidate>
      <div class="${grp('roles')}">
        <label class="fr-label">Rôle(s)${req}<span class="fr-hint-text">Un utilisateur peut cumuler plusieurs rôles.</span></label>
        <div class="roles-checkboxes">${rolesCheckboxes}</div>
        ${canAssignTags ? `
        <div class="roles-reserved">
          <span class="roles-reserved__title">Rôles réservés (administrateur)</span>
          <div class="roles-checkboxes">${tagsCheckboxes}</div>
        </div>` : ""}
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
        </div>` : ""}
        ${regionBlock}
        ${modeBlock}
        ${envBlock}
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
  if (terr) terr.onchange = () => {
    f.territoire = terr.value;
    // La région suit le territoire tant que l'utilisateur ne l'a pas modifiée à la main
    if (f.regionAuto) { f.region = territoireRegion(terr.value); render(); }
  };
  const regionSel = root.querySelector("#region");
  if (regionSel) regionSel.onchange = () => { f.region = regionSel.value; f.regionAuto = false; };
  const modeSel = root.querySelector("#modeConnexion");
  if (modeSel) modeSel.onchange = () => { f.modeConnexion = modeSel.value; };
  root.querySelectorAll("[data-env]").forEach(cb => cb.onchange = () => {
    const v = cb.dataset.env;
    if (cb.checked) { if (!f.environnements.includes(v)) f.environnements.push(v); }
    else f.environnements = f.environnements.filter(x => x !== v);
  });

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
    // GS CDS : préremplissage de la ville et du territoire d'après le CDS rattaché
    if (entry.type === "cds") {
      if (!f.ville.trim() && entry.ville) f.ville = entry.ville;
      if (!f.territoire) {
        const dep = (entry.ville.match(/^(\d{2,3})/) || [])[1];
        const code = dep ? "SAS-" + dep.slice(0, 2) : "";
        if (code && state.territoires.some(t => t.code === code)) {
          f.territoire = code;
          if (f.regionAuto) f.region = territoireRegion(code);
        }
      }
    }
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
  const needsTerritoire = f.roles.some(r => r !== "administrateur" && !ADMIN_TAG_KEYS.includes(r));
  if (needsTerritoire && !f.territoire) errors.territoire = "Territoire SAS requis.";
  if (isEffecteur && !f.pro) errors.rpps = "Renseignez un n° RPPS valide.";
  if (isStructure && f.structures.length === 0) errors.structures = "Ajoutez au moins une structure.";
  f.errors = errors;
  if (Object.keys(errors).length) { render(); return; }

  const terrValue = needsTerritoire ? f.territoire : "";
  const base = {
    idNational: f.idNational.trim(), email: f.email.trim(), nom: f.nom.trim(), prenom: f.prenom.trim(),
    roles: [...f.roles], ville: f.ville.trim(), territoire: terrValue,
    region: f.region || territoireRegion(terrValue),
    environnements: [...f.environnements],
    modeConnexion: f.modeConnexion === "PSC" ? "PSC" : "MdP",
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
    // Nouveau compte : jamais connecté (statut « Aucune connexion »), date de création = aujourd'hui
    saved = { id: "u-" + Math.random().toString(36).slice(2, 8), actif: true,
              created_at: new Date().toISOString(), derniereConnexion: null, ...base };
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
        ${acWrite() ? `<button class="fr-link" data-terr-edit="${esc(x.code)}">Modifier</button>
        <button class="fr-link" style="color:#ce0500" data-terr-del="${esc(x.code)}">Supprimer</button>` : `<span class="mock-note">—</span>`}
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
      ${(t || !acWrite()) ? "" : `<button class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-user-add-line" id="terr-add">Ajouter un territoire</button>`}
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
  if (acRole() === "administrateur") return state.departements;
  // Gestionnaire de compte : uniquement le département de son territoire SAS
  return state.departements.filter(d => (d.territory || []).some(t => t.name === acTerr()));
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
      <td class="num"><input class="dep-radius-input ${depChanged(d.code,'countyRadius',d.countyRadius)?'changed':''}" type="number" min="0" step="1" value="${esc(depPending(d.code,'countyRadius',d.countyRadius))}" data-dep-county="${esc(d.code)}" ${acWrite()?"":"readonly"}></td>
      <td class="num"><input class="dep-radius-input ${depChanged(d.code,'cityDefaultRadius',d.cityDefaultRadius)?'changed':''}" type="number" min="0" step="0.5" value="${esc(depPending(d.code,'cityDefaultRadius',d.cityDefaultRadius))}" data-dep-city="${esc(d.code)}" ${acWrite()?"":"readonly"}></td>
    </tr>`).join("");
}

function renderDepartements() {
  const id = identity();
  const isAdmin = acRole() === "administrateur";
  const list = depFiltered();
  const n = depEditCount();

  el("view-departements").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Départements</h1>
    <p class="page-sub">${isAdmin ? "Tous les territoires SAS." : "Territoire <strong>"+esc(acTerr())+"</strong>."} ${acWrite() ? "Paramétrez les rayons de recherche par défaut." : "Consultation en lecture seule."}</p>
    ${acWrite() ? `<div class="save-bar">
      <button class="fr-btn fr-btn--sm" id="dep-save" ${n?"":"disabled"}>Enregistrer</button>
      <span class="mock-note" id="dep-pending">${n ? `${n} modification${n>1?"s":""} en attente` : "Aucune modification"}</span>
    </div>` : ""}
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
  const depSaveBtn = root.querySelector("#dep-save");
  if (depSaveBtn) depSaveBtn.onclick = () => {
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
  if (acRole() === "administrateur") return cat.territories;
  return cat.territories.filter(x => supTerrToken(x.territory) === acTerr());
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
        data-sup-territory="${esc(entry.territory)}" placeholder="email1@ex.fr, email2@ex.fr" ${acWrite()?"":"readonly"}></td>
    </tr>`;
  }).join("");
}

function renderSupport() {
  const id = identity();
  const isAdmin = acRole() === "administrateur";
  const cat = supCurrentCat();
  const q = state.supSearch.trim().toLowerCase();
  let list = supVisibleTerritories(cat);
  if (q) list = list.filter(x => x.territory.toLowerCase().includes(q) || x.emails.join(" ").toLowerCase().includes(q));
  const n = supEditCount();

  el("view-support").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Gestion Support</h1>
    <p class="page-sub">${isAdmin ? "Tous les territoires." : "Territoire <strong>"+esc(acTerr())+"</strong>."} Mails de réorientation par catégorie.</p>
    <div class="sup-tabs">
      ${state.support.map(c => `<button class="sup-tab ${c.reorientation_key===state.supCat?'is-active':''}" data-sup-cat="${esc(c.reorientation_key)}">${esc(c.reorientation_name)}</button>`).join("")}
    </div>
    ${acWrite() ? `<div class="save-bar">
      <button class="fr-btn fr-btn--sm" id="sup-save" ${n?"":"disabled"}>Enregistrer</button>
      <span class="mock-note" id="sup-pending">${n ? `${n} modification${n>1?"s":""} en attente` : "Aucune modification"}</span>
    </div>` : ""}
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
  const supSaveBtn = root.querySelector("#sup-save");
  if (supSaveBtn) supSaveBtn.onclick = () => {
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
 *  VUE STATISTIQUES (nb par rôle / structure / profession)
 * ================================================================ */
function statScopeUsers() {
  const base = visibleUsers();                      // admins : tous · gestionnaire : son territoire
  if (acRole() !== "administrateur") return base;   // gestionnaire de compte : périmètre déjà limité
  const s = state.stat;
  if (s.level === "territoire" && s.territoire) return base.filter(u => u.territoire === s.territoire);
  if (s.level === "region" && s.region) return base.filter(u => (u.region || territoireRegion(u.territoire)) === s.region);
  return base;                                      // national
}
function statCountBy(users, keyFn) {
  const m = {};
  users.forEach(u => {
    const ks = keyFn(u);
    (Array.isArray(ks) ? ks : [ks]).forEach(k => { if (k != null && k !== "") m[k] = (m[k] || 0) + 1; });
  });
  return m;
}
function statBar(label, count, total, sub) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return `<div class="stat-bar">
    <div class="stat-bar__label">${esc(label)}${sub ? `<span class="stat-bar__sub"> · ${esc(sub)}</span>` : ""}</div>
    <div class="stat-bar__track"><div class="stat-bar__fill" style="width:${pct}%"></div></div>
    <div class="stat-bar__val">${count}<span class="stat-bar__pct">${pct}%</span></div>
  </div>`;
}
function statBlock(title, map, total, labelFn) {
  const keys = Object.keys(map).sort((a, b) => map[b] - map[a]);
  const bars = keys.length
    ? keys.map(k => statBar(labelFn ? labelFn(k) : k, map[k], total)).join("")
    : `<p class="mock-note">Aucune donnée.</p>`;
  return `<section class="stat-card">
    <h2 class="stat-card__title">${esc(title)}</h2>
    <div class="stat-bars">${bars}</div>
  </section>`;
}

function renderStatistiques() {
  const isAdmin = acRole() === "administrateur";
  const s = state.stat;
  const users = statScopeUsers();
  const total = users.length;

  // Périmètre courant (libellé)
  let scopeLabel = "National — tous les territoires";
  if (!isAdmin) scopeLabel = "Territoire " + acTerr();
  else if (s.level === "region" && s.region) scopeLabel = "Région " + s.region;
  else if (s.level === "territoire" && s.territoire) scopeLabel = "Territoire " + s.territoire;

  // KPI statut
  const actifs   = users.filter(u => u.derniereConnexion && u.actif).length;
  const inactifs = users.filter(u => u.derniereConnexion && !u.actif).length;
  const aucune   = users.filter(u => !u.derniereConnexion).length;

  // Répartitions
  const byRole = statCountBy(users, u => rolesOf(u).filter(r => !ADMIN_TAG_KEYS.includes(r)));
  const byStructType = statCountBy(users, u => [...new Set(structuresOf(u).map(x => x.type))]); // gestionnaires par type de structure
  const byProfession = statCountBy(users.filter(u => rolesOf(u).includes("effecteur")), u => u.profession);
  const bySpecialite = statCountBy(users.filter(u => rolesOf(u).includes("effecteur")), u => u.specialite);
  const byMode = statCountBy(users, u => u.modeConnexion || "MdP");

  // Contrôles de périmètre (admins uniquement)
  const regions = [...new Set(visibleUsers().map(u => u.region || territoireRegion(u.territoire)).filter(Boolean))].sort();
  const scopeControls = isAdmin ? `
    <div class="stat-scope">
      <div class="stat-scope__seg">
        ${[["national","National"],["region","Par région"],["territoire","Par territoire"]].map(([v,l]) =>
          `<button class="stat-seg ${s.level===v?"is-active":""}" data-stat-level="${v}">${l}</button>`).join("")}
      </div>
      ${s.level === "region" ? `
        <select class="fr-select stat-scope__sel" id="stat-region">
          <option value="">— Toutes les régions —</option>
          ${regions.map(r => `<option value="${esc(r)}" ${s.region===r?"selected":""}>${esc(r)}</option>`).join("")}
        </select>` : ""}
      ${s.level === "territoire" ? `
        <select class="fr-select stat-scope__sel" id="stat-territoire">
          <option value="">— Tous les territoires —</option>
          ${state.territoires.map(t => `<option value="${esc(t.code)}" ${s.territoire===t.code?"selected":""}>${esc(t.code)} · ${esc(t.dep)}</option>`).join("")}
        </select>` : ""}
    </div>` : `<p class="mock-note">Périmètre : territoire <strong>${esc(acTerr())}</strong> (gestionnaire de compte).</p>`;

  el("view-statistiques").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Statistiques</h1>
    <p class="page-sub">Répartition des comptes — ${esc(scopeLabel)}.</p>
    ${scopeControls}

    <div class="stat-kpis">
      <div class="stat-kpi"><span class="stat-kpi__n">${total}</span><span class="stat-kpi__l">Comptes</span></div>
      <div class="stat-kpi stat-kpi--ok"><span class="stat-kpi__n">${actifs}</span><span class="stat-kpi__l">Actifs</span></div>
      <div class="stat-kpi"><span class="stat-kpi__n">${inactifs}</span><span class="stat-kpi__l">Inactifs</span></div>
      <div class="stat-kpi stat-kpi--warn"><span class="stat-kpi__n">${aucune}</span><span class="stat-kpi__l">Aucune connexion</span></div>
    </div>

    <div class="stat-grid">
      ${statBlock("Comptes par rôle", byRole, total, k => ROLE_LABEL[k] || k)}
      ${statBlock("Gestionnaires par type de structure", byStructType, total, k => STRUCTURE_LABEL[k] || k)}
      ${statBlock("Effecteurs par profession", byProfession, total)}
      ${statBlock("Effecteurs par spécialité", bySpecialite, total)}
      ${statBlock("Comptes par mode de connexion", byMode, total, k => modeConnexionLabel(k))}
    </div>
    <p class="mock-note" style="margin-top:1rem;">Statistiques calculées sur le périmètre visible (données de démonstration).</p>`;

  bindStatEvents();
}

function bindStatEvents() {
  const root = el("view-statistiques");
  root.querySelectorAll("[data-stat-level]").forEach(b => b.onclick = () => {
    state.stat.level = b.dataset.statLevel;
    render();
  });
  const rSel = root.querySelector("#stat-region");
  if (rSel) rSel.onchange = () => { state.stat.region = rSel.value; render(); };
  const tSel = root.querySelector("#stat-territoire");
  if (tSel) tSel.onchange = () => { state.stat.territoire = tSel.value; render(); };
}

/* ================================================================ *
 *  VUE ÉDITION DES CGU (administrateur)
 * ================================================================ */
function cguDirty() {
  const d = state.cguDraft;
  return !!d && (d.body !== state.cgu.body || d.version.trim() !== state.cgu.version);
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
  catch (e) { return "—"; }
}
function renderCgu() {
  const canEdit = acWrite();
  if (!state.cguDraft) state.cguDraft = { body: state.cgu.body, version: state.cgu.version };
  const d = state.cguDraft;
  const dirty = cguDirty();

  el("view-cgu").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Édition des CGU</h1>
    <p class="page-sub">Conditions générales d'utilisation présentées aux utilisateurs à la connexion.
      ${canEdit ? "" : "Consultation en lecture seule."}</p>

    <div class="cgu-meta">
      <span><strong>Version en vigueur :</strong> ${esc(state.cgu.version)}</span>
      <span><strong>Dernière mise à jour :</strong> ${esc(fmtDateTime(state.cgu.updatedAt))}</span>
    </div>

    ${canEdit ? `<div class="save-bar">
      <button class="fr-btn fr-btn--sm" id="cgu-save" ${dirty?"":"disabled"}>Enregistrer</button>
      <span class="mock-note" id="cgu-pending">${dirty ? "Modifications non enregistrées" : "Aucune modification"}</span>
      ${dirty ? `<button class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline" id="cgu-reset">Annuler les modifications</button>` : ""}
    </div>` : ""}

    <div class="fr-input-group" style="max-width:220px;">
      <label class="fr-label" for="cgu-version">Numéro de version</label>
      <input class="fr-input" id="cgu-version" value="${esc(d.version)}" ${canEdit?"":"readonly"}>
    </div>
    <div class="fr-input-group">
      <label class="fr-label" for="cgu-body">Texte des CGU</label>
      <textarea class="fr-input cgu-textarea" id="cgu-body" rows="18" ${canEdit?"":"readonly"}>${esc(d.body)}</textarea>
    </div>`;

  bindCguEvents();
}
function bindCguEvents() {
  const root = el("view-cgu");
  const body = root.querySelector("#cgu-body");
  const ver  = root.querySelector("#cgu-version");
  const refresh = () => {
    const dirty = cguDirty();
    const btn = root.querySelector("#cgu-save"); if (btn) btn.disabled = !dirty;
    const info = root.querySelector("#cgu-pending"); if (info) info.textContent = dirty ? "Modifications non enregistrées" : "Aucune modification";
  };
  if (body) body.oninput = () => { state.cguDraft.body = body.value; refresh(); };
  if (ver)  ver.oninput  = () => { state.cguDraft.version = ver.value; refresh(); };

  const reset = root.querySelector("#cgu-reset");
  if (reset) reset.onclick = () => { state.cguDraft = null; render(); };

  const save = root.querySelector("#cgu-save");
  if (save) save.onclick = () => {
    const d = state.cguDraft;
    if (!d.version.trim()) { showToast("Renseignez un numéro de version."); return; }
    const changes = [];
    if (d.version.trim() !== state.cgu.version) changes.push(`<li>Version : <span class="old">${esc(state.cgu.version)}</span> → <span class="new">${esc(d.version.trim())}</span></li>`);
    if (d.body !== state.cgu.body) changes.push(`<li>Texte des CGU modifié (${d.body.length} caractères)</li>`);
    showModal({
      title: "Publier les nouvelles CGU",
      bodyHtml: `<p class="fr-text--sm">Les modifications suivantes seront publiées et présentées aux utilisateurs :</p>
                 <ul class="modal-changes">${changes.join("")}</ul>`,
      confirmLabel: "Publier",
      onConfirm: () => {
        state.cgu.version = d.version.trim();
        state.cgu.body = d.body;
        state.cgu.updatedAt = new Date().toISOString();
        saveCgu();
        state.cguDraft = null;
        render();
        showToast("Nouvelles CGU publiées (version " + state.cgu.version + ").");
      },
    });
  };
}

/* ================================================================ *
 *  RENDU GLOBAL
 * ================================================================ */
function render() {
  const denied = !acHasAccess();
  if (!denied) {
    // Restreindre la vue active au composant technique ouvert et au niveau d'habilitation
    const allowed = allowedViews();
    if (!allowed.includes(state.view)) state.view = allowed[0];
  }
  renderSidebar();
  el("view-list").hidden        = denied || state.view !== "list";
  el("view-create").hidden      = denied || state.view !== "create";
  el("view-statistiques").hidden= denied || state.view !== "statistiques";
  el("view-cgu").hidden         = denied || state.view !== "cgu";
  el("view-territoires").hidden = denied || state.view !== "territoires";
  el("view-departements").hidden= denied || state.view !== "departements";
  el("view-support").hidden     = denied || state.view !== "support";
  el("view-denied").hidden      = !denied;
  if (denied) {
    el("view-denied").innerHTML = `
      <div class="fr-alert fr-alert--warning" style="margin-top:1rem;">
        <h1 class="fr-alert__title" style="font-size:1.1rem;">Accès non autorisé</h1>
        <p>Le profil « ${esc(identity().label)} » n'a pas d'habilitation sur ${esc(AC_COMPONENTS[currentComponent()].title)} (${esc(AC_COMPONENTS[currentComponent()].sub)}).</p>
        <p><a class="fr-link" href="${urlWithIdentity("index.html", state.identityIdx)}">← Retour au portail</a></p>
      </div>`;
    return;
  }
  if (state.view === "list") renderList();
  else if (state.view === "create") renderCreate();
  else if (state.view === "statistiques") renderStatistiques();
  else if (state.view === "cgu") renderCgu();
  else if (state.view === "territoires") renderTerritoires();
  else if (state.view === "departements") renderDepartements();
  else if (state.view === "support") renderSupport();
}

document.addEventListener("DOMContentLoaded", render);
