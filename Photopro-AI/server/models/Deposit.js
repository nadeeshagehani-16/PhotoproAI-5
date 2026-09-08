const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
    amount: { type: Number, required: [true, 'Amount is required'] },
    purpose: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Held', 'Refunded', 'Forfeited'], default: 'Held' },
    refundAmount: { type: Number, default: 0 },
    refundDate: { type: Date },
    paymentMethod: { type: String, enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Online'], required: true },
    transactionRef: { type: String, trim: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deposit', depositSchema);
