const mongoose = require('mongoose');

// Create a separate model for predefined subscription plans
const predefinedPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A plan must have a name'],
   // unique: true,
  },
  interval: {
    type: String,
    required: [true, 'A plan must have an interval'],
    enum: {
      values: ['weekly', 'monthly', '3-monthly', '6-monthly', 'annually'],
      message: 'Interval must be weekly, monthly, 3-monthly, 6-monthly, or annually',
    },
  },
  amount: {
    type: Number,
    required: [true, 'A plan must have an amount'],
    min: [0, 'Amount must be positive'],
  },
  frequency: {
    type: Number,
    required: [true, 'A plan must have a frequency'],
    min: [1, 'Frequency must be at least 1'],
  },
  currency: {
    type: String,
    required: [true, 'A plan must have a currency'],
    enum: {
      values: ['ETB', 'USD'],
      message: 'Currency must be ETB or USD',
    },
    default: 'ETB',
  },
  description: {
    type: String,
    required: [true, 'A plan must have a description'],
  },
  features: [{
    type: String,
    required: [true, 'A plan must have features'],
  }],
  maxProperties: {
    type: Number,
    required: [true, 'A plan must specify maximum properties allowed'],
    min: [1, 'Maximum properties must be at least 1'],
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PredefinedPlan = mongoose.model('PredefinedPlan', predefinedPlanSchema);

module.exports =  PredefinedPlan ;