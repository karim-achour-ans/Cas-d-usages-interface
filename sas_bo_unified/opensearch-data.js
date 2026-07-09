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
