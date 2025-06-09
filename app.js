// SWGVIPASA_back/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes    = require('./routes/cart.routes');
const contactRoutes = require('./routes/contact.routes');   // ← nuevo

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',    authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/products',productRoutes);
app.use('/api/cart',    cartRoutes);
app.use('/api/contact', contactRoutes);                     // ← montamos nueva ruta

module.exports = app;