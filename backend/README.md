# ⚙️ BCRG WI-FI MANAGER — API Backend (Node.js / Express / Sequelize)

Service API du **BCRG WI-FI MANAGER**, solution d'administration des identifiants Active Directory pour le réseau Wi-Fi d'entreprise **CORPORATE-BCRG** de la Banque Centrale de la République de Guinée (BCRG).

Pour la documentation globale et les procédures de déploiement Docker, consultez le [README principal à la racine du projet](../README.md).

---

## 🛠️ Stack Technique Backend

* **Runtime** : Node.js (v18+ ou v20+ LTS)
* **Serveur HTTP** : Express.js avec mode Cluster multi-cœurs
* **ORM & Base de Données** : Sequelize sur PostgreSQL 16
* **Connecteur Annuaire d'Entreprise** :
  * Client Active Directory / LDAP : `ldapjs` & `activedirectory2`
  * Support du port LDAP standard (`389`) et LDAPS sécurisé (`636`)
  * Réinitialisation de mot de passe AD via modification de l'attribut `unicodePwd` (UTF-16LE)
  * Déverrouillage automatique de compte (`lockoutTime = 0`)
* **Passerelle de Messagerie** :
  * Moteur d'envoi : `nodemailer`
  * Support Microsoft 365 (`smtp.office365.com` / `smtp-mail.outlook.com`) et serveurs Exchange internes
  * Traduction contextuelle et aide à la résolution des codes d'erreur SMTP (`535 5.7.139`, `535 5.7.3`, etc.)
* **Sécurité & Protection** :
  * Chiffrement des mots de passe admin : `bcryptjs`
  * Chiffrement des mots de passe SMTP / Bind AD au repos : `AES-256-CBC`
  * Protection HTTP : `helmet`, `cors`, `cookie-parser`, tokens JWT

---

## 🚀 Commandes Disponibles

Depuis le dossier `backend` :

```bash
# Installer les dépendances
npm install

# Démarrer le serveur en mode développement (avec rechargement automatique nodemon)
npm run dev

# Démarrer en mode production
npm start
```

---

## 📂 Organisation des Dossiers

```text
backend/
├── config/
│   └── db.js                 # Configuration de connexion PostgreSQL & Sequelize
├── controllers/
│   ├── authController.js     # Authentification locale de l'administrateur
│   ├── adminController.js    # Gestion des utilisateurs administrateurs
│   ├── ldapController.js     # Gestion et test de la connexion Active Directory (LDAP/LDAPS)
│   └── wifiController.js     # Recherche des collaborateurs AD, réinitialisation de mot de passe & SMTP
├── middleware/
│   └── authMiddleware.js     # Protection des routes par Token Bearer JWT & rôle Admin
├── models/                   # Modèles Sequelize (User, Role, LdapConfig, SecuritySetting, AuditLog)
├── routes/                   # Déclaration des routes (/api/auth, /api/wifi, /api/ldap-config, /api/admin)
├── services/                 # Logique métier (ldapService, smtpService, auditService)
├── server.js                 # Point d'entrée principal & orchestration du serveur
├── Dockerfile                # Image conteneurisée Node.js Alpine
└── package.json
```

---

## 🔑 Points Clés d'Exploitation & Dépannage

### 1. Administrateur Initial
Au premier démarrage, le backend vérifie l'existence de l'administrateur initial défini dans `.env` :
- **Email** : `admin@bcrg.local`
- **Mot de passe** : `Bcrg@dmin@2026`

### 2. Nomenclature des Mots de Passe Wi-Fi Générés
Les mots de passe générés pour le réseau d'entreprise **CORPORATE-BCRG** respectent rigoureusement la politique BCRG :
```text
Bcrg@<des_chiffres>@<deux_chiffres>
Exemple : Bcrg@4821@35
```

### 3. Sonde de Santé Docker
Le serveur expose un point de terminaison pour les healthchecks conteneurisés :
- `GET /api/health` -> `{ status: "UP", service: "BCRG Wi-Fi Manager API" }`
