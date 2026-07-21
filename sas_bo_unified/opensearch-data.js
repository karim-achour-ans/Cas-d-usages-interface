/* ==================================================================
   Open-Search — offre de soins (index « sas_consultation_place »)
   Un document = un professionnel de santé À UNE ADRESSE (place).
   Un même RPPS sur plusieurs adresses = plusieurs documents.
   Le champ `modalite` (via MSP / via CPTS) est ajouté pour la maquette.
   ================================================================== */
const OS_INDEX = [
  { rpps:"10108275248", psa:"ROR-COMMUN-FR-NOR-10108275248-389907520400011", etbGuid:"ROR-COMMUN-FR-NOR-389907520400011",
    title:"Dr Heloise Legouix", lastname:"Legouix", firstname:"Heloise",
    coordinates:{lat:49.180536, lon:-0.182907},
    address:{street:"R de l avenir", postalCode:"14670", city:"Saline", full:"R de l avenir 14670 Saline"},
    region:"FR-NOR", phones:[], profession:"40", specialities:[], establishmentType:"SA09",
    agreements:"c1", mssante:"heloise.legouix@chirurgien-dentiste.mssante.fr", modalite:"MSP" },

  { rpps:"10106917841", psa:"ROR-COMMUN-FR-NOR-10106917841-394982229000019", etbGuid:"ROR-COMMUN-FR-NOR-394982229000019",
    title:"Melissa Naveilhan", lastname:"Naveilhan", firstname:"Melissa",
    coordinates:{lat:49.586815, lon:-1.265322},
    address:{street:"9 Quai Vauban", postalCode:"50550", city:"Saint-Vaast-la-Hougue", full:"9 Quai Vauban 50550 Saint-Vaast-la-Hougue"},
    region:"FR-NOR", phones:[], profession:"60", specialities:[], establishmentType:"SA09",
    agreements:"c1", mssante:"", modalite:"CPTS" },

  { rpps:"10002875374", psa:"ROR-COMMUN-FR-OCC-10002875374-10002875374039", etbGuid:"ROR-COMMUN-FR-OCC-10002875374039",
    title:"Dr Frederic Chapelle", lastname:"Chapelle", firstname:"Frederic",
    coordinates:{lat:43.609722, lon:1.445443},
    address:{street:"8 Rue Joseph Bosc", postalCode:"31000", city:"Toulouse", full:"8 Rue Joseph Bosc 31000 Toulouse"},
    region:"FR-OCC", phones:[], profession:"10", specialities:["SM42"], establishmentType:"SA08",
    agreements:"c1", mssante:"frederic.chapelle@medecin.mssante.fr", modalite:"MSP" },

  { rpps:"10002921293", psa:"ROR-COMMUN-FR-OCC-10002921293-10002921293027", etbGuid:"ROR-COMMUN-FR-OCC-10002921293027",
    title:"Dr Reida Hassaine", lastname:"Hassaine", firstname:"Reida",
    coordinates:{lat:43.584504, lon:1.405609},
    address:{street:"5 Rue Joachim du Bellay", postalCode:"31100", city:"Toulouse", full:"5 Rue Joachim du Bellay 31100 Toulouse"},
    region:"FR-OCC", phones:[{number:"05 62 13 26 12", confidentialityLevel:"1"}], profession:"10", specialities:["SM53"], establishmentType:"SA07",
    agreements:"c1", mssante:"mohammed.hassaine@medecin.oc.mssante.fr", modalite:"CPTS" },

  { rpps:"10111259189", psa:"ROR-COMMUN-FR-OCC-10111259189-10003624557015", etbGuid:"ROR-COMMUN-FR-OCC-10003624557015",
    title:"Dr Thomas Dilhan", lastname:"Dilhan", firstname:"Thomas",
    coordinates:{lat:43.408263, lon:3.696147},
    address:{street:"11 Quai Adolphe Merle", postalCode:"34200", city:"Sète", full:"11 Quai Adolphe Merle 34200 Sète"},
    region:"FR-OCC", phones:[], profession:"40", specialities:[], establishmentType:"SA08",
    agreements:null, mssante:"", modalite:"MSP" },

  { rpps:"10107871880", psa:"ROR-COMMUN-FR-OCC-10107871880-10005304711002", etbGuid:"ROR-COMMUN-FR-OCC-10005304711002",
    title:"Pauline Mathieu", lastname:"Mathieu", firstname:"Pauline",
    coordinates:{lat:43.55081, lon:1.458312},
    address:{street:"6 Rue Hergé", postalCode:"31400", city:"Toulouse", full:"6 Rue Hergé 31400 Toulouse"},
    region:"FR-OCC", phones:[], profession:"70", specialities:[], establishmentType:"SA08",
    agreements:"c1", mssante:"", modalite:"CPTS" },

  { rpps:"10005294912", psa:"ROR-COMMUN-FR-OCC-10005294912-10005294912016", etbGuid:"ROR-COMMUN-FR-OCC-10005294912016",
    title:"Matthieu Poullain", lastname:"Poullain", firstname:"Matthieu",
    coordinates:{lat:43.609875, lon:3.910068},
    address:{street:"1086 Avenue Albert Einstein", postalCode:"34000", city:"Montpellier", full:"1086 Avenue Albert Einstein 34000 Montpellier"},
    region:"FR-OCC", phones:[], profession:"70", specialities:[], establishmentType:"SA08",
    agreements:"c1", mssante:"", modalite:"MSP" },

  { rpps:"10005294912", psa:"ROR-COMMUN-FR-OCC-10005294912-10005294912024", etbGuid:"ROR-COMMUN-FR-OCC-10005294912024",
    title:"Matthieu Poullain", lastname:"Poullain", firstname:"Matthieu",
    coordinates:{lat:43.643422, lon:3.842708},
    address:{street:"1006 Rue de la Croix Verte", postalCode:"34080", city:"Montpellier", full:"1006 Rue de la Croix Verte 34080 Montpellier"},
    region:"FR-OCC", phones:[{number:"06 75 48 32 24", confidentialityLevel:"1"}], profession:"70", specialities:[], establishmentType:"SA07",
    agreements:"c1", mssante:"", modalite:"CPTS" },

  { rpps:"10109340603", psa:"ROR-COMMUN-FR-OCC-10109340603-10005297295013", etbGuid:"ROR-COMMUN-FR-OCC-10005297295013",
    title:"Thelma Malavelle", lastname:"Malavelle", firstname:"Thelma",
    coordinates:{lat:43.925161, lon:2.16294},
    address:{street:"27 Rue Jean Rieux", postalCode:"81000", city:"Albi", full:"27 Rue Jean Rieux 81000 Albi"},
    region:"FR-OCC", phones:[], profession:"70", specialities:[], establishmentType:"SA08",
    agreements:"c1", mssante:"", modalite:"MSP" },

  { rpps:"10107646639", psa:"ROR-COMMUN-FR-OCC-10107646639-10005298525004", etbGuid:"ROR-COMMUN-FR-OCC-10005298525004",
    title:"Alexandre Houdelat", lastname:"Houdelat", firstname:"Alexandre",
    coordinates:{lat:43.454933, lon:3.42419},
    address:{street:"9 Avenue de la Gare du Midi", postalCode:"34120", city:"Pézenas", full:"9 Avenue de la Gare du Midi 34120 Pézenas"},
    region:"FR-OCC", phones:[{number:"06 51 30 88 04", confidentialityLevel:"1"}], profession:"70", specialities:[], establishmentType:"SA07",
    agreements:"c1", mssante:"", modalite:"CPTS" },
];

