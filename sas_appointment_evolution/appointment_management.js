fetch("appointment_data.json")
    .then(response => response.json())
    .then(data => {
        console.log("Loaded JSON data:", data);

        let tableBody = document.querySelector("#div_table tbody");

        // Loop through each appointment in the JSON array
        data.forEach(appointment => {
            let newRow = document.createElement("tr");

            newRow.innerHTML = `
                <td>${appointment.drm_id}</td>
                <td>${appointment.created_date}</td>
                <td>${appointment.appointment_date}</td>
                <td>${appointment.appointment_start_time}</td>
                <td>${appointment.practitioner}</td>
                <td>${appointment.practitioner_specialty}</td>
                <td>${appointment.appointment_address}</td>
                <td>${appointment.appointment_status}</td>
            `;

            tableBody.appendChild(newRow);
        });
    })
    .catch(error => console.error("Erreur lors du chargement du JSON:", error));
