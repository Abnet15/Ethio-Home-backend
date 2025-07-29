const mongoose = require('mongoose');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Contact = require('./../models/contactModel');
const Department = require('./../models/departmentModel');
const FAQ = require('./../models/faqModel');
const NotificationService = require('./../services/notificationService');

// Submit contact form (public)
exports.submitContact = catchAsync(async (req, res, next) => {
  let { name, email, phone, subject, message, inquiryType, sender } = req.body;
  const objectId = new mongoose.Types.ObjectId(sender);

  // Validate required fields
  if (!name || !email || !message || !sender) {
    return next(new AppError('Name, email, message, and sender are required', 400));
  }
  // Create contact inquiry
  const contact = await Contact.create({
    name,
    email,
    phone,
    subject,
    message,
    inquiryType: inquiryType || 'general',
    status: 'new',
    priority: 'medium',
    sender: objectId
  });

  res.status(201).json({
    status: 'success',
    data: {
      contact
    }
  });
});

// Get all contact inquiries (admin/employee)
exports.getAllContacts = catchAsync(async (req, res, next) => {
  const filter = {};
  
  // Apply filters if provided
  if (req.query.status) filter.status = req.query.status;
  if (req.query.inquiryType) filter.inquiryType = req.query.inquiryType;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const contacts = await Contact.find(filter)
    .populate('assignedTo', 'name email')
    .populate('respondedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: contacts.length,
    data: {
      contacts,
      userRole: req.user.role,
      permissions: {
        canDelete: req.user.role === 'admin',
        canUpdate: true,
        canAssign: req.user.role === 'admin',
        canRespond: true
      }
    }
  });
});

// Get contact by ID (admin/employee)
exports.getContact = catchAsync(async (req, res, next) => {
  try {
    let contact;

  if(req.user.role == 'admin' || req.user.role == 'employee') {
    contact = await Contact.find({sender: req.user._id})
    .populate('assignedTo', 'name email')
    .populate('respondedBy', 'name email')
    .populate('notes.addedBy', 'name email');

  }else{
     contact= await Contact.find({sender: req.user._id})
    .populate('assignedTo', 'name email')
    .populate('respondedBy', 'name email')
    .populate('notes.addedBy', 'name email');
  }

  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      contact,
      userRole: req.user.role,
      permissions: {
        canDelete: req.user.role === 'admin',
        canUpdate: true,
        canAssign: req.user.role === 'admin',
        canRespond: true
      }
    }
  });
  }catch(error){
  console.error('Error fetching contact:', error);
  return next(new AppError('Error fetching contact', 500));
} 
});

// Update contact status and respond (admin/employee)
exports.updateContactStatus = catchAsync(async (req, res, next) => {
  const { status, adminResponse, employeeResponse, priority, assignedTo, tags } = req.body;

  const contact = await Contact.findById(req.params.id);
  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }

  // Prepare update data
  const updateData = {};
  
  // Status can be updated by both admin and employee
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (tags) updateData.tags = tags;

  // Only admin can assign contacts
  if (assignedTo && req.user.role === 'admin') {
    updateData.assignedTo = assignedTo;
    updateData.assignedAt = Date.now();
  }

  // Response handling based on role
  if (req.user.role === 'admin') {
    if (adminResponse) {
      updateData.adminResponse = adminResponse;
      updateData.respondedBy = req.user._id;
      updateData.respondedAt = Date.now();
    }
  } else if (req.user.role === 'employee') {
    if (employeeResponse) {
      updateData.employeeResponse = employeeResponse;
      updateData.respondedBy = req.user._id;
      updateData.respondedAt = Date.now();
    }
  }

  const updatedContact = await Contact.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('assignedTo', 'name email')
   .populate('respondedBy', 'name email');

  // Create notification if a response was added
  if (adminResponse || employeeResponse) {
    try {
      await NotificationService.createContactResponseNotification(
        updatedContact,
        adminResponse || employeeResponse,
        req.user
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Don't fail the main request if notification fails
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      contact: updatedContact,
      message: 'Contact updated successfully. User will be notified of the response.'
    }
  });
});

// Add note to contact (admin/employee)
exports.addNote = catchAsync(async (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    return next(new AppError('Note content is required', 400));
  }

  const contact = await Contact.findById(req.params.id);
  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }

  const note = {
    content,
    addedBy: req.user._id
  };

  contact.notes.push(note);
  await contact.save();

  const updatedContact = await Contact.findById(req.params.id)
    .populate('assignedTo', 'name email')
    .populate('respondedBy', 'name email')
    .populate('notes.addedBy', 'name email');

  res.status(200).json({
    status: 'success',
    data: {
      contact: updatedContact
    }
  });
});

// Delete contact (admin only)
exports.deleteContact = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can delete contacts', 403));
  }

  const contact = await Contact.findByIdAndDelete(req.params.id);

  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get contact statistics (admin/employee)
