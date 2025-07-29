const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a sender']
  },
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a recipient']
  },
  subject: {
    type: String,
    required: [true, 'Message must have a subject'],
    trim: true,
    maxlength: [200, 'Subject cannot be longer than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Message must have content'],
    trim: true,
    maxlength: [2000, 'Message content cannot be longer than 2000 characters']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  messageType: {
    type: String,
    enum: ['inquiry', 'support', 'general', 'property', 'system'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  }],
  relatedProperty: {
    type: mongoose.Schema.ObjectId,
    ref: 'Property'
  },
  tags: [String],
  // New fields for enhanced functionality
  threadId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Message',
    default: null
  },
  isThreadRoot: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'Message',
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  // For search optimization
  searchText: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ threadId: 1 });
messageSchema.index({ searchText: 'text' }); // Text search index
messageSchema.index({ createdAt: -1 });
messageSchema.index({ priority: 1, createdAt: -1 });

// Virtual for message age
messageSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for thread messages count
messageSchema.virtual('threadCount').get(async function() {
  if (this.isThreadRoot) {
    return await this.model('Message').countDocuments({ threadId: this._id });
  }
  return 0;
});

// Pre-save middleware to ensure sender and recipient are different
messageSchema.pre('save', function(next) {
  if (this.sender.toString() === this.recipient.toString()) {
    return next(new Error('Sender and recipient cannot be the same'));
  }
  
  // Generate search text for better search functionality
  this.searchText = `${this.subject} ${this.content} ${this.tags.join(' ')}`;
  
  next();
});

// Pre-save middleware to handle thread creation
messageSchema.pre('save', async function(next) {
  if (this.replyTo && !this.threadId) {
    const parentMessage = await this.model('Message').findById(this.replyTo);
    if (parentMessage) {
      this.threadId = parentMessage.threadId || parentMessage._id;
    }
  }
  next();
});

// Static method to get thread messages
messageSchema.statics.getThreadMessages = function(threadId) {
  return this.find({ 
    $or: [
      { _id: threadId },
      { threadId: threadId }
    ]
  })
  .populate('sender', 'name email photo')
  .populate('recipient', 'name email photo')
  .populate('relatedProperty', 'title location price')
  .sort({ createdAt: 1 });
};

// Static method to search messages
messageSchema.statics.searchMessages = function(searchTerm, userId, options = {}) {
  const filter = {
    $or: [
      { sender: userId },
      { recipient: userId }
    ],
    $text: { $search: searchTerm }
  };
  
  if (options.messageType) filter.messageType = options.messageType;
  if (options.isRead !== undefined) filter.isRead = options.isRead;
  if (options.isArchived !== undefined) filter.isArchived = options.isArchived;
  
  return this.find(filter)
    .populate('sender', 'name email photo')
    .populate('recipient', 'name email photo')
    .populate('relatedProperty', 'title location price')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;


