const StudioBooking = require('../models/StudioBooking');
const mongoose = require('mongoose');
const { notifyNewStudioBooking } = require('./notificationController');

// ── Shared validation helper for studio booking data ──
/**
 * Validate studio booking data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateBookingData(body, isUpdate = false) {
  const errors = [];
  const { studioId, customerId, date, startTime, endTime, totalCost, purpose } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  // Only validate required fields on create, or if they're present on update
  if (!isUpdate || studioId || customerId || date || startTime || endTime) {
    if (!studioId && !isUpdate) errors.push('Studio is required.');
    if (!customerId && !isUpdate) errors.push('Customer is required.');
    if (!date && !isUpdate) errors.push('Booking date is required.');
    if (!startTime && !isUpdate) errors.push('Start time is required.');
    if (!endTime && !isUpdate) errors.push('End time is required.');
  }

  // ── PURPOSE: required on create ──
  // Validate purpose is provided on create
  if (!isUpdate && (!purpose || !purpose.trim())) {
    errors.push('Purpose is required.');
  }

  // ── OBJECTID FORMAT: studioId and customerId via mongoose.Types.ObjectId.isValid() ──
  // Validate ObjectId format
  if (studioId && !mongoose.Types.ObjectId.isValid(studioId)) {
    errors.push('Invalid studio ID format.');
  }
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
    errors.push('Invalid customer ID format.');
  }

  // ── TIME FORMAT: must match HH:MM in 24-hour format ──
  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (startTime && !timeRegex.test(startTime)) {
    errors.push('Invalid start time format. Use HH:MM (e.g. 10:00).');
  }
  if (endTime && !timeRegex.test(endTime)) {
    errors.push('Invalid end time format. Use HH:MM (e.g. 12:00).');
  }

  // ── END TIME > START TIME (body-level, when both present) ──
  // String comparison works because both are "HH:MM" format
  // End time must be after start time
  if (startTime && endTime && endTime <= startTime) {
    errors.push('End time must be after start time.');
  }

  // ── DATE VALIDATION: past-date rejection using LOCAL date construction ──
  // Uses getFullYear/getMonth/getDate to avoid UTC timezone shift
  // in Sri Lanka (UTC+5:30) where toISOString() returns the previous day.
  // Date must be today or future (compare date string yyyy-MM-dd using local date)
  if (date) {
    const d = new Date(date);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    if (dateStr < todayStr) {
      errors.push('Booking date cannot be in the past.');
    }
  }

  // ── TOTAL COST: cannot be negative ──
  // Total cost cannot be negative
  if (totalCost !== undefined && totalCost !== null && totalCost !== '') {
    const cost = parseFloat(totalCost);
    if (isNaN(cost) || cost < 0) {
      errors.push('Total cost cannot be negative.');
    }
  }

  return errors;
}

// @route   GET /api/studio-bookings — list all bookings (with studio + customer populate)
exports.getStudioBookings = async (req, res, next) => {
  try {
    const bookings = await StudioBooking.find()
      .populate('studioId', 'name location')
      .populate('customerId', 'name email');
    res.json({ success: true, data: bookings });
  } catch (error) { next(error); }
};

// @route   GET /api/studio-bookings/:id — get single booking by ID
exports.getStudioBooking = async (req, res, next) => {
  try {
    const booking = await StudioBooking.findById(req.params.id)
      .populate('studioId', 'name location')
      .populate('customerId', 'name email');
    if (!booking) return res.status(404).json({ success: false, message: 'Studio booking not found' });
    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

// @route   POST /api/studio-bookings — create new booking
exports.createStudioBooking = async (req, res, next) => {
  try {
    const { studioId, date, startTime, endTime } = req.body;

    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    // Comprehensive validation
    const validationErrors = _validateBookingData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // ── STUDIO DOUBLE-BOOKING PREVENTION ──
    // Queries for overlapping time ranges on the same studio + date
    // Only checks Pending/Confirmed bookings
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
    // Non-blocking notification for the new studio booking
    notifyNewStudioBooking(booking).catch(() => {});
    res.status(201).json({ success: true, message: 'Studio booking created', data: booking });
  } catch (error) { next(error); }
};

// @route   PUT /api/studio-bookings/:id — update existing booking
exports.updateStudioBooking = async (req, res, next) => {
  try {
    const existing = await StudioBooking.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Studio booking not found' });

    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    // Validate incoming fields
    const validationErrors = _validateBookingData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    const { studioId, date, startTime, endTime, status } = req.body;
    const finalStudioId = studioId || existing.studioId;
    const finalDate = date ? new Date(date) : existing.date;
    const finalStart = startTime || existing.startTime;
    const finalEnd = endTime || existing.endTime;

    // ── FINAL-VALUE END > START CHECK (after merging body with existing DB record) ──
    // When only endTime is sent (no startTime), body-level validator skips the
    // comparison. The handler loads the existing record, computes the FINAL
    // effective values, then compares.
    // Validate end time is after start time
    if (finalEnd <= finalStart) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    // ── STUDIO CONFLICT CHECK (excluding current booking) ──
    // Uses _id: { $ne: req.params.id } so the current booking doesn't conflict with itself
    // Only re-checks when studio, date, or time fields actually changed
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

// @route   DELETE /api/studio-bookings/:id — delete a booking
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
