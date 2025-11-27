// controllers/cart.controller.js
const mongoose = require('mongoose');
const CartItem = require('../models/CartItem');
const Purchase = require('../models/purchase.model');
const Product = require('../models/product.model');
const User = require('../models/User'); // por si quieres actualizar contadores (opcional)

function genReceiptCode() {
  // Genera un código simple legible para el comprobante
  return `RCPT-${Math.random().toString(36).slice(2,9).toUpperCase()}`;
}

/**
 * POST /api/cart  { productId }
 * - Si existe el item => incrementa quantity
 * - Si no existe     => crea con quantity=1
 */
const addCart = async (req, res) => {
  try {
    const userId = req.user._id;
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
    const items = await CartItem.find({ user: userId }).populate('product');
    res.json(items);
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ message: 'Error obteniendo el carrito' });
  }
};

/**
 * DELETE /api/cart/:id
 * - /api/cart/:id?one=true => DECREMENTA 1 (si llega a 0, elimina)
 * - /api/cart/:id          => ELIMINA el ítem completo
 */
const removeCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

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
 * - Genera una compra con los ítems actuales, ajusta stock y vacía el carrito
 * - Si method === 'efectivo' genera un receipt (simulado) y lo guarda dentro de la compra
 *
 * Respuesta: { message, purchase } -> la purchase contiene datos para que el front muestre/descargue el comprobante.
 */
const checkoutLocal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { method = 'efectivo', metadata = {} } = req.body; // method puede venir desde frontend

    const items = await CartItem.find({ user: userId }).populate('product');

    if (!items.length) {
      return res.status(400).json({ message: 'El carrito está vacío' });
    }

    // Construir items para la compra
    const purchaseItems = items.map((it) => ({
      product: it.product?._id || it.product,
      productId: it.product?._id || it.product, // redundante pero útil
      name: it.product?.name || it.name,
      price: it.product?.price || it.price || 0,
      quantity: Number(it.quantity || 0)
    }));

    // Calcular total
    const total = purchaseItems.reduce((acc, it) => {
      const price = Number(it.price || 0);
      return acc + price * (it.quantity || 0);
    }, 0);

    // Crear objeto de compra
    const purchasePayload = {
      user: userId,
      items: purchaseItems,
      total,
      method: String(method).toLowerCase(),
      metadata: metadata || {}
    };

    // Si es efectivo, generar un receipt simulado y guardarlo en la compra
    if (String(method).toLowerCase() === 'efectivo' || String(method).toLowerCase() === 'cash') {
      const rcpt = {
        code: genReceiptCode(),
        createdAt: new Date(),
        // qrData puede ser una string que represente la URL o un contenido para generar QR en el front
        qrData: `https://simulated.example/receipt/${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        note: 'Comprobante de pago en efectivo (simulado). Presente este código en tienda.'
      };
      purchasePayload.cashReceipt = rcpt;
    }

    // Crear la Purchase
    const purchase = await Purchase.create(purchasePayload);

    // Ajustar stock: decrementar countInStock si el producto existe
    for (const it of purchaseItems) {
      try {
        const pid = it.product || it.productId || null;
        const qty = Number(it.quantity || 0);
        if (pid && mongoose.isValidObjectId(pid) && qty > 0) {
          await Product.findByIdAndUpdate(pid, { $inc: { countInStock: -qty } }, { new: true }).exec();
        }
      } catch (e) {
        // no bloqueamos la compra si falla el ajuste de stock por algún motivo; lo logueamos
        console.warn('checkoutLocal: fallo actualizar stock para item', it, e?.message || e);
      }
    }

    // Vaciar carrito del usuario
    await CartItem.deleteMany({ user: userId });

    // Opcional: actualizar contador del usuario (si tienes un field tipo purchasesCount)
    try {
      await User.findByIdAndUpdate(userId, { $inc: { purchasesCount: 1 } }).exec();
    } catch (e) {
      // Si no existe esa propiedad en User, ignora
    }

    // Poblar la respuesta básica para el front
    const populated = await Purchase.findById(purchase._id)
      .populate('items.product', 'name price imageUrl')
      .lean();

    res.status(201).json({ message: 'Compra registrada', purchase: populated });
  } catch (err) {
    console.error('checkoutLocal error:', err);
    res.status(500).json({ message: 'Error registrando la compra' });
  }
};

module.exports = {
  addCart,
  getCart,
  removeCart,
  checkoutLocal,
};