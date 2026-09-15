const ServiceBooking = require('../models/ServiceBooking');
const mongoose = require('mongoose');

// ── Shared validation helper for service booking data ──
/**
 * Validate service booking data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateBookingData(body, isUpdate = false) {
  const errors = [];
  const { customerId, packageId, photographerId, event, date, startTime, endTime, location, amount } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  // All fields below are mandatory when creating a new booking;
  // on update they are only validated if present in the request body.
  if (!isUpdate) {
    if (!customerId) errors.push('Client is required.');
    if (!packageId) errors.push('Package is required.');
    if (!event || !event.trim()) errors.push('Event type is required.');
    if (!date) errors.push('Booking date is required.');
    if (!startTime) errors.push('Start time is required.');
    if (!endTime) errors.push('End time is required.');
    if (!location || !location.trim()) errors.push('Location is required.');
    if (amount === undefined || amount === null || amount === '') errors.push('Amount is required.');
  }

  // ── OBJECTID FORMAT: customerId, packageId, photographerId via mongoose.Types.ObjectId.isValid() ──
  // Each ID field is checked only when provided (allows partial updates).
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
    errors.push('Invalid client ID format.');
  }
  if (packageId && !mongoose.Types.ObjectId.isValid(packageId)) {
    errors.push('Invalid package ID format.');
  }
  if (photographerId && !mongoose.Types.ObjectId.isValid(photographerId)) {
    errors.push('Invalid photographer ID format.');
  }

  // ── TIME FORMAT: must match HH:MM in 24-hour format ──
  // Regex accepts 00:00–23:59 only.
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (startTime && !timeRegex.test(startTime)) {
    errors.push('Invalid start time format. Use HH:MM (e.g. 10:00).');
  }
  if (endTime && !timeRegex.test(endTime)) {
    errors.push('Invalid end time format. Use HH:MM (e.g. 12:00).');
  }

  // ── END TIME > START TIME (body-level, when both present) ──
  // String comparison works because both are "HH:MM" format.
  if (startTime && endTime && endTime <= startTime) {
    errors.push('End time must be after start time.');
  }

  // ── DATE VALIDATION: past-date rejection using LOCAL date construction ──
  // Uses getFullYear/getMonth/getDate to avoid UTC timezone shift
  // in Sri Lanka (UTC+5:30) where toISOString() returns the previous day.
  if (date) {
    const d = new Date(date);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    if (dateStr < todayStr) {
      errors.push('Booking date cannot be in the past. Please select today or a future date.');
    }
  }

  // ── AMOUNT: cannot be negative ──
  // parseFloat converts string amounts; rejects NaN and negative values.
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a) || a < 0) {
      errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
    }
  }

  return errors;
}

// @route   GET /api/service-bookings — list all bookings (with customer + package + photographer populate)
exports.getServiceBookings = async (req, res, next) => {
  try {
    const bookings = await ServiceBooking.find()
      .populate('customerId', 'name email')
      .populate('packageId', 'name price')
      .populate('photographerId', 'name specialization');
    res.json({ success: true, data: bookings });
  } catch (error) { next(error); }
};

// @route   GET /api/service-bookings/:id — get single booking by ID
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

// @route   POST /api/service-bookings — create new service booking
exports.createServiceBooking = async (req, res, next) => {
  try {
    const { photographerId, date, startTime, endTime } = req.body;

    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const validationErrors = _validateBookingData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // ── PHOTOGRAPHER DOUBLE-BOOKING PREVENTION ──
    // Queries for overlapping time ranges on the same photographer + date.
    // Only checks Pending/Confirmed/In Progress bookings.
    // Skipped when no photographerId is provided.
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

// @route   PUT /api/service-bookings/:id — update existing service booking
exports.updateServiceBooking = async (req, res, next) => {
  try {
    const existing = await ServiceBooking.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Booking not found' });

    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const validationErrors = _validateBookingData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    const { photographerId, date, startTime, endTime } = req.body;
    const finalPhotographerId = photographerId || existing.photographerId;
    const finalDate = date ? new Date(date) : existing.date;
    const finalStart = startTime || existing.startTime;
    const finalEnd = endTime || existing.endTime;

    // ── FINAL-VALUE END > START CHECK (after merging body with existing DB record) ──
    // When only endTime is sent (no startTime), body-level validator skips the
    // comparison. The handler loads the existing record, computes the FINAL
    // effective values, then compares.
    if (finalEnd <= finalStart) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    // ── PHOTOGRAPHER CONFLICT CHECK (excluding current booking) ──
    // Uses _id: { $ne: req.params.id } so the current booking doesn't conflict with itself.
    // Only re-checks when photographer, date, or time fields actually changed.
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
    res.json({ success: true, message: 'Booking updated', data: booking });
  } catch (error) { next(error); }
};

// @route   DELETE /api/service-bookings/:id — delete a service booking
exports.deleteServiceBooking = async (req, res, next) => {
  try {
    const booking = await ServiceBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) { next(error); }
};
