const InterestForm = require('../models/InterestFormModel');
const generalControler = require('./generalControler');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Property = require('../models/propertyModel');
const NotificationService = require('../services/notificationService');

exports.submitInterest = catchAsync(async (req, res) => {
  // Check if property exists
  const property = await Property.findById(req.params.PropertyId);
  if (!property) {
    throw new AppError('there is no property with this id', 404);
  }
  //console.log(req.user)
  const check = await InterestForm.find({
    buyerId: req.user._id,
    propertyId: req.params.PropertyId
  });
  //console.log(check);
  if (check.length != 0) {
    throw new AppError('interest is already submit. please update instade of submit new interest', 404);
  }
  const interestForm = new InterestForm({
    buyerId: req.user._id,
    propertyId: req.params.PropertyId,
    contactInfo: {
      name: req.user.name,
      phone: req.user.phone,
      email: req.user.email
    },
    message: req.body.message
  });

  await interestForm.save();

  // Create notification for property owner
  await NotificationService.createInterestNotification(interestForm, property, req.user);

  res.status(201).json({
    status: 'success',
    message: 'Interest form submitted successfully',
    data: {
      data: interestForm
    }
  });
});

exports.getInterests = catchAsync(async (req, res, next) => {
  //console.log(req.user._id)
  const interestForm = await InterestForm.find({ buyerId: req.user._id });

  if (!interestForm) {
    return next(new AppError(`there is no interest form submit still`, 404));
  }

  res.status(200).json({
    status: 'success',
    Result: interestForm.length,
    data: {
      data: interestForm
    }
  });
});

exports.getInterest = catchAsync(async (req, res, next) => {
  /* if(property.owner._id.toString() !== req.user._id.toString() ) {
        throw new AppError('you are not allowed to this',403);
      }
    } */
  //console.log(req.user._id)
  const interestForm = await InterestForm.findById(req.params.id);

  if (!interestForm) {
    return next(new AppError(`there is no interest form submit still`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: interestForm
    }
  });
});

exports.getPropertyInterests = catchAsync(async (req, res, next) => {
  const property = await Property.findById(req.params.PropertyId);
  if (!property) {
    return next(new AppError('Property not found.', 404));
  }

  query = InterestForm.find({ propertyId: req.params.PropertyId });

  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    //console.log(sortBy);
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const skip = (page - 1) * limit;
  if (page >= 1) {
    query = query.skip(skip).limit(limit);
  } else {
    throw new AppError('page number must be greater than 0', 404);
  }

  const total = await InterestForm.countDocuments();
  if (req.query.page) {
    if (skip >= total) throw new AppError('the page is does not exist.', 404);
  }

  const interestForms = await query
    .populate('buyerId', 'name email phone')
    .populate('propertyId', 'title location price');;

  res.json({
    status: 'success',
    Result: interestForms.length,
    data: {
      data: interestForms
    },
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    }
  });
});

// Get all interest forms for a seller
exports.getSellerInterests = catchAsync(async (req, res) => {
  // Get seller's properties
  const properties = await Property.find({ owner: req.params.owner });
  console.log(properties);
  const propertyIds = properties.map(el => el._id);
  //console.log(propertyIds)

  query = InterestForm.find({ propertyId: { $in: propertyIds } })

  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    //console.log(sortBy);
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const skip = (page - 1) * limit;
  if (page >= 1) {
    query = query.skip(skip).limit(limit);
  } else {
    throw new AppError('page number must be greater than 0', 404);
  }

  const total = await InterestForm.countDocuments({ propertyId: { $in: propertyIds } });
  const interestForms = await query
    .populate('buyerId', 'name email phone')
    .populate('propertyId', 'title location price');

  res.json({
    status: 'success',
    Result: interestForms.length,
    data: {
      data: interestForms
    },
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    }
  });
});

// Update interest form status
exports.updateInterestStatus = catchAsync(async (req, res) => {
  const interestForm = await InterestForm.findById(req.params.id);
  if (!interestForm) {
    throw new AppError('Interest form not found', 404);
  }

  // Update status
  interestForm.status = req.body.status;
  if (interestForm.status === 'schedule') {
    interestForm.visitScheduled = true;
    //console.log(new Date(req.body.visitDate).getTime(), Date.now());
    if (new Date(req.body.visitDate).getTime() < Date.now()) {
      throw new AppError('please correct the date and time.', 400);
    }
    interestForm.visitDate = req.body.visitDate;
  }

  await interestForm.save();
  res.json({
    status: 'success',
    message: 'Interest form status updated successfully',
  });
});

exports.updateInterest = generalControler.updateOne(InterestForm);
exports.deleteInterest = generalControler.deleteOne(InterestForm);

// Delete buyer interest (for seller/agent)
exports.deleteBuyerInterest = catchAsync(async (req, res, next) => {
  const interestForm = await InterestForm.findById(req.params.id);

  if (!interestForm) {
    return next(new AppError('Interest form not found', 404));
  }

  // Verify that the seller/agent owns the property this interest is for
  const property = await Property.findById(interestForm.propertyId);
  if (!property) {
    return next(new AppError('Property not found', 404));
  }

  // Check if the current user is the owner of the property
  if (property.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to delete this interest', 403));
  }

  await InterestForm.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    message: 'Buyer interest deleted successfully'
  });
});

