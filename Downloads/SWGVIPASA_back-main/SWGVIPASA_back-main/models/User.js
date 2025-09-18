// SWGVIPASA_back/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true },
    role:       { type: String, enum: ['administrador','vendedor','cliente'], default: 'cliente' },
    resetPasswordToken:   String,
    resetPasswordExpires: Date
  },
  { timestamps: true }
);

// Método para comparar contraseñas
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User
  ? mongoose.model('User')
  : mongoose.model('User', userSchema);