const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const { 
  getDashboardStats, 
  getAllUsers, 
  extendMembership, 
  deleteUser 
} = require('../controllers/adminController');

// All routes here are protected and require Admin
router.use(protect); 
router.use(admin);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);       // Was: /api/users/admin/all
router.put('/users/:id/extend', extendMembership); // New
router.delete('/users/:id', deleteUser); // Was: /api/users/admin/:id

module.exports = router;