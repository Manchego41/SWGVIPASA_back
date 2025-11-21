// routes/payment.routes.js
const express = require('express');
const router = express.Router();
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

router.post('/create-preference', async (req, res) => {
  try {
    const { items } = req.body;

    console.log("📦 Items recibidos:", items);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No se recibieron productos" });
    }

    const preference = {
      items: items.map((p) => ({
        title: p.title,
        quantity: Number(p.quantity),
        unit_price: Number(p.unit_price),
        currency_id: "PEN",
      })),

      back_urls: {
        success: "http://localhost:5174/pago-exitoso",
        failure: "http://localhost:5174/pago-fallido",
        pending: "http://localhost:5174/pago-pendiente"
      },

      auto_return: "approved"
    };

    console.log("📝 Preference enviada a MercadoPago:", preference);

    const response = await mercadopago.preferences.create(preference);

    console.log("✅ Preferencia creada:", response.body);

    return res.json({
      id: response.body.id,
      init_point: response.body.init_point,
    });

  } catch (err) {
    console.error("🔥 ERROR EN PAYMENT ROUTE:", err);
    res.status(500).json({ error: "Error interno al generar preferencia" });
  }
});

module.exports = router;
