const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

class NotificationService {
  // Create a new notification
  static async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      return { success: true, data: notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Create contact response notification
  static async createContactResponseNotification(contact, response, responder) {
    try {
      // Find the user by email (since contact form might be submitted by non-registered users)
      const user = await User.findOne({ email: contact.email });
      
      if (!user) {
        // If user doesn't exist, we can't create a notification
        // But we can still log this for tracking
        console.log(`Contact response notification skipped - user not found for email: ${contact.email}`);
        return { success: true, data: null };
      }

      const notificationData = {
        recipient: user._id,
        type: 'contact_response',
        title: `Response to your inquiry: ${contact.subject || 'Contact Form'}`,
        message: `We have responded to your inquiry. ${response.length > 100 ? response.substring(0, 100) + '...' : response}`,
        relatedContact: contact._id,
        sender: responder._id,
        priority: 'high',
        actionUrl: `/dashboard/contacts/${contact._id}`,
        metadata: {
          contactId: contact._id,
          inquiryType: contact.inquiryType,
          originalMessage: contact.message
        }
      };

      const notification = await this.createNotification(notificationData);
      return notification;
    } catch (error) {
      console.error('Error creating contact response notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId, options = {}) {
    try {
      const { limit = 50, skip = 0, unreadOnly = false } = options;
      
      const filter = { recipient: userId };
      if (unreadOnly) {
        filter.isRead = false;
      }

      const notifications = await Notification.find(filter)
        .populate('sender', 'name email photo')
        .populate('relatedContact', 'subject inquiryType')
        .populate('relatedProperty', 'title location')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

      return {
        success: true,
        data: {
          notifications,
          total,
          unreadCount,
          hasMore: total > skip + limit
        }
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return { success: false, error: 'Notification not found or unauthorized' };
      }

      return { success: true, data: notification };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
      );

      return { success: true, data: { updatedCount: result.modifiedCount } };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        return { success: false, error: 'Notification not found or unauthorized' };
      }

      return { success: true, data: notification };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notification statistics for a user
  static async getUserNotificationStats(userId) {
    try {
      const stats = await Notification.aggregate([
        { $match: { recipient: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: { $sum: { $cond: ['$isRead', 0, 1] } },
            byType: {
              $push: {
                type: '$type',
                isRead: '$isRead'
              }
            }
          }
        }
      ]);

      if (stats.length === 0) {
        return {
          success: true,
          data: {
            total: 0,
            unread: 0,
            byType: {}
          }
        };
      }

      const stat = stats[0];
      const byType = {};
      
      stat.byType.forEach(item => {
        if (!byType[item.type]) {
          byType[item.type] = { total: 0, unread: 0 };
        }
        byType[item.type].total++;
        if (!item.isRead) {
          byType[item.type].unread++;
        }
      });

      return {
        success: true,
        data: {
          total: stat.total,
          unread: stat.unread,
          byType
        }
      };
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Get unread count for a user
  static async getUnreadCount(userId) {
    try {
      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });

      return {
        success: true,
        data: {
          unreadCount
        }
      };
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;

