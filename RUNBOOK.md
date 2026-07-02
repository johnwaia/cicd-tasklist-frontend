# Runbook — Pipeline CI/CD Jenkins / SonarQube (Tasklist)

Procédures opérationnelles pour diagnostiquer et résoudre les incidents courants sur l'infrastructure CI/CD du projet Tasklist (Jenkins, SonarQube, Docker, Trivy).

## Architecture de référence

- **Jenkins** : tourne dans un container Docker (`jenkins/jenkins:lts`), accessible sur `localhost:8090`
- **SonarQube** : service `sonarqube` dans `docker-compose.yml`, accessible sur `localhost:9000`
- **DockerHub** : images poussées vers `johnwaia/cicd-tasklist-backend` et `johnwaia/cicd-tasklist-frontend`
- **Jobs Jenkins** : `cicd-tasklist-backend` et `cicd-tasklist-frontend`, déclenchés par polling SCM (`pollSCM`, toutes les 5 minutes)

---

## Incident : `docker: not found` dans un stage Jenkins

**Symptôme** : un stage `sh 'docker build ...'` échoue avec `script.sh.copy: 1: docker: not found`.

**Cause** : le container Jenkins n'a pas le CLI Docker installé, même si le socket Docker est monté.

**Résolution** :
```bash
docker exec -u root jenkins bash -c "apt-get update -qq && apt-get install -y -qq docker.io"
docker exec -u root jenkins usermod -aG root jenkins
docker restart jenkins
```
Vérifier ensuite :
```bash
docker exec jenkins docker version
```

**⚠️ Note** : cette installation est perdue si le container est **recréé** (pas juste redémarré). Pour une solution durable, construire une image Jenkins personnalisée avec Docker CLI + Trivy préinstallés.

---

## Incident : `trivy: not found`

**Symptôme** : le stage `Trivy scan + reports` échoue avec `trivy: not found`.

**Résolution** :
```bash
docker exec -u root jenkins bash -c "curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.71.2"
```
Vérifier la dernière version disponible avant d'installer :
```bash
curl -s https://api.github.com/repos/aquasecurity/trivy/releases/latest | grep tag_name
```

---

## Incident : `Quality Gate` bloqué 5 minutes puis échoue

**Symptôme** : le stage `Quality Gate` reste sur `status is 'IN_PROGRESS'` pendant tout le `timeout`, puis abort.

**Cause** : le webhook SonarQube → Jenkins n'est pas configuré. Sans lui, `waitForQualityGate` doit polling l'API SonarQube en boucle et finit par timeout.

**Résolution** :
1. SonarQube → **Administration → Configuration → Webhooks → Create**
2. Name: `Jenkins`, URL: `http://host.docker.internal:8090/sonarqube-webhook/`
3. **Create**

Une fois configuré, le Quality Gate doit répondre en quelques secondes.

---

## Incident : build Docker anormalement lent (contexte de plusieurs centaines de Mo)

**Symptôme** : l'étape `[internal] load build context` du build Docker transfère 200-300+ Mo et prend 10-15+ secondes (voire bien plus avec un disque chargé).

**Cause** : absence de `.dockerignore`, donc `COPY . .` inclut `node_modules`, `.git`, `coverage`, `reports`, etc.

**Résolution** : créer un `.dockerignore` à la racine du projet concerné :
```
node_modules
dist
.git
.gitignore
coverage
reports
.scannerwork
*.log
.env
.env.local
.vscode
.idea
```

---

## Incident : `npm error code ECONNRESET` / `Could not resolve host: github.com` pendant un build

**Symptôme** : erreurs réseau ponctuelles (DNS ou connexion) pendant `npm ci` ou le checkout Git.

**Cause** : généralement transitoire (blip réseau Docker Desktop).

**Résolution** : relancer le build. Si le problème persiste sur plusieurs builds consécutifs, vérifier :
```bash
docker exec jenkins getent hosts github.com
docker exec jenkins cat /etc/resolv.conf
```

---

## Incident : `Trivy security gate` échoue avec des CVE dans des dépendances `node-pkg`

