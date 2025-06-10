const Cart = require('../models/cart.model');

exports.getCart = async (req, res) => {
  const userId = req.user.id;
  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  res.json({ items: cart.items });
};

exports.addToCart = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });

  const item = cart.items.find(i => i.product.toString() === productId);
  if (item) {
    item.quantity += 1;
  } else {
    cart.items.push({ product: productId, quantity: 1 });
  }
  await cart.save();
  res.json(cart);
};

exports.removeFromCart = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) return res.status(404).json({ message: 'Carrito vacío' });

  cart.items = cart.items.filter(i => i.product.toString() !== productId);
  await cart.save();
  res.json(cart);
};