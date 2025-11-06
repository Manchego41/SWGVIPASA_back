// routes/payment.routes.js
const express = require('express');
const router = express.Router();

const {
  createPaymentPreference,
  webhook,
  getPayment,
  diag,
} = require('../controllers/payment.controller');

// === RUTAS PÚBLICAS ===

// Crear preferencia (Sandbox)
router.post('/create-preference', createPaymentPreference);

// Webhook de Mercado Pago
router.post('/webhook', webhook);

// Diagnóstico con nombre imposible de chocar
router.get('/_diag', diag);

// Dinámico (consultar un pago por id) — SIEMPRE AL FINAL
router.get('/:payment_id', getPayment);

module.exports = router;

