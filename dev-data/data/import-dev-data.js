const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');
const Tour = require('./../../models/tourModel');
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');

dotenv.config({ path: './config.env' });

// Accessing the env variable through process.env
// Updating the password for the DB connection
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)

// connect to the hosted DB
mongoose.connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true, // Add this line
    useCreateIndex: true,
    useFindAndModify: false
  }).then(() => console.log('DB connection successful'));

// Read Json file and convert it into JS Objects
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));


// const tours = JSON.parse(fs.readFileSync(`${__dirname}/data/tours-simple.json`, 'utf-8'));

// Import data into DB
const importData = async () => {
    try {
        await Tour.create(tours);
        await User.create(users, { validateBeforeSave: false });
        await Review.create(reviews);

        console.log('Data successfully loaded!');

    } catch (err) {
        console.log(err)
    }
    process.exit();

}

// DELETE all data from Collection 
const deleteData = async () => {
    try {
        await Tour.deleteMany();
        await Review.deleteMany();
        await User.deleteMany();

        console.log('Data successfully deleted!')
    } catch (err) {
        console.log(err)
    }
    process.exit();

}

// node import-dev-data.js --import

// node import-dev-data.js --delete

if (process.argv[2] === '--import') {
    importData()
} else if (process.argv[2] === '--delete') {
    deleteData()
}

console.log(process.argv);
