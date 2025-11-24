const Court = require('../models/Court');

// @desc    Get all courts
// @route   GET /api/courts
// @access  Public
exports.getAllCourts = async (req, res) => {
  try {
    const courts = await Court.find();
    res.status(200).json({
      success: true,
      count: courts.length,
      data: courts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courts', error: error.message });
  }
};

// @desc    Get court by ID
// @route   GET /api/courts/:id
// @access  Public
exports.getCourtById = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) {
      return res.status(404).json({ message: 'Court not found' });
    }
    res.status(200).json({
      success: true,
      data: court,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching court', error: error.message });
  }
};

// @desc    Create new court (Admin only)
// @route   POST /api/courts
// @access  Private/Admin
exports.createCourt = async (req, res) => {
  try {
    const { name, type, pricePerHour, features, capacity } = req.body;

    const court = new Court({
      name,
      type,
      pricePerHour,
      features: features || [],
      capacity: capacity || 4,
    });

    await court.save();
    res.status(201).json({
      success: true,
      message: 'Court created successfully',
      data: court,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating court', error: error.message });
  }
};

// @desc    Update court (Admin only)
// @route   PUT /api/courts/:id
// @access  Private/Admin
exports.updateCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!court) {
      return res.status(404).json({ message: 'Court not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Court updated successfully',
      data: court,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating court', error: error.message });
  }
};

// @desc    Delete court (Admin only)
// @route   DELETE /api/courts/:id
// @access  Private/Admin
exports.deleteCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndDelete(req.params.id);

    if (!court) {
      return res.status(404).json({ message: 'Court not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Court deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting court', error: error.message });
  }
};
