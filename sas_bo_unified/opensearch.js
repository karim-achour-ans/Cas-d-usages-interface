/* ==================================================================
   Open-Search — offre de soins.
   Documents « place » regroupés par RPPS → un PS et ses adresses.
   Édition d'une adresse : téléphone, adresse normalisée, géolocalisation
   (+ modalité de participation MSP / CPTS).
   Accessible aux identités portant l'habilitation « acces ».
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id){ return document.getElementById(id); }

const OS_KEY = "bo-sas-opensearch-v2";
function loadIndex(){ try { const r = localStorage.getItem(OS_KEY); if (r) return JSON.parse(r); } catch(e){} return JSON.parse(JSON.stringify(OS_INDEX)); }
function saveIndex(){ try { localStorage.setItem(OS_KEY, JSON.stringify(state.docs)); } catch(e){} }

const state = {
  identityIdx: currentIdentityIdx(),
  docs: loadIndex(),   // documents « place »
  view: "list",        // "list" | "detail"
  rpps: null,          // PS affiché
  editPsa: null,       // adresse (psa) en cours d'édition
  search: "",
  form: null,
};
function identity(){ return IDENTITIES[state.identityIdx]; }
function acAcc(){ return identity().acces; }

// Regroupe les documents par RPPS → { rpps, nom, prenom, title, professionId, participationSAS, places[] }
function groupByPS() {
  const map = new Map();
  state.docs.forEach(d => {
    if (!map.has(d.rpps)) {
      map.set(d.rpps, {
        rpps: d.rpps, lastname: d.lastname, firstname: d.firstname, title: d.title,
        profession: d.profession, places: [],
      });
    }
    map.get(d.rpps).places.push(d);
  });
  const arr = [...map.values()];
  arr.forEach(ps => { ps.participationSAS = ps.places.some(p => !!p.agreements); });
  return arr;
}
function currentPS() { return groupByPS().find(p => p.rpps === state.rpps); }

function professionLabel(id){ return OS_PROFESSION_LABEL[id] || ("Profession " + id); }
function phoneOf(d){ return (d.phones && d.phones[0] && d.phones[0].number) || ""; }
function modaliteBadge(m){
  const cls = m === "MSP" ? "fr-badge--info" : "fr-badge--purple";
  return `<span class="fr-badge fr-badge--sm ${cls}">Via ${esc(m)}</span>`;
}
function participationBadge(ok){
  return ok
    ? `<span class="fr-badge fr-badge--sm fr-badge--success">Participe au SAS</span>`
    : `<span class="fr-badge fr-badge--sm">Hors SAS</span>`;
}

/* ── Menu ────────────────────────────────────────────────── */
function renderSidebar() {
  const nav = el("sidebar-nav");
  nav.innerHTML =
    `<a class="nav-item nav-portal" href="${urlWithIdentity("index.html", state.identityIdx)}">
       <span class="fr-icon-arrow-left-line" aria-hidden="true"></span>Portail
     </a>
     <button class="nav-item is-active" id="nav-os">
       <span class="fr-icon-search-line" aria-hidden="true"></span>Offre de soins
     </button>`;
  el("nav-os").onclick = () => { state.view = "list"; state.rpps = null; render(); };

  const sel = el("identity-select");
  sel.innerHTML = IDENTITIES.map((i, k) => `<option value="${k}">${esc(i.label)}</option>`).join("");
  sel.value = state.identityIdx;
  sel.onchange = () => gotoWithIdentity("opensearch.html", Number(sel.value));
}

