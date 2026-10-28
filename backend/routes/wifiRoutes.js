const express = require('express');
const router = express.Router();
const {
  getWifiUsers,
  resetWifiPassword,
  generatePasswordController,
  getSmtpConfigController,
  updateSmtpConfigController,
  testSmtpController
} = require('../controllers/wifiController');
const { protect, admin } = require('../middleware/authMiddleware');
const { wifiResetRateLimiter } = require('../middleware/rateLimiter');

// Toutes les routes Wi-Fi Reset sont protégées et réservées aux administrateurs locaux
router.get('/users', protect, admin, getWifiUsers);
// Protection Anti-Abus & Anti-DDoS : 10 réinitialisations max par minute
router.post('/reset-password', protect, admin, wifiResetRateLimiter, resetWifiPassword);
router.get('/generate-password', protect, admin, generatePasswordController);

router.get('/smtp-config', protect, admin, getSmtpConfigController);
router.put('/smtp-config', protect, admin, updateSmtpConfigController);
router.post('/smtp-test', protect, admin, testSmtpController);

module.exports = router;
