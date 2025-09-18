// server.js
require('dotenv').config();
const mongoose = require('mongoose');

// Ajusta esta ruta si tu app.js está en otro sitio
// Si tu app.js está en la raíz del proyecto:
const app = require('./app');

// Si está en src/app.js, usa:
// const app = require('./src/app');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tu_bd';
const PORT     = process.env.PORT || 5000;

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