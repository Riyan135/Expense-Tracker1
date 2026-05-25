const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'my_expense_tracker_secret_jwt_key_2026', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user (or admin)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { username, email, password, adminSecretKey } = req.body;

    // Validate inputs
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please add all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Determine role (Assign admin if secret matches)
    let role = 'user';
    if (adminSecretKey && adminSecretKey === process.env.ADMIN_SECRET_KEY) {
      role = 'admin';
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role
    });

    if (user) {
      res.status(201).json({
        success: true,
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please add email and password' });
    }

    // Check for user email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if account is active
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    // Check password
    if (await user.matchPassword(password)) {
      res.json({
        success: true,
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        monthlyBudget: user.monthlyBudget,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Authenticate admin & get token
// @route   POST /api/auth/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please add email and password' });
    }

    const user = await User.findOne({ email });

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized as admin' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    if (await user.matchPassword(password)) {
      res.json({
        success: true,
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  loginAdmin
};
