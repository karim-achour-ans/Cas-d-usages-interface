// ─── Configuration pagination ───────────────────────────────────────────────
let allData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 10;
let sortCol = null;
let sortDir = 1;
let lastFocusedRow = null; // pour restituer le focus après fermeture modale

// ─── Mapping statuts → badges DSFR ─────────────────────────────────────────
const STATUS_MAP = {
    "RDV Honoré":           { cls: "fr-badge--success", icon: "ti-circle-check" },
    "RDV pris et confirmé": { cls: "fr-badge--info",    icon: "ti-calendar-check" },
    "RDV annulé":           { cls: "fr-badge--error",   icon: "ti-circle-x" },
    "RDV en attente":       { cls: "fr-badge--warning", icon: "ti-clock" },
};

function getStatusBadge(status) {
    const s = STATUS_MAP[status] || { cls: "fr-badge--new", icon: "ti-circle" };
    return `<span class="fr-badge ${s.cls}"><i class="ti ${s.icon}" aria-hidden="true"></i>${status || "N/A"}</span>`;
}

// ─── Logique d'affichage effecteur/structure ────────────────────────────────
function buildPractitionerDisplay(practitioner, organization) {
    const pName  = practitioner.practitioner === "NA" ? null : practitioner.practitioner;
    const oTitle = organization.organization_title === "NA" ? null : organization.organization_title;

    if (pName && oTitle && pName !== oTitle) {
        return `${pName}<br><span class="td-sub">${oTitle}</span>`;
    } else if (pName)  { return pName; }
    else if (oTitle)   { return oTitle; }
    return '<span class="td-na">—</span>';
}

// ─── Label accessible pour une ligne ────────────────────────────────────────
function buildRowAriaLabel(a, p, o) {
    const who = (p.practitioner !== "NA" && p.practitioner)
        ? p.practitioner
        : (o.organization_title !== "NA" ? o.organization_title : "Effecteur inconnu");
    return `Rendez-vous ${a.appointment_status || ""} — ${who} — ${a.appointment_date || ""}. Appuyez sur Entrée pour voir les détails.`;
}

// ─── Annonce lecteur d'écran ─────────────────────────────────────────────────
function announce(message) {
    const region = document.getElementById("liveRegion");
    if (region) {
        region.textContent = "";
        // Petit délai pour forcer la re-lecture par les AT
        setTimeout(() => { region.textContent = message; }, 50);
    }
}

// ─── Chargement des données ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
    fetch("appointment_data.json")
        .then(response => response.json())
        .then(data => {
            allData = data;
            filteredData = [...allData];
            render();
        })
        .catch(error => console.error("Erreur lors du chargement du JSON:", error));

    // Boutons filtres
    document.getElementById("search_filter").addEventListener("click", applyFilters);
    document.getElementById("reset_filter").addEventListener("click", resetFilters);
    document.getElementById("pageSizeSelect").addEventListener("change", function () {
        pageSize = parseInt(this.value);
        currentPage = 1;
        render();
    });

    // Tri par en-têtes — clic ET clavier (Entrée / Espace)
    document.querySelectorAll("thead th[data-col]").forEach(th => {
        th.addEventListener("click", function () {
            sortBy(this.dataset.col);
        });
        th.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                sortBy(this.dataset.col);
            }
        });
    });

    // Fermeture modale par Échap
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            const modal = document.getElementById("appointmentModal");
            if (modal.style.display === "block") closeModal();
        }
    });

    // Clic sur le fond de la modale
    document.getElementById("appointmentModal").addEventListener("click", function (e) {
        if (e.target === this) closeModal();
    });
});

// ─── Filtres ─────────────────────────────────────────────────────────────────
function applyFilters() {
    const drm    = document.getElementById("drm_id").value.trim().toLowerCase();
    const nat    = document.getElementById("practioner_nat_id").value.trim().toLowerCase();
    const ds     = document.getElementById("date_start").value;
    const de     = document.getElementById("date_end").value;
    const name   = document.getElementById("filter_name").value.trim().toLowerCase();
    const status = document.getElementById("filter_status").value;

    filteredData = allData.filter(item => {
        const a = item.appointment;
        const p = item.practitioner;
        const o = item.organization;

        if (drm) {
            const drmVal = a.drm_id ? String(a.drm_id).toLowerCase() : "";
            if (!drmVal.includes(drm)) return false;
        }
        if (nat) {
            const rpps  = (p.practitioner_nat_id || "").toLowerCase();
            const fines = (o.organization_nat_id  || "").toLowerCase();
            if (!rpps.includes(nat) && !fines.includes(nat)) return false;
        }
        if (ds || de) {
            const rawDate = a.created_date || "";
            const match = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
                const isoDate = `${match[3]}-${match[2]}-${match[1]}`;
                if (ds && isoDate < ds) return false;
                if (de && isoDate > de) return false;
            }
        }
        if (name) {
            const pName = (p.practitioner || "").toLowerCase();
            const oName = (o.organization_title || "").toLowerCase();
            if (!pName.includes(name) && !oName.includes(name)) return false;
        }
        if (status && a.appointment_status !== status) return false;

        return true;
    });

    currentPage = 1;
    render();

    const total = filteredData.length;
    announce(`${total} résultat${total > 1 ? "s" : ""} trouvé${total > 1 ? "s" : ""}`);
}