const OS_PROFESSION_LABEL = {
  "10": "Médecin", "40": "Chirurgien-dentiste", "50": "Sage-femme",
  "60": "Infirmier", "70": "Masseur-kinésithérapeute", "21": "Pharmacien",
};

/* ------------------------------------------------------------------ *
 *  Modèle « offre de soins » (Lot 3 + révision Lot 4).
 *  Une offre est SOIT un professionnel de santé (PS, individuel),
 *  SOIT une STRUCTURE autonome (CDS · SOS Médecins · MMG) — les
 *  structures NE sont PAS rattachées à un professionnel : ce sont des
 *  offres de soins à part entière.
 *  Chaque offre porte : statut de disponibilité, dates SAS, agenda
 *  (lecture), historique des modifications, et une ou plusieurs
 *  adresses (« places ») avec score de géolocalisation.
 * ------------------------------------------------------------------ */
const OS_KIND_LABEL = {
  ps:  "Professionnel de santé",
  cds: "Centre de Santé (CDS)",
  sos: "SOS Médecins",
  mmg: "Maison Médicale de Garde (MMG)",
};
/* Rétro-compat : ancien libellé de structure (hors « ps ») */
const OS_STRUCTURE_LABEL = { cds: OS_KIND_LABEL.cds, sos: OS_KIND_LABEL.sos, mmg: OS_KIND_LABEL.mmg };
/* SOS Médecins : multi-adresses — chaque adresse est un point fixe. */
const OS_SOS_POINT_LABEL = { PFG: "Point fixe de garde (PFG)", PFC: "Point fixe de consultation (PFC)" };
const OS_JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function osGeoScoreLabel(score) {
  if (score == null) return "—";
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Bon";
  if (score >= 50) return "Moyen";
  return "Faible";
}

