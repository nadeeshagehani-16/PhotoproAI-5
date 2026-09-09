const express = require('express');
const router = express.Router();
const { getRentals, getRental, createRental, updateRental, deleteRental } = require('../controllers/rentalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getRentals).post(createRental);
router.route('/:id').get(getRental).put(updateRental).delete(deleteRental);

module.exports = router;
