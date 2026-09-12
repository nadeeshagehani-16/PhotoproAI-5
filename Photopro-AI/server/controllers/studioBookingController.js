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

    // Validate end time is after start time
    if (endTime && startTime && endTime <= startTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

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
    const existing = await StudioBooking.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Studio booking not found' });

    const { studioId, date, startTime, endTime, status } = req.body;
    const finalStudioId = studioId || existing.studioId;
    const finalDate = date ? new Date(date) : existing.date;
    const finalStart = startTime || existing.startTime;
    const finalEnd = endTime || existing.endTime;

    // Validate end time is after start time
    if (finalEnd <= finalStart) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    // Check for conflicts when studio, date, or time changes (exclude current booking)
    if (studioId || date || startTime || endTime) {
      const conflict = await StudioBooking.findOne({
        studioId: finalStudioId,
        _id: { $ne: req.params.id },
        date: finalDate,
        startTime: { $lt: finalEnd },
        endTime: { $gt: finalStart },
        status: { $in: ['Pending', 'Confirmed'] },
      });

      if (conflict) {
        return res.status(400).json({ success: false, message: 'Studio is already booked for this time slot' });
      }
    }

    const booking = await StudioBooking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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

// Get available time slots for a studio on a given date
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { studioId, date } = req.query;
    if (!studioId || !date) {
      return res.status(400).json({ success: false, message: 'studioId and date are required' });
    }

    const bookings = await StudioBooking.find({
      studioId,
      date: new Date(date),
      status: { $in: ['Pending', 'Confirmed'] },
    }).select('startTime endTime status');

    // Generate all possible hourly slots (08:00 to 22:00)
    const allSlots = [];
    for (let h = 8; h < 22; h++) {
      const start = String(h).padStart(2, '0') + ':00';
      const end = String(h + 1).padStart(2, '0') + ':00';
      const isBooked = bookings.some(b => {
        const bStart = b.startTime;
        const bEnd = b.endTime;
        return start < bEnd && end > bStart;
      });
      allSlots.push({ start, end, available: !isBooked });
    }

    res.json({ success: true, data: { bookedSlots: bookings, availableSlots: allSlots } });
  } catch (error) { next(error); }
};
