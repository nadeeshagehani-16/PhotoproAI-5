const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Equipment name is required'], trim: true },
    category: { type: String, enum: ['Camera', 'Lens', 'Lighting', 'Tripod', 'Audio', 'Accessory'], required: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    pricePerDay: { type: Number, required: [true, 'Price per day is required'] },
    condition: { type: String, enum: ['New', 'Good', 'Fair', 'Needs Repair'], default: 'Good' },
    availability: { type: String, enum: ['Available', 'Rented', 'Under Maintenance'], default: 'Available' },
    image: { type: String, default: '' },
    specifications: { type: String, default: '' },
    serialNumber: { type: String, trim: true },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Equipment', equipmentSchema);
