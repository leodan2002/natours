module.exports = fn => {
    return (req, res, next) => {
      fn(req, res, next).catch(next); // catch the error if the promise is rejected
    }
  }