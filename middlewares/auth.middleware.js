// middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protege rutas: requiere un token Bearer válido
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'No se envió token (Authorization: Bearer <token>)' });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Cargar usuario (sin contraseña)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    // Adjuntar usuario a la request y seguir
    req.user = user;
    return next();
  } catch (err) {
    // Expirado o inválido
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Solo permite rol "administrador"
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'administrador') {
    return res.status(403).json({ message: 'Acceso prohibido: se requiere rol administrador' });
  }
  return next();
};

// (Opcional) Permitir uno o varios roles: isRole('administrador'), isRole('vendedor','administrador'), etc.
exports.isRole = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acceso prohibido: rol no autorizado' });
    }
    return next();
  };
};
