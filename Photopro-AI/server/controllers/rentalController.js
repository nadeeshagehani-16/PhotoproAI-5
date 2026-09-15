const Rental = require('../models/Rental');
const Equipment = require('../models/Equipment');

// ── Allowed rental statuses ──
const STATUSES = ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'];
// ── Allowed payment statuses ──
const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Refunded'];
// ── MongoDB ObjectId format: exactly 24 hex characters ──
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Returns today's date as yyyy-MM-dd using LOCAL timezone.
 * Avoids UTC shift bugs in Sri Lanka (UTC+5:30) where
 * new Date('2026-09-15').toISOString() can return '2026-09-14'.
 */
function _todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Extract just the yyyy-MM-dd portion from any date value.
 * Works with ISO strings, date objects cast to string, etc.
 */
function _dateOnly(v) {
  if (v === undefined || v === null || v === '') return '';
  const s = String(v).split('T')[0].slice(0, 10);
  return s;
}

/**
 * Validate rental data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateRentalData(body, isUpdate = false) {
  const errors = [];
  const { customerId, equipmentId, startDate, endDate, totalCost, securityDeposit, status, paymentStatus, notes } = body;
  const todayStr = _todayStr();

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  if (!isUpdate) {
    if (!customerId) errors.push('Customer is required.');
    if (!equipmentId) errors.push('Equipment is required.');
    if (!startDate) errors.push('Start date is required.');
    if (!endDate) errors.push('End date is required.');
    if (totalCost === undefined || totalCost === null || totalCost === '') errors.push('Total cost is required.');
  }
  // ── OBJECTID FORMAT: customerId must be 24 hex chars ──
  if (customerId !== undefined && customerId !== null && customerId !== '' && !OBJECT_ID_RE.test(String(customerId))) {
    errors.push('Invalid customer ID format.');
  }
  // ── OBJECTID FORMAT: equipmentId must be 24 hex chars ──
  if (equipmentId !== undefined && equipmentId !== null && equipmentId !== '' && !OBJECT_ID_RE.test(String(equipmentId))) {
    errors.push('Invalid equipment ID format.');
  }
  // ── DATE VALIDATION: startDate must be today or future ──
  // Uses _dateOnly() for string comparison to avoid UTC timezone bugs
  // User-entered rental dates must be today or in the future
  if (startDate !== undefined && startDate !== null && startDate !== '') {
    if (Number.isNaN(new Date(startDate).getTime())) errors.push('Start date is invalid.');
    else if (_dateOnly(startDate) < todayStr) errors.push('Start date cannot be in the past. Please choose today or a future date.');
  }
  // ── DATE VALIDATION: endDate must be today or future ──
  if (endDate !== undefined && endDate !== null && endDate !== '') {
    if (Number.isNaN(new Date(endDate).getTime())) errors.push('End date is invalid.');
    else if (_dateOnly(endDate) < todayStr) errors.push('End date cannot be in the past. Please choose today or a future date.');
  }
  // ── TOTAL COST: must be a valid number, cannot be negative ──
  if (totalCost !== undefined && totalCost !== null && totalCost !== '') {
    const c = Number(totalCost);
    if (Number.isNaN(c)) errors.push('Total cost must be a valid number.');
    else if (c < 0) errors.push('Total cost cannot be negative.');
  }
  // ── SECURITY DEPOSIT: must be a valid number, cannot be negative ──
  if (securityDeposit !== undefined && securityDeposit !== null && securityDeposit !== '') {
    const d = Number(securityDeposit);
    if (Number.isNaN(d)) errors.push('Security deposit must be a valid number.');
    else if (d < 0) errors.push('Security deposit cannot be negative.');
  }
  // ── STATUS ENUM: must be one of the predefined rental statuses ──
  if (status !== undefined && status !== null && status !== '' && !STATUSES.includes(status)) {
    errors.push('Status must be one of: ' + STATUSES.join(', ') + '.');
  }
  // ── PAYMENT STATUS ENUM: Unpaid, Paid, or Refunded ──
  if (paymentStatus !== undefined && paymentStatus !== null && paymentStatus !== '' && !PAYMENT_STATUSES.includes(paymentStatus)) {
    errors.push('Payment status must be one of: ' + PAYMENT_STATUSES.join(', ') + '.');
  }
  // ── NOTES: max 1000 characters ──
  if (notes !== undefined && notes !== null && String(notes).length > 1000) {
    errors.push('Notes cannot exceed 1000 characters.');
  }
  return errors;
}

exports.getRentals = async (req, res, next) => {
  try {
    const rentals = await Rental.find().populate('customerId', 'name email address avatar').populate('equipmentId', 'name category brand');
    res.json({ success: true, data: rentals });
  } catch (error) { next(error); }
};

exports.getRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id).populate('customerId', 'name email address avatar').populate('equipmentId', 'name category brand');
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    res.json({ success: true, data: rental });
  } catch (error) { next(error); }
};

exports.createRental = async (req, res, next) => {
  try {
    const { equipmentId, customerId, startDate, endDate } = req.body;

    const errors = _validateRentalData(req.body);
    // ── END DATE > START DATE: rental return must be after pickup date ──
    // End date must be after start date
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      errors.push('End date must be after the start date.');
    }
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // ── EQUIPMENT DOUBLE-BOOKING PREVENTION ──
    // Queries for overlapping date ranges on the same equipment
    // Only checks Pending/Active rentals (Returned/Cancelled don't block)
    // Check for overlapping rentals (prevent double-booking)
    const conflict = await Rental.findOne({
      equipmentId,
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) },
      status: { $in: ['Pending', 'Active'] },
    });

    if (conflict) {
      return res.status(400).json({ success: false, message: 'Equipment is already booked for the selected dates' });
    }

    // ── EQUIPMENT EXISTENCE & AVAILABILITY CHECK ──
    // Rejects rental if equipment doesn't exist or is under maintenance
    // Verify equipment exists and is available
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }
    if (equipment.availability === 'Under Maintenance') {
      return res.status(400).json({ success: false, message: 'Equipment is under maintenance and cannot be rented' });
    }

    const rental = await Rental.create(req.body);

    // ── Auto-update equipment availability to 'Rented' after successful creation ──
    // Auto-update equipment availability to 'Rented'
    await Equipment.findByIdAndUpdate(equipmentId, { availability: 'Rented' });

    res.status(201).json({ success: true, message: 'Rental created', data: rental });
  } catch (error) { next(error); }
};

exports.updateRental = async (req, res, next) => {
  try {
    const existingRental = await Rental.findById(req.params.id);
    if (!existingRental) return res.status(404).json({ success: false, message: 'Rental not found' });

    const { equipmentId, startDate, endDate, status } = req.body;
    const finalEquipmentId = equipmentId || existingRental.equipmentId;
    const finalStartDate = startDate ? new Date(startDate) : existingRental.startDate;
    const finalEndDate = endDate ? new Date(endDate) : existingRental.endDate;

    const errors = _validateRentalData(req.body, true);
    // ── FINAL-VALUE END > START CHECK (after merging body with existing DB record) ──
    // When only startDate or endDate is in the body, the other comes from the
    // existing DB record. We compare the FINAL effective values to catch
    // partial updates that would create invalid date ranges.
    // Final effective end date must be after the final effective start date
    if (finalEndDate <= finalStartDate) {
      errors.push('End date must be after the start date.');
    }
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // ── OVERLAP DETECTION when dates or equipment change (excluding current rental) ──
    // Uses _id: { $ne: req.params.id } to exclude the current rental from the query
    // Overlap detection when dates or equipment change (exclude current rental)
    if (equipmentId || startDate || endDate) {
      const conflict = await Rental.findOne({
        equipmentId: finalEquipmentId,
        _id: { $ne: req.params.id },
        startDate: { $lte: finalEndDate },
        endDate: { $gte: finalStartDate },
        status: { $in: ['Pending', 'Active'] },
      });

      if (conflict) {
        return res.status(400).json({ success: false, message: 'Equipment is already booked for the selected dates' });
      }
    }

    const updatedRental = await Rental.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    const oldStatus = existingRental.status;
    const newStatus = updatedRental.status;
    const newEquipmentId = updatedRental.equipmentId.toString();
    const oldEquipmentId = existingRental.equipmentId.toString();

    // ── EQUIPMENT AVAILABILITY AUTO-MANAGEMENT based on status change ──
    // Handle equipment availability based on status change
    if (oldStatus !== newStatus || equipmentId) {
      if (newStatus === 'Returned' || newStatus === 'Cancelled') {
        // Rental ended → mark equipment as Available
        await Equipment.findByIdAndUpdate(newEquipmentId, { availability: 'Available' });
        // If equipment was changed, also restore the old equipment
        if (equipmentId && oldEquipmentId !== newEquipmentId) {
          await Equipment.findByIdAndUpdate(oldEquipmentId, { availability: 'Available' });
        }
      } else if (newStatus === 'Active' || newStatus === 'Pending') {
        // Rental is active/pending → mark equipment as Rented
        await Equipment.findByIdAndUpdate(newEquipmentId, { availability: 'Rented' });
        // If equipment was changed and old one was different, restore old equipment
        if (equipmentId && oldEquipmentId !== newEquipmentId && oldStatus !== 'Returned' && oldStatus !== 'Cancelled') {
          await Equipment.findByIdAndUpdate(oldEquipmentId, { availability: 'Available' });
        }
      }
    }

    res.json({ success: true, message: 'Rental updated', data: updatedRental });
  } catch (error) { next(error); }
};

exports.deleteRental = async (req, res, next) => {
  try {
    const rental = await Rental.findByIdAndDelete(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

    // ── If deleting an active/pending rental, restore equipment availability to 'Available' ──
    // If deleting an active/pending rental, restore equipment availability
    if (rental.status === 'Active' || rental.status === 'Pending') {
      await Equipment.findByIdAndUpdate(rental.equipmentId, { availability: 'Available' });
    }

    res.json({ success: true, message: 'Rental deleted' });
  } catch (error) { next(error); }
};
