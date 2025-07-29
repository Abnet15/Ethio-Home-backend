const Selling = require('../models/sellingModel');
const general = require('./generalControler');
const axios = require('axios');
const AppError = require('../utils/appError');
const catchAsync= require('../utils/catchAsync');
const Property=require('../models/propertyModel');

exports.paymentinit=catchAsync( async (req, res) => {
  const property= await Property.findById(req.params.PropertyId);
    if(!property){
      throw new AppError('this property is not found',404);
    }
    if(property.sold){
      throw new AppError('this property already sold',403);
    }
  try {
    const name=req.user.name.split(' ');
    req.body.amount="10000";//the vaule is property.price The amount must not exceed 1000000.
    req.body.currency=property.currency || "ETB";
    req.body.email=req.user.email;
    req.body.first_name=name[0];
    req.body.last_name=name[1];
    req.body.phone_number=req.user.phone; 
    req.body.callback_url= `${req.protocol}://${req.hostname}/api/v1/properties`;
    req.body.tx_ref=`${property._id}-${Date.now()}`; 
    req.body.return_url=`http://localhost:3000/selling/verify-payment/${req.body.tx_ref}`;
    
    const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', req.body , {
      headers: {
        'Authorization': `Bearer ${process.env.CHAPA_API_KEY}`, 
        'Content-Type': 'application/json'
      }
    });

    const data={...response.data , tx_ref: req.body.tx_ref}
    res.json(data); 
  } catch (error) {
   console.error( error.message);
    res.status(500).json({ error });
  }
});

exports.paymentverify=catchAsync( async (req, res) => {
  console.log(req.params.tx_ref);
  
  try {
    const existingSelling = await Selling.findOne({ tx_ref: req.params.tx_ref });

    if (existingSelling) {
      console.log("inside if");
      return res.status(200).json({
        status: 'success',
        message: 'Payment already processed',
        data: existingSelling
      });
    }
    const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${req.params.tx_ref}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CHAPA_API_KEY}` 
      }
    });

   console.log(response.data);

    if(response.status===200 && response.data.data.status== "success"){

      const selling= await Selling.create({
       property: response.data.data.tx_ref.split('-')[0],
       buyer: req.user._id,
       amount: response.data.data.amount,
       currency: response.data.data.currency,
       chapa_charge: response.data.data.charge,
       tx_ref: response.data.data.tx_ref,
       payment_method: response.data.data.method
      });
      
      const property=await Property.findById(response.data.data.tx_ref.split('-')[0]);
      property.sold=true;
      await property.save(/* {validateBeforeSave: false} */);
      console.log("selling finished successfully");
      //console.log(selling);
    };
    
    res.json(response.data);
  } catch (error) {
    console.log("error");
    console.log(response.data);
    return next(new AppError('Error verifying payment', 500));
  }
});

exports.paymentVerifyWithWebhook = catchAsync(async (req, res, next) => {
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
                // Create new selling record
                const selling = await Selling.create({
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
                await Selling.findOneAndUpdate(
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

exports.getSellingStats=catchAsync( async (req, res, next) => {
  try {
    const stats = await Selling.aggregate([
      // Stage 1: Group by payment status, payment method, and currency
      {
        $group: {
          _id: {
            paid: '$paid',
            payment_method: '$payment_method',
            currency: '$currency'
          },
          totalSales: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          totalChapaCharge: { $sum: '$chapa_charge' }
        }
      },
      // Stage 2: Group by payment status to get overall stats
      {
        $group: {
          _id: '$_id.paid',
          paymentMethods: {
            $push: {
              payment_method: '$_id.payment_method',
              currency: '$_id.currency',
              totalSales: '$totalSales',
              totalAmount: '$totalAmount',
              avgAmount: '$avgAmount',
              totalChapaCharge: '$totalChapaCharge'
            }
          },
          totalSalesByStatus: { $sum: '$totalSales' },
          totalAmountByStatus: { $sum: '$totalAmount' },
          avgAmountByStatus: { $avg: '$avgAmount' },
          totalChapaChargeByStatus: { $sum: '$totalChapaCharge' }
        }
      },
      // Stage 3: Project the final output
      {
        $project: {
          paidStatus: '$_id',
          totalSales: '$totalSalesByStatus',
          totalAmount: { $round: ['$totalAmountByStatus', 2] },
          avgAmount: { $round: ['$avgAmountByStatus', 2] },
          totalChapaCharge: { $round: ['$totalChapaChargeByStatus', 2] },
          paymentMethods: 1,
          _id: 0
        }
      },
      // Stage 4: Sort by paid status
      {
        $sort: { paidStatus: -1 }
      }
    ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
      
    }
  });
  }
  catch (err) {
    console.error('Error generating selling stats:', err);
    throw new Error('Failed to generate statistics');
  }
});
exports.createSelling = general.createOne(Selling);
exports.getSelling = general.getOne(Selling);
exports.getAllSelling = general.getAll(Selling);
exports.updateSelling = general.updateOne(Selling);
exports.deleteSelling = general.deleteOne(Selling);
