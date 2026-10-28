const { generateSecret, generateURI, verifySync } = require('otplib');
const qrcode = require('qrcode');

const generateMfaSecret = async (userIdentifier) => {
  const secret = generateSecret();
  const serviceName = 'BCRG HUB';
  const label = userIdentifier || 'Employé BCRG';
  const otpauth = generateURI({
    issuer: serviceName,
    label,
    secret
  });

  // Générer le QR Code sous forme de dataURL (image base64 affichable directement en frontend)
  const qr_code = await qrcode.toDataURL(otpauth, {
    margin: 2,
    width: 240,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  return {
    secret,
    otpauth,
    qr_code
  };
};

const verifyMfaToken = (token, secret) => {
  if (!token || !secret) return false;
  try {
    const result = verifySync({
      token: String(token).trim(),
      secret: String(secret).trim(),
      epochTolerance: 30 // Tolérance de +/- 30 secondes (standard RFC 6238 / Microsoft Authenticator)
    });
    return Boolean(result && result.valid === true);
  } catch (err) {
    console.error('Erreur vérification TOTP:', err.message);
    return false;
  }
};

module.exports = {
  generateMfaSecret,
  verifyMfaToken
};
