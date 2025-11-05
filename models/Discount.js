// SWGVIPASA_back/models/discount.model.js
const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del descuento es requerido'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'buy_x_get_y', 'free_shipping'],
    required: true,
    default: 'percentage'
  },
  value: {
    type: Number,
    required: [true, 'El valor del descuento es requerido'],
    min: 0
  },
  minQuantity: {
    type: Number,
    default: 0
  },
  freeQuantity: {
    type: Number,
    default: 0
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: String
  }],
  minPurchaseAmount: {
    type: Number,
    default: 0
  },
  maxDiscountAmount: {
    type: Number
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimit: {
    type: Number
  },
  usedCount: {
    type: Number,
    default: 0
  },
  code: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true,
    unique: true
  },
  isAutomatic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
discountSchema.index({ startDate: 1, endDate: 1 });
discountSchema.index({ isActive: 1 });
discountSchema.index({ code: 1 });

// Método para verificar si el descuento está activo y vigente
discountSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now &&
         (!this.usageLimit || this.usedCount < this.usageLimit);
};

// Método para aplicar descuento a un producto
discountSchema.methods.calculateDiscount = function(productPrice, quantity = 1) {
  if (!this.isValid()) return 0;

  let discountAmount = 0;

  switch (this.discountType) {
    case 'percentage':
      discountAmount = (productPrice * this.value) / 100;
      if (this.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, this.maxDiscountAmount);
      }
      discountAmount = discountAmount * quantity;
      break;

    case 'fixed':
      discountAmount = this.value * quantity;
      break;

    case 'buy_x_get_y':
      if (quantity >= this.minQuantity) {
        const freeItems = Math.floor(quantity / this.minQuantity) * this.freeQuantity;
        discountAmount = freeItems * productPrice;
      }
      break;

    case 'free_shipping':
      discountAmount = 0;
      break;
  }

  return Math.round(discountAmount * 100) / 100; // Redondear a 2 decimales
};

module.exports = mongoose.model('Discount', discountSchema);