const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const AppError = require('../utils/appError');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name.']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: [true, 'this email is already used'],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.png'
  },
  phone: {
    type: String,
    required: [true, 'Please provide your phone number'],
    validate: {
      validator: function(phone) {
        // Ethiopian phone number validation (supports +251, 251, 09, 9 formats)
        const ethiopianPhoneRegex = /^(\+251|251|0)?[79]\d{8}$/;
        return ethiopianPhoneRegex.test(phone);
      },
      message: 'Please provide a valid Ethiopian phone number'
    }
  },
  location: {
    type: String,
    //required: true
  },
  address: {
    type: String,
    //required: true
  },
  city: {
    type: String,
    //required: true
  },
  state: {
    type: String,
    //required: true
  },
  role: {
    type: String,
    enum: ['admin','buyer', 'seller', 'agent','employee'],
    default: 'buyer'
  },
   password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8,'password must be more than 7 character'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function(el) {
       // console.log(el, " ",this.password)
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  isVerified:{
    type:Boolean,
    default:false
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }]
});


userSchema.pre('save', async function(next) {
  console.log(this.isModified('password'));
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 12);
     this.passwordConfirm=undefined;
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  // Allow explicit override via query: ?includeInactive=true
  /* const q = this.getQuery();
  if (q && (q.includeInactive === true || q.includeInactive === 'true')) {
    // Remove the flag from the actual Mongo filter
    delete q.includeInactive;
    return next();
  } */
  // Default behavior: exclude inactive non-admins, but always include admins
  this.find({ $or: [ { role: 'admin' }, { active: { $ne: false } } ] });
  next();
});

userSchema.methods.checkPassword = async function(candidatePassword,userPassword) {
  if(!candidatePassword){ throw new AppError('please provid new password',401)};
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to compare password before the user changes his password 
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    //console.log(this.passwordChangedAt.getTime(),this.passwordChangedAt, this.passwordChangedAt.getTime() / 1000);
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000,10);
    return JWTTimestamp < changedTimestamp; 
  }
  // False means password NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 