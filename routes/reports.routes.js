// routes/reports.routes.js
const express = require('express');
const router  = express.Router();

const Purchase = require('../models/purchase.model');
const User     = require('../models/user.model');

// Helpers
function parseRange(q) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const defFrom = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const defTo   = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
  const from = q.from ? new Date(q.from) : defFrom;
  const to   = q.to   ? new Date(q.to)   : defTo;
  return { from, to };
}

const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

// Índice de la ruta (para comprobar que ESTÁ montada)
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    routes: [
      'GET /api/reports          (este índice)',
      'GET /api/reports/ping',
      'GET /api/reports/summary?from&to',
      'GET /api/reports/sales/monthly?from&to',
      'GET /api/reports/users/count',
      'GET /api/reports/users/monthly?from&to',
    ],
  });
});

// Ping rápido (debug)
router.get('/ping', (_req, res) => res.json({ pong: true, ts: new Date().toISOString() }));

// KPIs del rango (por defecto, mes actual)
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);

    const salesAgg = await Purchase.aggregate([
      { $match: { status: 'recorded', createdAt: { $gte: from, $lt: to } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const usersTotal = await User.countDocuments({}); // si quieres solo clientes, cambia a { role: 'cliente' }

    res.json({
      sales: salesAgg[0]?.total || 0,
      purchases: 0, // placeholder si no tienes modelo de compras proveedor
      users: usersTotal,
    });
  } catch (e) {
    console.error('reports/summary', e);
    res.status(500).json({ message: 'Error generando resumen' });
  }
});

// Ventas mensuales en el rango
router.get('/sales/monthly', async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);

    const rows = await Purchase.aggregate([
      { $match: { status: 'recorded', createdAt: { $gte: from, $lt: to } } },
      { $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          value: { $sum: '$total' }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);

    const data = rows.map(r => {
      const y = r._id.y, m = r._id.m;
      return { month: `${MES[m - 1]}-${y}`, short: MES[m - 1], value: Number(r.value || 0) };
    });

    res.json(data);
  } catch (e) {
    console.error('reports/sales/monthly', e);
    res.status(500).json({ message: 'Error obteniendo ventas mensuales' });
  }
});

// Conteo de usuarios
router.get('/users/count', async (_req, res) => {
  try {
    const [total, customers, admins] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'cliente' }),
      User.countDocuments({ role: 'administrador' }),
    ]);
    res.json({ total, customers, admins });
  } catch (e) {
    console.error('reports/users/count', e);
    res.status(500).json({ message: 'Error obteniendo conteos' });
  }
});

// Altas de usuarios por mes
router.get('/users/monthly', async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);

    const rows = await User.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to } } },
      { $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          value: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);

    const data = rows.map(r => {
      const y = r._id.y, m = r._id.m;
      return { month: `${MES[m - 1]}-${y}`, short: MES[m - 1], value: Number(r.value || 0) };
    });

    res.json(data);
  } catch (e) {
    console.error('reports/users/monthly', e);
    res.status(500).json({ message: 'Error obteniendo altas mensuales' });
  }
});

module.exports = router;