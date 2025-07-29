const multer = require('multer');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const general = require('./generalControler');
const Email=require('../utils/email');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/img/users');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Utility function to check if a photo belongs to a specific user
const isUserPhoto = (photoFilename, userId) => {
  return photoFilename && photoFilename !== 'default.png' && photoFilename.startsWith(userId + '-');
};

// Utility function to safely remove user's photo file
const removeUserPhotoFile = (photoFilename, userId) => {
  if (!isUserPhoto(photoFilename, userId)) {
    console.log(`ℹ️ Photo '${photoFilename}' doesn't belong to user ${userId}, skipping file removal`);
    return false;
  }

  const photoPath = path.join(__dirname, '../uploads/img/users', photoFilename);
  
  try {
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
      console.log(`✅ Photo file removed for user ${userId}:`, photoPath);
      return true;
    } else {
      console.log(`ℹ️ Photo file not found for user ${userId}:`, photoPath);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error removing photo file for user ${userId}:`, error);
    return false;
  }
};

// Utility function to get all photos in the uploads directory
const getAllPhotosInDirectory = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return [];
    }
    return fs.readdirSync(uploadsDir).filter(file => 
      file !== 'default.png' && file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.gif')
    );
  } catch (error) {
    console.error('Error reading uploads directory:', error);
    return [];
  }
};

// Utility function to find orphaned photos (photos not associated with any user)
const findOrphanedPhotos = async () => {
  try {
    const allPhotos = getAllPhotosInDirectory();
    const allUsers = await User.find({}, 'photo');
    const userPhotos = allUsers.map(u => u.photo).filter(p => p && p !== 'default.png');
    
    const orphanedPhotos = allPhotos.filter(photo => !userPhotos.includes(photo));
    return orphanedPhotos;
  } catch (error) {
    console.error('Error finding orphaned photos:', error);
    return [];
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
// Use local storage
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/img/users');
    },
    filename: function (req, file, cb) {
      const ex=file.mimetype.split('/')[1];
      const fileName = `${req.user._id}-${Date.now()}.${ex}`;
      cb(null, fileName);
    }
  });

  // Configure multer
upload = multer({
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

  if (req.file) object.photo = req.file.filename;
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
  
  // Smart photo management: Only delete user's previous photos
  if (user.photo && user.photo !== 'default.png') {
    removeUserPhotoFile(user.photo, req.user._id);
  }

  // Update user with new photo in database
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { photo: req.file.filename },
    { new: true, runValidators: true }
  );
  console.log("updatedUser😎😎😎😎",updatedUser);

  // Verify database update was successful
  if (!updatedUser) {
    return next(new AppError('Failed to update user photo in database', 500));
  }

  console.log(`✅ Photo uploaded successfully for user ${req.user._id}:`, req.file.filename);
  console.log(`✅ Database updated - User photo field:`, updatedUser.photo);

  // Verify database update was successful
  await verifyUserPhotoInDatabase(req.user._id);

  // Return the photo URL for frontend use (correct path)
  const photoUrl = `http://127.0.0.1:5000/img/users/${req.file.filename}`;
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

  // Only remove photo if it belongs to this user
  removeUserPhotoFile(user.photo, req.user._id);

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

  console.log(`✅ Photo removed successfully for user ${req.user._id}`);
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

  const orphanedPhotos = await findOrphanedPhotos();
  let removedCount = 0;

  for (const photo of orphanedPhotos) {
    const photoPath = path.join(uploadsDir, photo);
    try {
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
        removedCount++;
        console.log(`🗑️ Orphaned photo removed:`, photo);
      }
    } catch (error) {
      console.error(`❌ Error removing orphaned photo ${photo}:`, error);
    }
  }

  res.status(200).json({
    status: 'success',
    message: `Cleanup completed. ${removedCount} orphaned photos removed.`,
    data: {
      orphanedPhotosFound: orphanedPhotos.length,
      photosRemoved: removedCount
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

    // Check if photo file exists
    let photoFileExists = false;
    let photoFilePath = '';
    
    if (user.photo && user.photo !== 'default.png') {
      photoFilePath = path.join(uploadsDir, user.photo);
      photoFileExists = fs.existsSync(photoFilePath);
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
          belongsToUser: isUserPhoto(user.photo, userId)
        }
      }
    });
  } catch (error) {
    console.error('Error getting user photo status:', error);
    return next(new AppError('Error getting user photo status', 500));
  }
});

