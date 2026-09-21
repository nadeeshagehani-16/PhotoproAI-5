const Equipment = require('../models/Equipment');

// ── Allowed equipment categories ──
const CATEGORIES = ['Camera', 'Lens', 'Lighting', 'Tripod', 'Audio', 'Accessory'];
// ── Allowed equipment conditions ──
const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair'];
// ── Allowed availability statuses ──
const AVAILABILITIES = ['Available', 'Rented', 'Under Maintenance'];

/**
 * Validate equipment data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateEquipmentData(body, isUpdate = false) {
  const errors = [];
  const { name, category, brand, model, pricePerDay, condition, availability, serialNumber, description, specifications } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  if (!isUpdate) {
    if (!name || !String(name).trim()) errors.push('Name is required.');
    if (!category) errors.push('Category is required.');
    if (!brand || !String(brand).trim()) errors.push('Brand is required.');
    if (!model || !String(model).trim()) errors.push('Model is required.');
    if (pricePerDay === undefined || pricePerDay === null || pricePerDay === '') errors.push('Price per day is required.');
  }
  // ── NAME LENGTH: 2–100 characters after trimming ──
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100) errors.push('Name must be between 2 and 100 characters.');
  }
  // ── CATEGORY ENUM: must be one of the predefined equipment categories ──
  if (category !== undefined && category !== null && category !== '' && !CATEGORIES.includes(category)) {
    errors.push('Category must be one of: ' + CATEGORIES.join(', ') + '.');
  }
  // ── BRAND LENGTH: 2–50 characters ──
  if (brand !== undefined && brand !== null && brand !== '') {
    const b = String(brand).trim();
    if (b.length < 2 || b.length > 50) errors.push('Brand must be between 2 and 50 characters.');
  }
  // ── MODEL LENGTH: 1–50 characters ──
  if (model !== undefined && model !== null && model !== '') {
    const m = String(model).trim();
    if (m.length < 1 || m.length > 50) errors.push('Model must be between 1 and 50 characters.');
  }
  // ── PRICE PER DAY: must be a valid number, cannot be negative ──
  if (pricePerDay !== undefined && pricePerDay !== null && pricePerDay !== '') {
    const p = Number(pricePerDay);
    if (Number.isNaN(p)) errors.push('Price per day must be a valid number.');
    else if (p < 0) errors.push('Price per day cannot be negative.');
  }
  // ── CONDITION ENUM: New, Good, Fair, or Needs Repair ──
  if (condition !== undefined && condition !== null && condition !== '' && !CONDITIONS.includes(condition)) {
    errors.push('Condition must be one of: ' + CONDITIONS.join(', ') + '.');
  }
  // ── AVAILABILITY ENUM: Available, Rented, or Under Maintenance ──
  if (availability !== undefined && availability !== null && availability !== '' && !AVAILABILITIES.includes(availability)) {
    errors.push('Availability must be one of: ' + AVAILABILITIES.join(', ') + '.');
  }
  // ── SERIAL NUMBER: max 50 characters ──
  if (serialNumber !== undefined && serialNumber !== null && String(serialNumber).trim().length > 50) {
    errors.push('Serial number cannot exceed 50 characters.');
  }
  // ── DESCRIPTION: max 500 characters ──
  if (description !== undefined && description !== null && String(description).length > 500) {
    errors.push('Description cannot exceed 500 characters.');
  }
  // ── SPECIFICATIONS: max 200 characters ──
  if (specifications !== undefined && specifications !== null && String(specifications).length > 200) {
    errors.push('Specifications cannot exceed 200 characters.');
  }
  return errors;
}

// @route   GET /api/equipment — list all equipment
exports.getEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.find();
    res.json({ success: true, data: equipment });
  } catch (error) { next(error); }
};

// @route   GET /api/equipment/:id — get single equipment by ID
exports.getEquipmentById = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  } catch (error) { next(error); }
};

// @route   POST /api/equipment — create new equipment
exports.createEquipment = async (req, res, next) => {
  try {
    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const errors = _validateEquipmentData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    const equipment = await Equipment.create(req.body);
    res.status(201).json({ success: true, message: 'Equipment created', data: equipment });
  } catch (error) { next(error); }
};

// @route   PUT /api/equipment/:id — update existing equipment
exports.updateEquipment = async (req, res, next) => {
  try {
    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const errors = _validateEquipmentData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: 'Equipment updated', data: equipment });
  } catch (error) { next(error); }
};

// @route   DELETE /api/equipment/:id — delete equipment
exports.deleteEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: 'Equipment deleted' });
  } catch (error) { next(error); }
};
