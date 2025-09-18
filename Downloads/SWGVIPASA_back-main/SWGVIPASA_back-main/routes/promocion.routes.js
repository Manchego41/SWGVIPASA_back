// routes/promocion.routes.js
const express = require('express');
const router = express.Router();
const promocionController = require('../controllers/promocion.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/activas', promocionController.obtenerPromocionesActivas);
router.get('/validar/:codigo', promocionController.validarCodigo);

// Rutas protegidas - USAR protect EN LUGAR DE verifyToken
router.post('/', 
  authMiddleware.protect, 
  authMiddleware.isAdmin, 
  promocionController.crearPromocion
);
router.get('/', 
  authMiddleware.protect, 
  authMiddleware.isAdmin, 
  promocionController.obtenerPromociones
);
router.get('/:id', 
  authMiddleware.protect, 
  authMiddleware.isAdmin, 
  promocionController.obtenerPromocion
);
router.put('/:id', 
  authMiddleware.protect, 
  authMiddleware.isAdmin, 
  promocionController.actualizarPromocion
);
router.delete('/:id', 
  authMiddleware.protect, 
  authMiddleware.isAdmin, 
  promocionController.eliminarPromocion
);

module.exports = router;