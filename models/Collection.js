const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  images: { type: [String], default: [] },  // ← Changed to default: []
  brand: { type: String, required: true },
  boughtOn: { type: Date, required: true },
  boughtAtPrice: { type: Number, required: true },
  marketPrice: { type: Number, required: true },
  previousOwners: {
    type: [{
      user: { type: String, required: true },
      from: Date,
      to: Date
    }],
    default: []  // ← Added default: []
  },
  // MARKETPLACE FIELDS
  isListed: { type: Boolean, default: false },
  currentListing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  transferHistory: {
    type: [{
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
      price: Number,
      transferredAt: { type: Date, default: Date.now }
    }],
    default: []  // ← Added default: []
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Collection', collectionSchema);
