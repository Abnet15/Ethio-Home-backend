const mongoose = require('mongoose');
const validator=require('validator');

const interestFormSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer ID is required']
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: [true, 'Property ID is required']
  },
  contactInfo: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      //trim: true,
      //match: [/^\+251[0-9]{9}$/, 'Please enter a valid Ethiopian phone number']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email']
    }
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'contacted','schedule', 'visited', 'rejected'],
    default: 'pending'
  },
  visitScheduled: {
    type: Boolean,
    default: false
  },
  visitDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
interestFormSchema.index({ buyerId: 1 });
interestFormSchema.index({ propertyId: 1 });
interestFormSchema.index({ status: 1 });
interestFormSchema.index({ createdAt: -1 });


const InterestForm = mongoose.model('InterestForm', interestFormSchema);

module.exports = InterestForm; 