const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Department ID is required'],
    unique: true,
    trim: true
  },
  icon: {
    type: String,
    required: [true, 'Icon is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  contact: {
    type: String,
    required: [true, 'Contact email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
departmentSchema.index({ id: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ order: 1 });

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;



