// controllers/cart.controller.js
const CartItem = require('../models/CartItem');
const Purchase = require('../models/purchase.model');

const fs   = require('fs');
const path = require('path');

// POST /api/cart  { productId }
// - Si existe el item => incrementa quantity
// - Si no existe     => crea con quantity=1
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

// GET /api/cart
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

// DELETE /api/cart/:id
// - /api/cart/:id?one=true => DECREMENTA 1 (si llega a 0, elimina)
// - /api/cart/:id          => ELIMINA el ítem completo
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

// POST /api/cart/checkout-local
// - Genera una compra con los ítems actuales y vacía el carrito
const checkoutLocal = async (req, res) => {
  try {
    const userId = req.user._id;
    const items  = await CartItem.find({ user: userId }).populate('product');

    if (!items.length) {
      return res.status(400).json({ message: 'El carrito está vacío' });
    }

    const purchaseItems = items.map((it) => ({
      product:  it.product?._id || it.product,
      name:     it.product?.name,
      price:    it.product?.price,
      quantity: it.quantity,
    }));

    const total = purchaseItems.reduce((acc, it) => {
      const price = Number(it.price || 0);
      return acc + price * (it.quantity || 0);
    }, 0);

    const purchase = await Purchase.create({
      user:  userId,
      items: purchaseItems,
      total,
    });

    await CartItem.deleteMany({ user: userId }); // vaciar carrito

    res.status(201).json({ message: 'Compra registrada', purchase });
  } catch (err) {
    console.error('checkoutLocal error:', err);
    res.status(500).json({ message: 'Error registrando la compra' });
  }
};


// POST /cart/checkout  (JSON o multipart con 'voucher')
// - Si viene multipart: JSON vendrá en req.body.payload (string)
async function checkoutUnified(req, res) {
  try {
    // 1) Obtener payload (JSON o multipart)
    let payload = req.body.payload ? JSON.parse(req.body.payload) : req.body;

    const {
      method,     // 'visa' | 'yape' | 'plin' | 'efectivo'
      buyer,      // { name, email }
      coupon,     // opcional
      totals,     // { subtotal, discount, fee, total }
      items,      // [{ id, qty, price }]
      extra       // { transactionId?, token? }
    } = payload || {};

    // 2) Validaciones mínimas
    if (!buyer?.name || !buyer?.email) {
      return res.status(400).json({ ok: false, message: 'Faltan datos del comprador.' });
    }
    if (!method) {
      return res.status(400).json({ ok: false, message: 'Falta método de pago.' });
    }

    // 3) Guardar voucher si vino archivo (Yape/Plin)
    let voucherPath = null;
    if (req.file) {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
      const safeName = `${Date.now()}_${req.file.originalname.replace(/\s+/g,'_')}`;
      const newPath = path.join(uploadsDir, safeName);
      fs.renameSync(req.file.path, newPath);
      voucherPath = `/uploads/${safeName}`; // ruta pública si sirves estáticos
    }

    // 4) Lógica por método (aquí solo simulación)
    //    TODO: acá validar stock, precios contra BD y crear el Order real
    let status = 'pending_review';
    if (method === 'efectivo') status = 'pending_cash';
    if (method === 'visa')     status = 'paid'; // cuando integres pasarela, cambia según respuesta

    // 5) Simular creación de orderId
    const orderId = Math.random().toString(36).substring(2, 10);

    // 6) (Opcional) Vaciar carrito del usuario y guardar en historial
    //    Puedes reutilizar parte de checkoutLocal si lo deseas

    return res.json({
      ok: true,
      orderId,
      status,
      received: {
        method,
        buyer,
        coupon: coupon || null,
        totals,
        itemsCount: Array.isArray(items) ? items.length : 0,
        transactionId: extra?.transactionId || null,
        voucherPath
      }
    });
  } catch (err) {
    console.error('❌ Error en checkoutUnified:', err);
    return res.status(500).json({ ok: false, message: 'Error procesando checkout' });
  }
}

module.exports = {
  addCart,
  getCart,
  removeCart,
  checkoutLocal,
  checkoutUnified,
};