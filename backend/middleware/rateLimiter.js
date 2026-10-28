const rateLimit = require('express-rate-limit');
const { logAuditEvent } = require('../services/auditService');

/**
 * Limiteur de débit strict sur les réinitialisations de mot de passe (Anti-Déni de Service & Anti-Abus)
 * - Maximum 10 réinitialisations par minute par session administrateur / adresse IP.
 * - Alerte de sécurité immédiate en cas de tentative anormale.
 */
const wifiResetRateLimiter = rateLimit({
  windowMs: 60 * 1000, // Fenêtre d'1 minute
  max: 10, // Maximum 10 réinitialisations par minute
  standardHeaders: true, // Renvoie RateLimit-* dans les headers HTTP
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false
  },
  keyGenerator: (req) => {
    // Clé basée sur l'identifiant administrateur ou sur l'adresse IP
    if (req.user && req.user.id) {
      return `admin_user_${req.user.id}`;
    }
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    return `ip_${ip}`;
  },
  handler: async (req, res /*, next */) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const adminUser = req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''} (${req.user.email})`.trim() : 'Session non authentifiée';

    console.warn(` ALERTE SÉCURITÉ : Tentative anormale de réinitialisations en masse depuis ${clientIp} par "${adminUser}"`);

    // Alerte de sécurité immédiate enregistrée dans le SIEM / AuditLog
    await logAuditEvent({
      type: 'ALERT',
      action: `ALERTE ANTI-DDoS / BRUTE-FORCE : Dépassement du seuil de 10 réinitialisations/min par "${adminUser}"`,
      user: adminUser,
      ip: clientIp,
      app: 'BCRG Wi-Fi Manager',
      status: 'BLOQUÉ'
    });

    return res.status(429).json({
      success: false,
      message: "Limite de sécurité atteinte : Vous avez dépassé le seuil autorisé de 10 réinitialisations de mot de passe par minute. Cette tentative anormale a été bloquée et signalée au système de sécurité."
    });
  }
});

module.exports = {
  wifiResetRateLimiter
};
