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
        return res.json({
          _id: user._id,
          username: user.username,
          token: generateToken(user._id),
        });
      }
      
      // Fallback for empty database: Allow admin/admin if no users exist
      const userCount = await User.countDocuments();
      if (userCount === 0 && username === 'admin' && password === 'admin') {
        // Create the admin user in the database
        const newUser = await User.create({ username, password });
        return res.json({
          _id: newUser._id,
          username: newUser.username,
          token: generateToken(newUser._id),
        });
      }

      res.status(401);
      throw new Error('Invalid username or password');
    } else {
      // In-memory auth
      // Add a default demo user if not exists
      let user = memoryStorage.users.find(u => u.username === 'admin');
      if (!user && username === 'admin' && password === 'admin') {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin', salt);
        user = { _id: 'admin-id', username: 'admin', password: hashedPassword };
        memoryStorage.users.push(user);
      }

      const foundUser = memoryStorage.users.find(u => u.username === username);
      if (foundUser && (await bcrypt.compare(password, foundUser.password))) {
        return res.json({
          _id: foundUser._id,
          username: foundUser.username,
          token: generateToken(foundUser._id),
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
