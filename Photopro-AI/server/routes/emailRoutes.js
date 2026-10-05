const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getEmailStatus, sendTestEmail } = require('../controllers/emailController');

// @route   GET /api/email/status — SendGrid configuration status (protect only; never returns the API key)
router.get('/status', protect, getEmailStatus);

// @route   POST /api/email/test — send a test email via the SendGrid Mail Send API
router.post('/test', protect, sendTestEmail);

module.exports = router;
