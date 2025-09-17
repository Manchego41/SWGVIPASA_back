// src/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    description: { type: String, required: true },
    countInStock: { type: Number, required: true, default: 0 },
    imageUrl:     { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Product 
  ? mongoose.model('Product') 
  : mongoose.model('Product', productSchema);