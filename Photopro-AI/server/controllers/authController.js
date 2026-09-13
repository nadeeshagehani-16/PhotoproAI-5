const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    const errors = [];
    if (!name || !String(name).trim()) errors.push('Name is required.');
    else if (String(name).trim().length < 2 || String(name).trim().length > 100) errors.push('Name must be between 2 and 100 characters.');
    if (!email || !String(email).trim()) errors.push('Email is required.');
    else if (!EMAIL_RE.test(String(email).trim().toLowerCase())) errors.push('Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).');
    if (!password) errors.push('Password is required.');
    else if (String(password).length < 6) errors.push('Password must be at least 6 characters.');
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const userExists = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = await User.create({ name, email, password, role, phone, address });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token: generateToken(user._id) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (!EMAIL_RE.test(String(email).trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, token: generateToken(user._id) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
