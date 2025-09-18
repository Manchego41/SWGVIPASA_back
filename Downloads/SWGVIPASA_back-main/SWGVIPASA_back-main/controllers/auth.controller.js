// SWGVIPASA_back/controllers/auth.controller.js
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcryptjs');
const crypto    = require('crypto');
const User      = require('../models/User');
const sendEmail = require('../utils/mailer');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed });
  res.status(201).json({ message: 'Usuario registrado' });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
  }
  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({ token, role: user.role, name: user.name });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Si no existe, devolvemos éxito genérico para no filtrar emails
    if (!user) {
      return res.json({ message: 'Si el correo existe, recibirás instrucciones.' });
    }
    // Generar token y guardarlo en BBDD (hasheado)
    const token = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hora
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${token}`;
    const message = `Hola ${user.name},\n\n` +
      `Para restablecer tu contraseña haz click en el siguiente enlace:\n\n` +
      `${resetUrl}\n\n` +
      `Si no solicitaste este correo, ignóralo.`;

    await sendEmail(user.email, 'Recuperar contraseña', message);
    res.json({ message: 'Correo enviado con instrucciones.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error enviando correo.' });
  }
};

// POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado.' });
    }
    // Actualizar contraseña y limpiar campos
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al restablecer contraseña.' });
  }
};