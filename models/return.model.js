// models/return.model.js
const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // opcional
    productName:{ type: String, required: true },
    unitPrice:  { type: Number, required: true, min: 0 },
    quantity:   { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    code:     { type: String, index: true }, // ej. RT-AB12CD
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true, index: true },

    items:    { type: [returnItemSchema], default: [] },
    reason:   { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ['processing','approved','rejected','completed','canceled'],
      default: 'processing',
      index: true
    },

    total:    { type: Number, default: 0 }, // estimado
    adminNotes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Return || mongoose.model('Return', returnSchema);