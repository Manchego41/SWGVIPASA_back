// routes/purchase.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const Purchase = require('../models/purchase.model');

// GET /api/purchases/mine - Compras del usuario actual
router.get('/mine', protect, async (req, res) => {
  try {
    const list = await Purchase.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name price'); // Populate product info
    res.json(list);
  } catch (e) {
    console.error('Error obteniendo compras:', e);
    res.status(500).json({ message: 'Error obteniendo compras' });
  }
});

// GET /api/purchases/:id - Compra específica (NUEVO ENDPOINT)
router.get('/:id', protect, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('items.product', 'name price');
    
    if (!purchase) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    // Verificar que la compra pertenece al usuario
    if (purchase.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.json(purchase);
  } catch (error) {
    console.error('Error obteniendo compra:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;