/* ── Vue liste des professionnels ────────────────────────── */
function filteredPS(){
  const q = state.search.trim().toLowerCase();
  const list = groupByPS();
  if (!q) return list;
  return list.filter(p => (p.lastname+" "+p.firstname+" "+professionLabel(p.profession)+" "+p.rpps).toLowerCase().includes(q));
}
function renderList() {
  const list = filteredPS();
  el("os-view").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Offre de soins</h1>
    <p class="page-sub">Professionnels de santé indexés (sas_consultation_place).</p>
    <div class="fr-input-group" style="max-width:380px;margin:1rem 0 .25rem;">
      <label class="fr-label" for="os-q">Rechercher</label>
      <input class="fr-input" type="search" id="os-q" placeholder="Nom, prénom, profession, RPPS…" value="${esc(state.search)}">
    </div>
    <p class="result-count">${list.length} professionnel${list.length>1?"s":""}</p>
    <div class="user-list" id="os-list">${list.map(psRow).join("") || `<p class="mock-note" style="padding:1rem 0;">Aucun résultat.</p>`}</div>`;

  el("os-q").oninput = (e) => {
    state.search = e.target.value;
    const l = filteredPS();
    el("os-list").innerHTML = l.map(psRow).join("") || `<p class="mock-note" style="padding:1rem 0;">Aucun résultat.</p>`;
    el("os-view").querySelector(".result-count").textContent = `${l.length} professionnel${l.length>1?"s":""}`;
    bindPsRows();
  };
  bindPsRows();
}
function psRow(p){
  return `
    <div class="user-row">
      <div class="user-row__body">
        <div class="user-row__l1">
          <span class="user-row__name">${esc(p.firstname)} ${esc(p.lastname)}</span>
          ${participationBadge(p.participationSAS)}
        </div>
        <div class="user-row__l2">${esc(professionLabel(p.profession))} · RPPS ${esc(p.rpps)} · ${p.places.length} adresse${p.places.length>1?"s":""} d'activité</div>
      </div>
      <div class="user-row__actions">
        <button class="act-edit" data-ps="${esc(p.rpps)}">Voir les adresses ›</button>
      </div>
    </div>`;
}
function bindPsRows(){
  el("os-view").querySelectorAll("[data-ps]").forEach(b => b.onclick = () => {
    state.rpps = b.dataset.ps; state.view = "detail"; state.editPsa = null; render();
  });
}

/* ── Vue détail : adresses d'activité ────────────────────── */
function renderDetail() {
  const p = currentPS();
  if (!p) { state.view = "list"; renderList(); return; }

  const addrs = p.places.map(d => state.editPsa === d.psa ? addrEditForm(d) : addrCard(d)).join("");
  el("os-view").innerHTML = `
    <nav class="fr-breadcrumb" style="margin:0 0 .5rem;">
      <button class="fr-link" id="os-back">‹ Offre de soins</button>
    </nav>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">${esc(p.firstname)} ${esc(p.lastname)}</h1>
        <p class="page-sub">${esc(professionLabel(p.profession))} · RPPS ${esc(p.rpps)}</p>
      </div>
      ${participationBadge(p.participationSAS)}
    </div>
    <h2 class="fr-h6" style="margin:1.25rem 0 .5rem;">Adresses d'activité (${p.places.length})</h2>
    <div class="os-addrs">${addrs}</div>`;

  el("os-back").onclick = () => { state.view = "list"; state.rpps = null; render(); };
  bindDetailEvents();
}
function addrCard(d){
  const tel = phoneOf(d);
  return `
    <div class="os-addr">
      <div class="os-addr__main">
        <div class="os-addr__line"><span class="fr-icon-map-pin-2-line" aria-hidden="true"></span> ${esc(d.address.full)}</div>
        <div class="os-addr__meta">
          <span><strong>Tél. :</strong> ${tel ? esc(tel) : '<span class="mock-note">non renseigné</span>'}</span>
          <span><strong>Modalité :</strong> ${modaliteBadge(d.modalite)}</span>
          <span class="mock-note">Géo : ${esc(d.coordinates.lat)}, ${esc(d.coordinates.lon)}</span>
          <span class="mock-note">FINESS/ETB : ${esc(d.etbGuid.split("-").pop())}</span>
        </div>
      </div>
      <button class="act-edit" data-addr-edit="${esc(d.psa)}">Éditer</button>
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
        <div class="fr-col-6"><div class="fr-input-group">
          <label class="fr-label" for="ed-lat">Latitude</label>
          <input class="fr-input" id="ed-lat" inputmode="decimal" value="${esc(f.lat)}">
        </div></div>
        <div class="fr-col-6"><div class="fr-input-group">
          <label class="fr-label" for="ed-lon">Longitude</label>
          <input class="fr-input" id="ed-lon" inputmode="decimal" value="${esc(f.lon)}">
        </div></div>
      </div>
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
                   telephone:phoneOf(d), modalite:d.modalite, lat:d.coordinates.lat, lon:d.coordinates.lon };
    render();
  });
  if (state.editPsa) {
    const f = state.form;
    const bind = (id, key) => { const e = root.querySelector("#"+id); if (e) e.oninput = () => f[key] = e.value; };
    bind("ed-street","street"); bind("ed-cp","postalCode"); bind("ed-city","city");
    bind("ed-tel","telephone"); bind("ed-lat","lat"); bind("ed-lon","lon");
    root.querySelector("#ed-mod").onchange = e => f.modalite = e.target.value;
    root.querySelector("#ed-cancel").onclick = () => { state.editPsa = null; state.form = null; render(); };
    root.querySelector("#ed-save").onclick = () => {
      const d = state.docs.find(x => x.psa === state.editPsa);
      d.address.street = String(f.street).trim();
      d.address.postalCode = String(f.postalCode).trim();
      d.address.city = String(f.city).trim();
      d.address.full = `${d.address.street} ${d.address.postalCode} ${d.address.city}`.trim();
      const tel = String(f.telephone).trim();
      d.phones = tel ? [{ number: tel, confidentialityLevel: (d.phones[0] && d.phones[0].confidentialityLevel) || "1" }] : [];
      d.modalite = f.modalite;
      d.coordinates.lat = f.lat === "" ? null : Number(f.lat);
      d.coordinates.lon = f.lon === "" ? null : Number(f.lon);
      saveIndex();
      state.editPsa = null; state.form = null; render();
    };
  }
}

/* ── Rendu global ────────────────────────────────────────── */
function render() {
  renderSidebar();
  const main = el("os-view");
  if (!acAcc()) {
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
