function addIndispoFromJSON(data) {
    if (!data) return;

    const { start_date, end_date, address, status } = data;
    const tableBody = document.querySelector("#indispo_table tbody");

    const newRow = document.createElement("tr");

    // --- Start date
    const startDateCell = document.createElement("td");
    startDateCell.textContent = start_date;

    // --- End date
    const endDateCell = document.createElement("td");
    endDateCell.textContent = end_date || "Non déterminé";

    // --- Address
    const addressCell = document.createElement("td");
    addressCell.textContent = address;

    // --- Status
    const statusCell = document.createElement("td");
    statusCell.textContent = status;

    // --- Button column
    const buttonCell = document.createElement("td");
    if (status.toLowerCase() !== "terminé") {
        const btn = document.createElement("button");
        btn.textContent = "Mettre à jour l'indisponibilité";
        btn.onclick = () => updateIndispo(btn);
        buttonCell.appendChild(btn);
    } else {
        buttonCell.textContent = "-";
    }

    // Append all cells
    newRow.appendChild(startDateCell);
    newRow.appendChild(endDateCell);
    newRow.appendChild(addressCell);
    newRow.appendChild(statusCell);
    newRow.appendChild(buttonCell); // <-- new column

    // Add row to table
    tableBody.appendChild(newRow);
}


function updateIndispo(button) {
    const row = button.closest("tr");
    const address = row.children[2].textContent;
    alert(`Mettre à jour l'indisponibilité pour ${address}`);
}

function loadIndispos() {
    fetch("indispo.json")
        .then(response => {
            if (!response.ok) throw new Error("Erreur de chargement du fichier indispo.json");
            return response.json();
        })
        .then(json => {
            if (json.indispos && Array.isArray(json.indispos)) {
                // 🧩 Sort descending by start_date
                json.indispos.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

                // Clear existing table rows before adding new ones
                const tableBody = document.querySelector("#indispo_table tbody");
                tableBody.innerHTML = "";

                // Add sorted rows
                json.indispos.forEach(indispo => addIndispoFromJSON(indispo));
            } else {
                console.error("Format JSON invalide : attendu { indispos: [ ... ] }");
            }
        })
        .catch(err => console.error(err));
}

// Auto-load data when page is ready
document.addEventListener("DOMContentLoaded", loadIndispos);