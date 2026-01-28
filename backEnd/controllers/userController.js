const asyncHandler = require('express-async-handler');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinaryConfig');
const User = require('../models/User');

// Configure multer storage (In Memory)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password').lean();

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, bio, profilePicture, preferences } = req.body;

  // Whitelist allowed updates
  const updateData = {};
  if (fullName) updateData.fullName = fullName.trim();
  if (phone) updateData.phone = phone.trim();
  if (bio) updateData.bio = bio.trim();
  if (profilePicture) updateData.profilePicture = profilePicture;
  if (preferences) updateData.preferences = preferences;

  const user = await User.findByIdAndUpdate(req.user.id, updateData, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
      return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Please provide all password fields' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New passwords do not match' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const user = await User.findById(req.user.id).select('+password');

  if (!user || !(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

// @desc    Get available members for booking (With Search)
// @route   GET /api/users/available-members
// @access  Private
exports.getAvailableMembers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const now = new Date();

  const query = {
    role: 'user',
    _id: { $ne: req.user.id },
  };

  if (search && search.trim().length > 0) {
    const q = search.trim();
    query.$or = [
      { fullName: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ];
  }

  const members = await User.find(query)
    .select('fullName email phone membership profilePicture')
    .sort({ fullName: 1 })
    .lean();

  const enrichedMembers = members.map(m => {
    const membership = m.membership || {};
    let daysLeft = 0;
    
    if (membership.expiryDate) {
      const expiry = new Date(membership.expiryDate);
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)); 
      daysLeft = diffDays > 0 ? diffDays : 0;
    } else {
      daysLeft = membership.daysLeft || 0;
    }

    return {
      ...m,
      membership: {
        ...membership,
        daysLeft,
        status: daysLeft > 0 ? 'Active' : 'Inactive' 
      },
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedMembers.length,
    data: enrichedMembers,
  });
});

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
exports.uploadProfilePicture = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'profile_pictures',
            resource_type: 'image',
            format: 'jpg',
            quality: 'auto:good', // Automatic optimization
            transformation: [{ width: 500, height: 500, crop: "limit" }] // Limit size
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    try {
      const result = await streamUpload();

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { profilePicture: result.secure_url },
        { new: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: 'Profile picture updated',
        profilePicture: result.secure_url,
        user,
      });
    } catch (error) {
      console.error('Cloudinary Error:', error);
      res.status(500).json({ message: 'Image upload failed', error: error.message });
    }
});

// @desc    Save user's Expo Push Token
// @route   POST /api/users/save-push-token
// @access  Private
exports.savePushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  // Atomic update for nested field
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { 'membership.expoPushToken': token } },
    { new: true }
  ).select('_id fullName membership');

  if (updatedUser) {
    // Only log first/last few chars for security/privacy in logs
    console.log(`✅ Token saved for ${updatedUser.fullName}`);
    res.status(200).json({ success: true, message: 'Token saved' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});



// @desc    Search ALL users (for Team Selection)
// @route   GET /api/users/search
// @access  Private
exports.searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: "Please provide a search term" });
  }

  // Regex Search: Matches Name OR Phone (Case-insensitive)
  const users = await User.find({
    $or: [
      { fullName: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } }
    ]
  })
  .select('_id fullName phone profilePicture role') 
  .limit(20); 

  res.status(200).json({
    success: true,
    data: users
  });
});