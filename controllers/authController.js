const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const createSendToken = (user, statusCode, req, res) => {
  //console.log(user.verificationToken);
  if(!user.isVerified) throw  new AppError('please verify your email',400);
  const token = jwt.sign({ id: user._id}, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  // Remove output
 user.password = undefined;
 user.isVerified= undefined;
 user.active=undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const user=await User.find({email: req.body.email})
  //console.log(user)
  if(user.length){
    throw new AppError('user already exit',403);
  };
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    photo: req.body.photo,
    phone: req.body.phone,
    location: req.body.location,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state
  });
  const url = `http://localhost:3000/users/verifyEmail/${newUser._id}`;
  //console.log(url);
  await new Email(newUser, url).sendWelcome();
  //createSendToken(newUser, 201, req, res);
  res.status(201).json({
    status: 'success',
    message: 'singin successfully. please verify your emali'
  })
});

exports.sendAgain=catchAsync( async (req,res)=>{
  //refactor not work 

  user= await User.findById(req.params.userId);
  //console.log(user);
  if(!user){throw new AppError('user no found',400);}
  if(user.isVerified){ throw new AppError('email alredy verified',400);}

  const url = `${req.protocol}://${req.get('host')}/api/v1/users/verifyEmail/${user._id}`;
  //console.log(url);
  await new Email(user, url).sendWelcome();
   res.status(201).json({
    status: 'success',
    message: 'link send successfully to your email'
  })
})

exports.verifyEmail= catchAsync( async (req, res, next )=>{
  user= await User.findById(req.params.userId);
  if(user.isVerified){ throw new AppError('link alredy used',400);}
  user.isVerified=true;
  await user.save({validateBeforeSave: false});

  createSendToken(user, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //first check the user send password and email
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  //console.log(user)

  if (!user || !(await user.checkPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  //console.log("protect",req.headers.authorization,req.cookies.jwt);
  // Getting token and check of it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    //console.log(req.headers.authorization);
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  //console.log(token);
  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  //console.log(currentUser);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  //Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! Please log in again.', 401));
  }
  // to use in the next middleware 
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  //Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  //console.log(resetToken);
  await user.save({ validateBeforeSave: false });

  //Send it to user's email
  /* try { */
    const resetURL = `http://localhost:3000/reset-password/${resetToken}`;
    //console.log(resetURL);
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  /* } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!'),500);0}
*/} );

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  
  // Get user based on the hashed token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordChangedAt=Date.now();
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  //Check password is correct
  if (!(await user.checkPassword(req.body.password, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  //If so, update password
  user.password = req.body.currentPassword;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordChangedAt=Date.now();
  await user.save();
  await new Email(user).updatePassword();

  createSendToken(user, 200, req, res);
});
