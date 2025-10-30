// routes/simulatedPayment.routes.js
const express = require('express');
const router = express.Router();
const { createSimulatedPayment } = require('../controllers/simulatedPayment.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/create', protect, createSimulatedPayment);

module.exports = router;