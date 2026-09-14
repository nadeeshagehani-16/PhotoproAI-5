const Customer = require('../models/Customer');

const STATUSES = ['Active', 'Inactive'];
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^\+?\d{7,15}$/;

function _validateCustomerData(body, isUpdate = false) {
  const errors = [];
  const { name, email, phone, address, notes, status, bookings, spent } = body;

  if (!isUpdate) {
    if (!name || !String(name).trim()) errors.push('Name is required.');
    if (!email || !String(email).trim()) errors.push('Email is required.');
    if (!phone || !String(phone).trim()) errors.push('Phone is required.');
  }
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100) errors.push('Name must be between 2 and 100 characters.');
  }
  if (email !== undefined && email !== null && email !== '') {
    if (!EMAIL_RE.test(String(email).trim().toLowerCase())) {
      errors.push('Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).');
    }
  }
  if (phone !== undefined && phone !== null && phone !== '') {
    const p = String(phone).replace(/[\s\-().]/g, '');
    if (!PHONE_RE.test(p)) errors.push('Phone must be 7-15 digits, optionally starting with +.');
  }
  if (address !== undefined && address !== null && String(address).trim().length > 200) {
    errors.push('Address cannot exceed 200 characters.');
  }
  if (notes !== undefined && notes !== null && String(notes).length > 1000) {
    errors.push('Notes cannot exceed 1000 characters.');
  }
  if (status !== undefined && status !== null && status !== '' && !STATUSES.includes(status)) {
    errors.push('Status must be Active or Inactive.');
  }
  if (bookings !== undefined && bookings !== null && bookings !== '') {
    const b = Number(bookings);
    if (Number.isNaN(b) || b < 0) errors.push('Bookings cannot be negative.');
  }
  if (spent !== undefined && spent !== null && spent !== '') {
    const s = Number(spent);
    if (Number.isNaN(s) || s < 0) errors.push('Spent amount cannot be negative.');
  }
  return errors;
}

exports.getCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find();
    res.json({ success: true, data: customers });
  } catch (error) { next(error); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const errors = _validateCustomerData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    const email = String(req.body.email).trim().toLowerCase();
    const dup = await Customer.findOne({ email });
    if (dup) {
      return res.status(400).json({ success: false, message: 'A customer with this email already exists.' });
    }
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, message: 'Customer created', data: customer });
  } catch (error) { next(error); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const errors = _validateCustomerData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    if (req.body.email !== undefined && req.body.email !== null && req.body.email !== '') {
      const email = String(req.body.email).trim().toLowerCase();
      const dup = await Customer.findOne({ email, _id: { $ne: req.params.id } });
      if (dup) {
        return res.status(400).json({ success: false, message: 'A customer with this email already exists.' });
      }
    }
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer updated', data: customer });
  } catch (error) { next(error); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) { next(error); }
};