function resetFilters() {
    ["drm_id", "practioner_nat_id", "date_start", "date_end", "filter_name", "filter_status"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    filteredData = [...allData];
    currentPage = 1;
    render();
    announce("Filtres réinitialisés. " + allData.length + " rendez-vous affichés.");
}

// ─── Tri ──────────────────────────────────────────────────────────────────────
function sortBy(col) {
    if (sortCol === col) sortDir *= -1;
    else { sortCol = col; sortDir = 1; }

    // Reset aria-sort + flèches visuelles
    document.querySelectorAll("thead th[data-col]").forEach(th => {
        th.setAttribute("aria-sort", "none");
    });
    document.querySelectorAll(".sort-arrow").forEach(el => {
        el.textContent = "↕";
        el.style.color = "#999";
    });

    const th = document.querySelector(`thead th[data-col="${col}"]`);
    if (th) th.setAttribute("aria-sort", sortDir === 1 ? "ascending" : "descending");

    const arrow = document.getElementById("sort-" + col);
    if (arrow) {
        arrow.textContent = sortDir === 1 ? "↑" : "↓";
        arrow.style.color = "#000091";
    }

    filteredData.sort((a, b) => {
        let av = "", bv = "";
        if (col === "drm")       { av = String(a.appointment.drm_id  || ""); bv = String(b.appointment.drm_id  || ""); }
        if (col === "source")    { av = a.appointment.appointment_source  || ""; bv = b.appointment.appointment_source  || ""; }
        if (col === "created")   { av = a.appointment.created_date     || ""; bv = b.appointment.created_date     || ""; }
        if (col === "date")      { av = a.appointment.appointment_date || ""; bv = b.appointment.appointment_date || ""; }
        if (col === "specialty") { av = a.practitioner.practitioner_specialty || ""; bv = b.practitioner.practitioner_specialty || ""; }
        if (col === "status")    { av = a.appointment.appointment_status || ""; bv = b.appointment.appointment_status || ""; }
        if (col === "territory") { av = a.appointment.appointment_sas_territory || ""; bv = b.appointment.appointment_sas_territory || ""; }
        return av.localeCompare(bv, "fr") * sortDir;
    });

    render();
    announce(`Tableau trié par ${col}, ordre ${sortDir === 1 ? "croissant" : "décroissant"}`);
}

// ─── Rendu tableau + pagination ──────────────────────────────────────────────
function render() {
    const tbody     = document.querySelector("#div_table tbody");
    const emptyState = document.getElementById("emptyState");
    const total     = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const page  = filteredData.slice(start, start + pageSize);

    document.getElementById("totalCount").textContent =
        total + " résultat" + (total > 1 ? "s" : "");

    tbody.innerHTML = "";

    if (total === 0) {
        emptyState.style.display = "block";
    } else {
        emptyState.style.display = "none";
        page.forEach((item, idx) => {
            const a = item.appointment;
            const p = item.practitioner;
            const o = item.organization;

            const drmDisplay = a.drm_id
                ? `<span class="td-mono">${a.drm_id}</span>`
                : `<span class="td-na">Non renseignée</span>`;

            const practitionerDisplay = buildPractitionerDisplay(p, o);
            const specialty = (p.practitioner_specialty !== "NA" && p.practitioner_specialty)
                ? p.practitioner_specialty
                : `<span class="td-na">—</span>`;

            const tr = document.createElement("tr");
            // Rendre la ligne focusable et activable au clavier
            tr.setAttribute("tabindex", "0");
            tr.setAttribute("role", "row");
            tr.setAttribute("aria-label", buildRowAriaLabel(a, p, o));
            tr.setAttribute("data-idx", start + idx);

            tr.innerHTML = `
                <td>${drmDisplay}</td>
                <td>${a.appointment_source || "N/A"}</td>
                <td class="td-date">${a.created_date || "N/A"}</td>
                <td class="td-date">${a.appointment_date || "N/A"}</td>
                <td>${practitionerDisplay}</td>
                <td>${specialty}</td>
                <td>${getStatusBadge(a.appointment_status)}</td>
                <td class="td-territory">${a.appointment_sas_territory || "N/A"}</td>
            `;

            const openRow = () => {
                lastFocusedRow = tr;
                openModal(a, item.operator, p, o);
            };

            tr.addEventListener("click", openRow);
            tr.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRow();
                }
            });

            tbody.appendChild(tr);
        });
    }

    renderPaginationInfo(start, total);
    renderPaginationControls(totalPages);
}

