// controllers/cart.controller.js
const jwt = require('jsonwebtoken');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
require('dotenv').config();

// Función auxiliar para obtener el payload del token
const getUserFromToken = (header) => {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

// GET /api/cart      → obtener el carrito del usuario autenticado
exports.getCart = async (req, res) => {
  try {
    const decoded = getUserFromToken(req.headers.authorization);
    if (!decoded) return res.status(401).json({ message: 'Token inválido o no enviado' });
    const userId = decoded.id;

    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) {
      // Si aún no existe carrito, creamos uno vacío
      cart = await Cart.create({ user: userId, items: [] });
    }
    return res.json({ cart });
  } catch (error) {
    console.error('❌ Error al obtener carrito:', error);
    return res.status(500).json({ message: 'Error al obtener carrito' });
  }
};

// POST /api/cart/add   → agregar un producto al carrito
// Body JSON: { "productId": "..." }
exports.addToCart = async (req, res) => {
  try {
    const decoded = getUserFromToken(req.headers.authorization);
    if (!decoded) return res.status(401).json({ message: 'Token inválido o no enviado' });
    const userId = decoded.id;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: 'Falta productId' });

    // Verificar que el producto exista
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    // Obtener o crear carrito del usuario
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Si el producto ya está en el carrito, aumentar la cantidad
    const existingItem = cart.items.find(item => item.product.toString() === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      // Si no está, lo agregamos con quantity = 1
      cart.items.push({ product: productId, quantity: 1 });
    }
    await cart.save();

    // Poblar el producto para la respuesta
    const populatedCart = await cart.populate('items.product');
    return res.json({ cart: populatedCart });
  } catch (error) {
    console.error('❌ Error al agregar al carrito:', error);
    return res.status(500).json({ message: 'Error al agregar al carrito' });
  }
};

// POST /api/cart/remove   → remover un producto del carrito
// Body JSON: { "productId": "..." }
exports.removeFromCart = async (req, res) => {
  try {
    const decoded = getUserFromToken(req.headers.authorization);
    if (!decoded) return res.status(401).json({ message: 'Token inválido o no enviado' });
    const userId = decoded.id;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: 'Falta productId' });

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });

    // Filtrar la lista de items: eliminamos el que coincide con productId
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();
    const populatedCart = await cart.populate('items.product');
    return res.json({ cart: populatedCart });
  } catch (error) {
    console.error('❌ Error al remover del carrito:', error);
    return res.status(500).json({ message: 'Error al remover del carrito' });
  }
};