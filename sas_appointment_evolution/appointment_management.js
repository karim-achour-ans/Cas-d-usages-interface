document.addEventListener("DOMContentLoaded", function () {
    fetch("appointment_data.json")
        .then(response => response.json())
        .then(data => {
            console.log("Loaded JSON data:", data);

            let tableBody = document.querySelector("#div_table tbody");

            data.forEach(appointment => {
                let newRow = document.createElement("tr");
                newRow.id = `appointment-${appointment.appointment_id}`; // Set unique ID

                newRow.innerHTML = `
                    <td>${appointment.drm_id}</td>
                    <td>${appointment.created_date}</td>
                    <td>${appointment.appointment_date}</td>
                    <td>${appointment.appointment_start_time}</td>
                    <td>${appointment.practitioner}</td>
                    <td>${appointment.practitioner_nat_id}</td>
                    <td>${appointment.practitioner_specialty}</td>
                    <td>${appointment.appointment_address}</td>
                    <td>${appointment.appointment_status}</td>
                    <td>${appointment.appointment_sas_territory}</td>
                `;

                // Add click event to open the modal with appointment details
                newRow.addEventListener("click", function () {
                    openModal(appointment);
                });

                tableBody.appendChild(newRow);
            });
        })
        .catch(error => console.error("Erreur lors du chargement du JSON:", error));
});

// Function to open the modal and display appointment details
function openModal(appointment) {
    let modal = document.getElementById("appointmentModal");
    let modalContent = document.getElementById("modalContent");

    modalContent.innerHTML = `
        <h2>Détails du Rendez-vous</h2>
        <table class="modal-table">
            <tbody>
                <tr><th>ID du Rendez-vous</th><td>${appointment.appointment_id}</td></tr>
                <tr><th>ID DRM</th><td>${appointment.drm_id}</td></tr>
                <tr><th>Date d'enregistrement</th><td>${appointment.created_date}</td></tr>
                <tr><th>Date du rendez-vous</th><td>${appointment.appointment_date}</td></tr>
                <tr><th>Heure de début</th><td>${appointment.appointment_start_time}</td></tr>
                <tr><th>Effecteur de soins</th><td>${appointment.practitioner}</td></tr>
                <tr><th>ID National Praticien</th><td>${appointment.practitioner_nat_id}</td></tr>
                <tr><th>Spécialité</th><td>${appointment.practitioner_specialty}</td></tr>
                <tr><th>Adresse</th><td>${appointment.appointment_address}</td></tr>
                <tr><th>Statut</th><td>${appointment.appointment_status}</td></tr>
                <tr><th>Territoire SAS</th><td>${appointment.appointment_sas_territory}</td></tr>
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
