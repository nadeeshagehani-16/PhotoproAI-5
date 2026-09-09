const express = require('express');
const router = express.Router();
const { getStudios, getStudio, createStudio, updateStudio, deleteStudio } = require('../controllers/studioController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getStudios).post(createStudio);
router.route('/:id').get(getStudio).put(updateStudio).delete(deleteStudio);

module.exports = router;
