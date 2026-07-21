/* ==================================================================
   Open-Search — offre de soins.
   Une offre est SOIT un professionnel de santé (individuel), SOIT une
   structure autonome (CDS · SOS Médecins · MMG). Les structures ne sont
   PAS rattachées à un professionnel : ce sont des offres à part entière.
   Habilitation « offre_soins » : lecture (consultation) ou écriture (édition).
   ================================================================== */
"use strict";

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function el(id){ return document.getElementById(id); }

const OS_KEY = "bo-sas-opensearch-v4";
function loadIndex(){ try { const r = localStorage.getItem(OS_KEY); if (r) return JSON.parse(r); } catch(e){} return JSON.parse(JSON.stringify(OS_OFFRES)); }
function saveIndex(){ try { localStorage.setItem(OS_KEY, JSON.stringify(state.offres)); } catch(e){} }

const state = {
  identityIdx: currentIdentityIdx(),
  offres: loadIndex(),
  view: "list",
  offreId: null,
  editPsa: null,
  search: "",
  fKind: "",    // filtre type d'offre : "" | ps | cds | sos | mmg
  fDispo: "",    // filtre disponibilité : "" | dispo | indispo
  form: null,
};
function identity(){ return IDENTITIES[state.identityIdx]; }
function osLevel(){ return habLevel(identity(), "offre_soins"); }   // null | lecture | ecriture
function osWrite(){ return osLevel() === "ecriture"; }

function currentOffre(){ return state.offres.find(o => o.id === state.offreId) || null; }
function findPlace(psa){
  for (const o of state.offres) { const p = (o.places||[]).find(x => x.psa === psa); if (p) return { offre:o, place:p }; }
  return null;
}
function professionLabel(id){ return OS_PROFESSION_LABEL[id] || ("Profession " + id); }
function offreTitle(o){ return o.kind === "ps" ? `${o.firstname} ${o.lastname}` : o.name; }
function offreSubtitle(o){
  const na = (o.places||[]).length;
  const adr = `${na} adresse${na>1?"s":""} d'activité`;
  return o.kind === "ps" ? `${professionLabel(o.profession)} · RPPS ${esc(o.rpps)} · ${adr}` : `${OS_KIND_LABEL[o.kind]} · ${adr}`;
}
function phoneOf(p){ return (p.phones && p.phones[0] && p.phones[0].number) || ""; }

/* Badges (plats, sans icône) */
function dispoBadge(ok){ return ok ? `<span class="fr-badge fr-badge--sm os-badge-dispo">Disponible</span>` : `<span class="fr-badge fr-badge--sm os-badge-indispo">Indisponible</span>`; }
function participationBadge(ok){ return ok ? `<span class="fr-badge fr-badge--sm os-badge-part">Participe au SAS</span>` : `<span class="fr-badge fr-badge--sm os-badge-hors">Hors SAS</span>`; }
function modaliteBadge(m){ return m ? `<span class="fr-badge fr-badge--sm os-badge-mod os-badge-mod-${esc(m)}">Via ${esc(m)}</span>` : ""; }
function kindBadge(o){
  const cls = o.kind === "ps" ? "os-badge-ps" : "os-badge-struct-" + o.kind;
  const label = o.kind === "ps" ? "Professionnel" : OS_STRUCTURE_LABEL[o.kind];
  return `<span class="fr-badge fr-badge--sm os-badge-kind ${cls}">${esc(label)}</span>`;
}
function pointBadge(p){ return (p && p.point) ? `<span class="fr-badge fr-badge--sm os-badge-point">${esc(OS_SOS_POINT_LABEL[p.point] || p.point)}</span>` : ""; }
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
  if (b) b.onclick = () => { state.view = "list"; state.offreId = null; render(); };

  const sel = el("identity-select");
  sel.innerHTML = IDENTITIES.map((i, k) => `<option value="${k}">${esc(i.label)}</option>`).join("");
  sel.value = state.identityIdx;
  sel.onchange = () => gotoWithIdentity("opensearch.html", Number(sel.value));
}

/* ================================================================ *
 *  VUE LISTE
 * ================================================================ */
