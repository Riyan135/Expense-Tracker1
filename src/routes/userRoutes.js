const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, changePassword, getSavingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes here

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/change-password', changePassword);

router.route('/goals')
  .get(getSavingsGoals)
  .post(addSavingsGoal);

router.route('/goals/:id')
  .put(updateSavingsGoal)
  .delete(deleteSavingsGoal);

module.exports = router;
