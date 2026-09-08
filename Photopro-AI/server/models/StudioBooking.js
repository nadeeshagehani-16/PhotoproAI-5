const mongoose = require('mongoose');

const studioBookingSchema = new mongoose.Schema(
  {
    studioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Studio', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    date: { type: Date, required: [true, 'Date is required'] },
    startTime: { type: String, required: [true, 'Start time is required'] },
    endTime: { type: String, required: [true, 'End time is required'] },
    purpose: { type: String, required: true, trim: true },
    totalCost: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
    paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for conflict detection
studioBookingSchema.index({ studioId: 1, date: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('StudioBooking', studioBookingSchema);
