// models/purchase.model.js
const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:     { type: String,  required: true },
  price:    { type: Number,  required: true },
  quantity: { type: Number,  required: true, default: 1 }
}, { _id: false });

const PurchaseSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:  { type: [PurchaseItemSchema], required: true },
  total:  { type: Number, required: true },
  status: { type: String, enum: ['recorded', 'returned'], default: 'recorded' }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', PurchaseSchema);