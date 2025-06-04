// routes/product.routes.js
const express = require('express');
const router = express.Router();
const { getAllProducts } = require('../controllers/product.controller');

// GET /api/products →
router.get('/', getAllProducts);

module.exports = router;