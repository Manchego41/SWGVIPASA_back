// routes/payment.routes.js
const express = require('express');
const router = express.Router();
const { 
  createPaymentPreference, 
  webhook, 
  getPayment 
} = require('../controllers/payment.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/create-preference', protect, createPaymentPreference);
router.post('/webhook', webhook);
router.get('/:payment_id', protect, getPayment);

module.exports = router;