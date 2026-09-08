const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: { type: Date, required: [true, 'End date is required'] },
    totalCost: { type: Number, required: true },
    securityDeposit: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Active', 'Returned', 'Overdue', 'Cancelled'], default: 'Pending' },
    paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
    notes: { type: String, default: '' },
    returnDate: { type: Date },
  },
  { timestamps: true }
);

// Index for conflict detection
rentalSchema.index({ equipmentId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Rental', rentalSchema);
