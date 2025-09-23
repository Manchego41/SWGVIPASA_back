// routes/user.routes.js
const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getMe,
  updateMe,
  getClientsWithPurchases,
  getClientsWithCount,
} = require('../controllers/user.controller');

const { protect, isAdmin } = require('../middlewares/auth.middleware');

// Perfil propio
router.route('/me')
  .get(protect, getMe)
  .put(protect, updateMe);

// ⚠️ Importante: rutas fijas ANTES que '/:id'
router.get('/clients-with-count',      protect, isAdmin, getClientsWithCount);
router.get('/clients-with-purchases',  protect, isAdmin, getClientsWithPurchases);

// CRUD usuarios (solo admin)
router.route('/')
  .get(protect, isAdmin, getAllUsers);

// Más específicas antes que la genérica
router.route('/:id/role')
  .put(protect, isAdmin, updateUserRole);

router.route('/:id')
  .get(protect, isAdmin, getUserById)
  .delete(protect, isAdmin, deleteUser);

module.exports = router;