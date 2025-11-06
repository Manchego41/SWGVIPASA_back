// controllers/payment.controller.js
require('dotenv').config();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const FRONT_URL = process.env.FRONT_URL || 'http://localhost:5173';
const PUBLIC_URL = process.env.PUBLIC_URL || FRONT_URL;

const mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });

// POST /api/payments/create-preference
exports.createPaymentPreference = async (req, res) => {
  try {
    const bodyItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const items = bodyItems.length > 0 ? bodyItems : [
      { title: 'Item de prueba', unit_price: 10, quantity: 1, currency_id: 'PEN' },
    ];

    const mpItems = items.map(it => ({
      title: String(it.title || 'Producto'),
      unit_price: Number(it.unit_price || 0),
      quantity: Number(it.quantity || 1),
      currency_id: it.currency_id || 'PEN',
    }));

    const back_urls = {
      success: `${PUBLIC_URL}/payment-result?status=success`,
      failure: `${PUBLIC_URL}/payment-result?status=failure`,
      pending: `${PUBLIC_URL}/payment-result?status=pending`,
    };

    const preferenceClient = new Preference(mpClient);
    const pref = await preferenceClient.create({
      body: {
        items: mpItems,
        back_urls,
        auto_return: 'approved',
        external_reference: `demo-${Date.now()}`,
        statement_descriptor: 'SWGVIPASA',
      },
    });

    return res.json({
      ok: true,
      preference_id: pref?.id,
      init_point: pref?.init_point,
      sandbox_init_point: pref?.sandbox_init_point,
    });
  } catch (err) {
    console.error('createPaymentPreference error:', {
      message: err?.message,
      status: err?.status,
      cause: err?.cause,
      errors: err?.errors,
      body: err?.body,
    });
    return res.status(500).json({ message: 'Error creando preferencia de pago' });
  }
};

// POST /api/payments/webhook
exports.webhook = async (req, res) => {
  try {
    console.log('Webhook MP:', JSON.stringify(req.body || {}, null, 2));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('webhook error:', err);
    return res.status(200).json({ ok: true });
  }
};

// GET /api/payments/:payment_id
exports.getPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const paymentClient = new Payment(mpClient);
    const pay = await paymentClient.get({ id: payment_id });
    return res.json({ ok: true, payment: pay });
  } catch (err) {
    console.error('getPayment error:', {
      message: err?.message,
      status: err?.status,
      cause: err?.cause,
      errors: err?.errors,
      body: err?.body,
    });
    return res.status(500).json({ message: 'Error consultando pago' });
  }
};


