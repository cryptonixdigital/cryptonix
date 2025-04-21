const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get user wallet info
router.get('/info', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -mpin');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Transfer funds
router.post('/transfer', auth, async (req, res) => {
  try {
    const { recipientAddress, amount } = req.body;
    
    // Validate input
    if (!recipientAddress || !amount) {
      return res.status(400).json({ success: false, message: 'Please provide recipient address and amount' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount' });
    }

    // Get sender and recipient
    const sender = await User.findById(req.user.id);
    const recipient = await User.findOne({ walletAddress: recipientAddress });

    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Recipient not found' });
    }

    if (sender.walletAddress === recipientAddress) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to yourself' });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Update balances
    sender.balance -= amount;
    recipient.balance += amount;

    // Create transaction record
    const transaction = {
      amount,
      recipient: recipient.walletAddress,
      timestamp: new Date()
    };

    sender.transactions.push(transaction);
    recipient.transactions.push({
      amount,
      sender: sender.walletAddress,
      timestamp: new Date()
    });

    await sender.save();
    await recipient.save();

    res.json({ 
      success: true, 
      message: 'Transfer successful',
      newBalance: sender.balance
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;