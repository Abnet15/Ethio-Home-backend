const express=require('express');
const interestController = require('../controllers/interestController');
const authController=require('../controllers/authController');

const router = express.Router({mergeParams: true});

router.use(authController.protect);
// Routes for buyer
router.route('/buyer')
.get(interestController.getInterests)
.post(interestController.submitInterest)

router.route('/buyer/:id')
.get(interestController.getInterest)
.patch(interestController.updateInterest)
.delete(interestController.deleteInterest);

// Get interests for seller/agent by owner ID
router.route('/:owner')
.get(authController.restrictTo('admin','seller','agent','employee'),
interestController.getSellerInterests);

// Delete buyer interest (for seller/agent to remove buyer interest)
router.route('/buyer/:id/delete')
.delete(authController.restrictTo('admin','seller','agent','employee'),
interestController.deleteBuyerInterest);

//Routes for Adminin
router.use(authController.restrictTo('admin','employee'));
router.route('/').get(interestController.getPropertyInterests)
router.patch('/status/:id',interestController.updateInterestStatus);

module.exports = router; 