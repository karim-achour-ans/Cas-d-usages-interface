========================================================================
  MOCK — ARRIÈRE-GUICHET DU SAS (Service d'Accès aux Soins)
  Gestion des utilisateurs · maquette au format DSFR
========================================================================

COMMENT LANCER
--------------
Double-cliquez simplement sur « index.html ».
Il s'ouvre dans votre navigateur — aucune installation, aucun serveur,
aucune connexion internet requise. Le DSFR (CSS + polices Marianne) est
embarqué localement dans le dossier « vendor/ ».

Dans Visual Studio / VS Code : ouvrez le dossier, puis ouvrez index.html
(clic droit « Open in Default Browser » ou « Open with Live Server »).
La page est responsive (adaptée mobile / tablette / bureau).

CE QUE FAIT LA MAQUETTE
-----------------------
1. LISTE DES UTILISATEURS (menu « Utilisateurs »)
   - Affichage en lignes (une à deux lignes par utilisateur).
   - Visible par l'Administrateur (tous les territoires) et par le
     Gestionnaire de Compte (uniquement les utilisateurs de SON territoire) ;
     utilisez le sélecteur de profil en bas du menu de gauche.
   - Recherche libre + filtres : Rôle, Territoire, Ville, Profession/Spécialité,
     Structure, Statut.
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
     Adresse Nationale), territoire SAS (format SAS-[n° département]).
   - Effecteur : n° RPPS -> pré-remplit nom, prénom, profession et spécialité
     (essayez 10001234567, 10002345678, 10003456789…).
   - Gestionnaire de Structure : rattachement à PLUSIEURS structures, y
     compris du même type (ex. 2 CPTS + 3 MSP + 2 SOS Médecins). On ajoute
     autant de structures que voulu via Type + recherche + « Ajouter » (bloc
     situé juste sous le champ Rôle).

3. TERRITOIRES SAS (menu « Territoires SAS », administrateur uniquement)
   - Affichage, création, modification et suppression des territoires.
   - Format imposé SAS-[n° département] ; le nombre d'utilisateurs rattachés
     est indiqué. Renommer un code répercute le changement sur les utilisateurs.

   - Le rôle administrateur seul n'a pas besoin de territoire (accès à tous).

4. DÉPARTEMENTS (menu « Départements »)
   - Accessible aux administrateurs (tous les territoires SAS) et aux
     gestionnaires de compte (uniquement le département de leur territoire).
   - Deux champs éditables par département :
       * Rayon défaut (km)  = rayon de recherche par défaut (countyRadius)
       * Rayon villes (km)  = rayon par défaut pour les villes (cityDefaultRadius)
   - Bouton « Enregistrer » désactivé tant qu'aucune valeur n'a changé ; au
     clic, une modale liste les valeurs modifiées avant validation.
   - Données conformes au format JSON de sauvegarde (fichier departements.js).

5. GESTION SUPPORT (menu « Gestion Support »)
   - Gère les mails de réorientation par catégorie (Support N1, Support N3,
     Gestionnaire de compte, Référent territorial) et par territoire.
   - Administrateur : tous les mails ; gestionnaire de compte : uniquement les
     mails de son territoire.
   - Édition en ligne (emails séparés par des virgules) ; bouton « Enregistrer »
     désactivé sans changement, modale de confirmation listant les changements.
   - Données conformes au format JSON fourni (fichier support.js).

Interface : épurée pour une lecture confortable sur écran 15 pouces.

RÔLES GÉRÉS
-----------
Administrateur · Gestionnaire de Compte · Gestionnaire de Structure
(SOS Médecins, CDS, CPTS/MSP) · Régulateur OSNP · Effecteur

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
