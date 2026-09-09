const express = require('express');
const router = express.Router();
const { getPackages, getPackage, createPackage, updatePackage, deletePackage } = require('../controllers/packageController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getPackages).post(createPackage);
router.route('/:id').get(getPackage).put(updatePackage).delete(deletePackage);

module.exports = router;
