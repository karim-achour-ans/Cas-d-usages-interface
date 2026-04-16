/**
 * Render a single offer card using the DSFR fr-card component.
 * Layout: left column (info) + right column (slots).
 *
 * @param {Object} offer - Parsed HealthOffer display object
 * @returns {string} HTML string
 */
function renderCard(offer) {
  const displayName = formatDisplayName(offer);
  const addressLine = formatAddress(offer.address);
  const hasSlots    = offer.slotStarts?.length > 0;
  
  // Données pour le panneau latéral (encodées en JSON dans data-attributes)
  const panelData = {
    name: displayName,
    specialty: [offer.profession, offer.specialty].filter(Boolean).join(' — '),
    phone: offer.phone,
    address: addressLine,
    addressDetails: offer.address, // Pour coordonnées GPS si disponibles
    slots: offer.slotStarts?.map(formatSlotTime) || [],
    // ⬇️ VOS INFORMATIONS "PS" À PERSONNALISER ⬇️
    ps: offer.notes || offer.additionalInfo || "Aucune information complémentaire.",
    access: offer.accessibility || "Accessible PMR",
    tariffs: offer.tariffInfo || "Tarif conventionné Sécurité Sociale",
    languages: offer.languages || [],
    teleconsultation: offer.teleconsultation || false
  };

  return `
    <article class="fr-col-12 js-practitioner-card" 
             data-panel='${JSON.stringify(panelData).replace(/'/g, "&apos;")}'>
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content sas-card-layout">

            <!-- Left column: practitioner info -->
            <div class="sas-card-info">

              <h3 class="fr-card__title fr-mb-0">
                ${displayName || '—'}
              </h3>

              ${offer.profession || offer.specialty ? `
              <p class="fr-card__detail fr-mb-0">
                ${[offer.profession, offer.specialty].filter(Boolean).join(' — ')}
              </p>` : ''}

              ${offer.phone ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                <a href="tel:${offer.phone}">${offer.phone}</a>
              </p>` : ''}

              ${addressLine ? `
              <p class="fr-text--sm fr-text--default-grey fr-mb-0">
                ${addressLine}
              </p>` : ''}

              <!-- Bouton avec classe js-open-panel pour ouvrir le panel -->
              <button class="fr-btn fr-btn--sm fr-btn--primary sas-book-btn js-open-panel" 
                      aria-label="Voir les détails de ${displayName || 'ce professionnel'}">
                Voir détails
              </button>
            </div>

            <!-- Right column: available slots -->
            <div class="sas-card-slots">
              ${hasSlots
                ? offer.slotStarts.map(start => `
                    <button class="fr-btn fr-btn--sm fr-btn--secondary sas-slot-btn js-open-panel">
                      ${formatSlotTime(start)}
                    </button>`
                  ).join('')
                : `<p class="fr-text--sm fr-text--mention-grey fr-mb-0">
                     Aucun créneau disponible
                   </p>`
              }
            </div>

          </div>
        </div>
      </div>
    </article>
  `;
}