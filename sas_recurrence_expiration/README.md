# Expiration des disponibilités récurrentes — Agenda SAS

Mock pédagogique de la règle d'expiration à 6 mois des créneaux et plages récurrents de l'agenda SAS.

- **À gauche** : l'effecteur crée, prolonge, modifie ou réactive sa récurrence.
- **À droite** : ce que voit la régulation dans la recherche ; un clic sur une occurrence simule une orientation SAS.
- **En haut** : la jauge de temps fait avancer la date simulée de jalon en jalon (relance J-15, désactivation, suppression).
- **En bas** : le journal trace chaque événement et son effet sur l'échéance.

## Règles simulées

| Règle | Comportement |
| --- | --- |
| Échéance | 6 mois après le dernier événement de validité : création, modification, prolongation, réactivation ou orientation SAS sur une occurrence |
| Orientation SAS | Vaut confirmation : elle est toujours faite avec l'accord préalable du médecin |
| Orientation hors disponibilité | Ne compte pas |
| Récurrence multi-jours | Une orientation sur n'importe quelle occurrence valide la récurrence entière |
| Relance | Mail M1 15 jours avant l'échéance |
| Désactivation | À l'échéance : invisible pour la régulation, réactivable par l'effecteur, mail M2 |
| Suppression | 6 mois après la désactivation, sans réactivation |

Hors simulation : reprise du stock existant par vagues, vue gestionnaire de compte, retour d'orientation par la régulation.

## Fichiers

- `index.html` : page du mock (en-tête commun du dépôt)
- `recurrence_expiration.css` : styles propres au mock, chargés après `../template_integration.css`
- `recurrence_expiration.js` : moteur de règles et rendu, sans dépendance

Police Marianne chargée depuis `../sas_bo_unified/vendor/fonts/`. Données fictives (Dr Claire Martin, Créteil). Date de départ de la simulation : 16/10/2026.
