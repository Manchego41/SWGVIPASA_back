// controllers/user.controller.js
const mongoose = require('mongoose');
const User = require('../models/User');

// GET /api/users
exports.getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  const user = await User.findById(id).select('-password');
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json(user);
};

// PUT /api/users/:id/role
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  user.role = role;
  await user.save();
  res.json({ message: 'Rol actualizado' });
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  await user.remove();
  res.json({ message: 'Usuario eliminado' });
};

// GET /api/users/me
exports.getMe = async (_req, res) => {
  res.json(res.req.user);
};

// PUT /api/users/me
exports.updateMe = async (req, res) => {
  const { name, email } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  if (name) user.name = name;
  if (email) user.email = email;
  await user.save();
  res.json({ message: 'Perfil actualizado' });
};

/**
 * GET /api/users/clients-with-purchases
 * SOLO clientes con ≥1 compra. Lee ids desde 'purchases' y filtra ObjectId válidos.
 */
exports.getClientsWithPurchases = async (_req, res) => {
  try {
    const rawIds = await mongoose.connection
      .collection('purchases')
      .distinct('user');

    const buyerIds = rawIds
      .filter((v) => mongoose.isValidObjectId(v))
      .map((v) => new mongoose.Types.ObjectId(v));

    if (buyerIds.length === 0) return res.json([]);

    const users = await User.find({
      _id: { $in: buyerIds },
      role: 'cliente',
    })
      .select('name email role')
      .sort({ name: 1, email: 1 });

    return res.json(users);
  } catch (e) {
    console.error('getClientsWithPurchases error:', e);
    return res.status(500).json({
      message: 'Error obteniendo usuarios con compras',
      detail: String(e?.message || e),
    });
  }
};

/**
 * GET /api/users/clients-with-count
 * TODOS los clientes + purchasesCount (0 si no tiene).
 */
exports.getClientsWithCount = async (_req, res) => {
  try {
    const grouped = await mongoose.connection
      .collection('purchases')
      .aggregate([
        { $match: { user: { $type: 'objectId' } } },
        { $group: { _id: '$user', count: { $sum: 1 } } },
      ])
      .toArray();

    const countMap = new Map(grouped.map(g => [String(g._id), g.count]));

    const clients = await User.find({ role: 'cliente' })
      .select('name email role')
      .sort({ name: 1, email: 1 });

    const result = clients.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      purchasesCount: countMap.get(String(u._id)) || 0,
    }));

    return res.json(result);
  } catch (e) {
    console.error('getClientsWithCount error:', e);
    return res.status(500).json({
      message: 'Error obteniendo clientes',
      detail: String(e?.message || e),
    });
  }
};