// controllers/payment.controller.js
require('dotenv').config();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

// === ENV y cliente MP ===
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const FRONT_URL = process.env.FRONT_URL || 'http://localhost:5173';
const PUBLIC_URL = process.env.PUBLIC_URL || FRONT_URL;

const mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });

// === Crear preferencia (mínima, SIN auto_return por compatibilidad) ===
// POST /api/payments/create-preference
exports.createPaymentPreference = async (req, res) => {
  try {
    const bodyItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const items = (bodyItems.length > 0 ? bodyItems : [
      { title: 'Item de prueba', unit_price: 10, quantity: 1 }
    ]).map(it => ({
      title: String(it.title || 'Producto'),
      unit_price: Number(it.unit_price || 0),
      quantity: Number(it.quantity || 1),
    }));

    const back_urls = {
      success: `${PUBLIC_URL}/payment-result?status=success`,
      failure: `${PUBLIC_URL}/payment-result?status=failure`,
      pending: `${PUBLIC_URL}/payment-result?status=pending`,
    };

    const preferenceClient = new Preference(mpClient);
    const pref = await preferenceClient.create({
      body: {
        items,
        back_urls,
        // auto_return: 'approved', // <- puedes activarlo después de validar diag
        external_reference: `demo-${Date.now()}`,
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

// === Webhook de Mercado Pago ===
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

// === Consultar pago por id (opcional) ===
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

// === Diagnóstico temporal ===
// GET /api/payments/_diag
exports.diag = async (_req, res) => {
  try {
    const envReport = {
      FRONT_URL,
      PUBLIC_URL,
      MP_ACCESS_TOKEN_present: !!process.env.MP_ACCESS_TOKEN,
      MP_ACCESS_TOKEN_prefix: process.env.MP_ACCESS_TOKEN ? String(process.env.MP_ACCESS_TOKEN).slice(0, 6) : null,
    };

    // Verificar credencial de MP
    const meResp = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const meJson = await meResp.json();

    // Intentar crear una preferencia mínima (sin auto_return)
    const preferenceClient = new Preference(mpClient);
    let prefResult = null, prefError = null;
    try {
      const pref = await preferenceClient.create({
        body: {
          items: [{ title: 'Diag item', unit_price: 1, quantity: 1 }],
          back_urls: {
            success: `${PUBLIC_URL}/payment-result?status=success`,
            failure: `${PUBLIC_URL}/payment-result?status=failure`,
            pending: `${PUBLIC_URL}/payment-result?status=pending`,
          },
        },
      });
      prefResult = {
        id: pref?.id,
        init_point: pref?.init_point,
        sandbox_init_point: pref?.sandbox_init_point,
      };
    } catch (err) {
      prefError = {
        message: err?.message,
        status: err?.status,
        cause: err?.cause,
        errors: err?.errors,
        body: err?.body,
      };
    }

    return res.json({
      ok: true,
      envReport,
      meResp: {
        status: meResp.status,
        site_id: meJson?.site_id,
        default_currency_id: meJson?.default_currency_id,
        nickname: meJson?.nickname,
      },
      prefResult,
      prefError,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, diagError: e?.message || String(e) });
  }
};
