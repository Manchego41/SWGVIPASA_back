// controllers/payment.controller.js
require('dotenv').config();
const mercadopago = require('mercadopago');
const Purchase = require('../models/purchase.model');
const CartItem = require('../models/CartItem');

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';

mercadopago.configure({ access_token: MP_ACCESS_TOKEN });

// POST /api/payments/create-preference
// Crea la preferencia de pago en MP y devuelve la URL (sandbox_init_point/init_point)
exports.createPaymentPreference = async (req, res) => {
  try {
    const userId = req.user._id;

    // Traer items del carrito del usuario
    const cartItems = await CartItem.find({ user: userId }).populate('product');
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'Tu carrito está vacío.' });
    }

    // Transformar a items de Mercado Pago
    const mpItems = cartItems.map(ci => ({
      title: ci.product?.name || 'Producto',
      unit_price: Number(ci.product?.price || 0),
      quantity: Number(ci.quantity || 1),
      currency_id: 'PEN',
    }));

    // Total (opcional si quieres validarlo tú mismo)
    const total = mpItems.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);

    // Crear un registro de Purchase en estado "pending"
    const purchase = await Purchase.create({
      user: userId,
      items: cartItems.map(ci => ({
        product: ci.product?._id,
        name: ci.product?.name,
        price: Number(ci.product?.price || 0),
        quantity: Number(ci.quantity || 1),
      })),
      total,
      status: 'pending',
      payment_method: 'mercadopago',
      payment_type: 'checkout',
    });

    const backUrls = {
      success: `${PUBLIC_URL}/payment-result?status=success`,
      failure: `${PUBLIC_URL}/payment-result?status=failure`,
      pending: `${PUBLIC_URL}/payment-result?status=pending`,
    };

    const preference = {
      items: mpItems,
      back_urls: backUrls,
      auto_return: 'approved',
      external_reference: String(purchase._id), // para atar el pago a la compra
      statement_descriptor: 'SWGVIPASA',
    };

    const response = await mercadopago.preferences.create(preference);
    const pref = response?.body;

    // Guardar mp_preference_id en la compra
    purchase.mp_preference_id = pref?.id || null;
    await purchase.save();

    // Opciones de redirección
    return res.json({
      ok: true,
      preference_id: pref?.id,
      init_point: pref?.init_point,                 // redirección en producción
      sandbox_init_point: pref?.sandbox_init_point, // redirección en sandbox
    });
  } catch (error) {
    console.error('createPaymentPreference error:', error);
    return res.status(500).json({ message: 'Error creando preferencia de pago' });
  }
};

// POST /api/payments/webhook
// Mercado Pago enviará notificaciones aquí. Actualizamos el estado de la Purchase.
exports.webhook = async (req, res) => {
  try {
    const { type, data } = req.body || {};

    // Solo nos interesan pagos
    if (type !== 'payment' || !data?.id) {
      return res.status(200).json({ received: true });
    }

    // Consultar el pago a MP
    const payResp = await mercadopago.payment.findById(data.id);
    const pay = payResp?.body;

    // Recuperar external_reference → id de la Purchase
    const purchaseId = pay?.external_reference;
    if (!purchaseId) return res.status(200).json({ ok: true });

    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) return res.status(200).json({ ok: true });

    // Mapear estado MP → nuestro estado
    // approved | pending | rejected | cancelled | etc.
    const statusMap = {
      approved: 'approved',
      in_process: 'pending',
      pending: 'pending',
      rejected: 'rejected',
      cancelled: 'cancelled',
      refunded: 'cancelled',
      charged_back: 'cancelled',
    };
    const newStatus = statusMap[pay?.status] || 'pending';

    purchase.status = newStatus;
    purchase.payment_id = String(pay?.id);
    purchase.payment_type = pay?.payment_type_id || 'checkout';

    await purchase.save();

    // Si fue aprobado, limpiar carrito del usuario
    if (newStatus === 'approved') {
      await CartItem.deleteMany({ user: purchase.user });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('webhook error:', error);
    // Responder 200 igualmente para que MP no reintente eternamente si hubo un bug
    return res.status(200).json({ ok: true });
  }
};

// GET /api/payments/:payment_id
// (Opcional) consultar un pago en MP o buscar la Purchase
exports.getPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const payResp = await mercadopago.payment.findById(payment_id);
    return res.json({ ok: true, payment: payResp?.body });
  } catch (error) {
    console.error('getPayment error:', error);
    return res.status(500).json({ message: 'Error consultando pago' });
  }
};
