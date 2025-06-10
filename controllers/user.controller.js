const User = require('../models/user.model');

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

  const { name, email } = req.body;
  if (email && !email.endsWith('@gmail.com')) {
    return res.status(400).json({ message: 'Correo debe ser @gmail.com' });
  }

  user.name  = name  || user.name;
  user.email = email || user.email;
  await user.save();
  res.json({ message: 'Perfil actualizado' });
};