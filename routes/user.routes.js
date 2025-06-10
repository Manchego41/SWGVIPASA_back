const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getMe,
  updateMe
} = require('../controllers/user.controller');
const { protect, isAdmin } = require('../middlewares/auth.middleware');

// Perfil propio
router.route('/me')
  .get(protect, getMe)
  .put(protect, updateMe);

// CRUD usuarios (sólo admin)
router.route('/')
  .get(protect, isAdmin, getAllUsers);

router.route('/:id')
  .get(protect, isAdmin, getUserById)
  .delete(protect, isAdmin, deleteUser);

router.route('/:id/role')
  .put(protect, isAdmin, updateUserRole);

module.exports = router;