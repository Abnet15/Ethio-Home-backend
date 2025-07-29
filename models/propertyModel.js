const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true,'property must have tital'],
    //unique: [true,'Property titel must be unique'],
  },
  description: {
    type: String,
    required: [true,'property must have description']
  },
  price: {
    type: Number,
    required: [true,'property must have price']
  },
  currency:{
    type:String,
    enum: [ "ETB", "USD"]
  },
  priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          const price =  this.price || this.getUpdate().$set.price;
          return val < (price);
        },
        message: 'Discount price should be below regular price'
      }
    },
  location: {
    type: String,
    required: [true, 'property must have the location ']
  },
  type: {
    type: String,
    enum: ['house', 'apartment', 'villa', 'land', 'commercial'],
    required: [true,'property must have type']
  },
  status: {
    type: String,
    enum: ['for-sale', 'for-rent'],
    required: [true,'property must have status']
  },
  features: {
    bedrooms: Number,
    bathrooms: Number,
    area: Number,
    parking: Boolean,
    furnished: Boolean,
    yearBuilt: Number,
  },
  images: [{
    type: String,
    required: [true,'property must have images']
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true,'property must have owner']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
verificationDate:Date,
verifiedBy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
} ,
  createdAt: {
    type: Date,
    default: Date.now()
  },
  sold:{
    type:Boolean,
    default: false
  }
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

propertySchema.index({createdAt: -1});
propertySchema.index({location: 1});

// Virtual populate
/* propertySchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'property',
  localField: '_id'
}); */

propertySchema.pre(/^find/, function(next) {
  try {
    this.populate({
      path: 'owner',
      select: 'name email photo'
    });
  } catch (error) {
    console.error('Error populating owner:', error);
  }
  next();
});

/* propertySchema.pre(/^find/, function(next) {
  this.find({ sold: { $ne: true } });
  next();
}); */

 const Property= mongoose.model('Property', propertySchema); 
 module.exports = Property;