const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Property = require('../models/propertyModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const general = require('./generalControler');

// Get all messages (admin/employee only)
exports.getAllMessages = catchAsync(async (req, res, next) => {
  const filter = {};
  
  // Apply filters if provided
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
  if (req.query.messageType) filter.messageType = req.query.messageType;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.sender) filter.sender = req.query.sender;
  if (req.query.recipient) filter.recipient = req.query.recipient;
  if (req.query.isArchived !== undefined) filter.isArchived = req.query.isArchived === 'true';

  const messages = await Message.find(filter)
    .populate('sender', 'name email photo')
    .populate('recipient', 'name email photo')
    .populate('relatedProperty', 'title location price')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// Get admin/employee specific messages with role-based permissions
exports.getAdminEmployeeMessages = catchAsync(async (req, res, next) => {
  const filter = {};
  
  // Apply filters if provided
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
  if (req.query.messageType) filter.messageType = req.query.messageType;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.sender) filter.sender = req.query.sender;
  if (req.query.recipient) filter.recipient = req.query.recipient;
  if (req.query.isArchived !== undefined) filter.isArchived = req.query.isArchived === 'true';

  // Role-based filtering
  if (req.user.role === 'employee') {
    // Employees can see all messages but with limited actions
    // No additional filtering needed
  } else if (req.user.role === 'admin') {
    // Admins can see all messages with full access
    // No additional filtering needed
  }

  const messages = await Message.find(filter)
    .populate('sender', 'name email photo')
    .populate('recipient', 'name email photo')
    .populate('relatedProperty', 'title location price')
    .sort({ createdAt: -1 }); // Order by creation date (newest first)

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
      userRole: req.user.role,
      permissions: {
        canDelete: req.user.role === 'admin',
        canUpdate: req.user.role === 'admin',
        canViewAll: true,
        canSendBulk: req.user.role === 'admin'
      }
    }
  });
});

