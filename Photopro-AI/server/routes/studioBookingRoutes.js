const express = require('express');
const router = express.Router();
const { getStudioBookings, getStudioBooking, createStudioBooking, updateStudioBooking, deleteStudioBooking } = require('../controllers/studioBookingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getStudioBookings).post(authorize('Admin', 'Staff'), createStudioBooking);
router.route('/:id').get(getStudioBooking).put(authorize('Admin', 'Staff'), updateStudioBooking).delete(authorize('Admin'), deleteStudioBooking);

module.exports = router;
