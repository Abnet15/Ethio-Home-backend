const Review = require('./../models/reviewModel');
const Property = require('./../models/propertyModel');
const User = require('./../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Get all reviews with filtering
exports.getAllReviews = catchAsync(async (req, res, next) => {
  const { reviewType, status, rating, property, buyer, page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  // Build filter object
  const filter = {};
  
  if (reviewType) filter.reviewType = reviewType;
  if (status) filter.status = status;
  if (rating) filter.rating = { $gte: parseInt(rating) };
  if (property) filter.property = property;
  if (buyer) filter.buyer = buyer;
  
  // Only show approved reviews for public access
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
    filter.status = 'approved';
    filter.isVerified = true;
  }
  
  const skip = (page - 1) * limit;
  
  const reviews = await Review.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Review.countDocuments(filter);
  
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    data: {
      reviews
    }
  });
});

// Get website service reviews (for home page)
exports.getWebsiteServiceReviews = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;
  
  const reviews = await Review.find({
    reviewType: 'website_service',
    /* status: 'approved',
    isVerified: true */
  })
  .sort('-createdAt')
  .limit(parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

// Get property reviews
exports.getPropertyReviews = catchAsync(async (req, res, next) => {
  const { propertyId } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  // Verify property exists
  const property = await Property.findById(propertyId);
  if (!property) {
    return next(new AppError('Property not found', 404));
  }
  
  const filter = {
    property: propertyId,
    reviewType: 'property',
    status: 'approved',
    isVerified: true
  };
  
  const skip = (page - 1) * limit;
  
  const reviews = await Review.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Review.countDocuments(filter);
  
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    data: {
      reviews
    }
  });
});

// Create a new review
exports.createReview = catchAsync(async (req, res, next) => {
  const { reviewType, propertyId, title, review, rating, location } = req.body;
  
  // Validate review type and required fields
  if (reviewType === 'property' && !propertyId) {
    return next(new AppError('Property ID is required for property reviews', 400));
  }
  
  /* if (reviewType === 'website_service' && propertyId) {
    return next(new AppError('Property ID should not be provided for website service reviews', 400));
  } */
  
  // Check if user has already reviewed this property (for property reviews)
  if (reviewType === 'property') {
    const existingReview = await Review.findOne({
      buyer: req.user._id,
      property: propertyId,
      reviewType: 'property'
    });
    
    if (existingReview) {
      return next(new AppError('You have already reviewed this property', 400));
    }
  }
  
  // Check if user has already given a website service review
  if (reviewType === 'website_service') {
    const existingReview = await Review.findOne({
      buyer: req.user._id,
      reviewType: 'website_service'
    });
    
    if (existingReview) {
      return next(new AppError('You have already given a website service review', 400));
    }
  }
  
  const reviewData = {
    buyer: req.user._id,
    reviewType,
    review,
    rating,
    title,
    location: location || req.user.location || 'Unknown Location'
  };
  
  if (reviewType === 'property') {
    reviewData.property = propertyId;
  }
  
  const newReview = await Review.create(reviewData);
  
  // Populate the created review
  await newReview.populate([
    { path: 'buyer', select: 'name photo email' },
    { path: 'property', select: 'title location type images' }
  ]);
  
  res.status(201).json({
    status: 'success',
    data: {
      review: newReview
    }
  });
});

// Get a specific review
exports.getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Check if user can view this review
  if (review.status !== 'approved' && 
      req.user.role !== 'admin' && 
      req.user.role !== 'employee' && 
      review.buyer.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to view this review', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

// Update a review
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Check permissions
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    if (review.buyer.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only update your own reviews', 403));
    }
    
    if (review.status === 'approved') {
      return next(new AppError('Approved reviews cannot be modified', 400));
    }
  }
  
  // Only allow certain fields to be updated by regular users
  const allowedFields = ['review', 'rating', 'title', 'location'];
  const updateData = {};
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });
  
  // Admins and employees can update more fields
  if (req.user.role === 'admin' || req.user.role === 'employee') {
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.adminNotes !== undefined) updateData.adminNotes = req.body.adminNotes;
    if (req.body.isVerified !== undefined) {
      updateData.isVerified = req.body.isVerified;
      if (req.body.isVerified) {
        updateData.verifiedBy = req.user._id;
        updateData.verifiedAt = Date.now();
      }
    }
  }
  
  const updatedReview = await Review.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate([
    { path: 'buyer', select: 'name photo email' },
    { path: 'property', select: 'title location type images' }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      review: updatedReview
    }
  });
});

// Delete a review
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  // Check permissions
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    if (review.buyer.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only delete your own reviews', 403));
    }
    
    if (review.status === 'approved') {
      return next(new AppError('Approved reviews cannot be deleted', 400));
    }
  }
  
  await Review.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Admin: Approve/Reject review
exports.updateReviewStatus = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  
  const { status, adminNotes } = req.body;
  
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return next(new AppError('Invalid status. Must be pending, approved, or rejected', 400));
  }
  
  const updateData = { status };
  if (adminNotes) updateData.adminNotes = adminNotes;
  
  if (status === 'approved') {
    updateData.isVerified = true;
    updateData.verifiedBy = req.user._id;
    updateData.verifiedAt = Date.now();
  }
  
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate([
    { path: 'buyer', select: 'name photo email' },
    { path: 'property', select: 'title location type images' }
  ]);
  
  if (!review) {
    return next(new AppError('Review not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

// Get review statistics
exports.getReviewStats = catchAsync(async (req, res, next) => {
  const stats = await Review.aggregate([
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        totalRating: { $sum: '$rating' },
        pendingReviews: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        approvedReviews: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejectedReviews: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        websiteServiceReviews: {
          $sum: { $cond: [{ $eq: ['$reviewType', 'website_service'] }, 1, 0] }
        },
        propertyReviews: {
          $sum: { $cond: [{ $eq: ['$reviewType', 'property'] }, 1, 0] }
        }
      }
    }
  ]);
  
  const ratingDistribution = await Review.aggregate([
    { $match: { status: 'approved' } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  const result = stats[0] || {
    totalReviews: 0,
    averageRating: 0,
    totalRating: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
    websiteServiceReviews: 0,
    propertyReviews: 0
  };
  
  result.ratingDistribution = ratingDistribution;
  
  res.status(200).json({
    status: 'success',
    data: {
      stats: result
    }
  });
});

// Get user's reviews
exports.getUserReviews = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  // Check if user can view these reviews
  if (req.user.role !== 'admin' && req.user.role !== 'employee' && req.user._id.toString() !== userId) {
    return next(new AppError('You can only view your own reviews', 403));
  }
  
  const skip = (page - 1) * limit;
  
  const reviews = await Review.find({ buyer: userId })
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit))
    .populate([
      { path: 'buyer', select: 'name photo email' },
      { path: 'property', select: 'title location type images' }
    ]);
    
  const total = await Review.countDocuments({ buyer: userId });
  
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    data: {
      reviews
    }
  });
});
