const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  mpin: {
    type: String,
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 10.00
  },
  transactions: [
    {
      amount: Number,
      recipient: String,
      sender: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);