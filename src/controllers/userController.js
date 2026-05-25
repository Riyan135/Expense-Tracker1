const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get user profile details
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json({
        success: true,
        user
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Update user profile & budget
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;

      // If budget is passed, update it
      if (req.body.monthlyBudget !== undefined) {
        user.monthlyBudget = Number(req.body.monthlyBudget);
      }

      // Check if email is updated and is already taken
      if (req.body.email && req.body.email !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email already taken by another account' });
        }
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          monthlyBudget: updatedUser.monthlyBudget
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(currentPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Incorrect current password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get all savings goals
// @route   GET /api/users/goals
// @access  Private
const getSavingsGoals = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, goals: user.savingsGoals || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a savings goal
// @route   POST /api/users/goals
// @access  Private
const addSavingsGoal = async (req, res) => {
  try {
    const { name, targetAmount, savedAmount, deadline } = req.body;
    if (!name || !targetAmount) {
      return res.status(400).json({ success: false, message: 'Please provide goal name and target amount' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.savingsGoals.push({ name, targetAmount, savedAmount: savedAmount || 0, deadline });
    await user.save();
    const newGoal = user.savingsGoals[user.savingsGoals.length - 1];
    res.status(201).json({ success: true, message: 'Goal added successfully', goal: newGoal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a savings goal
// @route   PUT /api/users/goals/:id
// @access  Private
const updateSavingsGoal = async (req, res) => {
  try {
    const { name, targetAmount, savedAmount, deadline } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const goal = user.savingsGoals.id(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    if (name !== undefined) goal.name = name;
    if (targetAmount !== undefined) goal.targetAmount = targetAmount;
    if (savedAmount !== undefined) goal.savedAmount = savedAmount;
    if (deadline !== undefined) goal.deadline = deadline;
    await user.save();
    res.json({ success: true, message: 'Goal updated successfully', goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a savings goal
// @route   DELETE /api/users/goals/:id
// @access  Private
const deleteSavingsGoal = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const goal = user.savingsGoals.id(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    goal.deleteOne();
    await user.save();
    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getSavingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal
};
