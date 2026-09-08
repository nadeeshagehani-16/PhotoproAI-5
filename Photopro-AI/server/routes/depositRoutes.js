const express = require('express');
const router = express.Router();
const { getDeposits, getDeposit, createDeposit, updateDeposit, deleteDeposit } = require('../controllers/depositController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getDeposits).post(authorize('Admin', 'Staff'), createDeposit);
router.route('/:id').get(getDeposit).put(authorize('Admin'), updateDeposit).delete(authorize('Admin'), deleteDeposit);

module.exports = router;
