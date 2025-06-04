// routes/user.routes.js
const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/user.controller');

// GET /api/users/me
router.get('/me', getProfile);

module.exports = router;