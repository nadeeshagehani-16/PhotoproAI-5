const mongoose = require('mongoose');

const photographerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    specialization: { type: String, required: true, trim: true },
    role: { type: String, default: 'Photographer' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    availability: { type: String, enum: ['Available', 'On Assignment', 'On Leave'], default: 'Available' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    projects: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Photographer', photographerSchema);
