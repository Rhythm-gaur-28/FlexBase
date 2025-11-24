const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String },
  
  paymentMethods: [{
    type: { 
      type: String, 
      enum: ['UPI', 'Bank Transfer', 'PayPal', 'Cash', 'Other'],
      required: true 
    },
    details: { type: String, required: true },
    name: { type: String }
  }],
  
  status: { 
    type: String, 
    enum: ['active', 'pending', 'sold', 'cancelled'], 
    default: 'active' 
  },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ seller: 1 });

// PREVENT DUPLICATE ACTIVE LISTINGS FOR SAME COLLECTION
listingSchema.index(
  { collection: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

module.exports = mongoose.model('Listing', listingSchema);
