// app.js
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const productRoutes = require("./routes/product.routes");
const userRoutes = require("./routes/user.routes");
const cartRoutes = require("./routes/cart.routes");
const contactRoutes = require("./routes/contact.routes");
const authRoutes = require("./routes/auth.routes");

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

// Montaje de rutas (elige tu convención)
app.use("/api/products", productRoutes);   // ← si usas esta, el listado es GET /api/products
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/auth", authRoutes);


// Healthcheck rápido
app.get("/health", (req, res) => res.json({ ok: true }));

module.exports = app;
