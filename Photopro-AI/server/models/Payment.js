const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: [true, 'Amount is required'] },
    method: { type: String, enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Online'], required: true },
    type: { type: String, enum: ['Booking', 'Rental', 'Studio', 'Package', 'Other'], required: true },
    referenceId: { type: String, trim: true },
    transactionRef: { type: String, trim: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed', 'Refunded'], default: 'Pending' },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
