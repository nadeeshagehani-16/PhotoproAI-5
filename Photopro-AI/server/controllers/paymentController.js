const Payment = require('../models/Payment');
const mongoose = require('mongoose');

// ── Allowed payment methods ──
const METHODS = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Online'];
// ── Allowed payment types ──
const TYPES = ['Booking', 'Rental', 'Studio', 'Package', 'Other'];
// ── Allowed payment statuses ──
const STATUSES = ['Pending', 'Completed', 'Failed', 'Refunded'];

// ── Shared validation helper for payment data ──
/**
 * Validate payment data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validatePaymentData(body, isUpdate = false) {
  const errors = [];
  const { customerId, amount, method, type, status, date, referenceId, transactionRef, notes } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  if (!isUpdate) {
    if (!customerId) errors.push('Client is required.');
    if (amount === undefined || amount === null || amount === '') errors.push('Amount is required.');
    if (!method) errors.push('Payment method is required.');
    if (!type) errors.push('Payment type is required.');
  }

  // ── OBJECTID FORMAT: customerId via mongoose.Types.ObjectId.isValid() ──
  // Validate ObjectId format
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
    errors.push('Invalid client ID format.');
  }

  // ── AMOUNT: must be a valid number, cannot be negative ──
  // Amount must be a valid non-negative number
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a)) errors.push('Amount must be a valid number.');
    else if (a < 0) errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
  }

  // ── PAYMENT METHOD ENUM: Credit Card, Debit Card, Bank Transfer, Cash, Online ──
  // Enum validations
  if (method && !METHODS.includes(method)) {
    errors.push('Invalid payment method. Allowed: ' + METHODS.join(', ') + '.');
  }
  if (type && !TYPES.includes(type)) {
    errors.push('Invalid payment type. Allowed: ' + TYPES.join(', ') + '.');
  }
  if (status && !STATUSES.includes(status)) {
    errors.push('Invalid payment status. Allowed: ' + STATUSES.join(', ') + '.');
  }

  // ── DATE VALIDATION: past-date rejection ──
  // User-entered payment dates must be today or future.
  // Historical records already stored in the database are not rewritten.
  // User-entered payment date must be today or future (yyyy-MM-dd comparison).
  // Historical records already stored in the database are not rewritten.
  if (date !== undefined && date !== null && date !== '') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      errors.push('Please enter a valid payment date.');
    } else {
      const dateStr = new Date(date).toISOString().split('T')[0];
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      if (dateStr < todayStr) {
        errors.push('Date cannot be in the past. Please select today or a future date.');
      }
    }
  }

  // ── STRING LENGTH GUARDS: referenceId (50), transactionRef (100), notes (500) ──
  // String length guards
  if (referenceId && String(referenceId).length > 50) errors.push('Reference ID must be 50 characters or fewer.');
  if (transactionRef && String(transactionRef).length > 100) errors.push('Transaction reference must be 100 characters or fewer.');
  if (notes && String(notes).length > 500) errors.push('Notes must be 500 characters or fewer.');

  return errors;
}

// @route   GET /api/payments — list all payments (with customer name/email populated)
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find().populate('customerId', 'name email');
    res.json({ success: true, data: payments });
  } catch (error) { next(error); }
};

// @route   GET /api/payments/:id — get single payment by ID
exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('customerId', 'name email');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
};

// @route   POST /api/payments — create new payment
exports.createPayment = async (req, res, next) => {
  try {
    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const validationErrors = _validatePaymentData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    const payment = await Payment.create(req.body);
    res.status(201).json({ success: true, message: 'Payment created successfully', data: payment });
  } catch (error) { next(error); }
};

// @route   PUT /api/payments/:id — update existing payment
exports.updatePayment = async (req, res, next) => {
  try {
    const existing = await Payment.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Payment not found' });

    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const validationErrors = _validatePaymentData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Payment updated successfully', data: payment });
  } catch (error) { next(error); }
};

// @route   DELETE /api/payments/:id — delete a payment
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) { next(error); }
};
