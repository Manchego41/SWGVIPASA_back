// routes/purchase.routes.js
const express  = require('express');
const router   = express.Router();

const { protect } = require('../middlewares/auth.middleware');
const Purchase = require('../models/purchase.model');

router.get('/mine', protect, async (req, res) => {
  try {
    const list = await Purchase.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error('Error obteniendo compras:', e);
    res.status(500).json({ message: 'Error obteniendo compras' });
  }
});

module.exports = router;