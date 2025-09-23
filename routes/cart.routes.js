// routes/cart.routes.js
const express = require('express');
const router  = express.Router();

const { protect } = require('../middlewares/auth.middleware');
const {
  addCart,
  getCart,
  removeCart,
  checkoutLocal,
} = require('../controllers/cart.controller');

// Aplica auth a todas las rutas del carrito
router.use(protect);

router.post('/',       addCart);
router.get('/',        getCart);
router.delete('/:id',  removeCart);

// Checkout local (sin pasarela): guarda historial + vacía carrito
router.post('/checkout-local', checkoutLocal);

// Si tenías rutas de MercadoPago, déjalas comentadas por ahora:
// const { createPreference, paymentSuccess } = require('../controllers/cart.controller');
// router.post('/checkout', protect, createPreference);
// router.get('/checkout/success', protect, paymentSuccess);

module.exports = router;