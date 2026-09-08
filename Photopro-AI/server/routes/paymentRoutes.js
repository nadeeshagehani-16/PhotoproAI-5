const express = require('express');
const router = express.Router();
const { getPayments, getPayment, createPayment, updatePayment, deletePayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getPayments).post(authorize('Admin', 'Staff'), createPayment);
router.route('/:id').get(getPayment).put(authorize('Admin'), updatePayment).delete(authorize('Admin'), deletePayment);

module.exports = router;
