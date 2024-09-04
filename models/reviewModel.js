const mongoose = require('mongoose');
const slugify = require('slugify');
const Tour = require('./tourModel')

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review cannot be empty']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    }, 
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour', // parent referencing to tour
        required: [true, 'Review must belong to a tour']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // parent referencing to user
        required: [true, 'Review must belong to a user']
    }
}, {
    toJSON: { virtuals: true }, // want the virtual props to be part of
    toObject: { virtuals: true } 
});

// each user can only post a review for a tour -> avoid duplicate reviews
reviewSchema.index({ tour: 1, user: 1}, { unique: true });

// populate the tour and user, instead of showing their Ids
reviewSchema.pre(/^find/, function(next){
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     path: 'user',
    //     select: 'name photo'
    // });
    this.populate({
        path: 'user',
        select: 'name photo'
    });    

    next();
})

reviewSchema.statics.calcAverageRatings = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: {tour: tourId}
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);
    if (stats.length > 0){
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating   
        })
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5   
        })
    }
    
};

reviewSchema.post('save', function() {
    // this points to current review
    // this.constructor points to the tour
    this.constructor.calcAverageRatings(this.tour);
});


// update the new Avf ratings after changing the review
reviewSchema.pre(/^findOneAnd/, async function(next){
    this.r = await this.findOne(); //using this.r to get its access in post
    next();
});

reviewSchema.post(/^findOneAnd/, async function(){
    // await this.findOne(); does not work here bc query has been executed
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;


