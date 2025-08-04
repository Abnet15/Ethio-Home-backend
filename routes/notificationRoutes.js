const express = require('express');
const notificationController = require('./../controllers/notificationController');
const authController = require('./../controllers/authController');

const router = express.Router();

// All routes require authentication
router.use(authController.protect);

// Get user's notifications
router.get('/', notificationController.getUserNotifications);

// Get notification statistics
router.get('/stats', notificationController.getUserNotificationStats);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark notification as read
router.patch('/:id/read', notificationController.markNotificationAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllNotificationsAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

