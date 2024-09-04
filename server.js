const dotenv = require('dotenv');
const mongoose = require('mongoose');

// catching uncaught exceptions
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! Shutting down....');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

// Accessing the env variable through process.env
// Updating the password for the DB connection
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)

// connect to the hosted DB
mongoose.connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
}).then(() => console.log('DB connection successful'))

// connect to the local DB
// mongoose.connect(process.env.DATABASE_LOCAL...)

const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// handle errors in async code which were not handled
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! Shutting down....');
  console.log(err.name, err.message);
  // let the server have time to finish all the pending tasks/request before closing
  server.close(() => {
    process.exit(1);
  })
});