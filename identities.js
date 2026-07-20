/* ==================================================================
   Arrière-guichet SAS — Identités & habilitations
   Modèle : compte unique, avec un NIVEAU d'habilitation par
   arrière-guichet : null (aucun) · "lecture" · "ecriture".
   - Admin BO : super-rôle, écriture partout + gère les accès.
   - Admin    : niveaux Lecture/Écriture par guichet (fixés par l'Admin BO).
   - Gestionnaire de compte : profil territorial (scoping par territoire).
   L'identité active est propagée entre les pages via ?identity=<index>.
   ================================================================== */

// Les quatre arrière-guichets (composants techniques)
const GUICHETS = [
  { key: "utilisateurs", tech: "Keycloak",        title: "Gestion des utilisateurs",              page: "acces.html?component=keycloak", icon: "fr-icon-user-line" },
  { key: "sasdata",      tech: "SAS-DATA",         title: "Territoires · Départements · Support",  page: "acces.html?component=sasdata",  icon: "fr-icon-building-line" },
  { key: "offre_soins",  tech: "Open-Search",      title: "Offre de soins",                        page: "opensearch.html",               icon: "fr-icon-search-line" },
  { key: "interop",      tech: "Interopérabilité", title: "Gestion des flux d'API",                page: "interop.html",                  icon: "fr-icon-settings-5-line" },
];
const GUICHET_BY_KEY = Object.fromEntries(GUICHETS.map(g => [g.key, g]));

function levelLabel(l) { return l === "ecriture" ? "Écriture" : l === "lecture" ? "Lecture" : "Aucun"; }

/* Identités de démonstration.
   role : "administrateur" (admin/admin BO) | "gestionnaire_compte" — pilote le
          périmètre (global vs territorial), réutilisé par le BO Accès.
   hab  : niveau par guichet. */
const IDENTITIES = [
  { label: "Admin BO (super-administrateur)", role: "administrateur", adminBO: true, territoire: null,
    hab: { utilisateurs: "ecriture", sasdata: "ecriture", offre_soins: "ecriture", interop: "ecriture" } },

  { label: "Admin — accès complet (écriture)", role: "administrateur", adminBO: false, territoire: null,
    hab: { utilisateurs: "ecriture", sasdata: "ecriture", offre_soins: "ecriture", interop: "ecriture" } },

  { label: "Admin — lecture seule", role: "administrateur", adminBO: false, territoire: null,
    hab: { utilisateurs: "lecture", sasdata: "lecture", offre_soins: "lecture", interop: "lecture" } },

  { label: "Admin — Offre de soins (écriture)", role: "administrateur", adminBO: false, territoire: null,
    hab: { utilisateurs: null, sasdata: null, offre_soins: "ecriture", interop: null } },

  { label: "Gestionnaire de compte — SAS-75 (Paris)", role: "gestionnaire_compte", adminBO: false, territoire: "SAS-75",
    hab: { utilisateurs: "ecriture", sasdata: "ecriture", offre_soins: "ecriture", interop: null } },

  { label: "Gestionnaire de compte — SAS-69 (Rhône)", role: "gestionnaire_compte", adminBO: false, territoire: "SAS-69",
    hab: { utilisateurs: "ecriture", sasdata: "ecriture", offre_soins: "ecriture", interop: "lecture" } },

  { label: "Gestionnaire de compte — SAS-59 (Nord)", role: "gestionnaire_compte", adminBO: false, territoire: "SAS-59",
    hab: { utilisateurs: "ecriture", sasdata: "ecriture", offre_soins: "ecriture", interop: null } },

  { label: "Exploitant interopérabilité (écriture)", role: "administrateur", adminBO: false, territoire: null,
    hab: { utilisateurs: null, sasdata: null, offre_soins: null, interop: "ecriture" } },
];

/* ── Helpers d'habilitation ─────────────────────────────────────── */
function isAdminBO(id) { return !!(id && id.adminBO); }
function habLevel(id, comp) {
  if (isAdminBO(id)) return "ecriture";           // l'Admin BO a tout en écriture
  return (id && id.hab && id.hab[comp]) || null;
}
function habHas(id, comp)   { return habLevel(id, comp) != null; }
function habWrite(id, comp) { return habLevel(id, comp) === "ecriture"; }

// Rôles du BO Interopérabilité (mapping indicatif niveau ↔ rôle technique)
const INTEROP_ROLE_BY_LEVEL = { lecture: "ROLE_AUTHENTICATED_USER", ecriture: "ROLE_ADMINISTRATOR" };

const IDENTITY_KEY = "bo-sas-identity-idx-v1";

function currentIdentityIdx() {
  try {
    const u = new URLSearchParams(location.search).get("identity");
    if (u !== null && IDENTITIES[Number(u)]) return Number(u);
  } catch (e) {}
  try {
    const v = localStorage.getItem(IDENTITY_KEY);
    if (v !== null && IDENTITIES[Number(v)]) return Number(v);
  } catch (e) {}
  return 0;
}
function persistIdentityIdx(i) { try { localStorage.setItem(IDENTITY_KEY, String(i)); } catch (e) {} }
function urlWithIdentity(page, i) {
  const sep = page.includes("?") ? "&" : "?";
  return page + sep + "identity=" + encodeURIComponent(i);
}
function gotoWithIdentity(page, i) { persistIdentityIdx(i); location.href = urlWithIdentity(page, i); }
