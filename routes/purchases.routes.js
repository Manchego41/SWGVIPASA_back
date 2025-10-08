const express = require("express");
const router = express.Router();
const Purchase = require("../models/purchases");

router.get("/", async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("product", "name price") // muestra info básica del producto
      .populate("user", "name email");   // muestra info básica del usuario
    res.json(purchases);
  } catch (err) {
    console.error("Error al obtener purchases:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { product, user, quantity, total } = req.body;

    const newPurchase = new Purchase({
      product,
      user,
      quantity,
      total,
    });

    const savedPurchase = await newPurchase.save();
    res.status(201).json(savedPurchase);
  } catch (err) {
    console.error("Error al registrar purchase:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
