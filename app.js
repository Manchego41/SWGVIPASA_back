
const express        = require('express');
const cors           = require('cors');

const authRoutes     = require('./routes/auth.routes');
const userRoutes     = require('./routes/user.routes');
const productRoutes  = require('./routes/product.routes');
const cartRoutes     = require('./routes/cart.routes');
const purchaseRoutes = require('./routes/purchase.routes');


const app = express();

// Middlewares base
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.FRONTEND_URL
  ],
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json()); // importante para leer JSON
app.use(express.urlencoded({ extended: true }));


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/purchases', purchaseRoutes);


// Healthcheck rápido
app.get("/health", (req, res) => res.json({ ok: true }));

module.exports = app;
