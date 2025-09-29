// controllers/purchase.controller.js
const Purchase = require('../models/purchase.model');

// 📌 Compras del usuario logueado
exports.getMyPurchases = async (req, res) => {
  try {
    const list = await Purchase.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error('Error getMyPurchases:', e);
    res.status(500).json({ message: 'Error obteniendo compras' });
  }
};

// 📌 Crear nueva compra
exports.createPurchase = async (req, res) => {
  try {
    const { items, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'La compra no tiene productos' });
    }

    const purchase = new Purchase({
      user: req.user._id,
      items,
      total,
    });

    await purchase.save();
    res.status(201).json(purchase);
  } catch (e) {
    console.error('Error createPurchase:', e);
    res.status(500).json({ message: 'Error creando compra' });
  }
};

// 📌 Marcar compra como devuelta
exports.returnPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findOne({ _id: id, user: req.user._id });

    if (!purchase) {
      return res.status(404).json({ message: 'Compra no encontrada' });
    }

    purchase.status = 'returned';
    await purchase.save();

    res.json({ message: 'Compra devuelta', purchase });
  } catch (e) {
    console.error('Error returnPurchase:', e);
    res.status(500).json({ message: 'Error procesando devolución' });
  }
};
