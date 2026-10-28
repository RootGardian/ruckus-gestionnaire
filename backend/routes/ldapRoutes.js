const express = require('express');
const router = express.Router();
const {
  getLdapConfigs,
  getLdapConfigById,
  createLdapConfig,
  updateLdapConfig,
  deleteLdapConfig,
  testLdap,
  searchUsers,
  searchGroups,
  searchOUs
} = require('../controllers/ldapController');
const { protect, admin } = require('../middleware/authMiddleware');

// Toutes les routes LDAP sont restreintes aux administrateurs authentifiés
router.use(protect, admin);

router.get('/users', searchUsers);
router.get('/groups', searchGroups);
router.get('/ous', searchOUs);
router.post('/test', testLdap);
router.get('/', getLdapConfigs);
router.get('/:id', getLdapConfigById);
router.post('/', createLdapConfig);
router.put('/:id', updateLdapConfig);
router.delete('/:id', deleteLdapConfig);

module.exports = router;
