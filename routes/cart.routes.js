// routes/cart.routes.js
const express = require('express');
const router = express.Router();
const { getCart, addToCart, removeFromCart } = require('../controllers/cart.controller');

// GET /api/cart → Obtener carrito del usuario
router.get('/', getCart);

// POST /api/cart/add → Agregar producto al carrito
router.post('/add', addToCart);

// POST /api/cart/remove → Remover producto del carrito
router.post('/remove', removeFromCart);

module.exports = router;