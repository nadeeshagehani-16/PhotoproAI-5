const express = require('express');
const router = express.Router();
const { getServiceBookings, getServiceBooking, createServiceBooking, updateServiceBooking, deleteServiceBooking } = require('../controllers/serviceBookingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getServiceBookings).post(createServiceBooking);
router.route('/:id').get(getServiceBooking).put(updateServiceBooking).delete(deleteServiceBooking);

module.exports = router;
