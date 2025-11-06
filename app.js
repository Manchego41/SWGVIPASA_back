// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const simulatedPaymentRoutes = require('./routes/simulatedPayment.routes');

// 🔹 NUEVO: rutas de pagos (Mercado Pago)
const paymentRoutes = require('./routes/payment.routes');

const app = express();

// Si vas a usar ngrok / proxy para webhooks, esto ayuda con IPs reales:
// app.set('trust proxy', true);

// ---------- Middlewares base ----------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------- CORS ----------
/**
 * Permitimos llamadas desde el front (Vite por defecto en 5173)
 * Puedes cambiar FRONT_URL en tu .env si fuera otro dominio.
 */
const allowedOrigins = [
  process.env.FRONT_URL || 'http://localhost:5173',
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ---------- Archivos estáticos ----------
app.use('/uploads', express.static('uploads'));

// ---------- Rutas principales ----------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/simulated-payments', simulatedPaymentRoutes);

// 🔹 NUEVO: Pagos (Mercado Pago Sandbox)
app.use('/api/payments', paymentRoutes);

// ---------- Healthcheck /status ----------
app.get('/status', (_req, res) => {
  res.json({ ok: true, service: 'SWGVIPASA API', env: process.env.NODE_ENV || 'development' });
});

// ---------- 404 ----------
app.use((req, res, _next) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.originalUrl}` });
});

// ---------- Manejador de errores ----------
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app;
