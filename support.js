/* ==================================================================
   Arrière-guichet SAS — Référentiel « Gestion Support » (mock)
   Mails de réorientation par catégorie et par territoire.
   Format de sauvegarde : [{ reorientation_key, reorientation_name,
   territories:[{ territory, emails:[...] }] }]
   ================================================================== */

// Libellés de territoire (ordre du référentiel), index-alignés avec les tableaux d'emails.
const SUPPORT_TERR = [
  "[TEST] FAQ",
  "SAS-01 Ain","SAS-02 Aisne","SAS-03 Allier","SAS-04 Alpes-de-Haute-Provence","SAS-05 Hautes-Alpes",
  "SAS-06 Alpes-Maritimes","SAS-07 Ardèche","SAS-08 Ardennes","SAS-09 Ariège","SAS-10 Aube",
  "SAS-11 Aude","SAS-12 Aveyron","SAS-13 Bouches-du-Rhône","SAS-14 Calvados","SAS-15 Cantal",
  "SAS-16 Charente","SAS-17 Charente-Maritime","SAS-18 Cher","SAS-19 Corrèze","SAS-20A Corse du Sud",
  "SAS-20B Haute Corse","SAS-22 Côtes-d'Armor","SAS-23 Creuse","SAS-24 Dordogne","SAS-25 Doubs",
  "SAS-26 Drôme","SAS-27 Eure","SAS-28 Eure-et-Loir","SAS-29 Finistère","SAS-30 Gard",
  "SAS-31 Haute Garonne","SAS-32 Gers","SAS-33 Gironde","SAS-34 Hérault","SAS-35 Ille-et-Vilaine",
  "SAS-36 Indre","SAS-37 Indre-et-loire","SAS-38 Isère","SAS-39 Jura","SAS-40 Landes",
  "SAS-41 Loir-et-Cher","SAS-42 Loire","SAS-43 Haute-Loire","SAS-44 Loire-Atlantique","SAS-45 Loiret",
  "SAS-46 Lot","SAS-47 Lot-et-Garonne","SAS-48 Lozère","SAS-49 Maine-et-Loire","SAS-50 Manche",
  "SAS-51 Marne","SAS-52 Haute-Marne","SAS-53 Mayenne","SAS-54 Meurthe-et-Moselle","SAS-55 Meuse",
  "SAS-56 Morbihan","SAS-57 Moselle","SAS-58 / 21 Nièvre et Côte d'Or","SAS-59 Nord","SAS-60 Oise",
  "SAS-61 L'Orne","SAS-62 Pas-De-Calais","SAS-63 Puy-de-Dôme","SAS-64A Pyrénées-Atlantiques","SAS-64B Pyrénées-Atlantiques",
  "SAS-65 Hautes-Pyrénées","SAS-66 Pyrénées-Orientales","SAS-67 Bas-Rhin","SAS-68 Haut-Rhin","SAS-69 Rhône",
  "SAS-70 Haute-Saône","SAS-71 Saône-et-Loire","SAS-72 Sarthe","SAS-73 Savoie","SAS-74 Haute-Savoie",
  "SAS-75 Paris","SAS-76A Seine Maritime","SAS-76B Seine Maritime","SAS-77 Seine-et-Marne","SAS-78 Yvelines",
  "SAS-79 Deux-Sèvres","SAS-80 Somme","SAS-81 Tarn","SAS-82 Tarn-et-Garonne","SAS-83 Var",
  "SAS-84 Vaucluse","SAS-85 Vendée","SAS-86 Vienne","SAS-87 Haute-Vienne","SAS-88 Vosges",
  "SAS-89 Yonne","SAS-90 Territoire de Belfort","SAS-91 Essonne","SAS-92 Hauts-de-Seine","SAS-93 Seine-Saint-Denis",
  "SAS-94 Val-de-Marne","SAS-95 Val-d'Oise","SAS-971 Guadeloupe","SAS-972 Martinique","SAS-973 Guyane","SAS-974 La Réunion"
];

const _FAQ = ["Karim.ACHOUR@esante.gouv.fr","sas-test-faq@kleegroup.com"];

