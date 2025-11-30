// controllers/cart.controller.js
const mongoose = require('mongoose');
const CartItem = require('../models/CartItem');
const Purchase = require('../models/purchase.model');
const Product = require('../models/product.model');
const Receipt = require('../models/Receipt'); // modelo creado arriba

// QR generator opcional
const QRCode = (() => {
  try { return require('qrcode'); } catch (e) { return null; }
})();

function genCode(prefix = 'R') {
  return `${prefix}-${Math.random().toString(36).slice(2,9).toUpperCase()}`;
}

/**
 * POST /api/cart  { productId }
 */
const addCart = async (req, res) => {
  try {
    const userId        = req.user._id;
    const { productId } = req.body;

    let item = await CartItem.findOne({ user: userId, product: productId });
    if (item) {
      item.quantity++;
      await item.save();
    } else {
      item = await CartItem.create({ user: userId, product: productId });
    }
    await item.populate('product');

    res.status(201).json(item);
  } catch (err) {
    console.error('addCart error:', err);
    res.status(500).json({ message: 'Error agregando al carrito' });
  }
};

/**
 * GET /api/cart
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const items  = await CartItem.find({ user: userId }).populate('product');
    res.json(items);
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ message: 'Error obteniendo el carrito' });
  }
};

/**
 * DELETE /api/cart/:id
 */
const removeCart = async (req, res) => {
  try {
    const userId  = req.user._id;
    const { id }  = req.params;

    const raw = String(req.query.one ?? '').toLowerCase().trim();
    const removeOne = raw === 'true' || raw === '1' || raw === 'yes' || raw === 'y' || raw === 'on';

    const item = await CartItem.findOne({ _id: id, user: userId });
    if (!item) {
      return res.status(404).json({ message: 'Ítem no encontrado' });
    }

    if (removeOne) {
      if (Number(item.quantity) > 1) {
        item.quantity = Number(item.quantity) - 1;
        await item.save();
        await item.populate('product');
        return res.json(item); // Ítem actualizado (qty-1)
      } else {
        await CartItem.findByIdAndDelete(id);
        return res.json({ message: 'Ítem eliminado' });
      }
    } else {
      await CartItem.findByIdAndDelete(id);
      return res.json({ message: 'Ítem eliminado' });
    }
  } catch (err) {
    console.error('removeCart error:', err);
    res.status(500).json({ message: 'Error eliminando ítem' });
  }
};

/**
 * POST /api/cart/checkout-local
 *
 * Body: { method: 'visa'|'bcp'|'yape'|'plin'|'efectivo' }
 *
 * - crea purchase
 * - decrementa stock
 * - si efectivo: genera Receipt con qrDataUrl + documentHtml y devuelve receiptId
 */
const checkoutLocal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user._id;
    const method = String(req.body.method || 'efectivo').toLowerCase();

    // Buscar ítems del carrito (no en una sesión todavía, los leeremos y luego actuamos en la transacción)
    const cartItems = await CartItem.find({ user: userId }).populate('product');
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'El carrito está vacío' });
    }

    // Construir purchaseItems
    const purchaseItems = cartItems.map(it => {
      const prod = it.product || {};
      return {
        product: prod._id || null,
        productId: prod._id || null,
        name: prod.name || it.name || 'Producto',
        price: prod.price ?? it.price ?? 0,
        quantity: Number(it.quantity || 0)
      };
    });

    const total = purchaseItems.reduce((acc, it) => acc + Number(it.price || 0) * Number(it.quantity || 0), 0);

    let createdPurchase = null;
    let createdReceipt = null;

    // Ejecutar transacción para asegurar consistencia stock + purchase + clear cart + create receipt
    await session.withTransaction(async () => {
      // 1) Reducir stock de productos referenciados
      for (const it of purchaseItems) {
        if (it.product) {
          // obtener con session
          const prod = await Product.findById(it.product).session(session);
          if (prod) {
            const available = Number(prod.countInStock || 0);
            if (available < Number(it.quantity || 0)) {
              // lanzar error para abortar transacción
              throw new Error(`Stock insuficiente para ${prod.name || 'producto'}`);
            }
            prod.countInStock = available - Number(it.quantity || 0);
            await prod.save({ session });
          }
        }
      }

      // 2) Crear Purchase
      const purchaseDoc = {
        user: userId,
        items: purchaseItems,
        total,
        method,
        status: 'completed',
        createdAt: new Date()
      };

      const created = await Purchase.create([purchaseDoc], { session });
      createdPurchase = created[0];

      // 3) Vaciar carrito
      await CartItem.deleteMany({ user: userId }).session(session);

      // 4) Si método efectivo -> generar QR + HTML + crear Receipt
      if (method === 'efectivo' || method === 'cash') {
        // payload para QR (compacto)
        const qrPayload = {
          receiptCode: genCode('R'),
          purchaseId: String(createdPurchase._id),
          userId: String(userId),
          total,
          createdAt: new Date().toISOString()
        };

        // generar data URL si biblioteca disponible
        let qrDataUrl = null;
        try {
          if (QRCode && typeof QRCode.toDataURL === 'function') {
            qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
          }
        } catch (e) {
          console.warn('checkoutLocal: QR generation failed', e?.message || e);
          qrDataUrl = null;
        }

        // generar HTML simple del comprobante (para abrir/descargar)
        const code = qrPayload.receiptCode;
        const html = `
          <!doctype html>
          <html>
            <head><meta charset="utf-8"><title>Boleta ${code}</title></head>
            <body style="font-family:Arial, Helvetica, sans-serif; padding:20px;">
              <h2>Boleta de Pago - IPASA</h2>
              <p><strong>Boleta:</strong> ${code}</p>
              <p><strong>Compra:</strong> ${String(createdPurchase._id)}</p>
              <p><strong>Total:</strong> S/ ${Number(total).toFixed(2)}</p>
              <h3>Items</h3>
              <ul>
                ${purchaseItems.map(it => `<li>${it.quantity} x ${it.name} — S/ ${Number(it.price).toFixed(2)}</li>`).join('')}
              </ul>
              <div style="margin-top:20px;">
                ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="max-width:320px;"/>` : '<p>(QR no disponible)</p>'}
                <p style="font-size:12px;color:#666">Muestra este código en caja para pagar en efectivo.</p>
              </div>
            </body>
          </html>
        `;

        // crear Receipt en colección
        const receiptDoc = {
          code,
          purchase: createdPurchase._id,
          user: userId,
          total,
          method: 'efectivo',
          qrDataUrl: qrDataUrl || undefined,
          documentHtml: html
        };

        const receiptsCreated = await Receipt.create([receiptDoc], { session });
        createdReceipt = receiptsCreated[0];
      }
    }); // end transaction

    // Responder: purchase y, si existe, receiptId
    const response = { message: 'Compra registrada', purchase: createdPurchase };
    if (createdReceipt) response.receiptId = String(createdReceipt._id);

    return res.status(201).json(response);
  } catch (err) {
    console.error('checkoutLocal error:', err);
    // detectar error de stock
    if (String(err.message || '').toLowerCase().includes('stock insuficiente')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Error registrando la compra' });
  } finally {
    try { await session.endSession(); } catch(e) {}
  }
};

module.exports = {
  addCart,
  getCart,
  removeCart,
  checkoutLocal
};