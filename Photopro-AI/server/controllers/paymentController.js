const Payment = require('../models/Payment');

exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find().populate('customerId', 'name email');
    res.json({ success: true, data: payments });
  } catch (error) { next(error); }
};

exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('customerId', 'name email');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
};

exports.createPayment = async (req, res, next) => {
  try {
    const payment = await Payment.create(req.body);
    res.status(201).json({ success: true, message: 'Payment recorded', data: payment });
  } catch (error) { next(error); }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, message: 'Payment updated', data: payment });
  } catch (error) { next(error); }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, message: 'Payment deleted' });
  } catch (error) { next(error); }
};
