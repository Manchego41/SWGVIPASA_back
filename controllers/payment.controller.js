// Controlador temporal para resolver el error
exports.createPayment = async (req, res) => {
  try {
    console.log('✅ Pago simulado recibido');
    
    res.status(200).json({
      success: true,
      message: 'Pago simulado procesado correctamente',
      payment: {
        id: 'sim_' + Date.now(),
        status: 'approved',
        transaction_id: 'TXN_' + Math.random().toString(36).substr(2, 9)
      }
    });
  } catch (error) {
    console.error('❌ Error en pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el pago'
    });
  }
};