const CatchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { isConnected, executeWithTimeout } = require('../utils/dbConnection');
const Property=require('../models/propertyModel');
const Selling = require('../models/sellingModel');
const User= require('../models/userModel');
const subscriptionPlan=require('../models/propertyModel')

exports.deleteOne = Model =>
  CatchAsync(async (req, res, next) => {
    console.log("Model.modelName");

    const model = await Model.findById(req.params.id);
   // console.log( property.owner._id.toString() !== req.user._id.toString() );
   
    if (!model) {
      throw new AppError(`${Model.modelName} not found`,404);
    }

    if(Model.modelName == 'Property'){
   // Check ownership
    if ((req.user.role == 'seller' || req.user.role == 'agent') && model.owner._id.toString() !== req.user._id.toString() ) {
      throw new AppError('you are not allowed to this',403);
    }
  }

 const doc = await Model.findByIdAndDelete(req.params.id);
  if (!doc) {
      return next(new AppError(`No ${Model.modelName} found with that ID`, 404));
    }

    res.status(204).json({
      status: 'success',
      message: `${Model} deleted successfully`
    });
  });

exports.updateOne = Model =>
  CatchAsync(async (req, res, next) => {
  if(req.files) req.body.images=req.files.map(el=>el.filename);
  if(req.file) req.body.images=req.files.filename;
  //console.log(req.body.password);
  const model = await Model.findById(req.params.id);
    //console.log( property.owner._id.toString() !== req.user._id.toString() );
    if (!model) {
      throw new AppError(`${Model.modelName} not found`,404);
    }

  if(Model.modelName == 'Property'){
    // Check ownership
    if ((req.user.role == 'seller' || req.user.role == 'agent') && model.owner._id.toString() !== req.user._id.toString() ) {
      throw new AppError('you are not allowed to this',403);
    }
  }
  
  //console.log(Model.modelName == 'Property');
  /* console.log('here3');
  console.log(req.body); */
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  

  if (!doc) {
    return next(new AppError(`No ${Model.modelName} found with that ID`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc
    }
  });
});

