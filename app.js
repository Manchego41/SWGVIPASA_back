// app.js
const express = require('express');
const cors    = require('cors');

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const productRoutes   = require('./routes/product.routes');
const cartRoutes      = require('./routes/cart.routes');
const reportsRoutes   = require('./routes/reports.routes');
const purchasesRoutes = require('./routes/purchase.routes');
const favoritesRoutes = require('./routes/favorite.routes'); // NUEVO

const app = express();

app.use(cors());
app.use(express.json());

// sanity check
app.get('/api/health', (_req,res) => res.json({ ok:true, ts: Date.now() }));

app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/cart',      cartRoutes);
app.use('/api/reports',   reportsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/favorites', favoritesRoutes); // NUEVO

module.exports = app;