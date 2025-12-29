const multer = require('multer');
const Property = require('../models/propertyModel');
const User = require('../models/userModel');
const AppError=require('../utils/appError');
const CatchAsync=require('../utils/catchAsync');
const generalControler=require('./generalControler');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

// Utility function to safely remove property image from Cloudinary
const removePropertyImageFile = async (imageUrlOrPublicId, propertyId) => {
  try {
    if (!imageUrlOrPublicId) {
      return false;
    }

    const result = await deleteImage(imageUrlOrPublicId);
    if (result.result === 'ok') {
      console.log(`✅ Property image removed from Cloudinary for property ${propertyId}`);
      return true;
    } else {
      console.log(`ℹ️ Property image not found in Cloudinary for property ${propertyId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error removing property image from Cloudinary for property ${propertyId}:`, error);
    return false;
  }
};

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only images are allowed.', 400), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for property images
  }
});

exports.propertyImage=upload.array('images',6);

// Property image upload endpoint
exports.uploadPropertyImages = CatchAsync(async (req, res, next) => {
  try{
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one image', 400));
  }

  // Validate file types
  for (const file of req.files) {
    if (!file.mimetype.startsWith('image/')) {
      return next(new AppError('Invalid file type. Only images are allowed.', 400));
    }
  }

  // Validate file sizes
  for (const file of req.files) {
    if (file.size > 5 * 1024 * 1024) {
      return next(new AppError('File size too large. Maximum size is 5MB.', 400));
    }
  }

  // Get current property
  const property = await Property.findById(req.params.id);
  
  if (!property) {
    return next(new AppError('Property not found', 404));
  }
  console.log("🤣🤣🤣",property.owner.toString() , req.user._id.toString() )

  // Check if user owns the property or is admin/employee
  if (property.owner._id.toString() !== req.user._id.toString() && 
      !['admin', 'employee'].includes(req.user.role)) {
    return next(new AppError('You can only upload images to your own properties', 403));
  }

  // Check if adding these images would exceed the limit of 6
  const currentImageCount = property.images ? property.images.length : 0;
  const totalImagesAfterUpload = currentImageCount + req.files.length;
  
  if (totalImagesAfterUpload > 6) {
    // Calculate how many old images to remove
    const imagesToRemove = totalImagesAfterUpload - 6;
    
    // Sort images by creation time (oldest first) and remove the oldest ones
    if (property.images && property.images.length > 0) {
      // For Cloudinary URLs, we'll remove the oldest ones based on array order
      const imagesToDelete = property.images.slice(0, imagesToRemove);
      
      // Remove oldest images from Cloudinary
      for (const imageUrl of imagesToDelete) {
        await removePropertyImageFile(imageUrl, req.params.id);
        console.log(`🗑️ Removed oldest image to maintain limit: ${imageUrl}`);
      }
      
      // Keep only the newest images
      property.images = property.images.slice(imagesToRemove);
    }
  }

  // Upload images to Cloudinary
  const uploadPromises = req.files.map(async (file) => {
    const timestamp = Date.now();
    const publicId = `properties/${req.params.id}-${req.user._id}-${timestamp}`;
    const result = await uploadImage(file.buffer, 'properties', publicId);
    return result.secure_url; // Store the Cloudinary URL
  });

  const uploadedImageUrls = await Promise.all(uploadPromises);

  // Add new images to property
  property.images = property.images ? [...property.images, ...uploadedImageUrls] : uploadedImageUrls;

  // Save updated property
  const updatedProperty = await property.save();

  console.log(`✅ ${req.files.length} images uploaded successfully to Cloudinary for property ${req.params.id}`);
  if (totalImagesAfterUpload > 6) {
    console.log(`ℹ️ ${totalImagesAfterUpload - 6} oldest images were automatically removed to maintain the 6-image limit`);
  }

  // Return the updated property with image URLs
  const propertyWithUrls = {
    ...updatedProperty.toObject(),
    imagesUrl: updatedProperty.images
  };

  res.status(200).json({
    status: 'success',
    message: 'Images uploaded successfully',
    data: {
      property: propertyWithUrls,
      imagesUploaded: uploadedImageUrls,
      imagesRemoved: totalImagesAfterUpload > 6 ? totalImagesAfterUpload - 6 : 0
    }
  });
  }catch(error){
    console.error('Error in uploadPropertyImages:', error);
    return next(new AppError('Failed to upload property images', 500));
  }
});

