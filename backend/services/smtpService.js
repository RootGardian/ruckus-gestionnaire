const nodemailer = require('nodemailer');
const { SmtpConfig } = require('../models');

/**
 * Récupère la configuration SMTP enregistrée dans la table dédiée smtp_configs
 */
const getSmtpConfig = async () => {
  try {
    let config = await SmtpConfig.findOne({ where: { is_active: true } });
    if (!config) {
      config = await SmtpConfig.findOne({ order: [['id', 'DESC']] });
    }
    if (config) {
      return config.toJSON();
    }
  } catch (err) {
    console.warn('Configuration SMTP introuvable en base, utilisation des variables d\'environnement:', err.message);
  }

  // Valeurs par défaut depuis process.env
  return {
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Support IT BCRG <wifi-support@bcrg-guinee.org>',
    default_ssid: process.env.WIFI_DEFAULT_SSID || 'CORPORATE-BCRG',
    ignore_tls: process.env.SMTP_IGNORE_TLS === 'true' || false
  };
};

/**
 * Enregistre ou met à jour la configuration SMTP dans la table smtp_configs
 */
const saveSmtpConfig = async (newConfig) => {
  let existing = await SmtpConfig.findOne({ where: { is_active: true } });
  if (!existing) {
    existing = await SmtpConfig.findOne({ order: [['id', 'DESC']] });
  }

  const payload = {
    host: newConfig.host || (existing ? existing.host : process.env.SMTP_HOST) || 'smtp.office365.com',
    port: parseInt(newConfig.port, 10) || (existing ? existing.port : 587),
    secure: Boolean(newConfig.secure),
    user: newConfig.user !== undefined ? newConfig.user : (existing ? existing.user : ''),
    from: newConfig.from || (existing ? existing.from : 'Support IT BCRG <wifi-support@bcrg-guinee.org>'),
    default_ssid: newConfig.default_ssid || (existing ? existing.default_ssid : 'CORPORATE-BCRG'),
    ignore_tls: Boolean(newConfig.ignore_tls),
    is_active: true
  };

  // Ne mettre à jour le mot de passe que s'il est fourni non vide et qu'il ne s'agit pas d'un masque de balles
  if (
    newConfig.pass &&
    typeof newConfig.pass === 'string' &&
    newConfig.pass.trim() !== '' &&
    !newConfig.pass.includes('•')
  ) {
    payload.pass = String(newConfig.pass).trim();
  }

  if (existing) {
    await existing.update(payload);
    return existing.toJSON();
  } else {
    const created = await SmtpConfig.create(payload);
    return created.toJSON();
  }
};

/**
 * Crée un transporteur Nodemailer à partir de la configuration
 */
const createTransporter = (config) => {
  const options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: !config.ignore_tls
    },
    connectionTimeout: 10000
  };

  return nodemailer.createTransport(options);
};

/**
 * Traduction et adaptation des codes d'erreur SMTP en messages clairs et exploitables
 */
