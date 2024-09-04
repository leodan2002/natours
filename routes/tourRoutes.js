const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController')
const reviewRouter = require('./../routes/reviewRoutes')
const router = express.Router();

// POST /tour/2312312sada/reviews - nested route 
// GET /tour/2312312sada/reviews/9853bknb - nested route 
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect, 
//     authController.restrictTo('user'), 
//     reviewController.createReview
//   );

// on this specific route /:tourId/reviews, we want to use reviewRouter
router.use('/:tourId/reviews', reviewRouter);

// router.param('id', tourController.checkID);

// Aliasing for common query/routes using a middleware to modify the query before accessing getAllTours
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats)
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect, 
    authController.restrictTo('admin', 'lead-guide', 'guide'), 
    tourController.getMonthlyPlan
  )

// geospartial queries: finding tours within radius
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within/233/center/-40,45/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect, 
    authController.restrictTo('admin', 'lead-guide'), 
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect, 
    authController.restrictTo('admin', 'lead-guide'), 
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect, 
    authController.restrictTo('admin', 'lead-guide'), 
    tourController.deleteTour
  );

module.exports = router;
