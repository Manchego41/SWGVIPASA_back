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
router.route('/')
  .get(getAllProducts)
  .post(protect, isAdmin, createProduct);

// CRUD privado
router.route('/:id')
  .get(protect, isAdmin, getProductById)
  .put(protect, isAdmin, updateProduct)
  .delete(protect, isAdmin, deleteProduct);

module.exports = router;