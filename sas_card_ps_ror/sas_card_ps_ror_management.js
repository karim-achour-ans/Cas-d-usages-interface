document.addEventListener("DOMContentLoaded", function () {
    fetch("card_ps_ror.json")
        .then(response => response.json())
        .then(data => displayPractitioners(data.practitioners))
        .catch(error => console.error("Error loading JSON:", error));
});

function displayPractitioners(practitioners) {
    const container = document.getElementById("div_display_card_pas_ror_list");
    container.innerHTML = ""; // Clear previous content

    practitioners.forEach(practitioner => {
        // Create the main practitioner card container
        const card = document.createElement("div");
        card.classList.add("sas_search_card");

        // Left column (col_one_elements)
        const colOne = document.createElement("div");
        colOne.classList.add("col_one_elements");

        const divHealthOfferTitleOne = document.createElement("div");
        divHealthOfferTitleOne.classList.add("div_health_offer_title");

        divHealthOfferTitleOne.innerHTML = `
            <h2 class="health_offer_title">${practitioner.name}</h2>
            <p class="health_offer_profession">${practitioner.profession}</p>
            <p class="health_offer_convention">${practitioner.convention}</p>
            <p class="health_offer_adress">${practitioner.address}</p>
            <p>${practitioner.patients_accepted}</p>
        `;

        const divAgendaPractitioner = document.createElement("div");
        divAgendaPractitioner.classList.add("div_agenda_practitioner");

        divAgendaPractitioner.innerHTML = `
        <h2 class="health_offer_title">Agenda</h2>
        <div class="agenda_grid">
          <p class="agenda_slot">11h</p>
          <p class="agenda_slot">12h</p>
          <p class="agenda_slot">13h</p>
          <p class="agenda_slot">14h</p>
          <p class="agenda_slot">15h</p>
          <p class="agenda_slot">16h</p>
        </div>
      `;

        colOne.appendChild(divHealthOfferTitleOne);
        colOne.appendChild(divAgendaPractitioner);

        // Right column (col_two_elements)
        const colTwo = document.createElement("div");
        colTwo.classList.add("col_two_elements");

        const divHealthOfferTitleTwo = document.createElement("div");
        divHealthOfferTitleTwo.classList.add("div_health_offer_title");

        divHealthOfferTitleTwo.innerHTML = `
            <p class="health_offer_contact">${practitioner.contact}</p>
        `;

        // Sections for activities, specific acts, and equipment
        divHealthOfferTitleTwo.appendChild(createListSection("Activité opérationelle", practitioner.operational_activity));
        divHealthOfferTitleTwo.appendChild(createListSection("Actes spécifiques", practitioner.specific_acts));
        divHealthOfferTitleTwo.appendChild(createListSection("Equipements", practitioner.equipment));

        // Additional info (textarea)
        const additionalInfo = document.createElement("textarea");
        additionalInfo.disabled = true;
        additionalInfo.textContent = practitioner.additional_info;

        divHealthOfferTitleTwo.appendChild(additionalInfo);
        colTwo.appendChild(divHealthOfferTitleTwo);

        // Append columns to the main card
        card.appendChild(colOne);
        card.appendChild(colTwo);

        // Append card to the container
        container.appendChild(card);
    });
}

// Function to create list sections dynamically
function createListSection(title, items) {
    const section = document.createElement("div");
    const titleElement = document.createElement("p");
    titleElement.textContent = title;
    section.appendChild(titleElement);

    const ul = document.createElement("ul");
    ul.classList.add("health_offer_specialty_list");

    items.forEach(item => {
        const li = document.createElement("li");
        li.classList.add("health_offer_specialty");
        li.textContent = item;
        ul.appendChild(li);
    });

    section.appendChild(ul);
    return section;
}
