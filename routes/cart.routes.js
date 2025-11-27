// SWGVIPASA_back/routes/cart.routes.js
const express = require('express');
const router  = express.Router();

const { protect } = require('../middlewares/auth.middleware');
const {
  addCart,
  getCart,
  removeCart,
  checkoutLocal,
} = require('../controllers/cart.controller');

const ReceiptCtrl = require('../controllers/receipt.controller');

// Aplica auth a todas las rutas del carrito
router.use(protect);         // <-- requiere JWT

router.post('/', addCart);
router.get('/',  getCart);
router.delete('/:id',  removeCart);

// Checkout local (sin pasarela): guarda historial + vacía carrito
router.post('/checkout-local', checkoutLocal);

// Receipts
router.get('/receipts/:id', ReceiptCtrl.getReceipt);
router.get('/receipts/:id/download', ReceiptCtrl.downloadQrImage);

module.exports = router;