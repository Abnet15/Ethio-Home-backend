const axios=require('axios');
const crypto = require('crypto');
const Property = require('../models/propertyModel');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');
const PredefinedPlan=require('../models/PredefinedPlan');
const catchAsync=require('../utils/catchAsync');
const AppError=require('../utils/appError');

// Get predefined subscription plans (public endpoint)
exports.getPredefinedPlans = catchAsync(async (req, res, next) => {
  const plans = await PredefinedPlan.find({ isActive: true }).sort({ amount: 1 });
  
  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: plans
  });
});

// Create predefined subscription plan (admin only)
exports.createPredefinedPlan = catchAsync(async (req, res, next) => {
  const plan = await PredefinedPlan.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: plan
  });
});

// Update predefined subscription plan (admin only)
exports.updatePredefinedPlan = catchAsync(async (req, res, next) => {
  const { planId } = req.params;
  const plan = await PredefinedPlan.findByIdAndUpdate(
    planId,
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!plan) {
    return next(new AppError('No predefined plan found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: plan
  });
});

// Delete predefined subscription plan (admin only)
exports.deletePredefinedPlan = catchAsync(async (req, res, next) => {
  const { planId } = req.params;
  const plan = await PredefinedPlan.findByIdAndDelete(planId);
  
  if (!plan) {
    return next(new AppError('No predefined plan found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createSubscriptionPlan = catchAsync(async (req, res, next) => {
  try{
  const subscription= await SubscriptionPlan.findOne({ seller: req.user._id, active: true });
  const userPropertyCount = await Property.countDocuments({ owner: req.user._id , createdAt: { $gte: subscription.lastUpgraded } });
  const subscriptionPlan= await SubscriptionPlan.find({ seller: req.user._id, active: true ,maxProperties: { $gt: userPropertyCount } });

  //console.log(subscriptionPlan);
  if(subscriptionPlan.length){
    throw new AppError('this seller or agent is already set subscription plan',404);
  }
  const {interval, amount, frequency, planId } = req.body;
  if(!frequency){
    req.body.frequency=1;
  }

  if (!interval || !amount) {
    return next(new AppError('Please provide interval and amount', 400));
  }

  // Store plan ID in transaction reference for later lookup
  if (!planId) {
    return next(new AppError('Plan ID is required', 400));
  }
  
  const validIntervals = ['weekly', 'monthly', '3-monthly', '6-monthly', 'annually'];
  if (!validIntervals.includes(interval)) {
    return next(new AppError('Invalid interval. Use weekly, monthly, 3-monthly, 6-monthly, or annually', 400));
  }

  const name=req.user.name.split(' ');
  req.body.email=req.user.email;
  req.body.first_name=name[0];
  req.body.last_name=name[1];
  req.body.phone_number=req.user.phone; 
  req.body.tx_ref=`${planId}-${Date.now()}`; 
  req.body.callback_url= `${req.protocol}://${req.hostname}/api/v1/properties`;
  req.body.return_url=`http://localhost:3000/subscription/verify-payment/${req.body.tx_ref}`;

  const response = await axios.post('https://api.chapa.co/v1/transaction/initialize',req.body,
    {
      headers: {
      Authorization: `Bearer ${process.env.CHAPA_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.data.status !== 'success') {
    return next(new AppError('Failed to create subscription plan', 500));
  }

  const data={...response.data , tx_ref: req.body.tx_ref}
    res.json(data); 
  }catch(error){
    /* console.log(error)
    console.log(error.response.data); */
    res.status(500).json({ error });
  }
});

exports.verifyPayment = catchAsync (async (req, res, next) => {
  //console.log(req.params.tx_ref);
  // Verify the payment
  const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${req.params.tx_ref}`, {
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_API_KEY}`,
    },
  });
//  console.log(response.data);

 if (response.status == 200 && response.data.status == "success") {
      // Extract plan ID from transaction reference and get predefined plan details
      const txRefParts = req.params.tx_ref.split('-');
      const planId = txRefParts[0]; // Format: planId-timestamp
        
      if (!planId) {
        return next(new AppError('Invalid transaction reference format', 400));
      }
     
      try {
        const predefinedPlan = await PredefinedPlan.findById(planId);
        if (predefinedPlan) {
          maxProperties = predefinedPlan.maxProperties;
          interval = predefinedPlan.interval;
          amount = predefinedPlan.amount;
          currency = predefinedPlan.currency;
        } else {
          console.log('Predefined plan not found, using default values');
        }
      } catch (err) {
        console.log('Could not fetch predefined plan, using default values');
      }

      // First, deactivate any existing active subscription
      await SubscriptionPlan.updateMany(
        { seller: req.user._id, active: true },
        { active: false }
      );

      // Create new subscription with reset property count
      // Use the payment tx_ref directly for the subscription
      const subscriptionPlan = await SubscriptionPlan.create({
        seller: req.user._id,
        interval,
        amount,
        currency,
        tx_ref: [req.params.tx_ref], // Use payment tx_ref directly
        frequency: response.data.data.frequency || 1,
        paymentDate: [Date.now()],
        maxProperties: maxProperties,
        active: true,
        lastUpgraded: Date.now(),
      });
      
      // Return updated subscription with reset property count
      res.status(200).json({
        status: 'success',
        data: {
          subscription: subscriptionPlan,
          message: 'Payment verified and property count reset successfully',
          remainingProperties: maxProperties // User now has full property limit
        },
      });
  } else {
    return next(new AppError('Payment verification failed', 500));
  }
});

exports.verifySubscriptionWebhook = catchAsync(async (req, res, next) => {
    // Get the secret key from environment variables
    const secret = process.env.CHAPA_WEBHOOK_SECRET;
    
    // Verify webhook signature
    const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
    
    if (hash !== req.headers['chapa-signature']) {
        return next(new AppError('Invalid webhook signature', 401));
    }

    const event = req.body;

    try {
        switch (event.status) {
            case 'success':
                // Create new subscriptionPlan record
                const subscriptionPlan = await SubscriptionPlan.create({
                    property: event.meta?.propertyId, // Assuming propertyId is passed in meta
                    buyer: event.meta?.userId, // Assuming userId is passed in meta
                    amount: parseFloat(event.amount),
                    currency: event.currency,
                    chapa_charge: parseFloat(event.charge),
                    tx_ref: event.tx_ref,
                    payment_method: event.payment_method,
                    paid: true
                });
                break;

            case 'failed':
                // Handle failed payment
                // You might want to log this or notify someone
                console.log('Payment failed:', event);
                break;

            case 'pending':
                // Handle pending payment
                // You might want to update an existing record or create with paid: false
                console.log('Payment pending:', event);
                break;

            case 'refunding':
                // Handle refunding case
                await SubscriptionPlan.findOneAndUpdate(
                    { tx_ref: event.tx_ref },
                    { paid: false },
                    { new: true }
                );
                break;

            default:
                console.log('Unknown event status:', event.status);
                break;
        }

        // Send success response to Chapa
        res.status(200).json({
            status: 'success'
        });
    } catch (err) {
        console.error('Webhook processing error:', err);
        return next(new AppError('Error processing webhook', 500));
    }
});

exports.getSubscriptionadminPlans = catchAsync(async (req, res, next) => {
  let plans;
  if(req.user.role == 'admin') {
     plans = await SubscriptionPlan.find({ active: true });
  }
  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: plans
  });
});

exports.getSubscriptionPlans = catchAsync(async (req, res, next) => {
  let plans;
  if(req.user.role == 'seller' || req.user.role == 'agent' ) {
     plans = await SubscriptionPlan.find({ seller: req.user._id, active: true });
  }else{
    plans = await SubscriptionPlan.find();
  } 
  
  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: plans
  });
});

// Check if user has active subscription
exports.checkSubscriptionStatus = catchAsync(async (req, res, next) => {
   if (req.user.role === 'seller' || req.user.role === 'agent') {
    const subscriptionPlan = await SubscriptionPlan.findOne({ seller: req.user._id, active: true });
    
    if (!subscriptionPlan) {
      return next(new AppError('No active subscription found. Please subscribe to a plan before creating a property', 403));
    }
    
    const userPropertyCount = await Property.countDocuments({ owner: req.user._id , createdAt: { $gte: subscriptionPlan.lastUpgraded } });
    const remainingProperties = Math.max(0, subscriptionPlan.maxProperties - userPropertyCount);
    
    if (remainingProperties <= 0) {
      return next(new AppError(
        `You have reached your property limit of ${subscriptionPlan.maxProperties} properties. Please upgrade your subscription plan to create more properties.`, 
        403
      ));
    }
    res.status(200).json({
    status: 'success',
    hasActiveSubscription: !!subscriptionPlan,
    data: subscriptionPlan || null,
    userPropertyCount,
    remainingProperties
  });
 }  
});

exports.updateSubscriptionPlan = catchAsync(async (req, res, next) => {
  const { planId } = req.params;                              
  const { interval, amount, frequency } = req.body;
  if (!interval || !amount) {
    return next(new AppError('Please provide interval and amount', 400));
  }     
  const validIntervals = ['weekly', 'monthly', '3-monthly', '6-monthly', 'annually'];
  if (!validIntervals.includes(interval)) {
    return next(new AppError('Invalid interval. Use weekly, monthly, 3-monthly, 6-monthly, or annually', 400));
  }
  const plan = await SubscriptionPlan.findByIdAndUpdate(
    planId,
    { interval, amount, frequency },
    { new: true, runValidators: true }
  );
  if (!plan) {
    return next(new AppError('No subscription plan found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: plan
  })
});

exports.updateSubscriptionstatus = catchAsync(async (req, res, next) => {
  const { planId } = req.params;                
  const { active } = req.body;  
  if (active === undefined) {
    return next(new AppError('Please provide active status', 400));   
  }
  if (typeof active !== 'boolean') {
    return next(new AppError('Active status must be a boolean', 400));
  }
  const plan = await SubscriptionPlan.findByIdAndUpdate(
    planId,
    { active },
    { new: true, runValidators: true }
  );
  if (!plan) {
    return next(new AppError('No subscription plan found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: plan
  });
});

exports.deleteSubscriptionPlan = catchAsync(async (req, res, next) => {
  const { planId } = req.params;

  const plan = await SubscriptionPlan.findByIdAndDelete(planId);
  if (!plan) {
    return next(new AppError('No subscription plan found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null
  });
});
