const Rental = require('../models/Rental');

exports.getRentals = async (req, res, next) => {
  try {
    const rentals = await Rental.find().populate('customerId', 'name email').populate('equipmentId', 'name category brand');
    res.json({ success: true, data: rentals });
  } catch (error) { next(error); }
};

exports.getRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id).populate('customerId', 'name email').populate('equipmentId', 'name category brand');
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    res.json({ success: true, data: rental });
  } catch (error) { next(error); }
};

exports.createRental = async (req, res, next) => {
  try {
    const { equipmentId, startDate, endDate } = req.body;

    // Check for overlapping rentals (prevent double-booking)
    const conflict = await Rental.findOne({
      equipmentId,
      _id: { $ne: req.params.id },
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) },
      status: { $in: ['Pending', 'Active'] },
    });

    if (conflict) {
      return res.status(400).json({ success: false, message: 'Equipment is already booked for the selected dates' });
    }

    const rental = await Rental.create(req.body);
    res.status(201).json({ success: true, message: 'Rental created', data: rental });
  } catch (error) { next(error); }
};

exports.updateRental = async (req, res, next) => {
  try {
    const rental = await Rental.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    res.json({ success: true, message: 'Rental updated', data: rental });
  } catch (error) { next(error); }
};

exports.deleteRental = async (req, res, next) => {
  try {
    const rental = await Rental.findByIdAndDelete(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    res.json({ success: true, message: 'Rental deleted' });
  } catch (error) { next(error); }
};
