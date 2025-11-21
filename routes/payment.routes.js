const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/create-preference", async (req, res) => {
  try {
    const { items } = req.body;

    console.log("📦 Items recibidos:", items);

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
        pending: "http://localhost:5174/pago-pendiente",
      },
      auto_return: "approved",
    };

    console.log("📝 Preference enviada:", preference);

    const response = await axios.post(
      "https://api.mercadopago.com/checkout/preferences",
      preference,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Preferencia creada:", response.data);

    return res.json({
      id: response.data.id,
      init_point: response.data.init_point,
    });
  } catch (err) {
    console.error("🔥 ERROR EN PAYMENT ROUTE:", err.response?.data || err);
    res.status(500).json({ error: "Error al crear preferencia" });
  }
});

module.exports = router;
