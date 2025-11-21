// routes/mp-webhook.routes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/", async (req, res) => {
  try {
    const { id, topic } = req.query;

    if (topic !== "payment") return res.sendStatus(200);

    const payment = await axios.get(
      `https://api.mercadopago.com/v1/payments/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      }
    );

    const info = payment.data;

    console.log("💰 Pago recibido:", info.status);

    // Aquí guardas en tu base de datos
    // ejemplo:
    // await Order.updateOne({ mp_id: id }, { status: info.status });

    res.sendStatus(200);

  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

module.exports = router;
