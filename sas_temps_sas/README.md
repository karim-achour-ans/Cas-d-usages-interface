# Temps SAS et suppression des créneaux — Agenda SAS

Mock pédagogique de l'étape 1 (et du début de l'étape 2) de la refonte des disponibilités de l'agenda SAS.

- **À gauche** : l'effecteur (Dr Claire Martin, fictif) crée ses disponibilités depuis la modale « Ajouter une ou plusieurs disponibilités », où l'option « créneau » est remplacée par le **Temps SAS**.
- **À droite** : la card de recherche du régulateur, lancée par journée, sur trois jours.
- **En bas** : le journal trace chaque événement et son effet.

Le mock démarre avant le déploiement : le bouton « Lancer la conversion » transforme les créneaux existants en Temps SAS.

## Règles simulées

| Règle | Comportement |
| --- | --- |
| Types de disponibilité | Temps SAS (demi-journée entière, horaires fixes) ou plage horaire (heures précises, dans une seule demi-journée) |
| Demi-journées | Semaine : 8h–14h et 14h–20h. Samedi : 8h–12h. Dimanche : hors horaires SAS |
| Temps SAS | Matin, après-midi ou les deux ; avec récurrence = chaque semaine, sans récurrence = ponctuel sur la date |
| Priorité | Indisponibilité > disponibilité ponctuelle (plage horaire ou Temps SAS ponctuel) > Temps SAS hebdomadaire |
| Capacité | 1 patient par défaut, comptée par demi-journée ; une plage complète n'est plus affichée |
| Médecin interfacé | Pas de limite de patients. Sous le nom du médecin, la ligne « Disponible SAS » indique ses périodes joignables sur les 3 jours ; les créneaux éditeur qui tombent dans ces périodes sont en vert ; réserver un créneau ne consomme rien |
| Recherche | Par journée ; matin et après-midi en Temps SAS s'affichent sur une ligne 8h00–20h00 |
| Orientation | Clic sur une plage = orientation sur la plage (consomme 1) ; « Orientation hors disponibilité » ne consomme rien |
| Conversion | Créneaux d'une même demi-journée → Temps SAS sur la demi-journée, capacité = nombre de créneaux, RDV conservés |
| Enrichissement par la régulation | Sur les 3 jours affichés : ajouter, confirmer (échéance repoussée de 6 mois), signaler (motif obligatoire, plage non prioritaire, créneaux éditeur conservés), supprimer (motif obligatoire, jour concerné uniquement) |
| Information de l'effecteur | Pas de mail : bloc « Informations de la régulation » dans son agenda ; visible par tous les SAS |

Hors simulation : indisponibilités (règle conservée dans la spécification), « Voir plus de créneaux », « Demande de prise en charge », expiration à 6 mois (voir `../sas_recurrence_expiration/`).

## Fichiers

- `index.html` : page du mock (en-tête commun du dépôt)
- `temps_sas.css` : styles propres au mock, chargés après `../template_integration.css`
- `temps_sas.js` : moteur de règles et rendu, sans dépendance

Police Marianne chargée depuis `../sas_bo_unified/vendor/fonts/`. Données fictives (adresse, téléphone au format réservé à la fiction). Semaine simulée : 26 au 31 octobre 2026.
