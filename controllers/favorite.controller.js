// controllers/favorite.controller.js
const User = require('../models/user.model');
const Product = require('../models/product.model');

exports.getMyFavorites = async (req, res) => {
  const { expand } = req.query;
  const user = await User.findById(req.user._id).lean();
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

  const ids = (user.favorites || []).map(String);
  if (!expand) return res.json({ items: ids });

  const prods = await Product.find({ _id: { $in: ids } }).lean();
  return res.json({
    items: prods.map(p => ({
      _id: p._id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl
    }))
  });
};

exports.addFavorite = async (req, res) => {
  const { productId } = req.params;
  const exists = await Product.exists({ _id: productId });
  if (!exists) return res.status(404).json({ message: 'Producto no existe' });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { favorites: productId } },
    { new: true }
  ).lean();

  return res.json({ items: (user.favorites || []).map(String) });
};

exports.removeFavorite = async (req, res) => {
  const { productId } = req.params;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { favorites: productId } },
    { new: true }
  ).lean();

  return res.json({ items: (user.favorites || []).map(String) });
};

// Si te gusta, aquí tienes toggle (opcional)
exports.toggleFavorite = async (req, res) => {
  const { productId } = req.params;
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });

  const i = (u.favorites || []).findIndex(id => String(id) === String(productId));
  if (i >= 0) u.favorites.splice(i, 1);
  else u.favorites.push(productId);

  await u.save();
  return res.json({ items: (u.favorites || []).map(String) });
};