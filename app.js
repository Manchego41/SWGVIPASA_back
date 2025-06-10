const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes    = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes    = require('./routes/cart.routes');
const userRoutes    = require('./routes/user.routes');
const contactRoutes = require('./routes/contact.routes');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth',    authRoutes);
app.use('/api/products',productRoutes);
app.use('/api/cart',    cartRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/contact', contactRoutes);

module.exports = app;