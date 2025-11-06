// app.js
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const simulatedPaymentRoutes = require('./routes/simulatedPayment.routes');

const app = express();

// --- Middlewares base ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORS ---
// Permitimos llamadas desde el front (Vite por defecto en 5173)
// Puedes cambiar FRONT_URL en tu .env si fuera otro dominio.
const allowedOrigins = [process.env.FRONT_URL || 'http://localhost:5173'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);



// --- Servir archivos subidos ---
app.use('/uploads', express.static('uploads'));

// --- Rutas principales ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/simulated-payments', simulatedPaymentRoutes);

module.exports = app;