// Property image remove endpoint
exports.removePropertyImage = CatchAsync(async (req, res, next) => {
  const { imageIndex } = req.body;
  
  if (imageIndex === undefined || imageIndex < 0) {
    return next(new AppError('Image index is required and must be non-negative', 400));
  }

  const property = await Property.findById(req.params.id);
  
  if (!property) {
    return next(new AppError('Property not found', 404));
  }

  // Check if user owns the property or is admin/employee
  if (property.owner.toString() !== req.user._id.toString() && 
      !['admin', 'employee'].includes(req.user.role)) {
    return next(new AppError('You can only remove images from your own properties', 403));
  }

  if (!property.images || property.images.length === 0) {
    return next(new AppError('No images to remove', 400));
  }

  if (imageIndex >= property.images.length) {
    return next(new AppError('Image index out of range', 400));
  }

  // Get the image URL to remove
  const imageToRemove = property.images[imageIndex];
  
  // Remove the image from Cloudinary
  await removePropertyImageFile(imageToRemove, req.params.id);

  // Remove the image from the property's images array
  property.images.splice(imageIndex, 1);
  
  // Save updated property
  const updatedProperty = await property.save();

  console.log(`✅ Image removed successfully from Cloudinary for property ${req.params.id}:`, imageToRemove);

  // Return the updated property with image URLs
  const propertyWithUrls = {
    ...updatedProperty.toObject(),
    imagesUrl: updatedProperty.images
  };

  res.status(200).json({
    status: 'success',
    message: 'Image removed successfully',
    data: {
      property: propertyWithUrls,
      removedImage: imageToRemove
    }
  });
});

// Property image cleanup endpoint (admin only)
exports.cleanupOrphanedPropertyImages = CatchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can perform this action', 403));
  }

  try {
    const allProperties = await Property.find({}, 'images');
    const propertyImages = allProperties.flatMap(p => p.images || []);
    
    // Note: Cloudinary cleanup would require listing all images in the folder
    // This is a simplified version - in production, you might want to use Cloudinary Admin API
    // to list all images in the 'properties' folder and compare with database
    
    res.status(200).json({
      status: 'success',
      message: `Cleanup check completed. Found ${propertyImages.length} property images in database.`,
      data: {
        totalImagesInDatabase: propertyImages.length,
        note: 'Cloudinary cleanup requires Admin API access to list all images in folder'
      }
    });
  } catch (error) {
    console.error('Error in property image cleanup:', error);
    return next(new AppError('Failed to cleanup orphaned property images', 500));
  }
});

exports.verifyProperty = CatchAsync(async (req, res) => {
  console.log(req.params.id);
  const property = await Property.findById(req.params.id);
  console.log(property);

  if (!property) {
    throw new AppError('Property not found',404);
  }

  property.isVerified = true;
  property.verificationDate = Date.now();
  property.verifiedBy = req.user._id;

  const verifiedProperty= await property.save();
  res.status(200).json({
    status: 'success',
    data:{
      data:verifiedProperty
    }
  });
});

// Reject property (admin/employee)
exports.rejectProperty = CatchAsync(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    throw new AppError('Property not found',404);
  }

  property.isVerified = false;
  property.status = 'rejected';
  property.rejectedBy = req.user._id;
  property.rejectionDate = Date.now();
  if (req.body?.reason) property.rejectionReason = req.body.reason;

  const updated = await property.save();
  res.status(200).json({
    status: 'success',
    data: { data: updated }
  });
});

