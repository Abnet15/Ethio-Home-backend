const multer = require('multer');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const general = require('./generalControler');
const Email=require('../utils/email');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

// Utility function to safely remove user's photo from Cloudinary
const removeUserPhotoFile = async (photoUrlOrPublicId, userId) => {
  try {
    if (!photoUrlOrPublicId || photoUrlOrPublicId === 'default.png') {
      return false;
    }

    const result = await deleteImage(photoUrlOrPublicId);
    if (result.result === 'ok') {
      console.log(`✅ Photo removed from Cloudinary for user ${userId}`);
      return true;
    } else {
      console.log(`ℹ️ Photo not found in Cloudinary for user ${userId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error removing photo from Cloudinary for user ${userId}:`, error);
    return false;
  }
};

// Utility function to verify user photo in database
const verifyUserPhotoInDatabase = async (userId) => {
  try {
    const user = await User.findById(userId, 'photo');
    if (!user) {
      console.log(`❌ User ${userId} not found in database`);
      return false;
    }
    
    console.log(`✅ Database verification - User ${userId} photo:`, user.photo);
    return true;
  } catch (error) {
    console.error(`❌ Error verifying user ${userId} photo in database:`, error);
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
    fileSize: 5 * 1024 * 1024 // 5MB limit for user photos
  }
});

exports.userPhoto=upload.single('photo');

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next( new AppError('This route is not for password updates. Please use /updateMyPassword.', 400));
  }

  const object = {};
  const allowedFields=['name', 'email','phone','address','state','location','city'];
  Object.keys(req.body).forEach(el => {
    if (allowedFields.includes(el)) object[el] = req.body[el];
  });

  // Photo upload is handled separately in uploadPhoto endpoint
  const updatedUser = await User.findByIdAndUpdate(req.user.id, object, {
    new: true,
    runValidators: true
  });
  await new Email(updatedUser).accountUpdate();
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser =catchAsync(async (req, res) => {
  console.log(req.body);
  newUser= await User.create(req.body);

  const url = `http://localhost:3000/users/verifyEmail/${newUser._id}`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  res.status(201).json({
    status: 'success',
    newUser 
  });
});

// Favorites Controller Methods
exports.getFavorites = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'favorites',
    select: 'title location price bedrooms bathrooms area type images status'
  });

  const favorites=user.favorites.map(el=>({
        ...el.toObject(),
        imagesUrl: el.images.map(file => {
          // If file is already a full URL, use it as is
          if (file.startsWith('http://') || file.startsWith('https://')) {
            return file;
          }
          // Otherwise, construct the local URL
          return `http://127.0.0.1:5000/img/properties/${file}`;
        })
      }))

  res.status(200).json({
    status: 'success',
    data: {
      favorites
    }
  });
});

exports.addToFavorites = catchAsync(async (req, res, next) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return next(new AppError('Property ID is required', 400));
  }
 
  const user = await User.findById(req.user.id);
  
  // Check if property is already in favorites
  if (user.favorites.includes(propertyId)) {
    return next(new AppError('Property is already in favorites', 400));
  }

  // Add property to favorites
  user.favorites.push(propertyId);
  await user.save({validateBeforeSave: false});

  // Populate the newly added favorite
  const populatedUser = await User.findById(req.user.id).populate({
    path: 'favorites',
    select: 'title location price bedrooms bathrooms area type images status'
  });

  const addedFavorite = populatedUser.favorites.find(fav => fav._id.toString() === propertyId);

  res.status(200).json({
    status: 'success',
    data: {
      favorite: addedFavorite
    }
  });
});

exports.removeFromFavorites = catchAsync(async (req, res, next) => {
  const { propertyId } = req.params;

  const user = await User.findById(req.user.id);
  
  // Check if property is in favorites
  if (!user.favorites.includes(propertyId)) {
    return next(new AppError('Property is not in favorites', 400));
  }

  // Remove property from favorites
  user.favorites = user.favorites.filter(fav => fav.toString() !== propertyId);
  await user.save({validateBeforeSave: false});

  res.status(200).json({
    status: 'success',
    data: null
  });
});

exports.clearFavorites = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  user.favorites = [];
  await user.save({validateBeforeSave: false});

  res.status(200).json({
    status: 'success',
    data: null
  });
});

exports.checkFavorite = catchAsync(async (req, res, next) => {
  const { propertyId } = req.params;

  const user = await User.findById(req.user.id);
  
  const isFavorite = user.favorites.includes(propertyId);

  res.status(200).json({
    status: 'success',
    data: {
      isFavorite
    }
  });
});

exports.getUser = general.getOne(User);
exports.getUsers = general.getAll(User);
exports.updateUser = general.updateOne(User);
exports.deleteUser = general.deleteOne(User);

