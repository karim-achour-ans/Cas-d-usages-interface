/* ==================================================================
   Open-Search — offre de soins.
   Documents « place » regroupés par RPPS → un PS et ses adresses.
   Habilitation « offre_soins » : lecture (consultation) ou écriture (édition).
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id){ return document.getElementById(id); }

const OS_KEY = "bo-sas-opensearch-v3";
function loadIndex(){ try { const r = localStorage.getItem(OS_KEY); if (r) return JSON.parse(r); } catch(e){} return JSON.parse(JSON.stringify(OS_INDEX)); }
function saveIndex(){ try { localStorage.setItem(OS_KEY, JSON.stringify(state.docs)); } catch(e){} }

const state = {
  identityIdx: currentIdentityIdx(),
  docs: loadIndex(),
  view: "list",
  rpps: null,
  editPsa: null,
  search: "",
  fStruct: "",   // filtre type de structure
  fDispo: "",    // filtre disponibilité : "" | "dispo" | "indispo"
  form: null,
};
function identity(){ return IDENTITIES[state.identityIdx]; }
function osLevel(){ return habLevel(identity(), "offre_soins"); }   // null | lecture | ecriture
function osWrite(){ return osLevel() === "ecriture"; }

function groupByPS() {
  const map = new Map();
  state.docs.forEach(d => {
    if (!map.has(d.rpps)) map.set(d.rpps, { rpps:d.rpps, lastname:d.lastname, firstname:d.firstname, title:d.title, profession:d.profession, places:[] });
    map.get(d.rpps).places.push(d);
  });
  const arr = [...map.values()];
  arr.forEach(ps => {
    ps.participationSAS = ps.places.some(p => !!p.agreements);
    ps.dispo = ps.places.some(p => p.dispo);
  });
  return arr;
}
function currentPS() { return groupByPS().find(p => p.rpps === state.rpps); }
function professionLabel(id){ return OS_PROFESSION_LABEL[id] || ("Profession " + id); }
function phoneOf(d){ return (d.phones && d.phones[0] && d.phones[0].number) || ""; }
function modaliteBadge(m){ return `<span class="fr-badge fr-badge--sm os-badge-mod os-badge-mod-${esc(m)}">Via ${esc(m)}</span>`; }
function participationBadge(ok){ return ok ? `<span class="fr-badge fr-badge--sm os-badge-part">Participe au SAS</span>` : `<span class="fr-badge fr-badge--sm os-badge-hors">Hors SAS</span>`; }
/* Statut de disponibilité (badge plat, sans icône) */
function dispoBadge(ok){ return ok ? `<span class="fr-badge fr-badge--sm os-badge-dispo">Disponible</span>` : `<span class="fr-badge fr-badge--sm os-badge-indispo">Indisponible</span>`; }
function structureLabel(s){ return s ? (OS_STRUCTURE_LABEL[s.type] || s.type) : ""; }
function structureBadge(s){ if (!s) return ""; return `<span class="fr-badge fr-badge--sm os-badge-struct os-badge-struct-${esc(s.type)}">${esc(structureLabel(s))}</span>`; }
function psStructure(p){ return p.places[0] && p.places[0].structure; }   // type de structure du PS (identique pour toutes ses adresses)
function geoScoreClass(score){ return score>=90?"geo--exc":score>=75?"geo--good":score>=50?"geo--mid":"geo--low"; }
function fmtD(iso){ if(!iso) return "—"; try { return new Date(iso).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}); } catch(e){ return "—"; } }
function fmtDT(iso){ if(!iso) return "—"; try { return new Date(iso).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); } catch(e){ return "—"; } }

function renderSidebar() {
  const nav = el("sidebar-nav");
  const lvl = osLevel();
  nav.innerHTML =
    `<a class="nav-item nav-portal" href="${urlWithIdentity("index.html", state.identityIdx)}">
       <span class="fr-icon-arrow-left-line" aria-hidden="true"></span>Portail
     </a>` +
    (lvl ? `<div class="nav-level lvl ${osWrite()?"lvl--write":"lvl--read"}">${osWrite()?"Écriture":"Lecture seule"}</div>
     <button class="nav-item is-active" id="nav-os"><span class="fr-icon-search-line" aria-hidden="true"></span>Offre de soins</button>` : "");
  const b = el("nav-os");
  if (b) b.onclick = () => { state.view = "list"; state.rpps = null; render(); };

  const sel = el("identity-select");
  sel.innerHTML = IDENTITIES.map((i, k) => `<option value="${k}">${esc(i.label)}</option>`).join("");
  sel.value = state.identityIdx;
  sel.onchange = () => gotoWithIdentity("opensearch.html", Number(sel.value));
}

