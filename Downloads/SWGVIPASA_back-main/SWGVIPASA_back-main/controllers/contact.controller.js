// SWGVIPASA_back/controllers/contact.controller.js
const Contact = require('../models/contact.model');

exports.submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ message: 'Faltan campos obligatorios' });

    await Contact.create({ name, email, message });
    res.status(200).json({ message: 'Mensaje recibido correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al enviar mensaje' });
  }
};