// Get messages for current user (inbox)
exports.getMyMessages = catchAsync(async (req, res, next) => {
  const filter = {
    $or: [
      { recipient: req.user._id },
      { sender: req.user._id }
    ]
  };

  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
  if (req.query.messageType) filter.messageType = req.query.messageType;
  if (req.query.isArchived !== undefined) filter.isArchived = req.query.isArchived === 'true';

  const messages = await Message.find(filter)
    .populate('sender', 'name email photo')
    .populate('recipient', 'name email photo')
    .populate('relatedProperty', 'title location price')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// Get messages sent by current user
exports.getSentMessages = catchAsync(async (req, res, next) => {
  const filter = { sender: req.user._id };
  
  if (req.query.messageType) filter.messageType = req.query.messageType;
  if (req.query.isArchived !== undefined) filter.isArchived = req.query.isArchived === 'true';

  const messages = await Message.find(filter)
    .populate('recipient', 'name email photo')
    .populate('relatedProperty', 'title location price')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// Get messages received by current user
exports.getReceivedMessages = catchAsync(async (req, res, next) => {
  const filter = { recipient: req.user._id };
  
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
  if (req.query.messageType) filter.messageType = req.query.messageType;
  if (req.query.isArchived !== undefined) filter.isArchived = req.query.isArchived === 'true';

  const messages = await Message.find(filter)
    .populate('sender', 'name email photo')
    .populate('relatedProperty', 'title location price')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// Create a new message
exports.createMessage = catchAsync(async (req, res, next) => {
  // Set sender to current user
  req.body.sender = req.user._id;

  // Validate recipient exists
  if (req.body.recipient) {
    const recipient = await User.findById(req.body.recipient);
    if (!recipient) {
      return next(new AppError('Recipient not found', 404));
    }
  }

  // Validate related property if provided
  if (req.body.relatedProperty) {
    const property = await Property.findById(req.body.relatedProperty);
    if (!property) {
      return next(new AppError('Related property not found', 404));
    }
  }

  const message = await Message.create(req.body);

  // Populate references for response
  await message.populate('sender', 'name email photo');
  await message.populate('recipient', 'name email photo');
  if (req.body.relatedProperty) {
    await message.populate('relatedProperty', 'title location price');
  }

  // Emit realtime updates
  if (global.io) {
    const recipientId = message.recipient?._id?.toString?.();
    const senderId = message.sender?._id?.toString?.();
    if (recipientId) global.io.to(recipientId).emit('message:new', message);
    if (senderId) global.io.to(senderId).emit('message:new', message);
  }

  res.status(201).json({
    status: 'success',
    data: {
      message
    }
  });
});

// Create message from property detail page
exports.createPropertyMessage = catchAsync(async (req, res, next) => {
  const { propertyId, subject, content, messageType, priority } = req.body;

  if (!propertyId || !subject || !content) {
    return next(new AppError('Property ID, subject, and content are required', 400));
  }

  // Validate property exists
  const property = await Property.findById(propertyId);
  if (!property) {
    return next(new AppError('Property not found', 404));
  }

  // Determine recipient (property owner or agent)
  let recipientId;
  if (property.agent) {
    recipientId = property.agent;
  } else if (property.owner) {
    recipientId = property.owner;
  } else {
    return next(new AppError('No agent or owner found for this property', 404));
  }

  // Validate recipient exists
  const recipientUser = await User.findById(recipientId);
  if (!recipientUser) {
    return next(new AppError('Property owner/agent not found', 404));
  }

  // Prevent sending message to self
  if (recipientId.toString() === req.user._id.toString()) {
    return next(new AppError('Cannot send message to yourself', 400));
  }

  // Create the message
  const message = await Message.create({
    sender: req.user._id,
    recipient: recipientId,
    subject,
    content,
    messageType: messageType || 'property',
    priority: priority || 'medium',
    relatedProperty: propertyId
  });

  // Populate references
  await message.populate('sender', 'name email photo');
  await message.populate('recipient', 'name email photo');
  await message.populate('relatedProperty', 'title location price');

  if (global.io) {
    const recipientRoom = recipientId?.toString?.();
    const senderRoom = req.user?._id?.toString?.();
    if (recipientRoom) global.io.to(recipientRoom).emit('message:new', message);
    if (senderRoom) global.io.to(senderRoom).emit('message:new', message);
  }

  res.status(201).json({
    status: 'success',
    data: {
      message
    }
  });
});

// Get a single message
exports.getMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id)
    .populate('sender', 'name email photo')
    .populate('recipient', 'name email photo')
    .populate('relatedProperty', 'title location price');

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user has access to this message
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    if (message.sender._id.toString() !== req.user._id.toString() && 
        message.recipient._id.toString() !== req.user._id.toString()) {
      return next(new AppError('You do not have access to this message', 403));
    }
  }

  // Mark as read if recipient is viewing
  if (message.recipient._id.toString() === req.user._id.toString() && !message.isRead) {
    message.isRead = true;
    await message.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      message
    }
  });
});

// Mark message as read
exports.markAsRead = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id)
    .populate('sender', 'name email photo')
    .populate('recipient', 'name email photo');

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is the recipient
  if (message.recipient._id.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only mark messages you received as read', 403));
  }

  message.isRead = true;
  message.readAt = new Date();
  await message.save();

  // Emit read receipt to sender
  if (global.io) {
    const senderId = message.sender._id.toString();
    global.io.to(senderId).emit('message:read', {
      messageId: message._id,
      readBy: req.user._id.toString(),
      readAt: message.readAt
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      message
    }
  });
});

