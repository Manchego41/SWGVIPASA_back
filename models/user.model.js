// SWGVIPASA_back/models/user.model.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true
  },
  username: {
    type: String, required: true, unique: true, trim: true
  },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true,
    validate: {
      validator: v => v.endsWith('@gmail.com'),
      message: 'Sólo se aceptan correos @gmail.com'
    }
  },
  password: {
    type: String, required: true, minlength: 6
  },
  role: {
    type: String,
    enum: ['administrador','vendedor','cliente'],
    default: 'cliente'
  }
});

// Hash antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Comparar contraseña
userSchema.methods.matchPassword = function(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);