/* Agenda SAS hebdomadaire déterministe (créneaux déclarés, en lecture seule) */
function osAgendaSeed(i, dispo) {
  if (!dispo) return OS_JOURS.map(j => ({ jour: j, creneaux: [] }));
  const patterns = [
    { matin: "08:00–12:00", aprem: "14:00–18:00" },
    { matin: "09:00–12:30", aprem: "14:00–17:00" },
    { matin: "08:30–12:00", aprem: "" },
  ];
  const p = patterns[i % patterns.length];
  return OS_JOURS.map((j, k) => {
    if (k === 6) return { jour: j, creneaux: [] };                 // dimanche fermé
    if (k === 5) return { jour: j, creneaux: p.matin ? [p.matin] : [] }; // samedi matin
    const c = []; if (p.matin) c.push(p.matin); if (p.aprem) c.push(p.aprem);
    return { jour: j, creneaux: c };
  });
}
const OS_GEO_SCORES = [98, 86, 72, 45, 91, 79, 88, 63, 95, 81, 92, 74];
function osIso(y, m, d) { return new Date(y, m, d).toISOString(); }

/* Attributs SAS communs (statut, dates, agenda, historique) — déterministe */
function osEnrichOffre(o, i, importAuthor) {
  o.dispo = (i % 4 !== 2);
  o.sas = {
    inscription: osIso(2024, (i % 10), 3 + (i % 20)),
    participations: o.dispo
      ? [ osIso(2026, 5, 2 + (i % 20)), osIso(2026, 6, 5 + (i % 15)) ]
      : [ osIso(2026, 3, 4 + (i % 18)) ],
  };
  o.agenda = osAgendaSeed(i, o.dispo);
  o.history = [
    { at: osIso(2025, 10, 5 + (i % 15)), author: importAuthor, fields: ["Adresse", "Géolocalisation"],
      description: "Création de la fiche dans l'index de l'offre de soins." },
  ];
  if (i % 3 === 0) o.history.unshift({
    at: osIso(2026, 1, 8 + (i % 12)), author: "gestionnaire.offre@sas.gouv.fr", fields: ["Téléphone"],
    description: "Mise à jour du numéro de téléphone signalée sur le terrain.",
  });
  o.places.forEach((p, k) => { if (p.geoScore == null) p.geoScore = OS_GEO_SCORES[(i + k) % OS_GEO_SCORES.length]; });
}

