const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Validation failed', message: 'Email and password are required' });
  }

  try {
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email: email.trim().toLowerCase(), password: hashedPassword });
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Validation failed', message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    const isMatch = user && await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ token });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
