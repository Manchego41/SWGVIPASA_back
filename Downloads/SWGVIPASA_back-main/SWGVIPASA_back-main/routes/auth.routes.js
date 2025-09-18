// SWGVIPASA_back/routes/auth.routes.js
const express = require('express');
const router  = express.Router();
const {
  register,
  login,
  forgotPassword,
  resetPassword
} = require('../controllers/auth.controller');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', resetPassword);

module.exports = router;