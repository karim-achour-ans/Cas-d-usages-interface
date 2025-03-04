fetch("appointment_data.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP error! Status: " + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log("Loaded JSON data:", data); // Debugging step

        // Ensure data exists
        if (!data || typeof data !== "object") {
            throw new Error("Invalid JSON structure");
        }

        // Select table body
        let tableBody = document.querySelector("#div_table tbody");

        // Create a new table row
        let newRow = document.createElement("tr");

        // Insert table cells with JSON data
        newRow.innerHTML = `
            <td>${data.drm_id}</td>
            <td>${data.created_date}</td>
            <td>${data.appointment_date}</td>
            <td>${data.appointment_start_time}</td>
            <td>${data.practitioner}</td>
            <td>${data.practitioner_specialty}</td>
            <td>${data.appointment_address}</td>
            <td>${data.appointment_status}</td>
        `;

        // Append the new row to the table
        tableBody.appendChild(newRow);
    })
    .catch(error => console.error("Erreur lors du chargement du JSON:", error));
