const ServiceBooking = require('../models/ServiceBooking');
const mongoose = require('mongoose');
const { notifyNewServiceBooking } = require('./notificationController');

// ── Shared validation helper for service booking data ──
/**
 * Validate service booking data before create or update.
 * Covers date, time, amount, and ObjectId validation.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateBookingData(body, isUpdate = false) {
  const errors = [];
  const { customerId, packageId, photographerId, event, date, startTime, endTime, location, amount } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  // All fields mandatory except photographer: client, package, event, date, times, location, amount
  // photographerId is optional (calendar quick-create omits it; the service-bookings page collects it)
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

  // ── OBJECTID FORMAT: uses mongoose.Types.ObjectId.isValid() for BSON validation ──
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

  // ── TIME FORMAT: must match HH:MM in 24-hour format ──
  // Accepts 00:00–23:59; rejects "9:00" (missing leading zero) or "25:00"
  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (startTime && !timeRegex.test(startTime)) {
    errors.push('Invalid start time format. Use HH:MM (e.g. 10:00).');
  }
  if (endTime && !timeRegex.test(endTime)) {
    errors.push('Invalid end time format. Use HH:MM (e.g. 12:00).');
  }

  // ── END TIME > START TIME (body-level check) ──
  // String comparison works because both are "HH:MM" format
  // Only runs when BOTH times are in the body (partial updates handled in the handler)
  // End time must be after start time
  if (startTime && endTime && endTime <= startTime) {
    errors.push('End time must be after start time.');
  }

  // ── DATE VALIDATION: past-date rejection ──
  // Compares yyyy-MM-dd strings; built from local date parts to avoid UTC timezone shift (Sri Lanka UTC+5:30)
  // Date must be today or future (compare yyyy-MM-dd)
  if (date) {
    const d = new Date(date);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    if (dateStr < todayStr) {
      errors.push('Booking date cannot be in the past. Please select today or a future date.');
    }
  }

  // ── AMOUNT: must be a valid number, cannot be negative ──
  // Amount cannot be negative
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a) || a < 0) {
      errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
    }
  }

  return errors;
}

// @route   GET /api/service-bookings — list all bookings (with populated refs)
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

// @route   POST /api/service-bookings — create new booking
exports.createServiceBooking = async (req, res, next) => {
  try {
    const { photographerId, date, startTime, endTime } = req.body;

    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    // Comprehensive validation
    const validationErrors = _validateBookingData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // ── PHOTOGRAPHER TIME-SLOT CONFLICT PREVENTION ──
    // Prevents the same photographer from being double-booked on the same date
    // with overlapping start/end times. Only checks active statuses.
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
    // Non-blocking notification for the new booking
    notifyNewServiceBooking(booking).catch(() => {});
    res.status(201).json({ success: true, message: 'Service booking created successfully', data: booking });
  } catch (error) { next(error); }
};

// @route   PUT /api/service-bookings/:id — update existing booking
exports.updateServiceBooking = async (req, res, next) => {
  try {
    const existing = await ServiceBooking.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Booking not found' });

    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    // Validate incoming fields
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
    // End time must be after start time (compare final values after DB fallback)
    if (finalEnd <= finalStart) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    // ── PHOTOGRAPHER CONFLICT CHECK (excluding current booking) ──
    // Uses _id: { $ne: req.params.id } so the current booking doesn't conflict with itself
    // Only re-checks when photographer, date, or time fields actually changed
    // Prevent photographer booking conflicts when photographer, date, or time changes (exclude current booking)
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

// @route   DELETE /api/service-bookings/:id — delete a booking
exports.deleteServiceBooking = async (req, res, next) => {
  try {
    const booking = await ServiceBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) { next(error); }
};