exports.createOne = Model =>
  CatchAsync(async (req, res, next) => {
    //console.log("here");
    if(req.files) {
    console.log(req.fields);
    req.body.images=req.files.map(el=>el.filename);};
    if(req.file) {
    console.log(req.field);
    req.body.images=req.files.filename;};
    if(req.body.isVerified){req.body.isVerified=false;};//if the seller and agent try to create isVerified is to true
    if(req.query.propertyId & req.query.userId & req.query.price){
      req.body.property=propertyId;
      req.body.user=userId;
      req.body.price=price;
    }
    if(Model.modelName=='Selling'){
      const property=await Property.findById( req.body.property);
      if(!property){
        throw new AppError('property not found. ',404);
      }
      console.log(property.sold);
      if(property.sold){
        throw new AppError('this property is already sold. ',404);
      }
      property.sold=true;
      await property.save(/* {validateBeforeSave: false} */);
    }
    if(Model.modelName=='Review'){
      console.log(req.user._id);
      req.body.buyer=req.user._id;
    }

    if(Model.modelName == 'Property') {
      // Check if the seller or agent have in database in time of creating a property by admin and employee
      if (req.user.role == 'admin' || req.user.role == 'employee') {
       // console.log(req.body.owner);
        const user = await User.findById(req.body.owner);
        //console.log(user);
        // If the user is not found, throw an error
        if (!user) {
          return next(new AppError('user not found', 404));
        }
      }
      // If the user is a seller or agent, set the owner to the user's ID
      if (req.user.role == 'seller' || req.user.role == 'agent') {
        req.body.owner = req.user._id;
        // Ensure newly created properties by sellers/agents are unverified
        req.body.isVerified = false;
        req.body.verifiedBy = undefined;
        req.body.verificationDate = undefined;
      }

      // If created by admin/employee, auto-verify immediately
      if (req.user.role == 'admin' || req.user.role == 'employee') {
        req.body.isVerified = true;
        req.body.verifiedBy = req.user._id;
        req.body.verificationDate = new Date();
      }
    }

    const doc = await Model.create(req.body);
 
    /* if(Model.modelName == 'Property') {
      console.log(req.user._id)
      const subscription= await subscriptionPlan.findById(req.user._id)
      console.log(subscription);
    } */
    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getOne = (Model, Options) =>
  CatchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (Options) query = query.populate(Options);
    let doc = await query;

    if (!doc) {
      return next(new AppError(`No ${Model.modelName} found with that ID`, 404));
    }

    if(Model.modelName ==='Property'){    
      doc={
        ...doc.toObject(),
        imagesUrl: doc.images.map(file => {
          // If file is already a full URL, use it as is
          if (file.startsWith('http://') || file.startsWith('https://')) {
            return file;
          }
          // Otherwise, construct the local URL
          return `http://127.0.0.1:5000/img/properties/${file}`;
        })
      }
    }
    if(Model.modelName ==='User'){  
      doc={
        ...doc.toObject(),
        imagesUrl: `http://127.0.0.1:5000/img/users/${doc.photo}`
      }
    }
    //console.log(doc);
    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getAll = Model =>
  CatchAsync(async (req, res,next) => {
    try {
      // Check MongoDB connection state
      if (!isConnected()) {
        throw new AppError('Database connection is not ready. Please try again in a moment.', 503);
      }

      // To allow for nested for reviews route
      let filter = {};
      if (`req.params.${Model}Id`) filter = { Model: `req.params.${Model}Id` };
    
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach(el => delete queryObj[el]);
      
      let query;
      if(Model.modelName ==='Property'){
        query = Model.find();
        query = query.find(queryObj);
      }else{
        query = Model.find(queryObj);
      }
  
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
    if(page>=1){
      query = query.skip(skip).limit(limit);  
    }else{
      throw new AppError('page number must be greater than 0',404);
    }
  
    // Use countDocuments with the same filter for accurate count
    let countQuery;
    if(Model.modelName ==='Property'){
      countQuery = Model.countDocuments(queryObj);
    } else {
      countQuery = Model.countDocuments(queryObj);
    }
    
    // Execute count with timeout handling
    const total = await executeWithTimeout(
      () => countQuery,
      15000
    ).catch((err) => {
      console.error(`CountDocuments error for ${Model.modelName}:`, err);
      // Return 0 if count fails, but still try to get the documents
      return 0;
    });
    
    if(req.query.page){
      if(skip>=total && total > 0) throw new AppError('the page is does not exist.',404);
    }
  
    // Execute query with timeout handling
    let doc = await executeWithTimeout(
      () => query.exec(),
      20000
    ).catch((err) => {
      console.error(`Query execution error for ${Model.modelName}:`, err);
      throw new AppError(`Failed to fetch ${Model.modelName} data: ${err.message}`, 500);
    });

 if(Model.modelName ==='Property'){
      doc=doc.map(el=>({
        ...el.toObject(),
        imagesUrl: el.images.map(file => {
          // If file is already a full URL, use it as is
          if (file.startsWith('http://') || file.startsWith('https://')) {
            return file;
          }
          // Otherwise, construct the local URL
          return `http://127.0.0.1:5000/img/properties/${file}`;
        })
      }))
    }

    if(Model.modelName ==='User'){
      doc=doc.map(el=>({
        ...el.toObject(),
        imagesUrl: `http://127.0.0.1:5000/img/users/${el.photo}`
      }))
    }

      res.status(200).json({
        status: 'success',
        results: doc.length,
        pageNumber: Number(page),
        pages: Math.ceil(total / limit),
        data: {
          data: doc
        }
      });
    } catch (error) {
      console.error(`Error in getAll for ${Model.modelName}:`, error);
      
      // Check if it's a MongoDB connection error
      if (error.name === 'MongoServerSelectionError' || 
          error.name === 'MongoNetworkError' ||
          error.message.includes('buffering timed out') ||
          error.message.includes('connection')) {
        return next(new AppError(
          `Database connection error. Please check your MongoDB connection and try again.`, 
          503
        ));
      }
      
      return next(new AppError(`Failed to fetch ${Model.modelName} data: ${error.message}`, 500));
    }
  });
