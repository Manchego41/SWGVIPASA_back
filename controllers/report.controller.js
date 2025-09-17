const User = require('../models/User');
const Product = require('../models/Product');
const Contact = require('../models/contact.model');
const CartItem = require('../models/cartitem');

exports.getSummary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalContacts = await Contact.countDocuments();
    const totalCartItems = await CartItem.countDocuments();

    res.json([
      {
        id: "users",
        titulo: "Usuarios Registrados",
        valor: totalUsers,
        descripcion: "Cantidad total de usuarios en el sistema",
      },
      {
        id: "products",
        titulo: "Productos Disponibles",
        valor: totalProducts,
        descripcion: "Número total de productos en la base de datos",
      },
      {
        id: "contacts",
        titulo: "Mensajes de Contacto",
        valor: totalContacts,
        descripcion: "Total de mensajes recibidos desde el formulario de contacto",
      },
      {
        id: "cartItems",
        titulo: "Items en Carritos",
        valor: totalCartItems,
        descripcion: "Cantidad de productos actualmente en carritos",
      },
    ]);
  } catch (err) {
    console.error("Error en getSummary:", err);
    res.status(500).json({ message: "Error generando reportes" });
  }
};




