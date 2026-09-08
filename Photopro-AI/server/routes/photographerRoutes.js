const express = require('express');
const router = express.Router();
const { getPhotographers, getPhotographer, createPhotographer, updatePhotographer, deletePhotographer } = require('../controllers/photographerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getPhotographers).post(authorize('Admin'), createPhotographer);
router.route('/:id').get(getPhotographer).put(authorize('Admin'), updatePhotographer).delete(authorize('Admin'), deletePhotographer);

module.exports = router;