exports.getContactStats = catchAsync(async (req, res, next) => {
  const stats = await Contact.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const priorityStats = await Contact.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  const typeStats = await Contact.aggregate([
    {
      $group: {
        _id: '$inquiryType',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalContacts = await Contact.countDocuments();
  const newContacts = await Contact.countDocuments({ status: 'new' });
  const inProgressContacts = await Contact.countDocuments({ status: 'in-progress' });
  const resolvedContacts = await Contact.countDocuments({ status: 'resolved' });
  const closedContacts = await Contact.countDocuments({ status: 'closed' });

  res.status(200).json({
    status: 'success',
    data: {
      stats,
      priorityStats,
      typeStats,
      totalContacts,
      newContacts,
      inProgressContacts,
      resolvedContacts,
      closedContacts
    }
  });
});

// Assign contact to employee (admin only)
exports.assignContact = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can assign contacts', 403));
  }

  const { assignedTo } = req.body;

  if (!assignedTo) {
    return next(new AppError('Employee ID is required for assignment', 400));
  }

  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    {
      assignedTo,
      assignedAt: Date.now()
    },
    { new: true, runValidators: true }
  ).populate('assignedTo', 'name email')
   .populate('respondedBy', 'name email');

  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      contact
    }
  });
});

// Get contact departments (public)
exports.getContactDepartments = catchAsync(async (req, res, next) => {
  const departments = await Department.find({ isActive: true })
    .sort({ order: 1, title: 1 });

  res.status(200).json({
    status: 'success',
    data: {
      departments
    }
  });
});

// Get contact FAQs (public)
exports.getContactFAQs = catchAsync(async (req, res, next) => {
  const filter = { isActive: true };
  
  // Apply category filter if provided
  if (req.query.category) {
    filter.category = req.query.category;
  }

  // Apply search filter if provided
  if (req.query.search) {
    filter.$or = [
      { question: { $regex: req.query.search, $options: 'i' } },
      { answer: { $regex: req.query.search, $options: 'i' } },
      { tags: { $in: [new RegExp(req.query.search, 'i')] } }
    ];
  }

  const faqs = await FAQ.find(filter)
    .sort({ order: 1, category: 1, question: 1 });

  res.status(200).json({
    status: 'success',
    results: faqs.length,
    data: {
      faqs
    }
  });
});

// Admin functions for managing departments

// Get all departments (admin only)
exports.getAllDepartments = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can access all departments', 403));
  }

  const departments = await Department.find()
    .sort({ order: 1, title: 1 });

  res.status(200).json({
    status: 'success',
    results: departments.length,
    data: {
      departments
    }
  });
});

// Create new department (admin only)
exports.createDepartment = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can create departments', 403));
  }

  const department = await Department.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      department
    }
  });
});

// Update department (admin only)
exports.updateDepartment = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can update departments', 403));
  }

  const department = await Department.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!department) {
    return next(new AppError('No department found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      department
    }
  });
});

// Delete department (admin only)
exports.deleteDepartment = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can delete departments', 403));
  }

  const department = await Department.findByIdAndDelete(req.params.id);

  if (!department) {
    return next(new AppError('No department found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Admin functions for managing FAQs

// Get all FAQs (admin only)
exports.getAllFAQs = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can access all FAQs', 403));
  }

  const filter = {};
  
  // Apply filters if provided
  if (req.query.category) filter.category = req.query.category;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const faqs = await FAQ.find(filter)
    .sort({ order: 1, category: 1, question: 1 });

  res.status(200).json({
    status: 'success',
    results: faqs.length,
    data: {
      faqs
    }
  });
});

// Create new FAQ (admin only)
exports.createFAQ = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can create FAQs', 403));
  }

  const faq = await FAQ.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      faq
    }
  });
});

// Update FAQ (admin only)
exports.updateFAQ = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can update FAQs', 403));
  }

  const faq = await FAQ.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!faq) {
    return next(new AppError('No FAQ found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      faq
    }
  });
});

// Delete FAQ (admin only)
exports.deleteFAQ = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can delete FAQs', 403));
  }

  const faq = await FAQ.findByIdAndDelete(req.params.id);

  if (!faq) {
    return next(new AppError('No FAQ found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Rate FAQ helpfulness (public)
exports.rateFAQ = catchAsync(async (req, res, next) => {
  const { helpful } = req.body; // true for helpful, false for not helpful

  if (typeof helpful !== 'boolean') {
    return next(new AppError('Helpful rating must be true or false', 400));
  }

  const updateField = helpful ? 'helpful' : 'notHelpful';
  
  const faq = await FAQ.findByIdAndUpdate(
    req.params.id,
    { $inc: { [updateField]: 1 } },
    { new: true }
  );

  if (!faq) {
    return next(new AppError('No FAQ found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      faq,
      message: `Thank you for your feedback!`
    }
  });
});
