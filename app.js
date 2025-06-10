// app.js
const express   = require('express');
const cors      = require('cors');
const authRoutes   = require('./routes/auth.routes');
const userRoutes   = require('./routes/user.routes');
const productRoutes= require('./routes/product.routes');
const cartRoutes   = require('./routes/cart.routes');
// … cualquier otra ruta que uses

const app = express();

app.use(cors());
app.use(express.json());

// Monta aquí tus rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

module.exports = app;