const formatSmtpErrorMessage = (rawError) => {
  const msg = typeof rawError === 'string' ? rawError : (rawError?.message || '');

  // 1. Erreur Microsoft 365 : SMTP AUTH désactivé au niveau du Tenant
  if (/SmtpClientAuthentication is disabled/i.test(msg) || /5\.7\.139/i.test(msg)) {
    return {
      message: "L'authentification SMTP est désactivée par défaut sur votre organisation Microsoft 365.",
      tip: "Dans le Centre d'administration Microsoft 365 (admin.microsoft.com) : allez dans Utilisateurs > Utilisateurs actifs > sélectionnez votre compte > onglet Courrier > Gérer les applications de messagerie > cochez 'SMTP authentifié' puis enregistrez.",
      rawError: msg
    };
  }

  // 2. Erreur Microsoft 365 535 5.7.3 : Authentification refusée (MFA active ou mot de passe incorrect)
  if (/5\.7\.3/i.test(msg)) {
    return {
      message: "Authentification refusée par Microsoft 365 (Erreur 535 5.7.3).",
      tip: "Le protocole SMTP est bien activé sur votre compte ! Cependant, si la double authentification (MFA / Microsoft Authenticator) est active, Microsoft refuse le mot de passe ordinaire. Deux solutions : 1) Générez un 'Mot de passe d'application' depuis https://myaccount.microsoft.com (Sécurité > Informations de sécurité > Ajouter une méthode > Mot de passe d'application), ou 2) Vérifiez l'exactitude de votre mot de passe et utilisez 'smtp.office365.com' comme serveur hôte.",
      rawError: msg
    };
  }

  // 3. Erreur d'identifiant ou mot de passe refusé générique (BadCredentials, 535)
  if (/535/i.test(msg) || /BadCredentials/i.test(msg) || /Username and Password not accepted/i.test(msg)) {
    return {
      message: "Identifiant ou mot de passe refusé par le serveur de messagerie.",
      tip: "Vérifiez votre adresse e-mail et votre mot de passe. Si la double authentification (MFA / Authenticator) est active, générez un 'Mot de passe d'application' depuis votre compte Microsoft/Google.",
      rawError: msg
    };
  }

  // 3. Mot de passe d'application requis
  if (/Application-specific password required/i.test(msg) || /534-5\.7\.14/i.test(msg)) {
    return {
      message: "Un mot de passe d'application est requis par votre fournisseur de messagerie.",
      tip: "La double authentification est activée sur ce compte. Veuillez générer et renseigner un mot de passe d'application au lieu de votre mot de passe habituel.",
      rawError: msg
    };
  }

  // 4. Erreur de connexion au serveur (Hôte introuvable / Port fermé / Timeout)
  if (/ENOTFOUND/i.test(msg) || /EAI_AGAIN/i.test(msg)) {
    return {
      message: "Serveur SMTP hôte introuvable. Le nom du serveur est incorrect ou inaccessible.",
      tip: "Vérifiez l'adresse du serveur (ex: smtp.office365.com, smtp-mail.outlook.com ou le nom de votre serveur Exchange interne).",
      rawError: msg
    };
  }
  if (/ECONNREFUSED/i.test(msg)) {
    return {
      message: "Connexion refusée par le serveur distant sur le port spécifié.",
      tip: "Vérifiez le port SMTP (587 pour STARTTLS, 465 pour SSL/TLS, 25 pour un relais interne) et assurez-vous qu'aucun pare-feu ne bloque le flux sortant.",
      rawError: msg
    };
  }
  if (/ETIMEDOUT/i.test(msg) || /timeout/i.test(msg)) {
    return {
      message: "Délai d'attente de connexion dépassé (Timeout).",
      tip: "Le serveur de messagerie ne répond pas. Vérifiez la connectivité réseau et les autorisations de pare-feu.",
      rawError: msg
    };
  }

  // 5. Erreur de certificat TLS/SSL
  if (/self signed certificate/i.test(msg) || /CERT_HAS_EXPIRED/i.test(msg) || /UNABLE_TO_VERIFY_LEAF_SIGNATURE/i.test(msg) || /DEPTH_ZERO_SELF_SIGNED_CERT/i.test(msg)) {
    return {
      message: "Erreur de validation du certificat SSL/TLS du serveur de messagerie.",
      tip: "Le certificat du serveur est auto-signé ou expiré. Activez l'option d'ignorer la vérification TLS.",
      rawError: msg
    };
  }

  // 6. Expéditeur refusé / Relais interdit (550 / 554)
  if (/550 5\.7/i.test(msg) || /Relaying denied/i.test(msg) || /Client host rejected/i.test(msg) || /SendAsDenied/i.test(msg)) {
    return {
      message: "Envoi ou relais refusé par le serveur de messagerie.",
      tip: "L'adresse d'expéditeur (From) doit correspondre au compte utilisateur connecté, ou posséder les droits de délégation 'Envoyer en tant que' sur la boîte.",
      rawError: msg
    };
  }

  // 7. Message générique
  return {
    message: `Échec SMTP : ${msg}`,
    tip: "Vérifiez les paramètres de connexion SMTP (serveur hôte, port, utilisateur et mot de passe).",
    rawError: msg
  };
};

