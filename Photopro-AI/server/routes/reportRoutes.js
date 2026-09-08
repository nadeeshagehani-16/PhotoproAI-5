const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/reports
router.get('/', protect, authorize('Admin', 'Staff'), (req, res) => {
  // TODO: Implement reports aggregation from MongoDB
  res.json({ success: true, message: 'Reports - to be implemented', data: {} });
});

module.exports = router;
