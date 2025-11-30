// SWGVIPASA_back/models/Receipt.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  total: { type: Number, default: 0 },
  method: { type: String, enum: ['efectivo','visa','yape','plin','other'], default: 'efectivo' },

  // Guardamos el QR como dataURL (base64 image/png) para mostrar/download rápido.
  qrDataUrl: { type: String },

  // HTML del comprobante (para abrir/descargar)
  documentHtml: { type: String },

  // opcional: url a archivo pdf si generas PDF en disco/almacenamiento en el futuro
  pdfUrl: { type: String },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Receipt || mongoose.model('Receipt', receiptSchema);