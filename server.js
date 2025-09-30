// server.js
require('dotenv').config();
const mongoose = require('mongoose');

// Importamos la app de Express
const app = require('./app');

// Importamos las rutas
const salesRoutes = require("./routes/sales.routes");

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tu_bd';
const PORT     = process.env.PORT || 5000;

// Montamos la ruta
app.use("/api/sales", salesRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    app.listen(PORT, () => {
      console.log(`Servidor arrancado en puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar MongoDB:', err);
    process.exit(1);
  });
