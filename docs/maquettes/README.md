# Time Manager — Maquettes

Maquettes cliquables de l'application Time Manager (projet T-DEV-700) : **18 écrans web** et **8 écrans mobiles**, construits à partir des user stories.

## Lancer la maquette

### Méthode simple

1. Ouvrez le dossier `docs/maquettes/` (ou dézippez l'archive si on vous l'a envoyée).
2. Double-cliquez sur **`index.html`**, il s'ouvre dans votre navigateur.
3. Cliquez sur un écran pour l'ouvrir en grand. Les menus fonctionnent, donc vous pouvez naviguer entre les écrans.

> Il faut une connexion internet pour charger la police Inter. Sans connexion, la maquette s'affiche quand même, avec une police système.

### Si les miniatures de l'index restent blanches

Certains navigateurs bloquent les aperçus quand on ouvre un fichier en local. Dans ce cas, lancez un petit serveur depuis le dossier dézippé.

Avec Python :

```bash
python -m http.server 5500
```

Ou avec Node.js :

```bash
npx serve -l 5500
```

Puis ouvrez <http://localhost:5500> dans le navigateur.

## Les écrans

| Rôle | Écrans |
|---|---|
| **Commun** | Connexion (email ou Microsoft), mot de passe oublié, mon profil (en lecture seule, avec demande de modification ou de suppression envoyée au manager, une seule demande en cours à la fois : `03-mon-profil.html?demande=en-attente` montre cet état) |
| **Employé** | Pointage (arrivée, pauses, départ), mes heures, justifier une absence |
| **Manager** | Pointage, dashboard équipe (KPI, alertes de retards), salariés, ajout d'un salarié avec son planning, fiche salarié (modification et suppression), équipes (modale au clic), demandes à valider : absences, modifications d'informations, suppressions de compte (modales de validation et de refus) |
| **Directeur** | Pointage, dashboard de la branche (équipes, managers et leurs pointages), salariés et managers de la branche |
| **Admin** | Dashboard global, utilisateurs, branches et équipes, pointages. L'admin ne pointe pas. |
| **Mobile** | Connexion, pointage (avec pause et planning du jour), mes heures, absences (nouvelle demande / historique), profil (demandes au manager). Manager et directeur : mon équipe ou ma branche, fiche salarié, demandes à valider |

Les écrans web font 1440 × 900 et s'adaptent à la taille de la fenêtre. Les écrans mobiles font 390 × 844.

Les écrans partagés entre plusieurs rôles prennent le rôle dans l'adresse : `web/04-employe-accueil.html?role=manager` affiche le pointage avec le menu du manager (`employe`, `manager`, `directeur`).

D'autres paramètres affichent un état précis de l'écran :

| Paramètre | Effet |
|---|---|
| `?etat=pause` | Pointage pendant une pause (un seul bouton : pointer la fin de pause) |
| `?vue=historique` | Absences mobile : historique au lieu du formulaire |
| `?demande=en-attente` | Profil : une demande est en cours, les nouvelles demandes sont bloquées |
| `#id` (ex. `#modal-refus`, `#sheet-refus`, `#filtre`) | Ouvre directement une modale, un panneau ou un menu |

## Organisation des fichiers

```
maquettes/
├── index.html      → page d'accueil avec tous les écrans
├── web/            → écrans du site (01 à 17)
├── mobile/         → écrans de l'application (m01 à m07)
└── assets/
    ├── style.css   → couleurs, composants (boutons, cartes, tableaux…)
    └── app.js      → menus, barre d'onglets mobile et icônes
```

Les couleurs sont définies en haut de `assets/style.css` (`--primary`, `--danger`…) : modifiez-les à cet endroit pour changer tout le thème.

## Importer dans Figma

1. Installez l'extension Chrome **html.to.design**.
2. Ouvrez un écran dans Chrome (avec le serveur local de la section précédente).
3. Lancez l'extension, puis importez le fichier généré dans Figma.

La version gratuite de l'extension limite le nombre d'imports.

## À savoir

- Les noms, les heures et les chiffres sont **fictifs**.
- C'est une maquette : les boutons et les formulaires ne font rien, seule la navigation fonctionne.
- KPI retenus : moyenne d'heures par semaine, taux de ponctualité, heures supplémentaires et taux d'absence.
