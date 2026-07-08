/* ==================================================================
   Arrière-guichet SAS — Identités (compte unique multi-périmètres)
   Une identité porte des habilitations par application :
     - acces  : { role, territoire }  (BO Accès & Utilisateurs)
     - interop: { role }              (BO Interopérabilité)
   L'identité active est propagée entre les pages via le paramètre
   d'URL ?identity=<index> (robuste en ouverture directe file://),
   avec repli sur localStorage.
   ================================================================== */

const IDENTITIES = [
  { label: "Administrateur national",
    acces:   { role: "administrateur" },
    interop: { role: "ROLE_ADMINISTRATOR" } },

  { label: "Gestionnaire de compte — SAS-75 (Paris)",
    acces:   { role: "gestionnaire_compte", territoire: "SAS-75" },
    interop: null },

  { label: "Gestionnaire de compte — SAS-69 (Rhône)",
    acces:   { role: "gestionnaire_compte", territoire: "SAS-69" },
    interop: { role: "ROLE_MANAGER" } },

  { label: "Gestionnaire de compte — SAS-59 (Nord)",
    acces:   { role: "gestionnaire_compte", territoire: "SAS-59" },
    interop: null },

  { label: "Exploitant interopérabilité",
    acces:   null,
    interop: { role: "ROLE_MANAGER" } },

  { label: "Support interop (lecture seule)",
    acces:   null,
    interop: { role: "ROLE_AUTHENTICATED_USER" } },
];

// Rôles du BO Interopérabilité
const INTEROP_ROLES = ["ROLE_AUTHENTICATED_USER", "ROLE_MANAGER", "ROLE_ADMINISTRATOR"];
const INTEROP_ROLE_LABEL = {
  "ROLE_AUTHENTICATED_USER": "Utilisateur authentifié",
  "ROLE_MANAGER": "Manager",
  "ROLE_ADMINISTRATOR": "Administrateur",
};

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

// Navigation vers une page en conservant l'identité active
function gotoWithIdentity(page, i) { persistIdentityIdx(i); location.href = urlWithIdentity(page, i); }
