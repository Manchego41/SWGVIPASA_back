// SWGVIPASA_back/models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // Datos personales
  firstName: { type: String, default: '' },
  lastName:  { type: String, default: '' },
  document:  { type: String, default: '' }, // DNI / RUC / etc.
  gender:    { type: String, enum: ['male','female','other',''], default: '' },
  phone:     { type: String, default: '' },
  birthDate: { type: Date },

  // Dirección breve y campos extra
  address:   { type: String, default: '' },
  city:      { type: String, default: '' },
  zip:       { type: String, default: '' },

  // Meta
  notes:     { type: String, default: '' },

  updatedAt: { type: Date, default: Date.now }
},
{
  // opcional: timestamps si quieres createdAt/updatedAt automáticos
  timestamps: true
});

// Forzar el nombre de la colección que ya creaste en Compass:
profileSchema.set('collection', 'userprofiles');

module.exports = mongoose.models.Profile || mongoose.model('Profile', profileSchema);