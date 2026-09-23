const Deposit = require('../models/Deposit');
const mongoose = require('mongoose');

// ── Allowed deposit statuses ──
const STATUSES = ['Held', 'Refunded', 'Forfeited'];
// ── Allowed payment methods (same as payments) ──
const METHODS = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Online'];

// ── Shared validation helper for deposit data ──
/**
 * Validate deposit data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateDepositData(body, isUpdate = false) {
  const errors = [];
  const { customerId, rentalId, amount, purpose, status, paymentMethod, refundAmount, refundDate, transactionRef, notes } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  if (!isUpdate) {
    if (!customerId) errors.push('Client is required.');
    if (amount === undefined || amount === null || amount === '') errors.push('Amount is required.');
    if (!purpose || !purpose.trim()) errors.push('Purpose is required.');
    if (!paymentMethod) errors.push('Payment method is required.');
  }

  // ── OBJECTID FORMAT: customerId and rentalId ──
  // Validate ObjectId formats
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
    errors.push('Invalid client ID format.');
  }
  if (rentalId && !mongoose.Types.ObjectId.isValid(rentalId)) {
    errors.push('Invalid rental ID format.');
  }

  // ── DEPOSIT AMOUNT: must be a valid number, cannot be negative ──
  // Deposit amount must be a valid non-negative number
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a)) errors.push('Amount must be a valid number.');
    else if (a < 0) errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
  }

  // ── REFUND AMOUNT: must be a valid number, cannot be negative ──
  // Refund amount must be a valid non-negative number
  if (refundAmount !== undefined && refundAmount !== null && refundAmount !== '') {
    const r = parseFloat(refundAmount);
    if (isNaN(r)) errors.push('Refund amount must be a valid number.');
    else if (r < 0) errors.push('Refund amount cannot be negative.');
  }

  // ── STATUS ENUM: Held, Refunded, or Forfeited ──
  // ── PAYMENT METHOD ENUM: same as payment METHODS ──
  // Enum validations
  if (status && !STATUSES.includes(status)) {
    errors.push('Invalid deposit status. Allowed: ' + STATUSES.join(', ') + '.');
  }
  if (paymentMethod && !METHODS.includes(paymentMethod)) {
    errors.push('Invalid payment method. Allowed: ' + METHODS.join(', ') + '.');
  }

  // ── REFUND DATE: format validation only (transaction record, not user-scheduled) ──
  // Refund date is a transaction record; only validate the format
  if (refundDate !== undefined && refundDate !== null && refundDate !== '') {
    if (isNaN(new Date(refundDate).getTime())) {
      errors.push('Please enter a valid refund date.');
    }
  }

  // ── STRING LENGTH GUARDS: transactionRef (100), notes (500) ──
  // String length guards
  if (transactionRef && String(transactionRef).length > 100) errors.push('Transaction reference must be 100 characters or fewer.');
  if (notes && String(notes).length > 500) errors.push('Notes must be 500 characters or fewer.');

  return errors;
}

// @route   GET /api/deposits — list all deposits (with customer + rental populate)
exports.getDeposits = async (req, res, next) => {
  try {
    const deposits = await Deposit.find().populate('customerId', 'name email').populate('rentalId');
    res.json({ success: true, data: deposits });
  } catch (error) { next(error); }
};

// @route   GET /api/deposits/:id — get single deposit by ID
exports.getDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findById(req.params.id).populate('customerId', 'name email').populate('rentalId');
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    res.json({ success: true, data: deposit });
  } catch (error) { next(error); }
};

// @route   POST /api/deposits — create new deposit
exports.createDeposit = async (req, res, next) => {
  try {
    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const validationErrors = _validateDepositData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    const deposit = await Deposit.create(req.body);
    res.status(201).json({ success: true, message: 'Deposit created successfully', data: deposit });
  } catch (error) { next(error); }
};

// @route   PUT /api/deposits/:id — update existing deposit
exports.updateDeposit = async (req, res, next) => {
  try {
    const existing = await Deposit.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Deposit not found' });

    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const validationErrors = _validateDepositData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // ── REFUND AMOUNT CANNOT EXCEED DEPOSIT AMOUNT ──
    // Uses FINAL effective values (body or existing DB) to prevent over-refunding
    // Refund amount cannot exceed the deposit amount
    const finalAmount = req.body.amount !== undefined && req.body.amount !== '' ? parseFloat(req.body.amount) : existing.amount;
    const refund = req.body.refundAmount !== undefined && req.body.refundAmount !== null && req.body.refundAmount !== '' ? parseFloat(req.body.refundAmount) : existing.refundAmount;
    if (refund > finalAmount) {
      return res.status(400).json({ success: false, message: 'Refund amount cannot exceed the deposit amount.' });
    }

    // ── AUTO-STAMP REFUND DATE ──
    // When status changes to 'Refunded' and no refundDate is provided (and none
    // exists in the DB), automatically set it to the current date/time.
    // A refund happening now is a transaction record: stamp it with the
    // current date when the caller does not provide one.
    if (req.body.status === 'Refunded' && !req.body.refundDate && !existing.refundDate) {
      req.body.refundDate = new Date();
    }

    const deposit = await Deposit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Deposit updated successfully', data: deposit });
  } catch (error) { next(error); }
};

// @route   DELETE /api/deposits/:id — delete a deposit
exports.deleteDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findByIdAndDelete(req.params.id);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    res.json({ success: true, message: 'Deposit deleted successfully' });
  } catch (error) { next(error); }
};
