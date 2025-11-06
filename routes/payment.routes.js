// routes/payment.routes.js
const express = require('express');
const router = express.Router();
const {
  createPaymentPreference,
  webhook,
  getPayment,
} = require('../controllers/payment.controller');

// ✅ Rutas públicas (NO usan protect)
router.post('/create-preference', createPaymentPreference);
router.post('/webhook', webhook);
router.get('/:payment_id', getPayment);

module.exports = router;

