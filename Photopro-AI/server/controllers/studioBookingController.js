const StudioBooking = require('../models/StudioBooking');

exports.getStudioBookings = async (req, res, next) => {
  try {
    const bookings = await StudioBooking.find()
      .populate('studioId', 'name location')
      .populate('customerId', 'name email');
    res.json({ success: true, data: bookings });
  } catch (error) { next(error); }
};

exports.getStudioBooking = async (req, res, next) => {
  try {
    const booking = await StudioBooking.findById(req.params.id)
      .populate('studioId', 'name location')
      .populate('customerId', 'name email');
    if (!booking) return res.status(404).json({ success: false, message: 'Studio booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

exports.createStudioBooking = async (req, res, next) => {
  try {
    const { studioId, date, startTime, endTime } = req.body;

    // Prevent studio double-booking
    const conflict = await StudioBooking.findOne({
      studioId,
      date: new Date(date),
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
      status: { $in: ['Pending', 'Confirmed'] },
    });

    if (conflict) {
      return res.status(400).json({ success: false, message: 'Studio is already booked for this time slot' });
    }

    const booking = await StudioBooking.create(req.body);
    res.status(201).json({ success: true, message: 'Studio booking created', data: booking });
  } catch (error) { next(error); }
};

exports.updateStudioBooking = async (req, res, next) => {
  try {
    const booking = await StudioBooking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!booking) return res.status(404).json({ success: false, message: 'Studio booking not found' });
    res.json({ success: true, message: 'Studio booking updated', data: booking });
  } catch (error) { next(error); }
};

exports.deleteStudioBooking = async (req, res, next) => {
  try {
    const booking = await StudioBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Studio booking not found' });
    res.json({ success: true, message: 'Studio booking deleted' });
  } catch (error) { next(error); }
};
