// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['new-arrivals', 'best-seller', 'most-popular'], required: true },
  section: { type: String, enum: ['row1', 'row2', 'row3'], required: true }, // NEW FIELD
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  image: { type: String, required: true },
  tag: { type: String }
});

module.exports = mongoose.model('Product', productSchema);