exports.getPropertyStats = CatchAsync(async (req, res, next) => {
  const statsOfVerified = await Property.aggregate([
    {
      $match: { isVerified: true }
    },
    {
      $group: {
        _id: { $toUpper: '$location' },
        numProperty: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ]);

  const statsOfUnverified = await Property.aggregate([
    {
      $match: { isVerified: false }
    },
    {
      $group: {
        _id: { $toUpper: '$location' },
        numProperty: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      statsOfVerified,
      statsOfUnverified
    }
  });
});

exports.permit = CatchAsync(async (req, res, next) => {
  if (req.user.role === 'seller' || req.user.role === 'agent') {
    const subscriptionPlan = await SubscriptionPlan.findOne({ seller: req.user._id, active: true });
    
    if (!subscriptionPlan) {
      return next(new AppError('No active subscription found. Please subscribe to a plan before creating a property', 403));
    }
    
    // Check if user has reached their property limit
    const userPropertiesCount = await Property.countDocuments({ owner: req.user._id });
    
    if (userPropertiesCount >= subscriptionPlan.maxProperties) {
      return next(new AppError(
        `You have reached your property limit of ${subscriptionPlan.maxProperties} properties. Please upgrade your subscription plan to create more properties.`, 
        403
      ));
    }
  }
  next();
});

// New middleware that only checks subscription for CREATE operations
exports.permitCreate = CatchAsync(async (req, res, next) => {
  if (req.user.role === 'seller' || req.user.role === 'agent') {
    const subscriptionPlan = await SubscriptionPlan.findOne({ seller: req.user._id, active: true });
    
    if (!subscriptionPlan) {
      return next(new AppError('No active subscription found. Please subscribe to a plan before creating a property', 403));
    }
    const userPropertyCount = await Property.countDocuments({ owner: req.user._id , createdAt: { $gte: subscriptionPlan.lastUpgraded } });
    const remainingProperties = Math.max(0, subscriptionPlan.maxProperties - userPropertyCount);
    
    if (remainingProperties <= 0) {
      return next(new AppError(
        `You have reached your property limit of ${subscriptionPlan.maxProperties} properties. Please upgrade your subscription plan to create more properties.`, 
        403
      ));
    }
  }
  next();
});

// New middleware that only checks subscription status (no property limits) for UPDATE operations
exports.permitUpdate = CatchAsync(async (req, res, next) => {
  if (req.user.role === 'seller' || req.user.role === 'agent') {
    const subscriptionPlan = await SubscriptionPlan.findOne({ seller: req.user._id, active: true });
    
    if (!subscriptionPlan) {
      return next(new AppError('No active subscription found. Please subscribe to a plan before updating a property', 403));
    }
    // No property limit check for updates - users can update existing properties regardless of limits
  }
  next();
});

// Get properties by seller/owner
exports.getPropertiesBySeller = CatchAsync(async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    
    if (!ownerId) {
      return next(new AppError('Owner ID is required', 400));
    }

    // Build query with filters
    let query = Property.find({ owner: ownerId });
    
    // Apply additional filters from query params
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);
    
    if (Object.keys(queryObj).length > 0) {
      query = query.find(queryObj);
    }

    // Apply sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Apply field selection
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    // Apply pagination
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const skip = (page - 1) * limit;
    
    if (page < 1) {
      throw new AppError('Page number must be greater than 0', 400);
    }
    
    query = query.skip(skip).limit(limit);

    // Execute query
    const properties = await query;
    const total = await Property.countDocuments({ owner: ownerId });

    // Add image URLs (already Cloudinary URLs)
    const propertiesWithUrls = properties.map(property => ({
      ...property.toObject(),
      imagesUrl: property.images || []
    }));

    res.status(200).json({
      status: 'success',
      results: propertiesWithUrls.length,
      pageNumber: Number(page),
      pages: Math.ceil(total / limit),
      data: {
        data: propertiesWithUrls
      }
    });
  } catch (error) {
    console.error('Error in getPropertiesBySeller:', error);
    return next(new AppError(`Failed to fetch seller properties: ${error.message}`, 500));
  }
});

exports.getProperties = generalControler.getAll(Property);
exports.getProperty = generalControler.getOne(Property);
exports.deleteProperty = generalControler.deleteOne(Property);
exports.createProperty = generalControler.createOne(Property);
exports.updateProperty = generalControler.updateOne(Property);

