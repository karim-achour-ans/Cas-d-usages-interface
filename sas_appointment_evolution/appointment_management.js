document.addEventListener("DOMContentLoaded", function () {
    fetch("appointment_data.json")
        .then(response => response.json())
        .then(data => {
            console.log("Loaded JSON data:", data);

            let tableBody = document.querySelector("#div_table tbody");

            data.forEach(item => {
                let appointment = item.appointment;
                let operator = item.operator;
                let practitioner = item.practitioner;
                let organization = item.organization;

                if (!appointment || !operator || !practitioner || !organization) {
                    console.error("Invalid data structure", item);
                    return;
                }

                // Check if practitioner.practitioner is "NA", if so use organization.organization_title
                let practitionerName = practitioner.practitioner === "NA" ? organization.organization_title : practitioner.practitioner;
                
                if(organization.organization_title !== "NA" && practitionerName !== organization.organization_title) {
                    practionerToDisplay = practitionerName + "<br> <br>" + organization.organization_title;
                } else if (organization.organization_title === "NA") {
                    practionerToDisplay = practitionerName;
                }
                else {
                    practionerToDisplay = organization.organization_title;
                }

                let newRow = document.createElement("tr");
                newRow.id = `appointment-${appointment.appointment_id}`; // Set unique ID

                newRow.innerHTML = `
                    <td>${appointment.drm_id || "N/A"}</td>
                    <td>${appointment.appointment_source || "N/A"}</td>
                    <td>${appointment.created_date || "N/A"}</td>
                    <td>${appointment.appointment_date || "N/A"}</td>
                    <td>${practionerToDisplay}</td>
                    <td>${practitioner.practitioner_specialty || "N/A"}</td>
                    <td>${appointment.appointment_status || "N/A"}</td>
                    <td>${appointment.appointment_sas_territory || "N/A"}</td>
                `;

                // Add click event to open the modal with appointment details
                newRow.addEventListener("click", function () {
                    openModal(appointment, operator, practitioner, organization);
                });

                tableBody.appendChild(newRow);
            });
        })
        .catch(error => console.error("Erreur lors du chargement du JSON:", error));
});

// Function to open the modal and display appointment details
function openModal(appointment, operator, practitioner, organization) {
    let modal = document.getElementById("appointmentModal");
    let modalContent = document.getElementById("modalContent");

    // Split the territory string into an array if it contains commas
    let territories = appointment.appointment_sas_territory
        ? appointment.appointment_sas_territory.split(',').map(t => t.trim())
        : [];

    let territoryFieldHTML = "";

    if (territories.length > 1) {
        // Create a select dropdown if multiple territories
        territoryFieldHTML = `
            <select id="territorySelect">
                ${territories.map(t => `<option value="${t}">${t}</option>`).join("")}
            </select>
        `;
    } else {
        // Otherwise, just display the single value
        territoryFieldHTML = territories[0] || "N/A";
    }

    let drmFieldHTML = "";

    if (!appointment.drm_id || appointment.drm_id === "N/A") {
        drmFieldHTML = `<input type="text" id="drmInput" placeholder="Entrer clé d'échange" />`;
    } else {
        drmFieldHTML = appointment.drm_id;
    }

    modalContent.innerHTML = `
        <h2>Détails du Rendez-vous</h2>
        <table class="modal-table">
            <tbody>
                <tr><th colspan="2">📅 Information Rendez-vous</th></tr>
                <tr><th>ID Rendez-vous</th><td>${appointment.appointment_id || "N/A"}</td></tr>
                <tr><th>Clé d'échange ?</th><td>${drmFieldHTML}</td></tr>
                <tr><th>Type</th><td>${appointment.appointment_type || "N/A"}</td></tr>
                <tr><th>Source</th><td>${appointment.appointment_source || "N/A"}</td></tr>
                <tr><th>Date et heure d'enregistrement</th><td>${appointment.created_date || "N/A"}</td></tr>
                <tr><th>Date et heure du rendez-vous</th><td>${appointment.appointment_date || "N/A"}</td></tr>
                <tr><th>Adresse</th><td>${appointment.appointment_address || "N/A"}</td></tr>
                <tr><th>Statut</th><td>${appointment.appointment_status || "N/A"}</td></tr>
                <tr><th>Territoire SAS</th><td>${territoryFieldHTML}</td></tr>

                <tr><th colspan="2">👨‍⚕️ Information Effecteur</th></tr>
                <tr><th>Praticien</th><td>${practitioner.practitioner || "N/A"}</td></tr>
                <tr><th>RPPS</th><td>${practitioner.practitioner_nat_id || "N/A"}</td></tr>
                <tr><th>Spécialité</th><td>${practitioner.practitioner_specialty || "N/A"}</td></tr>
                <tr><th>Participation SAS</th><td>${practitioner.practitioner_sas_modality || "N/A"}</td></tr>

                <tr><th colspan="2">📍 Information Organisation</th></tr>
                <tr><th>FINESS/SIRET</th><td>${organization.organization_nat_id || "N/A"}</td></tr>
                <tr><th>Type</th><td>${organization.organization_type || "N/A"}</td></tr>
                <tr><th>Nom</th><td>${organization.organization_title || "N/A"}</td></tr>
                <tr><th>Participation SAS</th><td>${organization.organization_sas_modality || "N/A"}</td></tr>

                <tr><th colspan="2">📞 Information Régulateur</th></tr>
                <tr><th>Nom</th><td>${operator.operator_fullname || "N/A"}</td></tr>
                <tr><th>Email</th><td>${operator.email || "N/A"}</td></tr>
                <tr><th>Territoire</th><td>${operator.operator_sas_territory || "N/A"}</td></tr>
                <tr><th>Statut du Compte</th><td>Actif</td></tr>
            </tbody>
        </table>
        <button class="close-btn" onclick="closeModal()">Fermer</button>
    `;

    modal.style.display = "block";
}

// Function to close the modal
function closeModal() {
    document.getElementById("appointmentModal").style.display = "none";
}

document.getElementById('search_filter').addEventListener('click', function () {
    const drmInput = document.getElementById('drm_id').value.trim().toLowerCase();
    const practitionerInput = document.getElementById('practioner_nat_id').value.trim().toLowerCase();

    const rows = document.querySelectorAll('table tbody tr'); // Adjust selector if needed

    rows.forEach(row => {
        const drmCell = row.children[0].textContent.trim().toLowerCase(); // appointment.drm_id
        const practitionerCell = row.children[4].textContent.trim().toLowerCase(); // practionerToDisplay

        const matchDrm = !drmInput || drmCell.includes(drmInput);
        const matchPractitioner = !practitionerInput || practitionerCell.includes(practitionerInput);

        if (matchDrm && matchPractitioner) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

document.getElementById('reset_filter').addEventListener('click', function () {
    document.getElementById('drm_id').value = '';
    document.getElementById('practioner_nat_id').value = '';
    document.getElementById('appointment_date').value = ''; // Optional: also reset date

    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        row.style.display = '';
    });
});
