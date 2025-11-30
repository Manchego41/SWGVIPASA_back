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

    // Bloquear devoluciones para compras pagadas en efectivo (según petición)
    const payMethod = (purchase.payment && String(purchase.payment.method || '').toLowerCase()) || '';
    if (payMethod === 'efectivo' || payMethod === 'cash' || payMethod === 'store') {
      return res.status(400).json({ message: 'No se permiten devoluciones para compras pagadas en efectivo (boleta presencial).' });
    }

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

      const importe = unitPrice * q;
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
        unitPrice: unitPrice,
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
 * PATCH /api/returns/:id/status
 *
 * - Si status === 'approved' :
 *    * disminuye cantidades en la Purchase (ya lo hacías)
 *    * recalcula total
 *    * INCREMENTA el stock (countInStock) en Product si el item referenciaba product.
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
    const row = await Return.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'No encontrado' });

    // Si ya está cancelado no permitimos cambios
    if (row.status === 'canceled') {
      return res.status(400).json({ message: 'Devolución cancelada por el cliente. No se puede modificar.' });
    }

    // Si estamos aprobando, ejecutamos la lógica de ajuste sobre la compra original
    if (status === 'approved') {
      try {
        if (row.purchase && mongoose.isValidObjectId(row.purchase)) {
          const purchase = await Purchase.findById(row.purchase);
          if (purchase) {
            // por cada ítem devuelto, localizar el item en purchase.items y restar cantidad y actualizar importes
            let deltaTotal = 0;
            for (const rit of (row.items || [])) {
              // intentar emparejar por product _id o por productName
              let target = null;
              if (rit.product && mongoose.isValidObjectId(rit.product)) {
                target = purchase.items.find(pi => String(pi.productId || pi.product || pi._id) === String(rit.product));
              }
              if (!target && rit.productName) {
                target = purchase.items.find(pi => (pi.name || '').toLowerCase() === String(rit.productName || '').toLowerCase());
              }
              // fallback: si no hay product ref, intentar por price coincidencia y cantidad
              if (!target && rit.unitPrice) {
                target = purchase.items.find(pi => Number(pi.price || pi.unitPrice || 0) === Number(rit.unitPrice || 0));
              }

              if (target) {
                const toRemove = Math.min(Number(rit.quantity || 0), Number(target.quantity || 0));
                if (toRemove > 0) {
                  target.quantity = Number(target.quantity || 0) - toRemove;
                  const price = Number(target.price || target.unitPrice || rit.unitPrice || 0);
                  deltaTotal += price * toRemove;

                  // Si existe referencia de producto, REPONER stock (incrementar)
                  try {
                    const pid = target.productId || target.product || rit.product || null;
                    if (pid && mongoose.isValidObjectId(pid)) {
                      await Product.findByIdAndUpdate(pid, { $inc: { countInStock: Number(toRemove) } }).exec();
                    }
                  } catch (e) {
                    console.warn('adminSetStatus: fallo repone stock para product', rit.product, e?.message || e);
                  }
                }
              }
            }

            // recalcular total de compra (si existe campo total)
            if (typeof purchase.total === 'number') {
              purchase.total = Math.max(0, Number(purchase.total) - deltaTotal);
            }
            await purchase.save();
          }
        }
      } catch (err) {
        console.warn('adminSetStatus: fallo ajustar compra al aprobar devolución (se continúa):', err?.message || err);
      }
    }

    // Actualizar estado en retorno
    row.status = status;
    row.updatedAt = new Date();
    await row.save();

    // Poblar para devolver al cliente admin
    const populated = await Return.findById(row._id)
      .populate('user', 'name email')
      .populate('items.product', 'name price imageUrl')
      .lean();

    // OMITIDO envío de correo según tu petición
    res.json(populated);
  } catch (e) {
    console.error('adminSetStatus error', e);
    res.status(500).json({ message: 'Error actualizando estado' });
  }
};

/**
 * adminMessage: en lugar de enviar correo, ahora guarda una nota interna del admin (adminNote)
 * POST /api/returns/:id/message
 */
exports.adminMessage = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const row = await Return.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'No encontrado' });

    const note = (req.body.message || req.body.note || '').trim();
    if (!note) return res.status(400).json({ message: 'Mensaje vacío' });

    // Guardamos la nota como campo adminNote
    row.adminNote = (row.adminNote || []).concat({
      text: note,
      by: req.user._id,
      at: new Date()
    });
    await row.save();

    res.json({ ok: true });
  } catch (e) {
    console.error('adminMessage error', e);
    res.status(500).json({ message: 'Error guardando nota' });
  }
};