// ─── Info pagination ──────────────────────────────────────────────────────────
function renderPaginationInfo(start, total) {
    const end = Math.min(start + pageSize, total);
    document.getElementById("pagInfo").textContent =
        total === 0 ? "Aucun résultat" : `${start + 1}–${end} sur ${total}`;
}

// ─── Contrôles pagination ─────────────────────────────────────────────────────
function renderPaginationControls(totalPages) {
    const c = document.getElementById("pagControls");

    const btn = (label, page, disabled, isActive, ariaLabel) =>
        `<button class="pag-btn${isActive ? " pag-btn--active" : ""}"
            onclick="goPage(${page})"
            ${disabled ? "disabled aria-disabled='true'" : ""}
            ${isActive ? "aria-current='page'" : ""}
            ${ariaLabel ? `aria-label="${ariaLabel}"` : `aria-label="Page ${page}"`}>
            ${label}
        </button>`;

    let html = "";
    html += btn('<i class="ti ti-chevrons-left" aria-hidden="true"></i>', 1, currentPage === 1, false, "Première page");
    html += btn('<i class="ti ti-chevron-left" aria-hidden="true"></i>',  currentPage - 1, currentPage === 1, false, "Page précédente");

    const range = [];
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) range.push(i);

    if (range[0] > 1) html += `<span class="pag-btn" aria-hidden="true">…</span>`;
    range.forEach(i => { html += btn(i, i, false, i === currentPage); });
    if (range[range.length - 1] < totalPages) html += `<span class="pag-btn" aria-hidden="true">…</span>`;

    html += btn('<i class="ti ti-chevron-right" aria-hidden="true"></i>',  currentPage + 1, currentPage === totalPages, false, "Page suivante");
    html += btn('<i class="ti ti-chevrons-right" aria-hidden="true"></i>', totalPages,       currentPage === totalPages, false, "Dernière page");

    c.innerHTML = html;
}

function goPage(p) {
    const total = Math.max(1, Math.ceil(filteredData.length / pageSize));
    currentPage = Math.max(1, Math.min(p, total));
    render();
    // Replacer le focus sur le premier élément du tableau
    setTimeout(() => {
        const firstRow = document.querySelector("#div_table tbody tr");
        if (firstRow) firstRow.focus();
    }, 50);
}

