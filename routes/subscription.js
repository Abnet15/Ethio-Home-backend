const express = require('express');
const authController = require('../controllers/authController');
const subscriptionController=require('../controllers/subscriptionController');
const propertyController=require('../controllers/propertyController')

const router = express.Router({mergeParams: true});

// Public routes
router.route('/plans/predefined').get(subscriptionController.getPredefinedPlans);

router.use(authController.protect);

// Check subscription status
router.route('/check-status').get(authController.restrictTo('seller', 'agent') ,subscriptionController.checkSubscriptionStatus);

router.route('/create-plan').post( authController.restrictTo('seller', 'agent') , subscriptionController.createSubscriptionPlan);
router.route('/plans')
.get(authController.restrictTo('admin','seller', 'agent') , subscriptionController.getSubscriptionPlans);
router.route('/admin/plans')
.get(authController.restrictTo('admin','seller', 'agent') , subscriptionController.getSubscriptionadminPlans);
router.route('/plans/:planId')
.patch(authController.restrictTo('admin','seller', 'agent'), subscriptionController.updateSubscriptionPlan)
.delete(authController.restrictTo('admin'), subscriptionController.deleteSubscriptionPlan)
.put(authController.restrictTo('admin'), subscriptionController.updateSubscriptionstatus);
router.route('/verify-payment/:tx_ref').get(subscriptionController.verifyPayment);
router.route('/verify-subscription-webhook').post(subscriptionController.verifySubscriptionWebhook);

// Admin only routes for predefined plans
router.route('/plans/predefined/create').post(authController.restrictTo('admin'), subscriptionController.createPredefinedPlan);
router.route('/plans/predefined/:planId')
.patch(authController.restrictTo('admin'), subscriptionController.updatePredefinedPlan)
.delete(authController.restrictTo('admin'), subscriptionController.deletePredefinedPlan);

module.exports=router;