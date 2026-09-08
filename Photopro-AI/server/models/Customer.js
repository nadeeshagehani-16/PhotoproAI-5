const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    address: { type: String, trim: true },
    avatar: { type: String, default: '' },
    notes: { type: String, default: '' },
    bookings: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    lastBooking: { type: Date },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
