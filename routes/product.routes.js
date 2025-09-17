const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');
const { protect, isAdmin } = require('../middlewares/auth.middleware');

// Listado público
// routes/product.routes.js
router.route('/')
  .get(getAllProducts) // ← SIN 'protect, isAdmin'
  .post(protect, isAdmin, createProduct);

// ✅ RUTA PÚBLICA - Cualquiera puede ver un producto específico  
router.route('/:id')
  .get(getProductById) // ← SIN 'protect, isAdmin'
  .put(protect, isAdmin, updateProduct)
  .delete(protect, isAdmin, deleteProduct);

module.exports = router;