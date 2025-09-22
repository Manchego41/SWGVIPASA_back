// routes/product.routes.js
const express = require('express');
const router  = express.Router();

const { protect, isAdmin } = require('../middlewares/auth.middleware');
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');

// Público (si quieres que listar sea público, deja sin protect)
router.get('/', listProducts);
router.get('/:id', getProductById);

// Solo admin
router.post('/',    protect, isAdmin, createProduct);
router.put('/:id',  protect, isAdmin, updateProduct);
router.delete('/:id', protect, isAdmin, deleteProduct);

module.exports = router;