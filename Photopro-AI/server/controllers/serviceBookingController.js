const ServiceBooking = require('../models/ServiceBooking');

exports.getServiceBookings = async (req, res, next) => {
  try {
    const bookings = await ServiceBooking.find()
      .populate('customerId', 'name email')
      .populate('packageId', 'name price')
      .populate('photographerId', 'name specialization');
    res.json({ success: true, data: bookings });
  } catch (error) { next(error); }
};

exports.getServiceBooking = async (req, res, next) => {
  try {
    const booking = await ServiceBooking.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate('packageId', 'name price')
      .populate('photographerId', 'name specialization');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

exports.createServiceBooking = async (req, res, next) => {
  try {
    const { photographerId, date, startTime, endTime } = req.body;

    // Prevent photographer booking conflicts
    if (photographerId) {
      const conflict = await ServiceBooking.findOne({
        photographerId,
        date: new Date(date),
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
        ],
        status: { $in: ['Pending', 'Confirmed', 'In Progress'] },
      });

      if (conflict) {
        return res.status(400).json({ success: false, message: 'Photographer is already booked for this time slot' });
      }
    }

    const booking = await ServiceBooking.create(req.body);
    res.status(201).json({ success: true, message: 'Service booking created', data: booking });
  } catch (error) { next(error); }
};

exports.updateServiceBooking = async (req, res, next) => {
  try {
    const booking = await ServiceBooking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking updated', data: booking });
  } catch (error) { next(error); }
};

exports.deleteServiceBooking = async (req, res, next) => {
  try {
    const booking = await ServiceBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) { next(error); }
};
