const express = require('express');
const sellingController = require('../controllers/sellingController');
const authController = require('../controllers/authController');

const router = express.Router({mergeParams: true});

router.use(authController.protect);
router.post('/process-payment',sellingController.paymentinit);
router.get('/verify-payment/:tx_ref',sellingController.paymentverify);
router.post('/verify-payment/webhook',sellingController.paymentVerifyWithWebhook);

router
  .route('/')
  .get(authController.restrictTo('admin','employee','seller','agent','buyer'),sellingController.getAllSelling)
  .post(authController.restrictTo('admin'),sellingController.createSelling);

router.use(authController.restrictTo('admin'));
router.route('/selling-stats')
.get(sellingController.getSellingStats);
router
  .route('/:id')
  .get(sellingController.getSelling)
  .patch(sellingController.updateSelling)
  .delete(sellingController.deleteSelling); 

module.exports = router;
