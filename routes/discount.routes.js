const express = require('express');
const router = express.Router();
const {
  createDiscount,
  getActiveDiscounts,
  validateDiscountCode,
  getProductsOnSale,
  createSampleData,
  testDiscounts
} = require('../controllers/discount.controller');

// Admin routes
router.post('/create', createDiscount);
router.get('/active', getActiveDiscounts);

// Client routes
router.post('/validate', validateDiscountCode);
router.get('/products/sale', getProductsOnSale);

// Test and sample data routes
router.post('/create-samples', createSampleData);
router.get('/test', testDiscounts);

module.exports = router;