const express = require('express');
const propertyController = require('../controllers/propertyController');
const authController=require('../controllers/authController');
const interestRouter=require('./interestRoutes');
const reviewRouter=require('./reviewRoutes');
const sellingRoutes=require('./sellingRoutes');

const router = express.Router();

router.use('/:PropertyId/reviews', reviewRouter);
router.use('/:PropertyId/interest', interestRouter);
router.use('/:PropertyId/selling', sellingRoutes);

// Routes
router.route('/')
.get(propertyController.getProperties)
.post(authController.protect,
    authController.restrictTo('admin', 'employee','seller','agent'),propertyController.permitCreate,
    propertyController.createProperty);

// Get properties by seller/owner
router.route('/seller/:ownerId')
.get(authController.protect,
    authController.restrictTo('admin', 'employee', 'seller', 'agent'),
    propertyController.getPropertiesBySeller);

router.route('/property-stats')
.get(authController.protect,
    authController.restrictTo('admin', 'employee'),
    propertyController.getPropertyStats);

// Property image management routes
router.post('/:id/upload-images', 
  authController.protect,
  authController.restrictTo('admin', 'employee','seller','agent'),
  propertyController.propertyImage,
  propertyController.uploadPropertyImages
);

router.delete('/:id/remove-image',
  authController.protect,
  authController.restrictTo('admin', 'employee','seller','agent'),
  propertyController.removePropertyImage
);

router.post('/cleanup-orphaned-images',
  authController.protect,
  authController.restrictTo('admin'),
  propertyController.cleanupOrphanedPropertyImages
);

router.route('/:id')
.get(propertyController.getProperty)
.patch(authController.protect,
    authController.restrictTo('admin', 'employee','seller','agent'),propertyController.permitUpdate,
    propertyController.propertyImage , 
    propertyController.updateProperty)
.delete(authController.protect,
    authController.restrictTo('admin', 'employee','seller','agent'),propertyController.permit,
    propertyController.deleteProperty)
.put(authController.protect,
    authController.restrictTo('admin', 'employee'),
    propertyController.verifyProperty);

// Explicit reject endpoint
router.patch('/:id/reject',
  authController.protect,
  authController.restrictTo('admin','employee'),
  propertyController.rejectProperty
);

/* router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'employee'),
    propertyController.getMonthlyPlan
  ); */

module.exports = router; 