// controllers/product.controller.js
const mongoose = require('mongoose');
const Product = require('../models/product.model');

// GET /api/products  (público)
exports.listProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json(products);
  } catch (e) {
    console.error('listProducts error:', e);
    return res.status(500).json({ message: 'Error listando productos' });
  }
};

// GET /api/products/:id  (público)
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.json(product);
  } catch (e) {
    console.error('getProductById error:', e);
    return res.status(500).json({ message: 'Error obteniendo producto' });
  }
};

// POST /api/products  (solo admin)
exports.createProduct = async (req, res) => {
  try {
    // Campos que esperamos del front
    let { name, description = '', price, stock = 0, image = '' } = req.body;

    // Normalizaciones simples
    if (typeof price === 'string') price = Number(price);
    if (typeof stock === 'string') stock = Number(stock);

    if (!name || price == null) {
      return res.status(400).json({ message: 'name y price son obligatorios' });
    }
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ message: 'price debe ser un número ≥ 0' });
    }
    if (Number.isNaN(stock) || stock < 0) {
      return res.status(400).json({ message: 'stock debe ser un número ≥ 0' });
    }

    const created = await Product.create({ name, description, price, stock, image });
    return res.status(201).json(created);
  } catch (e) {
    console.error('createProduct error:', e);
    return res.status(500).json({ message: 'Error creando producto' });
  }
};

// PUT /api/products/:id  (solo admin)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Solo permitimos actualizar estos campos
    const allowed = ['name', 'description', 'price', 'stock', 'image'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    if (data.price !== undefined) {
      const p = Number(data.price);
      if (Number.isNaN(p) || p < 0) {
        return res.status(400).json({ message: 'price debe ser un número ≥ 0' });
      }
      data.price = p;
    }

    if (data.stock !== undefined) {
      const s = Number(data.stock);
      if (Number.isNaN(s) || s < 0) {
        return res.status(400).json({ message: 'stock debe ser un número ≥ 0' });
      }
      data.stock = s;
    }

    const updated = await Product.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.json(updated);
  } catch (e) {
    console.error('updateProduct error:', e);
    return res.status(500).json({ message: 'Error actualizando producto' });
  }
};

// DELETE /api/products/:id  (solo admin)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.json({ message: 'Producto eliminado' });
  } catch (e) {
    console.error('deleteProduct error:', e);
    return res.status(500).json({ message: 'Error eliminando producto' });
  }
};
