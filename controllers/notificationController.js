const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const NotificationService = require('./../services/notificationService');

// Get user's notifications
exports.getUserNotifications = catchAsync(async (req, res, next) => {
  const { limit = 50, skip = 0, unreadOnly = false } = req.query;
  
  const result = await NotificationService.getUserNotifications(
    req.user._id,
    {
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true'
    }
  );

  if (!result.success) {
    return next(new AppError(result.error, 400));
  }

  res.status(200).json({
    status: 'success',
    data: result.data
  });
});

// Get user's notification statistics
exports.getUserNotificationStats = catchAsync(async (req, res, next) => {
  const result = await NotificationService.getUserNotificationStats(req.user._id);

  if (!result.success) {
    return next(new AppError(result.error, 400));
  }

  res.status(200).json({
    status: 'success',
    data: result.data
  });
});

// Mark notification as read
exports.markNotificationAsRead = catchAsync(async (req, res, next) => {
  const result = await NotificationService.markAsRead(req.params.id, req.user._id);

  if (!result.success) {
    return next(new AppError(result.error, 400));
  }

  res.status(200).json({
    status: 'success',
    data: {
      notification: result.data
    }
  });
});

// Mark all notifications as read
exports.markAllNotificationsAsRead = catchAsync(async (req, res, next) => {
  const result = await NotificationService.markAllAsRead(req.user._id);

  if (!result.success) {
    return next(new AppError(result.error, 400));
  }

  res.status(200).json({
    status: 'success',
    data: result.data
  });
});

// Delete notification
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const result = await NotificationService.deleteNotification(req.params.id, req.user._id);

  if (!result.success) {
    return next(new AppError(result.error, 400));
  }

  res.status(200).json({
    status: 'success',
    data: {
      notification: result.data
    }
  });
});

// Get unread count
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const result = await NotificationService.getUnreadCount(req.user._id);

  if (!result.success) {
    return next(new AppError(result.error, 400));
  }

  res.status(200).json({
    status: 'success',
    data: {
      unreadCount: result.data.unreadCount
    }
  });
});

