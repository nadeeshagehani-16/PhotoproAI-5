const express = require('express');
const router = express.Router();
const { getRentals, getRental, createRental, updateRental, deleteRental } = require('../controllers/rentalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getRentals).post(authorize('Admin', 'Staff'), createRental);
router.route('/:id').get(getRental).put(authorize('Admin', 'Staff'), updateRental).delete(authorize('Admin'), deleteRental);

module.exports = router;
