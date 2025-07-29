const mongoose = require('mongoose');

const sellingSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: [true, 'selling must have property']
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'selling must belong to a User!']
  },
  amount: {
    type: Number,
    require: [true, 'selling must have a Amount.']
  },
  currency:String,
  chapa_charge:Number,
  tx_ref: String,
  payment_method:String,
  createdAt: {
    type: Date,
    default: Date.now()
  },
  paid: {
    type: Boolean,
    default: true
  }
});

sellingSchema.pre(/^find/, function(next) {
  this.populate('buyer').populate({
    path: 'property',
    select: 'name title location price bedrooms bathrooms images sold isVerified owner'
  })
  next();
});

const Selling = mongoose.model('Selling', sellingSchema);

module.exports = Selling;