// Mark message as archived
exports.toggleArchive = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Admin and employee can archive any message
  if (req.user.role === 'admin' || req.user.role === 'employee') {
    message.isArchived = !message.isArchived;
    await message.save();

    res.status(200).json({
      status: 'success',
      data: {
        message
      }
    });
    return;
  }

  // Check if user has access to this message (for regular users)
  if (message.sender.toString() !== req.user._id.toString() && 
      message.recipient.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have access to this message', 403));
  }

  message.isArchived = !message.isArchived;
  await message.save();

  res.status(200).json({
    status: 'success',
    data: {
      message
    }
  });
});

// Get message statistics
exports.getMessageStats = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // For regular users, only show their own stats
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    filter = {
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    };
  }

  const stats = await Message.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        unreadMessages: {
          $sum: {
            $cond: [{ $eq: ['$isRead', false] }, 1, 0]
          }
        },
        archivedMessages: {
          $sum: {
            $cond: [{ $eq: ['$isArchived', true] }, 1, 0]
          }
        }
      }
    }
  ]);

  // Get message type distribution
  const typeStats = await Message.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$messageType',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get priority distribution
  const priorityStats = await Message.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats[0] || { totalMessages: 0, unreadMessages: 0, archivedMessages: 0 },
      typeDistribution: typeStats,
      priorityDistribution: priorityStats
    }
  });
});

// Send bulk message to multiple recipients (admin/employee only)
exports.sendBulkMessage = catchAsync(async (req, res, next) => {
  const { recipients, subject, content, messageType, priority, relatedProperty } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return next(new AppError('Recipients array is required', 400));
  }

  if (!subject || !content) {
    return next(new AppError('Subject and content are required', 400));
  }

  // Validate all recipients exist
  const validRecipients = await User.find({ _id: { $in: recipients } });
  if (validRecipients.length !== recipients.length) {
    return next(new AppError('Some recipients were not found', 400));
  }

  // Validate related property if provided
  if (relatedProperty) {
    const property = await Property.findById(relatedProperty);
    if (!property) {
      return next(new AppError('Related property not found', 404));
    }
  }

  // Create messages for all recipients
  const messageData = recipients.map(recipientId => ({
    sender: req.user._id,
    recipient: recipientId,
    subject,
    content,
    messageType: messageType || 'general',
    priority: priority || 'medium',
    relatedProperty
  }));

  const messages = await Message.insertMany(messageData);

  // Populate references for response
  await Message.populate(messages, [
    { path: 'sender', select: 'name email photo' },
    { path: 'recipient', select: 'name email photo' },
    { path: 'relatedProperty', select: 'title location price' }
  ]);

  res.status(201).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// Get message templates (admin/employee only)
exports.getMessageTemplates = catchAsync(async (req, res, next) => {
  //const templates = await Message.find();
  // For now, return predefined templates
  // In a real application, you might want to store these in a database
  const templates = [
    {
      id: 'welcome',
      name: 'Welcome Message',
      subject: 'Welcome to Ethio Home!',
      content: 'Thank you for joining our platform. We\'re excited to help you find your perfect home.',
      messageType: 'general',
      priority: 'low'
    },
    {
      id: 'property-inquiry',
      name: 'Property Inquiry Response',
      subject: 'Re: Your Property Inquiry',
      content: 'Thank you for your interest in our property. We\'ll get back to you shortly with more details.',
      messageType: 'property',
      priority: 'medium'
    },
    {
      id: 'support',
      name: 'Support Response',
      subject: 'Re: Support Request',
      content: 'We\'ve received your support request and our team will assist you shortly.',
      messageType: 'support',
      priority: 'medium'
    }
  ];

  res.status(200).json({
    status: 'success',
    results: templates.length,
    data: {
      templates
    }
  });
});

// Create message template (admin/employee only)
exports.createMessageTemplate = catchAsync(async (req, res, next) => {
  const { name, subject, content, messageType, priority } = req.body;

  if (!name || !subject || !content) {
    return next(new AppError('Name, subject, and content are required', 400));
  }

  // For now, just return success since we're using predefined templates
  // In a real application, you would save this to a database
  res.status(201).json({
    status: 'success',
    message: 'Template created successfully',
    data: {
      template: {
        id: Date.now().toString(),
        name,
        subject,
        content,
        messageType: messageType || 'general',
        priority: priority || 'medium'
      }
    }
  });
});

// Update message with proper permission checks
exports.updateMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check user access and permissions
  const isSender = message.sender.toString() === req.user._id.toString();
  const isRecipient = message.recipient.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isEmployee = req.user.role === 'employee';

  // Permission logic:
  // 1. Admin can update any message
  // 2. Employee can update any message (limited fields)
  // 3. Sender can only update before recipient reads it
  // 4. Recipient can only update read status
  if (!isAdmin && !isEmployee && !isSender && !isRecipient) {
    return next(new AppError('You do not have access to this message', 403));
  }

  if (isSender && !isAdmin && !isEmployee) {
    // Sender can only update before recipient reads
    if (message.isRead) {
      return next(new AppError('Cannot update message after recipient has read it', 403));
    }
  }

  if (isRecipient && !isAdmin && !isEmployee) {
    // Recipient can only update read status and archive
    const allowedFields = ['isRead', 'isArchived'];
    const updateFields = Object.keys(req.body);
    const hasInvalidFields = updateFields.some(field => !allowedFields.includes(field));
    
    if (hasInvalidFields) {
      return next(new AppError('Recipients can only update read status and archive', 403));
    }
  }

  // Update the message
  const updatedMessage = await Message.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate('sender', 'name email photo')
   .populate('recipient', 'name email photo')
   .populate('relatedProperty', 'title location price');

  // Emit realtime updates
  if (global.io) {
    const recipientId = updatedMessage.recipient._id.toString();
    const senderId = updatedMessage.sender._id.toString();
    if (recipientId) global.io.to(recipientId).emit('message:updated', updatedMessage);
    if (senderId) global.io.to(senderId).emit('message:updated', updatedMessage);
  }

  res.status(200).json({
    status: 'success',
    data: {
      message: updatedMessage
    }
  });
});

