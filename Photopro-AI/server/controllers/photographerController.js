const Photographer = require('../models/Photographer');

exports.getPhotographers = async (req, res, next) => {
  try {
    const photographers = await Photographer.find();
    res.json({ success: true, data: photographers });
  } catch (error) { next(error); }
};

exports.getPhotographer = async (req, res, next) => {
  try {
    const photographer = await Photographer.findById(req.params.id);
    if (!photographer) return res.status(404).json({ success: false, message: 'Photographer not found' });
    res.json({ success: true, data: photographer });
  } catch (error) { next(error); }
};

exports.createPhotographer = async (req, res, next) => {
  try {
    const photographer = await Photographer.create(req.body);
    res.status(201).json({ success: true, message: 'Photographer created', data: photographer });
  } catch (error) { next(error); }
};

exports.updatePhotographer = async (req, res, next) => {
  try {
    const photographer = await Photographer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!photographer) return res.status(404).json({ success: false, message: 'Photographer not found' });
    res.json({ success: true, message: 'Photographer updated', data: photographer });
  } catch (error) { next(error); }
};

exports.deletePhotographer = async (req, res, next) => {
  try {
    const photographer = await Photographer.findByIdAndDelete(req.params.id);
    if (!photographer) return res.status(404).json({ success: false, message: 'Photographer not found' });
    res.json({ success: true, message: 'Photographer deleted' });
  } catch (error) { next(error); }
};
