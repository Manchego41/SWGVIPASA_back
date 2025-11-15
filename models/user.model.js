// models/user.model.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // Mantengo tu validación de @gmail.com
      validate: {
        validator: (v) => v.endsWith('@gmail.com'),
        message: 'Solo correos @gmail.com'
      }
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['administrador','vendedor','cliente'], default: 'cliente' },

    // NUEVO: favoritos por usuario (ids de Product)
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    // Campos opcionales que ya tenías
    resetPasswordToken:   String,
    resetPasswordExpires: Date
  },
  { timestamps: true }
);

// Hash si cambió el password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar contraseñas
userSchema.methods.matchPassword = async function(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Anti OverwriteModelError
module.exports = mongoose.models.User || mongoose.model('User', userSchema);