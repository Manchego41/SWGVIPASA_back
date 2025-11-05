// src/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    price: { 
      type: Number, 
      required: true, 
      default: 0,
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    description: { 
      type: String, 
      required: true,
      trim: true
    },
    countInStock: { 
      type: Number, 
      required: true, 
      default: 0,
      min: 0
    },
    image: { 
      type: String 
    },
    category: { 
      type: String,
      trim: true
    },
    brand: {
      type: String,
      trim: true
    },
    isOnSale: {
      type: Boolean,
      default: false
    },
    // Relación con modelo Discount
    discount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discount'
    },
    tags: [{
      type: String,
      trim: true
    }],
    features: [{
      type: String,
      trim: true
    }]
  },
  { 
    timestamps: true 
  }
);

// Virtual para calcular el precio con descuento
productSchema.virtual('salePrice').get(function() {
  if (this.isOnSale && this.discount && this.discount.value) {
    if (this.discount.discountType === 'percentage') {
      return this.price - (this.price * this.discount.value / 100);
    } else if (this.discount.discountType === 'fixed') {
      return Math.max(0, this.price - this.discount.value);
    }
  }
  return this.price;
});

// Método para verificar si tiene un descuento activo
productSchema.methods.hasActiveDiscount = function() {
  return this.isOnSale && this.discount && this.discount.isValid && this.discount.isValid();
};

// Exportación del modelo
module.exports = mongoose.models.Product 
  ? mongoose.model('Product') 
  : mongoose.model('Product', productSchema);
