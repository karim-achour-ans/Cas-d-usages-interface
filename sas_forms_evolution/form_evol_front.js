function sas_inscription() {
    const selectElement = document.getElementById("slct_participation");
    const selectValue = selectElement.value;

    if (selectValue === "sas_ko") {
        document.getElementById("sas_participation_p").innerHTML = "Je refuse d'être contacté en sus de mes disponibilités par la régulation SAMU / SAS";
        document.getElementById("adress_container_sas_description").innerHTML = "Le professionnel n'est pas inscrit au SAS";
    } else if (selectValue === "sas_ok") {
        document.getElementById("sas_participation_p").innerHTML = "J'accepte d'être contacté en sus de mes disponibilités par la régulation SAMU / SAS";
        document.getElementById("adress_container_sas_description").innerHTML = "Le professionnel est inscrit au SAS, il peut être contacté en sus des disponibilités pour l'ensemble de ses lieux d'activité";
    } else {
        document.getElementById("sas_participation_p").innerHTML = "Vous n'avez pas renseigné votre participation au SAS";
        document.getElementById("adress_container_sas_description").innerHTML = "Le professionnel n'est pas inscrit au SAS";
    }
}

function sas_availabilities_choice() {
    const div_editor_list = document.getElementById("div_editor_list");
    const editor_exist = document.getElementById('npt_editor_exist');
    const editor_engagement = document.getElementById('npt_editor_engagement');
    const output = document.getElementById('output');

    const description_text = document.getElementById("editor_interfaced_indiv_status");

    if (editor_exist.checked) {
        editor_engagement.disabled = false;
    } else if (editor_exist.checked === false) {
        editor_engagement.checked = false;
        editor_engagement.disabled = true;
        description_text.innerHTML = "Le professionnel déclare ne pas avoir d'éditeur en ligne"
    }

    if (editor_engagement.checked === false) {
        div_editor_list.style.display = "none";
        description_text.innerHTML = ""
    }

    if (editor_exist.checked && editor_engagement.checked) {
        div_editor_list.style.display = "block";
        description_text.innerHTML = "Le professionnel accepte que la plateforme remonte ses créneaux individuels en ligne, la plateforme partagera à la régulation les créneaux grand public / Pro / SNP"
    }
}

function sas_schedule_engagment() {
    const editor_not_exist = document.getElementById("npt_editor_not_exist");
    const sas_schedule_engagement = document.getElementById("npt_sas_schedule_engagement");
    const sas_schedule_indiv_status = document.getElementById("sas_schedule_indiv_status");

    if (editor_not_exist.checked) {
        sas_schedule_engagement.disabled = false;
    } else if (editor_not_exist.checked === false) {
        sas_schedule_engagement.disabled = true;
        sas_schedule_engagement.checked = false;
    }

    if (sas_schedule_engagement.checked) {
        sas_schedule_indiv_status.innerHTML = "Le professionnel s'engage à renseigner 2h par semaine dans l'agenda de la plateforme numérique SAS"
    } else {
        sas_schedule_indiv_status.innerHTML = ""
    }
}

function sas_add_structure() {
    const locationElements = document.getElementsByClassName("chk_adress");

    // Iterate through all checkboxes
    for (let i = 0; i < locationElements.length; i++) {
        const locationElement = locationElements[i];
        const locationSelected = locationElement.id.split("_")[1];

        // Show or hide the corresponding div based on the checkbox state
        const targetDiv = document.getElementById("div_add_structure_adress_" + locationSelected);
        if (locationElement.checked) {
            targetDiv.style.display = "block";
        } else {
            targetDiv.style.display = "none";
        }
    }
}

var elements = document.querySelectorAll('[class*="_location_"]');


function create_div_sas_structure() {
    const ntpElements = document.getElementsByClassName("btn_form");

    // Loop through each button and check if the event listener is already added
    for (let i = 0; i < ntpElements.length; i++) {
        const button = ntpElements[i];

        // Check if the button already has a listener attached
        if (!button.dataset.listenerAdded) {
            button.addEventListener("click", function(event) {
                // Get the ID of the clicked button
                const ntpElementId = event.target.id;

                // Extract structure location and type from the button ID
                const structureLocation = ntpElementId.split("_")[4];
                const structureType = ntpElementId.split("_")[2];

                // Determine the target div to add the structure
                let divAddStructureLocation;
                if (structureType === "CPTS") {
                    divAddStructureLocation = document.getElementById("div_add_cpts_location_" + structureLocation);
                } else if (structureType === "MSP") {
                    divAddStructureLocation = document.getElementById("div_add_msp_location_" + structureLocation);
                } else {
                    console.error("Unknown structure type:", structureType);
                    return; // Exit if the structure type is invalid
                }

                // Ensure the target location exists
                if (!divAddStructureLocation) {
                    console.error("Target div not found for location:", structureLocation);
                    return;
                }

                // Create a new div for the structure
                const addNewStructure = document.createElement("div");
                addNewStructure.className = "add_new_structure";
                addNewStructure.id = `add_new_${structureType.toLowerCase()}_${structureLocation}`;

                // Create a label and input for the new structure
                const labelStructure = document.createElement("label");
                labelStructure.innerHTML = `Renseigner votre ${structureType} : `;

                const inputStructure = document.createElement("input");
                inputStructure.type = "text";
                inputStructure.placeholder = `Renseigner votre ${structureType}`;
                inputStructure.className = `${structureType}_location_${structureLocation}`;

                // Append the input to the label, and both to the new div
                labelStructure.appendChild(inputStructure);
                addNewStructure.appendChild(labelStructure);

                // Append the new structure div to the target location
                divAddStructureLocation.appendChild(addNewStructure);
            });

            // Mark this button as having a listener
            button.dataset.listenerAdded = true;
        }
    }

    elements = document.querySelectorAll('[class*="_location_"]');
}

