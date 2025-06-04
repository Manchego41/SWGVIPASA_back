// hash-password.js
const bcrypt = require('bcryptjs');

// Cambia 'admin123' por la contraseña que quieras encriptar:
const plainPassword = 'admin123';

bcrypt.hash(plainPassword, 10, (err, hash) => {
  if (err) {
    console.error('Error al generar el hash:', err);
    process.exit(1);
  }
  console.log('Hash generado:', hash);
  process.exit(0);
});