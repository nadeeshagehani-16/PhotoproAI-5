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

// @desc    Update own profile (name, phone, address, avatar)
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, avatar } = req.body;

    const errors = [];
    if (name !== undefined && name !== null && name !== '') {
      if (String(name).trim().length < 2 || String(name).trim().length > 100) {
        errors.push('Name must be between 2 and 100 characters.');
      }
    }
    if (phone !== undefined && phone !== null && phone !== '') {
      const p = String(phone).replace(/[\s\-().]/g, '');
      if (!/^\+?\d{7,15}$/.test(p)) errors.push('Phone must be 7-15 digits, optionally starting with +.');
    }
    if (address !== undefined && address !== null && String(address).trim().length > 200) {
      errors.push('Address cannot exceed 200 characters.');
    }
    // avatar: base64 image data-URL (image uploader) or a plain image URL
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      if (typeof avatar !== 'string' || !avatar.trim()) {
        errors.push('Avatar must be a non-empty string.');
      } else if (avatar.length > 1500000) {
        errors.push('Avatar image is too large.');
      } else if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(avatar) && !/^https?:\/\//i.test(avatar)) {
        errors.push('Avatar must be an uploaded image or an image URL.');
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // Build an update object from only the provided fields
    const update = {};
    if (name !== undefined && name !== null && name !== '') update.name = String(name).trim();
    if (phone !== undefined) update.phone = phone ? String(phone).trim() : '';
    if (address !== undefined) update.address = address ? String(address).trim() : '';
    if (avatar !== undefined) update.avatar = avatar || '';

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change own password
// @route   PUT /api/auth/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    // Load the full document (with password) and verify the old password
    const user = await User.findOne({ email: req.user.email }).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // pre-save hook re-hashes whenever the password field is modified
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};
