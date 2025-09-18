const User = require('../models/User');

// GET /api/users
exports.getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json(user);
};

// PUT /api/users/:id/role
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  user.role = role;
  await user.save();
  res.json({ message: 'Rol actualizado' });
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  await user.remove();
  res.json({ message: 'Usuario eliminado' });
};

// GET/PUT /api/users/me
exports.getMe = async (req, res) => {
  res.json(req.user);
};

exports.updateMe = async (req, res) => {
  const { name, email } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (email) user.email = email;
  await user.save();
  res.json({ message: 'Perfil actualizado' });
};