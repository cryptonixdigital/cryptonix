const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateWalletAddress } = require('../../js/auth'); // Import from your frontend

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, mpin } = req.body;

    // Validate input
    if (!name || !email || !password || !mpin) {
      return res.status(400).json({ success: false, message: 'Please fill all fields' });
    }

    if (password.length < 8 || password.length > 12) {
      return res.status(400).json({ success: false, message: 'Password must be 8-12 characters' });
    }

    if (!/^\d{6}$/.test(mpin)) {
      return res.status(400).json({ success: false, message: 'MPIN must be 6 digits' });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user
    const walletAddress = generateWalletAddress(email); // Use the same function from frontend
    user = new User({
      name,
      email,
      password,
      mpin,
      walletAddress,
      balance: 1000.00
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Hash MPIN
    user.mpin = await bcrypt.hash(mpin, salt);

    await user.save();

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          success: true, 
          token,
          walletAddress: user.walletAddress,
          balance: user.balance
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          success: true, 
          token,
          walletAddress: user.walletAddress,
          balance: user.balance
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;