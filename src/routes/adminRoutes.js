const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  toggleUserStatus,
  getAllTransactions,
  getSystemStats
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly); // Require admin privileges for all routes below

router.get('/users', getAllUsers);
router.put('/users/:id/status', toggleUserStatus);
router.get('/transactions', getAllTransactions);
router.get('/system-stats', getSystemStats);

module.exports = router;