function filteredOffres(){
  const q = state.search.trim().toLowerCase();
  let list = state.offres.slice();
  if (state.fKind) list = list.filter(o => o.kind === state.fKind);
  if (state.fDispo) list = list.filter(o => state.fDispo === "dispo" ? o.dispo : !o.dispo);
  if (q) list = list.filter(o => {
    const hay = o.kind === "ps"
      ? `${o.firstname} ${o.lastname} ${professionLabel(o.profession)} ${o.rpps}`
      : `${o.name} ${OS_KIND_LABEL[o.kind]}`;
    return hay.toLowerCase().includes(q);
  });
  return list;
}
function offreRow(o){
  return `
    <div class="user-row">
      <div class="user-row__body">
        <div class="user-row__l1">
          <span class="user-row__name">${esc(offreTitle(o))}</span>
          ${kindBadge(o)} ${participationBadge(o.participationSAS)} ${dispoBadge(o.dispo)}
        </div>
        <div class="user-row__l2">${esc(offreSubtitle(o))}</div>
      </div>
      <div class="user-row__actions">
        <button class="act-edit" data-offre="${esc(o.id)}">Voir le détail ›</button>
      </div>
    </div>`;
}
function renderList() {
  const list = filteredOffres();
  const kindOpts = Object.keys(OS_KIND_LABEL).map(k => `<option value="${k}" ${state.fKind===k?"selected":""}>${esc(OS_KIND_LABEL[k])}</option>`).join("");
  el("os-view").innerHTML = `
    <h1 class="fr-h4" style="margin:0;">Offre de soins</h1>
    <p class="page-sub">Offres indexées (sas_consultation_place) : professionnels de santé et structures (CDS, SOS Médecins, MMG).</p>
    <div class="filters">
      <div class="f-search">
        <label class="fr-label" for="os-q">Rechercher</label>
        <input class="fr-input" type="search" id="os-q" placeholder="Nom, structure, profession, RPPS…" value="${esc(state.search)}">
      </div>
      <div class="f-field">
        <label class="fr-label" for="os-fkind">Type d'offre</label>
        <select class="fr-select" id="os-fkind"><option value="">Toutes</option>${kindOpts}</select>
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
    <p class="result-count">${list.length} offre${list.length>1?"s":""} de soins</p>
    <div class="user-list" id="os-list">${list.map(offreRow).join("") || `<p class="mock-note" style="padding:1rem 0;">Aucun résultat.</p>`}</div>`;

  const refresh = () => {
    const l = filteredOffres();
    el("os-list").innerHTML = l.map(offreRow).join("") || `<p class="mock-note" style="padding:1rem 0;">Aucun résultat.</p>`;
    el("os-view").querySelector(".result-count").textContent = `${l.length} offre${l.length>1?"s":""} de soins`;
    bindOffreRows();
  };
  el("os-q").oninput = (e) => { state.search = e.target.value; refresh(); };
  el("os-fkind").onchange = (e) => { state.fKind = e.target.value; refresh(); };
  el("os-fdispo").onchange = (e) => { state.fDispo = e.target.value; refresh(); };
  bindOffreRows();
}
function bindOffreRows(){
  el("os-view").querySelectorAll("[data-offre]").forEach(b => b.onclick = () => {
    state.offreId = b.dataset.offre; state.view = "detail"; state.editPsa = null; render();
  });
}

/* ================================================================ *
 *  VUE DÉTAIL
 * ================================================================ */
