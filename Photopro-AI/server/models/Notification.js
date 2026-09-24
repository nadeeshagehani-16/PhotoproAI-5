const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['booking', 'payment', 'client', 'system'], default: 'system' },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    message: { type: String, required: [true, 'Message is required'], trim: true, maxlength: 500 },
    // SPA page id to open when the notification is clicked (e.g. 'bookings', 'invoices')
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fast unread-first listing
notificationSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
