const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Owner
  images: [{ type: String }],
  brand: { type: String, required: true },
  boughtOn: { type: Date, required: true },
  boughtAtPrice: { type: Number, required: true },
  marketPrice: { type: Number, required: true },
  previousOwners: [{
  user: { type: String, required: true }, // Username instead of ObjectId
  from: Date,
  to: Date
}],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Collection', collectionSchema);
