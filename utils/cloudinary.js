const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dhq297cwg',
  api_key: process.env.CLOUDINARY_API_KEY || '361271383315379',
  api_secret: process.env.CLOUDINARY_API_SECRET // Set in config.env file
};

// Validate Cloudinary configuration
if (!cloudinaryConfig.api_secret) {
  console.error('⚠️ WARNING: CLOUDINARY_API_SECRET is not set in environment variables!');
  console.error('⚠️ Cloudinary uploads will fail without a valid API secret.');
}

cloudinary.config(cloudinaryConfig);

/**
 * Upload an image buffer to Cloudinary
 * @param {Buffer} buffer - Image buffer from multer
 * @param {string} folder - Folder path in Cloudinary (e.g., 'properties', 'users')
 * @param {string} publicId - Public ID for the image (optional, will be auto-generated if not provided)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadImage = (buffer, folder, publicId = null) => {
  return new Promise((resolve, reject) => {
    // Validate inputs
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid buffer provided for upload'));
    }

    if (!folder) {
      return reject(new Error('Folder is required for upload'));
    }

    // Validate Cloudinary configuration
    if (!cloudinaryConfig.api_secret) {
      return reject(new Error('Cloudinary API secret is not configured'));
    }

    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { fetch_format: 'auto', quality: 'auto' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (!result || !result.secure_url) {
          console.error('Cloudinary upload succeeded but no secure_url in result:', result);
          reject(new Error('Upload succeeded but no URL returned from Cloudinary'));
        } else {
          resolve(result);
        }
      }
    );

    // Handle stream errors
    uploadStream.on('error', (error) => {
      console.error('Cloudinary stream error:', error);
      reject(error);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Extract public_id from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} Public ID
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return url; // Already a public_id
  }

  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{public_id}.{format}
    // or: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{format}
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      return url; // Not a valid Cloudinary URL
    }

    // Get everything after 'upload'
    const afterUpload = urlParts.slice(uploadIndex + 1);
    
    // Skip version number if present (format: v1234567890)
    let startIndex = 0;
    if (afterUpload[0] && afterUpload[0].match(/^v\d+$/)) {
      startIndex = 1;
    }

    // Join the remaining parts and remove file extension
    const pathWithExtension = afterUpload.slice(startIndex).join('/');
    const publicId = pathWithExtension.split('.')[0];
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public_id from URL:', error);
    return url; // Return original if extraction fails
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicIdOrUrl - Public ID or Cloudinary URL of the image to delete
 * @returns {Promise<Object>} Cloudinary deletion result
 */
const deleteImage = async (publicIdOrUrl) => {
  try {
    // Extract public_id from URL if a full URL is provided
    const publicId = extractPublicIdFromUrl(publicIdOrUrl);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image'
    });
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

/**
 * Get optimized URL for an image
 * @param {string} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
const getOptimizedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    fetch_format: 'auto',
    quality: 'auto',
    ...options
  };
  return cloudinary.url(publicId, defaultOptions);
};

module.exports = {
  uploadImage,
  deleteImage,
  getOptimizedUrl,
  cloudinary
};

