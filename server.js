require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const purchasesRoutes = require("./routes/purchases.routes");

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tu_bd';
const PORT = process.env.PORT || 5000;

app.use("/api/purchases", purchasesRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    app.listen(PORT, () => {
      console.log(`Servidor arrancado en puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar MongoDB:', err);
    process.exit(1);
  });
