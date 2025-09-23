const mongoose = require('mongoose');

const userStatusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  socketId: String
}, { timestamps: true });

module.exports = mongoose.model('UserStatus', userStatusSchema);
