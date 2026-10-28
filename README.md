# BCRG WI-FI MANAGER — Console d'Administration Active Directory

> **Banque Centrale de la République de Guinée (BCRG)**  
> Solution d'administration et de réinitialisation centralisée des identifiants Active Directory pour le réseau Wi-Fi d'entreprise **CORPORATE-BCRG** (802.1X / RADIUS).

---

## 📑 Table des Matières

1. [Aperçu & Objectifs](#-aperçu--objectifs)
2. [Fonctionnalités & Modules](#-fonctionnalités--modules)
3. [Architecture Technique & Stack](#-architecture-technique--stack)
4. [Politique de Mots de Passe & Nomenclature BCRG](#-politique-de-mots-de-passe--nomenclature-bcrg)
5. [Déploiement Conteneurisé (Docker Compose)](#-déploiement-conteneurisé-docker-compose)
6. [Installation & Démarrage en Développement Local](#-installation--démarrage-en-développement-local)
7. [Variables d'Environnement](#-variables-denvironnement)
8. [Référentiel des Points de Terminaison API (Endpoints)](#-référentiel-des-points-de-terminaison-api-endpoints)
9. [Guide de Dépannage & FAQ](#-guide-de-dépannage--faq)

---

## 🎯 Aperçu & Objectifs

Le **BCRG WI-FI MANAGER** est une plateforme dédiée aux équipes informatiques et réseaux de la Banque Centrale de la République de Guinée pour piloter l'accès des collaborateurs au réseau sans-fil sécurisé de l'institution.

### Objectifs Principaux :
* **Unification avec l'Active Directory** : Utilisation exclusive des identifiants d'entreprise des collaborateurs (`sAMAccountName`) authentifiés via RADIUS / 802.1X sur les bornes Wi-Fi.
* **Sécurisation du Réseau d'Entreprise** : Verrouillage strict sur le SSID officiel **`CORPORATE-BCRG`**.
* **Automatisation du Cycle de Vie des Mots de Passe** : Génération assistée selon la nomenclature institutionnelle, encodage UTF-16LE (`unicodePwd`), et déverrouillage instantané des comptes bloqués (`lockoutTime = 0`).
* **Expédition Sécurisée des Accès** : Extraction directe de l'adresse de messagerie du collaborateur depuis l'annuaire Active Directory (`mail` / `userPrincipalName`) et transmission par e-mail via passerelle Microsoft 365 / Outlook / Exchange.

---

## 🚀 Fonctionnalités & Modules

L'interface d'administration se compose de **4 onglets spécialisés** accessibles depuis la barre latérale rétractable :

```
┌────────────────────────────────────────────────────────────────────────┐
│                   BANQUE CENTRALE DE LA RÉPUBLIQUE DE GUINÉE           │
│                           BCRG WI-FI MANAGER                           │
├────────────────────────────────────────────────────────────────────────┤
│ [1] Utilisateur              : Consultation AD (655+ comptes), pagination│
│ [2] Reinitialiser mot de passe: Réinitialisation AD & expédition mail   │
│ [3] Configuration ldap       : Connecteur AD, port 389/636, explorateur│
│ [4] Configuration smtp       : Passerelle Outlook/M365, test de flux    │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Module « Utilisateur » (Annuaire Active Directory)
* Consultation de l'ensemble des collaborateurs répertoriés dans l'Active Directory.
* Recherche dynamique instantanée (par nom, prénom, identifiant AD, matricule ou département).
* Badges d'état visuels : **ACTIF** (vert), **VERROUILLÉ** (ambre), **DÉSACTIVÉ** (rouge).
* **Pagination complète** : sélecteur de 10, 20, 50 ou 100 lignes par page, boutons de navigation début/fin, ellipses et indicateurs de position.
* Bouton d'action principal et raccourcis par ligne permettant de basculer immédiatement sur l'onglet de réinitialisation.

### 2. Module « Reinitialiser mot de passe »
* Réseau Wi-Fi cible verrouillé à **CORPORATE-BCRG**.
* Sélecteur d'utilisateur avec autocomplétion dynamique dans l'AD.
* Générateur de mot de passe fort respectant la nomenclature officielle BCRG.
* Déverrouillage automatique du compte Active Directory (`lockoutTime: 0`) et renouvellement (`pwdLastSet: -1`).
* **Récupération automatique et verrouillage de l'adresse e-mail** : l'adresse de destination est récupérée directement depuis l'attribut AD de l'utilisateur, empêchant toute saisie manuelle erronée.
* Option d'envoi automatique de la fiche d'accès par courriel avec ajout de consignes personnalisées (ex: *"Pensez à faire 'Oublier le réseau' avant de vous reconnecter"*).

### 3. Module « Configuration ldap »
* Paramétrage du connecteur Active Directory : serveur hôte, port standard `389` ou **LDAPS sécurisé `636`**, Base DN, et compte de liaison (Bind DN).
* Testeur de communication en temps réel avec traduction des codes d'erreurs Win32/AD.
* Explorateur d'arborescence des Unités d'Organisation (OU) et vérification des comptes.

### 4. Module « Configuration smtp »
* Passerelle de messagerie compatible Microsoft 365 (`smtp.office365.com` / `smtp-mail.outlook.com`), Exchange On-Premise ou relais interne.
* Outil de test d'expédition d'un e-mail de validation avec diagnostic intelligent.
* Traduction contextuelle et aide à la résolution des codes d'erreurs Microsoft (`535 5.7.139`, `535 5.7.3`, mots de passe d'application).

---

## 🏗️ Architecture Technique & Stack

```
                          [ Navigateur Web Administrateur ]
                                         │
                                         │ HTTP (3001) / HTTPS (443)
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │       CONTENEUR FRONTEND (Nginx Alpine)       │
                 │   • Single Page Application React 19 + Vite   │
                 │   • Charte Graphique BCRG (#143826 / Inter)   │
                 │   • Reverse Proxy inverse sur /api/           │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         │ Réseau Interne Docker (Port 5001)
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │        CONTENEUR BACKEND (Node.js API)        │
                 │   • Serveur Express.js en mode Cluster        │
                 │   • Authentification Administrateur JWT       │
                 │   • ORM Sequelize & Pilote PostgreSQL         │
                 └───────────────┬───────────────────────┬───────┘
                                 │                       │
               LDAP / LDAPS      │                       │ SMTP (587 / 25)
          (Port 389 / 636)       │                       │
                                 ▼                       ▼
     ┌─────────────────────────────┐         ┌─────────────────────────────┐
     │  ACTIVE DIRECTORY BCRG      │         │  MESSAGERIE OUTLOOK / M365  │
     │  • Annuaire collaborateurs  │         │  • Envoi fiches d'accès     │
     │  • Modification unicodePwd  │         │  • smtp.office365.com       │
     │  • Déverrouillage lockout   │         │  • Relais Exchange interne  │
     └─────────────────────────────┘         └─────────────────────────────┘
```

### Technologies Utilisées :
* **Frontend** : React 19, Vite 8, Google Fonts Inter, Vanilla CSS optimisé, Lucide React, Axios.
* **Backend** : Node.js (v20 LTS), Express.js, Sequelize, PostgreSQL 16.
* **Connecteurs Entreprise** : `ldapjs` (Active Directory), `nodemailer` (SMTP / Office 365).
* **Déploiement** : Docker multi-stage, Docker Compose, Nginx Reverse Proxy.

---

## 🔐 Politique de Mots de Passe & Nomenclature BCRG

Les mots de passe générés par la console d'administration pour l'accès Wi-Fi répondent strictement à la nomenclature définie par la Banque Centrale :

```text
Bcrg@<des_chiffres>@<deux_chiffres>
Exemples valides :
  • Bcrg@4821@35
  • Bcrg@9104@82
  • Bcrg@1753@49
```

### Mécanisme de Réinitialisation Active Directory :
1. Le mot de passe est encodé au format UTF-16LE avec guillemets doubles conformément aux spécifications Microsoft (`Buffer.from('"' + password + '"', 'utf16le')`).
2. L'attribut Active Directory `unicodePwd` est mis à jour via une opération `replace`.
3. Le compteur d'échecs et le verrouillage du compte sont réinitialisés : `lockoutTime: 0`.
4. L'attribut `pwdLastSet` est positionné à `-1` pour que le mot de passe soit immédiatement utilisable sans expiration forcée.

---

## 🐳 Déploiement Conteneurisé (Docker Compose)

### 1. Prérequis
* Docker Engine 24+ et Docker Compose v2.

### 2. Démarrage en une seule commande

#### Sous Windows :
Double-cliquez sur `deploy_docker.bat` ou exécutez dans un terminal PowerShell :
```powershell
.\deploy_docker.bat
```

#### Sous Linux / macOS :
```bash
chmod +x deploy_docker.sh
./deploy_docker.sh
```

#### Via Docker Compose direct :
```bash
# 1. Préparer le fichier d'environnement
cp .env.docker.example .env

# 2. Construire et démarrer les conteneurs
docker compose up -d --build

# 3. Vérifier le statut des conteneurs
docker compose ps
```

### 3. Accès à l'application
* **URL Web** : `http://localhost:3001`
* **Compte Administrateur Initial** :
  * Identifiant : `admin@bcrg.local`
  * Mot de passe : `Bcrg@dmin@2026`

---

## 💻 Installation & Démarrage en Développement Local

### 1. Prérequis
* Node.js v18 ou v20 LTS.
* PostgreSQL 15 ou 16 local avec une base de données nommée `ruckus`.

### 2. Configuration du Backend

```bash
cd backend

# Copier le fichier d'environnement
cp .env.example .env

# Installer les dépendances
npm install

# Lancer le serveur backend en mode développement (port 5001)
npm run dev
```

### 3. Configuration du Frontend

```bash
cd frontend

# Copier le fichier d'environnement
cp .env.example .env

# Installer les dépendances
npm install

# Lancer le serveur de développement Vite (port 5173)
npm run dev
```

Ouvrez ensuite votre navigateur sur `http://localhost:5173`.

---

## ⚙️ Variables d'Environnement

### Variables du Backend (`backend/.env` ou `.env` Docker) :

| Variable | Description | Valeur par Défaut |
| :--- | :--- | :--- |
| `PORT` | Port d'écoute interne de l'API Node.js | `5001` |
| `DB_HOST` | Hôte du serveur PostgreSQL | `postgres` (Docker) / `localhost` |
| `DB_PORT` | Port du serveur PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base de données | `ruckus` |
| `DB_USER` | Utilisateur PostgreSQL | `postgres` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `BcrgSecureDb2026!` |
| `JWT_SECRET` | Clé secrète de signature des jetons de session | `bcrg_ruckus_jwt_...` |
| `ENCRYPTION_KEY` | Clé AES-256 pour les mots de passe SMTP et Bind en base | *(clé 32 octets)* |
| `DEFAULT_ADMIN_EMAIL` | Adresse e-mail du super administrateur initial | `admin@bcrg.local` |
| `DEFAULT_ADMIN_PASSWORD` | Mot de passe du super administrateur initial | `Bcrg@dmin@2026` |
| `DEFAULT_ADMIN_MATRICULE` | Matricule de l'administrateur initial | `ADMIN001` |
| `WIFI_DEFAULT_SSID` | SSID officiel Ruckus pour l'entreprise | `CORPORATE-BCRG` |
| `SMTP_HOST` | Serveur de messagerie sortant | `smtp.office365.com` |
| `SMTP_PORT` | Port SMTP (587 STARTTLS, 465 SSL, 25 relais) | `587` |
| `SMTP_USER` | Compte de connexion SMTP | `wifi-support@bcrg-guinee.org` |
| `SMTP_PASS` | Mot de passe ou mot de passe d'application | — |
| `SMTP_FROM` | Nom et adresse d'expédition affichés | `Support IT BCRG <...>` |
| `ENABLE_CLUSTER` | Activer le mode multi-cœurs Node.js | `true` |

---

## 📡 Référentiel des Points de Terminaison API (Endpoints)

### Santé & Supervision
* `GET /api/health` : Sonde de santé pour orchestrateur et Docker healthcheck.

### Authentification Administrateur
* `POST /api/auth/login` : Connexion administrateur locale (retourne le token JWT).
* `GET /api/auth/me` : Consultation du profil administrateur actuellement connecté.
* `POST /api/auth/logout` : Clôture de session.

### Gestion Wi-Fi & Active Directory
* `GET /api/wifi/users?search=...` : Recherche paginée ou filtrée des collaborateurs AD.
* `POST /api/wifi/reset-password` : Réinitialisation du mot de passe AD, déverrouillage de compte et expédition optionnelle de la fiche d'accès par e-mail.
* `GET /api/wifi/smtp-config` : Récupération des paramètres de messagerie SMTP enregistrés.
* `PUT /api/wifi/smtp-config` : Mise à jour de la configuration de messagerie SMTP.
* `POST /api/wifi/smtp-test` : Test en direct de la connexion et expédition d'un e-mail de validation.

### Configuration du Connecteur LDAP
* `GET /api/ldap-config` : Lecture de la configuration Active Directory active.
* `POST /api/ldap-config` : Enregistrement des paramètres Active Directory.
* `POST /api/ldap-config/test` : Test de connectivité LDAP/LDAPS.
* `GET /api/ldap-config/ous` : Exploration de l'arborescence des Unités d'Organisation (OU).

---

## ❓ Guide de Dépannage & FAQ

### 1. Erreur Microsoft 365 `535 5.7.139 SmtpClientAuthentication is disabled`
* **Cause** : Par défaut, Microsoft désactive le protocole SMTP AUTH sur les organisations M365 récentes.
* **Solution** : Dans le [Centre d'administration Microsoft 365](https://admin.microsoft.com) > *Utilisateurs actifs* > sélectionnez la boîte > onglet *Courrier* > *Gérer les applications de messagerie* > cochez **SMTP authentifié** (*Authenticated SMTP*) et enregistrez.

### 2. Erreur Microsoft 365 `535 5.7.3 Authentication unsuccessful`
* **Cause** : La double authentification (MFA / Authenticator) est active sur le compte utilisateur, ce qui interdit le mot de passe ordinaire sur SMTP.
* **Solution** : Connectez-vous sur [myaccount.microsoft.com](https://myaccount.microsoft.com) avec ce compte > *Informations de sécurité* > *Ajouter une méthode* > **Mot de passe d'application** (*App Password*), et collez les 16 caractères générés dans le champ mot de passe de notre application.

### 3. Réinitialisation de mot de passe AD refusée (`unwilling to perform`)
* **Cause** : Active Directory refuse la modification de mot de passe en clair sur le port standard non chiffré `389`.
* **Solution** : Configurez le port sécurisé **LDAPS `636`** dans l'onglet **« Configuration ldap »** avec le certificat racine de votre PKI interne.

---

## 🏛️ Crédits & Propriété Institutionnelle

Développé pour la **Banque Centrale de la République de Guinée (BCRG)**.  
Direction des Systèmes d'Information (DSI). Tous droits réservés © 2026.
