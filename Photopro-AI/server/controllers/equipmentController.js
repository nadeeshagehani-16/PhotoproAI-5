const Equipment = require('../models/Equipment');

const CATEGORIES = ['Camera', 'Lens', 'Lighting', 'Tripod', 'Audio', 'Accessory'];
const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair'];
const AVAILABILITIES = ['Available', 'Rented', 'Under Maintenance'];

function _validateEquipmentData(body, isUpdate = false) {
  const errors = [];
  const { name, category, brand, model, pricePerDay, condition, availability, serialNumber, description, specifications } = body;

  if (!isUpdate) {
    if (!name || !String(name).trim()) errors.push('Name is required.');
    if (!category) errors.push('Category is required.');
    if (!brand || !String(brand).trim()) errors.push('Brand is required.');
    if (!model || !String(model).trim()) errors.push('Model is required.');
    if (pricePerDay === undefined || pricePerDay === null || pricePerDay === '') errors.push('Price per day is required.');
  }
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100) errors.push('Name must be between 2 and 100 characters.');
  }
  if (category !== undefined && category !== null && category !== '' && !CATEGORIES.includes(category)) {
    errors.push('Category must be one of: ' + CATEGORIES.join(', ') + '.');
  }
  if (brand !== undefined && brand !== null && brand !== '') {
    const b = String(brand).trim();
    if (b.length < 2 || b.length > 50) errors.push('Brand must be between 2 and 50 characters.');
  }
  if (model !== undefined && model !== null && model !== '') {
    const m = String(model).trim();
    if (m.length < 1 || m.length > 50) errors.push('Model must be between 1 and 50 characters.');
  }
  if (pricePerDay !== undefined && pricePerDay !== null && pricePerDay !== '') {
    const p = Number(pricePerDay);
    if (Number.isNaN(p)) errors.push('Price per day must be a valid number.');
    else if (p < 0) errors.push('Price per day cannot be negative.');
  }
  if (condition !== undefined && condition !== null && condition !== '' && !CONDITIONS.includes(condition)) {
    errors.push('Condition must be one of: ' + CONDITIONS.join(', ') + '.');
  }
  if (availability !== undefined && availability !== null && availability !== '' && !AVAILABILITIES.includes(availability)) {
    errors.push('Availability must be one of: ' + AVAILABILITIES.join(', ') + '.');
  }
  if (serialNumber !== undefined && serialNumber !== null && String(serialNumber).trim().length > 50) {
    errors.push('Serial number cannot exceed 50 characters.');
  }
  if (description !== undefined && description !== null && String(description).length > 500) {
    errors.push('Description cannot exceed 500 characters.');
  }
  if (specifications !== undefined && specifications !== null && String(specifications).length > 200) {
    errors.push('Specifications cannot exceed 200 characters.');
  }
  return errors;
}

exports.getEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.find();
    res.json({ success: true, data: equipment });
  } catch (error) { next(error); }
};

exports.getEquipmentById = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  } catch (error) { next(error); }
};

exports.createEquipment = async (req, res, next) => {
  try {
    const errors = _validateEquipmentData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    const equipment = await Equipment.create(req.body);
    res.status(201).json({ success: true, message: 'Equipment created', data: equipment });
  } catch (error) { next(error); }
};

exports.updateEquipment = async (req, res, next) => {
  try {
    const errors = _validateEquipmentData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: 'Equipment updated', data: equipment });
  } catch (error) { next(error); }
};

exports.deleteEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: 'Equipment deleted' });
  } catch (error) { next(error); }
};