// Call the function once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    create_div_sas_structure();
});

function cpts_location_inscription() {
const locationElements = document.getElementsByClassName("cpts_location");

// Iterate through all checkboxes
for (let i = 0; i < locationElements.length; i++) {
    const locationElement = locationElements[i];
    const locationSelected = locationElement.id.split("_")[2];

    // Get the target div
    const targetDiv = document.getElementById("div_adress_" + locationSelected);
    const existingP = document.getElementById("p_cpts_adress_" + locationSelected);
    const existingDiv = document.getElementById("div_cpts_adress_" + locationSelected);

    if (locationElement.checked) {
        // Only create the <p> if it doesn't already exist
        if (!existingP) {
            const div_cpts_adress = document.createElement("div");
            div_cpts_adress.id = "div_cpts_adress_" + locationSelected;
            const p_cpts_participant = document.createElement("p");
            p_cpts_participant.id = "p_cpts_adress_" + locationSelected;
            p_cpts_participant.innerHTML = "Le professionnel participe via sa CPTS à cette adresse";
            div_cpts_adress.appendChild(p_cpts_participant)
            targetDiv.appendChild(div_cpts_adress);
        }
    } else {
        // Remove the <p> if it exists
        if (existingP) {
            existingDiv.remove();
        }
    }
}
}

function msp_location_inscription() {
const locationElements = document.getElementsByClassName("msp_location");

// Iterate through all checkboxes
for (let i = 0; i < locationElements.length; i++) {
    const locationElement = locationElements[i];
    const locationSelected = locationElement.id.split("_")[2];

    // Get the target div
    const targetDiv = document.getElementById("div_adress_" + locationSelected);
    const existingP = document.getElementById("p_msp_adress_" + locationSelected);
    const existingDiv = document.getElementById("div_msp_adress_" + locationSelected);

    if (locationElement.checked) {
        // Only create the <p> if it doesn't already exist
        if (!existingP) {
            const div_msp_adress = document.createElement("div");
            div_msp_adress.id = "div_msp_adress_" + locationSelected;
            const p_msp_participant = document.createElement("p");
            p_msp_participant.id = "p_msp_adress_" + locationSelected;
            p_msp_participant.innerHTML = "Le professionnel participe via sa MSP à cette adresse";
            div_msp_adress.appendChild(p_msp_participant)
            targetDiv.appendChild(div_msp_adress);
        }
    } else {
        // Remove the <p> if it exists
        if (existingP) {
            existingDiv.remove();
        }
    }
}
}


document.addEventListener('DOMContentLoaded', function () {
// Attach a blur event listener to the document or a common parent element
document.body.addEventListener('blur', function (event) {
    // Check if the clicked element (which lost focus) has a class that contains "_location_"
    if (event.target.className && event.target.className.includes("_location_")) {
        console.log(`You blurred the input with class: ${event.target.className}`);
        add_new_cpts_to_location(event.target); // Pass the input element that lost focus
    }
}, true); // Use capturing phase to catch the blur event on input before it propagates
});

function add_new_cpts_to_location(target) {
// Get structure type (first part of the class)
const structureType = target.className.split('_')[0].toLowerCase();

// Get structure location (third part of the class)
const structureLocation = target.className.split('_')[2];

// Get the target div based on the structure type and location
const targetDiv = document.getElementById("div_" + structureType + "_adress_" + structureLocation);

if (targetDiv) {
    // Create a new <p> element
    const p_structure_value = document.createElement("p");

    // Set the content of the <p> element to the value of the input
    p_structure_value.textContent = "Les créneaux de la structure : " + target.value + " seront affichés à cette adresse via l'éditeur interfacé de la structure";

    // Append the <p> to the target div
    targetDiv.appendChild(p_structure_value);
}
}
