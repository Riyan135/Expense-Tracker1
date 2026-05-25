const express = require('express');
const router = express.Router();
const {
  addTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes here

router.route('/')
  .get(getTransactions)
  .post(addTransaction);

router.get('/stats', getTransactionStats);

router.route('/:id')
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
