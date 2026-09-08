const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// @route   GET /api/notifications
router.get('/', protect, (req, res) => {
  // TODO: Implement notifications
  res.json({ success: true, message: 'Notifications - to be implemented', data: [] });
});

module.exports = router;
