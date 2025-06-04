// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');  // ← NUEVO
const cartRoutes = require('./routes/cart.routes');        // ← NUEVO

const app = express();

app.use(cors());
app.use(express.json());

// Rutas originales
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Rutas nuevas
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

// Ruta raíz (opcional)
app.get('/', (req, res) => {
  res.send('API de SWGVIPASA funcionando');
});

module.exports = app;