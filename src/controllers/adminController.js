const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Get all users (excluding passwords)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Toggle user active/deactivated status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin status cannot be modified' });
    }

    // Toggle status
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();

    res.json({
      success: true,
      message: `User status successfully changed to ${user.status}`,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get all transactions across the entire system
// @route   GET /api/admin/transactions
// @access  Private/Admin
const getAllTransactions = async (req, res) => {
  try {
    // Populate user details for audit trail
    const transactions = await Transaction.find()
      .populate('userId', 'username email status')
      .sort({ date: -1 });

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

// @desc    Get system reports and analysis
// @route   GET /api/admin/system-stats
// @access  Private/Admin
const getSystemStats = async (req, res) => {
  try {
    // Basic counts
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', status: 'active' });
    const inactiveUsers = await User.countDocuments({ role: 'user', status: 'inactive' });
    const totalTransactions = await Transaction.countDocuments();

    // Volume of transactions
    const transactions = await Transaction.find();
    let totalIncomeVolume = 0;
    let totalExpenseVolume = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncomeVolume += t.amount;
      } else {
        totalExpenseVolume += t.amount;
      }
    });

    // Average transaction size
    const avgTransactionSize = totalTransactions > 0 ? (totalIncomeVolume + totalExpenseVolume) / totalTransactions : 0;

    // Get system-wide category breakdown
    const categoryBreakdown = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalTransactions,
        totalIncomeVolume,
        totalExpenseVolume,
        avgTransactionSize: Math.round(avgTransactionSize * 100) / 100,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  toggleUserStatus,
  getAllTransactions,
  getSystemStats
};
