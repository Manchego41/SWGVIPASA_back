const express = require('express');
const router = express.Router();
const { getSummaryReports } = require('../controllers/report.controller');

// Ruta pública
router.get('/summary', getSummaryReports);

module.exports = router;
