const Studio = require('../models/Studio');

exports.getStudios = async (req, res, next) => {
  try {
    const studios = await Studio.find();
    res.json({ success: true, data: studios });
  } catch (error) { next(error); }
};

exports.getStudio = async (req, res, next) => {
  try {
    const studio = await Studio.findById(req.params.id);
    if (!studio) return res.status(404).json({ success: false, message: 'Studio not found' });
    res.json({ success: true, data: studio });
  } catch (error) { next(error); }
};

exports.createStudio = async (req, res, next) => {
  try {
    const studio = await Studio.create(req.body);
    res.status(201).json({ success: true, message: 'Studio created', data: studio });
  } catch (error) { next(error); }
};

exports.updateStudio = async (req, res, next) => {
  try {
    const studio = await Studio.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!studio) return res.status(404).json({ success: false, message: 'Studio not found' });
    res.json({ success: true, message: 'Studio updated', data: studio });
  } catch (error) { next(error); }
};

exports.deleteStudio = async (req, res, next) => {
  try {
    const studio = await Studio.findByIdAndDelete(req.params.id);
    if (!studio) return res.status(404).json({ success: false, message: 'Studio not found' });
    res.json({ success: true, message: 'Studio deleted' });
  } catch (error) { next(error); }
};
