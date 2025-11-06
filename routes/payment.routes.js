// routes/payment.routes.js
const express = require('express');
const router = express.Router();
const {
  createPaymentPreference,
  webhook,
  getPayment,
} = require('../controllers/payment.controller');

// Crear preferencia (sandbox)
router.post('/create-preference', createPaymentPreference);

// Webhook de MP
router.post('/webhook', webhook);

// Consultar pago (opcional)
router.get('/:payment_id', getPayment);

module.exports = router;

