# CICD Tasklist — Frontend

Interface web pour la gestion de tâches (tasklist), construite avec React, TypeScript et Vite.

## Stack technique

- **Framework** : React 19
- **Build tool** : Vite 8
- **Langage** : TypeScript
- **Tests** : Vitest + React Testing Library
- **Serveur de production** : Nginx (reverse proxy vers l'API backend)
- **Qualité de code** : SonarQube
- **CI/CD** : Jenkins
- **Conteneurisation** : Docker

## Prérequis

- Node.js >= 20.19 (requis par Vite/Vitest/Rolldown — une version plus ancienne échoue à l'installation des dépendances optionnelles)
- npm
- Docker (optionnel, pour le lancement conteneurisé)
- Le backend de l'application doit être accessible (voir [cicd-tasklist-backend](../cicd-tasklist-backend))

## Installation

```bash
npm install
```

## Configuration

Crée un fichier `.env.local` à la racine du projet si tu veux surcharger l'URL de l'API (utile en développement local) :

```env
VITE_API_URL=http://localhost:3001/api
```

| Variable        | Description                                              | Défaut   |
|-----------------|------------------------------------------------------------|----------|
| `VITE_API_URL`  | URL de base de l'API backend, utilisée par le client HTTP | `/api`   |

Par défaut (`/api`), les requêtes sont relatives et passent par le reverse proxy Nginx en production — `VITE_API_URL` ne doit être défini qu'en développement local pour pointer directement vers le backend.

## Lancer le projet

### En développement (avec rechargement à chaud)

```bash
npm run dev
```

L'application démarre sur `http://localhost:5173` (port par défaut de Vite).

### Build de production

```bash
npm run build
npm run preview
```

### Avec Docker Compose (recommandé)

Depuis la racine du dépôt principal (qui contient `docker-compose.yml`) :

```bash
docker compose up -d
```

Cela démarre la base MySQL, le backend, le frontend (sur le port `8080`), et SonarQube.

## Tests

```bash
npm test               # Tests unitaires
npm run test:coverage  # Tests unitaires + couverture
npm run test:watch     # Mode watch
```

Les rapports de couverture sont générés au format `lcov` (utilisé par SonarQube) et les résultats de tests au format JUnit (`reports/junit.xml`).

## Structure du projet

```
cicd-tasklist-frontend/
├── src/
│   ├── api/                  # Client HTTP vers le backend (taskApi.ts)
│   ├── components/            # Composants React (TaskForm, TaskList, TaskItem)
│   ├── hooks/                 # Hooks personnalisés (useTasks)
│   ├── types/                 # Types TypeScript partagés
│   ├── __tests__/             # Tests unitaires
│   ├── App.tsx                # Composant racine
│   └── main.tsx                # Point d'entrée
├── nginx/
│   └── default.conf.template  # Config Nginx (reverse proxy /api -> backend)
├── public/                    # Assets statiques (favicon, icônes)
├── dockerfile
├── Jenkinsfile
└── package.json
```

## Docker

Le [dockerfile](dockerfile) utilise un build multi-stage :

1. **build** : installe les dépendances et compile l'application avec Vite (`npm run build`)
2. **runtime** : image Nginx allégée qui sert les fichiers statiques et proxy les requêtes `/api/*` vers le backend

La variable d'environnement `BACKEND_URL` (définie au lancement du container) configure dynamiquement la cible du reverse proxy Nginx via [nginx/default.conf.template](nginx/default.conf.template).

Build manuel de l'image :

```bash
docker build -f dockerfile -t cicd-tasklist-frontend .
docker run -p 8080:80 -e BACKEND_URL=http://backend:3001 cicd-tasklist-frontend
```

## CI/CD (Jenkins)

Le [Jenkinsfile](Jenkinsfile) définit le pipeline suivant :

1. **Install dependencies** : `npm ci`
2. **Unit tests** : tests avec couverture
3. **SonarQube analysis** : analyse de qualité de code via SonarScanner
4. **Quality Gate** : bloque le pipeline si SonarQube juge la qualité insuffisante
5. **Build Docker image** : build de l'image taguée `latest` et `<BUILD_NUMBER>`
6. **Trivy scan + reports** : scan de vulnérabilités, rapports archivés en artefacts
7. **Trivy security gate** : bloque le pipeline si des vulnérabilités HIGH/CRITICAL sont trouvées
8. **Generate SBOM** : génère un inventaire des composants au format CycloneDX
9. **Push Docker image** : publication sur DockerHub (`johnwaia/cicd-tasklist-frontend`)

Le build se déclenche automatiquement (polling SCM toutes les 5 minutes), défini directement dans le Jenkinsfile (`triggers { pollSCM(...) }`).

### Prérequis Jenkins

- Outil **Node20** configuré avec une version >= 20.19.0 ou >= 22.x (NodeJS plugin)
- Outil **SonarScanner** configuré
- Serveur SonarQube déclaré dans **Manage Jenkins → System → SonarQube servers**, avec un webhook SonarQube → Jenkins configuré (`/sonarqube-webhook/`) pour que le Quality Gate réponde rapidement
- Credential **Secret text** pour le token SonarQube
- Credential **Username with password** `dockerhub-credentials` pour DockerHub
- Docker CLI et Trivy installés et accessibles depuis l'agent Jenkins
