/* Agenda SAS - simulation Temps SAS. Regles : voir README.md du dossier. */
(() => {
  const WEEK = [
    {l:'Lundi', d:'26/10', iso:'2026-10-26'}, {l:'Mardi', d:'27/10', iso:'2026-10-27'}, {l:'Mercredi', d:'28/10', iso:'2026-10-28'},
    {l:'Jeudi', d:'29/10', iso:'2026-10-29'}, {l:'Vendredi', d:'30/10', iso:'2026-10-30'}, {l:'Samedi', d:'31/10', iso:'2026-10-31'}];
  const DAYNAMES = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const HALF = {am:'matin', pm:'après-midi'};
  const CONSULT = {tele:'Téléconsultation', cabinet:'Consultation en cabinet', domicile:'Visite à domicile'};
  const UNTIL = '20/04/2027';
  const bounds = (d, h) => d === 5 ? (h === 'am' ? [480, 720] : null) : d > 5 ? null : (h === 'am' ? [480, 840] : [840, 1200]);
  const K = (d, h) => `${d}|${h}`;
  const parseK = k => { const [d, h] = k.split('|'); return [+d, h]; };
  const hm = m => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  const hs = m => m % 60 ? hm(m) : `${m / 60}h`;
  const toMin = s => { const [a, b] = s.split(':'); return +a * 60 + +b; };
  const toHHMM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const halfLabel = k => { const [d, h] = parseK(k); return `${WEEK[d].l} ${WEEK[d].d} ${HALF[h]}`; };
  const ALL_KEYS = []; WEEK.forEach((_, d) => ['am', 'pm'].forEach(h => { if (bounds(d, h)) ALL_KEYS.push(K(d, h)); }));
  const $ = id => document.getElementById(id);
  let S;

  function ps(o){
    const defaults = {}; ALL_KEYS.forEach(k => defaults[k] = {on:false, cap:1, consult:['cabinet']});
    (o.def || []).forEach(([k, cap]) => defaults[k] = {on:true, cap, consult:['cabinet']});
    return {orient:{}, booked:{}, precise:{}, indispo:new Set(), slots:o.slots || {}, defaults, reg:{}, regMask:new Set(), regEvents:[], ...o};
  }
  const pmDays = [0,1,2,3,4];
  function reset(){
    S = {
      converted:false, convertedReal:false, detail:false, sel:K(1,'pm'), pending:null, modal:null, regPanel:null, clock:628, log:[],
      people:[
        ps({id:'martin', name:'Dr Claire Martin', place:'Cabinet des Lilas, Créteil', dist:1.2, me:true, interfaced:false}),
      ]};
    closeModal(); render();
  }
  const P = id => S.people.find(p => p.id === id);
  const M = () => P('martin');
  const MARTIN_SLOTS = {[K(0,'am')]:['10:00'], [K(1,'pm')]:['14:30','15:00','17:30'], [K(3,'am')]:['09:00','11:00'], [K(4,'pm')]:['16:00']};

  // --- règles ---
  function plageOf(p, k){
    if (p.indispo.has(k)) return null;
    const [d, h] = parseK(k);
    if (p.regMask.has(k) && !p.precise[k]) return null;
    if (p.precise[k]) return {src:'precise', ...p.precise[k]};
    const df = p.defaults[k];
    if (df && df.on){ const [a, b] = bounds(d, h); return {src:'default', kind:'sas', recurring:true, start:a, end:b, cap:df.cap, consult:df.consult}; }
    return null;
  }
  const kindLabel = pl => pl.kind === 'sas' ? (pl.recurring ? 'Temps SAS' : 'Temps SAS ponctuel') : (pl.recurring ? 'Plage horaire récurrente' : 'Plage horaire');
  const used = (p, k) => p.orient[k] || 0;
  const capOf = (p, pl) => p.interfaced ? Infinity : pl.cap;
  const freeSlots = (p, k) => (p.slots[k] || []).filter(s => !(p.booked[k] || []).includes(s));
  function rankOf(p, k){
    const pl = plageOf(p, k), rem = pl ? capOf(p, pl) - used(p, k) : 0, slots = freeSlots(p, k);
    const sig = p.reg[k] && p.reg[k].signal;
    if (pl && sig) return {pl, rem, inP:[], outP:slots, rank:slots.length ? 3 : 4, full:false, sig};
    const inP = pl && rem > 0 ? slots.filter(s => toMin(s) >= pl.start && toMin(s) < pl.end) : [];
    const outP = slots.filter(s => !inP.includes(s));
    let rank = 4;
    if (pl && rem > 0) rank = inP.length ? 1 : 2; else if (slots.length) rank = 3;
    return {pl, rem, inP, outP, rank, full: pl && rem <= 0};
  }
  function log(actor, evt, effect){ S.log.unshift({actor, evt, effect}); }

  function convert(){
    const m = M();
    m.defaults[K(1,'pm')] = {on:true, cap:3, consult:['cabinet'], origin:'conversion'};
    m.precise[K(3,'am')] = {kind:'sas', recurring:false, start:480, end:840, cap:1, consult:['cabinet'], origin:'conversion'};
    m.orient[K(1,'pm')] = 1;
    S.converted = true; S.convertedReal = true;
    log('Plateforme', 'Conversion des créneaux', '3 créneaux récurrents du mardi → Temps SAS mardi après-midi, 3 patients (1 RDV conservé). 1 créneau ponctuel du jeudi 29/10 → Temps SAS ponctuel jeudi matin, 1 patient.');
    toast('Créneaux convertis en Temps SAS');
  }

  // --- rendu effecteur ---
  function renderEff(){
    const b = $('effBody'), m = M();
    if (!S.converted){
      b.innerHTML = `<div class="block">
        <div class="alert warn"><span><b>Avant déploiement.</b> L'agenda SAS de Dr Martin contient encore des créneaux. Au déploiement, ils sont regroupés en Temps SAS par demi-journée.</span></div>
        <h3>Situation actuelle de l'agenda SAS</h3>
        <div class="tbl"><table>
          <thead><tr><th>Type</th><th>Quand</th><th>Heure</th><th>Rendez-vous</th></tr></thead>
          <tbody>
            <tr><td>Créneau récurrent</td><td>Chaque mardi</td><td>14h00</td><td>–</td></tr>
            <tr><td>Créneau récurrent</td><td>Chaque mardi</td><td>14h15</td><td>Orientation SAS le 27/10</td></tr>
            <tr><td>Créneau récurrent</td><td>Chaque mardi</td><td>14h30</td><td>–</td></tr>
            <tr><td>Créneau ponctuel</td><td>Jeudi 29/10</td><td>9h00</td><td>–</td></tr>
          </tbody></table></div>
        <p class="hint">Règle : les créneaux d'une même demi-journée deviennent un Temps SAS sur la demi-journée entière, avec une capacité égale au nombre de créneaux. Les RDV sont conservés et consomment la capacité.</p>
        <div class="actions"><button class="primary" type="button" data-act="convert">Lancer la conversion</button><button class="tertiary" type="button" data-act="skip">Partir d'un agenda vide</button></div>
      </div>`;
      return;
    }
    let h = '';
    if (S.convertedReal) h += `<div class="alert info"><span>Vos créneaux ont été regroupés : 1 Temps SAS chaque semaine et 1 Temps SAS ponctuel.</span><button type="button" class="sm" data-act="detail">${S.detail ? 'Masquer le détail' : 'Voir le détail'}</button></div>`
      + (S.detail ? `<div class="tbl"><table><thead><tr><th>Avant</th><th>Après</th></tr></thead><tbody>
        <tr><td>Créneaux récurrents mardi 14h00, 14h15, 14h30</td><td>Temps SAS chaque mardi après-midi (14h – 20h), 3 patients</td></tr>
        <tr><td>Orientation SAS mardi 27/10 à 14h15</td><td>Conservée : 1 patient consommé sur le mardi 27/10</td></tr>
        <tr><td>Créneau ponctuel jeudi 29/10 9h00</td><td>Temps SAS ponctuel jeudi 29/10 matin (8h – 14h), 1 patient</td></tr></tbody></table></div>` : '');
    h += `<div class="block-head">
        <div class="row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
          <select id="lieu" disabled aria-label="Lieu d'activité"><option>Cabinet des Lilas, Créteil (94)</option></select>
          <label style="font-size:.85rem;display:flex;gap:6px;align-items:center"><input type="checkbox" id="intf" ${m.interfaced ? 'checked' : ''}> Interfacé avec un logiciel de rendez-vous</label>
        </div>
        <button type="button" class="primary" data-act="openModal">Ajouter une disponibilité</button>
      </div>`;

    // Mes temps SAS récurrents
    const rec = ALL_KEYS.filter(k => m.defaults[k].on);
    h += `<div class="block"><div class="block-head"><h3>Mes Temps SAS chaque semaine</h3><span class="hint">Demi-journées où la régulation peut vous contacter</span></div>`;
    if (!rec.length) h += `<div class="empty"><b>Aucun Temps SAS</b><span>Ajoutez une disponibilité et choisissez « Temps SAS » avec une récurrence hebdomadaire.</span></div>`;
    else h += `<div class="tbl"><table><thead><tr><th>Demi-journée</th><th>Horaires</th><th>Patients max.</th><th>Consultation</th><th>Visible jusqu'au</th><th></th></tr></thead><tbody>${rec.map(k => {
      const [d, hf] = parseK(k), bd = bounds(d, hf), df = m.defaults[k], minCap = Math.max(1, m.precise[k] || m.indispo.has(k) ? 1 : used(m, k));
      return `<tr><td>Chaque ${WEEK[d].l.toLowerCase()} ${HALF[hf]}</td><td class="num">${hs(bd[0])} – ${hs(bd[1])}</td>
        <td>${m.interfaced ? '<span class="hint">Pas de limite (interfacé)</span>' : `<span class="stepper"><button type="button" class="sm" data-cap="${k}" data-delta="-1" ${df.cap <= minCap ? 'disabled' : ''} aria-label="Diminuer">–</button><b class="num">${df.cap}</b><button type="button" class="sm" data-cap="${k}" data-delta="1" ${df.cap >= 20 ? 'disabled' : ''} aria-label="Augmenter">+</button></span>${!m.precise[k] && used(m, k) ? `<br><span class="hint">${Math.max(df.cap - used(m, k), 0)} restant${df.cap - used(m, k) > 1 ? 's' : ''} le ${WEEK[d].d}</span>${used(m, k) >= df.cap ? ' <span class="badge full">Complet</span>' : ''}` : ''}`}</td>
        <td>${df.consult.map(c => CONSULT[c]).join(', ')}</td><td class="num">${UNTIL}</td>
        <td><button type="button" class="sm tertiary" data-deldef="${k}">Supprimer</button></td></tr>`; }).join('')}</tbody></table></div>`;
    h += `</div>`;

    // Informations de la régulation
    if (m.regEvents.length) h += `<div class="block"><div class="block-head"><h3>Informations de la régulation</h3><span class="hint">Visibles par tous les SAS · pas de mail</span></div>
      <div class="tbl"><table><thead><tr><th>Jour</th><th>Action</th><th>Détail</th><th>Par</th></tr></thead><tbody>${m.regEvents.map(e => `<tr><td>${e.day}</td><td>${e.action}</td><td>${esc(e.detail)}</td><td>${e.sas} · ${e.at}</td></tr>`).join('')}</tbody></table></div></div>`;

    // Disponibilités ponctuelles
    const pon = ALL_KEYS.filter(k => m.precise[k]);
    h += `<div class="block"><div class="block-head"><h3>Mes disponibilités ponctuelles</h3><span class="hint">Semaine du 26 au 31 octobre</span></div>`;
    if (!pon.length) h += `<div class="empty"><b>Aucune disponibilité ponctuelle</b><span>Un Temps SAS sans récurrence ou une plage horaire apparaît ici.</span></div>`;
    else h += `<div class="tbl"><table><thead><tr><th>Date</th><th>Type</th><th>Horaires</th><th>Patients</th><th>Consultation</th><th></th></tr></thead><tbody>${pon.map(k => {
      const pl = m.precise[k], u = used(m, k), rem = pl.cap - u;
      return `<tr><td>${halfLabel(k)}</td><td><span class="badge ${pl.kind}">${kindLabel(pl)}</span>${pl.origin === 'regulation' ? '<br><span class="hint">Renseigné par la régulation (SAS 94)</span>' : ''}${m.defaults[k].on ? '<br><span class="hint">Remplace le Temps SAS</span>' : ''}</td>
        <td class="num">${hs(pl.start)} – ${hs(pl.end)}</td><td class="num">${m.interfaced ? '<span class="hint">Pas de limite</span>' : `${Math.max(rem, 0)} / ${pl.cap} dispo.${rem <= 0 ? ' <span class="badge full">Complet</span>' : ''}`}</td>
        <td>${pl.consult.map(c => CONSULT[c]).join(', ')}</td><td><button type="button" class="sm tertiary" data-delprecise="${k}">Supprimer</button></td></tr>`; }).join('')}</tbody></table></div>`;
    h += `</div>`;
    b.innerHTML = h;
  }
  const gridHead = () => '<div></div>' + WEEK.map(w => `<div class="gh">${w.l}<small>${w.d}</small></div>`).join('');

  function agendaCell(m, k){
    let h = '';
    const pl = plageOf(m, k), u = used(m, k), slots = m.interfaced ? (m.slots[k] || []) : [];
    if (m.indispo.has(k)){
      h += `<div class="occ indispo"><span class="t">Indisponible</span><span>Plages masquées</span></div>`;
      if (u) h += `<span class="hint">${u} orient. conservée${u > 1 ? 's' : ''}</span>`;
      return h + `<div class="cell-actions"><button type="button" class="sm tertiary" data-indispo="${k}">Retirer</button></div>`;
    }
    if (pl){
      const rem = pl.cap - u, full = rem <= 0;
      h += `<div class="occ ${pl.kind} ${full ? 'full' : ''}">
        <span class="t">${kindLabel(pl)}</span>
        <span>${hs(pl.start)} – ${hs(pl.end)}</span>
        <span class="num">${Math.max(rem, 0)} / ${pl.cap} dispo.</span>
        ${full ? '<span><span class="badge full">Complet</span></span><span class="hint">Non visible par la régulation</span>' : ''}
        ${u ? `<span class="hint">${u} orient.</span>` : ''}
        ${pl.src === 'precise' && m.defaults[k].on ? '<span class="hint">Remplace le Temps SAS</span>' : ''}
      </div>`;
    } else h += `<span class="hint">Aucune plage</span>`;
    if (slots.length) h += `<span class="slotlist">Éditeur : ${slots.map(s => s.replace(':', 'h')).join(', ')}</span>`;
    h += `<div class="cell-actions">
      ${pl && pl.src === 'precise' ? `<button type="button" class="sm tertiary" data-delprecise="${k}">Supprimer</button>` : `<button type="button" class="sm tertiary" data-add="${k}" aria-label="Ajouter une disponibilité ${halfLabel(k)}">+ Ajouter</button>`}
      <button type="button" class="sm tertiary" data-indispo="${k}" aria-label="Indisponibilité ${halfLabel(k)}">Indispo</button></div>`;
    return h;
  }

  // --- modale ---
  function openModal(k){
    const [d, hf] = k ? parseK(k) : [1, 'pm'], bd = bounds(d, hf);
    S.modal = {date:WEEK[d].iso, type:'sas', halves:new Set([hf]), start:toHHMM(bd[0]), end:toHHMM(Math.min(bd[0] + 120, bd[1])), cap:1, consult:new Set(['cabinet']), days:new Set(), err:''};
    renderModal(); $('overlay').hidden = false;
    setTimeout(() => { const f = $('mDate'); f && f.focus(); }, 30);
  }
  function closeModal(){ if (S) S.modal = null; $('overlay').hidden = true; }
  function renderModal(){
    const f = S.modal; if (!f) return;
    const dayIdx = WEEK.findIndex(w => w.iso === f.date);
    const isSat = dayIdx === 5;
    const halfOpt = (v, l, t) => `<label class="${f.halves.has(v) ? 'sel' : ''}"><input type="checkbox" name="mHalf" value="${v}" ${f.halves.has(v) ? 'checked' : ''}> ${l} <span class="hint">${t}</span></label>`;
    $('modal').innerHTML = `
      <button type="button" class="modal-close tertiary" data-act="closeModal">Fermer ✕</button>
      <h2 id="mTitle">Ajouter une ou plusieurs disponibilités</h2>
      <p>Indiquez quand la régulation SAS peut vous adresser des patients. Le Temps SAS couvre une demi-journée entière ; la plage horaire permet d'indiquer des heures précises. Lorsque vous êtes en congés, déclarez une indisponibilité.</p>
      <p class="hint">Les champs suivis d'un <span class="req">*</span> sont obligatoires</p>
      <form id="mForm" style="display:flex;flex-direction:column;gap:20px" novalidate>
        <div>
          <label class="flabel" for="mDate">Date ${f.type === 'sas' ? 'et demi-journée' : 'et heures'} de disponibilité <span class="req">*</span></label>
          <div class="daterow">
            <input type="date" id="mDate" min="2026-10-26" max="2026-10-31" value="${f.date}">
            ${f.type === 'sas'
              ? `<div class="halfpick" role="group" aria-label="Demi-journées">${halfOpt('am', 'Matin', isSat ? '8h – 12h' : '8h – 14h')}${halfOpt('pm', 'Après-midi', '14h – 20h')}</div>`
              : `<span>de</span><input type="time" id="mStart" value="${f.start}" min="08:00" max="20:00" step="900"><span>à</span><input type="time" id="mEnd" value="${f.end}" min="08:00" max="20:00" step="900">`}
          </div>
          <p class="hint" style="margin-top:6px">${f.type === 'sas' ? 'Cochez le matin, l\u2019après-midi ou les deux. Horaires fixes, non modifiables.' : 'Dans les horaires SAS, à l’intérieur d’une seule demi-journée (8h – 14h ou 14h – 20h ; samedi 8h – 12h).'}</p>
        </div>
        <div>
          <span class="flabel">Type de disponibilités <span class="req">*</span></span>
          <div class="types">
            <label class="type ${f.type === 'sas' ? 'sel' : ''}">
              <span class="tl"><input type="radio" name="mType" value="sas" ${f.type === 'sas' ? 'checked' : ''}><span>Temps SAS : la régulation peut me contacter sur la ou les demi-journées<span class="newbadge">Nouveau</span><small>Remplace la création de créneaux de consultation</small></span></span>
              ${f.type === 'sas' ? capBox() : ''}
            </label>
            <label class="type ${f.type === 'horaire' ? 'sel' : ''}">
              <span class="tl"><input type="radio" name="mType" value="horaire" ${f.type === 'horaire' ? 'checked' : ''}><span>Je souhaite recevoir des patient·e·s sans RDV sur cette plage horaire<small>Heures précises ; remplace le Temps SAS de la demi-journée pour cette date</small></span></span>
              ${f.type === 'horaire' ? capBox() : ''}
            </label>
          </div>
        </div>
        <div>
          <span class="flabel">Type de consultation <span class="req">*</span></span>
          <div class="checks">${Object.entries(CONSULT).map(([v, l]) => `<label><input type="checkbox" name="mConsult" value="${v}" ${f.consult.has(v) ? 'checked' : ''}><span class="ctag">${l}</span></label>`).join('')}</div>
        </div>
        <div>
          <span class="flabel">Créer une récurrence hebdomadaire chaque :</span>
          <div class="checks">${DAYNAMES.map((n, i) => { const dis = i === 6 || (i === 5 && f.type === 'sas' && f.halves.has('pm') && !f.halves.has('am'));
            return `<label class="${dis ? 'dis' : ''}"><input type="checkbox" name="mDays" value="${i}" ${f.days.has(i) && !dis ? 'checked' : ''} ${dis ? 'disabled' : ''}> ${n}</label>`; }).join('')}</div>
          <p class="hint" style="margin-top:6px">Dimanche et samedi après-midi : hors horaires SAS. Une récurrence reste visible 6 mois, prolongée à chaque modification ou orientation SAS.</p>
        </div>
        ${f.err ? `<p class="ferr" role="alert">${esc(f.err)}</p>` : ''}
        <div class="modal-foot"><button type="button" data-act="closeModal">Annuler</button><button type="submit" class="primary">Confirmer</button></div>
      </form>`;
    bindModal();
  }
  const capBox = () => M().interfaced ? `<span class="hint">Interfacé : pas de limite de patients, vos créneaux éditeur s'appliquent.</span>` : `<span class="capbox"><span>Nombre de patients possible</span><b class="num">${S.modal.cap}</b><span class="arr"><button type="button" data-mcap="1" aria-label="Augmenter">▲</button><button type="button" data-mcap="-1" aria-label="Diminuer">▼</button></span></span>`;

  function bindModal(){
    const f = S.modal;
    $('mDate').onchange = e => { f.date = e.target.value; f.err = ''; renderModal(); };
    document.querySelectorAll('[name=mType]').forEach(r => r.onchange = () => { f.type = r.value; f.err = ''; renderModal(); });
    document.querySelectorAll('[name=mHalf]').forEach(c => c.onchange = () => { c.checked ? f.halves.add(c.value) : f.halves.delete(c.value); f.err = ''; renderModal(); });
    document.querySelectorAll('[name=mConsult]').forEach(c => c.onchange = () => { c.checked ? f.consult.add(c.value) : f.consult.delete(c.value); });
    document.querySelectorAll('[name=mDays]').forEach(c => c.onchange = () => { c.checked ? f.days.add(+c.value) : f.days.delete(+c.value); renderModal(); });
    if ($('mStart')){ $('mStart').onchange = e => f.start = e.target.value; $('mEnd').onchange = e => f.end = e.target.value; }
    $('mForm').onsubmit = e => { e.preventDefault(); submitModal(); };
  }

  function submitModal(){
    const f = S.modal, m = M(), fail = msg => { f.err = msg; renderModal(); };
    const dayIdx = WEEK.findIndex(w => w.iso === f.date);
    if (dayIdx < 0) return fail('Choisissez une date entre le lundi 26 et le samedi 31 octobre (semaine de la maquette).');
    if (!f.consult.size) return fail('Cochez au moins un type de consultation.');
    const targets = f.days.size ? [...f.days].filter(i => i <= 5) : [dayIdx];
    const rec = f.days.size > 0, consult = [...f.consult];
    let start, end, halves;
    if (f.type === 'sas'){
      halves = ['am', 'pm'].filter(h => f.halves.has(h));
      if (!halves.length) return fail('Cochez le matin, l’après-midi ou les deux.');
    } else {
      start = toMin(f.start || '0:0'); end = toMin(f.end || '0:0');
      if (end <= start) return fail('L’heure de fin doit être après l’heure de début.');
      halves = [start < 840 ? 'am' : 'pm'];
    }
    const keys = [];
    for (const d of targets) for (const h of halves){
      const bd = bounds(d, h);
      if (!bd){ if (f.type === 'sas' && halves.length > 1) continue; return fail(`${WEEK[d].l} ${HALF[h]} : hors horaires SAS.`); }
      if (f.type === 'horaire' && (start < bd[0] || end > bd[1])) return fail(`La plage doit tenir dans la demi-journée ${HALF[h]} du ${WEEK[d].l.toLowerCase()} (${hs(bd[0])} – ${hs(bd[1])}). Créez deux disponibilités si elle s'étend sur la journée.`);
      if (!m.interfaced && f.cap < used(m, K(d, h))) return fail(`${halfLabel(K(d, h))} : ${used(m, K(d, h))} orientations déjà enregistrées, capacité minimale ${used(m, K(d, h))}.`);
      keys.push(K(d, h));
    }
    const replaces = (f.type === 'horaire' || !rec) && keys.some(k => m.defaults[k].on);
    keys.forEach(k => {
      const [d, h] = parseK(k), bd = bounds(d, h);
      if (f.type === 'sas' && rec) m.defaults[k] = {on:true, cap:f.cap, consult};
      else if (f.type === 'sas') m.precise[k] = {kind:'sas', recurring:false, start:bd[0], end:bd[1], cap:f.cap, consult};
      else m.precise[k] = {kind:'horaire', recurring:rec, start, end, cap:f.cap, consult};
    });
    const when = rec ? 'chaque ' + targets.map(d => WEEK[d].l.toLowerCase()).join(', ') : `${WEEK[dayIdx].l.toLowerCase()} ${WEEK[dayIdx].d}`;
    const satAmOnly = f.type === 'sas' && halves.length > 1 && targets.includes(5);
    const what = f.type === 'sas' ? `Temps SAS ${when} ${halves.map(h => HALF[h]).join(' et ')}${satAmOnly ? ' (samedi : matin seulement)' : ''}` : `Plage horaire ${hm(start)} – ${hm(end)} ${when}`;
    const capTxt = m.interfaced ? 'sans limite de patients (interfacé)' : `${f.cap} patient${f.cap > 1 ? 's' : ''}`;
    log('Effecteur', `${what}, ${capTxt} (${consult.map(c => CONSULT[c].toLowerCase()).join(', ')})`,
      replaces ? 'Remplace le Temps SAS de la demi-journée pour cette date' : rec ? `Visible par la régulation chaque semaine, jusqu'au ${UNTIL}` : 'Visible par la régulation sur cette date');
    S.sel = keys[0]; S.pending = null; closeModal(); toast('Disponibilité ajoutée'); render();
  }

  // --- rendu régulateur ---
  const DAYLBL = ['Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.','Dim.'];
  const DATES = ['26/10','27/10','28/10','29/10','30/10','31/10','01/11'];
  const LETTER = {tele:'T', cabinet:'C', domicile:'V'};
  function dayItems(p, d){
    const chips = [], outs = [];
    const info = h => (d <= 5 && bounds(d, h)) ? {k:K(d, h), ...rankOf(p, K(d, h))} : null;
    const am = info('am'), pm = info('pm');
    const ok = x => x && x.pl && x.rem > 0 && !x.sig;
    const mk = parts => ({keys:parts.map(x => x.k), start:parts[0].pl.start, end:parts.at(-1).pl.end, kind:parts[0].pl.kind,
      used:parts.reduce((a, x) => a + used(p, x.k), 0), cap:p.interfaced ? Infinity : parts.reduce((a, x) => a + x.pl.cap, 0),
      consult:[...new Set(parts.flatMap(x => x.pl.consult || []))], conf:parts.map(x => p.reg[x.k] && p.reg[x.k].confirmed).find(Boolean), byReg:parts.some(x => x.pl.origin === 'regulation'), slots:parts.flatMap(x => x.inP.map(s => ({s, k:x.k})))});
    if (ok(am) && ok(pm) && am.pl.kind === 'sas' && pm.pl.kind === 'sas' && am.pl.end === pm.pl.start) chips.push(mk([am, pm]));
    else [am, pm].forEach(x => { if (ok(x)) chips.push(mk([x])); });
    [am, pm].forEach(x => { if (x) x.outP.forEach(s => outs.push({s, k:x.k})); });
    const rank = Math.min(4, ...[am, pm].filter(Boolean).map(x => x.rank));
    const sigs = [am, pm].filter(x => x && x.pl && x.sig).map(x => ({k:x.k, pl:x.pl, sig:x.sig}));
    return {chips, outs, rank, sigs};
  }
  const dayName = d => `${['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][d]} ${DATES[d]}`;

  function renderReg(){
    const b = $('regBody');
    if (!S.converted){
      b.innerHTML = `<div class="empty"><b>Recherche disponible après la conversion</b><span>Lancez la conversion des créneaux de Dr Martin, ou partez d'un agenda vide.</span></div>`;
      return;
    }
    const d0 = parseK(S.sel)[0];
    b.innerHTML = `<div class="search"><span class="chip">Médecine générale</span><span class="chip">Créteil (94)</span>
      <label for="sel" class="hint" style="margin-left:4px">Date de recherche</label>
      <select id="sel">${WEEK.map((w, d) => `<option value="${K(d, 'am')}" ${d === d0 ? 'selected' : ''}>${dayName(d)}</option>`).join('')}</select></div>` + rcard(M(), d0);
  }

  const RA = {add:'Ajouter', confirm:'Confirmer', signal:'Signaler', delete:'Supprimer'};
  function regCandidates(p, f){
    const hs_ = ['am', 'pm'].filter(h => bounds(f.day, h));
    return f.action === 'add' ? hs_.filter(h => !plageOf(p, K(f.day, h))) : hs_.filter(h => plageOf(p, K(f.day, h)));
  }
  function regPanel(p, d0){
    const f = S.regPanel, days = [d0, d0 + 1, d0 + 2].filter(d => d <= 5);
    if (!days.includes(f.day)){ f.day = days[0]; f.halves = new Set(regCandidates(p, f)); }
    const cand = regCandidates(p, f);
    const radios = list => `<div class="checks" role="radiogroup" aria-label="Motif">${list.map(m => `<label><input type="radio" name="raMotif" value="${m}" ${f.motif === m ? 'checked' : ''}> ${m}</label>`).join('')}</div>`;
    let body = '';
    if (!cand.length) body = f.action === 'add' ? '<p class="hint">Ce jour a déjà une disponibilité sur chaque demi-journée : confirmez, signalez ou supprimez-la.</p>' : '<p class="hint">Aucune disponibilité ce jour.</p>';
    else {
      body = `<div class="checks">${cand.map(h => { const pl = plageOf(p, K(f.day, h)), bd = bounds(f.day, h);
        return `<label><input type="checkbox" name="raHalf" value="${h}" ${f.halves.has(h) ? 'checked' : ''}> ${f.action === 'add' ? `${h === 'am' ? 'Matin' : 'Après-midi'} <span class="hint">${hs(bd[0])} – ${hs(bd[1])}</span>` : `${hs(pl.start)} – ${hs(pl.end)} <span class="hint">${kindLabel(pl)}</span>`}</label>`; }).join('')}</div>`;
      if (f.action === 'add') body += p.interfaced ? '<p class="hint">Médecin interfacé : Temps SAS sans limite de patients.</p>' : `<label class="hint" style="display:flex;gap:8px;align-items:center">Nombre de patients <input type="number" id="raCap" min="1" max="20" value="${f.cap}" style="width:72px"></label>`;
      if (f.action === 'confirm') body += '<p class="hint">Le médecin a été joint et confirme sa disponibilité. Son échéance de 6 mois est repoussée.</p>';
      if (f.action === 'signal') body += radios(['Non joignable', 'PS indisponible']) + `<label for="raComment" class="hint">Commentaire (facultatif, 200 caractères)</label><textarea id="raComment" maxlength="200">${esc(f.comment)}</textarea>${p.interfaced ? '<p class="hint">Les créneaux éditeur restent affichés.</p>' : ''}`;
      if (f.action === 'delete') body += radios(['PS indisponible', 'Information erronée']) + '<p class="hint">Supprime la disponibilité de ce jour uniquement. La récurrence de l’effecteur n’est pas modifiée.</p>';
    }
    return `<div class="regpanel">
      <div class="seg" role="group" aria-label="Action">${Object.entries(RA).map(([a, l]) => `<button type="button" class="${f.action === a ? 'on' : ''}" data-ra="${a}">${l}</button>`).join('')}</div>
      <label class="hint" style="display:flex;gap:8px;align-items:center">Jour <select id="raDay">${days.map(d => `<option value="${d}" ${d === f.day ? 'selected' : ''}>${dayName(d)}</option>`).join('')}</select></label>
      ${body}
      ${f.err ? `<p class="ferr" role="alert">${esc(f.err)}</p>` : ''}
      <div class="actions"><button type="button" class="primary sm" data-act="regSubmit" ${cand.length ? '' : 'disabled'}>Valider</button><button type="button" class="tertiary sm" data-act="regCancel">Annuler</button></div>
    </div>`;
  }
  function regSubmit(){
    const f = S.regPanel, p = M(), keys = [...f.halves].filter(h => regCandidates(p, f).includes(h)).map(h => K(f.day, h));
    if (!keys.length){ f.err = 'Sélectionnez au moins une demi-journée.'; return; }
    if ((f.action === 'signal' || f.action === 'delete') && !f.motif){ f.err = 'Choisissez un motif.'; return; }
    S.clock += 4; const at = hm(S.clock), sas = 'SAS 94';
    keys.forEach(k => {
      const [d, h] = parseK(k), bd = bounds(d, h), r = p.reg[k] = p.reg[k] || {};
      if (f.action === 'add'){ p.regMask.delete(k); p.precise[k] = {kind:'sas', recurring:false, start:bd[0], end:bd[1], cap:p.interfaced ? 1 : Math.max(1, Math.min(20, f.cap)), consult:['cabinet'], origin:'regulation'}; delete r.signal; }
      if (f.action === 'confirm'){ r.confirmed = {at, sas}; delete r.signal; }
      if (f.action === 'signal'){ r.signal = {motif:f.motif, comment:f.comment.trim(), at, sas}; delete r.confirmed; }
      if (f.action === 'delete'){ delete p.precise[k]; p.regMask.add(k); delete r.signal; delete r.confirmed; }
    });
    const halvesTxt = keys.map(k => HALF[parseK(k)[1]]).join(' et ');
    const detail = {add:`Temps SAS ${halvesTxt}${p.interfaced ? '' : `, ${f.cap} patient${f.cap > 1 ? 's' : ''}`}`, confirm:`Disponibilité ${halvesTxt} confirmée`, signal:`${f.motif} (${halvesTxt})${f.comment.trim() ? ' : ' + f.comment.trim() : ''}`, delete:`Disponibilité ${halvesTxt} supprimée : ${f.motif}`}[f.action];
    const effect = {add:'Visible dans la recherche avec l’étiquette « Renseigné par la régulation »', confirm:'Étiquette « Confirmé » ; échéance de 6 mois repoussée', signal:p.interfaced ? 'Le Temps SAS n’est plus présenté comme joignable ce jour ; les créneaux éditeur restent affichés' : 'La plage perd sa priorité jusqu’à sa fin ; visible par tous les SAS', delete:'Disponibilité retirée de la recherche pour ce jour'}[f.action];
    p.regEvents.unshift({day:dayName(f.day), action:RA[f.action], detail, at, sas});
    log(`Régulateur (${sas})`, `${RA[f.action]} · ${dayName(f.day)} · ${detail}`, effect);
    S.regPanel = null; toast('Disponibilité mise à jour');
  }

  function rcard(p, d0){
    const days = [d0, d0 + 1, d0 + 2].filter(d => d <= 6);
    const ranks = {1:'plage avec créneaux réservables', 2:'plage, contact téléphonique', 3:'créneaux hors plage SAS', 4:'aucune disponibilité affichée'};
    const r0 = dayItems(p, d0).rank, pend = S.pending;
    const cols = days.map((d, i) => {
      const it = dayItems(p, d);
      let c = '';
      const labs = ch => `${ch.byReg ? '<span class="rlab" title="Renseigné par la régulation (SAS 94)">Ajout régulation</span>' : ''}${ch.conf ? `<span class="rlab ok" title="Confirmé par la régulation (${ch.conf.sas})">✓ Confirmé ${ch.conf.at}</span>` : ''}`;
      it.sigs.forEach(x => c += `<div class="sigchip"><span>${hm(x.pl.start)}–${hm(x.pl.end)}</span><span class="rlab warn">${esc(x.sig.motif)}</span><span class="hint">${x.sig.at} · ${x.sig.sas}</span>${x.sig.comment ? `<span class="hint">${esc(x.sig.comment)}</span>` : ''}</div>`);
      if (p.interfaced){
        it.chips.forEach(ch => c += `<div class="sas-band" title="Le médecin est joignable par la régulation sur ce temps"><b>Temps SAS</b><span>Joignable</span><span>${hm(ch.start)}–${hm(ch.end)}</span><span class="meta">${ch.consult.map(x => `<span class="ct" title="${CONSULT[x]}">${LETTER[x]}</span>`).join('')}</span>${labs(ch)}</div>`);
        const all = [...it.chips.flatMap(ch => ch.slots.map(x => ({...x, in:true}))), ...it.outs.map(x => ({...x, in:false}))].sort((x, y) => toMin(x.s) - toMin(y.s));
        all.forEach(x => c += `<button type="button" class="chip-s ${x.in ? 'sasin' : 'out'}" data-slot="${x.s}" data-key="${x.k}" ${x.in ? 'data-in="1" title="Créneau éditeur dans le Temps SAS"' : 'title="Créneau éditeur"'}>${x.s.replace(':', 'h')}</button>`);
      } else {
        it.chips.forEach(ch => c += `<button type="button" class="chip-p" data-chip="${ch.keys.join(',')}" data-label="${hm(ch.start)}–${hm(ch.end)}">
          <span>${hm(ch.start)}–${hm(ch.end)}</span>
          <span class="meta"><span class="capb">${ch.used}/${ch.cap}</span>${ch.consult.map(x => `<span class="ct" title="${CONSULT[x]}">${LETTER[x]}</span>`).join('')}</span>${labs(ch)}</button>`);
      }
      if (!c) c = '<div class="dash">–</div>';
      return `<div class="col ${i === 0 ? 'cur' : ''}"><div class="colh">${i === 0 && d === 0 ? 'Aujourd’hui' : `${DAYLBL[d]} ${DATES[d]}`}</div><div class="chips">${c}</div></div>`;
    }).join('');
    let conf = '';
    if (pend){
      const what = pend.kind === 'slot' ? `sur le créneau de ${pend.slot.replace(':', 'h')}` : pend.kind === 'hors' ? 'hors disponibilité' : `sur la plage ${pend.label}`;
      conf = `<div class="confirm"><span>Orientation vers ${esc(p.name)} le ${dayName(pend.d)}, ${what}.</span>
        <div class="actions"><button class="primary sm" type="button" data-act="confirm">Confirmer l'orientation</button><button class="tertiary sm" type="button" data-act="cancelPending">Annuler</button></div></div>`;
    }
    return `<article class="rcard">
      <div class="rc-top"><span class="rc-name">${esc(p.name)} ›</span>
        <div class="rc-tags"><span class="pill sas">Participe au SAS</span><span class="pill">Médecine générale</span><span class="pill">Secteur 1</span>${p.interfaced ? '<span class="pill">Agenda interfacé</span>' : ''}</div></div>
      <div class="rc-body">
        <div class="rc-info">
          <div><div class="lbl">Adresse 1</div>${esc(p.place)}<br>8 rue des Lilas, 94000 Créteil</div>
          <div><div class="lbl">Offres de soins</div>Médecine générale</div>
          <div class="full"><div class="lbl">Téléphone</div>+33 1 99 00 12 34 <span class="hint">(fictif)</span></div>
          <div class="full"><div class="lbl">Information complémentaire</div><div class="box">Consultations en cabinet. Merci d'appeler avant d'orienter un patient.</div></div>
        </div>
        <div class="rc-days">
          <div class="cols">${cols}</div>
          <button type="button" class="more" data-act="more">Voir plus de créneaux</button>
          <button type="button" class="primary rc-btn" data-hors="${d0}">Orientation hors disponibilité</button>
          <button type="button" class="rc-btn" data-act="pec">Demande de prise en charge</button>
          <button type="button" class="more" data-act="regOpen">Mettre à jour la disponibilité</button>
          ${S.regPanel ? regPanel(p, d0) : ''}
          ${conf}
        </div>
      </div>
      <p class="rc-note">Démonstration : rang du ${dayName(d0).toLowerCase()} dans la recherche = ${r0} (${ranks[r0]}). ${p.interfaced ? 'Médecin interfacé : le bandeau vert indique le Temps SAS, pendant lequel il est joignable ; les créneaux en vert tombent dans ce temps. Aucune capacité n\u2019est consommée.' : 'Cliquez une plage pour orienter un patient sur cette plage.'}</p>
    </article>`;
  }

  function renderLog(){
    $('log').innerHTML = S.log.length ? S.log.map(l => `<tr><td>${esc(l.actor)}</td><td>${esc(l.evt)}</td><td>${esc(l.effect)}</td></tr>`).join('')
      : '<tr><td colspan="3" style="color:var(--muted)">Aucun événement. Commencez par la conversion des créneaux.</td></tr>';
  }
  function render(){ renderEff(); renderReg(); renderLog(); bind(); }

  function bind(){
    const intf = $('intf'); if (intf) intf.onchange = () => {
      const m = M(); m.interfaced = intf.checked; m.slots = intf.checked ? JSON.parse(JSON.stringify(MARTIN_SLOTS)) : {}; m.booked = {};
      log('Effecteur', intf.checked ? 'Interfaçage avec un logiciel de rendez-vous' : 'Fin de l’interfaçage', intf.checked ? 'Des créneaux éditeur remontent : ceux qui tombent dans une plage passent au rang 1' : 'Les créneaux éditeur disparaissent');
      render(); };
    const sel = $('sel'); if (sel) sel.onchange = () => { S.sel = sel.value; S.pending = null; render(); };
    const f = S.regPanel;
    if (f){
      const rd = $('raDay'); if (rd) rd.onchange = () => { f.day = +rd.value; f.err = ''; f.halves = new Set(regCandidates(M(), f)); render(); };
      document.querySelectorAll('[name=raHalf]').forEach(c => c.onchange = () => { c.checked ? f.halves.add(c.value) : f.halves.delete(c.value); });
      document.querySelectorAll('[name=raMotif]').forEach(c => c.onchange = () => { f.motif = c.value; });
      const rc = $('raCap'); if (rc) rc.onchange = () => { f.cap = Math.round(+rc.value) || 1; };
      const cm = $('raComment'); if (cm) cm.oninput = () => { f.comment = cm.value; };
    }
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.mcap){ S.modal.cap = Math.max(1, Math.min(20, S.modal.cap + +t.dataset.mcap)); renderModal(); return; }
    const act0 = t.dataset.act;
    if (act0 === 'closeModal'){ closeModal(); return; }
    if (t.closest('#modal')) return;
    const m = S.converted ? M() : null;
    if (t.dataset.cap){
      const k = t.dataset.cap, df = m.defaults[k]; df.cap = Math.max(1, Math.min(20, df.cap + +t.dataset.delta));
      log('Effecteur', `Capacité du Temps SAS ${WEEK[parseK(k)[0]].l.toLowerCase()} ${HALF[parseK(k)[1]]} : ${df.cap}`, 'Capacité comptée par occurrence ; échéance repoussée de 6 mois');
      render(); return;
    }
    if (t.dataset.deldef){
      const k = t.dataset.deldef; m.defaults[k].on = false;
      log('Effecteur', `Suppression du Temps SAS ${WEEK[parseK(k)[0]].l.toLowerCase()} ${HALF[parseK(k)[1]]}`, 'Retiré de la recherche chaque semaine');
      S.sel = k; render(); return;
    }
    if (t.dataset.indispo){
      const k = t.dataset.indispo, on = !m.indispo.has(k); on ? m.indispo.add(k) : m.indispo.delete(k);
      log('Effecteur', `${on ? 'Indisponibilité' : 'Retrait de l’indisponibilité'} ${halfLabel(k)}`, on ? 'Les plages de la demi-journée sont masquées dans la recherche' : 'Les plages de la demi-journée réapparaissent');
      S.sel = k; S.pending = null; render(); return;
    }
    if (t.dataset.add){ openModal(t.dataset.add); return; }
    if (t.dataset.delprecise){
      const k = t.dataset.delprecise; delete m.precise[k];
      log('Effecteur', `Suppression de la disponibilité ponctuelle ${halfLabel(k)}`, m.defaults[k].on ? 'Le Temps SAS hebdomadaire s’applique de nouveau' : 'Plus de plage sur cette demi-journée');
      S.sel = k; render(); return;
    }
    if (t.dataset.ra){ const f = S.regPanel; f.action = t.dataset.ra; f.motif = ''; f.err = ''; f.halves = new Set(regCandidates(M(), f)); render(); return; }
    if (t.dataset.chip){ S.pending = {kind:'plage', keys:t.dataset.chip.split(','), label:t.dataset.label, d:parseK(t.dataset.chip.split(',')[0])[0]}; render(); return; }
    if (t.dataset.slot){ S.pending = {kind:'slot', key:t.dataset.key, slot:t.dataset.slot, inPlage:t.dataset.in === '1', d:parseK(t.dataset.key)[0]}; render(); return; }
    if (t.dataset.hors){ S.pending = {kind:'hors', d:+t.dataset.hors}; render(); return; }
    if (!act0) return;
    if (act0 === 'convert') convert();
    else if (act0 === 'skip'){ S.converted = true; log('Plateforme', 'Démarrage sans créneaux existants', 'Agenda vide : ajoutez un Temps SAS'); }
    else if (act0 === 'detail') S.detail = !S.detail;
    else if (act0 === 'openModal'){ openModal(); return; }
    else if (act0 === 'cancelPending') S.pending = null;
    else if (act0 === 'more' || act0 === 'pec'){ toast('Hors périmètre de la maquette'); return; }
    else if (act0 === 'regOpen'){ const f = {action:'confirm', day:parseK(S.sel)[0], cap:1, motif:'', comment:'', err:''}; f.halves = new Set(regCandidates(M(), f)); S.regPanel = f; S.pending = null; }
    else if (act0 === 'regCancel') S.regPanel = null;
    else if (act0 === 'regSubmit') regSubmit();
    else if (act0 === 'confirm') confirmOrient();
    render();
  });
  $('overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('overlay').hidden) closeModal(); });

  function confirmOrient(){
    const pd = S.pending, p = M();
    let keys = [];
    if (pd.kind === 'slot'){ (p.booked[pd.key] = p.booked[pd.key] || []).push(pd.slot); if (pd.inPlage && !p.interfaced){ p.orient[pd.key] = used(p, pd.key) + 1; keys = [pd.key]; } }
    else if (pd.kind === 'plage'){
      const k = pd.keys.find(x => { const r = rankOf(p, x); return r.pl && r.rem > 0; }) || pd.keys[0];
      p.orient[k] = used(p, k) + 1; keys = pd.keys;
    }
    let effect = 'Orientation hors disponibilité : capacité inchangée';
    if (pd.kind === 'slot' && p.interfaced) effect = pd.inPlage ? 'Créneau éditeur réservé dans le Temps SAS : le Temps SAS n\u2019est pas consommé' : 'Créneau éditeur réservé hors Temps SAS';
    else if (pd.kind === 'slot' && !pd.inPlage) effect = 'Créneau hors plage réservé : capacité inchangée';
    else if (keys.length){
      if (p.interfaced) effect = 'PS interfacé : pas de limite de patients';
      else { const rem = keys.reduce((a, x) => { const r = rankOf(p, x); return a + (r.pl ? Math.max(r.rem, 0) : 0); }, 0);
        effect = rem > 0 ? `Capacité restante : ${rem}` : 'Capacité atteinte : la plage n’est plus affichée'; }
    }
    log('Régulateur', `Orientation vers Dr Martin · ${dayName(pd.d)}${pd.slot ? ` · ${pd.slot.replace(':', 'h')}` : pd.label ? ` · plage ${pd.label}` : ''}`, effect);
    S.pending = null; toast('Orientation confirmée');
  }

  let tt; function toast(msg){ const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 2400); }
  $('btnReset').addEventListener('click', reset);
  reset();
})();
