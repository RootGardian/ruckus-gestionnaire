# 💻 BCRG WI-FI MANAGER — Interface Frontend (React 19 / Vite / Nginx)

Application cliente Single Page Application (SPA) du **BCRG WI-FI MANAGER**, dédiée à l'administration des identifiants Active Directory pour le réseau Wi-Fi d'entreprise **CORPORATE-BCRG** de la Banque Centrale de la République de Guinée (BCRG).

Pour la documentation globale et le déploiement multi-conteneurs, consultez le [README principal à la racine du projet](../README.md).

---

## 🛠️ Stack Technique Frontend

* **Framework** : React 19
* **Outil de Bundling & Dev Server** : Vite 8
* **Typographie** : Google Fonts **Inter**
* **Charte Graphique Institutionnelle** :
  * Vert institutionnel BCRG : `#143826`
  * Arrière-plan de bannière Hero : `#163325`
  * Indicateurs d'état et badges épurés
* **Bibliothèque d'icônes** : Lucide React
* **Client HTTP** : Axios (avec authentification par jetons JWT)
* **Serveur Web de Production** : Nginx 1.25 Alpine (avec reverse-proxy `/api/` vers le backend)

---

## 🚀 Commandes Disponibles

Depuis le dossier `frontend` :

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement (http://localhost:5173)
npm run dev

# Compiler le projet pour la production (génère le dossier dist/)
npm run build

# Prévisualiser le build localement
npm run preview
```

---

## 📱 Modules & Fonctionnalités de l'Interface

L'application est structurée autour de **4 onglets d'administration dédiés** :

### 1. Utilisateur (Annuaire Active Directory)
- Consultation des collaborateurs référencés dans l'Active Directory (655+ comptes).
- Barre de recherche dynamique (par nom, identifiant `sAMAccountName`, matricule).
- Badges de statut en temps réel : **ACTIF**, **VERROUILLÉ**, **DÉSACTIVÉ**.
- **Pagination complète** : choix de 10, 20, 50 ou 100 lignes par page, boutons début/fin, ellipses et navigation fluide.
- Bouton principal et actions individuelles pour basculer directement vers la réinitialisation de mot de passe.

### 2. Reinitialiser mot de passe
- Réseau Wi-Fi cible verrouillé à **CORPORATE-BCRG** (802.1X / RADIUS).
- Sélection de compte AD via recherche dynamique ou transfert direct depuis l'annuaire.
- Générateur de mot de passe fort respectant la nomenclature BCRG :
  `Bcrg@<des_chiffres>@<deux_chiffres>` (ex: `Bcrg@4821@35`).
- Déverrouillage automatique du compte Active Directory (`lockoutTime = 0`).
- **Synchronisation automatique de l'e-mail** : l'adresse de messagerie du collaborateur est extraite directement de l'Active Directory (`mail` / `userPrincipalName`), affichée en lecture seule avec le badge `✓ Récupéré directement depuis l'AD`.
- Envoi optionnel de la fiche d'accès au collaborateur avec consigne d'accompagnement.

### 3. Configuration ldap
- Paramétrage de la connexion Active Directory : serveur, port (`389` standard ou `636` LDAPS sécurisé), Base DN, compte de liaison (Bind DN).
- Testeur de connexion en direct avec diagnostic d'erreurs en clair.
- Explorateur d'arborescence des Unités d'Organisation (OU) et vérification des comptes.

### 4. Configuration smtp
- Configuration de la passerelle de messagerie (Microsoft 365 / Outlook / Exchange).
- Testeur d'expédition d'e-mail de validation.
- Messages d'erreurs traduits et contextualisés avec encart de conseils pratiques (ex: activation de *SMTP authentifié* `535 5.7.139`, gestion de la double authentification MFA `535 5.7.3` avec mots de passe d'application).
