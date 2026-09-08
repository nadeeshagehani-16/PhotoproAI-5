const express = require('express');
const router = express.Router();
const { getServiceBookings, getServiceBooking, createServiceBooking, updateServiceBooking, deleteServiceBooking } = require('../controllers/serviceBookingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getServiceBookings).post(authorize('Admin', 'Staff'), createServiceBooking);
router.route('/:id').get(getServiceBooking).put(authorize('Admin', 'Staff'), updateServiceBooking).delete(authorize('Admin'), deleteServiceBooking);

module.exports = router;
