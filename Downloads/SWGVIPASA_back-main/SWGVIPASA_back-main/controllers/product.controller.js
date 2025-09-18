const Product = require('../models/Product');

// GET /api/products
exports.getAllProducts = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
  res.json(product);
};

// POST /api/products
exports.createProduct = async (req, res) => {
  const newProduct = new Product(req.body);
  const created = await newProduct.save();
  res.status(201).json(created);
};

// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
  Object.assign(product, req.body);
  const updated = await product.save();
  res.json(updated);
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
  await product.remove();
  res.json({ message: 'Producto eliminado' });
};