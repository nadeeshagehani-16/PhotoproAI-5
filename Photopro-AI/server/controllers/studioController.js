const Studio = require('../models/Studio');

// ── Allowed studio availability statuses ──
const AVAILABILITIES = ['Available', 'Booked', 'Under Maintenance'];

/**
 * Validate studio data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateStudioData(body, isUpdate = false) {
  const errors = [];
  const { name, location, capacity, pricePerHour, description, availability } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  if (!isUpdate) {
    if (!name || !String(name).trim()) errors.push('Studio name is required.');
    if (!location || !String(location).trim()) errors.push('Location is required.');
    if (pricePerHour === undefined || pricePerHour === null || pricePerHour === '') errors.push('Price per hour is required.');
  }
  // ── NAME LENGTH: 2–100 characters after trimming ──
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100) errors.push('Studio name must be between 2 and 100 characters.');
  }
  // ── LOCATION LENGTH: 2–200 characters after trimming ──
  if (location !== undefined && location !== null && location !== '') {
    const l = String(location).trim();
    if (l.length < 2 || l.length > 200) errors.push('Location must be between 2 and 200 characters.');
  }
  // ── CAPACITY: must be at least 1 ──
  if (capacity !== undefined && capacity !== null && capacity !== '') {
    const c = Number(capacity);
    if (isNaN(c) || c < 1) errors.push('Capacity must be at least 1.');
  }
  // ── PRICE PER HOUR: must be a valid number, cannot be negative ──
  if (pricePerHour !== undefined && pricePerHour !== null && pricePerHour !== '') {
    const p = Number(pricePerHour);
    if (isNaN(p)) errors.push('Price per hour must be a valid number.');
    else if (p < 0) errors.push('Price per hour cannot be negative.');
  }
  // ── DESCRIPTION: max 500 characters ──
  if (description !== undefined && description !== null && String(description).length > 500) {
    errors.push('Description cannot exceed 500 characters.');
  }
  // ── AVAILABILITY ENUM: Available, Booked, or Under Maintenance ──
  if (availability !== undefined && availability !== null && availability !== '' && !AVAILABILITIES.includes(availability)) {
    errors.push('Availability must be one of: ' + AVAILABILITIES.join(', ') + '.');
  }
  return errors;
}

// @route   GET /api/studios — list all studios
exports.getStudios = async (req, res, next) => {
  try {
    const studios = await Studio.find();
    res.json({ success: true, data: studios });
  } catch (error) { next(error); }
};

// @route   GET /api/studios/:id — get single studio by ID
exports.getStudio = async (req, res, next) => {
  try {
    const studio = await Studio.findById(req.params.id);
    if (!studio) return res.status(404).json({ success: false, message: 'Studio not found' });
    res.json({ success: true, data: studio });
  } catch (error) { next(error); }
};

// @route   POST /api/studios — create new studio
exports.createStudio = async (req, res, next) => {
  try {
    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const errors = _validateStudioData(req.body);
    if (errors.length > 0) return res.status(400).json({ success: false, message: errors.join(' ') });
    const studio = await Studio.create(req.body);
    res.status(201).json({ success: true, message: 'Studio created', data: studio });
  } catch (error) { next(error); }
};

// @route   PUT /api/studios/:id — update existing studio
exports.updateStudio = async (req, res, next) => {
  try {
    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const errors = _validateStudioData(req.body, true);
    if (errors.length > 0) return res.status(400).json({ success: false, message: errors.join(' ') });
    const studio = await Studio.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!studio) return res.status(404).json({ success: false, message: 'Studio not found' });
    res.json({ success: true, message: 'Studio updated', data: studio });
  } catch (error) { next(error); }
};

// @route   DELETE /api/studios/:id — delete a studio
exports.deleteStudio = async (req, res, next) => {
  try {
    const studio = await Studio.findByIdAndDelete(req.params.id);
    if (!studio) return res.status(404).json({ success: false, message: 'Studio not found' });
    res.json({ success: true, message: 'Studio deleted' });
  } catch (error) { next(error); }
};
