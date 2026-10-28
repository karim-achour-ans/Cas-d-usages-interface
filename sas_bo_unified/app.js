/* ==================================================================
   Arrière-guichet SAS — mock autonome (aucune dépendance, aucun serveur)
   Menu fixe · liste en lignes · CRUD utilisateurs (rôles multiples,
   structures multiples) · CRUD territoires SAS.
   ================================================================== */
"use strict";

/* ---------------------------------------------------------------- *
 *  RÉFÉRENTIELS
 * ---------------------------------------------------------------- */
/* Rôles gérés — spécification cible « Création et gestion des comptes utilisateurs SAS ».
   - Deux rôles créateurs : SAS Administrateur (national) et Gestionnaire de comptes (territorial).
   - Le rôle `sas_administrateur` historique est supprimé ; l'ex-administrateur national
     devient « SAS Administrateur ».
   - Le rôle Effecteur est supprimé : la qualité d'effecteur est déduite du RPPS (Annuaire Santé).
   Deux notions de territoire (spécification, section 2) :
   - territoire de RATTACHEMENT : calculé, jamais saisi — sert à la visibilité par les
     Gestionnaires de comptes = territoires de gestion (GC) + territoires des structures (GS)
     + territoire d'orientation (régulateur) ;
   - territoire d'ORIENTATION : un seul, propre aux régulateurs.
   territoire : "aucun" · "gestion" (GC, un ou plusieurs) · "structures" (déduit des structures)
                · "orientation" (régulateur, exactement un). */
const ROLES = [
  { value: "sas_administrateur",     label: "SAS Administrateur",                              territoire: "aucun",     desc: "Portée nationale : crée et gère tous les comptes." },
  { value: "gestionnaire_compte",    label: "Gestionnaire de comptes",                         territoire: "gestion",     desc: "Crée et gère les comptes de ses territoires de gestion." },
  { value: "gestionnaire_structure", label: "Gestionnaire de structure",                       territoire: "structures",  desc: "Rattaché aux territoires de ses structures (SOS Médecins, CPTS, CDS)." },
  { value: "regulateur_osnp",        label: "Régulateur OSNP",                                 territoire: "orientation", desc: "Régulation des soins non programmés — un seul territoire d'orientation." },
  { value: "regulateur_ioa",         label: "Régulateur IOA / Agent d'accueil",                territoire: "orientation", desc: "Infirmier d'orientation et d'accueil — un seul territoire d'orientation." },
  { value: "testinterop",            label: "TestInterop",                                     territoire: "aucun",     desc: "Compte de test d'interopérabilité, visible des seuls SAS Administrateurs." },
];
const ROLE_BY_VALUE = Object.fromEntries(ROLES.map(r => [r.value, r]));
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]));
/* Libellé d'affichage : un Régulateur OSNP dont le RPPS est celui d'un effecteur
   est listé comme « Régulateur Médecin » (RG-EFF-04 / RG-LIST-03). */
ROLE_LABEL.regulateur_medecin = "Régulateur Médecin";
const REGULATEUR_ROLES = ["regulateur_osnp", "regulateur_ioa"];      // non cumulables entre eux (RG-REG-03)
/* Rôles qu'un Gestionnaire de comptes ne peut pas attribuer (RG-ACC-06) */
const ROLES_RESERVES_ADMIN = ["sas_administrateur", "testinterop"];
/* Comptes visibles des seuls SAS Administrateurs (RG-TI-01) */
const ROLES_VISIBLES_ADMIN = ["sas_administrateur", "testinterop"];
/* Tags (ne donnent aucun droit) — Référent territorial : associable à GS, OSNP, IOA (RG-REF-01/02) */
const TAGS = [
  { value: "referent_territorial", label: "Référent territorial",
    roles: ["gestionnaire_structure", "regulateur_osnp", "regulateur_ioa"],
    desc: "Associable aux comptes Gestionnaire de structure, Régulateur OSNP ou Régulateur IOA. Ne donne aucun droit." },
];
const TAG_LABEL = Object.fromEntries(TAGS.map(t => [t.value, t.label]));
function tagsEligibles(roles) { return TAGS.filter(t => roles.some(r => t.roles.includes(r))); }


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
/* Mode de connexion : choisi par l'utilisateur lors de l'activation (mail à deux options,
   RG-POST-02) — inconnu tant que le compte n'a jamais été utilisé. */
const MODE_CONNEXION = { PSC: "Pro Santé Connect", MdP: "Mot de passe" };

const STRUCTURE_TYPES = [
  { value: "sos_medecins", label: "SOS Médecins" },
  { value: "cds",          label: "Centre de Santé (CDS)" },
  { value: "cpts_msp",     label: "CPTS / MSP" },
];
const STRUCTURE_LABEL = Object.fromEntries(STRUCTURE_TYPES.map(s => [s.value, s.label]));
/* Libellés courts pour la liste (SOS Médecins / CDS / CPTS-MSP) */
const STRUCTURE_SHORT = { sos_medecins: "SOS Médecins", cds: "CDS", cpts_msp: "CPTS/MSP" };

/* Territoires SAS — format « SAS-[n° département] ».
   Un territoire peut couvrir PLUSIEURS départements et porte une liste de
   codes INSEE (communes) — référentiel modifiable. */
const SEED_TERRITOIRES = [
  { code: "SAS-75", departements: ["Paris"],                              insee: ["75056"] },
  { code: "SAS-92", departements: ["Hauts-de-Seine"],                     insee: ["92012","92050","92062"] },
  { code: "SAS-93", departements: ["Seine-Saint-Denis"],                  insee: ["93048","93066","93070"] },
  { code: "SAS-69", departements: ["Rhône", "Métropole de Lyon"],         insee: ["69123","69029","69264"] }, // multi-départements
  { code: "SAS-13", departements: ["Bouches-du-Rhône"],                   insee: ["13055","13001"] },
  { code: "SAS-33", departements: ["Gironde"],                            insee: ["33063","33281"] },
  { code: "SAS-31", departements: ["Haute-Garonne"],                      insee: ["31555","31424"] },
  { code: "SAS-59", departements: ["Nord"],                               insee: ["59350","59512"] },
  { code: "SAS-44", departements: ["Loire-Atlantique"],                   insee: ["44109","44184"] },
  { code: "SAS-35", departements: ["Ille-et-Vilaine"],                    insee: ["35238","35047"] },
  { code: "SAS-67", departements: ["Bas-Rhin"],                           insee: ["67482"] },
  { code: "SAS-34", departements: ["Hérault"],                            insee: ["34172","34301"] },
  { code: "SAS-20", departements: ["Corse-du-Sud", "Haute-Corse"],        insee: ["2A004","2B033"] }, // multi-départements
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
  // Structures des Hauts-de-Seine (démo multi-territoires SAS-75 + SAS-92)
  { finess: "920200139", type: "cpts_msp", nom: "CPTS Boulogne-Billancourt", ville: "92100 Boulogne-Billancourt" },
  { finess: "920100142", type: "cds",      nom: "Centre de Santé Nanterre",  ville: "92000 Nanterre" },
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
  "92000 Nanterre","92100 Boulogne-Billancourt","93100 Montreuil","69002 Lyon","69003 Lyon",
  "13008 Marseille","33000 Bordeaux","31400 Toulouse","35000 Rennes",
  "59000 Lille","44100 Nantes","67100 Strasbourg","34000 Montpellier",
];

/* Annuaire Santé : la qualité d'effecteur est DÉDUITE du RPPS (le rôle Effecteur n'existe plus). */
const RPPS_BY_ID = Object.fromEntries(RPPS_DIRECTORY.map(x => [x.rpps, x]));
/* Identifiant national d'un professionnel de santé = « 8 » + RPPS (un compte = un identifiant national). */
function idNationalFromRpps(rpps) { return "8" + rpps; }

/* Les identités (profils « Connecté en tant que ») sont définies dans identities.js. */

/* Utilisateurs de démonstration.
   - roles : tableau (cumul autorisé, sauf Régulateur OSNP + Régulateur IOA) ;
   - territoires (forme courte des seeds) : territoires de gestion (GC) / territoire d'orientation
     (régulateur, le premier) — convertis par normalizeUser ; ceux des GS viennent de leurs structures ;
   - tags : ["referent_territorial"] le cas échéant ;
   - createdBy / updatedBy : auteur ({ userId } pour un compte de la plateforme — s'il est supprimé,
     on affiche son rôle et son territoire — ou { label } pour un profil du mock). */
const SEED_USERS = [
  { id:"u-001", email:"admin.national@sas.gouv.fr", nom:"Lefevre", prenom:"Isabelle", roles:["sas_administrateur"], ville:"75007 Paris", territoires:[], actif:true,
    createdBy:{ label:"Reprise de l'existant" } },
  { id:"u-002", email:"g.compte.paris@sas.gouv.fr", nom:"Garnier", prenom:"Paul", roles:["gestionnaire_compte"], ville:"75012 Paris", territoires:["SAS-75","SAS-92"], actif:true,
    createdBy:{ userId:"u-001" } },
  { id:"u-003", email:"g.compte.lyon@sas.gouv.fr", nom:"Faure", prenom:"Camille", roles:["gestionnaire_compte"], ville:"69002 Lyon", territoires:["SAS-69"], actif:true,
    createdBy:{ userId:"u-001" } },
  { id:"u-004", email:"regul.osnp.paris@sas.gouv.fr", nom:"Roux", prenom:"David", roles:["regulateur_osnp","gestionnaire_compte"], ville:"75015 Paris", territoires:["SAS-75"], actif:true,
    createdBy:{ userId:"u-002" }, updatedBy:{ userId:"u-001" } },
  { id:"u-005", email:"claire.durand@sas.gouv.fr", nom:"Durand", prenom:"Claire", roles:["regulateur_osnp"], ville:"75014 Paris", territoires:["SAS-75"], actif:true,
    rpps:"10001234567", createdBy:{ userId:"u-002" } },
  { id:"u-006", email:"sos.paris@structure.fr", nom:"Leroy", prenom:"Nathalie", roles:["gestionnaire_structure"], tags:["referent_territorial"], ville:"75014 Paris", territoires:["SAS-75"], actif:true,
    createdBy:{ userId:"u-002" },
    structures:[ {type:"sos_medecins",finess:"750000015",nom:"SOS Médecins Paris"}, {type:"sos_medecins",finess:"750000023",nom:"SOS Médecins Paris Est"}, {type:"cds",finess:"750100056",nom:"Centre de Santé Marcadet"}, {type:"cpts_msp",finess:"750200091",nom:"CPTS Paris 13"} ] },
  { id:"u-007", email:"cpts.rennes@structure.fr", nom:"Girard", prenom:"Hugo", roles:["gestionnaire_structure"], ville:"35000 Rennes", territoires:["SAS-35"], actif:true,
    rpps:"10004567890", createdBy:{ userId:"u-001" },
    structures:[ {type:"cpts_msp",finess:"350200117",nom:"CPTS Rennes Métropole"} ] },
  { id:"u-008", email:"julien.martin@sas.gouv.fr", nom:"Martin", prenom:"Julien", roles:["regulateur_osnp"], ville:"69003 Lyon", territoires:["SAS-69"], actif:false,
    rpps:"10002345678", createdBy:{ userId:"u-003" }, updatedBy:{ userId:"u-003" } },
  { id:"u-009", email:"cds.montreuil@structure.fr", nom:"Fontaine", prenom:"Sarah", roles:["gestionnaire_structure"], ville:"93100 Montreuil", territoires:["SAS-93"], actif:true,
    createdBy:{ userId:"u-023" },
    structures:[ {type:"cds",finess:"930100063",nom:"Centre Municipal de Santé de Montreuil"} ] },
  { id:"u-010", email:"g.compte.lille@sas.gouv.fr", nom:"Chevalier", prenom:"Marion", roles:["gestionnaire_compte"], ville:"59000 Lille", territoires:["SAS-59"], actif:true,
    createdBy:{ userId:"u-001" } },
  { id:"u-011", email:"nadia.robert@sas.gouv.fr", nom:"Robert", prenom:"Nadia", roles:["regulateur_ioa"], ville:"31400 Toulouse", territoires:["SAS-31"], actif:true,
    rpps:"10005678901", createdBy:{ userId:"u-001" } },
  { id:"u-012", email:"manuel.lopez@sas.gouv.fr", nom:"Lopez", prenom:"Manuel", roles:["regulateur_ioa"], ville:"33000 Bordeaux", territoires:["SAS-33"], actif:true,
    rpps:"10010123456", createdBy:{ userId:"u-001" } },
  { id:"u-013", email:"msp.strasbourg@structure.fr", nom:"Meyer", prenom:"Chloé", roles:["gestionnaire_structure"], ville:"67100 Strasbourg", territoires:["SAS-67"], actif:true,
    rpps:"10011234567", createdBy:{ userId:"u-001" },
    structures:[ {type:"cpts_msp",finess:"670200120",nom:"MSP Strasbourg Neudorf"} ] },
  { id:"u-014", email:"lucas.blanc@sas.gouv.fr", nom:"Blanc", prenom:"Lucas", roles:["regulateur_osnp"], ville:"13008 Marseille", territoires:["SAS-13"], actif:true,
    rpps:"10012345678", createdBy:{ userId:"u-001" } },
  { id:"u-015", email:"testinterop.editeur-a@sas.gouv.fr", nom:"Éditeur A", prenom:"Test", roles:["testinterop"], ville:"", territoires:[], actif:true,
    createdBy:{ userId:"u-001" } },
  // Régulateurs OSNP (sans RPPS)
  { id:"u-016", email:"regul.osnp.lyon@sas.gouv.fr", nom:"Nguyen", prenom:"Linh", roles:["regulateur_osnp"], ville:"69003 Lyon", territoires:["SAS-69"], actif:true,
    // Créateur dont le compte a été supprimé : on affiche son rôle et son territoire
    createdBy:{ userId:"u-099", roleLabel:"Gestionnaire de comptes", territoires:["SAS-69"] } },
  { id:"u-017", email:"regul.osnp.lille@sas.gouv.fr", nom:"Dubois", prenom:"Antoine", roles:["regulateur_osnp"], ville:"59000 Lille", territoires:["SAS-59"], actif:true,
    createdBy:{ userId:"u-010" } },
  { id:"u-018", email:"regul.osnp.marseille@sas.gouv.fr", nom:"Barbier", prenom:"Léa", roles:["regulateur_osnp"], ville:"13008 Marseille", territoires:["SAS-13"], actif:true,
    createdBy:{ userId:"u-001" } },
  { id:"u-019", email:"regul.osnp.paris2@sas.gouv.fr", nom:"Colin", prenom:"Maxime", roles:["regulateur_osnp"], ville:"75015 Paris", territoires:["SAS-75"], actif:false,
    createdBy:{ userId:"u-002" } },
  { id:"u-020", email:"regul.osnp.rennes@sas.gouv.fr", nom:"Guerin", prenom:"Sophie", roles:["regulateur_osnp"], ville:"35000 Rennes", territoires:["SAS-35"], actif:true,
    createdBy:{ userId:"u-001" } },
  // Régulateurs IOA / Agents d'accueil
  { id:"u-021", email:"regul.ioa.paris@sas.gouv.fr", nom:"Lambert", prenom:"Inès", roles:["regulateur_ioa"], tags:["referent_territorial"], ville:"75012 Paris", territoires:["SAS-75"], actif:true,
    createdBy:{ userId:"u-002" } },
  { id:"u-022", email:"regul.ioa.lyon@sas.gouv.fr", nom:"Marchand", prenom:"Karim", roles:["regulateur_ioa"], ville:"69002 Lyon", territoires:["SAS-69"], actif:true,
    createdBy:{ userId:"u-003" } },
  // Gestionnaire de comptes multi-territoires + comptes de son périmètre
  { id:"u-023", email:"g.compte.idf-est@sas.gouv.fr", nom:"Benali", prenom:"Yasmine", roles:["gestionnaire_compte"], ville:"93100 Montreuil", territoires:["SAS-92","SAS-93"], actif:true,
    createdBy:{ userId:"u-001" }, derniereConnexion:"2026-09-30T08:12:00.000Z" },
  { id:"u-024", email:"antoine.simon@sas.gouv.fr", nom:"Simon", prenom:"Antoine", roles:["regulateur_osnp"], ville:"92100 Boulogne-Billancourt", territoires:["SAS-92"], actif:true,
    rpps:"10008901234", createdBy:{ userId:"u-023" } },
  // Gestionnaire de structure MULTI-TERRITOIRES (SAS-75 + SAS-92) ET Régulateur OSNP orienté SAS-75 :
  // rattachement SAS-75 + SAS-92 (visible des GC des deux territoires), orientation SAS-75 uniquement.
  { id:"u-025", email:"marc.richard@sas.gouv.fr", nom:"Richard", prenom:"Marc", roles:["gestionnaire_structure","regulateur_osnp"], tags:["referent_territorial"],
    ville:"75013 Paris", territoires:["SAS-75"], actif:true, rpps:"10006789012", createdBy:{ userId:"u-001" },
    structures:[ {type:"cpts_msp",finess:"750200091",nom:"CPTS Paris 13"}, {type:"cpts_msp",finess:"920200139",nom:"CPTS Boulogne-Billancourt"} ] },
];

