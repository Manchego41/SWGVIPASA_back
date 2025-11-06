// routes/payment.routes.js (ya existe con estos nombres)
const express = require('express');
const router = express.Router();
const { 
  createPaymentPreference, 
  webhook, 
  getPayment 
} = require('../controllers/payment.controller');
const { protect } = require('../middlewares/auth.middleware');

// Crear preferencia (usuario logueado)
router.post('/create-preference', protect, createPaymentPreference);
// Webhook (punto público, sin auth)
router.post('/webhook', webhook);
// Consultar pago puntual
router.get('/:payment_id', protect, getPayment);

module.exports = router;
