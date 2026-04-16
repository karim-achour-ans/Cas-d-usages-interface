function updateIndispo(button) {
    const row = button.closest("tr");

    // Read values from row cells
    const start = row.children[0].textContent;
    const end   = row.children[1].textContent !== "Non déterminé" ? row.children[1].textContent : "";
    const lieux = row.children[2].textContent.split(",").map(v => v.trim());

    // Fill modal inputs
    document.getElementById("update_start_date").value = start;
    document.getElementById("update_end_date").value   = end;

    // Check undetermined if no end date
    document.getElementById("update_undetermined").checked = !end;

    // Reset checkboxes
    document.querySelectorAll("#update_checkboxes input").forEach(chk => {
        chk.checked = lieux.includes(chk.value);
    });

    // Update hidden value
    document.getElementById("update_address").value = lieux.join(", ");

    // Show modal
    document.getElementById("updateModal").style.display = "block";
}

function closeUpdateModal() {
    document.getElementById("updateModal").style.display = "none";
}

let expandedUpdate = false;
function toggleCheckboxesUpdate() {
    expandedUpdate = !expandedUpdate;
    document.getElementById("update_checkboxes").style.display = expandedUpdate ? "block" : "none";
}

function updateSelectedUpdate() {
    const checked = Array.from(document.querySelectorAll("#update_checkboxes input:checked"))
                        .map(c => c.value);

    document.getElementById("update_address").value = checked.join(", ");
    document.querySelector("#updateModal select option").textContent =
        checked.length ? checked.join(", ") : "-- Modifier les adresses --"
}
