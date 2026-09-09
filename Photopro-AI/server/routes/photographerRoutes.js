const express = require('express');
const router = express.Router();
const { getPhotographers, getPhotographer, createPhotographer, updatePhotographer, deletePhotographer } = require('../controllers/photographerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getPhotographers).post(createPhotographer);
router.route('/:id').get(getPhotographer).put(updatePhotographer).delete(deletePhotographer);

module.exports = router;
