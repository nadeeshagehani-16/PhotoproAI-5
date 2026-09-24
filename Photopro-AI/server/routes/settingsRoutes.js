const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingsController');

// @route   GET /api/settings — get studio settings (defaults created on first call)
router.get('/', protect, getSettings);

// @route   PUT /api/settings — save studio settings
router.put('/', protect, updateSettings);

module.exports = router;
