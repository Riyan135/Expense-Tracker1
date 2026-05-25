const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Please specify transaction type (income or expense)']
  },
  amount: {
    type: Number,
    required: [true, 'Please add a positive amount'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    enum: [
      // Expense categories
      'Food', 'Travel', 'Shopping', 'Bills', 'Health', 'Education', 'Orders',
      // Income categories
      'Salary', 'Business', 'Investment', 'Gifts',
      // Shared / General categories
      'Other'
    ]
  },
  date: {
    type: Date,
    required: [true, 'Please select a date'],
    default: Date.now
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
