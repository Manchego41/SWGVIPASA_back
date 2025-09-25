const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { protect } = require('../middlewares/auth.middleware');
const Purchase = require('../models/purchase.model');

// GET /api/purchases/mine - Historial de compras
router.get('/mine', protect, async (req, res) => {
  try {
    const purchases = await Purchase.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    console.error('Error en /mine:', error);
    res.status(500).json({ message: 'Error obteniendo compras' });
  }
});

// GET /api/purchases/:id - Ver una compra específica
router.get('/:id', protect, async (req, res) => {
  try {
    console.log(' Solicitando compra ID:', req.params.id);
    
    const purchaseId = req.params.id;

    // Validación básica del ID
    if (!purchaseId || purchaseId.length < 10) {
      return res.status(400).json({ message: 'ID de compra inválido' });
    }

    const purchase = await Purchase.findById(purchaseId);
    
    if (!purchase) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    // Verificar que el usuario sea el dueño de la compra
    if (purchase.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado para ver esta compra' });
    }

    console.log(' Compra enviada al frontend');
    res.json(purchase);

  } catch (error) {
    console.error(' Error en /:id:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;