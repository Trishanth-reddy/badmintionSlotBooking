const express = require('express');
const router = express.Router();
const { 
    getProfile, 
    updateProfile, 
    changePassword,
    getAvailableMembers,
    searchUsers, // <--- NOTE: You must add this function to your controller (code below)
    uploadProfilePicture,
    savePushToken,
    getAllUsers, 
    deleteUser 
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload'); // Ensure you have this middleware (or define multer here)

// --- User Routes ---

// Profile Management
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Team & Member Search
router.get('/available-members', protect, getAvailableMembers);
router.get('/search', protect, searchUsers); // Required for Team Selection Screen

// Uploads & Notifications
router.post('/profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);
router.post('/save-push-token', protect, savePushToken);

// --- Admin Routes ---
router.get('/admin/all', protect, authorize('admin'), getAllUsers);
router.delete('/admin/:id', protect, authorize('admin'), deleteUser);

module.exports = router;