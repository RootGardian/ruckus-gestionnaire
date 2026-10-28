const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM

const getMasterKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'bcrg-default-fallback-key-2026';
  // Derive a fixed 32-byte (256-bit) key using SHA-256
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
const encrypt = (plainText) => {
  if (!plainText || typeof plainText !== 'string') return plainText;
  if (plainText.startsWith('enc:v1:')) return plainText; // already encrypted

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt a ciphertext string formatted with enc:v1:...
 * If string is not encrypted, returns as-is (backward compatible).
 */
const decrypt = (cipherText) => {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  if (!cipherText.startsWith('enc:v1:')) {
    // Legacy plaintext
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid encrypted format');
    }

    const [, , ivHex, tagHex, encryptedDataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err.message);
    return null;
  }
};

const isEncrypted = (text) => {
  return typeof text === 'string' && text.startsWith('enc:v1:');
};

/**
 * Générateur cryptographiquement sûr respectant la nomenclature BCRG
 * Format: Bcrg@<3_lettres>@<2_chiffres> (ex: Bcrg@KMP@35)
 * Utilise crypto.randomInt() pour que les caractères soient 100% imprédictibles.
 */
const generateSecureWifiPassword = () => {
  const lettersPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let letters = '';
  for (let i = 0; i < 3; i++) {
    letters += lettersPool[crypto.randomInt(0, lettersPool.length)];
  }
  const twoDigits = crypto.randomInt(10, 100); // 2 chiffres de 10 à 99
  return `Bcrg@${letters}@${twoDigits}`;
};

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  generateSecureWifiPassword
};

