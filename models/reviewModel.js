// review / rating / createdAt / ref to property / ref to user
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
      maxlength: [1000, 'Review must have less than or equal to 1000 characters'],
      minlength: [10, 'Review must have more than or equal to 10 characters']
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      required: [true, 'Rating is required']
    },
    reviewType: {
      type: String,
      enum: ['property', 'website_service'],
      required: [true, 'Review type must be specified'],
      default: 'website_service'
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: function() {
        return this.reviewType === 'property';
      }
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must be given by a buyer']
    },
    title: {
      type: String,
      maxlength: [100, 'Review title cannot exceed 100 characters'],
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    adminNotes: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    updatedAt: {
      type: Date,
      default: Date.now()
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Update timestamp on save
reviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate buyer and property information
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'buyer',
    select: 'name photo email'
  });
  
  if (this.reviewType === 'property') {
    this.populate({
      path: 'property',
      select: 'title location type images'
    });
  }
  
  next();
});

// Indexes for better query performance
reviewSchema.index({ reviewType: 1, status: 1, createdAt: -1 });
reviewSchema.index({ property: 1, createdAt: -1 });
reviewSchema.index({ buyer: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isVerified: 1 });

// Virtual for review summary
reviewSchema.virtual('reviewSummary').get(function() {
  if (this.review.length > 100) {
    return this.review.substring(0, 100) + '...';
  }
  return this.review;
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
