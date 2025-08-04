const express = require('express');
const messageController = require('../controllers/messageController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Routes for regular users
router.get('/my-messages', messageController.getMyMessages);
router.get('/sent', messageController.getSentMessages);
router.get('/received', messageController.getReceivedMessages);
router.get('/stats', messageController.getMessageStats);
router.get('/unread-count', messageController.getUnreadCount);

// Create new message
router.post('/', messageController.createMessage);

// Create message from property detail page
router.post('/property', messageController.createPropertyMessage);

// Get, update, delete specific message (with permission checks)
router
  .route('/:id')
  .get(messageController.getMessage)
  .patch(messageController.updateMessage)
  .delete(messageController.deleteMessage);

// Message actions
router.patch('/:id/read', messageController.markAsRead);
router.patch('/:id/archive', messageController.toggleArchive);

// New enhanced routes
router.get('/search', messageController.searchMessages);
router.get('/thread/:threadId', messageController.getThreadMessages);
router.post('/:id/reply', messageController.replyToMessage);
router.patch('/mark-multiple-read', messageController.markMultipleAsRead);

// Admin/Employee only routes
router.use(authController.restrictTo('admin', 'employee'));

// Get all messages (admin/employee only) - sorted by creation date
router.get('/', messageController.getAdminEmployeeMessages);

// Bulk message and template routes (admin/employee only)
router.post('/bulk', messageController.sendBulkMessage);
router.get('/templates', messageController.getMessageTemplates);
router.post('/templates', messageController.createMessageTemplate);

// Admin analytics
router.get('/analytics', messageController.getMessageAnalytics);

module.exports = router;


