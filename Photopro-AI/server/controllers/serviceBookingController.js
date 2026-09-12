const ServiceBooking = require('../models/ServiceBooking');
const mongoose = require('mongoose');

// ── Shared validation helper ──
function _validateBookingData(body, isUpdate = false) {
  const errors = [];
  const { customerId, packageId, photographerId, event, date, startTime, endTime, location, amount } = body;

  // Required fields on create
  if (!isUpdate) {
    if (!customerId) errors.push('Client is required.');
    if (!packageId) errors.push('Package is required.');
    if (!photographerId) errors.push('Photographer is required.');
    if (!event || !event.trim()) errors.push('Event type is required.');
    if (!date) errors.push('Booking date is required.');
    if (!startTime) errors.push('Start time is required.');
    if (!endTime) errors.push('End time is required.');
    if (!location || !location.trim()) errors.push('Location is required.');
    if (amount === undefined || amount === null || amount === '') errors.push('Amount is required.');
  }

  // Validate ObjectId formats
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
    errors.push('Invalid client ID format.');
  }
  if (packageId && !mongoose.Types.ObjectId.isValid(packageId)) {
    errors.push('Invalid package ID format.');
  }
  if (photographerId && !mongoose.Types.ObjectId.isValid(photographerId)) {
    errors.push('Invalid photographer ID format.');
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (startTime && !timeRegex.test(startTime)) {
    errors.push('Invalid start time format. Use HH:MM (e.g. 10:00).');
  }
  if (endTime && !timeRegex.test(endTime)) {
    errors.push('Invalid end time format. Use HH:MM (e.g. 12:00).');
  }

  // End time must be after start time
  if (startTime && endTime && endTime <= startTime) {
    errors.push('End time must be after start time.');
  }

  // Date must be today or future (compare yyyy-MM-dd)
  if (date) {
    const dateStr = new Date(date).toISOString().split('T')[0];
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    if (dateStr < todayStr) {
      errors.push('Booking date cannot be in the past. Please select today or a future date.');
    }
  }

  // Amount cannot be negative
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a) || a < 0) {
      errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
    }
  }

  return errors;
}

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

    // Comprehensive validation
    const validationErrors = _validateBookingData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

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
    res.status(201).json({ success: true, message: 'Service booking created successfully', data: booking });
  } catch (error) { next(error); }
};

exports.updateServiceBooking = async (req, res, next) => {
  try {
    const existing = await ServiceBooking.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Validate incoming fields
    const validationErrors = _validateBookingData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // Check photographer conflicts when photographer, date, or time changes (exclude current booking)
    const { photographerId, date, startTime, endTime } = req.body;
    const finalPhotographerId = photographerId || existing.photographerId;
    const finalDate = date ? new Date(date) : existing.date;
    const finalStart = startTime || existing.startTime;
    const finalEnd = endTime || existing.endTime;

    if (finalPhotographerId && (photographerId || date || startTime || endTime)) {
      const conflict = await ServiceBooking.findOne({
        photographerId: finalPhotographerId,
        _id: { $ne: req.params.id },
        date: finalDate,
        startTime: { $lt: finalEnd },
        endTime: { $gt: finalStart },
        status: { $in: ['Pending', 'Confirmed', 'In Progress'] },
      });

      if (conflict) {
        return res.status(400).json({ success: false, message: 'Photographer is already booked for this time slot' });
      }
    }

    const booking = await ServiceBooking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Booking updated successfully', data: booking });
  } catch (error) { next(error); }
};

exports.deleteServiceBooking = async (req, res, next) => {
  try {
    const booking = await ServiceBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) { next(error); }
};
