const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Package name is required'], trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: [true, 'Price is required'] },
    duration: { type: String, required: true },
    photos: { type: Number, default: 0 },
    photographers: { type: Number, default: 1 },
    features: [{ type: String }],
    popular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema);
