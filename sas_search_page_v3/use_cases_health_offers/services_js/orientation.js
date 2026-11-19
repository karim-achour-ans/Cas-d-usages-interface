/**
 * orientation.js
 * Simulation de l'orientation d'un patient depuis la page de résultats
 * (epic SAS-13182, stories SAS-13637 à SAS-13641).
 *
 *  - SAS-13637 : orienter sur une plage horaire (heure + 1 patient)
 *  - SAS-13638 : orienter sur un créneau (aucune saisie)
 *  - SAS-13639 : orienter hors disponibilité (date + heure libres)
 *  - SAS-13640 : récapitulatif, confirmation, contrôle à la persistance
 *  - SAS-13641 : mise à jour de la carte sans rechargement
 *
 * Mock : la « persistance » est un store en mémoire. Une case à cocher
 * [Simulation] dans le récapitulatif permet de jouer le cas où la
 * disponibilité a été prise par un autre régulateur entre-temps.
 */

// ─── Libellés (wording Drupal = référence) ─────────────────────────────────

const TXT = {
  title:        'Adresser un patient',
  titleHd:      'Adresser un patient hors créneaux',
  hour:         'Heure du rendez-vous :',
  patients:     'Nombre de patients adressés',
  consent:      "En enregistrant l'orientation vers ce professionnel de santé, je confirme l'avoir contacté par téléphone et avoir obtenu son accord",
  infos:        'Informations complémentaires',
  recapIntro:   'Vous adressez un patient à',
  errorTaken:   "Le rendez-vous n'est plus disponible",
  errorTakenSub:"L'orientation n'a pas été enregistrée. Choisissez une autre disponibilité.",
  errorTech:    "Une erreur est survenue, l'orientation n'a pas été enregistrée.",
  dayEmpty:     'Pas de créneau disponible',
};

const STEP_MIN = 15;

// ─── Store « persistance » (mock) ──────────────────────────────────────────

/** slotId → { quota: number|null, booked: number, taken: boolean } */
const store = new Map();
/** Historique des orientations enregistrées (consultable en console). */
const orientations = [];
window.__sasOrientations = orientations;

function slotState(btn) {
  const id = btn.dataset.slotId;
  if (!store.has(id)) {
    store.set(id, {
      quota:  btn.dataset.quota ? Number(btn.dataset.quota) : null,
      booked: Number(btn.dataset.booked ?? 0),
      taken:  false,
    });
  }
  return store.get(id);
}

/**
 * Contrôle de disponibilité au moment de la persistance (SAS-13640).
 * @returns {{ ok: true } | { ok: false, reason: 'taken' | 'tech' }}
 */
function persist(ctx, simulateTaken) {
  if (ctx.kind !== 'hd') {
    const st = store.get(ctx.slotId);
    if (simulateTaken) {
      // Un autre régulateur vient de prendre la disponibilité.
      if (st.quota !== null) st.booked = st.quota; else st.taken = true;
    }
    const free = st.quota !== null ? st.booked < st.quota : !st.taken;
    if (!free) return { ok: false, reason: 'taken' };
    if (st.quota !== null) st.booked += 1; else st.taken = true;
  }
  orientations.push({
    at: new Date().toISOString(),
    kind: ctx.kind,
    slotId: ctx.slotId ?? null,
    offer: ctx.offer.name,
    rdv: ctx.rdvDate.toISOString(),
  });
  return { ok: true };
}

// ─── Helpers date / heure ──────────────────────────────────────────────────

const pad = n => String(n).padStart(2, '0');
const hhmm = d => `${pad(d.getHours())}h${pad(d.getMinutes())}`;
const ddmmyyyy = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const ddmmyy = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
const weekday = d => d.toLocaleDateString('fr-FR', { weekday: 'long' });
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Heures d'une plage au pas de 15 min, fin exclue (SAS-13637). */
function plageHours(start, end) {
  const out = [];
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + STEP_MIN * 60000)) {
    out.push(t);
  }
  return out.length ? out : [new Date(start)];
}

/** Prochaine heure disponible : première ≥ maintenant, sinon début de plage. */
function nextAvailableIndex(hours) {
  const now = Date.now();
  const i = hours.findIndex(h => h.getTime() >= now);
  return i === -1 ? 0 : i;
}

/** Maintenant + 1 h, arrondi au quart d'heure supérieur (SAS-13639, à valider). */
function defaultHdDateTime() {
  const d = new Date(Date.now() + 60 * 60000);
  d.setSeconds(0, 0);
  const rest = d.getMinutes() % STEP_MIN;
  if (rest) d.setMinutes(d.getMinutes() + (STEP_MIN - rest));
  return d;
}