/**
 * Teste la connexion SMTP et envoie un e-mail de test si une adresse est fournie
 */
const testSmtpConnection = async (testEmail = null) => {
  const config = await getSmtpConfig();

  if (!config.host || !config.user) {
    return {
      success: false,
      message: 'Configuration SMTP incomplète : le serveur hôte et le compte utilisateur sont requis.',
      tip: 'Renseignez au minimum le serveur SMTP hôte et votre compte utilisateur.'
    };
  }

  try {
    const transporter = createTransporter(config);
    await transporter.verify();

    if (testEmail) {
      const subject = `[BCRG] Test de messagerie SMTP - Wi-Fi Manager`;
      const text = `Bonjour,

Ce message confirme que la passerelle SMTP (${config.host}:${config.port}) est opérationnelle et prête pour l'envoi des identifiants Wi-Fi.

Date du test : ${new Date().toLocaleString('fr-FR')}

Cordialement,
Support Informatique BCRG`;

      const html = `
<p>Bonjour,</p>
<p>Ce message confirme que la passerelle SMTP (<strong>${config.host}:${config.port}</strong>) est opérationnelle et prête pour l'envoi des identifiants Wi-Fi.</p>
<p>Date du test : ${new Date().toLocaleString('fr-FR')}</p>
<p>Cordialement,<br>Support Informatique BCRG</p>
      `;

      await transporter.sendMail({
        from: config.from,
        to: testEmail,
        subject,
        text,
        html
      });
    }

    return {
      success: true,
      message: testEmail
        ? `Connexion établie et e-mail de validation expédié avec succès à ${testEmail}.`
        : 'Connexion au serveur SMTP validée avec succès.'
    };
  } catch (error) {
    const formatted = formatSmtpErrorMessage(error);
    return {
      success: false,
      message: formatted.message,
      tip: formatted.tip,
      rawError: formatted.rawError
    };
  }
};

/**
 * Envoie les identifiants Wi-Fi réinitialisés à l'utilisateur
 */
const sendWifiResetEmail = async ({ to, fullName, identifier, newPassword, ssid, notes }) => {
  if (!to) {
    throw new Error('Adresse e-mail du destinataire requise.');
  }

  const config = await getSmtpConfig();
  const transporter = createTransporter(config);
  const wifiNetwork = ssid || config.default_ssid || 'CORPORATE-BCRG';

  const subject = `[BCRG] Vos identifiants Wi-Fi (${wifiNetwork})`;

  const text = `Bonjour ${fullName || identifier},

Vos identifiants d'accès au réseau sans-fil ${wifiNetwork} ont été réinitialisés :

- Réseau Wi-Fi : ${wifiNetwork}
- Identifiant : ${identifier}
- Mot de passe : ${newPassword}
${notes ? `\nConsigne : ${notes}\n` : ''}
Cordialement,
Support Informatique BCRG`;

  const html = `
<p>Bonjour ${fullName || identifier},</p>
<p>Vos identifiants d'accès au réseau sans-fil <strong>${wifiNetwork}</strong> ont été réinitialisés :</p>
<ul>
  <li><strong>Réseau Wi-Fi :</strong> ${wifiNetwork}</li>
  <li><strong>Identifiant :</strong> ${identifier}</li>
  <li><strong>Mot de passe :</strong> ${newPassword}</li>
</ul>
${notes ? `<p><strong>Consigne :</strong> ${notes}</p>` : ''}
<p>Cordialement,<br>Support Informatique BCRG</p>
  `;

  const info = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html
  });

  return { success: true, messageId: info.messageId };
};

module.exports = {
  getSmtpConfig,
  saveSmtpConfig,
  testSmtpConnection,
  sendWifiResetEmail,
  formatSmtpErrorMessage
};