// Gestionnaire de compte — email par territoire (aligné sur SUPPORT_TERR)
const GDC_EMAILS = [
  _FAQ,
  ["pauline_1101@hotmail.com"],["matthieu.delory@ch-laon.fr"],["sas03.liberal@gmail.com"],["marie.lopez@ars.sante.fr"],["virginie.pellier@chicas-gap.fr"],
  ["vergnes.e@chu-nice.fr"],["a.auget@ch-privas.fr"],["support@pulsy.fr"],["philippe.tournie@chi-val-ariege.fr"],["coordination@slas10.fr"],
  ["apsa_11@yahoo.fr"],["roxanne.gauthey@ght-rouergue.fr"],["nicolas.marcengo@ap-hm.fr"],["charlotte.pigeon@ars.sante.fr"],["patrick.montanier@wanadoo.fr"],
  ["contact.sas@esea-na.fr"],["contact.sas@esea-na.fr"],["coordination@sas18.fr"],["contact.sas@esea-na.fr"],["andree.mori@ch-ajaccio.fr"],
  ["gilles.rampin@ch-bastia.fr"],["sophie.jaffrezic@armorsante.bzh"],["contact.sas@esea-na.fr"],["contact.sas@esea-na.fr"],["gest_comptesSAS_BFC@esante-bfc.fr"],
  ["c.morvan@snp26.fr"],["charlotte.pigeon@ars.sante.fr"],["stephanie.dessandier@sasambulatoire28.fr"],["gwenaelle.kerberenes@chu-brest.fr"],["associationsas30@gmail.com"],
  ["d.alvarez@gcs-sas31.fr"],["s.monge.referentterritorial32@ch-auch.fr"],["contact.sas@esea-na.fr"],["caroline.roques@sas34.fr"],["fanny.ozeray@adops35.fr"],
  ["coordination@sas36.fr"],["assdirection@sasambulatoire37.fr"],["sas38.fipsel@gmail.com"],["gest_comptesSAS_BFC@esante-bfc.fr"],["contact.sas@esea-na.fr"],
  ["direction@sasambulatoire41.fr"],["coordinationsaslib42@gmail.com"],["alexandra.peiretti@sante-ara.fr"],["fadwa.bouachra@chu-nantes.fr"],["service.acces.soins45@gmail.com"],
  ["stephane.moreau@ght-lot.fr"],["contact.sas@esea-na.fr"],["guillaume.ruel30380@gmail.com"],["jouteau.adops49@outlook.com"],["valerie.bezard@ccsnp.fr"],
  ["contact@sas51.fr"],["patricia.barty@ch-chaumont.fr"],["margaux.trohel@adops53.fr"],["support@pulsy.fr"],["sasmeuse@gmail.com"],
  ["adps56@ghba.fr"],["doc.aprocha@wanadoo.fr"],["gest_comptesSAS_BFC@esante-bfc.fr"],["hdf.sas@comearth-france.com"],["hdf.sas@comearth-france.com"],
  ["samu61@ch-alencon.fr"],["hdf.sas@comearth-france.com"],["coordination.sas63@gmail.com"],["contact.sas@esea-na.fr"],["contact.sas@esea-na.fr"],
  ["fmasselin@ch-tarbes-vic.fr"],["claudia.rampignon@ch-perpignan.fr"],["dalhia.adjedj@sasliberal67.fr"],["support@pulsy.fr"],["coordonnateur@ael69.fr"],
  ["gest_comptesSAS_BFC@esante-bfc.fr"],["gest_comptesSAS_BFC@esante-bfc.fr"],["adops72coordination@gmail.com"],["isabelle.canellas@ch-metropole-savoie.fr"],["ckerouredan@ch-annecygenevois.fr"],
  ["admlr75.sas@gmail.com"],["coordinationsas76a@gmail.com"],["charlotte.pigeon@ars.sante.fr"],["claire.manicot@sas77.org"],["acboucher@sas-78.fr"],
  ["contact.sas@esea-na.fr"],["hdf.sas@comearth-france.com"],["catherine.roques@ch-albi.fr"],["m.trilles@ch-montauban.fr"],["drwg@orange.fr"],
  ["taniapetel@wanadoo.fr"],["coordination@adops85.fr"],["contact.sas@esea-na.fr"],["contact.sas@esea-na.fr"],["assumvosges@gmail.com"],
  ["gest_comptesSAS_BFC@esante-bfc.fr"],["gest_comptesSAS_BFC@esante-bfc.fr"],["sas91@samu91.org"],["guillaume.dewulf@gmail.com"],["ps93.sas@gmail.com"],
  ["agnes.palusci@gmail.com"],["camille.aulagnier@ars.sante.fr"],["Veronique.CALPAS@ars.sante.fr"],["support@gcssis-martinique.fr"],["marine.barthelemy@ars.sante.fr"],["sec.sas.samu974@chu-reunion.fr"]
];

