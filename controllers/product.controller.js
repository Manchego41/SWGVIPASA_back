// controllers/product.controller.js
const Product = require('../models/product.model');

// Obtener todos los productos
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    return res.json({ products });
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    return res.status(500).json({ message: 'Error al obtener productos' });
  }
};