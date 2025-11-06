// routes/purchase.routes.js
const express  = require('express');
const router   = express.Router();

const { protect } = require('../middlewares/auth.middleware');
const Purchase = require('../models/purchase.model');

// helper admin
function requireAdmin(req, res, next) {
  const ok = req.user && (req.user.role === 'administrador' || req.user.role === 'admin');
  if (!ok) return res.status(403).json({ message: 'Acceso solo para administradores' });
  next();
}

function buildDateMatch(from, to) {
  const m = {};
  if (from || to) {
    m.createdAt = {};
    if (from) m.createdAt.$gte = new Date(from);
    if (to)   m.createdAt.$lt  = new Date(to);
  }
  return m;
}

// Listado del usuario autenticado (ya lo tenías)
router.get('/mine', protect, async (req, res) => {
  try {
    const list = await Purchase.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error('Error obteniendo compras:', e);
    res.status(500).json({ message: 'Error obteniendo compras' });
  }
});

// NUEVO: listado admin con filtros opcionales (?status=recorded&from=ISO&to=ISO)
router.get('/', protect, requireAdmin, async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const q = { ...buildDateMatch(from, to) };
    if (status) q.status = status;

    const list = await Purchase.find(q).sort({ createdAt: 1 });
    res.json(list);
  } catch (e) {
    console.error('Error listando compras:', e);
    res.status(500).json({ message: 'Error listando compras' });
  }
});

module.exports = router;