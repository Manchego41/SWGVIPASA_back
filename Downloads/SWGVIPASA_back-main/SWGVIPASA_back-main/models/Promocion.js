const mongoose = require("mongoose");

const promocionSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  tipo: { type: String, required: true, trim: true },
  descuento: { type: Number, required: true, min: 0, max: 100 },
  productosAplicables: [{ type: String, trim: true }],
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  activa: { type: Boolean, default: true },
  minCompra: { type: Number, default: 0 },
  codigo: {
    type: String,
    unique: true,
    sparse: true, // permite null o undefined
    trim: true,
    uppercase: true,
    default: undefined, // <- IMPORTANTE: si no hay código, queda undefined
  },
  descripcion: { type: String, trim: true },
}, { timestamps: true });

// Validaciones antes de guardar
promocionSchema.pre("save", function (next) {
  if (this.fechaInicio >= this.fechaFin) {
    return next(new Error("La fecha de inicio debe ser anterior a la fecha de fin"));
  }
  if (isNaN(this.descuento) || this.descuento < 0 || this.descuento > 100) {
    return next(new Error("El descuento debe estar entre 0 y 100"));
  }
  if (this.codigo === "") this.codigo = undefined; // <- evita el string vacío
  next();
});

module.exports = mongoose.model("Promocion", promocionSchema);
