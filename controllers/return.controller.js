// controllers/return.controller.js
const mongoose = require('mongoose');
const Return = require('../models/return.model');
const Purchase = require('../models/purchase.model'); // tu modelo de compras
let sendMail = null;
try { sendMail = require('../utils/mailer'); } catch { /* opcional */ }

const idEq = (a, b) => String(a) === String(b);

// Genera código legible
function genCode() {
  const s = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RT-${s}`;
}

// Normaliza el payload recibido desde el front
function normalizeBody(body) {
  // aceptamos varias formas para no romper flujos
  // forma “oficial”: { purchaseId, items:[{ purchaseItemId, quantity }], reason }
  // formas toleradas: { lines: [...] } | { selected: [...] }
  const items = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.lines)
    ? body.lines
    : Array.isArray(body.selected)
    ? body.selected
    : [];

  return {
    purchaseId: body.purchaseId || body.purchase || body.purchase_id,
    items: items.map(i => ({
      purchaseItemId: i.purchaseItemId || i.itemId || i._id || i.id,
      quantity: Number(i.quantity || i.qty || 0)
    })),
    reason: (body.reason || body.motive || '').trim()
  };
}

/* ------------------------ CLIENTE ------------------------ */
exports.createMyReturn = async (req, res) => {
  try {
    const { purchaseId, items, reason } = normalizeBody(req.body || {});

    if (!purchaseId || !mongoose.isValidObjectId(purchaseId)) {
      return res.status(400).json({ message: 'Compra inválida' });
    }
    if (!reason || reason.length < 5) {
      return res.status(400).json({ message: 'Describe el motivo de la devolución' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Selecciona al menos un producto' });
    }

    const purchase = await Purchase.findOne({ _id: purchaseId, user: req.user._id });
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });

    // Map de ítems de la compra para validar cantidades y precios
    // Estructura típica esperada: purchase.items = [{ _id, productId?, name, price, quantity }]
    const byId = new Map();
    (purchase.items || []).forEach(pi => byId.set(String(pi._id), pi));

    const normalizedItems = [];
    let total = 0;

    for (const sel of items) {
      const q = Number(sel.quantity || 0);
      if (!sel.purchaseItemId || q <= 0) continue;

      const src = byId.get(String(sel.purchaseItemId));
      if (!src) {
        // Si no encontramos por _id, último intento por nombre (por si el subdoc no tiene _id)
        const match = (purchase.items || []).find(x =>
          String(x.name || '').toLowerCase() === String(sel.name || '').toLowerCase()
        );
        if (!match) {
          return res.status(400).json({ message: 'Ítem de compra no válido' });
        }
        if (q > Number(match.quantity || 0)) {
          return res.status(400).json({ message: `Cantidad solicitada supera a la comprada para ${match.name}` });
        }
        const importe = Number(match.price || 0) * q;
        total += importe;
        normalizedItems.push({
          productId: match.productId || undefined,
          productName: match.name,
          unitPrice: Number(match.price || 0),
          quantity: q
        });
      } else {
        if (q > Number(src.quantity || 0)) {
          return res.status(400).json({ message: `Cantidad solicitada supera a la comprada para ${src.name}` });
        }
        const importe = Number(src.price || 0) * q;
        total += importe;
        normalizedItems.push({
          productId: src.productId || undefined,
          productName: src.name,
          unitPrice: Number(src.price || 0),
          quantity: q
        });
      }
    }

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: 'No hay ítems válidos para devolver' });
    }

    const doc = await Return.create({
      code: genCode(),
      user: req.user._id,
      purchase: purchase._id,
      items: normalizedItems,
      reason,
      total: Number(total || 0),
      status: 'processing'
    });

    return res.status(201).json(doc);
  } catch (e) {
    console.error('createMyReturn error', e);
    return res.status(500).json({ message: 'Error creando devolución' });
  }
};

exports.getMyReturns = async (req, res) => {
  try {
    const list = await Return.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (e) {
    console.error('getMyReturns error', e);
    res.status(500).json({ message: 'Error listando devoluciones' });
  }
};

/* ------------------------ ADMIN ------------------------ */
function requireAdmin(req, res) {
  if (req.user?.role !== 'administrador') {
    res.status(403).json({ message: 'Solo administradores' });
    return false;
  }
  return true;
}

exports.adminList = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = await Return.find({})
    .sort({ createdAt: -1 })
    .populate('user', 'name email')
    .lean();
  res.json(rows);
};

exports.adminGet = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const row = await Return.findById(req.params.id)
    .populate('user', 'name email')
    .lean();
  if (!row) return res.status(404).json({ message: 'No encontrado' });
  res.json(row);
};

exports.adminSetStatus = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const status = String(req.body.status || '').trim();
  const allowed = ['processing','approved','rejected','completed','canceled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Estado inválido' });
  }
  const row = await Return.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  );
  if (!row) return res.status(404).json({ message: 'No encontrado' });
  res.json(row);
};

exports.adminMessage = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const row = await Return.findById(req.params.id).populate('user', 'name email');
  if (!row) return res.status(404).json({ message: 'No encontrado' });

  const message = (req.body.message || '').trim();
  if (!message) return res.status(400).json({ message: 'Mensaje vacío' });

  // usa tu mailer si existe
  try {
    if (sendMail) {
      await sendMail({
        to: row.user.email,
        subject: `Devolución ${row.code || row._id} – Actualización`,
        text: message
      });
    }
  } catch (e) {
    console.warn('Mailer falló (se continúa):', e.message);
  }
  res.json({ ok: true });
};