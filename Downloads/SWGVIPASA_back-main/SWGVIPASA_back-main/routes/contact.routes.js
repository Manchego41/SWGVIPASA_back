// SWGVIPASA_back/routes/contact.routes.js
const express = require('express');
const { submitContact } = require('../controllers/contact.controller');
const router = express.Router();

router.post('/', submitContact);

module.exports = router;