// Référent territorial — email par territoire (aligné sur SUPPORT_TERR)
const REF_EMAILS = [
  _FAQ,
  ["pauline_1101@hotmail.com"],["matthieu.delory@ch-laon.fr"],["sas03.liberal@gmail.com"],["marie.lopez@ars.sante.fr"],["s.descamps@cptsgapencais.com"],
  ["MURA.C@chu-nice.fr"],["d.arlaud@ch-privas.fr"],["support@pulsy.fr"],["philippe.tournie@chi-val-ariege.fr"],["coordination@slas10.fr"],
  ["apsa_11@yahoo.fr"],["roxanne.gauthey@ght-rouergue.fr"],["nicolas.marcengo@ap-hm.fr"],["charlotte.pigeon@ars.sante.fr"],["patrick.montanier@wanadoo.fr"],
  ["contact.sas@esea-na.fr"],["contact.sas@esea-na.fr"],["david.ferrer@urpsml-cvdl.org"],["contact.sas@esea-na.fr"],["andree.mori@ch-ajaccio.fr"],
  ["franck.raymond@ch-bastia.fr"],["sophie.jaffrezic@armorsante.bzh"],["contact.sas@esea-na.fr"],["contact.sas@esea-na.fr"],["ref_territoriaux_SAS_BFC@esante-bfc.fr"],
  ["c.morvan@snp26.fr"],["charlotte.pigeon@ars.sante.fr"],["stephanie.dessandier@sasambulatoire28.fr"],["gwenaelle.kerberenes@chu-brest.fr"],["associationsas30@gmail.com"],
  ["d.alvarez@gcs-sas31.fr"],["s.monge.referentterritorial32@ch-auch.fr"],["contact.sas@esea-na.fr"],["tapie.c@oruoccitanie.fr"],["fanny.ozeray@adops35.fr"],
  ["coordination@sas36.fr"],["direction@sasambulatoire37.fr"],["cecilie.possot@sante-ara.fr"],["ref_territoriaux_SAS_BFC@esante-bfc.fr"],["contact.sas@esea-na.fr"],
  ["direction@sasambulatoire41.fr"],["coordinationsaslib42@gmail.com"],["cecilie.possot@sante-ara.fr"],["fadwa.bouachra@chu-nantes.fr"],["service.acces.soins45@gmail.com"],
  ["tapie.c@oruoccitanie.fr"],["contact.sas@esea-na.fr"],["tapie.c@oruoccitanie.fr"],["jouteau.adops49@outlook.com"],["charlotte.pigeon@ars.sante.fr"],
  ["contact@sas51.fr"],["patricia.barty@ch-chaumont.fr"],["margaux.trohel@adops53.fr"],["sebastien.lakomski@gmail.com"],["sasmeuse@gmail.com"],
  ["adps56@ghba.fr"],["doc.aprocha@wanadoo.fr"],["ref_territoriaux_SAS_BFC@esante-bfc.fr"],["hdf.sas@comearth-france.com"],["hdf.sas@comearth-france.com"],
  ["charlotte.pigeon@ars.sante.fr"],["hdf.sas@comearth-france.com"],["coordination.sas63@gmail.com"],["contact.sas@esea-na.fr"],["contact.sas@esea-na.fr"],
  ["tapie.c@oruoccitanie.fr"],["tapie.c@oruoccitanie.fr"],["dalhia.adjedj@sasliberal67.fr"],["direction@sas68liberal.fr"],["coordonnateur@ael69.fr"],
  ["ref_territoriaux_SAS_BFC@esante-bfc.fr"],["ref_territoriaux_SAS_BFC@esante-bfc.fr"],["spoivet@ch-lemans.fr"],["isabelle.canellas@ch-metropole-savoie.fr"],["ckerouredan@ch-annecygenevois.fr"],
  ["admlr75.sas@gmail.com"],["charlotte.pigeon@ars.sante.fr"],["charlotte.pigeon@ars.sante.fr"],["claire.manicot@sas77.org"],["hkhaldoune@sas-78.fr"],
  ["contact.sas@esea-na.fr"],["hdf.sas@comearth-france.com"],["tapie.c@oruoccitanie.fr"],["tapie.c@oruoccitanie.fr"],["laurent.turi@ch-toulon.fr"],
  ["taniapetel@wanadoo.fr"],["coordination@adops85.fr"],["contact.sas@esea-na.fr"],["contact.sas@esea-na.fr"],["assumvosges@gmail.com"],
  ["ref_territoriaux_SAS_BFC@esante-bfc.fr"],["ref_territoriaux_SAS_BFC@esante-bfc.fr"],["lucieborja.sas91@gmail.com"],["guillaume.dewulf@gmail.com"],["ps93.sas@gmail.com"],
  ["carlosdevoue@gmail.com"],["camille.aulagnier@ars.sante.fr"],["Veronique.CALPAS@ars.sante.fr"],["astrid.alonzeau@esante-martinique.fr"],["marine.barthelemy@ars.sante.fr"],["a.celeste@tesis.re"]
];

const SUPPORT_REORIENTATIONS = [
  { reorientation_key:"support_n1", reorientation_name:"Support N1",
    territories: SUPPORT_TERR.map(t => ({ territory:t, emails: t === "[TEST] FAQ" ? _FAQ.slice() : ["webform.sas@esante.gouv.fr"] })) },
  { reorientation_key:"support_n3", reorientation_name:"Support N3",
    territories: SUPPORT_TERR.map(t => ({ territory:t, emails: t === "[TEST] FAQ" ? _FAQ.slice() : (t === "SAS-88 Vosges" ? ["webform.sas@esante.gouv.fr"] : ["webform-n3.sas@esante.gouv.fr"]) })) },
  { reorientation_key:"gestionnaire_de_compte", reorientation_name:"Gestionnaire de compte",
    territories: SUPPORT_TERR.map((t,i) => ({ territory:t, emails: GDC_EMAILS[i].slice() })) },
  { reorientation_key:"referent_territorial", reorientation_name:"Référent territorial",
    territories: SUPPORT_TERR.map((t,i) => ({ territory:t, emails: REF_EMAILS[i].slice() })) },
];
