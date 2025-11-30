// SWGVIPASA_back/routes/profile.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const ProfileCtrl = require('../controllers/profile.controller');

router.use(protect);

// Obtener/actualizar mi perfil
router.get('/me', ProfileCtrl.getMyProfile);
router.patch('/me', ProfileCtrl.updateMyProfile);

// Admin: ver perfil de cualquier usuario
router.get('/:userId', ProfileCtrl.adminGetProfile);

module.exports = router;