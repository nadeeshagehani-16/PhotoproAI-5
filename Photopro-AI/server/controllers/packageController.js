const Package = require('../models/Package');

// ── Shared validation helper for package data ──
/**
 * Validate package data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validatePackageData(body, isUpdate = false) {
  const errors = [];
  const { name, price, duration, photos, photographers, description } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  // Name, price, and duration are mandatory for new packages
  if (!isUpdate) {
    if (!name || !name.trim()) errors.push('Package name is required.');
    if (price === undefined || price === null || price === '') errors.push('Price is required.');
    if (!duration || !duration.trim()) errors.push('Duration is required.');
  }

  // ── NAME: non-empty string, max 100 characters ──
  if (name !== undefined && name !== null) {
    if (typeof name !== 'string' || !name.trim()) {
      errors.push('Package name cannot be empty.');
    } else if (name.trim().length > 100) {
      errors.push('Package name cannot exceed 100 characters.');
    }
  }

  // ── PRICE: must be a valid number, cannot be negative ──
  if (price !== undefined && price !== null && price !== '') {
    const p = parseFloat(price);
    if (isNaN(p)) {
      errors.push('Price must be a valid number.');
    } else if (p < 0) {
      errors.push('Price cannot be negative.');
    }
  }

  // ── DURATION: non-empty string, max 50 chars (e.g. "4 Hours", "Full Day") ──
  if (duration !== undefined && duration !== null && duration !== '') {
    if (typeof duration !== 'string' || !duration.trim()) {
      errors.push('Duration must be a non-empty string (e.g. "4 Hours").');
    } else if (duration.trim().length > 50) {
      errors.push('Duration cannot exceed 50 characters.');
    }
  }

  // ── PHOTOS COUNT: non-negative integer (0 or more) ──
  if (photos !== undefined && photos !== null && photos !== '') {
    const n = parseInt(photos);
    if (isNaN(n) || n < 0) {
      errors.push('Photos count must be 0 or a positive number.');
    }
  }

  // ── PHOTOGRAPHERS COUNT: must be at least 1 ──
  if (photographers !== undefined && photographers !== null && photographers !== '') {
    const n = parseInt(photographers);
    if (isNaN(n) || n < 1) {
      errors.push('Photographers count must be at least 1.');
    }
  }

  // ── DESCRIPTION: max 1000 characters ──
  if (description !== undefined && description !== null && typeof description === 'string' && description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters.');
  }

  return errors;
}

// @route   GET /api/packages — list all packages
exports.getPackages = async (req, res, next) => {
  try {
    const packages = await Package.find();
    res.json({ success: true, data: packages });
  } catch (error) { next(error); }
};

// @route   GET /api/packages/:id — get single package by ID
exports.getPackage = async (req, res, next) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, data: pkg });
  } catch (error) { next(error); }
};

// @route   POST /api/packages — create new package
exports.createPackage = async (req, res, next) => {
  try {
    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const validationErrors = _validatePackageData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    const pkg = await Package.create(req.body);
    res.status(201).json({ success: true, message: 'Package created successfully', data: pkg });
  } catch (error) { next(error); }
};

// @route   PUT /api/packages/:id — update existing package
exports.updatePackage = async (req, res, next) => {
  try {
    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const validationErrors = _validatePackageData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, message: 'Package updated successfully', data: pkg });
  } catch (error) { next(error); }
};

// @route   DELETE /api/packages/:id — delete a package
exports.deletePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (error) { next(error); }
};
