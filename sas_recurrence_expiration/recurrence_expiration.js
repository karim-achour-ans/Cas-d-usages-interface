/* Agenda SAS - simulation de l'expiration des disponibilites recurrentes.
   Regles : voir README.md du dossier. */
(() => {
  const START = new Date(2026, 9, 16);
  const DAYS = [{v:1,l:'Lundi'},{v:2,l:'Mardi'},{v:3,l:'Mercredi'},{v:4,l:'Jeudi'},{v:5,l:'Vendredi'},{v:6,l:'Samedi'}];
  const EVT = {creation:'création', modification:'modification', prolongation:'prolongation', reactivation:'réactivation', orientation:'orientation SAS'};
  let S;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const addMonths = (d, n) => { const r = new Date(d); const day = r.getDate(); r.setDate(1); r.setMonth(r.getMonth() + n);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate(); r.setDate(Math.min(day, last)); return r; };
  const fmt = d => d.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric'});
  const fmtOcc = d => d.toLocaleDateString('fr-FR', {weekday:'short', day:'2-digit', month:'2-digit'});
  const fmtMonth = d => d.toLocaleDateString('fr-FR', {month:'short', year:'2-digit'});
  const dayKey = d => d.toISOString().slice(0, 10);

  function reset(){
    S = { now:new Date(START), origin:new Date(START), rec:null, log:[], pending:null, confirm:null, deleted:null };
    closeMail(); render();
  }

  // --- règles ---
  const echeance = r => addMonths(r.lastEvent, 6);
  const relance = r => addDays(echeance(r), -15);
  const suppression = r => addMonths(r.deactivatedAt, 6);
  const soon = r => r.status === 'active' && S.now >= relance(r);

  function nextMilestone(){
    const r = S.rec; if (!r) return null;
    if (r.status === 'active') return !r.relanceSent && relance(r) > S.now ? {at:relance(r), kind:'relance'} : {at:echeance(r), kind:'echeance'};
    if (r.status === 'off') return {at:suppression(r), kind:'suppr'};
    return null;
  }
  function advanceTo(target){
    if (!S.rec || S.rec.status === 'gone') { S.now = target; render(); return; }
    while (S.now < target){
      const m = nextMilestone();
      if (m && m.at <= target){ S.now = m.at; trigger(m.kind); if (S.pending || !S.rec || S.rec.status === 'gone') break; }
      else { S.now = target; }
    }
    if (S.rec && S.rec.status === 'gone' && S.now < target) S.now = target;
    render();
  }
  function trigger(kind){
    const r = S.rec;
    if (kind === 'relance'){ r.relanceSent = true; log('Relance J-15 envoyée (mail M1)', `Échéance le ${fmt(echeance(r))}`); openMail('M1'); }
    else if (kind === 'echeance'){ r.status = 'off'; r.deactivatedAt = new Date(S.now);
      log('Désactivation (mail M2)', `Retirée de la recherche. Réactivable jusqu'au ${fmt(suppression(r))}`); openMail('M2'); }
    else if (kind === 'suppr'){ r.status = 'gone'; S.deleted = new Date(S.now); log('Suppression', 'La récurrence disparaît de l’agenda effecteur'); }
  }
  function validityEvent(type){
    const r = S.rec; const before = r.status === 'active' ? echeance(r) : null;
    r.lastEvent = new Date(S.now); r.lastType = type; r.relanceSent = false;
    if (r.status === 'off'){ r.status = 'active'; r.deactivatedAt = null; }
    log(cap(EVT[type]), before ? `Échéance repoussée du ${fmt(before)} au ${fmt(echeance(r))}` : `De nouveau visible par la régulation jusqu'au ${fmt(echeance(r))}`);
    flashRec(); toast(`Visible par la régulation jusqu'au ${fmt(echeance(r))}`);
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function log(evt, effect){ S.log.unshift({at:new Date(S.now), evt, effect}); }

  function occurrences(r, n = 6){
    const out = []; let d = addDays(S.now, 1);
    for (let i = 0; i < 28 && out.length < n; i++, d = addDays(d, 1)) if (r.days.includes(d.getDay())) out.push(new Date(d));
    return out;
  }
  const recLabel = r => `${r.days.map(v => DAYS.find(x => x.v === v).l).join(', ')} · ${r.start.replace(':','h')} à ${r.end.replace(':','h')}`;

  // --- rendu ---
  function render(){
    $('today').textContent = fmt(S.now);
    renderGauge(); renderJalons(); renderRule(); renderEff(); renderReg(); renderLog();
    const m = nextMilestone();
    $('btnNext').disabled = !m || !!S.pending;
    $('btnNext').textContent = m ? `Étape suivante : ${({relance:'relance J-15', echeance:'désactivation', suppr:'suppression'})[m.kind]}` : 'Étape suivante';
    $('btnMonth').disabled = !!S.pending;
  }

  function renderGauge(){
    const r = S.rec, g = $('gauge');
    let end = addMonths(S.origin, 15);
    if (r && r.status === 'active') end = new Date(Math.max(end, addMonths(echeance(r), 7), addMonths(S.now, 2)));
    if (r && r.status === 'off') end = new Date(Math.max(end, addMonths(suppression(r), 1)));
    end = new Date(Math.max(end, addMonths(S.now, 2)));
    const span = end - S.origin, pct = d => Math.max(0, Math.min(100, (d - S.origin) / span * 100));
    let h = '<div class="track"></div>';
    h += `<div class="seg past" style="left:0;width:${pct(S.now)}%"></div>`;
    if (r && r.status === 'active'){ const a = pct(r.lastEvent), b = pct(echeance(r)); h += `<div class="seg active" style="left:${a}%;width:${b - a}%" title="Visible par la régulation"></div>`; }
    if (r && r.status === 'off'){ const a = pct(r.deactivatedAt), b = pct(suppression(r)); h += `<div class="seg off" style="left:${a}%;width:${b - a}%" title="Désactivée, réactivable"></div>`; }
    for (let m = 0; ; m += 3){ const d = addMonths(S.origin, m); if (d > end) break; h += `<span class="tick" style="left:${pct(d)}%">${fmtMonth(d)}</span>`; }
    if (r){
      r.orientations.forEach(o => { h += `<span class="mark orient" style="left:${pct(o.at)}%" title="Orientation SAS le ${fmt(o.at)}"><i></i></span>`; });
      if (r.status === 'active'){
        h += mark('relance', relance(r), 'Relance J-15', 'up', pct) + mark('echeance', echeance(r), 'Désactivation', 'down', pct) + mark('suppr', addMonths(echeance(r), 6), 'Suppression', 'down', pct);
      } else if (r.status === 'off'){
        h += mark('echeance', r.deactivatedAt, 'Désactivée', 'down', pct) + mark('suppr', suppression(r), 'Suppression', 'down', pct);
      }
    }
    h += `<span class="now" style="left:${pct(S.now)}%" title="Date simulée : ${fmt(S.now)}"></span>`;
    g.innerHTML = h;
  }
  const mark = (k, d, l, pos, pct) => `<span class="mark ${k}" style="left:${pct(d)}%"><i></i></span><span class="mlabel ${pos} ${k}" style="left:${pct(d)}%">${l} · ${fmt(d)}</span>`;

  function renderJalons(){
    const r = S.rec, j = $('jalons');
    if (!r || r.status === 'gone'){ j.innerHTML = '<span class="lbl">Créez une récurrence dans l’agenda effecteur pour faire apparaître les jalons.</span>'; return; }
    const items = r.status === 'active'
      ? [['relance', relance(r), 'Relance J-15', !r.relanceSent], ['echeance', echeance(r), 'Désactivation', true], ['suppr', addMonths(echeance(r), 6), 'Suppression', true]]
      : [['suppr', suppression(r), 'Suppression', true]];
    j.innerHTML = '<span class="lbl">Aller au jalon :</span>' + items.map(([k, d, l, ok]) =>
      `<button type="button" class="chip-btn ${k}" data-jump="${d.getTime()}" ${ok && d > S.now && !S.pending ? '' : 'disabled'}>${l} · ${fmt(d)}</button>`).join('');
  }

  function renderRule(){
    const r = S.rec, el = $('rule');
    if (!r){ el.textContent = 'Règle : une disponibilité récurrente reste visible 6 mois après son dernier événement de validité (création, modification, prolongation, réactivation ou orientation SAS).'; return; }
    if (r.status === 'active') el.innerHTML = `<b>Active</b> jusqu'au <b class="num">${fmt(echeance(r))}</b> : 6 mois après la dernière ${EVT[r.lastType]} du ${fmt(r.lastEvent)}.`;
    else if (r.status === 'off') el.innerHTML = `<b>Désactivée</b> depuis le ${fmt(r.deactivatedAt)} : invisible pour la régulation. Réactivable jusqu'au <b class="num">${fmt(suppression(r))}</b>, puis supprimée.`;
    else el.innerHTML = `<b>Supprimée</b> le ${fmt(S.deleted)} après 6 mois de désactivation sans réactivation.`;
  }

  function formHTML(r, edit){
    const days = r ? r.days : [1, 4];
    return `<form id="recForm">
      <div class="field"><span class="hint">Type de disponibilité</span>
        <fieldset><legend class="sr" style="position:absolute;left:-9999px">Type</legend>
          <label><input type="radio" name="type" value="Plage" ${!r || r.type === 'Plage' ? 'checked' : ''}> Plage horaire</label>
          <label><input type="radio" name="type" value="Créneau" ${r && r.type === 'Créneau' ? 'checked' : ''}> Créneau</label>
        </fieldset></div>
      <fieldset><legend>Jours de la semaine</legend>
        ${DAYS.map(d => `<label><input type="checkbox" name="days" value="${d.v}" ${days.includes(d.v) ? 'checked' : ''}> ${d.l}</label>`).join('')}
      </fieldset>
      <div class="row">
        <div class="field"><label for="fStart">Début</label><input type="time" id="fStart" value="${r ? r.start : '14:00'}"></div>
        <div class="field"><label for="fEnd">Fin</label><input type="time" id="fEnd" value="${r ? r.end : '18:00'}"></div>
      </div>
      <div class="field"><label for="fPlace">Lieu d'exercice</label><input type="text" id="fPlace" value="${esc(r ? r.place : 'Cabinet des Lilas, Créteil (94)')}"></div>
      <p class="hint">Une disponibilité récurrente reste visible 6 mois. Elle est prolongée automatiquement à chaque orientation SAS ou modification de votre part.</p>
      ${edit && r.status === 'active' ? `<p class="hint">Visible jusqu'au ${fmt(echeance(r))}. L'enregistrement prolongera jusqu'au ${fmt(addMonths(S.now, 6))}.</p>` : ''}
      <p class="hint" id="formErr" hidden style="color:var(--warn)">Cochez au moins un jour.</p>
      <div class="actions">
        <button class="primary" type="submit">${!edit ? 'Créer la récurrence' : r.status === 'off' ? 'Enregistrer et réactiver' : 'Enregistrer'}</button>
        ${edit ? '<button type="button" class="tertiary" data-act="cancelEdit">Annuler</button>' : ''}
      </div></form>`;
  }

  function renderEff(){
    const r = S.rec, b = $('effBody');
    if (!r || r.status === 'gone'){
      b.innerHTML = (S.deleted ? `<div class="alert info"><span>Votre récurrence a été supprimée le ${fmt(S.deleted)}. Vous pouvez en créer une nouvelle.</span></div>` : '')
        + '<h3>Créer une disponibilité récurrente</h3>' + formHTML(null, false);
      bindForm(false); return;
    }
    if (S.editing){ b.innerHTML = '<h3>Modifier la récurrence</h3>' + formHTML(r, true); bindForm(true); return; }
    let banner = '';
    if (r.status === 'off') banner = `<div class="alert warn"><span>1 disponibilité récurrente est désactivée et n'est plus visible par la régulation.</span><button type="button" data-act="reactivate">Réactiver</button></div>`;
    else if (soon(r)) banner = `<div class="alert info"><span>1 disponibilité récurrente expire dans moins de 15 jours.</span><button type="button" data-act="prolong">Prolonger</button></div>`;
    const badge = r.status === 'off' ? '<span class="badge off">Désactivée</span>' : soon(r) ? `<span class="badge soon">Expire le ${fmt(echeance(r)).slice(0,5)}</span>` : '<span class="badge active">Active</span>';
    const last = r.orientations.at(-1);
    const occ = occurrences(r).map(d => { const k = dayKey(d), booked = r.booked.includes(k);
      return `<span class="${r.status === 'off' ? 'off' : booked ? 'rdv' : ''}">${fmtOcc(d)}${booked ? ' · orientation' : ''}</span>`; }).join('');
    b.innerHTML = banner + `<h3>Mes disponibilités récurrentes</h3>
      <div class="rec" id="recCard">
        <div class="rec-top"><div><div class="rec-title">${r.type} · ${esc(recLabel(r))}</div><div class="rec-sub">${esc(r.place)}</div></div>${badge}</div>
        <dl class="kv">
          ${r.status === 'active' ? `<dt>Visible jusqu'au</dt><dd class="num">${fmt(echeance(r))}</dd>` : `<dt>Supprimée le</dt><dd class="num">${fmt(suppression(r))}</dd>`}
          <dt>Dernière orientation SAS</dt><dd class="num">${last ? fmt(last.at) : 'Aucune'}</dd>
        </dl>
        <div><div class="hint" style="margin-bottom:6px">Prochaines occurrences</div><div class="occ">${occ}</div></div>
        <div class="actions">
          ${r.status === 'off' ? '<button class="primary" type="button" data-act="reactivate">Réactiver</button>' : `<button class="${soon(r) ? 'primary' : ''}" type="button" data-act="prolong">Prolonger</button>`}
          <button type="button" data-act="edit">Modifier</button>
          <button type="button" class="tertiary" data-act="delete">Supprimer</button>
        </div>
      </div>`;
  }

  function bindForm(edit){
    $('recForm').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target, days = [...f.querySelectorAll('[name=days]:checked')].map(i => +i.value);
      if (!days.length){ $('formErr').hidden = false; return; }
      const data = {type:f.querySelector('[name=type]:checked').value, days, start:$('fStart').value || '14:00', end:$('fEnd').value || '18:00', place:$('fPlace').value || 'Cabinet'};
      if (!edit){
        S.rec = {...data, lastEvent:new Date(S.now), lastType:'creation', status:'active', relanceSent:false, deactivatedAt:null, orientations:[], booked:[]};
        S.origin = new Date(S.now); S.deleted = null;
        log('Création de la récurrence', `${data.type} ${recLabel(data)} · visible jusqu'au ${fmt(echeance(S.rec))}`);
        toast('Récurrence créée : elle apparaît dans la recherche');
      } else {
        Object.assign(S.rec, data); S.editing = false; validityEvent(S.rec.status === 'off' ? 'reactivation' : 'modification');
      }
      render();
    });
  }

  function renderReg(){
    const r = S.rec, b = $('regBody');
    let h = `<div class="search"><span>Médecine générale</span><span>Créteil (94)</span><span>Disponible sous 48 h</span></div>`;
    if (!r){ h += `<div class="empty"><b>Aucune disponibilité pour Dr Martin</b><span>Créez une récurrence côté effecteur pour la voir apparaître ici.</span></div>`; }
    else if (r.status !== 'active'){
      h += `<div class="empty"><b>Dr Martin n'apparaît plus avec une disponibilité</b><span>${r.status === 'off' ? 'La récurrence est désactivée : ses occurrences sont retirées de la recherche tant que l’effecteur ne la réactive pas.' : 'La récurrence a été supprimée.'}</span></div>`;
    } else {
      const slots = occurrences(r).map(d => { const k = dayKey(d), booked = r.booked.includes(k);
        return `<span class="slot" role="button" tabindex="${booked ? -1 : 0}" aria-disabled="${booked}" data-occ="${k}">${fmtOcc(d)} · ${r.type === 'Plage' ? `${r.start.replace(':','h')}–${r.end.replace(':','h')}` : r.start.replace(':','h')}</span>`; }).join('');
      h += `<div class="card">
        <div class="rec-top"><div><div class="name">Dr Claire Martin</div><div class="rec-sub">Médecin généraliste · ${esc(r.place)}</div></div><span class="badge src">Agenda SAS</span></div>
        <div class="hint">${r.type === 'Plage' ? 'Plages de disponibilité' : 'Créneaux'} · cliquez pour orienter un patient</div>
        <div class="slots">${slots}</div>
        ${S.confirm ? `<div class="confirm"><span>Orientation vers Dr Martin le <b>${fmtOcc(new Date(S.confirm))}</b>. Le médecin a été contacté et a donné son accord.</span>
          <div class="actions"><button class="primary" type="button" data-act="confirmOrient">Confirmer l'orientation</button><button class="tertiary" type="button" data-act="cancelOrient">Annuler</button></div></div>` : ''}
      </div>`;
    }
    b.innerHTML = h;
  }

  function renderLog(){
    $('log').innerHTML = S.log.length ? S.log.map(l => `<tr><td>${fmt(l.at)}</td><td>${esc(l.evt)}</td><td>${esc(l.effect)}</td></tr>`).join('')
      : '<tr><td colspan="3" style="color:var(--muted)">Aucun événement. Commencez par créer une récurrence.</td></tr>';
  }

  // --- mails ---
  function openMail(kind){
    const r = S.rec; S.pending = kind;
    const m = kind === 'M1'
      ? {subject:`Vos disponibilités SAS expirent le ${fmt(echeance(r))}`,
         body:`<p>Bonjour Docteur Martin,</p><p>La disponibilité récurrente suivante ne sera plus visible par la régulation SAS à partir du <b>${fmt(echeance(r))}</b> :</p>
           <ul><li>${r.type} · ${esc(recLabel(r))} · ${esc(r.place)}</li></ul><p>Si elle est toujours valable, prolongez-la en un clic. Sinon, modifiez-la ou laissez-la expirer.</p>`,
         actions:`<button class="primary" type="button" data-mail="prolong">Prolonger mes disponibilités</button><button type="button" data-mail="ignore">Ne pas prolonger</button>`}
      : {subject:'Vos disponibilités SAS ne sont plus visibles par la régulation',
         body:`<p>Bonjour Docteur Martin,</p><p>La disponibilité récurrente suivante a été désactivée le <b>${fmt(r.deactivatedAt)}</b> :</p>
           <ul><li>${r.type} · ${esc(recLabel(r))} · ${esc(r.place)}</li></ul><p>Elle reste dans votre agenda et vous pouvez la réactiver jusqu'au <b>${fmt(suppression(r))}</b>. Passé ce délai, elle sera supprimée.</p>`,
         actions:`<button class="primary" type="button" data-mail="reactivate">Réactiver mes disponibilités</button><button type="button" data-mail="close">Fermer</button>`};
    $('mail').innerHTML = `<div class="mail-head"><span class="tag">Mail ${kind === 'M1' ? 'M1 · relance J-15' : 'M2 · désactivation'}</span>
        <span>De : Plateforme SAS · À : Dr Claire Martin · ${fmt(S.now)}</span><b id="mailSubject">Objet : ${m.subject}</b></div>
      <div class="mail-body">${m.body}<div class="mail-actions">${m.actions}</div>
        <p class="mail-foot">Pourquoi ce message ? Pour garantir à la régulation des informations fiables, une disponibilité récurrente sans mise à jour ni orientation SAS depuis 6 mois n'est plus proposée.</p></div>`;
    $('overlay').hidden = false;
    setTimeout(() => { const btn = $('mail').querySelector('button'); btn && btn.focus(); }, 30);
  }
  function closeMail(){ S && (S.pending = null); $('overlay').hidden = true; }

  $('overlay').addEventListener('click', e => {
    const a = e.target.closest('[data-mail]'); if (!a) return;
    const act = a.dataset.mail; closeMail();
    if (act === 'prolong') validityEvent('prolongation');
    if (act === 'reactivate') validityEvent('reactivation');
    if (act === 'ignore'){ log('Relance ignorée', 'La récurrence sera désactivée à l’échéance'); advanceTo(echeance(S.rec)); return; }
    render();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('overlay').hidden){ closeMail(); render(); } });

  // --- actions ---
  document.addEventListener('click', e => {
    const j = e.target.closest('[data-jump]'); if (j && !j.disabled){ advanceTo(new Date(+j.dataset.jump)); return; }
    const s = e.target.closest('.slot'); if (s){ if (s.getAttribute('aria-disabled') !== 'true'){ S.confirm = s.dataset.occ; render(); } return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'prolong') validityEvent('prolongation');
    else if (act === 'reactivate') validityEvent('reactivation');
    else if (act === 'edit') S.editing = true;
    else if (act === 'cancelEdit') S.editing = false;
    else if (act === 'delete'){ S.editing = false; S.rec.status = 'gone'; S.deleted = new Date(S.now); log('Suppression par l’effecteur', 'La récurrence disparaît de l’agenda et de la recherche'); }
    else if (act === 'confirmOrient'){ const k = S.confirm; S.confirm = null; S.rec.booked.push(k); S.rec.orientations.push({at:new Date(S.now), occ:k}); validityEvent('orientation'); }
    else if (act === 'cancelOrient') S.confirm = null;
    render();
  });
  document.addEventListener('keydown', e => { const s = e.target.closest && e.target.closest('.slot'); if (s && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); s.click(); } });

  $('btnNext').addEventListener('click', () => { const m = nextMilestone(); if (m) advanceTo(m.at); });
  $('btnMonth').addEventListener('click', () => advanceTo(addMonths(S.now, 1)));
  $('btnReset').addEventListener('click', reset);

  function flashRec(){ requestAnimationFrame(() => { const c = $('recCard'); if (!c) return; c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 900); }); }
  let tt; function toast(msg){ const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 2600); }

  reset();
})();
