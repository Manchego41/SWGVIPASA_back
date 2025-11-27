// routes/payment.routes.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL =
  (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) ||
  (process.env.FRONT_URL && process.env.FRONT_URL.trim()) ||
  'http://localhost:5173';

// SDK: compatible V1 o V2
let useV2 = false;
let PreferenceV2 = null;
let mpClientV2 = null;
let mpV1 = null;

try {
  const maybe = require('mercadopago');
  if (maybe && typeof maybe.MercadoPagoConfig === 'function') {
    // SDK V2
    useV2 = true;
    PreferenceV2 = maybe.Preference;
    mpClientV2 = new maybe.MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN
    });
    console.log("MP SDK: usando V2");
  } else {
    // SDK V1
    mpV1 = require('mercadopago');
    mpV1.configure({ access_token: MP_ACCESS_TOKEN });
    console.log("MP SDK: usando V1");
  }
} catch (e) {
  // fallback V1
  mpV1 = require('mercadopago');
  mpV1.configure({ access_token: MP_ACCESS_TOKEN });
  console.log("MP SDK: fallback V1");
}

// Función para crear preferencia
async function createPreference({ items, back_urls, external_reference }) {
  if (useV2) {
    const pref = await new PreferenceV2(mpClientV2).create({
      body: {
        items,
        back_urls,
        external_reference,
        auto_return: "approved"
      }
    });

    return {
      id: pref?.id,
      init_point: pref?.init_point,
      sandbox_init_point: pref?.sandbox_init_point,
    };
  } else {
    const pref = await mpV1.preferences.create({
      items,
      back_urls,
      external_reference,
      auto_return: "approved",
    });

    return {
      id: pref?.body?.id,
      init_point: pref?.body?.init_point,
      sandbox_init_point: pref?.body?.sandbox_init_point,
    };
  }
}

// POST /api/payments/create
router.post('/create', async (req, res) => {
  try {
    const itemsBody = Array.isArray(req.body.items) ? req.body.items : [];

    if (!itemsBody.length) {
      return res.status(400).json({ ok: false, message: "No llegaron items" });
    }

    // *** VALIDACIÓN FUERTE (evita unit_price = 0) ***
    const items = itemsBody.map(it => {
      if (!it.title) throw new Error("Item sin título");

      const price = Number(it.unit_price);
      if (!price || price <= 0) {
        throw new Error("unit_price inválido. Debe ser mayor a 0");
      }

      const qty = Number(it.quantity);
      if (!qty || qty <= 0) {
        throw new Error("quantity inválido. Debe ser mayor a 0");
      }

      return {
        title: String(it.title),
        unit_price: price,
        quantity: qty,
        currency_id: "PEN"
      };
    });

    const back_urls = {
      success: `${BASE_URL}/payment-result?status=success`,
      failure: `${BASE_URL}/payment-result?status=failure`,
      pending: `${BASE_URL}/payment-result?status=pending`,
    };

    const pref = await createPreference({
      items,
      back_urls,
      external_reference: `order-${Date.now()}`,
    });

    if (!pref || (!pref.sandbox_init_point && !pref.init_point)) {
      return res.status(500).json({ ok: false, message: "Mercado Pago no devolvió init_point" });
    }

    res.json({
      ok: true,
      id: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
    });

  } catch (err) {
    console.error("[MP create] error:", err.message, err.errors || err.cause || err.body);
    res.status(500).json({ ok: false, message: err.message || 'Error creando preferencia' });
  }
});

module.exports = router;
