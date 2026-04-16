const mongoose = require('mongoose');

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { isDbConnected };
