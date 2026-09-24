const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  createNotification,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

// @route   GET /api/notifications — list all notifications + unread count
router.get('/', protect, getNotifications);

// @route   POST /api/notifications — create a notification
router.post('/', protect, createNotification);

// @route   PUT /api/notifications/read-all — mark all as read
router.put('/read-all', protect, markAllAsRead);

// @route   PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', protect, markAsRead);

// @route   DELETE /api/notifications/:id — delete one notification
router.delete('/:id', protect, deleteNotification);

module.exports = router;
