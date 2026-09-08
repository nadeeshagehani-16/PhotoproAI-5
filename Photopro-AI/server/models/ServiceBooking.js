const mongoose = require('mongoose');

const serviceBookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    photographerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Photographer' },
    event: { type: String, required: [true, 'Event type is required'], trim: true },
    date: { type: Date, required: [true, 'Date is required'] },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
    payment: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for conflict detection
serviceBookingSchema.index({ photographerId: 1, date: 1 });

module.exports = mongoose.model('ServiceBooking', serviceBookingSchema);
