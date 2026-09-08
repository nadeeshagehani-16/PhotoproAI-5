const Deposit = require('../models/Deposit');

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
    const deposit = await Deposit.create(req.body);
    res.status(201).json({ success: true, message: 'Deposit recorded', data: deposit });
  } catch (error) { next(error); }
};

exports.updateDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    res.json({ success: true, message: 'Deposit updated', data: deposit });
  } catch (error) { next(error); }
};

exports.deleteDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findByIdAndDelete(req.params.id);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
    res.json({ success: true, message: 'Deposit deleted' });
  } catch (error) { next(error); }
};
