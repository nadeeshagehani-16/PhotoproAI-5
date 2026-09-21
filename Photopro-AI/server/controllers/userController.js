const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ── Allowed user roles ──
const ROLES = ['Admin', 'Staff', 'Customer'];

// ── Email regex: standard RFC-style, rejects special chars like # $ % ^ & * ──
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ── Phone regex: 7–15 digits, optional leading + for country code ──
const PHONE_RE = /^\+?\d{7,15}$/;

/**
 * Validate user data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateUserData(body, isUpdate = false) {
  const errors = [];
  const { name, email, password, phone, role, address } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  if (!isUpdate) {
    if (!name || !String(name).trim()) errors.push('Name is required.');
    if (!email || !String(email).trim()) errors.push('Email is required.');
    if (!password) errors.push('Password is required.');
  }

  // ── NAME LENGTH: must be between 2 and 100 characters after trimming ──
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100) errors.push('Name must be between 2 and 100 characters.');
  }

  // ── EMAIL FORMAT: regex match (case-insensitive); rejects # $ % ^ & * etc. ──
  if (email !== undefined && email !== null && email !== '') {
    if (!EMAIL_RE.test(String(email).trim().toLowerCase())) {
      errors.push('Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).');
    }
  }

  // ── PASSWORD: minimum 6 characters (only checked when a new password is provided) ──
  if (password !== undefined && password !== null && password !== '') {
    if (typeof password !== 'string' || password.length < 6) errors.push('Password must be at least 6 characters.');
  }

  // ── PHONE FORMAT: strip spaces/dashes/parens/dots, then check 7–15 digit range ──
  if (phone !== undefined && phone !== null && phone !== '') {
    const p = String(phone).replace(/[\s\-().]/g, '');
    if (!PHONE_RE.test(p)) errors.push('Phone must be 7-15 digits, optionally starting with +.');
  }

  // ── ROLE ENUM: must be Admin, Staff, or Customer ──
  if (role !== undefined && role !== null && role !== '' && !ROLES.includes(role)) {
    errors.push('Role must be Admin, Staff, or Customer.');
  }

  // ── ADDRESS LENGTH: max 200 characters ──
  if (address !== undefined && address !== null && String(address).trim().length > 200) {
    errors.push('Address cannot exceed 200 characters.');
  }

  return errors;
}

// @route   GET /api/users — list all users (password field excluded)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/users/:id — get single user by ID (password excluded)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users — create new user
exports.createUser = async (req, res, next) => {
  try {
    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const errors = _validateUserData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // ── DUPLICATE EMAIL CHECK: reject if any user already has this email ──
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

// @route   PUT /api/users/:id — update existing user
exports.updateUser = async (req, res, next) => {
  try {
    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const errors = _validateUserData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // ── DUPLICATE EMAIL CHECK: reject if a DIFFERENT user already has this email ──
    // Uses _id: { $ne: req.params.id } to exclude the current record from the query
    if (req.body.email !== undefined && req.body.email !== null && req.body.email !== '') {
      const email = String(req.body.email).trim().toLowerCase();
      const dup = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (dup) {
        return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
      }
    }
    // ── MANUAL BCRYPT HASHING on update ──
    // findByIdAndUpdate bypasses the User schema pre-save hook,
    // so the password must be hashed manually before saving.
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

// @route   DELETE /api/users/:id — delete a user
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};
