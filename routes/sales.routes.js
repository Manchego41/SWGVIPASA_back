// routes/sales.routes.js
const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");

// 📌 Obtener todas las ventas (para el dashboard)
router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("product", "name price") // muestra info básica del producto
      .populate("user", "name email");   // muestra info básica del usuario
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Registrar una venta (ejemplo, lo podrías conectar al checkout)
router.post("/", async (req, res) => {
  try {
    const { product, user, quantity, total } = req.body;

    const newSale = new Sale({
      product,
      user,
      quantity,
      total,
    });

    const savedSale = await newSale.save();
    res.status(201).json(savedSale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
