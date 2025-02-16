document.addEventListener("DOMContentLoaded", function() {
    fetch("../sas_page_components/header.html")
        .then(response => response.text())
        .then(data => document.getElementById("header-container").innerHTML = data);
});