const express = require('express');
const router = express.Router();
const { getPayments, getPayment, createPayment, updatePayment, deletePayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getPayments).post(createPayment);
router.route('/:id').get(getPayment).put(updatePayment).delete(deletePayment);

module.exports = router;
