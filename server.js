// server.js
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Conectar a MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});