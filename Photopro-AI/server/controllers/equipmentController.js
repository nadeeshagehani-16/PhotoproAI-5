const Equipment = require('../models/Equipment');

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
    const equipment = await Equipment.create(req.body);
    res.status(201).json({ success: true, message: 'Equipment created', data: equipment });
  } catch (error) { next(error); }
};

exports.updateEquipment = async (req, res, next) => {
  try {
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