/* Enrichissement des comptes de démonstration (identifiant national, profession issue du RPPS,
   région, dates, mode de connexion — variété déterministe). */
SEED_USERS.forEach((u, i) => {
  const pro = u.rpps ? RPPS_BY_ID[u.rpps] : null;
  if (pro) { u.profession = pro.profession; u.specialite = pro.specialite; }
  u.idNational = u.rpps ? idNationalFromRpps(u.rpps) : "SASN-" + String(100000 + i + 1);
  u.territoire = (u.territoires || [])[0] || "";
  u.region = u.region || territoireRegion(u.territoire);
  u.created_at = u.created_at || new Date(2025, i % 12, 1 + (i % 27)).toISOString();
  if (u.updatedBy) u.updated_at = new Date(2026, (i % 6) + 1, 3 + (i % 20)).toISOString();
  // Quelques comptes ne se sont jamais connectés (statut « En attente de première connexion »)
  if (!("derniereConnexion" in u)) u.derniereConnexion = (i % 5 === 2) ? null : new Date(2026, i % 6, 2 + (i % 25)).toISOString();
  // Le mode de connexion est choisi par l'utilisateur à l'activation : inconnu s'il ne s'est jamais connecté
  u.modeConnexion = u.derniereConnexion ? (i % 3 === 0 ? "PSC" : "MdP") : null;
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

/* Bandeaux d'information (Lot 4) — deux audiences par périmètre :
   « connecte » (utilisateur connecté) et « non_connecte » (page de connexion).
   Éditables au niveau national et par territoire, avec plage d'affichage (début/fin). */
const BANDEAU_AUDIENCES = [
  { key: "connecte",     label: "Utilisateur connecté" },
  { key: "non_connecte", label: "Page de connexion (non connecté)" },
];
const BANDEAU_SEED = [
  { id:"ban-nat-c",  scope:"national", audience:"connecte",     active:true,
    title:"Fenêtre de maintenance planifiée",
    message:"Une maintenance de la plateforme SAS aura lieu le 28/07 de 22h à 23h. Les services pourront être momentanément indisponibles.",
    start:"2026-07-20T08:00", end:"2026-07-28T23:00" },
  { id:"ban-nat-nc", scope:"national", audience:"non_connecte", active:true,
    title:"Bienvenue sur l'arrière-guichet SAS",
    message:"L'accès est réservé aux professionnels habilités. Connectez-vous via Pro Santé Connect ou avec vos identifiants.",
    start:"2026-01-01T00:00", end:"2026-12-31T23:59" },
  { id:"ban-75-c",   scope:"SAS-75",   audience:"connecte",     active:true,
    title:"SAS-75 — nouvelle procédure de réorientation",
    message:"À compter du 21/07, les réorientations de nuit sont centralisées. Consultez la note dans la Gestion Support.",
    start:"2026-07-18T06:00", end:"2026-08-15T20:00" },
];

/* ---------------------------------------------------------------- *
 *  ÉTAT
 * ---------------------------------------------------------------- */
const USERS_KEY = "bo-sas-users-v10";  // v10 : rattachement calculé + territoire d'orientation + tags
const LOG_KEY   = "bo-sas-journal-v1";
const TERR_KEY  = "bo-sas-territoires-v2";
const DEP_KEY   = "bo-sas-departements-v1";
const SUP_KEY   = "bo-sas-support-v1";
const CGU_KEY   = "bo-sas-cgu-v1";
const BAN_KEY   = "bo-sas-bandeaux-v1";

const EMPTY_FILTERS = { q: "", role: "", territoire: "", region: "", ville: "", profSpec: "", structure: "", statut: "" };

const state = {
  users: loadUsers(),
  territoires: loadTerritoires(),
  departements: loadDepartements(),
  support: loadSupport(),
  cgu: loadCgu(),
  bandeaux: loadBandeaux(),
  journal: loadJournal(),   // journal des actions sur les comptes (RG-POST-07)
  identityIdx: currentIdentityIdx(),
  view: "list",   // "list" | "create" | "statistiques" | "journal" | "cgu" | "bandeaux" | "territoires" | "departements" | "support"
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
  banScope: "national", // périmètre actif de la page Bandeaux
  banEdits: {},   // { [`${scope}||${audience}`]: {active,title,message,start,end} } — modifications en attente
  supFilter: "",  // filtre par SAS (territoire) de la Gestion Support
  _supNames: [],  // territoires actuellement affichés (Gestion Support)
};

function normalizeUser(u) {
  if (!u.roles) u.roles = u.role ? [u.role] : [];
  delete u.role;
  if (!Array.isArray(u.tags)) u.tags = [];
  // Forme courte « territoires » → territoires de gestion (GC) et territoire d'orientation (régulateur)
  const legacy = Array.isArray(u.territoires) ? u.territoires : (u.territoire ? [u.territoire] : []);
  if (!Array.isArray(u.territoiresGestion)) u.territoiresGestion = u.roles.includes("gestionnaire_compte") ? [...legacy] : [];
  if (typeof u.territoireOrientation !== "string") u.territoireOrientation = u.roles.some(r => REGULATEUR_ROLES.includes(r)) ? (legacy[0] || "") : "";
  delete u.territoires; delete u.environnements;
  u.territoire = userTerritoires(u)[0] || "";   // premier territoire de rattachement (pages SAS-DATA)
  return u;
}
function loadUsers() {
  try { const raw = localStorage.getItem(USERS_KEY); if (raw) return JSON.parse(raw).map(normalizeUser); } catch (e) {}
  return SEED_USERS.map(u => normalizeUser(JSON.parse(JSON.stringify(u))));
}
function saveUsers() { try { localStorage.setItem(USERS_KEY, JSON.stringify(state.users)); } catch (e) {} }
function loadJournal() {
  try { const raw = localStorage.getItem(LOG_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return [];
}
function saveJournal() { try { localStorage.setItem(LOG_KEY, JSON.stringify(state.journal.slice(0, 500))); } catch (e) {} }
function normalizeTerritoire(t) {
  // Rétro-compatibilité : ancien modèle mono-département { code, dep }
  if (!Array.isArray(t.departements)) t.departements = t.dep ? [t.dep] : [];
  if (!Array.isArray(t.insee)) t.insee = [];
  t.dep = t.departements.join(", ");   // libellé dérivé (affichage / options)
  return t;
}
function loadTerritoires() {
  try { const raw = localStorage.getItem(TERR_KEY); if (raw) return JSON.parse(raw).map(normalizeTerritoire); } catch (e) {}
  return SEED_TERRITOIRES.map(t => normalizeTerritoire({ ...t }));
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
function loadBandeaux() {
  try { const raw = localStorage.getItem(BAN_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return JSON.parse(JSON.stringify(BANDEAU_SEED));
}
function saveBandeaux() { try { localStorage.setItem(BAN_KEY, JSON.stringify(state.bandeaux)); } catch (e) {} }

function newForm() {
  return { roles: [], tags: [], email:"", nom:"", prenom:"", ville:"",
           territoiresGestion: [],     // Gestionnaire de comptes : un ou plusieurs
           territoireOrientation: "",  // Régulateur : exactement un
           region:"",
           rpps:"", pro:null,          // pro = fiche Annuaire Santé trouvée pour le RPPS
           structures: [],             // [{ type, finess, nom, ville }] — leurs territoires font le rattachement du GS
           draftType: "sos_medecins",  // type sélectionné dans le sélecteur d'ajout
           regionAuto:true,            // la région suit le premier territoire de rattachement tant qu'on ne la modifie pas
           errors:{}, success:null, failure:null };
}
function formFromUser(u) {
  const f = newForm();
  f.roles = [...(u.roles || [])];
  f.tags = [...tagsOf(u)];
  f.email = u.email; f.nom = u.nom; f.prenom = u.prenom; f.ville = u.ville || "";
  f.territoiresGestion = [...(u.territoiresGestion || [])];
  f.territoireOrientation = u.territoireOrientation || "";
  const first = userTerritoires(u)[0];
  f.region = u.region || territoireRegion(first);
  f.regionAuto = !u.region || u.region === territoireRegion(first);
  if (u.rpps) { f.rpps = u.rpps; f.pro = RPPS_BY_ID[u.rpps] || null; }
  f.structures = (u.structures || []).map(s => {
    const e = FINESS_BY_ID[s.finess];
    return { type: s.type, finess: s.finess, nom: (e ? e.nom : s.nom), ville: (e ? e.ville : (s.ville || "")) };
  });
  return f;
}
function formRattachement(f) { return rattachementOf(f.roles, f.territoiresGestion, f.territoireOrientation, f.structures); }
function identity() { return IDENTITIES[state.identityIdx]; }
function acRole() { return identity().role || null; }            // administrateur | gestionnaire_compte
function acTerrs() { return identityTerritoires(identity()); }   // territoires du gestionnaire de comptes
function acTerr() { return acTerrs()[0] || null; }               // premier territoire (pages SAS-DATA)
function isAdminCreator() { return acRole() === "administrateur"; }

/* Composant technique ouvert (Keycloak / SAS-DATA), passé par l'URL depuis le portail */
const AC_COMPONENTS = {
  keycloak: { key: "utilisateurs", title: "Keycloak", sub: "Gestion des utilisateurs",           views: ["list","create","statistiques","journal","cgu"] },
  sasdata:  { key: "sasdata",      title: "SAS-DATA", sub: "Bandeaux · Territoires · Départements · Support", views: ["bandeaux","territoires","departements","support"] },
};
function currentComponent() {
  try { const c = new URLSearchParams(location.search).get("component"); if (c && AC_COMPONENTS[c]) return c; } catch (e) {}
  return "keycloak";
}
function acCompKey() { return AC_COMPONENTS[currentComponent()].key; }   // "utilisateurs" | "sasdata"
function acLevel()   { return habLevel(identity(), acCompKey()); }       // null | "lecture" | "ecriture"
/* RG-ACC-01 : seuls le SAS Administrateur et le Gestionnaire de comptes accèdent à la gestion des comptes */
function acHasAccess() {
  if (acCompKey() === "utilisateurs" && !["administrateur", "gestionnaire_compte"].includes(acRole())) return false;
  return acLevel() != null;
}
function acWrite()   { return acLevel() === "ecriture"; }
function acPage()    { return "acces.html?component=" + currentComponent(); }
function allowedViews() {
  return AC_COMPONENTS[currentComponent()].views.filter(v => {
    if (v === "territoires" && acRole() !== "administrateur") return false; // territoires = admin uniquement
    if (v === "cgu" && acRole() !== "administrateur") return false;         // édition des CGU = admin uniquement
    if (v === "journal" && acRole() !== "administrateur") return false;     // journal des actions = admin uniquement
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
/* Liste des territoires SAS (référentiel courant ; seed tant que l'état n'est pas initialisé) */
function terrList() { try { return state.territoires; } catch (e) { return SEED_TERRITOIRES; } }
/* Territoire d'une structure = territoire de sa commune d'implantation FINESS (RG-TER-02) */
function structureTerritoire(s) {
  const e = FINESS_BY_ID[s.finess];
  const ville = (e && e.ville) || s.ville || "";
  const m = ville.match(/^(\d{2})/);
  const code = m ? "SAS-" + m[1] : "";
  return terrList().some(t => t.code === code) ? code : "";
}
function hasRegulateur(roles) { return roles.some(r => REGULATEUR_ROLES.includes(r)); }
/* Territoires de RATTACHEMENT (calculés, RG-TER-01) : gestion (GC) + structures (GS) + orientation (régulateur) */
function rattachementOf(roles, gestion, orientation, structures) {
  const out = [];
  const add = (t) => { if (t && !out.includes(t)) out.push(t); };
  if (roles.includes("gestionnaire_compte")) (gestion || []).forEach(add);
  if (roles.includes("gestionnaire_structure")) (structures || []).forEach(s => add(structureTerritoire(s)));
  if (hasRegulateur(roles)) add(orientation);
  return out;
}
function userTerritoires(u) {
  return rattachementOf(rolesOf(u), u.territoiresGestion, u.territoireOrientation, u.structures);
}
function tagsOf(u) { return u.tags || []; }

/* ── Règles métier de la spécification ───────────────────────────── */
/* Qualité d'effecteur : déduite du RPPS dans l'Annuaire Santé (RG-EFF-01) */
function isEffecteur(u) { return !!(u.rpps && RPPS_BY_ID[u.rpps]); }
/* Régulateur Médecin : Régulateur OSNP dont le RPPS est celui d'un effecteur (RG-EFF-04) */
function isRegulateurMedecin(u) { return rolesOf(u).includes("regulateur_osnp") && isEffecteur(u); }
/* Rôles tels qu'affichés dans la liste (OSNP → Régulateur Médecin le cas échéant) */
function displayRoles(u) {
  return rolesOf(u).map(r => (r === "regulateur_osnp" && isEffecteur(u)) ? "regulateur_medecin" : r);
}
function isRegulateur(u) { return rolesOf(u).some(r => REGULATEUR_ROLES.includes(r)); }

/* Matrice de création (section 4) : le Gestionnaire de comptes ne crée ni SAS Administrateur
   ni TestInterop ; il peut créer un autre Gestionnaire de comptes (sur ses territoires). */
function creatableRoles() {
  return isAdminCreator() ? ROLES : ROLES.filter(r => !ROLES_RESERVES_ADMIN.includes(r.value));
}
/* Territoires proposés : tous (SAS Administrateur) ou ceux du créateur (RG-ACC-07) */
function creatorTerritoires() {
  return isAdminCreator() ? state.territoires.map(t => t.code) : acTerrs();
}
/* Un compte est-il entièrement dans le périmètre du créateur ? (suppression complète — proposition, section 9) */
function inCreatorScope(t) { return creatorTerritoires().includes(t); }
function fullyInScope(u) { return isAdminCreator() || userTerritoires(u).every(inCreatorScope); }
/* Auteur courant d'une action (profil « Connecté en tant que » du mock) */
function currentActor() {
  return { label: identity().label,
           roleLabel: isAdminCreator() ? "SAS Administrateur" : "Gestionnaire de comptes",
           territoires: isAdminCreator() ? [] : acTerrs() };
}
/* Libellé d'un auteur : le compte s'il existe encore, sinon son rôle et son territoire
   (ex. « Gestionnaire de comptes du SAS 69 ») */
function describeActor(a) {
  if (!a) return "—";
  if (a.userId) {
    const u = state.users.find(x => x.id === a.userId);
    if (u) return `${u.prenom} ${u.nom}`;
    const terr = (a.territoires || []).map(t => "SAS " + String(t).replace("SAS-", "")).join(", ");
    return `${a.roleLabel || "Compte supprimé"}${terr ? " du " + terr : ""} (compte supprimé)`;
  }
  return a.label || "—";
}

/* Journal des actions (RG-POST-07) : toute action sur un compte, réussie ou en échec */
function logAction(action, user, ok, detail) {
  state.journal.unshift({
    at: new Date().toISOString(), action, ok: !!ok, detail: detail || "",
    cible: user ? `${user.prenom || ""} ${user.nom || ""} <${user.email || ""}>`.trim() : "",
    auteur: identity().label,
  });
  saveJournal();
}
/* Synchronisation des régulateurs avec les éditeurs via l'API Interop (RG-POST-04) :
   à la création, à la modification et à la suppression. Simulée ici. */
function syncInterop(user, operation) {
  logAction(`Synchronisation API Interop (${operation})`, user, true, "Éditeurs notifiés — territoire d'orientation " + (user.territoireOrientation || "—"));
  return "Compte synchronisé avec les éditeurs via l'API Interop.";
}
/* Simulation d'un échec Keycloak : un email en « @echec-keycloak.test » fait échouer la création */
function keycloakFailure(email) {
  return /@echec-keycloak\.test$/i.test(email.trim())
    ? "Keycloak indisponible (délai de réponse dépassé). Aucun compte n'a été créé." : null;
}
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
    create:       { view:"create",       icon:"fr-icon-user-add-line",     label:"Ajouter un utilisateur" },
    statistiques: { view:"statistiques", icon:"fr-icon-line-chart-line",   label:"Statistiques" },
    journal:      { view:"journal",      icon:"fr-icon-file-text-line",    label:"Journal des actions" },
    cgu:          { view:"cgu",          icon:"fr-icon-file-text-line",    label:"Édition des CGU" },
    bandeaux:     { view:"bandeaux",     icon:"fr-icon-info-line",         label:"Bandeaux d'information" },
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
  // RG-ACC-03 : le SAS Administrateur voit tous les comptes de la plateforme
  if (acRole() === "administrateur") return state.users;
  // RG-ACC-04 : le Gestionnaire de comptes voit les comptes partageant AU MOINS UN territoire avec lui ;
  // les comptes SAS Administrateur et TestInterop restent réservés aux administrateurs (RG-TI-01)
  if (acRole() === "gestionnaire_compte") {
    const mine = acTerrs();
    return state.users.filter(u =>
      !rolesOf(u).some(r => ROLES_VISIBLES_ADMIN.includes(r)) &&
      userTerritoires(u).some(t => mine.includes(t)));
  }
  return [];
}
/* Valeurs spéciales du filtre « Rôle » (qualités déduites du RPPS) */
const ROLE_FILTER_EXTRA = [
  { value: "regulateur_medecin", label: "Régulateur Médecin (OSNP + RPPS effecteur)" },
  { value: "qualite_effecteur",  label: "Qualité d'effecteur (déduite du RPPS)" },
  { value: "tag_referent_territorial", label: "Tag : Référent territorial" },
];
function matchRoleFilter(u, v) {
  if (v === "regulateur_medecin") return isRegulateurMedecin(u);
  if (v === "qualite_effecteur") return isEffecteur(u);
  if (v === "tag_referent_territorial") return tagsOf(u).includes("referent_territorial");
  return rolesOf(u).includes(v);
}
function filteredUsers() {
  const f = state.filters;
  const q = f.q.trim().toLowerCase();
  return visibleUsers().filter(u => {
    if (f.role && !matchRoleFilter(u, f.role)) return false;
    if (f.territoire && !userTerritoires(u).includes(f.territoire)) return false;
    if (f.region && (u.region || territoireRegion(u.territoire)) !== f.region) return false;
    if (f.ville && u.ville !== f.ville) return false;
    if (f.profSpec && u.profession !== f.profSpec && u.specialite !== f.profSpec) return false;
    if (f.structure && !structuresOf(u).some(s => s.type === f.structure)) return false;
    if (f.statut && statutEtat(u).key !== f.statut) return false;
    if (!q) return true;
    const hay = [u.nom,u.prenom,u.email,u.idNational,u.ville,...userTerritoires(u),u.rpps,u.profession,u.specialite,
      ...tagsOf(u).map(t => TAG_LABEL[t]),
      ...displayRoles(u).map(r => ROLE_LABEL[r]),
      ...structuresOf(u).flatMap(s => [s.nom, s.finess, STRUCTURE_LABEL[s.type]])
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function roleBadge(role) { return `<span class="fr-badge fr-badge--sm badge-role badge-${role}">${esc(ROLE_LABEL[role] || role)}</span>`; }
function rolesBadgesOf(u) {
  const badges = displayRoles(u).map(roleBadge);
  if (isEffecteur(u) && !isRegulateurMedecin(u))
    badges.push(`<span class="fr-badge fr-badge--sm badge-role badge-qualite-effecteur" title="Qualité d'effecteur déduite du RPPS (Annuaire Santé)">Effecteur · RPPS</span>`);
  tagsOf(u).forEach(t => badges.push(`<span class="fr-badge fr-badge--sm badge-tag" title="Tag">${esc(TAG_LABEL[t] || t)}</span>`));
  return badges.join(" ");
}

/* Statut à 3 états (section 8) :
   Inactif (compte désactivé) · En attente de première connexion (jamais connecté) · Actif. */
function statutEtat(u) {
  if (!u.actif) return { key: "inactif", label: "Inactif", cls: "badge-statut-inactif" };
  if (!u.derniereConnexion) return { key: "attente", label: "En attente de première connexion", cls: "badge-statut-aucune" };
  return { key: "actif", label: "Actif", cls: "badge-statut-actif" };
}
const STATUT_OPTS = [
  { value: "actif",   label: "Actif" },
  { value: "attente", label: "En attente de première connexion" },
  { value: "inactif", label: "Inactif" },
];
function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch (e) { return "—"; }
}
function modeConnexionLabel(m) { return m ? (MODE_CONNEXION[m] || m) : "Non choisi (jamais connecté)"; }

function userRow(u) {
  const et = statutEtat(u);
  const statut = `<span class="fr-badge fr-badge--sm ${et.cls}">${et.label}</span>`;
  const modeBadge = u.modeConnexion
    ? `<span class="fr-badge fr-badge--sm badge-mode badge-mode-${u.modeConnexion}" title="Mode de connexion choisi par l'utilisateur">${u.modeConnexion === "PSC" ? "PSC" : "Mot de passe"}</span>` : "";
  const parts = [];
  if (u.specialite) parts.push(`${esc(u.profession || "")} — ${esc(u.specialite)}`);
  if (structuresOf(u).length) parts.push(structuresOf(u).map(s => `${STRUCTURE_SHORT[s.type]} : ${esc(s.nom)}`).join(", "));
  const extra = parts.length ? " · " + parts.join(" · ") : "";
  const terrs = userTerritoires(u);
  const region = u.region || territoireRegion(terrs[0]);
  const where = [u.ville,
    terrs.length ? "Rattachement : " + terrs.join(", ") : "Sans territoire (national)",
    u.territoireOrientation ? "Orientation : " + u.territoireOrientation : "",
    region].filter(Boolean).map(esc).join(" · ");
  return `
    <div class="user-row">
      <div class="user-row__body">
        <div class="user-row__l1">
          <span class="user-row__name">${esc(u.prenom)} ${esc(u.nom)}</span>
          ${rolesBadgesOf(u)} ${statut} ${modeBadge}
        </div>
        <div class="user-row__l2" title="${esc(u.email)}">
          ${esc(u.email)} · ${where}${extra}
        </div>
        <div class="user-row__meta">
          Créé le ${fmtDate(u.created_at)} par ${esc(describeActor(u.createdBy))} · ${u.derniereConnexion ? "Dernière connexion le " + fmtDate(u.derniereConnexion) : "Jamais connecté"}
        </div>
      </div>
      <div class="user-row__actions">
        <button class="act-edit" data-edit="${u.id}">${acWrite() ? "Modifier" : "Consulter"}</button>
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
  const isAdmin = acRole() === "administrateur";
  const list = filteredUsers();
  const total = visibleUsers().length;
  const f = state.filters;
  const hasFilters = f.q || f.role || f.territoire || f.region || f.ville || f.profSpec || f.structure || f.statut;
  const villes = [...new Set(visibleUsers().map(u => u.ville).filter(Boolean))].sort();
  // Professions + spécialités présentes dans le périmètre visible
  const profSpecs = [...new Set(visibleUsers().flatMap(u => [u.profession, u.specialite]).filter(Boolean))].sort();
  // Régions présentes dans le périmètre visible
  const regions = [...new Set(visibleUsers().map(u => u.region || territoireRegion(u.territoire)).filter(Boolean))].sort();
  // Filtre Territoire : tous (admin) ou ceux du gestionnaire s'il en a plusieurs
  const terrFilter = isAdmin
    ? state.territoires.map(t => ({ value:t.code, label:`${t.code} · ${t.dep}` }))
    : (acTerrs().length > 1 ? acTerrs().map(c => ({ value:c, label:c })) : null);
  const roleOpts = (isAdmin ? ROLES : creatableRoles()).map(r => ({ value:r.value, label:r.label })).concat(ROLE_FILTER_EXTRA);

  el("view-list").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">Utilisateurs</h1>
        <p class="page-sub">${isAdmin
          ? "Vue SAS Administrateur — tous les comptes de la plateforme."
          : "Vue Gestionnaire de comptes — comptes dont au moins un territoire de rattachement est l'un des vôtres : <strong>"+esc(acTerrs().join(", "))+"</strong>."}</p>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="fr-btn fr-btn--sm fr-btn--secondary" id="export-csv">Exporter (CSV)</button>
        ${acWrite() ? `<button class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-user-add-line" data-goto="create">Ajouter un utilisateur</button>` : ""}
      </div>
    </div>

    <div class="filters">
      <div class="f-search">
        <label class="fr-label" for="flt-q">Rechercher</label>
        <input class="fr-input" type="search" id="flt-q" placeholder="Nom, email, ville, RPPS, FINESS…" value="${esc(f.q)}">
      </div>
      ${selectField("role", "Rôle", roleOpts)}
      ${terrFilter ? selectField("territoire", "Territoire", terrFilter) : ""}
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
  setTimeout(() => { t.classList.add("toast--out"); setTimeout(() => t.remove(), 400); }, 3200);
}

/* Export CSV (RG-LIST-02) — même périmètre que la liste (filtres compris). */
function exportUsersCsv(list) {
  const cols = ["Email","Prénom","Nom","Identifiant national","RPPS","Rôle(s)","Tag(s)","Qualité d'effecteur","Région","Territoire(s) de rattachement","Territoire d'orientation","Ville",
                "Structure(s)","Statut","Mode de connexion","Date de création","Créé par","Dernière modification","Modifié par","Dernière connexion"];
  const cell = (v) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = list.map(u => {
    const et = statutEtat(u);
    const structs = structuresOf(u).map(s => `${STRUCTURE_SHORT[s.type]} ${s.nom}`).join(" | ");
    const roles = displayRoles(u).map(r => ROLE_LABEL[r] || r).join(" | ");
    return [
      u.email, u.prenom, u.nom, u.idNational || "", u.rpps || "", roles, tagsOf(u).map(t => TAG_LABEL[t] || t).join(" | "), isEffecteur(u) ? "Oui" : "Non",
      u.region || territoireRegion(u.territoire), userTerritoires(u).join(" | "), u.territoireOrientation || "", u.ville || "",
      structs, et.label, u.modeConnexion ? modeConnexionLabel(u.modeConnexion) : "",
      fmtDate(u.created_at), describeActor(u.createdBy),
      u.updated_at ? fmtDate(u.updated_at) : "", u.updatedBy ? describeActor(u.updatedBy) : "",
      u.derniereConnexion ? fmtDate(u.derniereConnexion) : "Jamais",
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
  logAction("Export de la liste des utilisateurs", null, true, `${list.length} compte(s)`);
  showToast(`Export CSV — ${list.length} utilisateur${list.length > 1 ? "s" : ""}.`);
}

function bindRowActions(root) {
  root.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const u = state.users.find(x => x.id === b.dataset.edit);
    if (u) { state.form = formFromUser(u); state.editId = u.id; state.view = "create"; render(); window.scrollTo({top:0}); }
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
      state.users = SEED_USERS.map(u=>normalizeUser(JSON.parse(JSON.stringify(u))));
      state.journal = [];
      state.territoires = SEED_TERRITOIRES.map(t=>normalizeTerritoire({...t}));
      state.departements = DEPARTEMENTS.map(d=>({...d}));
      state.support = JSON.parse(JSON.stringify(SUPPORT_REORIENTATIONS));
      state.cgu = JSON.parse(JSON.stringify(CGU_SEED));
      state.cguDraft = null;
      state.bandeaux = JSON.parse(JSON.stringify(BANDEAU_SEED));
      state.banEdits = {};
      saveUsers(); saveJournal(); saveTerritoires(); saveDepartements(); saveSupport(); saveCgu(); saveBandeaux(); render();
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
  const u = editing ? state.users.find(x => x.id === state.editId) : null;
  const readOnly = !acWrite();
  const isGC = f.roles.includes("gestionnaire_compte");
  const isStructure = f.roles.includes("gestionnaire_structure");
  const isRegul = hasRegulateur(f.roles);
  const hasRoles = f.roles.length > 0;
  const locked = !!f.pro;   // nom / prénom repris du RPPS : non modifiables (RG-EFF-03)
  const err = (k) => f.errors[k] ? `<p class="fr-error-text">${esc(f.errors[k])}</p>` : "";
  const grp = (k) => `fr-input-group ${f.errors[k]?"fr-input-group--error":""}`;
  const req = ' <span style="color:#ce0500">*</span>';
  const dis = readOnly ? "disabled" : "";
  const options = creatorTerritoires();
  const single = !isAdminCreator() && options.length === 1;   // créateur rattaché à un seul territoire
  const terrLabel = (c) => { const t = state.territoires.find(x => x.code === c); return t ? `${t.code} · ${t.dep}` : c; };
  const outNote = ' <span class="readonly-note">(hors de votre périmètre — non modifiable)</span>';

  // Issue de l'enregistrement (RG-POST-05 / RG-POST-06)
  const success = f.success ? `
    <div class="fr-alert fr-alert--success fr-mb-3w">
      <h3 class="fr-alert__title">${f.success.mode==='edit' ? "Compte modifié" : "Le compte a bien été créé"}</h3>
      <p>${esc(f.success.prenom)} ${esc(f.success.nom)} (${esc(f.success.email)}).</p>
      ${f.success.mode==='create' ? `<p>Un mail d'activation a été envoyé : l'utilisateur choisira de créer son mot de passe ou de se connecter avec Pro Santé Connect.</p>` : ""}
      ${f.success.sync ? `<p>${esc(f.success.sync)}</p>` : ""}
      <button class="fr-btn fr-btn--sm fr-mt-1w" data-goto-list>Retourner à la liste des utilisateurs</button>
    </div>` : "";
  const failure = f.failure ? `
    <div class="fr-alert fr-alert--error fr-mb-3w">
      <h3 class="fr-alert__title">Échec de la création du compte</h3>
      <p>${esc(f.failure)}</p>
    </div>` : "";

  // Rôles proposés selon le créateur ; Régulateur OSNP et IOA s'excluent mutuellement (RG-REG-03)
  const roleCheckbox = (r) => {
    const other = REGULATEUR_ROLES.includes(r.value) ? REGULATEUR_ROLES.find(x => x !== r.value) : null;
    const blocked = other && f.roles.includes(other) && !f.roles.includes(r.value);
    return `
    <div class="fr-checkbox-group">
      <input type="checkbox" id="role-${r.value}" data-role="${r.value}" ${f.roles.includes(r.value)?"checked":""} ${blocked||readOnly?"disabled":""}>
      <label class="fr-label" for="role-${r.value}">${esc(r.label)}
        <span class="fr-hint-text">${esc(blocked ? "Non cumulable avec " + ROLE_LABEL[other] + "." : r.desc)}</span></label>
    </div>`;
  };
  // En modification, un rôle déjà porté mais non attribuable par le créateur reste affiché
  const roleList = creatableRoles().concat(ROLES.filter(r => f.roles.includes(r.value) && !creatableRoles().includes(r)));
  const rolesCheckboxes = roleList.map(roleCheckbox).join("");

  // Tag Référent territorial — proposé seulement avec GS / OSNP / IOA (RG-REF-02)
  const tagsDispo = tagsEligibles(f.roles);
  const tagsBlock = tagsDispo.length ? `
    <div class="roles-reserved">
      <span class="roles-reserved__title">Tag</span>
      ${tagsDispo.map(t => `
        <div class="fr-checkbox-group">
          <input type="checkbox" id="tag-${t.value}" data-tag="${t.value}" ${f.tags.includes(t.value)?"checked":""} ${dis}>
          <label class="fr-label" for="tag-${t.value}">${esc(t.label)}<span class="fr-hint-text">${esc(t.desc)}</span></label>
        </div>`).join("")}
    </div>` : "";

  // Territoires de gestion (Gestionnaire de comptes)
  const gestionOut = f.territoiresGestion.filter(t => !options.includes(t));
  const gestionBlock = !isGC ? "" : (single ? `
    <div class="fr-input-group"><label class="fr-label">Territoire(s) de gestion</label>
      <p style="margin:.2rem 0 0;"><strong>${esc(terrLabel(options[0]))}</strong> <span class="readonly-note">(attribué d'office : votre unique territoire)</span>
      ${gestionOut.length ? `<br>${esc(gestionOut.join(", "))}${outNote}` : ""}</p>${err('territoiresGestion')}</div>` : `
    <div class="${grp('territoiresGestion')}">
      <label class="fr-label">Territoire(s) de gestion${req}<span class="fr-hint-text">Territoires sur lesquels ce Gestionnaire de comptes crée et voit des comptes${isAdminCreator() ? "" : " — parmi les vôtres"}.</span></label>
      <div class="roles-checkboxes terr-checkboxes">
        ${options.map(c => `<div class="fr-checkbox-group">
          <input type="checkbox" id="gest-${esc(c)}" data-gest="${esc(c)}" ${f.territoiresGestion.includes(c)?"checked":""} ${dis}>
          <label class="fr-label" for="gest-${esc(c)}">${esc(terrLabel(c))}</label></div>`).join("")}
      </div>
      ${gestionOut.length ? `<p class="mock-note" style="margin:.3rem 0 0;">Également : ${esc(gestionOut.join(", "))}${outNote}</p>` : ""}
      ${err('territoiresGestion')}</div>`);

  // Structures (gestionnaire de structure) — FINESS juridique, sans doublon, filtrées par périmètre (RG-GS-01/02/04)
  const addedItems = f.structures.map((s, i) => {
    const t = structureTerritoire(s);
    const mine = isAdminCreator() || options.includes(t);
    return `
    <div class="struct-item">
      <div><strong>${esc(STRUCTURE_SHORT[s.type])}</strong> — ${esc(s.nom)} <span class="mock-note">FINESS ${esc(s.finess)} · ${esc(t || "territoire inconnu")}</span>${mine ? "" : outNote}</div>
      ${(readOnly || !mine) ? "" : `<button type="button" class="fr-link" data-struct-remove="${i}">Retirer</button>`}
    </div>`; }).join("");
  const typeOpts = STRUCTURE_TYPES.map(s => `<option value="${s.value}" ${f.draftType===s.value?"selected":""}>${esc(s.label)}</option>`).join("");
  const finessOpts = FINESS_DIRECTORY
    .filter(x => x.type === f.draftType && (isAdminCreator() || options.includes(structureTerritoire(x))))
    .map(x => `${esc(x.nom)} — FINESS ${x.finess} (${esc(x.ville)})`);
  const structureBlock = isStructure ? `
    <fieldset class="struct-fieldset ${f.errors.structures?'has-err':''}">
      <legend>Structures rattachées${req}</legend>
      <p class="fr-hint-text" style="margin-top:0;">Au moins une structure : association SOS Médecins, CPTS ou centre de santé, identifiée par son FINESS juridique. Le territoire du gestionnaire est celui de ses structures${isAdminCreator() ? "" : " ; seules les structures de vos territoires sont proposées"}.</p>
      ${addedItems}
      <p class="struct-count">${f.structures.length} structure${f.structures.length>1?"s":""} rattachée${f.structures.length>1?"s":""}</p>
      ${readOnly ? "" : `<div class="struct-add">
        <div class="fr-input-group sa-type">
          <label class="fr-label" for="struct-type">Type</label>
          <select class="fr-select" id="struct-type">${typeOpts}</select>
        </div>
        <div class="fr-input-group sa-finess">
          <label class="fr-label" for="struct-finess">Structure (${esc(STRUCTURE_LABEL[f.draftType])})</label>
          <input class="fr-input" id="struct-finess" list="struct-finess-list" placeholder="${finessOpts.length ? "Rechercher…" : "Aucune structure de ce type sur vos territoires"}">
          <datalist id="struct-finess-list">${finessOpts.map(o=>`<option value="${esc(o)}">`).join("")}</datalist>
        </div>
        <button class="fr-btn fr-btn--sm" type="button" id="struct-add-btn">Ajouter</button>
      </div>`}
      ${err('structures')}
    </fieldset>` : "";

  // Territoire d'orientation (régulateur) — un seul (RG-REG-01/02, RG-TER-04)
  const orientOut = f.territoireOrientation && !options.includes(f.territoireOrientation);
  const orientationBlock = !isRegul ? "" : (orientOut ? `
    <div class="fr-input-group"><label class="fr-label">Territoire d'orientation</label>
      <p style="margin:.2rem 0 0;"><strong>${esc(terrLabel(f.territoireOrientation))}</strong>${outNote}</p></div>` : single ? `
    <div class="fr-input-group"><label class="fr-label">Territoire d'orientation</label>
      <p style="margin:.2rem 0 0;"><strong>${esc(terrLabel(options[0]))}</strong> <span class="readonly-note">(attribué d'office : votre unique territoire)</span></p>${err('territoireOrientation')}</div>` : `
    <div class="${grp('territoireOrientation')}">
      <label class="fr-label" for="orientation">Territoire d'orientation${req}<span class="fr-hint-text">Un seul : territoire où ce régulateur oriente les patients${isStructure ? ", indépendamment des territoires de ses structures" : ""}.</span></label>
      <select class="fr-select" id="orientation" ${dis}><option value="">— Sélectionner —</option>
        ${options.map(c => `<option value="${esc(c)}" ${f.territoireOrientation===c?"selected":""}>${esc(terrLabel(c))}</option>`).join("")}
      </select>${err('territoireOrientation')}</div>`);

  // Territoire(s) de rattachement : calculés, affichés en lecture (RG-TER-01)
  const ratt = formRattachement(f);
  const rattachementBlock = !hasRoles ? "" : `
    <div class="rattachement-box ${f.errors.rattachement ? 'has-err' : ''}">
      <span class="rattachement-box__title">Territoire(s) de rattachement — calculé(s)</span>
      ${ratt.length
        ? `<p style="margin:.2rem 0 0;"><strong>${esc(ratt.join(", "))}</strong></p>
           <p class="mock-note" style="margin:.2rem 0 0;">Le compte sera visible des Gestionnaires de comptes de ${ratt.length > 1 ? "ces territoires" : "ce territoire"}.</p>`
        : `<p class="mock-note" style="margin:.2rem 0 0;">${f.roles.every(r => (ROLE_BY_VALUE[r] || {}).territoire === "aucun")
            ? "Aucun : compte de portée nationale (SAS Administrateur / TestInterop)."
            : "Aucun pour l'instant : il sera calculé à partir des territoires de gestion, des structures et du territoire d'orientation."}</p>`}
      ${err('rattachement')}
    </div>`;

  const regionOptions = `<option value="">— Sélectionner —</option>` +
    REGIONS.map(r => `<option value="${esc(r)}" ${f.region===r?"selected":""}>${esc(r)}</option>`).join("");
  const regionBlock = !ratt.length ? "" : `
    <div class="${grp('region')}">
      <label class="fr-label" for="region">Région
        <span class="fr-hint-text">Renseignée automatiquement d'après le premier territoire de rattachement ; modifiable.</span></label>
      <select class="fr-select" id="region" ${dis}>${regionOptions}</select>${err('region')}
    </div>`;

  // RPPS facultatif : vérifié dans l'Annuaire Santé, unique, préremplit nom/prénom (RG-EFF-02/03)
  const rppsBlock = `
    <div class="${grp('rpps')}">
      <label class="fr-label" for="rpps">Numéro RPPS (facultatif)
        <span class="fr-hint-text">Vérifié dans l'Annuaire Santé. Remplit nom et prénom, qui deviennent non modifiables, et détermine la qualité d'effecteur.</span></label>
      <div style="display:flex;gap:.5rem;">
        <input class="fr-input" id="rpps" inputmode="numeric" placeholder="Ex : 10003456789" value="${esc(f.rpps)}" ${locked||readOnly?"readonly":""}>
        ${readOnly ? "" : (locked
          ? `<button class="fr-btn fr-btn--secondary" type="button" id="rpps-clear">Retirer</button>`
          : `<button class="fr-btn" type="button" id="rpps-search">Rechercher</button>`)}
      </div>
      ${f.pro ? `<div class="fr-alert fr-alert--info fr-alert--sm fr-mt-1w"><p><strong>${esc(f.pro.prenom)} ${esc(f.pro.nom)}</strong> — ${esc(f.pro.profession)} · ${esc(f.pro.specialite)}<br>
        Qualité d'effecteur : oui (déduite du RPPS)${f.roles.includes("regulateur_osnp") ? " — le compte sera listé comme <strong>Régulateur Médecin</strong>" : ""}.</p></div>` : ""}
      ${err('rpps')}
      ${readOnly ? "" : `<p class="mock-note" style="margin-top:.4rem;">RPPS de démo libres : 10003456789, 10007890123, 10013456789… (10001234567 est déjà porté par un compte).</p>`}
    </div>`;

  // Page de modification : informations et actions sur le compte (section 8)
  const infoPanel = (editing && u) ? (() => {
    const et = statutEtat(u);
    const canDelete = fullyInScope(u);
    return `
    <section class="account-info">
      <div class="account-info__head">
        <span class="fr-badge fr-badge--sm ${et.cls}">${et.label}</span>
        ${rolesBadgesOf(u)}
        <span class="mock-note">Identifiant national : ${esc(u.idNational || "—")}</span>
      </div>
      <dl class="account-info__grid">
        <dt>Rattachement</dt><dd>${esc(userTerritoires(u).join(", ") || "Aucun (national)")}</dd>
        ${u.territoireOrientation ? `<dt>Orientation</dt><dd>${esc(u.territoireOrientation)}</dd>` : ""}
        <dt>Création</dt><dd>${fmtDate(u.created_at)} — par ${esc(describeActor(u.createdBy))}</dd>
        <dt>Dernière modification</dt><dd>${u.updated_at ? `${fmtDate(u.updated_at)} — par ${esc(describeActor(u.updatedBy))}` : "Jamais modifié"}</dd>
        <dt>Dernière connexion</dt><dd>${u.derniereConnexion ? fmtDate(u.derniereConnexion) : "Jamais connecté"}</dd>
        <dt>Mode de connexion</dt><dd>${esc(modeConnexionLabel(u.modeConnexion))}</dd>
      </dl>
      ${acWrite() ? `<div class="account-info__actions">
        <button type="button" class="fr-btn fr-btn--sm fr-btn--secondary fr-icon-mail-line fr-btn--icon-left" id="act-resend">Renvoyer le mail de bienvenue</button>
        <button type="button" class="fr-btn fr-btn--sm fr-btn--secondary" id="act-toggle">${u.actif ? "Désactiver le compte" : "Activer le compte"}</button>
        ${canDelete
          ? `<button type="button" class="fr-btn fr-btn--sm fr-btn--tertiary act-danger" id="act-delete">Supprimer le compte</button>`
          : `<span class="mock-note" style="align-self:center;">Suppression complète réservée au SAS Administrateur : le compte est aussi rattaché à des territoires hors de votre périmètre. Vous pouvez retirer vos structures.</span>`}
      </div>` : ""}
    </section>`; })() : "";

  el("view-create").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">${editing ? (readOnly ? "Consulter l'utilisateur" : "Modifier l'utilisateur") : "Ajouter un utilisateur"}</h1>
    <p class="page-sub" style="margin-bottom:1.25rem;">${isAdminCreator()
      ? "SAS Administrateur — tous les rôles et tous les territoires."
      : "Gestionnaire de comptes — territoires : <strong>" + esc(acTerrs().join(", ")) + "</strong>. Les rôles SAS Administrateur et TestInterop ne sont pas attribuables."}</p>
    ${success}${failure}
    ${infoPanel}
    <form class="bo-form" id="create-form" novalidate>
      <div class="${grp('roles')}">
        <label class="fr-label">Rôle(s)${req}<span class="fr-hint-text">Les rôles sont cumulables, sauf Régulateur OSNP et Régulateur IOA.</span></label>
        <div class="roles-checkboxes roles-checkboxes--stack">${rolesCheckboxes}</div>
        ${tagsBlock}
        ${err('roles')}
      </div>

      ${gestionBlock}
      ${structureBlock}
      ${orientationBlock}
      ${rattachementBlock}

      ${hasRoles ? `
        <div class="${grp('email')}">
          <label class="fr-label" for="email">Adresse électronique${req}<span class="fr-hint-text">Identifiant de connexion, unique sur la plateforme. Destinataire du mail d'activation.</span></label>
          <input class="fr-input" type="email" id="email" placeholder="prenom.nom@exemple.fr" value="${esc(f.email)}" ${dis}>${err('email')}
        </div>
        ${rppsBlock}
        <div class="${grp('prenom')}">
          <label class="fr-label" for="prenom">Prénom${req}${locked?' <span class="readonly-note">(via RPPS)</span>':''}</label>
          <input class="fr-input" id="prenom" value="${esc(f.prenom)}" ${locked||readOnly?"readonly":""}>${err('prenom')}
        </div>
        <div class="${grp('nom')}">
          <label class="fr-label" for="nom">Nom${req}${locked?' <span class="readonly-note">(via RPPS)</span>':''}</label>
          <input class="fr-input" id="nom" value="${esc(f.nom)}" ${locked||readOnly?"readonly":""}>${err('nom')}
        </div>
        <div class="${grp('ville')}">
          <label class="fr-label" for="ville">Ville (facultatif)<span class="fr-hint-text">Commune de rattachement (Base Adresse Nationale)</span></label>
          <input class="fr-input" id="ville" list="communes-list" placeholder="Commune ou code postal…" value="${esc(f.ville)}" ${dis}>
          <datalist id="communes-list">${COMMUNES.map(c=>`<option value="${esc(c)}">`).join("")}</datalist>${err('ville')}
        </div>
        ${regionBlock}
      ` : ""}
      <div style="display:flex;gap:.5rem;margin-top:1rem;">
        ${readOnly ? "" : `<button class="fr-btn" type="submit">${editing ? "Enregistrer les modifications" : "Créer le compte"}</button>`}
        <button class="fr-btn fr-btn--secondary" type="button" data-goto-list>${readOnly ? "Retour à la liste" : "Annuler"}</button>
      </div>
      ${(!editing && !readOnly) ? `<p class="mock-note" style="margin-top:.8rem;">Démo : un email en <code>@echec-keycloak.test</code> simule un échec de création côté Keycloak.</p>` : ""}
    </form>`;

  bindCreateEvents();
}

/* Applique les règles de territoire et de tag après un changement de rôles */
function normalizeFormTerritoires(f) {
  const options = creatorTerritoires();
  const single = !isAdminCreator() && options.length === 1;
  if (!f.roles.includes("gestionnaire_compte")) f.territoiresGestion = [];
  else if (single && !f.territoiresGestion.includes(options[0])) f.territoiresGestion = [options[0], ...f.territoiresGestion];
  if (!hasRegulateur(f.roles)) f.territoireOrientation = "";
  else if (single && !f.territoireOrientation) f.territoireOrientation = options[0];   // RG-REG-02
  if (!f.roles.includes("gestionnaire_structure")) f.structures = [];
  const eligibles = tagsEligibles(f.roles).map(t => t.value);
  f.tags = f.tags.filter(t => eligibles.includes(t));                               // RG-REF-02
  if (f.regionAuto) f.region = territoireRegion(formRattachement(f)[0]);
}

function bindCreateEvents() {
  const root = el("view-create");
  const f = state.form;
  const editing = !!state.editId;
  const user = editing ? state.users.find(x => x.id === state.editId) : null;

  root.querySelectorAll("[data-goto-list]").forEach(b => b.onclick = () => { state.view="list"; state.editId=null; state.form=newForm(); render(); });

  root.querySelectorAll("[data-role]").forEach(cb => cb.onchange = () => {
    const val = cb.dataset.role;
    if (cb.checked) { if (!f.roles.includes(val)) f.roles.push(val); }
    else f.roles = f.roles.filter(r => r !== val);
    normalizeFormTerritoires(f);
    delete f.errors.roles; delete f.errors.territoiresGestion; delete f.errors.territoireOrientation; delete f.errors.rattachement;
    render();
  });
  root.querySelectorAll("[data-tag]").forEach(cb => cb.onchange = () => {
    const v = cb.dataset.tag;
    if (cb.checked) { if (!f.tags.includes(v)) f.tags.push(v); }
    else f.tags = f.tags.filter(x => x !== v);
  });

  const bind = (id, key) => { const e = root.querySelector("#"+id); if (e) e.oninput = () => { f[key] = e.value; }; };
  bind("email","email"); bind("nom","nom"); bind("prenom","prenom"); bind("ville","ville");

  const refreshRegion = () => { if (f.regionAuto) f.region = territoireRegion(formRattachement(f)[0]); };
  root.querySelectorAll("[data-gest]").forEach(cb => cb.onchange = () => {
    const v = cb.dataset.gest;
    if (cb.checked) { if (!f.territoiresGestion.includes(v)) f.territoiresGestion.push(v); }
    else f.territoiresGestion = f.territoiresGestion.filter(x => x !== v);
    delete f.errors.territoiresGestion; refreshRegion(); render();
  });
  const orient = root.querySelector("#orientation");
  if (orient) orient.onchange = () => { f.territoireOrientation = orient.value; delete f.errors.territoireOrientation; refreshRegion(); render(); };
  const regionSel = root.querySelector("#region");
  if (regionSel) regionSel.onchange = () => { f.region = regionSel.value; f.regionAuto = false; };

  // RPPS : recherche dans l'Annuaire Santé + unicité de l'identifiant national
  const rppsInput = root.querySelector("#rpps");
  if (rppsInput && !rppsInput.readOnly) rppsInput.oninput = () => { f.rpps = rppsInput.value; f.pro = null; };
  const rppsBtn = root.querySelector("#rpps-search");
  if (rppsBtn) rppsBtn.onclick = () => {
    const rpps = f.rpps.trim();
    const entry = RPPS_BY_ID[rpps];
    const owner = state.users.find(x => x.id !== state.editId && x.idNational === idNationalFromRpps(rpps));
    if (!entry) { f.pro = null; f.errors.rpps = "Aucun professionnel trouvé dans l'Annuaire Santé pour ce RPPS."; }
    else if (owner) { f.pro = null; f.errors.rpps = "Ce RPPS est déjà porté par un autre compte : un compte = un identifiant national."; }
    else { f.pro = entry; f.nom = entry.nom; f.prenom = entry.prenom; delete f.errors.rpps; delete f.errors.nom; delete f.errors.prenom; }
    render();
  };
  const rppsClear = root.querySelector("#rpps-clear");
  if (rppsClear) rppsClear.onclick = () => { f.rpps = ""; f.pro = null; render(); };

  // Structures : plusieurs, même type autorisé, sans doublon, dans le périmètre du créateur
  const typeSel = root.querySelector("#struct-type");
  if (typeSel) typeSel.onchange = () => { f.draftType = typeSel.value; render(); };
  const addBtn = root.querySelector("#struct-add-btn");
  if (addBtn) addBtn.onclick = () => {
    const inp = root.querySelector("#struct-finess");
    const m = inp.value.match(/FINESS (\d+)/);
    const entry = m ? FINESS_BY_ID[m[1]] : null;
    if (!entry || entry.type !== f.draftType) { f.errors.structures = "Choisissez une structure dans la liste."; render(); return; }
    if (!isAdminCreator() && !creatorTerritoires().includes(structureTerritoire(entry))) { f.errors.structures = "Cette structure n'est pas sur l'un de vos territoires."; render(); return; }
    if (f.structures.some(s => s.finess === entry.finess)) { f.errors.structures = "Cette structure est déjà rattachée à cet utilisateur."; render(); return; }
    f.structures.push({ type: entry.type, finess: entry.finess, nom: entry.nom, ville: entry.ville });
    delete f.errors.structures; delete f.errors.rattachement;
    if (!f.ville.trim() && entry.ville) f.ville = entry.ville;
    refreshRegion();
    render();
  };
  root.querySelectorAll("[data-struct-remove]").forEach(b => b.onclick = () => {
    f.structures.splice(Number(b.dataset.structRemove), 1); refreshRegion(); render();
  });

  // Actions de la page de modification (section 8)
  if (user) {
    const resend = root.querySelector("#act-resend");
    if (resend) resend.onclick = () => showModal({
      title: "Renvoyer le mail de bienvenue",
      bodyHtml: `<p>Un nouveau mail va être envoyé à&nbsp;: <strong>${esc(user.email)}</strong>.</p>
                 <p>Il propose deux options : créer un mot de passe ou se connecter avec Pro Santé Connect.</p>
                 <p class="mock-note">Maquette&nbsp;: aucun mail n'est réellement envoyé.</p>`,
      confirmLabel: "Envoyer",
      onConfirm: () => { logAction("Renvoi du mail de bienvenue", user, true); showToast(`Mail de bienvenue renvoyé à ${user.email}.`); },
    });
    const toggle = root.querySelector("#act-toggle");
    if (toggle) toggle.onclick = () => showModal({
      title: user.actif ? "Désactiver le compte" : "Activer le compte",
      bodyHtml: `<p>${user.actif ? "Le compte passera au statut <strong>Inactif</strong> : l'utilisateur ne pourra plus se connecter."
                                 : "Le compte sera réactivé."}</p>`,
      confirmLabel: user.actif ? "Désactiver" : "Activer",
      onConfirm: () => {
        user.actif = !user.actif;
        user.updated_at = new Date().toISOString(); user.updatedBy = currentActor();
        saveUsers();
        logAction(user.actif ? "Activation du compte" : "Désactivation du compte", user, true);
        const sync = isRegulateur(user) ? syncInterop(user, "modification") : "";
        showToast(`Compte ${user.actif ? "activé" : "désactivé"}.${sync ? " " + sync : ""}`);
        render();
      },
    });
    const del = root.querySelector("#act-delete");
    if (del) del.onclick = () => showModal({
      title: "Supprimer le compte",
      bodyHtml: `<p>Le compte de <strong>${esc(user.prenom)} ${esc(user.nom)}</strong> (${esc(user.email)}) sera supprimé définitivement et n'apparaîtra plus dans la liste.</p>
                 ${isRegulateur(user) ? "<p>La suppression sera synchronisée avec les éditeurs via l'API Interop.</p>" : ""}`,
      confirmLabel: "Supprimer",
      onConfirm: () => {
        state.users = state.users.filter(x => x.id !== user.id);
        saveUsers();
        logAction("Suppression du compte", user, true);
        const sync = isRegulateur(user) ? syncInterop(user, "suppression") : "";
        state.view = "list"; state.editId = null; state.form = newForm();
        render();
        showToast(`Compte de ${user.prenom} ${user.nom} supprimé.${sync ? " " + sync : ""}`);
      },
    });
  }

  const form = root.querySelector("#create-form");
  if (form) form.onsubmit = (e) => { e.preventDefault(); if (acWrite()) submitForm(); };
}

function submitForm() {
  const f = state.form;
  const editing = !!state.editId;
  const before = editing ? state.users.find(x => x.id === state.editId) : null;
  const isGC = f.roles.includes("gestionnaire_compte");
  const isStructure = f.roles.includes("gestionnaire_structure");
  const isRegul = hasRegulateur(f.roles);
  const options = creatorTerritoires();
  const keptOut = (t) => !options.includes(t) && before && userTerritoires(before).includes(t);  // valeur existante hors périmètre
  const errors = {};
  f.success = null; f.failure = null;

  // Rôle obligatoire, attribuable par le créateur, OSNP + IOA non cumulables
  if (!f.roles.length) errors.roles = "Sélectionnez au moins un rôle.";
  const forbidden = f.roles.filter(r => !creatableRoles().some(x => x.value === r));
  if (forbidden.some(r => !rolesOf(before || {}).includes(r))) errors.roles = "Vous ne pouvez pas attribuer le rôle " + ROLE_LABEL[forbidden[0]] + ".";
  if (REGULATEUR_ROLES.every(r => f.roles.includes(r))) errors.roles = "Régulateur OSNP et Régulateur IOA ne peuvent pas être attribués au même compte.";

  // Email obligatoire et unique : un email déjà présent dans Keycloak bloque la création
  const email = f.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Adresse électronique invalide.";
  else if (state.users.some(x => x.id !== state.editId && x.email.toLowerCase() === email.toLowerCase()))
    errors.email = editing ? "Cette adresse est déjà utilisée par un autre compte." : "Cet email existe déjà dans Keycloak : la création est bloquée.";

  if (!f.nom.trim()) errors.nom = "Nom requis.";
  if (!f.prenom.trim()) errors.prenom = "Prénom requis.";

  // RPPS facultatif : s'il est saisi, il doit avoir été vérifié et être unique
  if (f.rpps.trim() && !f.pro) errors.rpps = "Lancez la recherche : le RPPS doit exister dans l'Annuaire Santé.";
  if (f.pro && state.users.some(x => x.id !== state.editId && x.idNational === idNationalFromRpps(f.rpps.trim())))
    errors.rpps = "Ce RPPS est déjà porté par un autre compte : un compte = un identifiant national.";

  // Territoires : gestion (GC), structures (GS), orientation (régulateur)
  if (isGC && f.territoiresGestion.length === 0) errors.territoiresGestion = "Au moins un territoire de gestion est requis.";
  if (f.territoiresGestion.some(t => !options.includes(t) && !keptOut(t))) errors.territoiresGestion = "Vous ne pouvez attribuer que vos territoires.";
  if (isStructure && f.structures.length === 0) errors.structures = "Ajoutez au moins une structure.";
  if (isRegul && !f.territoireOrientation) errors.territoireOrientation = "Le territoire d'orientation est requis (un seul).";
  if (isRegul && f.territoireOrientation && !options.includes(f.territoireOrientation) && !keptOut(f.territoireOrientation))
    errors.territoireOrientation = "Le territoire d'orientation doit être l'un de vos territoires.";
  // Un Gestionnaire de comptes doit garder le compte dans son périmètre (sinon il le perdrait de vue)
  const ratt = formRattachement(f);
  if (!isAdminCreator() && f.roles.length && !ratt.some(t => options.includes(t)))
    errors.rattachement = "Le compte doit être rattaché à au moins un de vos territoires.";
  f.errors = errors;
  if (Object.keys(errors).length) { render(); return; }

  const base = {
    email, nom: f.nom.trim(), prenom: f.prenom.trim(),
    roles: [...f.roles], tags: [...f.tags], ville: f.ville.trim(),
    territoiresGestion: isGC ? [...f.territoiresGestion] : [],
    territoireOrientation: isRegul ? f.territoireOrientation : "",
    territoire: ratt[0] || "",
    region: ratt.length ? (f.region || territoireRegion(ratt[0])) : "",
  };
  if (f.pro) { base.rpps = f.rpps.trim(); base.profession = f.pro.profession; base.specialite = f.pro.specialite; base.idNational = idNationalFromRpps(base.rpps); }
  if (isStructure) base.structures = f.structures.map(s => ({ type: s.type, finess: s.finess, nom: s.nom, ville: s.ville }));

  // Simulation d'un échec Keycloak (création uniquement) — RG-POST-06
  const ko = !editing ? keycloakFailure(email) : null;
  if (ko) {
    logAction("Création du compte", base, false, ko);
    f.failure = ko;
    render(); window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  let saved;
  let wasRegulateur = false;
  if (editing) {
    const u = before;
    wasRegulateur = isRegulateur(u);
    delete u.rpps; delete u.profession; delete u.specialite; delete u.structures;
    if (!base.idNational && /^8\d{11}$/.test(u.idNational || "")) base.idNational = "SASN-" + Date.now().toString().slice(-6);
    Object.assign(u, base, { updated_at: new Date().toISOString(), updatedBy: currentActor() });
    saved = u;
    logAction("Modification du compte", saved, true, `Rattachement : ${ratt.join(", ") || "aucun"}${base.territoireOrientation ? " · orientation : " + base.territoireOrientation : ""}`);
  } else {
    // Nouveau compte : créé dans Keycloak, statut « En attente de première connexion »
    saved = { id: "u-" + Math.random().toString(36).slice(2, 8), actif: true,
              idNational: base.idNational || ("SASN-" + Date.now().toString().slice(-6)),
              created_at: new Date().toISOString(), createdBy: currentActor(),
              derniereConnexion: null, modeConnexion: null, ...base };
    state.users.unshift(saved);
    logAction("Création du compte", saved, true, `Compte créé dans Keycloak ; mail d'activation envoyé ; rattachement : ${ratt.join(", ") || "aucun"}`);
  }
  saveUsers();
  const sync = (isRegulateur(saved) || wasRegulateur) ? syncInterop(saved, editing ? "modification" : "création") : "";

  const mode2 = editing ? "edit" : "create";
  if (editing) {
    state.form = formFromUser(saved);   // on reste sur la page de modification du compte
  } else {
    state.editId = null;
    state.form = newForm();
  }
  state.form.success = { prenom: saved.prenom, nom: saved.nom, email: saved.email, mode: mode2, sync };
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================================================================ *
 *  VUE JOURNAL DES ACTIONS (RG-POST-07)
 * ================================================================ */
function renderJournal() {
  const rows = state.journal;
  el("view-journal").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Journal des actions</h1>
    <p class="page-sub">Toute action sur un compte est tracée, qu'elle réussisse ou échoue : création, modification, activation, désactivation, renvoi du mail, suppression, synchronisation Interop, export.</p>
    ${rows.length ? `
    <div class="journal-table-wrap"><table class="journal-table">
      <thead><tr><th>Date</th><th>Action</th><th>Résultat</th><th>Compte</th><th>Auteur</th><th>Détail</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${esc(new Date(r.at).toLocaleString("fr-FR"))}</td>
        <td>${esc(r.action)}</td>
        <td><span class="fr-badge fr-badge--sm ${r.ok ? "badge-statut-actif" : "badge-log-ko"}">${r.ok ? "Succès" : "Échec"}</span></td>
        <td>${esc(r.cible || "—")}</td>
        <td>${esc(r.auteur)}</td>
        <td>${esc(r.detail || "")}</td>
      </tr>`).join("")}</tbody>
    </table></div>` : `<p class="mock-note" style="padding:1rem 0;">Aucune action enregistrée pour l'instant. Créez, modifiez ou supprimez un compte pour alimenter le journal.</p>`}`;
}

/* ================================================================ *
 *  VUE TERRITOIRES SAS (CRUD)
 * ================================================================ */
function usersInTerritoire(code) { return state.users.filter(u => userTerritoires(u).includes(code)).length; }

function renderTerritoires() {
  const t = state.terr;
  const rows = state.territoires.map(x => {
    const n = usersInTerritoire(x.code);
    const deps = (x.departements || []).join(", ") || esc(x.dep);
    const multi = (x.departements || []).length > 1;
    const insee = x.insee || [];
    return `<tr>
      <td><strong>${esc(x.code)}</strong></td>
      <td>${esc(deps)} ${multi ? `<span class="fr-badge fr-badge--sm badge-role" style="background:#e3e3fd;color:#000091;">multi-départements</span>` : ""}</td>
      <td>${insee.length ? `<span class="terr-insee" title="${esc(insee.join(', '))}">${esc(insee.slice(0,3).join(', '))}${insee.length>3?` +${insee.length-3}`:""}</span>` : `<span class="mock-note">—</span>`}</td>
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
            <label class="fr-label" for="terr-num">N° du territoire <span style="color:#ce0500">*</span></label>
            <input class="fr-input" id="terr-num" inputmode="text" placeholder="Ex : 75, 2A, 20" value="${esc(t.num)}">
          </div>
          <div class="fr-input-group" style="flex:1 1 260px;">
            <label class="fr-label" for="terr-dep">Département(s) <span style="color:#ce0500">*</span>
              <span class="fr-hint-text">Un ou plusieurs, séparés par des virgules</span></label>
            <input class="fr-input" id="terr-dep" placeholder="Ex : Corse-du-Sud, Haute-Corse" value="${esc(t.dep)}">
          </div>
        </div>
        <div class="fr-input-group">
          <label class="fr-label" for="terr-insee">Codes INSEE des communes
            <span class="fr-hint-text">Liste séparée par des virgules (ex : 75056, 92012)</span></label>
          <input class="fr-input" id="terr-insee" placeholder="Ex : 2A004, 2B033" value="${esc(t.insee)}">
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
        <p class="page-sub">Référentiel des territoires — un territoire peut couvrir plusieurs départements et porte une liste de codes INSEE.</p>
      </div>
      ${(t || !acWrite()) ? "" : `<button class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-user-add-line" id="terr-add">Ajouter un territoire</button>`}
    </div>
    ${formHtml}
    <table class="terr-table">
      <thead><tr><th>Code</th><th>Département(s)</th><th>Codes INSEE</th><th>Utilisateurs</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  bindTerritoiresEvents();
}

function bindTerritoiresEvents() {
  const root = el("view-territoires");
  const add = root.querySelector("#terr-add");
  if (add) add.onclick = () => { state.terr = { mode:"create", code:null, num:"", dep:"", insee:"", error:"" }; render(); };

  root.querySelectorAll("[data-terr-edit]").forEach(b => b.onclick = () => {
    const x = state.territoires.find(v => v.code === b.dataset.terrEdit);
    if (x) { state.terr = { mode:"edit", code:x.code, num:x.code.replace(/^SAS-/,""),
                            dep:(x.departements||[]).join(", "), insee:(x.insee||[]).join(", "), error:"" }; render(); }
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
    const insI = root.querySelector("#terr-insee");
    numI.oninput = () => { t.num = numI.value; root.querySelector(".terr-code-preview").textContent = "Code du territoire : SAS-" + (t.num.trim() || "…"); };
    depI.oninput = () => { t.dep = depI.value; };
    if (insI) insI.oninput = () => { t.insee = insI.value; };
    root.querySelector("#terr-cancel").onclick = () => { state.terr = null; render(); };
    root.querySelector("#terr-save").onclick = () => saveTerritoireForm();
  }
}

function saveTerritoireForm() {
  const t = state.terr;
  const num = t.num.trim().toUpperCase();
  const departements = t.dep.split(",").map(s => s.trim()).filter(Boolean);
  const insee = (t.insee || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!num || !departements.length) { t.error = "Renseignez le numéro et au moins un département."; render(); return; }
  const code = "SAS-" + num;
  const clash = state.territoires.find(x => x.code === code && code !== t.code);
  if (clash) { t.error = `Le territoire ${code} existe déjà.`; render(); return; }

  if (t.mode === "edit") {
    const x = state.territoires.find(v => v.code === t.code);
    const oldCode = x.code;
    x.code = code; x.departements = departements; x.insee = insee; x.dep = departements.join(", ");
    // Répercuter le changement de code sur les utilisateurs rattachés
    if (oldCode !== code) state.users.forEach(u => {
      u.territoiresGestion = (u.territoiresGestion || []).map(t => t === oldCode ? code : t);
      if (u.territoireOrientation === oldCode) u.territoireOrientation = code;
      u.territoire = userTerritoires(u)[0] || "";
    });
    saveUsers();
  } else {
    state.territoires.push({ code, departements, insee, dep: departements.join(", ") });
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
  return state.departements.filter(d => (d.territory || []).some(t => acTerrs().includes(t.name)));
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
    <p class="page-sub">${isAdmin ? "Tous les territoires SAS." : "Territoire(s) <strong>"+esc(acTerrs().join(", "))+"</strong>."} ${acWrite() ? "Paramétrez les rayons de recherche par défaut." : "Consultation en lecture seule."}</p>
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
  if (acRole() === "administrateur") return cat.territories;
  return cat.territories.filter(x => acTerrs().includes(supTerrToken(x.territory)));
}
function supKey(catKey, territory) { return catKey + "||" + territory; }
function supEntry(catKey, territory) {
  const cat = state.support.find(c => c.reorientation_key === catKey);
  return cat ? cat.territories.find(x => x.territory === territory) : null;
}
function supClean(arr) { return (arr || []).map(s => String(s).trim()).filter(Boolean); }

/* Copie de travail (tableau d'emails) — depuis les modifications en attente, sinon l'entrée */
function supWorking(catKey, territory) {
  const k = supKey(catKey, territory);
  if (k in state.supEdits) return state.supEdits[k];
  const e = supEntry(catKey, territory);
  return e ? e.emails.slice() : [];
}
function supEnsureEdit(catKey, territory) {
  const k = supKey(catKey, territory);
  if (!(k in state.supEdits)) { const e = supEntry(catKey, territory); state.supEdits[k] = e ? e.emails.slice() : []; }
  return state.supEdits[k];
}
function supIsDirty(catKey, territory) {
  const k = supKey(catKey, territory);
  if (!(k in state.supEdits)) return false;
  const e = supEntry(catKey, territory);
  return JSON.stringify(supClean(state.supEdits[k])) !== JSON.stringify((e ? e.emails : []));
}
function supDirtyKeys() {
  return Object.keys(state.supEdits).filter(k => { const [c, t] = k.split("||"); return supIsDirty(c, t); });
}
function supEditCount() { return supDirtyKeys().length; }

function supVisibleTerritoryNames() { return supVisibleTerritories(state.support[0]).map(e => e.territory); }
function supFilteredTerritories() {
  const q = state.supFilter.trim().toLowerCase();
  let names = supVisibleTerritoryNames();
  if (q) names = names.filter(tn => tn.toLowerCase().includes(q));
  return names;
}

/* Contenu d'une cellule : un champ input par email + suppression + ajout */
function supCellHtml(catKey, territory) {
  const emails = supWorking(catKey, territory);
  if (!acWrite()) {
    return emails.length ? emails.map(e => `<div class="sup-email-ro">${esc(e)}</div>`).join("") : `<span class="mock-note">—</span>`;
  }
  const rows = emails.map((em, i) => `
    <div class="sup-email-row">
      <input class="fr-input sup-email-input" value="${esc(em)}" data-ei="${i}" placeholder="email@ex.fr">
      <button type="button" class="sup-email-del" data-ei="${i}" title="Supprimer cet email" aria-label="Supprimer cet email">&times;</button>
    </div>`).join("");
  return `${rows}<button type="button" class="sup-email-add">+ Ajouter un email</button>`;
}
function supRowsHtml(names) {
  if (!names.length) return `<tr><td colspan="${state.support.length + 1}" style="padding:1rem;color:#666;">Aucun territoire.</td></tr>`;
  return names.map((tn, ti) => `<tr>
    <td class="terr">${esc(tn)}</td>
    ${state.support.map((cat, ci) => `<td id="sc-${ci}-${ti}" class="sup-td ${supIsDirty(cat.reorientation_key, tn) ? "changed" : ""}">${supCellHtml(cat.reorientation_key, tn)}</td>`).join("")}
  </tr>`).join("");
}

function renderSupBody() {
  const names = supFilteredTerritories();
  state._supNames = names;
  const body = el("sup-body");
  if (body) body.innerHTML = supRowsHtml(names);
  const cnt = el("sup-count"); if (cnt) cnt.textContent = `${names.length} territoire${names.length > 1 ? "s" : ""}`;
  names.forEach((tn, ti) => state.support.forEach((cat, ci) => { const td = el(`sc-${ci}-${ti}`); if (td) bindSupTd(td, ci, ti); }));
  supUpdateSaveBar();
}

function renderSupport() {
  const isAdmin = acRole() === "administrateur";

  el("view-support").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">Gestion Support</h1>
        <p class="page-sub">${isAdmin ? "Tous les territoires." : "Territoire(s) <strong>"+esc(acTerrs().join(", "))+"</strong>."}
          Mails de réorientation — tous les supports en colonnes. Un email par champ (ajout / suppression). Toute modification déclenche une notification de changement.</p>
      </div>
      ${isAdmin ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        ${acWrite() ? `<button class="fr-btn fr-btn--sm fr-btn--secondary" id="sup-import-btn">Importer un JSON</button>
        <input type="file" id="sup-import-file" accept="application/json,.json" hidden>` : ""}
        <button class="fr-btn fr-btn--sm fr-btn--secondary" id="sup-export-btn">Télécharger le JSON</button>
      </div>` : ""}
    </div>
    ${acWrite() ? `<div class="save-bar">
      <button class="fr-btn fr-btn--sm" id="sup-save" disabled>Enregistrer</button>
      <span class="mock-note" id="sup-pending">Aucune modification</span>
    </div>` : ""}
    <div class="fr-input-group" style="max-width:340px;margin:.25rem 0;">
      <label class="fr-label" for="sup-q">Filtrer par SAS (territoire)</label>
      <input class="fr-input" type="search" id="sup-q" placeholder="Ex : SAS-75, Paris…" value="${esc(state.supFilter)}">
    </div>
    <p class="result-count" id="sup-count"></p>
    <div class="sup-wrap">
      <table class="sup-table sup-table--matrix">
        <thead><tr>
          <th>Territoire (SAS)</th>
          ${state.support.map(c => `<th>${esc(c.reorientation_name)}</th>`).join("")}
        </tr></thead>
        <tbody id="sup-body"></tbody>
      </table>
    </div>`;

  renderSupBody();
  bindSupportEvents();
}

function supUpdateSaveBar() {
  const n = supEditCount();
  const btn = el("sup-save"); if (btn) btn.disabled = n === 0;
  const info = el("sup-pending"); if (info) info.textContent = n ? `${n} modification${n > 1 ? "s" : ""} en attente` : "Aucune modification";
}

function renderSupCellInto(ci, ti) {
  const td = el(`sc-${ci}-${ti}`);
  if (!td) return;
  const catKey = state.support[ci].reorientation_key;
  const territory = state._supNames[ti];
  td.className = "sup-td" + (supIsDirty(catKey, territory) ? " changed" : "");
  td.innerHTML = supCellHtml(catKey, territory);
  bindSupTd(td, ci, ti);
}
function bindSupTd(td, ci, ti) {
  const catKey = state.support[ci].reorientation_key;
  const territory = state._supNames[ti];
  td.querySelectorAll(".sup-email-input").forEach(inp => inp.oninput = () => {
    const arr = supEnsureEdit(catKey, territory);
    arr[Number(inp.dataset.ei)] = inp.value;
    td.classList.toggle("changed", supIsDirty(catKey, territory));
    supUpdateSaveBar();
  });
  td.querySelectorAll(".sup-email-del").forEach(b => b.onclick = () => {
    const arr = supEnsureEdit(catKey, territory);
    arr.splice(Number(b.dataset.ei), 1);
    renderSupCellInto(ci, ti);
    supUpdateSaveBar();
  });
  const add = td.querySelector(".sup-email-add");
  if (add) add.onclick = () => {
    const arr = supEnsureEdit(catKey, territory);
    arr.push("");
    renderSupCellInto(ci, ti);
    supUpdateSaveBar();
    const inputs = td.querySelectorAll(".sup-email-input");
    if (inputs.length) inputs[inputs.length - 1].focus();
  };
}

/* Export JSON (format de référence : [{reorientation_key, reorientation_name, territories:[{territory, emails}]}]) */
function supExportJson() {
  const data = state.support.map(c => ({
    reorientation_key: c.reorientation_key,
    reorientation_name: c.reorientation_name,
    territories: c.territories.map(t => ({ territory: t.territory, emails: t.emails.slice() })),
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "support-reorientations.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Fichier JSON téléchargé.");
}
function supValidateJson(data) {
  if (!Array.isArray(data)) return "le fichier doit contenir un tableau de catégories.";
  for (const c of data) {
    if (!c || typeof c.reorientation_key !== "string" || typeof c.reorientation_name !== "string" || !Array.isArray(c.territories))
      return "chaque catégorie doit avoir reorientation_key, reorientation_name et territories.";
    for (const t of c.territories) {
      if (!t || typeof t.territory !== "string" || !Array.isArray(t.emails)) return "chaque territoire doit avoir territory et un tableau emails.";
      if (!t.emails.every(e => typeof e === "string")) return "les emails doivent être des chaînes de caractères.";
    }
  }
  return null;
}
function supImportJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); } catch (e) { showToast("JSON invalide : " + e.message); return; }
    const err = supValidateJson(data);
    if (err) { showToast("Format invalide : " + err); return; }
    const nCat = data.length, nTerr = data.reduce((n, c) => n + c.territories.length, 0);
    showModal({
      title: "Importer le fichier JSON",
      bodyHtml: `<p class="fr-text--sm">Remplacer l'intégralité des mails de réorientation par le contenu du fichier ?</p>
                 <p class="mock-note">${nCat} catégorie${nCat > 1 ? "s" : ""} · ${nTerr} entrées territoire. Les modifications non enregistrées seront perdues.</p>`,
      confirmLabel: "Importer",
      onConfirm: () => {
        state.support = data.map(c => ({
          reorientation_key: c.reorientation_key, reorientation_name: c.reorientation_name,
          territories: c.territories.map(t => ({ territory: t.territory, emails: t.emails.slice() })),
        }));
        state.supEdits = {};
        saveSupport();
        render();
        showToast(`Import réalisé — ${nCat} catégorie${nCat > 1 ? "s" : ""}, ${nTerr} territoires.`);
      },
    });
  };
  reader.readAsText(file, "utf-8");
}

function bindSupportEvents() {
  const root = el("view-support");
  root.querySelector("#sup-q").oninput = (e) => { state.supFilter = e.target.value; renderSupBody(); };

  const importBtn = root.querySelector("#sup-import-btn");
  const importFile = root.querySelector("#sup-import-file");
  if (importBtn && importFile) {
    importBtn.onclick = () => importFile.click();
    importFile.onchange = () => { if (importFile.files && importFile.files[0]) supImportJson(importFile.files[0]); importFile.value = ""; };
  }
  const exportBtn = root.querySelector("#sup-export-btn");
  if (exportBtn) exportBtn.onclick = () => supExportJson();

  const supSaveBtn = root.querySelector("#sup-save");
  if (supSaveBtn) supSaveBtn.onclick = () => {
    const keys = supDirtyKeys();
    const items = [];
    const notified = new Set();
    keys.forEach(k => {
      const [catKey, territory] = k.split("||");
      const cat = state.support.find(c => c.reorientation_key === catKey);
      const entry = cat.territories.find(x => x.territory === territory);
      notified.add(territory);
      items.push(`<li><strong>${esc(cat.reorientation_name)} — ${esc(territory)}</strong><br><span class="old">${esc(entry.emails.join(", ") || "—")}</span> → <span class="new">${esc(supClean(state.supEdits[k]).join(", ") || "—")}</span></li>`);
    });
    showModal({
      title: "Confirmer l'enregistrement",
      bodyHtml: `<p class="fr-text--sm">Les mails suivants vont être enregistrés :</p>
                 <ul class="modal-changes">${items.join("")}</ul>
                 <p class="fr-text--sm" style="margin-top:.5rem;"><strong>Notification de changement</strong> envoyée aux référents de ${notified.size} territoire${notified.size > 1 ? "s" : ""}.</p>`,
      confirmLabel: "Enregistrer & notifier",
      onConfirm: () => {
        keys.forEach(k => {
          const [catKey, territory] = k.split("||");
          const cat = state.support.find(c => c.reorientation_key === catKey);
          const entry = cat.territories.find(x => x.territory === territory);
          entry.emails = supClean(state.supEdits[k]);
        });
        const count = notified.size;
        state.supEdits = {};
        saveSupport();
        render();
        showToast(`Modifications enregistrées — notification de changement envoyée (${count} territoire${count > 1 ? "s" : ""}).`);
      },
    });
  };
}

/* ================================================================ *
 *  VUE STATISTIQUES (nb par rôle / structure / profession)
 * ================================================================ */
function statScopeUsers() {
  const base = visibleUsers();                      // admins : tous · gestionnaire : son territoire
  if (acRole() !== "administrateur") return base;   // gestionnaire de compte : périmètre déjà limité
  const s = state.stat;
  if (s.level === "territoire" && s.territoire) return base.filter(u => userTerritoires(u).includes(s.territoire));
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
  if (!isAdmin) scopeLabel = "Territoire(s) " + acTerrs().join(", ");
  else if (s.level === "region" && s.region) scopeLabel = "Région " + s.region;
  else if (s.level === "territoire" && s.territoire) scopeLabel = "Territoire " + s.territoire;

  // KPI statut
  const actifs   = users.filter(u => statutEtat(u).key === "actif").length;
  const inactifs = users.filter(u => statutEtat(u).key === "inactif").length;
  const aucune   = users.filter(u => statutEtat(u).key === "attente").length;

  // Répartitions
  const byRole = statCountBy(users, u => displayRoles(u));
  const byStructType = statCountBy(users, u => [...new Set(structuresOf(u).map(x => x.type))]); // gestionnaires par type de structure
  const byMode = statCountBy(users, u => u.modeConnexion || "aucun");

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
    </div>` : `<p class="mock-note">Périmètre : comptes partageant au moins un de vos territoires (<strong>${esc(acTerrs().join(", "))}</strong>).</p>`;

  el("view-statistiques").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Statistiques</h1>
    <p class="page-sub">Répartition des comptes — ${esc(scopeLabel)}.</p>
    ${scopeControls}

    <div class="stat-kpis">
      <div class="stat-kpi"><span class="stat-kpi__n">${total}</span><span class="stat-kpi__l">Comptes</span></div>
      <div class="stat-kpi stat-kpi--ok"><span class="stat-kpi__n">${actifs}</span><span class="stat-kpi__l">Actifs</span></div>
      <div class="stat-kpi"><span class="stat-kpi__n">${inactifs}</span><span class="stat-kpi__l">Inactifs</span></div>
      <div class="stat-kpi stat-kpi--warn"><span class="stat-kpi__n">${aucune}</span><span class="stat-kpi__l">En attente de première connexion</span></div>
    </div>

    <div class="stat-grid">
      ${statBlock("Comptes par rôle", byRole, total, k => ROLE_LABEL[k] || k)}
      ${statBlock("Gestionnaires par type de structure", byStructType, total, k => STRUCTURE_LABEL[k] || k)}
      ${statBlock("Comptes par mode de connexion", byMode, total, k => k === "aucun" ? "Non choisi (jamais connecté)" : modeConnexionLabel(k))}
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
 *  VUE BANDEAUX D'INFORMATION (national + par territoire)
 * ================================================================ */
function banKey(scope, audience) { return scope + "||" + audience; }
function bandeauOf(scope, audience) { return state.bandeaux.find(x => x.scope === scope && x.audience === audience) || null; }
function banDefault(field) { return field === "active" ? false : ""; }
function banField(scope, audience, field) {
  const k = banKey(scope, audience);
  if (state.banEdits[k] && field in state.banEdits[k]) return state.banEdits[k][field];
  const b = bandeauOf(scope, audience);
  return b ? b[field] : banDefault(field);
}
function banSetEdit(scope, audience, field, val) {
  const k = banKey(scope, audience);
  const b = bandeauOf(scope, audience);
  const orig = b ? b[field] : banDefault(field);
  state.banEdits[k] = state.banEdits[k] || {};
  if (val === orig) { delete state.banEdits[k][field]; if (!Object.keys(state.banEdits[k]).length) delete state.banEdits[k]; }
  else state.banEdits[k][field] = val;
}
function banEditCount() { let n = 0; for (const k in state.banEdits) n += Object.keys(state.banEdits[k]).length; return n; }
function banScopesForIdentity() {
  if (acRole() === "administrateur") return ["national", ...state.territoires.map(t => t.code)];
  return ["national", ...acTerrs()];    // gestionnaire de comptes : national (lecture) + ses territoires
}
/* Audiences visibles : le gestionnaire de compte n'a pas accès au bandeau
   « non connecté » (réservé à l'administrateur). */
function banAudiencesForIdentity() {
  if (acRole() === "administrateur") return BANDEAU_AUDIENCES;
  return BANDEAU_AUDIENCES.filter(a => a.key === "connecte");
}
function banCanEdit(scope) {
  if (!acWrite()) return false;
  if (acRole() === "administrateur") return true;
  return acTerrs().includes(scope);    // gestionnaire : uniquement ses territoires (national en lecture)
}
function banScopeLabel(scope) {
  if (scope === "national") return "National (tous les territoires)";
  const t = state.territoires.find(x => x.code === scope);
  return t ? `${t.code} · ${t.dep}` : scope;
}
function fmtBanRange(start, end) {
  if (!start && !end) return "Aucune plage d'affichage définie";
  return `Du ${start ? fmtDateTime(start) : "…"} au ${end ? fmtDateTime(end) : "…"}`;
}

function banCard(scope, audience) {
  const aud = BANDEAU_AUDIENCES.find(a => a.key === audience);
  const editable = banCanEdit(scope);
  const active = banField(scope, audience, "active");
  const title = banField(scope, audience, "title");
  const message = banField(scope, audience, "message");
  const start = banField(scope, audience, "start");
  const end = banField(scope, audience, "end");
  const dis = editable ? "" : "disabled";
  const ro = editable ? "" : "readonly";
  return `
    <section class="ban-card ${active ? "is-active" : ""}">
      <div class="ban-card__head">
        <span class="ban-card__aud">${esc(aud.label)}</span>
        <label class="ban-toggle">
          <input type="checkbox" data-ban-field="active" data-ban-scope="${esc(scope)}" data-ban-aud="${audience}" ${active ? "checked" : ""} ${dis}>
          <span>${active ? "Actif" : "Inactif"}</span>
        </label>
      </div>
      <div class="fr-input-group">
        <label class="fr-label" for="ban-title-${audience}">Titre</label>
        <input class="fr-input" id="ban-title-${audience}" value="${esc(title)}" data-ban-field="title" data-ban-scope="${esc(scope)}" data-ban-aud="${audience}" ${ro} placeholder="Titre du bandeau">
      </div>
      <div class="fr-input-group">
        <label class="fr-label" for="ban-msg-${audience}">Message</label>
        <textarea class="fr-input" id="ban-msg-${audience}" rows="3" data-ban-field="message" data-ban-scope="${esc(scope)}" data-ban-aud="${audience}" ${ro} placeholder="Contenu affiché à l'utilisateur">${esc(message)}</textarea>
      </div>
      <div class="fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-6"><div class="fr-input-group">
          <label class="fr-label" for="ban-start-${audience}">Début d'affichage</label>
          <input class="fr-input" type="datetime-local" id="ban-start-${audience}" value="${esc(start)}" data-ban-field="start" data-ban-scope="${esc(scope)}" data-ban-aud="${audience}" ${ro}>
        </div></div>
        <div class="fr-col-6"><div class="fr-input-group">
          <label class="fr-label" for="ban-end-${audience}">Fin d'affichage</label>
          <input class="fr-input" type="datetime-local" id="ban-end-${audience}" value="${esc(end)}" data-ban-field="end" data-ban-scope="${esc(scope)}" data-ban-aud="${audience}" ${ro}>
        </div></div>
      </div>
      <p class="ban-range mock-note">${esc(fmtBanRange(start, end))}</p>
    </section>`;
}

function renderBandeaux() {
  const scopes = banScopesForIdentity();
  if (!scopes.includes(state.banScope)) state.banScope = scopes[0];
  const scope = state.banScope;
  const editable = banCanEdit(scope);
  const n = banEditCount();
  const isAdmin = acRole() === "administrateur";

  el("view-bandeaux").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Bandeaux d'information</h1>
    <p class="page-sub">Deux bandeaux par périmètre : utilisateur connecté et page de connexion. Éditables au national et par territoire, avec plage d'affichage.
      ${editable ? "" : "Périmètre en lecture seule."}</p>

    <div class="filters" style="margin-bottom:.5rem;">
      <div class="f-field" style="min-width:280px;">
        <label class="fr-label" for="ban-scope">Périmètre</label>
        <select class="fr-select" id="ban-scope">
          ${scopes.map(s => `<option value="${esc(s)}" ${s === scope ? "selected" : ""}>${esc(banScopeLabel(s))}</option>`).join("")}
        </select>
      </div>
    </div>

    ${editable ? `<div class="save-bar">
      <button class="fr-btn fr-btn--sm" id="ban-save" ${n ? "" : "disabled"}>Enregistrer</button>
      <span class="mock-note" id="ban-pending">${n ? `${n} modification${n > 1 ? "s" : ""} en attente` : "Aucune modification"}</span>
    </div>` : (isAdmin ? "" : `<p class="mock-note">Le périmètre « National » est géré au niveau central ; vous pouvez éditer le bandeau de votre territoire.</p>`)}

    <div class="ban-grid">
      ${banAudiencesForIdentity().map(a => banCard(scope, a.key)).join("")}
    </div>`;

  bindBandeauxEvents();
}

function banUpdateSaveBar() {
  const n = banEditCount();
  const btn = el("ban-save"); if (btn) btn.disabled = n === 0;
  const info = el("ban-pending"); if (info) info.textContent = n ? `${n} modification${n > 1 ? "s" : ""} en attente` : "Aucune modification";
}
function bindBandeauxEvents() {
  const root = el("view-bandeaux");
  const sel = root.querySelector("#ban-scope");
  if (sel) sel.onchange = () => { state.banScope = sel.value; render(); };

  root.querySelectorAll("[data-ban-field]").forEach(inp => {
    const handler = () => {
      const val = inp.type === "checkbox" ? inp.checked : inp.value;
      banSetEdit(inp.dataset.banScope, inp.dataset.banAud, inp.dataset.banField, val);
      if (inp.dataset.banField === "active") render(); else banUpdateSaveBar();
    };
    if (inp.type === "checkbox") inp.onchange = handler; else inp.oninput = handler;
  });

  const saveBtn = root.querySelector("#ban-save");
  if (saveBtn) saveBtn.onclick = () => {
    const items = [];
    for (const k in state.banEdits) {
      const [scope, audience] = k.split("||");
      const aud = BANDEAU_AUDIENCES.find(a => a.key === audience);
      items.push(`<li><strong>${esc(banScopeLabel(scope))} — ${esc(aud.label)}</strong> : ${Object.keys(state.banEdits[k]).map(f => ({active:"statut",title:"titre",message:"message",start:"début",end:"fin"}[f] || f)).join(", ")}</li>`);
    }
    showModal({
      title: "Publier les bandeaux",
      bodyHtml: `<p class="fr-text--sm">Les bandeaux suivants vont être mis à jour :</p><ul class="modal-changes">${items.join("")}</ul>`,
      confirmLabel: "Publier",
      onConfirm: () => {
        for (const k in state.banEdits) {
          const [scope, audience] = k.split("||");
          let b = bandeauOf(scope, audience);
          if (!b) { b = { id: "ban-" + Math.random().toString(36).slice(2, 7), scope, audience, active: false, title: "", message: "", start: "", end: "" }; state.bandeaux.push(b); }
          Object.assign(b, state.banEdits[k]);
        }
        state.banEdits = {};
        saveBandeaux();
        render();
        showToast("Bandeaux publiés (données de démonstration).");
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
  el("view-journal").hidden     = denied || state.view !== "journal";
  el("view-cgu").hidden         = denied || state.view !== "cgu";
  el("view-bandeaux").hidden    = denied || state.view !== "bandeaux";
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
  else if (state.view === "journal") renderJournal();
  else if (state.view === "cgu") renderCgu();
  else if (state.view === "bandeaux") renderBandeaux();
  else if (state.view === "territoires") renderTerritoires();
  else if (state.view === "departements") renderDepartements();
  else if (state.view === "support") renderSupport();
}

document.addEventListener("DOMContentLoaded", render);
