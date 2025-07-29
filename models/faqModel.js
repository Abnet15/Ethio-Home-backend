const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'FAQ ID is required'],
    unique: true,
    trim: true
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['property', 'process', 'financing', 'account', 'search', 'technical', 'billing', 'general'],
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  tags: [String],
  viewCount: {
    type: Number,
    default: 0
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
faqSchema.index({ id: 1 });
faqSchema.index({ category: 1 });
faqSchema.index({ isActive: 1 });
faqSchema.index({ order: 1 });
faqSchema.index({ tags: 1 });

// Virtual for helpful percentage
faqSchema.virtual('helpfulPercentage').get(function() {
  const total = this.helpful + this.notHelpful;
  if (total === 0) return 0;
  return Math.round((this.helpful / total) * 100);
});

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;



