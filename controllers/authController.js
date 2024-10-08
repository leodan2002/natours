// const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');


const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id) 

    // sending jwt via cookies
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true // prevent cross-site scripting attack
    }

    user.password = undefined;

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
};

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({status: 'success'});
}

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create(req.body);
    const url = `${req.protocol}://${req.get('host')}/me`;
    console.log(url);
    await new Email(newUser, url).sendWelcome();
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // 1) check if email and password exist
    if(!email || !password){
        return next(new AppError('Please provide email and password', 400))
    }
    // 2) check if user exist && password is correct
    const user = await User.findOne({ email }).select('+password'); // +password since it is not selected in the model
    if(!user || !await (user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401)); // 401 = unauthorized
    }
    // 3) if everything ok, send token to client
    createSendToken(user, 200, res);
});

// protecting tour routes 
exports.protect = catchAsync(async (req, res, next) => {
    let token;
    // 1) Getting token and check of it's there
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt; // authenticate user based on token via cookies
    }
    // console.log(token);
    if (!token) {
        return next(new AppError('You are not logged in. Please log in to get access'), 401)
    }
    // 2) Verification token 
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    
    // 3) Check if user still exists 
    const currentUser = await User.findById(decoded.id);
    if(!currentUser) {
        return next(new AppError('The user belonging to this token is no longer exist', 401));
    }
    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password! Please log in again', 401));
    };
    // Grant access to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
})

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // 1) verify the token
            const decoded = await jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);
        
            // 2) Check if user still exists 
            const currentUser = await User.findById(decoded.id);
            if(!currentUser) {
                return next();
            }
            // 3) Check if user changed password after the token was issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            };
            // There is a logged in user 
            res.locals.user = currentUser;
            return next();
        } catch(err) {
            return next();
        }
    } 
    next();
};

// authorization - user roles and permissions
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin', 'lead-guide']. role='user'
        console.log(req.user)

        if(!roles.includes(req.user.role)){
            console.log(req.user.role)
            return next(new AppError('You do not have permimssion to perform this action', 403)); //403 - forbidden
        } 
        next();
    };
};

// password reset 
exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on Posted email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with email address', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email
    try {
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

        await new Email(user, resetURL).sendPasswordReset();
    
        res.status(200).json({
            status: 'Success',
            message: 'Token sent to email!'
        })
    } catch(err) {
        user.PasswordResetToken = undefined;
        user.PasswordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError('There was an error sending the email. Try again later', 500));
    }
    
})

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({passwordResetToken: hashedToken, passwordResetExpires: {$gte: Date.now()}});
    // 2) if token has not expiered and there is user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    } 
    user.password = req.body.password; 
    user.passwordConfirm = req.body.passwordConfirm; 
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1 Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    // 2) Check if Posted current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong.', 401))
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4) Log user in, send JWT
    createSendToken(user, 200, res);

});