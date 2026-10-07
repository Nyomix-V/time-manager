// Génère la barre latérale (web), la barre d'onglets (mobile) et les icônes.
// Icônes : tracés Lucide (licence ISC).
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  checkmark: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
  timer: '<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};

const icon = (name) =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

// Tout le monde pointe, sauf l'admin.
const ROLES = {
  employe: {
    user: ["LM", "Léa Martin", "Employée · Finance"],
    nav: [
      ["Pointage", "clock", "04-employe-accueil.html"],
      ["Mes heures", "timer", "05-employe-mes-heures.html"],
      ["Absences", "file", "06-employe-absences.html"],
      ["Mon profil", "user", "03-mon-profil.html"],
    ],
    tabs: [
      ["Pointer", "clock", "m02-accueil.html"],
      ["Mes heures", "chart", "m03-mes-heures.html"],
      ["Absences", "file", "m04-absence.html"],
      ["Profil", "user", "m05-profil.html"],
    ],
  },
  manager: {
    user: ["KB", "Karim Benali", "Manager · Finance"],
    nav: [
      ["Pointage", "clock", "04-employe-accueil.html"],
      ["Mes heures", "timer", "05-employe-mes-heures.html"],
      ["Dashboard équipe", "chart", "07-manager-dashboard.html"],
      ["Salariés", "users", "08-manager-salaries.html"],
      ["Équipes", "building", "12-manager-equipes.html"],
      ["Demandes à valider", "check", "13-manager-absences.html", 5],
      ["Mon profil", "user", "03-mon-profil.html"],
    ],
    tabs: [
      ["Pointer", "clock", "m02-accueil.html"],
      ["Équipe", "chart", "m06-manager-equipe.html"],
      ["Absences", "file", "m04-absence.html"],
      ["Profil", "user", "m05-profil.html"],
    ],
  },
  directeur: {
    user: ["CF", "Claire Fontaine", "Directrice · Finance"],
    nav: [
      ["Pointage", "clock", "04-employe-accueil.html"],
      ["Mes heures", "timer", "05-employe-mes-heures.html"],
      ["Dashboard branche", "chart", "18-directeur-dashboard.html"],
      ["Salariés", "users", "08-manager-salaries.html"],
      ["Équipes", "building", "12-manager-equipes.html"],
      ["Demandes à valider", "check", "13-manager-absences.html", 5],
      ["Mon profil", "user", "03-mon-profil.html"],
    ],
    tabs: [
      ["Pointer", "clock", "m02-accueil.html"],
      ["Branche", "chart", "m06-manager-equipe.html"],
      ["Absences", "file", "m04-absence.html"],
      ["Profil", "user", "m05-profil.html"],
    ],
  },
  admin: {
    user: ["SD", "Sophie Durand", "Administratrice"],
    nav: [
      ["Dashboard global", "chart", "14-admin-dashboard.html"],
      ["Utilisateurs", "users", "15-admin-utilisateurs.html"],
      ["Branches & équipes", "building", "16-admin-branches.html"],
      ["Pointages", "clock", "17-admin-pointages.html"],
      ["Mon profil", "user", "03-mon-profil.html"],
    ],
  },
};

// Les écrans partagés (pointage, mes heures, salariés…) reçoivent le rôle dans l'URL : ?role=manager
const urlRole = new URLSearchParams(location.search).get("role");
const withRole = (href, key) => (key === "employe" ? href : `${href}?role=${key}`);

document.querySelectorAll("aside.sidebar[data-role]").forEach((el) => {
  const key = ROLES[urlRole] && urlRole !== "admin" ? urlRole : el.dataset.role;
  const role = ROLES[key];
  const items = role.nav
    .map(([label, ic, href, count]) => {
      const current = label === el.dataset.active ? ' aria-current="page"' : "";
      const badge = count ? `<span class="nav-count" aria-label="${count} en attente">${count}</span>` : "";
      return `<a class="nav-item" href="${withRole(href, key)}"${current}>${icon(ic)}${label}${badge}</a>`;
    })
    .join("");
  const [ini, name, sub] = role.user;
  document.querySelectorAll("[data-first-name]").forEach((n) => (n.textContent = name.split(" ")[0]));
  el.setAttribute("aria-label", "Navigation principale");
  el.innerHTML = `
    <div class="logo">${icon("clock")}Time Manager</div>
    <nav style="display:flex;flex-direction:column;gap:4px">${items}</nav>
    <div class="sb-spacer"></div>
    <div class="sb-user"><div class="avatar">${ini}</div><div><strong>${name}</strong><span>${sub}</span></div></div>
    <a class="nav-item" href="01-connexion.html">${icon("logout")}Déconnexion</a>`;
});

document.querySelectorAll("nav.tabbar[data-role]").forEach((el) => {
  el.setAttribute("aria-label", "Navigation principale");
  const key = ROLES[urlRole]?.tabs ? urlRole : el.dataset.role;
  el.innerHTML = ROLES[key].tabs
    .map(([label, ic, href]) => {
      const current = label === el.dataset.active ? ' aria-current="page"' : "";
      return `<a class="tab" href="${withRole(href, key)}"${current}>${icon(ic)}${label}</a>`;
    })
    .join("");
});

document.querySelectorAll("[data-i]").forEach((el) => {
  el.outerHTML = icon(el.dataset.i).replace('class="ic"', `class="ic ${el.className}"`);
});

// Modales : data-open="id" ouvre, data-close ferme, Échap ferme. Une ancre (#id) ouvre la modale ou le menu au chargement.
document.addEventListener("click", (e) => {
  const opener = e.target.closest("[data-open]");
  if (opener) {
    e.preventDefault();
    document.getElementById(opener.dataset.open).hidden = false;
  }
  const closer = e.target.closest("[data-close]");
  if (closer || e.target.classList.contains("overlay")) {
    e.preventDefault();
    (closer || e.target).closest(".overlay").hidden = true;
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".overlay[id]").forEach((o) => (o.hidden = true));
});
if (location.hash) {
  const target = document.querySelector(location.hash);
  if (target?.tagName === "DETAILS") target.open = true;
  else if (target) target.hidden = false;
}

// Écrans web : adapte le cadre 1440 × 900 à la taille de la fenêtre, sans le couper.
const webScreen = document.querySelector("body > .app");
if (webScreen) {
  document.body.classList.add("fit");
  const fit = () => {
    const scale = Math.min(window.innerWidth / 1440, window.innerHeight / 900);
    webScreen.style.transform = `scale(${scale})`;
  };
  fit();
  window.addEventListener("resize", fit);
}