// Delete message with proper permission checks
exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check user access and permissions
  const isSender = message.sender.toString() === req.user._id.toString();
  const isRecipient = message.recipient.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isEmployee = req.user.role === 'employee';

  // Permission logic:
  // 1. Admin can delete any message
  // 2. Employee can delete any message
  // 3. Sender can only delete before recipient reads it
  // 4. Recipient cannot delete messages
  if (!isAdmin && !isEmployee && !isSender) {
    return next(new AppError('You do not have permission to delete this message', 403));
  }

  if (isSender && !isAdmin && !isEmployee) {
    // Sender can only delete before recipient reads
    if (message.isRead) {
      return next(new AppError('Cannot delete message after recipient has read it', 403));
    }
  }

  // Get message details before deletion for socket notification
  const recipientId = message.recipient.toString();
  const senderId = message.sender.toString();

  // Delete the message
  await Message.findByIdAndDelete(req.params.id);

  // Emit realtime updates
  if (global.io) {
    if (recipientId) global.io.to(recipientId).emit('message:deleted', { messageId: req.params.id });
    if (senderId) global.io.to(senderId).emit('message:deleted', { messageId: req.params.id });
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// New enhanced methods

// Search messages with text search
exports.searchMessages = catchAsync(async (req, res, next) => {
  const { q: searchTerm, messageType, isRead, isArchived } = req.query;
  
  if (!searchTerm) {
    return next(new AppError('Search term is required', 400));
  }

  const options = { messageType, isRead, isArchived };
  const messages = await Message.searchMessages(searchTerm, req.user._id, options);

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// Get thread messages
exports.getThreadMessages = catchAsync(async (req, res, next) => {
  const { threadId } = req.params;
  
  const messages = await Message.getThreadMessages(threadId);
  
  if (messages.length === 0) {
    return next(new AppError('Thread not found', 404));
  }

  // Check if user has access to this thread
  const hasAccess = messages.some(message => 
    message.sender._id.toString() === req.user._id.toString() || 
    message.recipient._id.toString() === req.user._id.toString()
  );

  if (!hasAccess && req.user.role !== 'admin' && req.user.role !== 'employee') {
    return next(new AppError('You do not have access to this thread', 403));
  }

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// Reply to a message (creates thread)
exports.replyToMessage = catchAsync(async (req, res, next) => {
  const { id: messageId } = req.params;
  const { content, subject } = req.body;

  if (!content) {
    return next(new AppError('Reply content is required', 400));
  }

  // Get the original message
  const originalMessage = await Message.findById(messageId)
    .populate('sender', 'name email photo')
    .populate('recipient', 'name email photo');
    
  if (!originalMessage) {
    return next(new AppError('Original message not found', 404));
  }

  // Determine recipient (reply to sender of original message)
  const recipientId = originalMessage.sender._id.toString() === req.user._id.toString() 
    ? originalMessage.recipient._id 
    : originalMessage.sender._id;

  // Create reply message
  const replyMessage = await Message.create({
    sender: req.user._id,
    recipient: recipientId,
    subject: subject || `Re: ${originalMessage.subject}`,
    content,
    messageType: originalMessage.messageType,
    priority: originalMessage.priority,
    relatedProperty: originalMessage.relatedProperty,
    replyTo: messageId,
    threadId: originalMessage.threadId || originalMessage._id
  });

  // Populate references
  await replyMessage.populate('sender', 'name email photo');
  await replyMessage.populate('recipient', 'name email photo');
  if (originalMessage.relatedProperty) {
    await replyMessage.populate('relatedProperty', 'title location price');
  }

  // Emit realtime updates
  if (global.io) {
    const recipientIdStr = recipientId.toString();
    const senderIdStr = req.user._id.toString();
    if (recipientIdStr) global.io.to(recipientIdStr).emit('message:new', replyMessage);
    if (senderIdStr) global.io.to(senderIdStr).emit('message:new', replyMessage);
  }

  res.status(201).json({
    status: 'success',
    data: {
      message: replyMessage
    }
  });
});

// Get unread message count for notifications
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await Message.countDocuments({
    recipient: req.user._id,
    isRead: false
  });

  res.status(200).json({
    status: 'success',
    data: {
      unreadCount: count
    }
  });
});

// Mark multiple messages as read
exports.markMultipleAsRead = catchAsync(async (req, res, next) => {
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds)) {
    return next(new AppError('Message IDs array is required', 400));
  }

  // Get messages before updating to emit socket events
  const messages = await Message.find({
    _id: { $in: messageIds },
    recipient: req.user._id
  }).populate('sender', 'name email photo');

  // Mark multiple messages as read
  const result = await Message.updateMany(
    {
      _id: { $in: messageIds },
      recipient: req.user._id
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );

  // Emit read receipts to senders
  if (global.io && messages.length > 0) {
    const senderIds = new Set();
    messages.forEach(message => {
      if (message.sender && message.sender._id) {
        senderIds.add(message.sender._id.toString());
      }
    });
    
    senderIds.forEach(senderId => {
      global.io.to(senderId).emit('messages:read', {
        messageIds: messageIds,
        readBy: req.user._id.toString(),
        readAt: new Date()
      });
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      updatedCount: result.modifiedCount
    }
  });
});

// Get message analytics for admin dashboard
exports.getMessageAnalytics = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  }

  const analytics = await Message.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        count: { $sum: 1 },
        readCount: {
          $sum: { $cond: ["$isRead", 1, 0] }
        },
        unreadCount: {
          $sum: { $cond: ["$isRead", 0, 1] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get message type distribution
  const typeDistribution = await Message.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$messageType',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get priority distribution
  const priorityDistribution = await Message.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      dailyAnalytics: analytics,
      typeDistribution,
      priorityDistribution
    }
  });
});