**Symptôme** : le stage `Trivy security gate` échoue (`exit-code 1`) en listant des CVE HIGH/CRITICAL.

**Démarche** :
1. Identifier si la vulnérabilité touche un package **système** (OS, ex: `libssl3`/`libcrypto3` d'Alpine) ou une **dépendance applicative** :
   ```bash
   trivy image --severity HIGH,CRITICAL --format json -o report.json <image>
   grep -o '"PkgPath": *"[^"]*"' report.json
   ```
2. **Vulnérabilité système (Alpine)** → patcher dans le Dockerfile :
   ```dockerfile
   RUN apk update && apk upgrade --no-cache
   ```
3. **Vulnérabilité dans le CLI npm vendorisé par l'image de base** (chemin du type `usr/local/lib/node_modules/npm/node_modules/...`) → ce n'est pas du code applicatif, exclure du scan :
   ```bash
   trivy image --skip-dirs "**/node_modules/npm/**" ...
   ```
4. **Vulnérabilité réelle dans une dépendance applicative** (`package.json` du projet) → mettre à jour la dépendance concernée, pas de contournement.

---

## Incident : `npm ci` échoue avec `Cannot find native binding` (rolldown / vite / vitest)

**Symptôme** :
```
Error: Cannot find native binding. npm has a bug related to optional dependencies
Cannot find module '@rolldown/binding-linux-x64-gnu'
```

**Cause réelle** : la version de Node utilisée par le tool Jenkins (`Node20`) est **antérieure** à la version minimale requise par le package (`engines` dans son `package.json`, ex: `^20.19.0 || >=22.12.0`). npm **ignore silencieusement** les dépendances optionnelles dont la condition `engines` n'est pas satisfaite, au lieu de faire échouer l'installation — l'erreur n'apparaît qu'au runtime.

**Diagnostic** :
```bash
docker exec jenkins sh -c "export PATH=/var/jenkins_home/tools/jenkins.plugins.nodejs.tools.NodeJSInstallation/Node20/bin:\$PATH; node -v"
```

**Résolution** : Jenkins → **Administrer Jenkins → Tools → NodeJS installations → Node20** → choisir une version précise **≥ 20.19.0** ou **≥ 22.12.0** (éviter les versions trop récentes type `26.x`, qui peuvent nécessiter des libs système absentes de l'image Jenkins, ex: `libatomic.so.1` — installer `apt-get install -y libatomic1` si besoin).

**Ne pas regénérer le `package-lock.json` pour corriger ce problème** — ce n'est pas la cause (piste explorée et écartée lors de l'incident du 2026-06-29).

---

## Incident : Jenkins build le mauvais commit / ancienne branche

**Symptôme** : le build checkoute un ancien commit alors qu'un push plus récent existe.

**Vérifications** :
1. Confirmer que le push a bien atteint GitHub : `git ls-remote origin <branche>`
2. Vérifier la config du job Jenkins → **Branches to build** correspond bien à la branche utilisée (`*/nom-branche`, pas `*/master` par défaut si le repo n'a pas cette branche)
3. Hard refresh la page Jenkins (Ctrl+F5) avant de relire les logs — la page peut afficher un ancien build en cache

---

## Déclenchement automatique des builds

- **Méthode actuelle** : `pollSCM('H/5 * * * *')` déclaré directement dans chaque `Jenkinsfile` (déclaratif, "as code") — Jenkins vérifie toutes les 5 minutes s'il y a un nouveau commit
- **Alternative (build immédiat à chaque push)** : nécessite un webhook GitHub → Jenkins, ce qui implique d'exposer Jenkins sur Internet (tunnel ngrok/Cloudflare Tunnel, ou hébergement public). Non mis en place à ce jour car Jenkins tourne en local.

---

## Contacts / Référence

- DockerHub : `johnwaia/cicd-tasklist-backend`, `johnwaia/cicd-tasklist-frontend`
- SonarQube : `http://localhost:9000`, projets `jwaia_cicd-tasklist-backend` et `jwaia_cicd-tasklist-frontend`
- Jenkins : `http://localhost:8090`
