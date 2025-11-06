// middlewares/auth.middleware.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Rutas públicas exactas y prefijos permitidos sin JWT
const PUBLIC_EXACT = new Set([
  '/status',
  // agrega aquí otras exactas si quieres dejarlas públicas
  // '/api/products', '/api/auth/login', '/api/auth/register',
]);

const PUBLIC_PREFIXES = [
  '/api/payments',            // ✅ todo pagos SIN JWT
  // agrega otros prefijos públicos si quieres
];

exports.protect = async (req, res, next) => {
  try {
    // Normaliza la ruta completa de la request
    const fullPath =
      (req.baseUrl ? String(req.baseUrl) : '') +
      (req.path ? String(req.path) : '');

    // Permitir preflight CORS sin token
    if (req.method === 'OPTIONS') return next();

    // Permitir rutas exactas públicas
    if (PUBLIC_EXACT.has(fullPath)) return next();

    // Permitir prefijos públicos (por ejemplo /api/payments/**)
    if (PUBLIC_PREFIXES.some(prefix => fullPath.startsWith(prefix))) {
      return next();
    }

    // --- A partir de aquí, exige JWT ---
    const auth = req.headers.authorization || '';
    const [type, token] = auth.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({
        message: 'No se envió token (Authorization: Bearer <token>)',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role, name: decoded.name };

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

