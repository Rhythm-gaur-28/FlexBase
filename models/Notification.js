const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  type: { 
    type: String, 
    enum: [
      'payment_submitted', 
      'payment_confirmed', 
      'payment_rejected', 
      'purchase_complete',
      // NEW OFFER TYPES
      'offer_received',
      'offer_accepted',
      'offer_declined',
      'payment_requested',
      'ownership_transferred'
    ],
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  relatedTransaction: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Transaction' 
  },
  relatedListing: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Listing' 
  },
  // NEW FIELDS FOR OFFERS
  relatedOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  },
  relatedCollection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  },
  data: {
    amount: Number,
    reason: String,
    paymentMethod: String
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
