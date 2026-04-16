const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const memoryStorage = require('../utils/memoryStorage');
const { isDbConnected } = require('../utils/dbStatus');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (isDbConnected()) {
      const userExists = await User.findOne({ username });
      if (userExists) {
        res.status(400);
        throw new Error('User already exists');
      }
      const user = await User.create({ username, password });
      if (user) {
        res.status(201).json({
          _id: user._id,
          username: user.username,
          token: generateToken(user._id),
        });
      } else {
        res.status(400);
        throw new Error('Invalid user data');
      }
    } else {
      // In-memory register
      const userExists = memoryStorage.users.find(u => u.username === username);
      if (userExists) {
        res.status(400);
        throw new Error('User already exists');
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const user = { _id: Date.now().toString(), username, password: hashedPassword };
      memoryStorage.users.push(user);
      res.status(201).json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    next(error);
  }
};

const authUser = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (isDbConnected()) {
      const user = await User.findOne({ username });
      if (user && (await user.matchPassword(password))) {
        res.json({
          _id: user._id,
          username: user.username,
          token: generateToken(user._id),
        });
      } else {
        res.status(401);
        throw new Error('Invalid username or password');
      }
    } else {
      // In-memory auth
      // Add a default demo user if empty
      if (memoryStorage.users.length === 0 && username === 'admin' && password === 'admin') {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin', salt);
        memoryStorage.users.push({ _id: 'admin-id', username: 'admin', password: hashedPassword });
      }

      const user = memoryStorage.users.find(u => u.username === username);
      if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
          _id: user._id,
          username: user.username,
          token: generateToken(user._id),
        });
      } else {
        res.status(401);
        throw new Error('Invalid username or password (Demo: admin/admin)');
      }
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  authUser,
};
