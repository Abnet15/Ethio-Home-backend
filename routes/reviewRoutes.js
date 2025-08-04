const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');
const Selling = require('../models/sellingModel');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsync');

const router = express.Router({ mergeParams: true });

// Public routes (no authentication required)
router.get('/website-service', reviewController.getWebsiteServiceReviews);
router.get('/stats', reviewController.getReviewStats);

// Protected routes
router.use(authController.protect);

// Get all reviews (with filtering)
router.get('/', reviewController.getAllReviews);

// Get property reviews
router.get('/property/:propertyId', reviewController.getPropertyReviews);

// Get user's reviews
router.get('/user/:userId', reviewController.getUserReviews);

// Create review middleware - check if user has purchased properties
router.use(catchAsync(async (req, res, next) => {
  // For website service reviews, allow if user has any purchase history
  if (req.body.reviewType === 'website_service') {
    const selling = await Selling.findOne({ buyer: req.user._id });
    if (!selling) {
      throw new AppError('You are not allowed to submit a review before purchasing a property.', 403);
    }
  }
  
  // For property reviews, check if user has purchased that specific property
  if (req.body.reviewType === 'property') {
    const selling = await Selling.findOne({ 
      buyer: req.user._id, 
      property: req.body.propertyId 
    });
    if (!selling) {
      throw new AppError('You can only review properties you have purchased.', 403);
    }
  }
  
  next();
}));

// Create review
router.post('/', 
  authController.restrictTo('buyer'),
  reviewController.createReview
);

// Get specific review
router.get('/:id', reviewController.getReview);

// Update review
router.patch('/:id', reviewController.updateReview);

// Delete review
router.delete('/:id', reviewController.deleteReview);

// Admin/Employee routes
router.use(authController.restrictTo('admin', 'employee'));

// Update review status (approve/reject)
router.patch('/:id/status', reviewController.updateReviewStatus);

module.exports = router;