function renderDetail() {
  const o = currentOffre();
  if (!o) { state.view = "list"; renderList(); return; }
  const places = o.places || [];
  const addrs = places.map(p => state.editPsa === p.psa ? addrEditForm(o, p) : addrCard(o, p)).join("");

  const infoPanel = o.kind === "ps" ? `
    <section class="os-panel">
      <h2 class="os-panel__title">Professionnel de santé</h2>
      <div class="os-kv"><span>Profession</span><strong>${esc(professionLabel(o.profession))}</strong></div>
      <div class="os-kv"><span>RPPS</span><strong>${esc(o.rpps)}</strong></div>
      <div class="os-kv"><span>Adresses d'activité</span><strong>${places.length}</strong></div>
      <p class="mock-note" style="margin:.4rem 0 0;">Offre individuelle — non rattachée à une structure.</p>
    </section>` : `
    <section class="os-panel">
      <h2 class="os-panel__title">Offre de soins — structure</h2>
      <div class="os-kv"><span>Type</span><strong>${esc(OS_KIND_LABEL[o.kind])}</strong></div>
      <div class="os-kv"><span>Nom</span><strong>${esc(o.name)}</strong></div>
      <div class="os-kv"><span>Adresses</span><strong>${places.length}</strong></div>
      <p class="mock-note" style="margin:.4rem 0 0;">${o.kind === "sos"
        ? "SOS Médecins — offre multi-adresses (points fixes de garde/consultation)."
        : (o.kind === "cds" ? "Centre de Santé — adresse unique." : "Maison Médicale de Garde — adresse unique.")}</p>
    </section>`;

  const inscription = o.sas && o.sas.inscription;
  const participations = (o.sas && o.sas.participations) || [];
  const history = (o.history || []).slice().sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  el("os-view").innerHTML = `
    <nav class="fr-breadcrumb" style="margin:0 0 .5rem;">
      <button class="fr-link" id="os-back">‹ Offre de soins</button>
    </nav>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 class="fr-h4" style="margin:0;">${esc(offreTitle(o))}</h1>
        <p class="page-sub">${o.kind === "ps" ? esc(professionLabel(o.profession)) + " · RPPS " + esc(o.rpps) : esc(OS_KIND_LABEL[o.kind])}</p>
      </div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;">${kindBadge(o)} ${participationBadge(o.participationSAS)} ${dispoBadge(o.dispo)}</div>
    </div>

    <div class="os-panels">
      ${infoPanel}
      <section class="os-panel">
        <h2 class="os-panel__title">Inscription &amp; participation SAS</h2>
        <div class="os-kv"><span>Statut</span>${dispoBadge(o.dispo)}</div>
        <div class="os-kv"><span>Date d'inscription</span><strong>${esc(fmtD(inscription))}</strong></div>
        <div class="os-kv"><span>Dernières participations</span><strong>${participations.length ? participations.map(fmtD).join(" · ") : "—"}</strong></div>
      </section>
    </div>

    <section class="os-panel" style="margin-top:1rem;">
      <h2 class="os-panel__title">Agenda SAS <span class="mock-note" style="font-weight:400;">— lecture seule (créneaux déclarés)</span></h2>
      ${agendaTable(o)}
    </section>

    <h2 class="fr-h6" style="margin:1.5rem 0 .5rem;">${o.kind === "ps" ? "Adresses d'activité" : "Adresses"} (${places.length})</h2>
    <div class="os-addrs">${addrs}</div>

    <h2 class="fr-h6" style="margin:1.5rem 0 .5rem;">Historique des modifications</h2>
    <div class="os-history">${historyList(history)}</div>`;
  el("os-back").onclick = () => { state.view = "list"; state.offreId = null; render(); };
  bindDetailEvents();
}
function agendaTable(o){
  const ag = (o && o.agenda) || [];
  if (!ag.some(x => x.creneaux.length)) return `<p class="mock-note" style="margin:.25rem 0 0;">Aucun créneau déclaré — offre indisponible sur le SAS.</p>`;
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
      </div>
      <div class="os-hist__desc">${esc(h.description || "")}</div>
    </div>`).join("");
}
function addrCard(o, p){
  const tel = phoneOf(p);
  const sc = p.geoScore;
  return `
    <div class="os-addr">
      <div class="os-addr__main">
        <div class="os-addr__line"><span class="fr-icon-map-pin-2-line" aria-hidden="true"></span> ${esc(p.address.full)} ${pointBadge(p)}</div>
        <div class="os-addr__meta">
          <span><strong>Tél. :</strong> ${tel ? esc(tel) : '<span class="mock-note">non renseigné</span>'}</span>
          ${o.kind === "ps" && p.modalite ? `<span><strong>Modalité :</strong> ${modaliteBadge(p.modalite)}</span>` : ""}
          <span class="mock-note">Géo : ${esc(p.coordinates.lat)}, ${esc(p.coordinates.lon)}</span>
          <span><strong>Score géoloc :</strong> <span class="geo-score ${geoScoreClass(sc)}">${esc(sc)}/100 · ${esc(osGeoScoreLabel(sc))}</span></span>
        </div>
      </div>
      ${osWrite() ? `<button class="act-edit" data-addr-edit="${esc(p.psa)}">Éditer</button>` : ""}
    </div>`;
}
function addrEditForm(o, p){
  const f = state.form || {};
  const showModalite = o.kind === "ps";
  return `
    <div class="os-addr os-addr--edit">
      <p class="fr-text--sm fr-text--bold" style="margin:0 0 .5rem;">Adresse normalisée ${pointBadge(p)}</p>
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
        <div class="fr-col-12 ${showModalite?"fr-col-md-6":""}"><div class="fr-input-group">
          <label class="fr-label" for="ed-tel">Numéro de téléphone</label>
          <input class="fr-input" id="ed-tel" value="${esc(f.telephone)}" placeholder="Ex : 05 61 00 00 00">
        </div></div>
        ${showModalite ? `<div class="fr-col-12 fr-col-md-6"><div class="fr-input-group">
          <label class="fr-label" for="ed-mod">Modalité de participation</label>
          <select class="fr-select" id="ed-mod">
            <option value="MSP"  ${f.modalite==="MSP"?"selected":""}>Via MSP</option>
            <option value="CPTS" ${f.modalite==="CPTS"?"selected":""}>Via CPTS</option>
          </select>
        </div></div>` : ""}
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
        <textarea class="fr-input" id="ed-desc" rows="2" placeholder="Ex : correction de l'adresse suite au signalement.">${esc(f.description || "")}</textarea>
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
    const found = findPlace(b.dataset.addrEdit);
    if (!found) return;
    const p = found.place;
    state.editPsa = p.psa;
    state.form = { street:p.address.street, postalCode:p.address.postalCode, city:p.address.city,
                   telephone:phoneOf(p), modalite:p.modalite, lat:p.coordinates.lat, lon:p.coordinates.lon,
                   geoScore:p.geoScore, description:"", error:"" };
    render();
  });
  if (state.editPsa) {
    const f = state.form;
    const bind = (id, key) => { const e = root.querySelector("#"+id); if (e) e.oninput = () => f[key] = e.value; };
    bind("ed-street","street"); bind("ed-cp","postalCode"); bind("ed-city","city");
    bind("ed-tel","telephone"); bind("ed-lat","lat"); bind("ed-lon","lon");
    bind("ed-score","geoScore"); bind("ed-desc","description");
    const modSel = root.querySelector("#ed-mod");
    if (modSel) modSel.onchange = e => f.modalite = e.target.value;
    root.querySelector("#ed-cancel").onclick = () => { state.editPsa = null; state.form = null; render(); };
    root.querySelector("#ed-save").onclick = () => {
      const found = findPlace(state.editPsa);
      if (!found) { state.editPsa = null; state.form = null; render(); return; }
      const { offre, place } = found;
      const changed = [];
      const newFull = `${String(f.street).trim()} ${String(f.postalCode).trim()} ${String(f.city).trim()}`.trim();
      if (newFull !== place.address.full) changed.push("Adresse");
      const newLat = f.lat === "" ? null : Number(f.lat);
      const newLon = f.lon === "" ? null : Number(f.lon);
      if (newLat !== place.coordinates.lat || newLon !== place.coordinates.lon) changed.push("Géolocalisation");
      const newScore = f.geoScore === "" ? null : Number(f.geoScore);
      if (newScore !== place.geoScore) changed.push("Score de géoloc");
      const newTel = String(f.telephone).trim();
      if (newTel !== phoneOf(place)) changed.push("Téléphone");

      if (changed.length && !String(f.description).trim()) {
        f.error = "Renseignez une description de la modification (qui / quoi).";
        render(); return;
      }

      place.address.street = String(f.street).trim();
      place.address.postalCode = String(f.postalCode).trim();
      place.address.city = String(f.city).trim();
      place.address.full = newFull;
      place.phones = newTel ? [{ number: newTel, confidentialityLevel: (place.phones[0] && place.phones[0].confidentialityLevel) || "1" }] : [];
      if (offre.kind === "ps") place.modalite = f.modalite;
      place.coordinates.lat = newLat;
      place.coordinates.lon = newLon;
      place.geoScore = newScore;

      if (changed.length) {
        offre.history = offre.history || [];
        offre.history.unshift({
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
