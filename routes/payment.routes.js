// routes/payment.routes.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL =
  (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) ||
  (process.env.FRONT_URL && process.env.FRONT_URL.trim()) ||
  'http://localhost:5173';

/**
 * Compatibilidad SDK:
 * - v2:  import { MercadoPagoConfig, Preference } from 'mercadopago'
 * - v1:  const mercadopago = require('mercadopago'); mercadopago.configure(...)
 */
let useV2 = false;
let PreferenceV2 = null;
let mpClientV2 = null;
let mpV1 = null;

try {
  // Intento v2 (si tu node_modules trae clases)
  const maybe = require('mercadopago');
  if (maybe && typeof maybe.MercadoPagoConfig === 'function') {
    useV2 = true;
    PreferenceV2 = maybe.Preference;
    mpClientV2 = new maybe.MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
  } else {
    // v1
    mpV1 = require('mercadopago');
    mpV1.configure({ access_token: MP_ACCESS_TOKEN });
  }
} catch (e) {
  // fallback v1
  mpV1 = require('mercadopago');
  mpV1.configure({ access_token: MP_ACCESS_TOKEN });
}

/**
 * Crea preferencia usando v2 o v1 según lo disponible
 */
async function createPreference({ items, back_urls, external_reference }) {
  if (useV2) {
    const pref = await new PreferenceV2(mpClientV2).create({
      body: { items, back_urls, external_reference },
    });
    // v2 ya devuelve campos directos
    return {
      id: pref?.id,
      init_point: pref?.init_point,
      sandbox_init_point: pref?.sandbox_init_point,
    };
  } else {
    // v1 devuelve en .body
    const pref = await mpV1.preferences.create({
      items, back_urls, external_reference,
    });
    return {
      id: pref?.body?.id,
      init_point: pref?.body?.init_point,
      sandbox_init_point: pref?.body?.sandbox_init_point,
    };
  }
}

// POST /api/payments/create
// Body: { items: [{ title, unit_price, quantity, currency_id? }] }
router.post('/create', async (req, res) => {
  try {
    const itemsBody = Array.isArray(req.body?.items) ? req.body.items : [];
    const items = (itemsBody.length ? itemsBody : [{ title: 'Productos', unit_price: 1, quantity: 1 }])
      .map(it => ({
        title: String(it.title || 'Producto'),
        unit_price: Number(it.unit_price || 0),
        quantity: Number(it.quantity || 1),
        currency_id: it.currency_id || 'PEN',
      }));

    const back_urls = {
      success: `${BASE_URL}/payment-result?status=success`,
      failure: `${BASE_URL}/payment-result?status=failure`,
      pending: `${BASE_URL}/payment-result?status=pending`,
    };

    // Nota: dejamos SIN auto_return para evitar el error “auto_return invalid...”
    const r = await createPreference({
      items,
      back_urls,
      external_reference: `order-${Date.now()}`,
    });

    if (!r?.sandbox_init_point && !r?.init_point) {
      return res.status(500).json({ ok: false, message: 'No se obtuvo init_point' });
    }

    res.json({ ok: true, ...r });
  } catch (e) {
    console.error('[MP create] error:', e?.message, e?.cause || e?.errors || e?.body);
    res.status(500).json({ ok: false, message: 'Error creando preferencia' });
  }
});

module.exports = router;


