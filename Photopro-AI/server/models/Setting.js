const mongoose = require('mongoose');

// Singleton-style document: the app reads/writes the first Setting record
// (created with defaults on first GET) — one global studio configuration.
const settingSchema = new mongoose.Schema(
  {
    // ── Studio Information tab ──
    studioName: { type: String, default: 'PhotoPro AI Studio', trim: true, maxlength: 100 },
    website: { type: String, default: '', trim: true, maxlength: 200 },
    address: { type: String, default: '', trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 1000 },
    // ── Notification Preferences tab ──
    notifications: {
      newBookings: { type: Boolean, default: true },
      paymentReceived: { type: Boolean, default: true },
      paymentOverdue: { type: Boolean, default: true },
      clientMessages: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: true },
      aiComplete: { type: Boolean, default: true },
      teamNotifications: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: false },
    },
    // ── Payments tab ──
    payments: {
      currency: { type: String, default: 'Rs.', trim: true, maxlength: 10 },
      invoicePrefix: { type: String, default: 'INV-', trim: true, maxlength: 10 },
      dueDays: { type: Number, default: 14, min: 0, max: 365 },
    },
    // ── AI Settings tab ──
    ai: {
      enhancementLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
      autoSaveEdits: { type: Boolean, default: true },
      outputFormat: { type: String, enum: ['JPEG (High Quality)', 'PNG', 'TIFF'], default: 'JPEG (High Quality)' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
