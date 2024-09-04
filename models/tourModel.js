const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel')

// specify a schema for the data
const tourSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // validator
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have less or equal than 40 characters'],
      minLength: [10, 'A tour name must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'] //using external validator 
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: { //used only for string
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // 4.6666 * 10 = 46.666 -> 47 / 10 = 4.7
    },
    ratingsQuantity:{
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: 
      {
        // custom validator -> return true/false
        validator: function(val){ 
          // this only points to current doc on New document creation   
          return val < this.price; 
          },
        message: 'Discount price ({VALUE}) should be below the regular price'
      }
    }, 
    summary: {
      type: String,
      required: [true, 'A tour must have a description'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false

    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    // embedded 
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    // embedded
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    // referencing 
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User' // set up a relationship b.w tourModel and User model
      }, 
    ]
}, {
  toJSON: { virtuals: true }, // want the virtual props to be part of
  toObject: { virtuals: true } 

});

// setting index with the price field to improve performance on the database
// tourSchema.index({price: 1})
tourSchema.index({ price: 1, ratingsAverage: -1 }); // compound indexes 
tourSchema.index({ slug: 1 })
tourSchema.index({ startLocation: '2dsphere' })

// virtual properties - not posted to DB -> cannot be used in query
tourSchema.virtual('durationWeeks').get(function(){ //using regular function to have this keyword
  return this.duration / 7
}); 

// Virtual populate - connect review and tour model 
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

// document middleware - runs before .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true }); // this points to the document
  next();
})


// tourSchema.pre('save', async function(next){
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises)
//   next();
// });



// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// })

// query middleware 
tourSchema.pre(/^find/, function(next){ // trigger with all the strings that start with find
  this.find({ secretTour: { $ne: true }}) //this points to the query object
  this.start = Date.now();
  next();
});

// populate tour guides
tourSchema.pre(/^find/, function(next){
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt' // not showinng irrelevant fields
  });
  next();
});

tourSchema.post(/^find/, function(docs, next){
  console.log(`Query took ${Date.now() - this.start} ms`)
  next();
})


// aggregation middleware
// tourSchema.pre('aggregate', function(next){
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline()); // this points to the aggregation object 
//   next(); 
// })

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
