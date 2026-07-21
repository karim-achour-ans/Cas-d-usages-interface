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
1. LISTE DES UTILISATEURS (menu « Utilisateurs »)
   - Affichage en lignes (chaque ligne indique le nom, les rôles, le statut,
     le mode de connexion, l'email, la ville, le territoire, la région, la
     date de création et la dernière connexion).
   - Visible par l'Administrateur (tous les territoires) et par le
     Gestionnaire de Compte (uniquement les utilisateurs de SON territoire) ;
     utilisez le sélecteur de profil en bas du menu de gauche.
   - Recherche libre + filtres : Rôle, Territoire, Région, Ville,
     Profession/Spécialité, Structure, Statut.
   - STATUT à 3 états : Actif · Inactif · Aucune connexion (compte jamais
     activé). Un bouton « Renvoyer le mail d'activation » apparaît sur les
     comptes jamais connectés.
   - MODE DE CONNEXION affiché : PSC (France Connect / Pro Santé Connect) ou
     Mot de passe.
   - EXPORT CSV (bouton « Exporter (CSV) ») : email, rôle(s), région,
     territoire, structure(s), statut, mode de connexion, liste de diffusion,
     dates. Sert de liste de diffusion et distingue les comptes login/mot de
     passe des comptes PSC. L'export respecte les filtres actifs.
   - Pour les gestionnaires de structure, le type (SOS Médecins / CDS / CPTS/MSP)
     est indiqué dans le libellé de chaque structure.

2. CRÉER / MODIFIER UN UTILISATEUR
   - « Créer un utilisateur » ou le lien « Modifier » sur chaque ligne.
   - RÔLES MULTIPLES : un utilisateur peut cumuler 1 à tous les rôles
     (cases à cocher).
   - RÔLES RÉSERVÉS (Referent Territoriale, Ambassadeur, TestLRM) :
     assignables uniquement par un administrateur. Les utilisateurs qui
     portent l'un de ces rôles ne sont visibles et filtrables que par les
     administrateurs (masqués aux gestionnaires de compte).
   - Champs communs : identifiant national, email, nom, prénom, ville (Base
     Adresse Nationale), territoire SAS (format SAS-[n° département]) et RÉGION
     (préremplie automatiquement d'après le territoire, modifiable).
   - ENVIRONNEMENT(S) — Production, PréProduction, Intégration, Formation :
     création multi-environnement réservée à l'Admin BO (cases à cocher).
   - GESTIONNAIRE DE STRUCTURE + CDS : l'ajout d'un Centre de Santé (CDS)
     préremplit la ville et le territoire s'ils sont encore vides.
   - Effecteur : n° RPPS -> pré-remplit nom, prénom, profession et spécialité
     (essayez 10001234567, 10002345678, 10003456789…).
   - Gestionnaire de Structure : rattachement à PLUSIEURS structures, y
     compris du même type (ex. 2 CPTS + 3 MSP + 2 SOS Médecins). On ajoute
     autant de structures que voulu via Type + recherche + « Ajouter » (bloc
     situé juste sous le champ Rôle).

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
   - Affichage, création, modification et suppression des territoires.
   - Format SAS-[n°] ; un territoire peut couvrir PLUSIEURS DÉPARTEMENTS
     (ex. SAS-69 : Rhône + Métropole de Lyon ; SAS-20 : Corse-du-Sud +
     Haute-Corse) et porte une LISTE DE CODES INSEE (communes).
   - Le nombre d'utilisateurs rattachés est indiqué. Renommer un code
     répercute le changement sur les utilisateurs.

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
   - Édition en ligne (emails séparés par des virgules) ; bouton « Enregistrer »
     désactivé sans changement ; modale de confirmation qui indique la
     NOTIFICATION DE CHANGEMENT envoyée aux référents des territoires modifiés.
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

Interface : épurée pour une lecture confortable sur écran 15 pouces.

RÔLES GÉRÉS
-----------
Gestionnaire de Compte · Gestionnaire de Structure (SOS Médecins, CDS,
CPTS/MSP) · Régulateur OSNP · Régulateur SU (droits identiques au Régulateur
OSNP) · Effecteur.
Le rôle « Administrateur » a été retiré de la gestion des utilisateurs :
l'administrateur du BO dispose par défaut de l'accès national (voir les
habilitations par arrière-guichet ci-dessus).

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
