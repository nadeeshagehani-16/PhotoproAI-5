const mongoose = require('mongoose');

const studioSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Studio name is required'], trim: true },
    location: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    pricePerHour: { type: Number, required: [true, 'Price per hour is required'] },
    amenities: [{ type: String }],
    equipment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
    image: { type: String, default: '' },
    availability: { type: String, enum: ['Available', 'Booked', 'Under Maintenance'], default: 'Available' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Studio', studioSchema);
