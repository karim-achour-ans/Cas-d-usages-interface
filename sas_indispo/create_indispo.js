// === Modal Controls ===
function openModal() {
    document.getElementById("indispoModal").style.display = "block";
}

function closeModal() {
    document.getElementById("indispoModal").style.display = "none";
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById("indispoModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

// === Form Submission ===
document.getElementById("indispoForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const start_date = document.getElementById("start_date").value;
    const end_date = document.getElementById("end_date").value;
    const address = document.getElementById("address").value;

    if (!start_date || !address) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
    }

    // === Determine Status Automatically ===
    const today = new Date();
    const start = new Date(start_date);
    const end = end_date ? new Date(end_date) : null;

    let status = "A venir"; // default
    if (end && today > end) {
        status = "Terminé";
    } else if (today >= start && (!end || today <= end)) {
        status = "En cours";
    } else if (today < start) {
        status = "A venir";
    }

    const newIndispo = {
        start_date,
        end_date: end_date || "Non déterminé",
        address,
        status
    };

    // Add new row to table
    addIndispoFromJSON(newIndispo);

    // Reset and close
    this.reset();
    closeModal();
});