// ─── Contexte de l'offre (lu sur la carte) ─────────────────────────────────

function offerFromCard(card) {
  let p = {};
  try { p = JSON.parse(card.dataset.panel || '{}'); } catch { /* données absentes */ }
  return {
    name:      p.name || card.querySelector('.fr-card__title')?.textContent.trim() || '—',
    specialty: p.specialty || '',
    phone:     p.phone || '',
    comment:   p.comment || '',
  };
}

// ─── Dialog ────────────────────────────────────────────────────────────────

let dialog, body, live;
let ctx = null;         // contexte de l'orientation en cours
let returnFocus = null; // élément à refocaliser à la fermeture

function ensureDom() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'sas-orient-dialog';
  dialog.setAttribute('aria-labelledby', 'sas-orient-title');
  dialog.innerHTML = `
    <div class="sas-orient-head">
      <h2 class="sas-orient-title" id="sas-orient-title"></h2>
      <button type="button" class="fr-btn--close fr-btn" data-orient-close title="Fermer la fenêtre">Fermer</button>
    </div>
    <div class="sas-orient-body"></div>`;
  document.body.appendChild(dialog);
  body = dialog.querySelector('.sas-orient-body');

  live = document.createElement('p');
  live.className = 'fr-sr-only';
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);

  dialog.querySelector('[data-orient-close]').addEventListener('click', close);
  // Échap : fermeture native, sans enregistrer.
  dialog.addEventListener('close', () => {
    ctx = null;
    if (returnFocus?.isConnected) returnFocus.focus();
  });
  // Clic sur le fond : ne ferme pas (évite les pertes de saisie).
}

function close() { dialog.close(); }

function setTitle(text) {
  dialog.querySelector('#sas-orient-title').textContent = text;
}

function psLine(o) {
  return `
    <div class="sas-orient-ps">
      <a href="#" class="sas-orient-ps-name" data-orient-ps>${o.name}</a>
      ${o.specialty ? `<span class="sas-orient-ps-spe">${o.specialty}</span>` : ''}
      ${o.phone ? `<a class="sas-orient-ps-phone" href="tel:${o.phone.replace(/\s/g, '')}"><span class="fr-icon-phone-line fr-icon--sm" aria-hidden="true"></span>${o.phone}</a>` : ''}
    </div>`;
}

function infosBlock(o) {
  if (!o.comment || o.comment === '-') return '';
  return `
    <section class="sas-orient-infos" aria-labelledby="sas-orient-infos-title">
      <h3 class="sas-orient-infos-title" id="sas-orient-infos-title">
        <span class="fr-icon-edit-line fr-icon--sm" aria-hidden="true"></span>${TXT.infos}
      </h3>
      <div class="sas-orient-infos-text">${o.comment}</div>
    </section>`;
}

const consent = () => `<p class="sas-orient-consent">${TXT.consent}</p>`;

// ─── Étape 1 : formulaires ─────────────────────────────────────────────────

function renderPlageForm() {
  const { offer, start, end, state } = ctx;
  const hours = plageHours(start, end);
  const def = nextAvailableIndex(hours);
  ctx.added = false;

  setTitle(TXT.title);
  body.innerHTML = `
    ${psLine(offer)}
    ${infosBlock(offer)}
    <p class="sas-orient-when"><strong>${capitalize(weekday(start))} ${ddmmyyyy(start)}</strong> - ${hhmm(start)} - ${hhmm(end)}</p>
    <div class="sas-orient-hour">
      <label class="sas-orient-hour-label" for="sas-orient-hour">${TXT.hour}</label>
      <select class="fr-select sas-orient-hour-select" id="sas-orient-hour">
        ${hours.map((h, i) => `<option value="${h.toISOString()}"${i === def ? ' selected' : ''}>${hhmm(h)}</option>`).join('')}
      </select>
    </div>
    <div class="sas-orient-counter" role="group" aria-labelledby="sas-orient-counter-label">
      <span id="sas-orient-counter-label">${TXT.patients}</span>
      <div class="sas-orient-counter-row">
        <button type="button" class="sas-orient-round" data-orient-minus aria-label="Retirer le patient" hidden>−</button>
        <output class="sas-orient-count" aria-live="polite">${state.booked} / ${state.quota}</output>
        <button type="button" class="sas-orient-round" data-orient-plus aria-label="Ajouter un patient">+</button>
      </div>
    </div>
    ${consent()}
    <div class="sas-orient-actions">
      <button type="button" class="fr-btn fr-btn--secondary" data-orient-cancel>Annuler</button>
      <button type="button" class="fr-btn" data-orient-save disabled>Enregistrer</button>
    </div>`;

  const select = body.querySelector('#sas-orient-hour');
  const plus   = body.querySelector('[data-orient-plus]');
  const minus  = body.querySelector('[data-orient-minus]');
  const out    = body.querySelector('.sas-orient-count');
  const save   = body.querySelector('[data-orient-save]');

  const refresh = () => {
    out.textContent = `${state.booked + (ctx.added ? 1 : 0)} / ${state.quota}`;
    plus.hidden  = ctx.added;   // 1 patient maximum par orientation
    minus.hidden = !ctx.added;
    save.disabled = !(select.value && ctx.added);
  };
  plus.addEventListener('click',  () => { ctx.added = true;  refresh(); minus.focus(); });
  minus.addEventListener('click', () => { ctx.added = false; refresh(); plus.focus(); });
  select.addEventListener('change', refresh);
  save.addEventListener('click', () => {
    ctx.rdvDate = new Date(select.value);
    renderRecap();
  });
  bindCommon();
  refresh();
}

