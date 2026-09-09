const Rental = require('../models/Rental');
const Equipment = require('../models/Equipment');

exports.getRentals = async (req, res, next) => {
  try {
    const rentals = await Rental.find().populate('customerId', 'name email').populate('equipmentId', 'name category brand');
    res.json({ success: true, data: rentals });
  } catch (error) { next(error); }
};

exports.getRental = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id).populate('customerId', 'name email').populate('equipmentId', 'name category brand');
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    res.json({ success: true, data: rental });
  } catch (error) { next(error); }
};

exports.createRental = async (req, res, next) => {
  try {
    const { equipmentId, startDate, endDate } = req.body;

    // Check for overlapping rentals (prevent double-booking)
    const conflict = await Rental.findOne({
      equipmentId,
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) },
      status: { $in: ['Pending', 'Active'] },
    });

    if (conflict) {
      return res.status(400).json({ success: false, message: 'Equipment is already booked for the selected dates' });
    }

    // Verify equipment exists and is available
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }
    if (equipment.availability === 'Under Maintenance') {
      return res.status(400).json({ success: false, message: 'Equipment is under maintenance and cannot be rented' });
    }

    const rental = await Rental.create(req.body);

    // Auto-update equipment availability to 'Rented'
    await Equipment.findByIdAndUpdate(equipmentId, { availability: 'Rented' });

    res.status(201).json({ success: true, message: 'Rental created', data: rental });
  } catch (error) { next(error); }
};

exports.updateRental = async (req, res, next) => {
  try {
    const existingRental = await Rental.findById(req.params.id);
    if (!existingRental) return res.status(404).json({ success: false, message: 'Rental not found' });

    const { equipmentId, startDate, endDate, status } = req.body;
    const finalEquipmentId = equipmentId || existingRental.equipmentId;
    const finalStartDate = startDate ? new Date(startDate) : existingRental.startDate;
    const finalEndDate = endDate ? new Date(endDate) : existingRental.endDate;

    // Overlap detection when dates or equipment change (exclude current rental)
    if (equipmentId || startDate || endDate) {
      const conflict = await Rental.findOne({
        equipmentId: finalEquipmentId,
        _id: { $ne: req.params.id },
        startDate: { $lte: finalEndDate },
        endDate: { $gte: finalStartDate },
        status: { $in: ['Pending', 'Active'] },
      });

      if (conflict) {
        return res.status(400).json({ success: false, message: 'Equipment is already booked for the selected dates' });
      }
    }

    const updatedRental = await Rental.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    const oldStatus = existingRental.status;
    const newStatus = updatedRental.status;
    const newEquipmentId = updatedRental.equipmentId.toString();
    const oldEquipmentId = existingRental.equipmentId.toString();

    // Handle equipment availability based on status change
    if (oldStatus !== newStatus || equipmentId) {
      if (newStatus === 'Returned' || newStatus === 'Cancelled') {
        // Rental ended → mark equipment as Available
        await Equipment.findByIdAndUpdate(newEquipmentId, { availability: 'Available' });
        // If equipment was changed, also restore the old equipment
        if (equipmentId && oldEquipmentId !== newEquipmentId) {
          await Equipment.findByIdAndUpdate(oldEquipmentId, { availability: 'Available' });
        }
      } else if (newStatus === 'Active' || newStatus === 'Pending') {
        // Rental is active/pending → mark equipment as Rented
        await Equipment.findByIdAndUpdate(newEquipmentId, { availability: 'Rented' });
        // If equipment was changed and old one was different, restore old equipment
        if (equipmentId && oldEquipmentId !== newEquipmentId && oldStatus !== 'Returned' && oldStatus !== 'Cancelled') {
          await Equipment.findByIdAndUpdate(oldEquipmentId, { availability: 'Available' });
        }
      }
    }

    res.json({ success: true, message: 'Rental updated', data: updatedRental });
  } catch (error) { next(error); }
};

exports.deleteRental = async (req, res, next) => {
  try {
    const rental = await Rental.findByIdAndDelete(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

    // If deleting an active/pending rental, restore equipment availability
    if (rental.status === 'Active' || rental.status === 'Pending') {
      await Equipment.findByIdAndUpdate(rental.equipmentId, { availability: 'Available' });
    }

    res.json({ success: true, message: 'Rental deleted' });
  } catch (error) { next(error); }
};
