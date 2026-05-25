const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @desc    Add a new transaction (income/expense)
// @route   POST /api/transactions
// @access  Private
const addTransaction = async (req, res) => {
  try {
    const { type, amount, category, date, description, walletType } = req.body;

    if (!type || !amount || !category || !date) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount,
      category,
      date,
      description,
      walletType: walletType || 'Cash'
    });

    res.status(201).json({
      success: true,
      message: 'Transaction added successfully',
      transaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get all transactions for the logged in user with filters
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { type, category, search, startDate, endDate, sort } = req.query;

    // Build query object
    const query = { userId: req.user._id };

    // Filter by type (income/expense)
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by Date Range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of that day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Filter by Search (description)
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort order (default to newest first)
    let sortBy = { date: -1 };
    if (sort === 'oldest') {
      sortBy = { date: 1 };
    } else if (sort === 'highest') {
      sortBy = { amount: -1 };
    } else if (sort === 'lowest') {
      sortBy = { amount: 1 };
    }

    const transactions = await Transaction.find(query).sort(sortBy);

    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const { type, amount, category, date, description, walletType } = req.body;

    let transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Ensure transaction belongs to user
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to edit this transaction' });
    }

    transaction.type = type || transaction.type;
    transaction.amount = amount !== undefined ? amount : transaction.amount;
    transaction.category = category || transaction.category;
    transaction.date = date || transaction.date;
    transaction.description = description !== undefined ? description : transaction.description;
    transaction.walletType = walletType || transaction.walletType;

    const updatedTransaction = await transaction.save();

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Ensure transaction belongs to user
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this transaction' });
    }

    await transaction.deleteOne();

    res.json({
      success: true,
      message: 'Transaction removed successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get dashboard metrics, category breakdown, monthly and weekly chart statistics
// @route   GET /api/transactions/stats
// @access  Private
const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user details for current monthly budget
    const user = await User.findById(userId);
    const monthlyBudget = user ? user.monthlyBudget : 0;

    // General totals (All time)
    const allTransactions = await Transaction.find({ userId });
    let totalIncome = 0;
    let totalExpense = 0;

    allTransactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    const remainingBalance = totalIncome - totalExpense;

    // Current Month Totals & Budget Checking
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0); // Last day of current month
    endOfMonth.setHours(23, 59, 59, 999);

    const currentMonthTransactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    let currentMonthExpense = 0;
    let currentMonthIncome = 0;

    currentMonthTransactions.forEach(t => {
      if (t.type === 'expense') {
        currentMonthExpense += t.amount;
      } else {
        currentMonthIncome += t.amount;
      }
    });

    // Expense Category breakdown for Current Month (or all time if no current month transactions, but let's do current month by default)
    const categoryBreakdown = {};
    currentMonthTransactions.filter(t => t.type === 'expense').forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
    });

    // Last 6 Months Trends (Income vs Expense)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrendsAgg = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format Monthly Trends for the charts (ensure entries for all of the last 6 months exist)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendsData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1; // JS month is 0-indexed, MongoDB $month is 1-indexed
      const monthName = monthNames[d.getMonth()];

      const incomeMatch = monthlyTrendsAgg.find(t => t._id.year === year && t._id.month === monthNum && t._id.type === 'income');
      const expenseMatch = monthlyTrendsAgg.find(t => t._id.year === year && t._id.month === monthNum && t._id.type === 'expense');

      trendsData.push({
        label: `${monthName} ${year}`,
        income: incomeMatch ? incomeMatch.total : 0,
        expense: expenseMatch ? expenseMatch.total : 0
      });
    }

    // Weekly Trends: Expenses for the last 7 days (day by day)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyTransactions = await Transaction.find({
      userId,
      type: 'expense',
      date: { $gte: sevenDaysAgo }
    }).sort({ date: 1 });

    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayLabel = weekdayNames[d.getDay()];

      // Find transactions on this specific day
      const dayTotal = weeklyTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate.getDate() === d.getDate() &&
                 tDate.getMonth() === d.getMonth() &&
                 tDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, t) => sum + t.amount, 0);

      weeklyData.push({
        label: dayLabel,
        amount: dayTotal
      });
    }

    res.json({
      success: true,
      totals: {
        totalIncome,
        totalExpense,
        remainingBalance
      },
      currentMonth: {
        income: currentMonthIncome,
        expense: currentMonthExpense,
        budget: monthlyBudget,
        isOverBudget: monthlyBudget > 0 && currentMonthExpense > monthlyBudget
      },
      categoryBreakdown,
      monthlyTrends: trendsData,
      weeklyTrends: weeklyData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  addTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
};
