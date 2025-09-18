// controllers/promocion.controller.js
const Promocion = require('../models/Promocion');

// Crear promoción
exports.crearPromocion = async (req, res) => {
  try {
    const data = { ...req.body };

    // Si llega código vacío, lo eliminamos para que MongoDB no lo guarde
    if (!data.codigo || data.codigo.trim() === "") {
      data.codigo = undefined;
    } else {
      data.codigo = data.codigo.trim().toUpperCase();
    }

    // Transformar productos en array si llega como string
    if (data.productos) {
      data.productosAplicables = data.productos
        .split(",")
        .map(p => p.trim())
        .filter(p => p !== "");
      delete data.productos;
    }

    const promocion = new Promocion(data);
    await promocion.save();
    res.status(201).json(promocion);
  } catch (error) {
    console.error(error);
    // Si es error de duplicado
    if (error.code === 11000) {
      return res.status(400).json({ error: "El código de promoción ya existe" });
    }
    res.status(400).json({ error: error.message });
  }
};



// Obtener todas las promociones
exports.obtenerPromociones = async (req, res) => {
  try {
    const promociones = await Promocion.find()
      .populate('productosAplicables', 'nombre precio')
      .sort({ createdAt: -1 });
    res.json(promociones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener promoción por ID
exports.obtenerPromocion = async (req, res) => {
  try {
    const promocion = await Promocion.findById(req.params.id)
      .populate('productosAplicables', 'nombre precio');
    
    if (!promocion) {
      return res.status(404).json({ error: 'Promoción no encontrada' });
    }
    
    res.json(promocion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar promoción
exports.actualizarPromocion = async (req, res) => {
  try {
    const promocion = await Promocion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('productosAplicables', 'nombre precio');
    
    if (!promocion) {
      return res.status(404).json({ error: 'Promoción no encontrada' });
    }
    
    res.json(promocion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar promoción
exports.eliminarPromocion = async (req, res) => {
  try {
    const promocion = await Promocion.findByIdAndDelete(req.params.id);
    
    if (!promocion) {
      return res.status(404).json({ error: 'Promoción no encontrada' });
    }
    
    res.json({ message: 'Promoción eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener promociones activas
exports.obtenerPromocionesActivas = async (req, res) => {
  try {
    const ahora = new Date();
    const promociones = await Promocion.find({
      activa: true,
      fechaInicio: { $lte: ahora },
      fechaFin: { $gte: ahora },
      $or: [
        { maxUsos: null },
        { maxUsos: { $gt: 0 }, usosActuales: { $lt: '$maxUsos' } }
      ]
    }).populate('productosAplicables', 'nombre precio');
    
    res.json(promociones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Validar código de promoción
exports.validarCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;
    const promocion = await Promocion.findOne({ codigo: codigo.toUpperCase() })
      .populate('productosAplicables', 'nombre precio');
    
    if (!promocion) {
      return res.status(404).json({ error: 'Código de promoción no válido' });
    }
    
    if (!promocion.estaActiva()) {
      return res.status(400).json({ error: 'Promoción no está activa' });
    }
    
    res.json(promocion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};