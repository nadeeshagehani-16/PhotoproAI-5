const Customer = require('../models/Customer');
const { notifyNewCustomer } = require('./notificationController');

// ── Allowed customer status values ──
const STATUSES = ['Active', 'Inactive'];

// ── Email regex: standard RFC-style, rejects special chars like # $ % ^ & * ──
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ── Phone regex: 7–15 digits, optional leading + for country code ──
const PHONE_RE = /^\+?\d{7,15}$/;

/**
 * Validate customer data before create or update.
 * @param {object} body      - req.body
 * @param {boolean} isUpdate - true for updates (skips required checks for absent fields)
 * @returns {string[]} array of error messages (empty = valid)
 */
function _validateCustomerData(body, isUpdate = false) {
  const errors = [];
  const { name, email, phone, address, notes, status, bookings, spent } = body;

  // ── REQUIRED FIELD CHECKS (only enforced on CREATE, not partial update) ──
  if (!isUpdate) {
    if (!name || !String(name).trim()) errors.push('Name is required.');
    if (!email || !String(email).trim()) errors.push('Email is required.');
    if (!phone || !String(phone).trim()) errors.push('Phone is required.');
  }

  // ── NAME LENGTH: must be between 2 and 100 characters after trimming ──
  if (name !== undefined && name !== null && name !== '') {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 100) errors.push('Name must be between 2 and 100 characters.');
  }

  // ── EMAIL FORMAT: regex match (case-insensitive); rejects # $ % ^ & * etc. ──
  if (email !== undefined && email !== null && email !== '') {
    if (!EMAIL_RE.test(String(email).trim().toLowerCase())) {
      errors.push('Email format is invalid. Use a valid address like name@example.com (characters such as # or $ are not allowed).');
    }
  }

  // ── PHONE FORMAT: strip spaces/dashes/parens/dots, then check 7–15 digit range ──
  if (phone !== undefined && phone !== null && phone !== '') {
    const p = String(phone).replace(/[\s\-().]/g, '');
    if (!PHONE_RE.test(p)) errors.push('Phone must be 7-15 digits, optionally starting with +.');
  }

  // ── ADDRESS LENGTH: max 200 characters ──
  if (address !== undefined && address !== null && String(address).trim().length > 200) {
    errors.push('Address cannot exceed 200 characters.');
  }

  // ── NOTES LENGTH: max 1000 characters ──
  if (notes !== undefined && notes !== null && String(notes).length > 1000) {
    errors.push('Notes cannot exceed 1000 characters.');
  }

  // ── STATUS ENUM: must be 'Active' or 'Inactive' ──
  if (status !== undefined && status !== null && status !== '' && !STATUSES.includes(status)) {
    errors.push('Status must be Active or Inactive.');
  }

  // ── BOOKINGS COUNT: cannot be negative (system-managed, but guarded against bad input) ──
  if (bookings !== undefined && bookings !== null && bookings !== '') {
    const b = Number(bookings);
    if (Number.isNaN(b) || b < 0) errors.push('Bookings cannot be negative.');
  }

  // ── SPENT AMOUNT: cannot be negative (system-managed, but guarded against bad input) ──
  if (spent !== undefined && spent !== null && spent !== '') {
    const s = Number(spent);
    if (Number.isNaN(s) || s < 0) errors.push('Spent amount cannot be negative.');
  }

  return errors;
}

// @route   GET /api/customers — list all customers
exports.getCustomers = async (req, res, next) => {
  try {
    const customers = await Customer.find();
    res.json({ success: true, data: customers });
  } catch (error) { next(error); }
};

// @route   GET /api/customers/:id — get single customer by ID
exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
};

// @route   POST /api/customers — create new customer
exports.createCustomer = async (req, res, next) => {
  try {
    // ── Run all validation rules; return 400 with joined error messages if any fail ──
    const errors = _validateCustomerData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // ── DUPLICATE EMAIL CHECK: reject if any customer already has this email ──
    const email = String(req.body.email).trim().toLowerCase();
    const dup = await Customer.findOne({ email });
    if (dup) {
      return res.status(400).json({ success: false, message: 'A customer with this email already exists.' });
    }
    const customer = await Customer.create(req.body);
    // Non-blocking notification for the new client
    notifyNewCustomer(customer).catch(() => {});
    res.status(201).json({ success: true, message: 'Customer created', data: customer });
  } catch (error) { next(error); }
};

// @route   PUT /api/customers/:id — update existing customer
exports.updateCustomer = async (req, res, next) => {
  try {
    // ── Run validation (isUpdate=true: only validates fields that are present in body) ──
    const errors = _validateCustomerData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // ── DUPLICATE EMAIL CHECK: reject if a DIFFERENT customer already has this email ──
    // Uses _id: { $ne: req.params.id } to exclude the current record from the query
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

// @route   DELETE /api/customers/:id — delete a customer
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) { next(error); }
};
