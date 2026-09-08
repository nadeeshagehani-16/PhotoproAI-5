const express = require('express');
const router = express.Router();
const { getPackages, getPackage, createPackage, updatePackage, deletePackage } = require('../controllers/packageController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getPackages).post(authorize('Admin', 'Staff'), createPackage);
router.route('/:id').get(getPackage).put(authorize('Admin', 'Staff'), updatePackage).delete(authorize('Admin'), deletePackage);

module.exports = router;