// Admin: update a user's password safely (hashing via save)
exports.updateUserPassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body || {};

  if (!password) {
    return next(new AppError('Password is required', 400));
  }

  const user = await User.findById(req.params.id).select('+password');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.password = password;
  // Provide confirm if model validator requires it
  if (typeof passwordConfirm !== 'undefined') {
    user.passwordConfirm = passwordConfirm;
  } else {
    user.passwordConfirm = password; // default confirm
  }

  await user.save(); // triggers hashing and validators

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully'
  });
});
// Photo upload endpoint
exports.uploadPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a photo', 400));
  }

  // Validate file type
  if (!req.file.mimetype.startsWith('image/')) {
    return next(new AppError('Invalid file type. Only images are allowed.', 400));
  }

  // Validate file size (additional check)
  if (req.file.size > 5 * 1024 * 1024) {
    return next(new AppError('File size too large. Maximum size is 5MB.', 400));
  }

  // Get current user
  const user = await User.findById(req.user.id);
  
  // Smart photo management: Only delete user's previous photos from Cloudinary
  if (user.photo && user.photo !== 'default.png') {
    await removeUserPhotoFile(user.photo, req.user._id);
  }

  // Upload photo to Cloudinary
  const timestamp = Date.now();
  const publicId = `users/${req.user._id}-${timestamp}`;
  const uploadResult = await uploadImage(req.file.buffer, 'users', publicId);
  const photoUrl = uploadResult.secure_url;

  // Update user with new photo URL in database
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { photo: photoUrl },
    { new: true, runValidators: true }
  );
  console.log("updatedUser😎😎😎😎",updatedUser);

  // Verify database update was successful
  if (!updatedUser) {
    return next(new AppError('Failed to update user photo in database', 500));
  }

  console.log(`✅ Photo uploaded successfully to Cloudinary for user ${req.user._id}`);
  console.log(`✅ Database updated - User photo field:`, updatedUser.photo);

  // Verify database update was successful
  await verifyUserPhotoInDatabase(req.user._id);

  console.log("photoUrl",photoUrl);

  res.status(200).json({
    status: 'success',
    message: 'Photo uploaded successfully',
    data: {
      user: updatedUser,
      photoUrl: photoUrl
    }
  });
});

// Photo remove endpoint
exports.removePhoto = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user.photo || user.photo === 'default.png') {
    return next(new AppError('No photo to remove', 400));
  }

  // Remove photo from Cloudinary
  await removeUserPhotoFile(user.photo, req.user._id);

  // Update user to set default photo in database
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { photo: 'default.png' },
    { new: true, runValidators: true }
  );

  // Verify database update was successful
  if (!updatedUser) {
    return next(new AppError('Failed to update user photo in database', 500));
  }

  console.log(`✅ Photo removed successfully from Cloudinary for user ${req.user._id}`);
  console.log(`✅ Database updated - User photo field:`, updatedUser.photo);

  // Verify database update was successful
  await verifyUserPhotoInDatabase(req.user._id);

  res.status(200).json({
    status: 'success',
    message: 'Photo removed successfully',
    data: {
      user: updatedUser
    }
  });
});

// Admin endpoint to clean up orphaned photos (optional maintenance)
exports.cleanupOrphanedPhotos = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can perform this action', 403));
  }

  // Get all users and their photos
  const allUsers = await User.find({}, 'photo');
  const userPhotos = allUsers.map(u => u.photo).filter(p => p && p !== 'default.png');
  
  // Note: Cloudinary cleanup would require listing all images in the folder
  // This is a simplified version - in production, you might want to use Cloudinary Admin API
  // to list all images in the 'users' folder and compare with database

  res.status(200).json({
    status: 'success',
    message: `Cleanup check completed. Found ${userPhotos.length} user photos in database.`,
    data: {
      totalPhotosInDatabase: userPhotos.length,
      note: 'Cloudinary cleanup requires Admin API access to list all images in folder'
    }
  });
});

// Admin endpoint to get user photo status (for debugging)
exports.getUserPhotoStatus = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can perform this action', 403));
  }

  const { userId } = req.params;
  
  try {
    const user = await User.findById(userId, 'photo name email');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if photo is a Cloudinary URL
    let photoFileExists = false;
    let photoFilePath = '';
    
    if (user.photo && user.photo !== 'default.png') {
      photoFilePath = user.photo;
      // If it's a Cloudinary URL, consider it as existing
      photoFileExists = user.photo.startsWith('http://') || user.photo.startsWith('https://');
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          photo: user.photo
        },
        photoStatus: {
          photoInDatabase: user.photo,
          photoFileExists: photoFileExists,
          photoFilePath: photoFilePath,
          isDefaultPhoto: user.photo === 'default.png',
          isCloudinaryUrl: user.photo && (user.photo.startsWith('http://') || user.photo.startsWith('https://'))
        }
      }
    });
  } catch (error) {
    console.error('Error getting user photo status:', error);
    return next(new AppError('Error getting user photo status', 500));
  }
});

