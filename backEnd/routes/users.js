const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');

// Configure multer with limits (Prevent DoS via large files)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

const {
  getProfile,
  updateProfile,
  changePassword,
  getAvailableMembers,
  getAllUsers,
  deleteUser,
  uploadProfilePicture,
  savePushToken
} = require('../controllers/userController');

// ===============================================
// --- USER ROUTES ---
// ===============================================

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.get('/available-members', protect, getAvailableMembers);

// Profile Picture Upload with Error Handling
router.post('/profile-picture', protect, (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadProfilePicture);

router.post('/save-push-token', protect, savePushToken);

// ===============================================
// --- ADMIN ROUTES ---
// ===============================================
const admin = authorize('admin');

router.get('/admin/all', protect, admin, getAllUsers);
router.delete('/admin/:id', protect, admin, deleteUser);

module.exports = router;