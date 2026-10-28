const express = require('express');
const router = express.Router();
const { loginUser, verifyMfa, registerUser, changePassword, logoutUser, getMe, refreshSession } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/mfa/verify', verifyMfa);
router.post('/register', registerUser);
router.post('/refresh', refreshSession);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;

