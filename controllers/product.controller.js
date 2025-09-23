// controllers/product.controller.js
const Product = require('../models/product.model'); // ajusta si tu export/archivo se llama distinto

// GET /api/products
exports.listProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (e) {
    console.error('listProducts error:', e);
    res.status(500).json({ message: 'Error listando productos' });
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(p);
  } catch (e) {
    console.error('getProductById error:', e);
    res.status(500).json({ message: 'Error obteniendo producto' });
  }
};

// POST /api/products   (admin)
exports.createProduct = async (req, res) => {
  try {
    const { name, price, stock, description, image } = req.body;

    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

    const product = await Product.create({
      name,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      description: description || '',
      image: image || '',
    });

    res.status(201).json(product);
  } catch (e) {
    console.error('createProduct error:', e);
    res.status(500).json({ message: 'Error creando producto' });
  }
};

// PUT /api/products/:id   (admin)
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, stock, description, image } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    if (name !== undefined)        product.name = name;
    if (price !== undefined)       product.price = Number(price);
    if (stock !== undefined)       product.stock = Number(stock);
    if (description !== undefined) product.description = description;
    if (image !== undefined)       product.image = image;

    const saved = await product.save();
    res.json(saved);
  } catch (e) {
    console.error('updateProduct error:', e);
    res.status(500).json({ message: 'Error actualizando producto' });
  }
};

// DELETE /api/products/:id  (admin)
exports.deleteProduct = async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Producto no encontrado' });
    await p.deleteOne();
    res.json({ message: 'Producto eliminado' });
  } catch (e) {
    console.error('deleteProduct error:', e);
    res.status(500).json({ message: 'Error eliminando producto' });
  }
};