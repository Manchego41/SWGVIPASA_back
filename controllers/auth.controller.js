const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/mailer');

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'El correo ya está registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword, role });

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error en el registro', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.role, userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Error en el login', error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Correo no registrado' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 1000 * 60 * 60; // 1 hora

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    const resetLink = `http://localhost:5173/reset-password/${token}`;
    await sendEmail(
      email,
      'Recuperación de contraseña',
      `Haz clic en este enlace para cambiar tu contraseña:\n${resetLink}`
    );

    res.json({ message: 'Correo de recuperación enviado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al enviar correo', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Token inválido o expirado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al cambiar la contraseña', error: err.message });
  }
};