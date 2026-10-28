const ldapService = require('../services/ldapService');
const smtpService = require('../services/smtpService');
const { logAuditEvent } = require('../services/auditService');
const { generateSecureWifiPassword } = require('../utils/cryptoUtils');

/**
 * Recherche ou liste les utilisateurs de l'annuaire Active Directory pour le Wi-Fi
 */
const getWifiUsers = async (req, res) => {
  try {
    const q = req.query.search || req.query.q || '';
    const users = await ldapService.getLdapUsers(q);
    res.json(users);
  } catch (error) {
    console.error('Erreur getWifiUsers:', error.message);
    res.status(500).json({ message: error.message || "Erreur lors de la récupération des utilisateurs Active Directory." });
  }
};

/**
 * Générateur de mot de passe cryptographiquement sûr pour l'API
 * Format: Bcrg@<4_chiffres>@<2_chiffres> via crypto.randomInt()
 */
const generatePasswordController = (req, res) => {
  const password = generateSecureWifiPassword();
  res.json({ success: true, password });
};

/**
 * Réinitialisation du mot de passe Wi-Fi Active Directory
 * L'administrateur fournit le mot de passe et choisit d'envoyer par e-mail ou non.
 */
const resetWifiPassword = async (req, res) => {
  const {
    identifier,
    newPassword,
    sendEmail = false,
    recipientEmail,
    ssid,
    unlockAccount = true,
    passwordNeverExpires = false,
    mustChangeAtNextLogon = false,
    accountExpiresInDays = null,
    notes = ''
  } = req.body;

  if (!identifier) {
    return res.status(400).json({ message: "L'identifiant de l'utilisateur est requis." });
  }

  // 1. Protection stricte des comptes Active Directory sensibles et machines
  if (ldapService.isSystemOrProtectedAccount(identifier)) {
    return res.status(403).json({
      success: false,
      message: "Compte système protégé — modification interdite via la console Wi-Fi."
    });
  }

  let finalPassword = newPassword;
  if (!finalPassword || finalPassword === 'auto') {
    finalPassword = generateSecureWifiPassword();
  } else if (finalPassword.length < 6) {
    return res.status(400).json({ message: "Le mot de passe doit comporter au moins 6 caractères." });
  }

  const adminUser = req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''} (${req.user.email})`.trim() : 'Admin';
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  try {
    // 1. Réinitialisation dans l'Active Directory avec politiques d'expiration
    const adResult = await ldapService.resetAdUserPassword({
      identifierOrDn: identifier,
      newPassword: finalPassword,
      unlockAccount: Boolean(unlockAccount),
      passwordNeverExpires: Boolean(passwordNeverExpires),
      mustChangeAtNextLogon: Boolean(mustChangeAtNextLogon),
      accountExpiresInDays
    });

    let emailSent = false;
    let emailError = null;

    // 2. Envoi optionnel par courriel : récupération prioritaire et directe depuis l'AD
    const targetEmail = adResult.email || recipientEmail;

    if (sendEmail) {
      if (!targetEmail) {
        emailError = "Aucune adresse e-mail trouvée pour cet utilisateur dans l'AD ou dans la requête.";
      } else {
        try {
          await smtpService.sendWifiResetEmail({
            to: targetEmail,
            fullName: adResult.fullName || adResult.identifier,
            identifier: adResult.identifier,
            newPassword,
            ssid,
            notes
          });
          emailSent = true;
        } catch (mailErr) {
          console.error("Échec envoi mail identifiants:", mailErr.message);
          const formatted = smtpService.formatSmtpErrorMessage(mailErr);
          emailError = formatted.message + (formatted.tip ? ` — Conseil : ${formatted.tip}` : '');
        }
      }
    }

    const expiryDesc = passwordNeverExpires
      ? "N'expire jamais"
      : accountExpiresInDays
        ? `Validité compte: ${accountExpiresInDays}j`
        : "Politique domaine standard";

    // 3. Enregistrement de l'événement dans le SIEM (AuditLog)
    await logAuditEvent({
      type: 'WIFI',
      action: `Réinitialisation mot de passe Wi-Fi pour "${adResult.identifier}" (${expiryDesc}, Email: ${sendEmail ? (emailSent ? 'Envoyé' : 'Échec envoi') : 'Non demandé'})`,
      user: adminUser,
      ip: clientIp,
      app: 'BCRG Wi-Fi Manager',
      status: emailError && sendEmail ? 'AVERTISSEMENT' : 'SUCCÈS'
    });

    return res.json({
      success: true,
      message: `Mot de passe réinitialisé avec succès sur Active Directory pour "${adResult.identifier}".`,
      user: {
        identifier: adResult.identifier,
        fullName: adResult.fullName,
        dn: adResult.dn,
        email: targetEmail
      },
      email: {
        requested: Boolean(sendEmail),
        sent: emailSent,
        recipient: targetEmail,
        error: emailError
      }
    });

  } catch (err) {
    console.error("Erreur réinitialisation mot de passe Wi-Fi:", err.message);

    // Journalisation de l'échec dans le SIEM
    await logAuditEvent({
      type: 'ALERT',
      action: `ÉCHEC réinitialisation mot de passe Wi-Fi pour "${identifier}": ${err.message}`,
      user: adminUser,
      ip: clientIp,
      app: 'Ruckus Wi-Fi Manager',
      status: 'ÉCHEC'
    });

    return res.status(500).json({
      success: false,
      message: err.message || "Erreur lors de la réinitialisation dans Active Directory."
    });
  }
};

/**
 * Récupération de la configuration SMTP
 */
const getSmtpConfigController = async (req, res) => {
  try {
    const config = await smtpService.getSmtpConfig();
    // Masquer le mot de passe pour la sécurité de l'interface
    res.json({
      ...config,
      pass: config.pass ? '••••••••' : '',
      has_password: Boolean(config.pass)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mise à jour de la configuration SMTP
 */
const updateSmtpConfigController = async (req, res) => {
  try {
    const updated = await smtpService.saveSmtpConfig(req.body);

    await logAuditEvent({
      type: 'ADMIN',
      action: `Mise à jour configuration SMTP (${updated.host}:${updated.port})`,
      user: req.user ? req.user.email : 'Admin',
      ip: req.ip || '127.0.0.1',
      app: 'Ruckus Wi-Fi Manager',
      status: 'SUCCÈS'
    });

    res.json({
      success: true,
      message: 'Configuration SMTP enregistrée avec succès.',
      config: {
        ...updated,
        pass: updated.pass ? '••••••••' : '',
        has_password: Boolean(updated.pass)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Test de la passerelle SMTP
 */
const testSmtpController = async (req, res) => {
  try {
    const { testEmail } = req.body;
    const result = await smtpService.testSmtpConnection(testEmail);

    await logAuditEvent({
      type: 'ADMIN',
      action: `Test passerelle SMTP ${testEmail ? `vers ${testEmail}` : ''} : ${result.success ? 'Succès' : 'Échec'}`,
      user: req.user ? req.user.email : 'Admin',
      ip: req.ip || '127.0.0.1',
      app: 'BCRG Wi-Fi Manager',
      status: result.success ? 'SUCCÈS' : 'ÉCHEC'
    });

    res.json(result);
  } catch (error) {
    const formatted = smtpService.formatSmtpErrorMessage(error);
    res.status(500).json({
      success: false,
      message: formatted.message,
      tip: formatted.tip,
      rawError: formatted.rawError
    });
  }
};

module.exports = {
  getWifiUsers,
  resetWifiPassword,
  generatePasswordController,
  getSmtpConfigController,
  updateSmtpConfigController,
  testSmtpController
};
