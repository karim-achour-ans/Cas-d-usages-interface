========================================================================
  MOCK — SUITE ARRIÈRE-GUICHET DU SAS (Service d'Accès aux Soins)
  Portail multi-arrière-guichets · maquette au format DSFR
========================================================================

COMMENT LANCER
--------------
Double-cliquez sur « index.html » : c'est le PORTAIL de la suite.
Aucune installation, aucun serveur, aucune connexion requise (DSFR embarqué
localement dans « vendor/ »).

STRUCTURE DE LA SUITE (un arrière-guichet par composant technique)
------------------------------------------------------------------
- index.html         → Portail : tuiles vers les arrière-guichets habilités.
- acces.html?component=keycloak → Keycloak : gestion des utilisateurs.
- acces.html?component=sasdata  → SAS-DATA : bandeaux, territoires, départements, support.
- opensearch.html    → Open-Search : offre de soins (index sas_consultation_place).
- interop.html       → Interopérabilité : flux d'API (coquille, 6 onglets vides).
- pilotage.html     → Pilotage plateforme : données de pilotage (base SAS, lecture seule).
- gestion-acces.html → Gestion des accès (réservé à l'Admin BO).

HABILITATIONS (niveau par arrière-guichet)
------------------------------------------
Chaque identité porte, par arrière-guichet, un niveau : Aucun / Lecture / Écriture.
  - Admin BO : super-rôle, écriture partout + écran « Gestion des accès »
    (crée les comptes d'administration et fixe leurs niveaux).
  - Admin    : niveaux Lecture/Écriture par guichet. En Lecture, on consulte
    mais les boutons créer/éditer/enregistrer/supprimer sont masqués.
  - Gestionnaire de compte : profil territorial (périmètre par territoire).
Le portail n'affiche que les guichets habilités et indique le niveau.

  (Ancien modèle remplacé) — pour mémoire, l'identité portait auparavant :
  - acces   : { role, territoire }
  - interop : { role }
              (ROLE_AUTHENTICATED_USER, ROLE_MANAGER, ROLE_ADMINISTRATOR)
Le portail n'affiche que les BO habilités ; un profil non habilité voit un
écran « Accès non autorisé » avec retour au portail. Le sélecteur « Connecté
en tant que » est partagé entre les pages (via l'URL) pour la démo.

CE QUE FAIT LA MAQUETTE
-----------------------
1. LISTE DES UTILISATEURS (menu « Utilisateurs ») — refonte de la gestion des comptes
   Conforme à la spécification « Création et gestion des comptes utilisateurs SAS ».
   - ACCÈS : seuls le SAS Administrateur et le Gestionnaire de comptes accèdent à
     la liste et aux formulaires (autre profil : « Accès non autorisé »).
   - DEUX NOTIONS DE TERRITOIRE :
       * territoire de RATTACHEMENT — calculé, jamais saisi, sert à la visibilité :
         territoires de gestion (Gestionnaire de comptes) + territoires des
         structures (Gestionnaire de structure) + territoire de régulation
         (régulateur) ;
       * TERRITOIRE DE RÉGULATION — un seul, propre aux régulateurs.
     Exemple : Marc Richard gère une CPTS du SAS-75 et une du SAS-92 et régule
     au SAS-75 → rattachement SAS-75 + SAS-92, territoire de régulation SAS-75.
   - VISIBILITÉ : le SAS Administrateur voit tous les comptes ; le Gestionnaire de
     comptes voit les comptes dont au moins un territoire de rattachement est
     l'un des siens (essayez « Gestionnaire de comptes — SAS-92 + SAS-93 »). Les
     comptes SAS Administrateur et TestInterop ne sont visibles que des
     administrateurs.
   - STATUT à 3 états : Actif · En attente de première connexion · Inactif
     (désactivé). Un compte supprimé n'apparaît plus.
   - TAG « RÉFÉRENT TERRITORIAL » : badge dans la liste, filtrable.
   - « RÉGULATEUR MÉDECIN » : un Régulateur OSNP dont le RPPS est celui d'un
     effecteur est affiché sous ce libellé (filtre « Rôle » dédié).
   - MODE DE CONNEXION : choisi par l'utilisateur à l'activation (PSC ou mot de
     passe) ; non renseigné tant qu'il ne s'est jamais connecté.
   - EXPORT CSV : même périmètre que la liste (filtres compris), avec RPPS,
     qualité d'effecteur, territoire(s), créateur et auteur de modification.

2. AJOUTER / MODIFIER UN UTILISATEUR
   - RÔLES : SAS Administrateur · Gestionnaire de comptes · Gestionnaire de
     structure · Régulateur OSNP · Régulateur IOA / Agent d'accueil ·
     TestInterop. Cumulables, sauf Régulateur OSNP + Régulateur IOA.
   - TAG « Référent territorial » : proposé seulement si le compte porte le rôle
     Gestionnaire de structure, Régulateur OSNP ou Régulateur IOA.
   - MATRICE : le Gestionnaire de comptes ne peut créer ni SAS Administrateur ni
     TestInterop ; il peut créer un autre Gestionnaire de comptes, sur ses
     territoires uniquement.
   - TERRITOIRES SAISIS : territoires de gestion (Gestionnaire de comptes, un ou
     plusieurs) et territoire de régulation (un seul). Le
     Gestionnaire de structure n'a aucun territoire à saisir : ce sont ceux de
     ses structures. Le rattachement calculé est affiché en direct.
     Territoires de gestion et territoire de régulation proposés : tous
     (administrateur) ou ceux du créateur ; créateur rattaché à un seul
     territoire : ce territoire est attribué d'office. Les STRUCTURES, elles,
     sont toutes proposées, quel que soit leur territoire : si le compte n'est
     plus rattaché à aucun territoire du Gestionnaire de comptes, il en est
     averti (le compte ne lui sera plus visible).
   - COMPTE PARTIELLEMENT HORS PÉRIMÈTRE (proposition de la spécification) : le
     Gestionnaire de comptes voit les territoires de gestion et territoire du
     régulateur hors de son périmètre en lecture seule ; la suppression complète
     est réservée au SAS Administrateur (ou à un gestionnaire couvrant tout le
     rattachement).
   - EMAIL obligatoire et unique : un email déjà présent dans Keycloak bloque la
     création.
   - RPPS facultatif (le rôle Effecteur est supprimé) : vérifié dans l'Annuaire
     Santé, unique (un compte = un identifiant national « 8 » + RPPS), il
     préremplit nom et prénom (non modifiables) et donne la qualité d'effecteur.
     RPPS libres : 10003456789, 10006789012, 10007890123…
   - GESTIONNAIRE DE STRUCTURE : au moins une structure (SOS Médecins, CPTS, CDS,
     FINESS juridique), sans doublon.
   - APRÈS ENREGISTREMENT : compte créé dans Keycloak, mail d'activation à deux
     options (mot de passe ou PSC), synchronisation Interop si régulateur, message
     de succès avec retour à la liste — ou message d'échec avec sa cause.
     Démo : un email en « @echec-keycloak.test » simule un échec Keycloak.
   - PAGE DE MODIFICATION : statut, date et auteur de création (si son compte est
     supprimé : son rôle et son territoire), date et auteur de la dernière
     modification, dernière connexion ; actions « Renvoyer le mail de bienvenue »,
     « Activer / Désactiver », « Supprimer » (synchronisées si régulateur).
   - JOURNAL DES ACTIONS (menu, administrateur) : toute action sur un compte,
     réussie ou en échec, est tracée.

3. STATISTIQUES (menu « Statistiques »)
   - Répartition des comptes : par rôle, par type de structure (gestionnaires)
     et par mode de connexion.
   - Indicateurs de statut : comptes, actifs, inactifs, aucune connexion.
   - PÉRIMÈTRE (administrateur) : National / Par région / Par territoire, avec
     sélecteur dédié. Le gestionnaire de compte voit les statistiques de SON
     territoire uniquement.

4. ÉDITION DES CGU (menu « Édition des CGU », administrateur uniquement)
   - Édition du numéro de version et du texte des Conditions générales
     d'utilisation présentées aux utilisateurs à la connexion.
   - Bouton « Enregistrer » désactivé sans changement ; modale de confirmation
     (« Publier ») listant les modifications ; la date de mise à jour est
     horodatée automatiquement à la publication.
   - Administrateur en lecture seule : consultation sans édition.

5. BANDEAUX D'INFORMATION (menu « Bandeaux d'information », SAS-DATA)
   - Deux bandeaux par périmètre : « utilisateur connecté » et « page de
     connexion (non connecté) ».
   - Éditables au niveau NATIONAL et PAR TERRITOIRE (sélecteur de périmètre).
   - Chaque bandeau : statut actif/inactif, titre, message et PLAGE
     D'AFFICHAGE (début / fin au format date-heure).
   - Administrateur : édite le national et tous les territoires, pour les deux
     audiences.
   - Gestionnaire de compte : n'a PAS accès au bandeau « non connecté » et ne
     peut PAS éditer le niveau national (consultation) ; il édite uniquement le
     bandeau « connecté » de SON territoire.
   - Bouton « Enregistrer » désactivé sans changement + modale « Publier ».

6. TERRITOIRES SAS (menu « Territoires SAS », administrateur uniquement)
   Deux onglets (référentiel : sas-referentiel.js, généré depuis referentiel_sas.xlsx).
   - TERRITOIRES SAS (lecture) : affiche par défaut les 107 territoires SAS,
     chacun avec son code SAMU (ex. SAS 76A ↔ FR76A), son département, sa
     région et son périmètre : département entier, ou liste de communes
     (codes INSEE) pour les départements découpés (64A/64B, 76A/76B ; 42A/42B
     à compléter). Filtres : recherche, région, périmètre. Indicateur de
     couverture : % de territoires SAS rattachés à un territoire de régulation.
   - TERRITOIRES DE RÉGULATION (édition) : ceux que l'on retrouve sur les
     comptes (territoires de gestion, territoire de régulation) et sur l'offre
     de soins. Par défaut, un territoire de régulation = un territoire SAS
     (même code, ex. SAS-75). Par exception, un REGROUPEMENT = une liste de
     territoires SAS (exemple maquette : SAS-20 = SAS 2A + SAS 2B).
       * Créer un regroupement remplace les territoires par défaut des SAS
         choisis ; les comptes qui y étaient rattachés sont reportés sur le
         regroupement (aperçu d'impact avant enregistrement).
       * Retirer un SAS d'un regroupement, ou supprimer le regroupement, lui
         rend son territoire par défaut. Suppression impossible tant que des
         comptes y sont rattachés.
   - OFFRE DE SOINS (Open-Search) : chaque adresse affiche son territoire SAS
     (code SAMU, mode de rattachement) et son territoire de régulation ; la
     liste se filtre par territoire de régulation. Règle de rattachement :
     code INSEE dans une liste → SAS de la liste ; sinon département du code
     INSEE ; sans code INSEE (cas de la maquette), département du code postal
     ou nom de commune pour les départements découpés (approximatif).

7. DÉPARTEMENTS (menu « Départements »)
   - Accessible aux administrateurs (tous les territoires SAS) et aux
     gestionnaires de compte (uniquement le département de leur territoire).
   - Deux champs éditables par département :
       * Rayon défaut (km)  = rayon de recherche par défaut (countyRadius)
       * Rayon villes (km)  = rayon par défaut pour les villes (cityDefaultRadius)
   - Bouton « Enregistrer » désactivé tant qu'aucune valeur n'a changé ; au
     clic, une modale liste les valeurs modifiées avant validation.
   - Données conformes au format JSON de sauvegarde (fichier departements.js).

8. GESTION SUPPORT (menu « Gestion Support »)
   - TABLEAU MATRICIEL : une ligne par territoire (SAS), une COLONNE PAR
     SUPPORT (Support N1, Support N3, Gestionnaire de compte, Référent
     territorial) — tous les supports visibles d'un coup.
   - FILTRE PAR SAS (territoire) au-dessus du tableau.
   - Administrateur : tous les territoires ; gestionnaire de compte :
     uniquement son territoire.
   - ÉDITION EMAIL PAR EMAIL : chaque email est un champ séparé, avec un
     bouton de SUPPRESSION par email et un bouton « + Ajouter un email » par
     cellule (un support peut donc porter plusieurs adresses).
   - Bouton « Enregistrer » désactivé sans changement ; modale de confirmation
     indiquant la NOTIFICATION DE CHANGEMENT envoyée aux référents des
     territoires modifiés.
   - IMPORT / EXPORT JSON (administrateur) :
       * « Télécharger le JSON » exporte le référentiel complet au format
         [{reorientation_key, reorientation_name, territories:[{territory,
         emails:[...]}]}].
       * « Importer un JSON » (écriture) remplace le référentiel après
         validation du format et confirmation.
   - Données conformes au format JSON fourni (fichier support.js).

9. OFFRE DE SOINS (page opensearch.html, arrière-guichet Open-Search)
   - Deux natures d'offres, INDÉPENDANTES, dans l'index sas_consultation_place :
       * PROFESSIONNELS DE SANTÉ (offres individuelles, identifiées par RPPS) ;
       * STRUCTURES autonomes — offres de soins à part entière, NON rattachées
         à un professionnel : CDS (1 adresse) · SOS Médecins (multi-adresses
         PFG/PFC) · MMG (1 adresse).
   - Liste avec le type d'offre, la participation SAS et le statut de
     DISPONIBILITÉ (disponible / indisponible). Filtres « Type d'offre » +
     disponibilité.
   - Fiche détaillée : bloc d'identité (professionnel OU structure), dates
     d'INSCRIPTION et de PARTICIPATION au SAS, AGENDA SAS hebdomadaire (lecture).
   - Chaque adresse affiche un SCORE DE GÉOLOCALISATION (0–100 + libellé).
   - ÉDITION DE L'INDEX (habilitation écriture) : adresse, téléphone, modalité,
     géolocalisation et score. Toute modification d'Adresse / Géoloc / Score /
     Téléphone exige une DESCRIPTION (qui / quoi) et alimente l'HISTORIQUE
     DES MODIFICATIONS (date, auteur, champs, description).

10. PILOTAGE PLATEFORME (page pilotage.html, consultation seule)
   Un tableau par onglet : Orientation · Participation SAS PS ·
   Participation SAS structure. Données fictives.
   - COLONNES : retirer (×) ou ajouter (« + Ajouter une colonne ») ;
     « Toutes les colonnes » rétablit le tableau complet.
   - EXPORT EXCEL : reprend exactement les colonnes affichées (CSV UTF-8,
     séparateur « ; », ouverture directe dans Excel).
   - PÉRIMÈTRE : le gestionnaire de comptes ne voit que ses territoires.

Interface : épurée pour une lecture confortable sur écran 15 pouces.

RÔLES GÉRÉS
-----------
SAS Administrateur (ex-administrateur national ; l'ancien rôle sas_administrateur
est supprimé) · Gestionnaire de comptes · Gestionnaire de structure (SOS
Médecins, CDS, CPTS/MSP) · Régulateur OSNP · Régulateur IOA / Agent d'accueil ·
TestInterop. Tag : Référent territorial.
La création multi-environnement (Production, PréProduction…) a été retirée.
Le rôle Effecteur est supprimé : la qualité d'effecteur est déduite du RPPS.

DONNÉES
-------
Toutes les données sont fictives (annuaires FINESS / RPPS et communes
simulés). Les utilisateurs créés/modifiés sont mémorisés dans le navigateur
(localStorage). Lien « Réinitialiser le jeu de démonstration » pour repartir
des données d'origine.

STRUCTURE DES FICHIERS
----------------------
  index.html         Page principale (menu + zone de contenu)
  app.js             Logique + données mock (à éditer pour adapter)
  departements.js    Référentiel des départements (format JSON de sauvegarde)
  support.js         Référentiel des mails de réorientation (format JSON)
  styles.css         Styles du mock (menu, liste, filtres, responsive)
  icons-inline.css   Icônes DSFR embarquées (rendu hors-ligne)
  vendor/            DSFR 1.12.1 (CSS, polices, icônes) — hors-ligne

Maquette de démonstration — ne pas utiliser en production.
========================================================================
