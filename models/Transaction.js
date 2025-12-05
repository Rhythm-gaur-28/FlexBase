const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  
  paymentMethod: {
    type: { type: String, required: true },
    details: { type: String, required: true }
  },
  
  paymentProof: {
    transactionId: String,
    screenshot: String,
    notes: String
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'payment_submitted', 'payment_confirmed', 'completed', 'rejected', 'refunded'], 
    default: 'pending' 
  },
  
  paymentSubmittedAt: Date,
  paymentConfirmedAt: Date,
  completedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
