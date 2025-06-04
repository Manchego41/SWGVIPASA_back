// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');

// Registrar usuario (puede incluír role en el body)
router.post('/register', register);

// Login
router.post('/login', login);

module.exports = router;