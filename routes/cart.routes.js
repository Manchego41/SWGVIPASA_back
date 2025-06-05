// routes/cart.routes.js
const router = require('express').Router();
const cartController = require('../controllers/cart.controller');

// Crear carrito
router.post('/', cartController.createCart);

// Obtener carrito por userId
router.get('/:userId', cartController.getCart);

// Actualizar carrito por cartId (_id)
router.put('/:id', cartController.updateCart);

// Eliminar carrito por cartId (_id)
router.delete('/:id', cartController.deleteCart);

module.exports = router;