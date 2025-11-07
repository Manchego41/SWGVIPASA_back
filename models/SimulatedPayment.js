// models/SimulatedPayment.js

const mongoose = require('mongoose');

const SimulatedPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number
  }],
  total: { type: Number, required: true },
  payment_method: { 
    type: String, 
    enum: ['tarjeta_visa', 'tarjeta_mastercard', 'yape', 'plin', 'efectivo'],
    required: true 
  },
  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['simulated_submitted', 'simulated_approved', 'simulated_rejected'],
    default: 'simulated_submitted' 
  },
  simulated_transaction_id: { type: String, unique: true },
  notes: String
}, { timestamps: true });

// Generar ID de transacción único antes de guardar
SimulatedPaymentSchema.pre('save', function(next) {
  if (!this.simulated_transaction_id) {
    this.simulated_transaction_id = 'SIM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  next();
});

module.exports = mongoose.model('SimulatedPayment', SimulatedPaymentSchema);