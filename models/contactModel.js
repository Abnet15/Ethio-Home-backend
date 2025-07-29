const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  inquiryType: {
    type: String,
    enum: ['general', 'property', 'technical', 'billing', 'sales', 'support', 'partnership', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  adminResponse: {
    type: String,
    trim: true
  },
  employeeResponse: {
    type: String,
    trim: true
  },
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  respondedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  respondedAt: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  tags: [String],
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ inquiryType: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ assignedTo: 1 });
contactSchema.index({ respondedBy: 1 });

// Virtual for response time
contactSchema.virtual('responseTime').get(function() {
  if (this.respondedAt && this.createdAt) {
    return this.respondedAt - this.createdAt;
  }
  return null;
});

// Virtual for isResponded
contactSchema.virtual('isResponded').get(function() {
  return !!(this.adminResponse || this.employeeResponse);
});

// Pre-save middleware to capture IP and user agent
contactSchema.pre('save', function(next) {
  if (this.isNew) {
    // This will be set by middleware in routes
    next();
  } else {
    next();
  }
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
