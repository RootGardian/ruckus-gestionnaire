const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, getDashboardStats);
router.get('/admins', protect, admin, getAdminUsers);
router.post('/admins', protect, admin, createAdminUser);
router.put('/admins/:id', protect, admin, updateAdminUser);
router.delete('/admins/:id', protect, admin, deleteAdminUser);

module.exports = router;
