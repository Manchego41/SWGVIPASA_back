// middlewares/auth.middleware.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Rutas públicas exactas y prefijos permitidos sin JWT
const PUBLIC_EXACT = new Set([
  '/status',
  // agrega aquí otras exactas si quieres
  // '/api/auth/login',
  // '/api/auth/register',
]);

const PUBLIC_PREFIXES = [
  '/api/payments', // ✅ todo lo de pagos SIN JWT
];

exports.protect = async (req, res, next) => {
  try {
    const fullPath =
      (req.baseUrl ? String(req.baseUrl) : '') +
      (req.path ? String(req.path) : '');

    // Preflight CORS
    if (req.method === 'OPTIONS') return next();

    // Rutas públicas
    if (PUBLIC_EXACT.has(fullPath)) return next();
    if (PUBLIC_PREFIXES.some(prefix => fullPath.startsWith(prefix))) return next();

    // --- Desde aquí, JWT requerido ---
    const auth = req.headers.authorization || '';
    const [type, token] = auth.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({
        message: 'No se envió token (Authorization: Bearer <token>)',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Ajusta si tu token usa otras claves
    req.user = { id: decoded.id, role: decoded.role, name: decoded.name };

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// ✅ Middleware de admin requerido por tus rutas
exports.isAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado (admin)' });
    }
    return next();
  } catch {
    return res.status(403).json({ message: 'Acceso denegado (admin)' });
  }
};