function filteredPS(){
  const q = state.search.trim().toLowerCase();
  let list = groupByPS();
  if (state.fStruct) list = list.filter(p => (psStructure(p) || {}).type === state.fStruct);
  if (state.fDispo) list = list.filter(p => state.fDispo === "dispo" ? p.dispo : !p.dispo);
  if (q) list = list.filter(p => (p.lastname+" "+p.firstname+" "+professionLabel(p.profession)+" "+p.rpps+" "+structureLabel(psStructure(p))).toLowerCase().includes(q));
  return list;
}
function renderList() {
  const list = filteredPS();
  const structOpts = Object.keys(OS_STRUCTURE_LABEL).map(k => `<option value="${k}" ${state.fStruct===k?"selected":""}>${esc(OS_STRUCTURE_LABEL[k])}</option>`).join("");
  el("os-view").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Offre de soins</h1>
    <p class="page-sub">Professionnels de santé indexés (sas_consultation_place).</p>
    <div class="filters">
      <div class="f-search">
        <label class="fr-label" for="os-q">Rechercher</label>
        <input class="fr-input" type="search" id="os-q" placeholder="Nom, prénom, profession, RPPS, structure…" value="${esc(state.search)}">
      </div>
      <div class="f-field">
        <label class="fr-label" for="os-fstruct">Structure</label>
        <select class="fr-select" id="os-fstruct"><option value="">Toutes</option>${structOpts}</select>
      </div>
      <div class="f-field">
        <label class="fr-label" for="os-fdispo">Disponibilité</label>
        <select class="fr-select" id="os-fdispo">
          <option value="">Toutes</option>
          <option value="dispo"   ${state.fDispo==="dispo"?"selected":""}>Disponible</option>
          <option value="indispo" ${state.fDispo==="indispo"?"selected":""}>Indisponible</option>
        </select>
      </div>
    </div>
    <p class="result-count">${list.length} professionnel${list.length>1?"s":""}</p>
    <div class="user-list" id="os-list">${list.map(psRow).join("") || `<p class="mock-note" style="padding:1rem 0;">Aucun résultat.</p>`}</div>`;

  const refresh = () => {
    const l = filteredPS();
    el("os-list").innerHTML = l.map(psRow).join("") || `<p class="mock-note" style="padding:1rem 0;">Aucun résultat.</p>`;
    el("os-view").querySelector(".result-count").textContent = `${l.length} professionnel${l.length>1?"s":""}`;
    bindPsRows();
  };
  el("os-q").oninput = (e) => { state.search = e.target.value; refresh(); };
  el("os-fstruct").onchange = (e) => { state.fStruct = e.target.value; refresh(); };
  el("os-fdispo").onchange = (e) => { state.fDispo = e.target.value; refresh(); };
  bindPsRows();
}
function psRow(p){
  return `
    <div class="user-row">
      <div class="user-row__body">
        <div class="user-row__l1">
          <span class="user-row__name">${esc(p.firstname)} ${esc(p.lastname)}</span>
          ${structureBadge(psStructure(p))} ${participationBadge(p.participationSAS)} ${dispoBadge(p.dispo)}
        </div>
        <div class="user-row__l2">${esc(professionLabel(p.profession))} · RPPS ${esc(p.rpps)} · ${p.places.length} adresse${p.places.length>1?"s":""} d'activité</div>
      </div>
      <div class="user-row__actions">
        <button class="act-edit" data-ps="${esc(p.rpps)}">Voir le détail ›</button>
      </div>
    </div>`;
}
function bindPsRows(){
  el("os-view").querySelectorAll("[data-ps]").forEach(b => b.onclick = () => {
    state.rpps = b.dataset.ps; state.view = "detail"; state.editPsa = null; render();
  });
}

function renderDetail() {
  const p = currentPS();
  if (!p) { state.view = "list"; renderList(); return; }
  const s = psStructure(p);
  const d0 = p.places[0];
  const addrs = p.places.map(d => state.editPsa === d.psa ? addrEditForm(d) : addrCard(d)).join("");

  // Bloc données de structure (CDS/MMG : 1 adresse · SOS : multi-adresses PFG/PFC)
  const structNote = s && s.type === "sos"
    ? "SOS Médecins — offre multi-adresses (points fixes de garde/consultation)."
    : (s && (s.type === "cds" ? "Centre de Santé — adresse unique." : "Maison Médicale de Garde — adresse unique."));

  // Dates SAS agrégées (inscription la plus ancienne, participations à plat)
  const inscription = p.places.map(x => x.sas && x.sas.inscription).filter(Boolean).sort()[0];
  const participations = [...new Set(p.places.flatMap(x => (x.sas && x.sas.participations) || []))].sort();

  // Agenda SAS (lecture) — on prend l'agenda de la 1re adresse disponible, sinon la 1re
  const agendaDoc = p.places.find(x => x.dispo) || d0;

  // Historique fusionné, du plus récent au plus ancien
  const history = p.places.flatMap(x => (x.history || []).map(h => ({ ...h, psa: x.psa, addr: x.address.city })))
                          .sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  el("os-view").innerHTML = `
    <nav class="fr-breadcrumb" style="margin:0 0 .5rem;">
      <button class="fr-link" id="os-back">‹ Offre de soins</button>
    </nav>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">${esc(p.firstname)} ${esc(p.lastname)}</h1>
        <p class="page-sub">${esc(professionLabel(p.profession))} · RPPS ${esc(p.rpps)}</p>
      </div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;">${structureBadge(s)} ${participationBadge(p.participationSAS)} ${dispoBadge(p.dispo)}</div>
    </div>

    <div class="os-panels">
      <section class="os-panel">
        <h2 class="os-panel__title">Structure porteuse</h2>
        <div class="os-kv"><span>Type</span><strong>${esc(structureLabel(s))}</strong></div>
        <div class="os-kv"><span>Nom</span><strong>${esc(s ? s.name : "—")}</strong></div>
        <div class="os-kv"><span>Adresses d'activité</span><strong>${p.places.length}</strong></div>
        <p class="mock-note" style="margin:.4rem 0 0;">${esc(structNote)}</p>
      </section>
      <section class="os-panel">
        <h2 class="os-panel__title">Inscription &amp; participation SAS</h2>
        <div class="os-kv"><span>Statut</span>${dispoBadge(p.dispo)}</div>
        <div class="os-kv"><span>Date d'inscription</span><strong>${esc(fmtD(inscription))}</strong></div>
        <div class="os-kv"><span>Dernières participations</span><strong>${participations.length ? participations.map(fmtD).join(" · ") : "—"}</strong></div>
      </section>
    </div>

    <section class="os-panel" style="margin-top:1rem;">
      <h2 class="os-panel__title">Agenda SAS <span class="mock-note" style="font-weight:400;">— lecture seule (créneaux déclarés)</span></h2>
      ${agendaTable(agendaDoc)}
    </section>

    <h2 class="fr-h6" style="margin:1.5rem 0 .5rem;">Adresses d'activité (${p.places.length})</h2>
    <div class="os-addrs">${addrs}</div>

    <h2 class="fr-h6" style="margin:1.5rem 0 .5rem;">Historique des modifications</h2>
    <div class="os-history">${historyList(history)}</div>`;
  el("os-back").onclick = () => { state.view = "list"; state.rpps = null; render(); };
  bindDetailEvents();
}
function agendaTable(d){
  const ag = (d && d.agenda) || [];
  if (!ag.some(x => x.creneaux.length)) return `<p class="mock-note" style="margin:.25rem 0 0;">Aucun créneau déclaré — professionnel indisponible sur le SAS.</p>`;
  return `<table class="os-agenda">
    <tbody>${ag.map(x => `<tr>
      <th>${esc(x.jour)}</th>
      <td>${x.creneaux.length ? x.creneaux.map(c => `<span class="os-slot">${esc(c)}</span>`).join(" ") : `<span class="mock-note">—</span>`}</td>
    </tr>`).join("")}</tbody>
  </table>`;
}
function historyList(history){
  if (!history.length) return `<p class="mock-note">Aucune modification enregistrée.</p>`;
  return history.map(h => `
    <div class="os-hist">
      <div class="os-hist__head">
        <span class="os-hist__date">${esc(fmtDT(h.at))}</span>
        <span class="os-hist__who">${esc(h.author)}</span>
        ${(h.fields||[]).map(f => `<span class="fr-badge fr-badge--sm os-hist__field">${esc(f)}</span>`).join(" ")}
        ${h.addr ? `<span class="mock-note">· ${esc(h.addr)}</span>` : ""}
      </div>
      <div class="os-hist__desc">${esc(h.description || "")}</div>
    </div>`).join("");
}
function addrCard(d){
  const tel = phoneOf(d);
  const sc = d.geoScore;
  const pt = (d.structure && d.structure.point) ? `<span class="fr-badge fr-badge--sm os-badge-point">${esc(OS_SOS_POINT_LABEL[d.structure.point] || d.structure.point)}</span>` : "";
  return `
    <div class="os-addr">
      <div class="os-addr__main">
        <div class="os-addr__line"><span class="fr-icon-map-pin-2-line" aria-hidden="true"></span> ${esc(d.address.full)} ${pt}</div>
        <div class="os-addr__meta">
          <span><strong>Tél. :</strong> ${tel ? esc(tel) : '<span class="mock-note">non renseigné</span>'}</span>
          <span><strong>Modalité :</strong> ${modaliteBadge(d.modalite)}</span>
          <span class="mock-note">Géo : ${esc(d.coordinates.lat)}, ${esc(d.coordinates.lon)}</span>
          <span><strong>Score géoloc :</strong> <span class="geo-score ${geoScoreClass(sc)}">${esc(sc)}/100 · ${esc(osGeoScoreLabel(sc))}</span></span>
        </div>
      </div>
      ${osWrite() ? `<button class="act-edit" data-addr-edit="${esc(d.psa)}">Éditer</button>` : ""}
    </div>`;
}
function addrEditForm(d){
  const f = state.form || {};
  return `
    <div class="os-addr os-addr--edit">
      <p class="fr-text--sm fr-text--bold" style="margin:0 0 .5rem;">Adresse normalisée</p>
      <div class="fr-input-group">
        <label class="fr-label" for="ed-street">Voie</label>
        <input class="fr-input" id="ed-street" value="${esc(f.street)}">
      </div>
      <div class="fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-4"><div class="fr-input-group">
          <label class="fr-label" for="ed-cp">Code postal</label>
          <input class="fr-input" id="ed-cp" value="${esc(f.postalCode)}">
        </div></div>
        <div class="fr-col-8"><div class="fr-input-group">
          <label class="fr-label" for="ed-city">Commune</label>
          <input class="fr-input" id="ed-city" value="${esc(f.city)}">
        </div></div>
      </div>
      <div class="fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-12 fr-col-md-6"><div class="fr-input-group">
          <label class="fr-label" for="ed-tel">Numéro de téléphone</label>
          <input class="fr-input" id="ed-tel" value="${esc(f.telephone)}" placeholder="Ex : 05 61 00 00 00">
        </div></div>
        <div class="fr-col-12 fr-col-md-6"><div class="fr-input-group">
          <label class="fr-label" for="ed-mod">Modalité de participation</label>
          <select class="fr-select" id="ed-mod">
            <option value="MSP"  ${f.modalite==="MSP"?"selected":""}>Via MSP</option>
            <option value="CPTS" ${f.modalite==="CPTS"?"selected":""}>Via CPTS</option>
          </select>
        </div></div>
      </div>
      <p class="fr-text--sm fr-text--bold" style="margin:.25rem 0 .5rem;">Géolocalisation</p>
      <div class="fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-4"><div class="fr-input-group">
          <label class="fr-label" for="ed-lat">Latitude</label>
          <input class="fr-input" id="ed-lat" inputmode="decimal" value="${esc(f.lat)}">
        </div></div>
        <div class="fr-col-4"><div class="fr-input-group">
          <label class="fr-label" for="ed-lon">Longitude</label>
          <input class="fr-input" id="ed-lon" inputmode="decimal" value="${esc(f.lon)}">
        </div></div>
        <div class="fr-col-4"><div class="fr-input-group">
          <label class="fr-label" for="ed-score">Score de géoloc (0–100)</label>
          <input class="fr-input" id="ed-score" inputmode="numeric" value="${esc(f.geoScore)}">
        </div></div>
      </div>
      <div class="fr-input-group">
        <label class="fr-label" for="ed-desc">Description de la modification (qui / quoi)
          <span class="fr-hint-text">Consignée dans l'historique avec l'auteur et la date.</span></label>
        <textarea class="fr-input" id="ed-desc" rows="2" placeholder="Ex : correction de l'adresse suite au signalement de la structure.">${esc(f.description || "")}</textarea>
      </div>
      ${f.error ? `<p class="fr-error-text">${esc(f.error)}</p>` : ""}
      <div style="display:flex;gap:.5rem;">
        <button class="fr-btn fr-btn--sm" id="ed-save">Enregistrer</button>
        <button class="fr-btn fr-btn--sm fr-btn--secondary" id="ed-cancel">Annuler</button>
      </div>
    </div>`;
}
function bindDetailEvents(){
  const root = el("os-view");
  root.querySelectorAll("[data-addr-edit]").forEach(b => b.onclick = () => {
    const d = state.docs.find(x => x.psa === b.dataset.addrEdit);
    state.editPsa = d.psa;
    state.form = { street:d.address.street, postalCode:d.address.postalCode, city:d.address.city,
                   telephone:phoneOf(d), modalite:d.modalite, lat:d.coordinates.lat, lon:d.coordinates.lon,
                   geoScore:d.geoScore, description:"", error:"" };
    render();
  });
  if (state.editPsa) {
    const f = state.form;
    const bind = (id, key) => { const e = root.querySelector("#"+id); if (e) e.oninput = () => f[key] = e.value; };
    bind("ed-street","street"); bind("ed-cp","postalCode"); bind("ed-city","city");
    bind("ed-tel","telephone"); bind("ed-lat","lat"); bind("ed-lon","lon");
    bind("ed-score","geoScore"); bind("ed-desc","description");
    root.querySelector("#ed-mod").onchange = e => f.modalite = e.target.value;
    root.querySelector("#ed-cancel").onclick = () => { state.editPsa = null; state.form = null; render(); };
    root.querySelector("#ed-save").onclick = () => {
      const d = state.docs.find(x => x.psa === state.editPsa);
      // Détection des champs modifiés (pour l'historique)
      const changed = [];
      const newFull = `${String(f.street).trim()} ${String(f.postalCode).trim()} ${String(f.city).trim()}`.trim();
      if (newFull !== d.address.full) changed.push("Adresse");
      const newLat = f.lat === "" ? null : Number(f.lat);
      const newLon = f.lon === "" ? null : Number(f.lon);
      if (newLat !== d.coordinates.lat || newLon !== d.coordinates.lon) changed.push("Géolocalisation");
      const newScore = f.geoScore === "" ? null : Number(f.geoScore);
      if (newScore !== d.geoScore) changed.push("Score de géoloc");
      const newTel = String(f.telephone).trim();
      if (newTel !== phoneOf(d)) changed.push("Téléphone");

      if (changed.length && !String(f.description).trim()) {
        f.error = "Renseignez une description de la modification (qui / quoi).";
        render(); return;
      }

      // Application des modifications
      d.address.street = String(f.street).trim();
      d.address.postalCode = String(f.postalCode).trim();
      d.address.city = String(f.city).trim();
      d.address.full = newFull;
      d.phones = newTel ? [{ number: newTel, confidentialityLevel: (d.phones[0] && d.phones[0].confidentialityLevel) || "1" }] : [];
      d.modalite = f.modalite;
      d.coordinates.lat = newLat;
      d.coordinates.lon = newLon;
      d.geoScore = newScore;

      // Journalisation dans l'historique
      if (changed.length) {
        d.history = d.history || [];
        d.history.unshift({
          at: new Date().toISOString(),
          author: identity().label,
          fields: changed,
          description: String(f.description).trim(),
        });
      }
      saveIndex();
      state.editPsa = null; state.form = null; render();
    };
  }
}

function render() {
  renderSidebar();
  const main = el("os-view");
  if (!osLevel()) {
    main.innerHTML = `
      <div class="fr-alert fr-alert--warning" style="margin-top:1rem;">
        <h1 class="fr-alert__title" style="font-size:1.1rem;">Accès non autorisé</h1>
        <p>Le profil « ${esc(identity().label)} » n'a pas d'habilitation sur Open-Search.</p>
        <p><a class="fr-link" href="${urlWithIdentity("index.html", state.identityIdx)}">← Retour au portail</a></p>
      </div>`;
    return;
  }
  if (state.view === "detail") renderDetail(); else renderList();
}

document.addEventListener("DOMContentLoaded", render);