// ─── Modale + focus trap ──────────────────────────────────────────────────────
function openModal(appointment, operator, practitioner, organization) {
    const modal        = document.getElementById("appointmentModal");
    const modalContent = document.getElementById("modalContent");

    const territories = appointment.appointment_sas_territory
        ? appointment.appointment_sas_territory.split(",").map(t => t.trim())
        : [];

    const territoryHTML = territories.length > 1
        ? `<select class="fr-select fr-select--sm" id="territorySelect" aria-label="Territoire SAS">
               ${territories.map(t => `<option value="${t}">${t}</option>`).join("")}
           </select>`
        : (territories[0] || "N/A");

    const drmHTML = (!appointment.drm_id || appointment.drm_id === "N/A")
        ? `<input type="text" class="fr-input fr-input--sm" id="drmInput"
               aria-label="Clé d'échange LRM"
               placeholder="Entrer la clé d'échange">`
        : `<span class="td-mono">${appointment.drm_id}</span>`;

    const na = (val) => (!val || val === "NA") ? '<span class="td-na">—</span>' : val;

    modalContent.innerHTML = `
        <h2 id="modalMainTitle" class="modal-title">
            <i class="ti ti-calendar-event" aria-hidden="true"></i>
            Rendez-vous
            <span class="modal-id">#${appointment.appointment_id}</span>
            ${getStatusBadge(appointment.appointment_status)}
        </h2>

        <div class="modal-section">
            <div class="modal-section-title" id="section-rdv">
                <i class="ti ti-calendar" aria-hidden="true"></i> Informations rendez-vous
            </div>
            <table class="modal-table" aria-labelledby="section-rdv">
                <tbody>
                    <tr><th scope="row">Clé LRM</th><td>${drmHTML}</td></tr>
                    <tr><th scope="row">Référence</th><td class="td-mono">${na(appointment.appointment_reference_id)}</td></tr>
                    <tr><th scope="row">Type</th><td>${na(appointment.appointment_type)}</td></tr>
                    <tr><th scope="row">Source</th><td>${na(appointment.appointment_source)}</td></tr>
                    <tr><th scope="row">Enregistrement</th><td>${na(appointment.created_date)}</td></tr>
                    <tr><th scope="row">Date du RDV</th><td><strong>${na(appointment.appointment_date)}</strong></td></tr>
                    <tr><th scope="row">Adresse</th><td>${na(appointment.appointment_address)}</td></tr>
                    <tr><th scope="row">Statut</th><td>${getStatusBadge(appointment.appointment_status)}</td></tr>
                    <tr><th scope="row">Territoire SAS</th><td>${territoryHTML}</td></tr>
                </tbody>
            </table>
        </div>

        <div class="modal-section">
            <div class="modal-section-title" id="section-effecteur">
                <i class="ti ti-stethoscope" aria-hidden="true"></i> Effecteur de soins
            </div>
            <table class="modal-table" aria-labelledby="section-effecteur">
                <tbody>
                    <tr><th scope="row">Praticien</th><td>${na(practitioner.practitioner)}</td></tr>
                    <tr><th scope="row">RPPS</th><td class="td-mono">${na(practitioner.practitioner_nat_id)}</td></tr>
                    <tr><th scope="row">Spécialité</th><td>${na(practitioner.practitioner_specialty)}</td></tr>
                    <tr><th scope="row">Participation SAS</th><td>${na(practitioner.practitioner_sas_modality)}</td></tr>
                </tbody>
            </table>
        </div>

        <div class="modal-section">
            <div class="modal-section-title" id="section-org">
                <i class="ti ti-building-hospital" aria-hidden="true"></i> Organisation
            </div>
            <table class="modal-table" aria-labelledby="section-org">
                <tbody>
                    <tr><th scope="row">FINESS / SIRET</th><td class="td-mono">${na(organization.organization_nat_id)}</td></tr>
                    <tr><th scope="row">Type</th><td>${na(organization.organization_type)}</td></tr>
                    <tr><th scope="row">Nom</th><td>${na(organization.organization_title)}</td></tr>
                    <tr><th scope="row">Participation SAS</th><td>${na(organization.organization_sas_modality)}</td></tr>
                </tbody>
            </table>
        </div>

        <div class="modal-section">
            <div class="modal-section-title" id="section-reg">
                <i class="ti ti-headset" aria-hidden="true"></i> Régulateur
            </div>
            <table class="modal-table" aria-labelledby="section-reg">
                <tbody>
                    <tr><th scope="row">Nom</th><td>${na(operator.operator_fullname)}</td></tr>
                    <tr><th scope="row">Email</th><td><a href="mailto:${operator.email}" class="modal-link">${na(operator.email)}</a></td></tr>
                    <tr><th scope="row">Territoire</th><td>${na(operator.operator_sas_territory)}</td></tr>
                    <tr><th scope="row">Statut du compte</th><td><span class="fr-badge fr-badge--success"><i class="ti ti-circle-check" aria-hidden="true"></i>Actif</span></td></tr>
                </tbody>
            </table>
        </div>

        <div class="modal-footer">
            <button class="fr-btn fr-btn--secondary" id="modalFooterClose" onclick="closeModal()">Fermer</button>
        </div>
    `;

    modal.style.display = "block";

    // Focus sur le titre de la modale
    setTimeout(() => {
        const title = modalContent.querySelector("#modalMainTitle");
        if (title) { title.setAttribute("tabindex", "-1"); title.focus(); }
    }, 50);

    // Focus trap
    modal.addEventListener("keydown", trapFocus);
}

function closeModal() {
    const modal = document.getElementById("appointmentModal");
    modal.style.display = "none";
    modal.removeEventListener("keydown", trapFocus);
    // Restituer le focus à la ligne du tableau qui a ouvert la modale
    if (lastFocusedRow) {
        lastFocusedRow.focus();
        lastFocusedRow = null;
    }
}

// ─── Focus trap pour la modale (RGAA 10.8) ──────────────────────────────────
function trapFocus(e) {
    if (e.key !== "Tab") return;
    const modal = document.getElementById("appointmentModal");
    const focusable = Array.from(
        modal.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.closest('[aria-hidden="true"]'));

    if (focusable.length === 0) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
}