function renderCreneauForm() {
  const { offer, start, end } = ctx;
  setTitle(TXT.title);
  body.innerHTML = `
    ${psLine(offer)}
    ${infosBlock(offer)}
    <p class="sas-orient-when"><strong>${weekday(start)} ${ddmmyyyy(start)}</strong> - ${hhmm(start)}${end ? ` - ${hhmm(end)}` : ''}</p>
    ${consent()}
    <div class="sas-orient-actions">
      <button type="button" class="fr-btn fr-btn--secondary" data-orient-cancel>Annuler</button>
      <button type="button" class="fr-btn" data-orient-save>Enregistrer</button>
    </div>`;
  body.querySelector('[data-orient-save]').addEventListener('click', () => {
    ctx.rdvDate = new Date(start);
    renderRecap();
  });
  bindCommon();
}

function renderHdForm() {
  const { offer } = ctx;
  const def = defaultHdDateTime();
  const defValue = `${pad(def.getHours())}:${pad(def.getMinutes())}`;
  const options = [];
  for (let m = 0; m < 24 * 60; m += STEP_MIN) {
    const v = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    options.push(`<option value="${v}"${v === defValue ? ' selected' : ''}>${v.replace(':', 'h')}</option>`);
  }

  setTitle(TXT.titleHd);
  body.innerHTML = `
    ${psLine(offer)}
    <div class="sas-orient-hd-fields">
      <div class="fr-input-group fr-mb-0">
        <label class="fr-label" for="sas-orient-date">Date :</label>
        <input class="fr-input" type="date" id="sas-orient-date" value="${isoDate(def)}">
      </div>
      <div class="fr-select-group fr-mb-0">
        <label class="fr-label" for="sas-orient-hd-hour">à :</label>
        <select class="fr-select" id="sas-orient-hd-hour">${options.join('')}</select>
      </div>
    </div>
    ${consent()}
    <div class="sas-orient-actions">
      <button type="button" class="fr-btn fr-btn--secondary" data-orient-cancel>Annuler</button>
      <button type="button" class="fr-btn" data-orient-save>Enregistrer</button>
    </div>`;

  const date = body.querySelector('#sas-orient-date');
  const hour = body.querySelector('#sas-orient-hd-hour');
  const save = body.querySelector('[data-orient-save]');
  const refresh = () => {
    hour.disabled = !date.value;
    save.disabled = !(date.value && hour.value);
  };
  date.addEventListener('input', refresh);
  hour.addEventListener('change', refresh);
  save.addEventListener('click', () => {
    const [y, mo, d] = date.value.split('-').map(Number);
    const [h, mi] = hour.value.split(':').map(Number);
    ctx.rdvDate = new Date(y, mo - 1, d, h, mi);
    renderRecap();
  });
  bindCommon();
  refresh();
}

function renderForm() {
  if (ctx.kind === 'plage') renderPlageForm();
  else if (ctx.kind === 'creneau') renderCreneauForm();
  else renderHdForm();
  body.querySelector('select, input, [data-orient-save]:not([disabled]), [data-orient-cancel]')?.focus();
}

function bindCommon() {
  body.querySelector('[data-orient-cancel]')?.addEventListener('click', close);
  body.querySelector('[data-orient-ps]')?.addEventListener('click', e => e.preventDefault());
}

// ─── Étape 2 : récapitulatif + confirmation ────────────────────────────────

function recapLine() {
  const d = ctx.rdvDate;
  const base = `le ${weekday(d)} ${ddmmyy(d)} à ${hhmm(d)}`;
  return ctx.kind === 'plage'
    ? `${base} sur la plage ${hhmm(ctx.start)} - ${hhmm(ctx.end)}`
    : base;
}

