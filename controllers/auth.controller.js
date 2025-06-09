// SWGVIPASA_back/controllers/auth.controller.js
const jwt    = require('jsonwebtoken');
const User   = require('../models/user.model');
require('dotenv').config();

const generateToken = user =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

exports.register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password)
      return res.status(400).json({ message: 'Faltan campos obligatorios' });

    // Validación adicional ya está en el schema
    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });
    if (exists)
      return res.status(400).json({ message: 'Email o usuario ya registrado' });

    const user = await User.create({ name, username, email, password });
    const token = generateToken(user);

    res.json({
      user: {
        id: user._id, name: user.name,
        username: user.username, email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Faltan email o contraseña' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = generateToken(user);
    res.json({
      user: {
        id: user._id, name: user.name,
        username: user.username, email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};