// routes/return.routes.js
const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const ReturnCtrl = require('../controllers/return.controller');

// Cliente
router.post('/', protect, ReturnCtrl.createMyReturn);
router.get('/mine', protect, ReturnCtrl.getMyReturns);
router.patch('/:id/cancel', protect, ReturnCtrl.cancelMyReturn); // -> usuario dueño puede cancelar si está en processing

// Admin
router.get('/', protect, ReturnCtrl.adminList);
router.get('/:id', protect, ReturnCtrl.adminGet);
router.patch('/:id/status', protect, ReturnCtrl.adminSetStatus);
router.post('/:id/message', protect, ReturnCtrl.adminMessage);

module.exports = router;