function renderRecap(error = null) {
  const { offer } = ctx;
  const canSimulate = ctx.kind !== 'hd';
  body.innerHTML = `
    ${error ? `
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
      <h3 class="fr-alert__title">${error === 'taken' ? TXT.errorTaken : TXT.errorTech}</h3>
      ${error === 'taken' ? `<p>${TXT.errorTakenSub}</p>` : ''}
    </div>` : ''}
    <div class="sas-orient-recap">
      <p class="fr-mb-0">${TXT.recapIntro}</p>
      ${psLine(offer)}
      <p class="fr-mb-0">${recapLine()}</p>
    </div>
    ${!error && canSimulate ? `
    <div class="fr-checkbox-group fr-checkbox-group--sm sas-orient-sim">
      <input type="checkbox" id="sas-orient-sim">
      <label class="fr-label" for="sas-orient-sim">[Simulation] Un autre régulateur prend cette disponibilité avant ma confirmation</label>
    </div>` : ''}
    <div class="sas-orient-actions">
      ${error
        ? `<button type="button" class="fr-btn" data-orient-cancel>Fermer</button>`
        : `<button type="button" class="fr-btn fr-btn--secondary" data-orient-edit>Modifier</button>
           <button type="button" class="fr-btn" data-orient-confirm>Confirmer</button>`}
    </div>`;

  bindCommon();
  if (error) {
    body.querySelector('[data-orient-cancel]').focus();
    return;
  }

  // Modifier : retour au formulaire réinitialisé (état d'ouverture).
  body.querySelector('[data-orient-edit]').addEventListener('click', renderForm);

  const confirm = body.querySelector('[data-orient-confirm]');
  confirm.addEventListener('click', () => {
    confirm.disabled = true; // une seule orientation, même en double clic
    const simulate = body.querySelector('#sas-orient-sim')?.checked ?? false;
    const res = persist(ctx, simulate);
    if (!res.ok) { renderRecap(res.reason); return; }
    const done = ctx;
    close();
    applyToCard(done);
  });
  confirm.focus();
}

// ─── Étape 3 : mise à jour de la carte (SAS-13641) ─────────────────────────

function applyToCard(done) {
  const msg = `Orientation enregistrée vers ${done.offer.name}, ${recapLineFor(done)}.`;

  if (done.kind !== 'hd' && done.btn?.isConnected) {
    const st = store.get(done.slotId);
    const list = done.btn.closest('.sas-slot-day-list');
    const stillOpen = st.quota !== null && st.booked < st.quota;

    if (stillOpen) {
      const counter = done.btn.querySelector('.sas-slot-counter');
      if (counter) counter.textContent = `${st.booked}/${st.quota}`;
      done.btn.dataset.booked = String(st.booked);
      done.btn.setAttribute('aria-label',
        done.btn.getAttribute('aria-label').replace(/\d+ patients? sur/, `${st.booked} patient${st.booked > 1 ? 's' : ''} sur`));
      done.btn.classList.add('sas-slot-btn--updated');
      returnFocus = done.btn;
    } else {
      // Plage pleine ou créneau : n'est plus affiché.
      returnFocus = done.card.querySelector('.fr-card__title');
      done.btn.remove();
      if (list && !list.querySelector('.sas-slot-btn')) {
        list.innerHTML = `<span class="sas-slot-empty">${TXT.dayEmpty}</span>`;
      }
    }
  }
  if (returnFocus?.isConnected) returnFocus.focus();
  live.textContent = msg;
}

function recapLineFor(c) {
  const saved = ctx; ctx = c;
  const line = recapLine();
  ctx = saved;
  return line;
}

// ─── Ouverture ─────────────────────────────────────────────────────────────

function openFromSlot(btn) {
  ensureDom();
  const card = btn.closest('.js-practitioner-card');
  const state = slotState(btn);
  ctx = {
    kind:   state.quota !== null ? 'plage' : 'creneau',
    btn, card, state,
    slotId: btn.dataset.slotId,
    offer:  offerFromCard(card),
    start:  new Date(btn.dataset.start),
    end:    btn.dataset.end ? new Date(btn.dataset.end) : null,
  };
  returnFocus = btn;
  renderForm();
  dialog.showModal();
}

function openHd(btn) {
  ensureDom();
  const card = btn.closest('.js-practitioner-card');
  ctx = { kind: 'hd', btn, card, offer: offerFromCard(card) };
  returnFocus = btn;
  renderForm();
  dialog.showModal();
}

document.addEventListener('click', e => {
  const slot = e.target.closest('.js-orient-slot');
  if (slot) { e.preventDefault(); openFromSlot(slot); return; }
  const hd = e.target.closest('.js-orient-hd');
  if (hd) { e.preventDefault(); openHd(hd); }
});
