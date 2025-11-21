// controllers/return.controller.js
const mongoose = require('mongoose');
const Return = require('../models/return.model');
const Purchase = require('../models/purchase.model');
const Product = require('../models/product.model'); // fallback de precio si hace falta
let sendMail = null;
try { sendMail = require('../utils/mailer'); } catch { /* opcional */ }

// Genera código legible
function genCode() {
  const s = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RT-${s}`;
}

// Normaliza payload (tolerante)
function normalizeBody(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  return {
    purchaseId: body.purchaseId || body.purchase || body.purchase_id,
    items: items.map(i => ({
      purchaseItemId: i.purchaseItemId || i.itemId || i._id || i.id || null,
      productId: i.productId || i.product || null,
      productName: (i.productName || i.name || i.title || '').trim(),
      quantity: Number(i.quantity || i.qty || 0)
    })),
    reason: (body.reason || body.motive || '').trim()
  };
}

/* ------------------------ CLIENTE ------------------------ */
exports.createMyReturn = async (req, res) => {
  try {
    const { purchaseId, items, reason } = normalizeBody(req.body || {});

    // Validaciones básicas
    if (!purchaseId || !mongoose.isValidObjectId(purchaseId)) {
      return res.status(400).json({ message: 'Compra inválida' });
    }
    if (!reason || reason.length < 5) {
      return res.status(400).json({ message: 'Describe el motivo de la devolución (mínimo 5 caracteres)' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Selecciona al menos un producto' });
    }

    // Buscar compra perteneciente al usuario
    const purchase = await Purchase.findOne({ _id: purchaseId, user: req.user._id }).lean();
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });

    // Construir maps compatibles con distintas estructuras del subdoc
    const byId = new Map();            // por subdoc _id
    const byProductId = new Map();     // por subdoc.productId
    const byProduct = new Map();       // por subdoc.product (campo alternativo)
    const byNameLower = new Map();     // por subdoc.name (lowercase)

    (purchase.items || []).forEach(pi => {
      if (pi?._id) byId.set(String(pi._id), pi);
      if (pi?.productId) byProductId.set(String(pi.productId), pi);
      if (pi?.product) byProduct.set(String(pi.product), pi);
      if (pi?.name) byNameLower.set(String(pi.name).toLowerCase(), pi);
    });

    const normalizedItems = [];
    let total = 0;

    for (const sel of items) {
      const q = Number(sel.quantity || 0);
      if (q <= 0) continue;

      let src = null;

      // 1) match por purchaseItemId (subdoc _id)
      if (sel.purchaseItemId && byId.has(String(sel.purchaseItemId))) {
        src = byId.get(String(sel.purchaseItemId));
      }

      // 2) match por productId (campo productId)
      if (!src && sel.productId && byProductId.has(String(sel.productId))) {
        src = byProductId.get(String(sel.productId));
      }

      // 3) match por product (campo product alternativo en la compra)
      if (!src && sel.productId && byProduct.has(String(sel.productId))) {
        src = byProduct.get(String(sel.productId));
      }

      // 4) match por product (si sel.productId era enviado como ObjectId string y map usa string)
      if (!src && sel.productId) {
        const key = String(sel.productId);
        if (byProduct.has(key)) src = byProduct.get(key);
        if (!src && byProductId.has(key)) src = byProductId.get(key);
      }

      // 5) match por nombre (case-insensitive)
      if (!src && sel.productName) {
        const key = String(sel.productName || '').toLowerCase();
        if (byNameLower.has(key)) src = byNameLower.get(key);
      }

      if (!src) {
        // No encontrado: reportar con detalle para facilitar debugging
        console.warn('createMyReturn: item no encontrado en purchase.items', {
          sel,
          purchaseItemsPreview: (purchase.items || []).slice(0,5)
        });
        return res.status(400).json({ message: 'Ítem de compra no válido o no encontrado en la compra' });
      }

      if (q > Number(src.quantity || 0)) {
        return res.status(400).json({ message: `Cantidad solicitada supera a la comprada para ${src.name || sel.productName || 'el producto'}` });
      }

      // determinar unitPrice (preferir el precio guardado en la compra)
      let unitPrice = Number(src.price || 0);
      if (!unitPrice) {
        // intentar recuperar desde tabla products por productId (src.productId || src.product)
        const pid = src.productId || src.product || sel.productId || null;
        if (pid && mongoose.isValidObjectId(pid)) {
          try {
            const prod = await Product.findById(pid).select('price name').lean();
            if (prod) unitPrice = Number(prod.price || 0);
          } catch (e) {
            // no bloquear si falla la lectura de producto
            console.warn('createMyReturn: fallo recuperar precio product fallback', e?.message || e);
          }
        }
      }

      const importe = (unitPrice || 0) * q;
      total += importe;

      // Guardar referencia product (si existe) para poder populate luego
      let productRef = undefined;
      const candidatePid = src.productId || src.product || sel.productId || null;
      if (candidatePid && mongoose.isValidObjectId(candidatePid)) {
        productRef = candidatePid;
      }

      normalizedItems.push({
        product: productRef,          // ObjectId ref: 'Product' (si no existe, queda undefined)
        productName: src.name || sel.productName || '',
        unitPrice: unitPrice || 0,
        quantity: q
      });
    }

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: 'No hay ítems válidos para devolver' });
    }

    // Crear documento de devolución
    const doc = await Return.create({
      code: genCode(),
      user: req.user._id,
      purchase: purchase._id,
      items: normalizedItems,
      reason,
      total: Number(total || 0),
      status: 'processing'
    });

    // Poblar para respuesta (user + items.product)
    const populated = await Return.findById(doc._id)
      .populate('user', 'name email')
      .populate('items.product', 'name price imageUrl')
      .lean();

    return res.status(201).json(populated);
  } catch (e) {
    console.error('createMyReturn error', e);
    return res.status(500).json({ message: 'Error creando devolución' });
  }
};

exports.getMyReturns = async (req, res) => {
  try {
    const list = await Return.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name price imageUrl')
      .lean();
    res.json(list);
  } catch (e) {
    console.error('getMyReturns error', e);
    res.status(500).json({ message: 'Error listando devoluciones' });
  }
};

/**
 * Permite al usuario dueño cancelar su devolución si está en estado 'processing'.
 * PATCH /api/returns/:id/cancel
 */
exports.cancelMyReturn = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Id inválido' });

    const row = await Return.findById(id);
    if (!row) return res.status(404).json({ message: 'No encontrado' });

    // solo el usuario dueño puede cancelar su RMA
    if (String(row.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (row.status !== 'processing') {
      return res.status(400).json({ message: 'Solo devoluciones en estado "processing" pueden ser canceladas' });
    }

    row.status = 'canceled';
    await row.save();

    const populated = await Return.findById(row._id)
      .populate('user', 'name email')
      .populate('items.product', 'name price imageUrl')
      .lean();

    return res.json(populated);
  } catch (e) {
    console.error('cancelMyReturn error', e);
    return res.status(500).json({ message: 'Error cancelando devolución' });
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
  try {
    const rows = await Return.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('items.product', 'name price imageUrl')
      .lean();
    res.json(rows);
  } catch (e) {
    console.error('adminList error', e);
    res.status(500).json({ message: 'Error listando devoluciones (admin)' });
  }
};

exports.adminGet = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const row = await Return.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name price imageUrl')
      .lean();
    if (!row) return res.status(404).json({ message: 'No encontrado' });
    res.json(row);
  } catch (e) {
    console.error('adminGet error', e);
    res.status(500).json({ message: 'Error obteniendo devolución' });
  }
};

/**
 * adminSetStatus: ahora restringido a los tres estados solicitados por ti.
 * Además: si la devolución ya está en 'canceled' NO se puede cambiar.
 * PATCH /api/returns/:id/status
 */
exports.adminSetStatus = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const status = String(req.body.status || '').trim();
  // Solo permitimos estos tres desde admin UI
  const allowed = ['processing','approved','rejected'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Estado inválido (solo processing/approved/rejected)' });
  }
  try {
    // recuperar documento para validar estado actual
    const existing = await Return.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'No encontrado' });

    // si ya fue cancelado por el cliente, no permitir cambios desde admin
    if (existing.status === 'canceled') {
      return res.status(400).json({ message: 'La devolución fue cancelada por el cliente y no puede ser modificada' });
    }

    // proceder al update
    const row = await Return.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!row) return res.status(404).json({ message: 'No encontrado' });

    const populated = await Return.findById(row._id)
      .populate('user', 'name email')
      .populate('items.product', 'name price imageUrl')
      .lean();

    // opcional: enviar correo automático cuando se aprueba/rechaza (si tienes mailer)
    try {
      if (sendMail && (status === 'approved' || status === 'rejected')) {
        const subj = status === 'approved' ? `Devolución ${row.code || row._id} ACEPTADA` : `Devolución ${row.code || row._id} RECHAZADA`;
        const text = `Su solicitud ${row.code || row._id} ha sido ${status === 'approved' ? 'aceptada' : 'rechazada'}.`;
        await sendMail({ to: (row.user && row.user.email) || '', subject: subj, text });
      }
    } catch (mailErr) {
      console.warn('Mailer falló al notificar cambio de estado (se continúa):', mailErr?.message || mailErr);
    }

    res.json(populated);
  } catch (e) {
    console.error('adminSetStatus error', e);
    res.status(500).json({ message: 'Error actualizando estado' });
  }
};

exports.adminMessage = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const row = await Return.findById(req.params.id).populate('user', 'name email');
    if (!row) return res.status(404).json({ message: 'No encontrado' });

    const message = (req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Mensaje vacío' });

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
  } catch (e) {
    console.error('adminMessage error', e);
    res.status(500).json({ message: 'Error enviando mensaje' });
  }
};