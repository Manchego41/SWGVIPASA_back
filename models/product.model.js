// models/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price:       { type: Number, required: true, default: 0 },
    imageUrl:    { type: String, default: '' },

    // Compatibilidad con tu código viejo: antes usabas "countInStock" y a veces "stock"
    countInStock: { type: Number, required: true, default: 0 }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Alias virtual "stock" para que cualquiera de los dos nombres funcione
productSchema.virtual('stock')
  .get(function () { return this.countInStock; })
  .set(function (v) { this.countInStock = v; });

// Anti OverwriteModelError
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);