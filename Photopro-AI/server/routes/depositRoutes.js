const express = require('express');
const router = express.Router();
const { getDeposits, getDeposit, createDeposit, updateDeposit, deleteDeposit } = require('../controllers/depositController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getDeposits).post(createDeposit);
router.route('/:id').get(getDeposit).put(updateDeposit).delete(deleteDeposit);

module.exports = router;
