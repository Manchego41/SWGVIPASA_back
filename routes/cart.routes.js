// routes/cart.routes.js
const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  addCart,
  getCart,
  removeCart,
  createPreference,
  paymentSuccess
} = require('../controllers/cart.controller');

router.post('/',         protect, addCart);
router.get('/',          protect, getCart);
router.delete('/:id',    protect, removeCart);

// nueva ruta para iniciar pago
router.post('/checkout',           protect, createPreference);
// ruta para procesar pago exitoso
router.get('/checkout/success',    protect, paymentSuccess);

module.exports = router;