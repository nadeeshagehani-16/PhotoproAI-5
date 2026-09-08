const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getCustomers).post(authorize('Admin', 'Staff'), createCustomer);
router.route('/:id').get(getCustomer).put(authorize('Admin', 'Staff'), updateCustomer).delete(authorize('Admin'), deleteCustomer);

module.exports = router;
