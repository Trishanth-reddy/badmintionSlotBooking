const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllCourts,
  getCourtById,
  createCourt,
  updateCourt,
  deleteCourt,
} = require('../controllers/courtController');

router.get('/', getAllCourts);
router.get('/:id', getCourtById);
router.post('/', protect, authorize('admin'), createCourt);
router.put('/:id', protect, authorize('admin'), updateCourt);
router.delete('/:id', protect, authorize('admin'), deleteCourt);

module.exports = router;
