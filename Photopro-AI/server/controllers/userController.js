const User = require('../models/User');
const bcrypt = require('bcryptjs');

const ROLES = ['Admin', 'Staff', 'Customer'];
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^\+?\d{7,15}$/;

function _validateUserData(body, isUpdate = false) {
  const errors = [];
  const { name, email, password, phone, role, address } = body;

  if (!isUpdate) {
    if (!name || !String(name).trim()) errors.push('Name is required.');
    if (!email || !String(email).trim()) errors.push('Email is required.');
    if (!password) errors.push('Password is required.');
  }
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100) errors.push('Name must be between 2 and 100 characters.');
  }
  if (email !== undefined && email !== null && email !== '') {
    if (!EMAIL_RE.test(String(email).trim().toLowerCase())) {
      errors.push('Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).');
    }
  }
  if (password !== undefined && password !== null && password !== '') {
    if (typeof password !== 'string' || password.length < 6) errors.push('Password must be at least 6 characters.');
  }
  if (phone !== undefined && phone !== null && phone !== '') {
    const p = String(phone).replace(/[\s\-().]/g, '');
    if (!PHONE_RE.test(p)) errors.push('Phone must be 7-15 digits, optionally starting with +.');
  }
  if (role !== undefined && role !== null && role !== '' && !ROLES.includes(role)) {
    errors.push('Role must be Admin, Staff, or Customer.');
  }
  if (address !== undefined && address !== null && String(address).trim().length > 200) {
    errors.push('Address cannot exceed 200 characters.');
  }
  return errors;
}

// @route   GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/users/:id
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const errors = _validateUserData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    const email = String(req.body.email).trim().toLowerCase();
    const dup = await User.findOne({ email });
    if (dup) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }
    const user = await User.create(req.body);
    res.status(201).json({ success: true, message: 'User created', data: user });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const errors = _validateUserData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    if (req.body.email !== undefined && req.body.email !== null && req.body.email !== '') {
      const email = String(req.body.email).trim().toLowerCase();
      const dup = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (dup) {
        return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
      }
    }
    // Hash password manually when updating (findByIdAndUpdate skips the pre-save hook)
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};
