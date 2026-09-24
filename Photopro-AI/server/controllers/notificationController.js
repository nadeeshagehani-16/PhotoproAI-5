const Notification = require('../models/Notification');
const ServiceBooking = require('../models/ServiceBooking');
const StudioBooking = require('../models/StudioBooking');
const Studio = require('../models/Studio');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');

const TYPES = ['booking', 'payment', 'client', 'system'];

// ── Formatting helpers (ICU-independent, deterministic output) ──
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function _fmtDate(d) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return 'TBD';
  return MONTHS[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear();
}
function _fmtAmount(n) {
  return 'Rs. ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function _cname(c) { return (c && c.name) || 'A client'; }

// ── Seeding: when the collection is empty, derive real notifications from
// existing bookings, payments and clients so the page is useful immediately. ──
async function _seedIfEmpty() {
  const count = await Notification.countDocuments();
  if (count > 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [bookings, upcoming, studioBookings, payments, customers] = await Promise.all([
    ServiceBooking.find().sort('-createdAt').limit(4)
      .populate('customerId', 'name').populate('photographerId', 'name'),
    ServiceBooking.find({ date: { $gte: today }, status: { $in: ['Pending', 'Confirmed'] } })
      .sort('date').limit(4)
      .populate('customerId', 'name').populate('photographerId', 'name'),
    StudioBooking.find().sort('-createdAt').limit(3)
      .populate('studioId', 'name').populate('customerId', 'name'),
    Payment.find().sort('-createdAt').limit(6).populate('customerId', 'name'),
    Customer.find().sort('-createdAt').limit(3),
  ]);

  const docs = [];
  const push = (type, title, message, when, link) => {
    if (!title || !message) return;
    docs.push({
      type: TYPES.includes(type) ? type : 'system',
      title: String(title).slice(0, 100),
      message: String(message).slice(0, 500),
      link: link || '',
      isRead: false,
      createdAt: when || new Date(),
      updatedAt: when || new Date(),
    });
  };

  bookings.forEach(b => {
    push('booking', 'New booking received',
      `${_cname(b.customerId)} booked ${b.event} for ${_fmtDate(b.date)} at ${b.location || 'TBD'}.`,
      b.createdAt, 'bookings');
  });

  upcoming.forEach(b => {
    const withPhotographer = b.photographerId ? ` with ${b.photographerId.name}` : '';
    push('booking', 'Upcoming shoot',
      `${_cname(b.customerId)} — ${b.event}${withPhotographer} on ${_fmtDate(b.date)} at ${b.startTime}.`,
      b.createdAt, 'bookings');
  });

  studioBookings.forEach(b => {
    push('booking', 'New studio booking',
      `${_cname(b.customerId)} booked ${b.studioId ? b.studioId.name : 'a studio'} for ${_fmtDate(b.date)} (${b.startTime}–${b.endTime}) — ${b.purpose}.`,
      b.createdAt, 'studio-bookings');
  });

  payments.forEach(p => {
    const ref = p.referenceId ? ` (${p.referenceId})` : '';
    if (p.status === 'Pending') {
      push('payment', 'Payment pending',
        `${_cname(p.customerId)} owes ${_fmtAmount(p.amount)} for ${p.type}${ref}.`,
        p.createdAt, 'invoices');
    } else if (p.status === 'Completed') {
      push('payment', 'Payment received',
        `${_cname(p.customerId)} paid ${_fmtAmount(p.amount)} via ${p.method}${ref}.`,
        p.createdAt, 'invoices');
    }
  });

  customers.forEach(c => {
    push('client', 'New client registered', `${c.name} — ${c.email}.`, c.createdAt, 'clients');
  });

  if (docs.length) await Notification.collection.insertMany(docs);
}

// ── Route handlers ──

// @route   GET /api/notifications — list all notifications (newest first) + unread count
exports.getNotifications = async (req, res, next) => {
  try {
    // Seeding is best-effort: a failure must never break the listing
    try { await _seedIfEmpty(); } catch (e) { /* keep going with whatever exists */ }
    const list = await Notification.find().sort('-createdAt').limit(100);
    const unread = list.filter(n => !n.isRead).length;
    res.json({ success: true, data: list, unread });
  } catch (error) { next(error); }
};

// @route   POST /api/notifications — create a notification (used by client portal feedback etc.)
exports.createNotification = async (req, res, next) => {
  try {
    const { type, title, message, link } = req.body;
    const errors = [];
    if (!title || !String(title).trim()) errors.push('Title is required.');
    if (!message || !String(message).trim()) errors.push('Message is required.');
    if (title && String(title).trim().length > 100) errors.push('Title must be 100 characters or fewer.');
    if (message && String(message).trim().length > 500) errors.push('Message must be 500 characters or fewer.');
    if (type && !TYPES.includes(type)) errors.push('Type must be one of: ' + TYPES.join(', ') + '.');
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }
    const notification = await Notification.create({
      type: TYPES.includes(type) ? type : 'system',
      title: String(title).trim(),
      message: String(message).trim(),
      link: link ? String(link).trim() : '',
    });
    res.status(201).json({ success: true, message: 'Notification created', data: notification });
  } catch (error) { next(error); }
};

// @route   PUT /api/notifications/read-all — mark every notification as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.json({ success: true, message: 'All notifications marked as read', data: { updated: result.modifiedCount || 0 } });
  } catch (error) { next(error); }
};

// @route   PUT /api/notifications/:id/read — mark one notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, { $set: { isRead: true } }, { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification marked as read', data: notification });
  } catch (error) { next(error); }
};

// @route   DELETE /api/notifications/:id — delete one notification
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) { next(error); }
};

// ── Non-blocking hooks used by other controllers after successful creates.
// Each resolves silently on failure so notifications can never break a parent request. ──

exports.notifyNewServiceBooking = async (booking) => {
  try {
    const client = await Customer.findById(booking.customerId).select('name');
    await Notification.create({
      type: 'booking',
      title: 'New booking received',
      message: `${_cname(client)} booked ${booking.event} for ${_fmtDate(booking.date)} at ${booking.location || 'TBD'}.`,
      link: 'bookings',
    });
  } catch (e) { /* non-blocking */ }
};

exports.notifyNewStudioBooking = async (booking) => {
  try {
    const [studio, client] = await Promise.all([
      Studio.findById(booking.studioId).select('name'),
      Customer.findById(booking.customerId).select('name'),
    ]);
    await Notification.create({
      type: 'booking',
      title: 'New studio booking',
      message: `${_cname(client)} booked ${studio ? studio.name : 'a studio'} for ${_fmtDate(booking.date)} (${booking.startTime}–${booking.endTime}) — ${booking.purpose}.`,
      link: 'studio-bookings',
    });
  } catch (e) { /* non-blocking */ }
};

exports.notifyNewPayment = async (payment) => {
  try {
    const client = await Customer.findById(payment.customerId).select('name');
    await Notification.create({
      type: 'payment',
      title: payment.status === 'Pending' ? 'Payment pending' : 'Payment received',
      message: `${_cname(client)} — ${_fmtAmount(payment.amount)} via ${payment.method} (${payment.status}${payment.referenceId ? ', ' + payment.referenceId : ''}).`,
      link: 'invoices',
    });
  } catch (e) { /* non-blocking */ }
};

exports.notifyNewCustomer = async (customer) => {
  try {
    await Notification.create({
      type: 'client',
      title: 'New client registered',
      message: `${customer.name} — ${customer.email}.`,
      link: 'clients',
    });
  } catch (e) { /* non-blocking */ }
};
