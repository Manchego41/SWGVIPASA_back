const CartItem = require('../models/CartItem');

// POST /api/cart    -> añadir o incrementar
exports.addCart = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.body;

  let item = await CartItem.findOne({ user: userId, product: productId });
  if (item) {
    item.quantity++;
    await item.save();
  } else {
    item = await CartItem.create({ user: userId, product: productId });
  }
  // poblamos para devolver info de producto
  await item.populate('product');
  res.status(201).json(item);
};

// GET /api/cart    -> listar carrito
exports.getCart = async (req, res) => {
  const userId = req.user._id;
  const items = await CartItem
    .find({ user: userId })
    .populate('product');
  res.json(items);
};

// DELETE /api/cart/:id   -> quitar un ítem
exports.removeCart = async (req, res) => {
  const { id } = req.params;
  await CartItem.findByIdAndDelete(id);
  res.json({ message: 'Ítem eliminado' });
};