/* --- Offres « professionnel de santé » (à partir de l'index brut, sans structure) --- */
function osBuildProfessionals() {
  const map = new Map();
  OS_INDEX.forEach(d => {
    if (!map.has(d.rpps)) {
      map.set(d.rpps, { kind: "ps", id: "ps-" + d.rpps, rpps: d.rpps,
        firstname: d.firstname, lastname: d.lastname, profession: d.profession,
        participationSAS: false, places: [] });
    }
    const o = map.get(d.rpps);
    if (d.agreements) o.participationSAS = true;
    o.places.push({
      psa: d.psa,
      address: { ...d.address },
      coordinates: { ...d.coordinates },
      phones: (d.phones || []).map(p => ({ ...p })),
      modalite: d.modalite,
      geoScore: null,
    });
  });
  const arr = [...map.values()];
  arr.forEach((o, i) => osEnrichOffre(o, i, "Import annuaire santé (RPPS)"));
  return arr;
}

/* --- Offres « structure » autonomes (CDS · SOS Médecins · MMG) --- */
const OS_STRUCTURES_RAW = [
  { kind: "cds", id: "str-cds-1", name: "Centre de Santé Bagatelle", places: [
    { psa: "STR-CDS-1-01", address: { street: "203 Route de Toulouse", postalCode: "33400", city: "Talence", full: "203 Route de Toulouse 33400 Talence" },
      coordinates: { lat: 44.80697, lon: -0.58801 }, phones: [{ number: "05 57 12 34 56", confidentialityLevel: "1" }] } ] },

  { kind: "sos", id: "str-sos-1", name: "SOS Médecins Toulouse", places: [
    { psa: "STR-SOS-1-PFG", point: "PFG", address: { street: "70 Rue du Colombier", postalCode: "31400", city: "Toulouse", full: "70 Rue du Colombier 31400 Toulouse" },
      coordinates: { lat: 43.58122, lon: 1.45333 }, phones: [{ number: "05 61 33 00 00", confidentialityLevel: "1" }] },
    { psa: "STR-SOS-1-PFC", point: "PFC", address: { street: "5 Allée du Comminges", postalCode: "31770", city: "Colomiers", full: "5 Allée du Comminges 31770 Colomiers" },
      coordinates: { lat: 43.61098, lon: 1.33361 }, phones: [{ number: "05 61 33 00 01", confidentialityLevel: "1" }] } ] },

  { kind: "mmg", id: "str-mmg-1", name: "Maison Médicale de Garde de Sète", places: [
    { psa: "STR-MMG-1-01", address: { street: "2 Rue Docteur Paul Vieu", postalCode: "34200", city: "Sète", full: "2 Rue Docteur Paul Vieu 34200 Sète" },
      coordinates: { lat: 43.40751, lon: 3.69512 }, phones: [{ number: "04 67 00 12 34", confidentialityLevel: "1" }] } ] },

  { kind: "cds", id: "str-cds-2", name: "Centre Municipal de Santé de Montreuil", places: [
    { psa: "STR-CDS-2-01", address: { street: "31 Rue Carnot", postalCode: "93100", city: "Montreuil", full: "31 Rue Carnot 93100 Montreuil" },
      coordinates: { lat: 48.86200, lon: 2.44100 }, phones: [{ number: "01 48 00 56 78", confidentialityLevel: "1" }] } ] },

  { kind: "mmg", id: "str-mmg-2", name: "MMG Lyon Croix-Rousse", places: [
    { psa: "STR-MMG-2-01", address: { street: "93 Grande Rue de la Croix-Rousse", postalCode: "69004", city: "Lyon", full: "93 Grande Rue de la Croix-Rousse 69004 Lyon" },
      coordinates: { lat: 45.77720, lon: 4.82760 }, phones: [{ number: "04 72 00 90 12", confidentialityLevel: "1" }] } ] },
];
function osBuildStructures() {
  const arr = OS_STRUCTURES_RAW.map(s => JSON.parse(JSON.stringify(s)));
  arr.forEach((o, i) => { o.participationSAS = true; osEnrichOffre(o, i + 2, "Référencement structure SAS"); });
  return arr;
}

/* Index complet des offres de soins : structures + professionnels */
const OS_OFFRES = [...osBuildStructures(), ...osBuildProfessionals()];
