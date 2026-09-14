const Deposit = require('../models/Deposit');
const mongoose = require('mongoose');

const STATUSES = ['Held', 'Refunded', 'Forfeited'];
const METHODS = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Online'];

// ── Shared validation helper ──
function _validateDepositData(body, isUpdate = false) {
  const errors = [];
  const { customerId, rentalId, amount, purpose, status, paymentMethod, refundAmount, refundDate, transactionRef, notes } = body;

  // Required fields on create
  if (!isUpdate) {
    if (!customerId) errors.push('Client is required.');
    if (amount === undefined || amount === null || amount === '') errors.push('Amount is required.');
    if (!purpose || !purpose.trim()) errors.push('Purpose is required.');
    if (!paymentMethod) errors.push('Payment method is required.');
  }

  // Validate ObjectId formats
  if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
    errors.push('Invalid client ID format.');
  }
  if (rentalId && !mongoose.Types.ObjectId.isValid(rentalId)) {
    errors.push('Invalid rental ID format.');
  }

  // Deposit amount must be a valid non-negative number
  if (amount !== undefined && amount !== null && amount !== '') {
    const a = parseFloat(amount);
    if (isNaN(a)) errors.push('Amount must be a valid number.');
    else if (a < 0) errors.push('Amount cannot be negative. Please enter 0 or a positive value.');
  }

  // Refund amount must be a valid non-negative number
  if (refundAmount !== undefined && refundAmount !== null && refundAmount !== '') {
    const r = parseFloat(refundAmount);
    if (isNaN(r)) errors.push('Refund amount must be a valid number.');
    else if (r < 0) errors.push('Refund amount cannot be negative.');
  }

  // Enum validations
  if (status && !STATUSES.includes(status)) {
    errors.push('Invalid deposit status. Allowed: ' + STATUSES.join(', ') + '.');
  }
  if (paymentMethod && !METHODS.includes(paymentMethod)) {
    errors.push('Invalid payment method. Allowed: ' + METHODS.join(', ') + '.');
  }

  // Refund date is a transaction record; only validate the format
  if (refundDate !== undefined && refundDate !== null && refundDate !== '') {
    if (isNaN(new Date(refundDate).getTime())) {
      errors.push('Please enter a valid refund date.');
    }
  }

  // String length guards
  if (transactionRef && String(transactionRef).length > 100) errors.push('Transaction reference must be 100 characters or fewer.');
  if (notes && String(notes).length > 500) errors.push('Notes must be 500 characters or fewer.');

  return errors;
}

exports.getDeposits = async (req, res, next) => {
  try {
    const deposits = await Deposit.find().populate('customerId', 'name email').populate('rentalId');
    res.json({ success: true, data: deposits });
  } catch (error) { next(error); }
};

exports.getDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findById(req.params.id).populate('customerId', 'name email').populate('rentalId');
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    res.json({ success: true, data: deposit });
  } catch (error) { next(error); }
};

exports.createDeposit = async (req, res, next) => {
  try {
    const validationErrors = _validateDepositData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    const deposit = await Deposit.create(req.body);
    res.status(201).json({ success: true, message: 'Deposit created successfully', data: deposit });
  } catch (error) { next(error); }
};

exports.updateDeposit = async (req, res, next) => {
  try {
    const existing = await Deposit.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Deposit not found' });

    const validationErrors = _validateDepositData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(' ') });
    }

    // Refund amount cannot exceed the deposit amount
    const finalAmount = req.body.amount !== undefined && req.body.amount !== '' ? parseFloat(req.body.amount) : existing.amount;
    const refund = req.body.refundAmount !== undefined && req.body.refundAmount !== null && req.body.refundAmount !== '' ? parseFloat(req.body.refundAmount) : existing.refundAmount;
    if (refund > finalAmount) {
      return res.status(400).json({ success: false, message: 'Refund amount cannot exceed the deposit amount.' });
    }

    // A refund happening now is a transaction record: stamp it with the
    // current date when the caller does not provide one.
    if (req.body.status === 'Refunded' && !req.body.refundDate && !existing.refundDate) {
      req.body.refundDate = new Date();
    }

    const deposit = await Deposit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Deposit updated successfully', data: deposit });
  } catch (error) { next(error); }
};

exports.deleteDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findByIdAndDelete(req.params.id);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    res.json({ success: true, message: 'Deposit deleted successfully' });
  } catch (error) { next(error); }
};
