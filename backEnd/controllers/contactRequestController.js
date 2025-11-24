const ContactRequest = require('../models/contactModel');
const asyncHandler = require('express-async-handler');

/**
 * @desc    User: Submit a contact form
 * @route   POST /api/contact
 * @access  Private
 */
exports.submitContactForm = asyncHandler(async (req, res) => {
  const { subject, message, priority } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ message: 'Subject and message are required' });
  }

  const request = await ContactRequest.create({
    user: req.user.id,
    subject,
    message,
    priority: priority || 'Medium',
  });

  res.status(201).json({
    success: true,
    message: 'Your request has been submitted successfully!',
    data: request,
  });
});

/**
 * @desc    Admin: Get all contact requests
 * @route   GET /api/contact/admin/all
 * @access  Private/Admin
 */
exports.getAllRequests = asyncHandler(async (req, res) => {
  const requests = await ContactRequest.find({})
    .populate('user', 'fullName email phone')
    .sort({ createdAt: -1 }); // Show newest first

  // Get stats
  const stats = {
    total: requests.length,
    new: requests.filter(r => r.status === 'New').length,
    urgent: requests.filter(r => r.priority === 'High' && r.status !== 'Resolved').length,
  };

  res.status(200).json({
    success: true,
    data: requests,
    stats: stats,
  });
});

/**
 * @desc    Admin: Update a request's status
 * @route   PUT /api/contact/admin/:id
 * @access  Private/Admin
 */
exports.updateRequestStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const request = await ContactRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
  }

  request.status = status || request.status;
  request.notes = notes || request.notes;
  
  const updatedRequest = await request.save();

  res.status(200).json({
    success: true,
    message: 'Request status updated',
    data: updatedRequest,
  });
});

/**
 * @desc    Admin: Delete a request
 * @route   DELETE /api/contact/admin/:id
 * @access  Private/Admin
 */
exports.deleteRequest = asyncHandler(async (req, res) => {
  const request = await ContactRequest.findByIdAndDelete(req.params.id);

  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
  }

  res.status(200).json({
    success: true,
    message: 'Request deleted',
  });
});
