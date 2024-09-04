const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser')

const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorController')
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes')
const viewRouter = require('./routes/viewRoutes')
const bookingRouter = require('./routes/bookingRoutes')


const app = express();

// setting up Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES

// Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// Security HTTP headers
app.use(helmet());

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://api.mapbox.com",
        "https://cdnjs.cloudflare.com",
        "https://js.stripe.com", // Allow Stripe's script
      ],
      scriptSrcElem: [
        "'self'",
        "https://js.stripe.com", // Allow Stripe's script via script-src-elem
      ],
      styleSrc: [
        "'self'",
        "https://api.mapbox.com",
        "https://fonts.googleapis.com",
      ],
      imgSrc: ["'self'", "https://api.mapbox.com", "data:"],
      connectSrc: [
        "'self'",
        "https://api.mapbox.com",
        "https://events.mapbox.com",
        "https://js.stripe.com",
        "ws://127.0.0.1:*", // Allow WebSocket connections
      ],
      fontSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
      ],
      frameSrc: ["'self'", "https://js.stripe.com"], // Allow framing from Stripe
      objectSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"], // Allow Web Workers from blob URLs
      upgradeInsecureRequests: [],
    },
  })
);


// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit request - protect from DOS and brute force attacks 
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 100 requests/hour for the same IP
  message: 'Too many requests from this IP, please try again in an hour!'
});

app.use('/api',limiter);


// Body parser, reading data from body in req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize()); // remove $ and . 

// Data satnitization against XSS attacks
app.use(xss()); // convert the code input into something else

// preventing parameter solutions
app.use(hpp({
  whitelist: [
    'duration', 'ratingsQuantity', 'maxGroupSize', 'ratingsAverage', 'difficulty', 'price'
  ]
}));


// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log('this is cookie', req.cookies);
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);



// route handler to routes that are not recognized
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); // Express will skip all the middleware stacks and execute the global error handling middleware
})

// error handling middleware
app.use(globalErrorHandler)

module.exports = app;
