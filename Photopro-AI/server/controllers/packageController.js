const Package = require('../models/Package');

exports.getPackages = async (req, res, next) => {
  try {
    const packages = await Package.find();
    res.json({ success: true, data: packages });
  } catch (error) { next(error); }
};

exports.getPackage = async (req, res, next) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, data: pkg });
  } catch (error) { next(error); }
};

exports.createPackage = async (req, res, next) => {
  try {
    const pkg = await Package.create(req.body);
    res.status(201).json({ success: true, message: 'Package created', data: pkg });
  } catch (error) { next(error); }
};

exports.updatePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, message: 'Package updated', data: pkg });
  } catch (error) { next(error); }
};

exports.deletePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, message: 'Package deleted' });
  } catch (error) { next(error); }
};
