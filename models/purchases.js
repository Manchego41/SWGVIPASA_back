const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", // referencia al producto comprado
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // referencia al usuario que realiza la compra
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  total: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// El tercer parámetro "purchases" fuerza a Mongoose a usar esa colección
module.exports = mongoose.model("Purchase", purchaseSchema, "purchases");
