const express = require('express');
const contactController = require('./../controllers/contactController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Public routes - no authentication required
router.get('/departments', contactController.getContactDepartments);
router.get('/faqs', contactController.getContactFAQs);
router.post('/faqs/:id/rate', contactController.rateFAQ);
router.post('/', contactController.submitContact);
router.post('/submit', contactController.submitContact);

// Protected routes - admin and employee
router.use(authController.protect);
router.get('/:id', contactController.getContact);
router.use(authController.restrictTo('admin', 'employee'));

// Routes accessible by both admin and employee
router.get('/', contactController.getAllContacts);
router.get('/stats', contactController.getContactStats);
router.patch('/:id', contactController.updateContactStatus);
router.post('/:id/notes', contactController.addNote);

// Admin-only routes
router.use(authController.restrictTo('admin'));
router.delete('/:id', contactController.deleteContact);
router.patch('/:id/assign', contactController.assignContact);

// Department management routes (admin only)
router.get('/admin/departments', contactController.getAllDepartments);
router.post('/admin/departments', contactController.createDepartment);
router.patch('/admin/departments/:id', contactController.updateDepartment);
router.delete('/admin/departments/:id', contactController.deleteDepartment);

// FAQ management routes (admin only)
router.get('/admin/faqs', contactController.getAllFAQs);
router.post('/admin/faqs', contactController.createFAQ);
router.patch('/admin/faqs/:id', contactController.updateFAQ);
router.delete('/admin/faqs/:id', contactController.deleteFAQ);

module.exports = router;
