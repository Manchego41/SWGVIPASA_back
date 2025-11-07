// controllers/simulatedPayment.controller.js

const SimulatedPayment = require('../models/SimulatedPayment');
const CartItem = require('../models/CartItem');

exports.createSimulatedPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { payment_method, customer_name, customer_email, notes } = req.body;

    // Validar datos requeridos
    if (!payment_method || !customer_name || !customer_email) {
      return res.status(400).json({ 
        message: 'Método de pago, nombre y email son requeridos' 
      });
    }

    // Obtener items del carrito
    const cartItems = await CartItem.find({ user: userId }).populate('product');
    
    if (!cartItems.length) {
      return res.status(400).json({ message: 'El carrito está vacío' });
    }

    // Preparar items para el pago
    const paymentItems = cartItems.map(item => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    }));

    const total = paymentItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    // Crear registro de pago simulado
    const simulatedPayment = await SimulatedPayment.create({
      user: userId,
      items: paymentItems,
      total,
      payment_method,
      customer_name,
      customer_email,
      notes,
      status: 'simulated_submitted'
    });

    // Vaciar carrito después del "pago"
    await CartItem.deleteMany({ user: userId });

    console.log(`✅ Pago simulado registrado: ${simulatedPayment.simulated_transaction_id}`);

    res.status(201).json({
      message: 'Pago simulado registrado exitosamente',
      payment: {
        id: simulatedPayment._id,
        transaction_id: simulatedPayment.simulated_transaction_id,
        total: simulatedPayment.total,
        status: simulatedPayment.status,
        method: simulatedPayment.payment_method
      }
    });

  } catch (error) {
    console.error('❌ Error en pago simulado:', error);
    res.status(500).json({ 
      message: 'Error al procesar el pago simulado',
      error: error.message 
    });
  }
};