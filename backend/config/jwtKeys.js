const fs = require('fs');
const path = require('path');

const getPrivateKey = () => {
  // 1. Env variable takes precedence
  if (process.env.JWT_PRIVATE_KEY) {
    return process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  // 2. Custom path from env
  const customPath = process.env.JWT_PRIVATE_KEY_PATH;
  if (customPath && fs.existsSync(customPath)) {
    return fs.readFileSync(customPath, 'utf8');
  }

  // 3. Default local file (git-ignored)
  const defaultPath = path.join(__dirname, '../private.pem');
  if (fs.existsSync(defaultPath)) {
    return fs.readFileSync(defaultPath, 'utf8');
  }

  // 4. Fallback to symmetric secret
  return process.env.JWT_SECRET;
};

const getPublicKey = () => {
  // 1. Env variable takes precedence
  if (process.env.JWT_PUBLIC_KEY) {
    return process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
  }

  // 2. Custom path from env
  const customPath = process.env.JWT_PUBLIC_KEY_PATH;
  if (customPath && fs.existsSync(customPath)) {
    return fs.readFileSync(customPath, 'utf8');
  }

  // 3. Default local file (git-ignored)
  const defaultPath = path.join(__dirname, '../public.pem');
  if (fs.existsSync(defaultPath)) {
    return fs.readFileSync(defaultPath, 'utf8');
  }

  // 4. Fallback to symmetric secret
  return process.env.JWT_SECRET;
};

const hasAsymmetricKeys = () => {
  const priv = getPrivateKey();
  return typeof priv === 'string' && priv.includes('BEGIN');
};

module.exports = {
  getPrivateKey,
  getPublicKey,
  hasAsymmetricKeys
};
