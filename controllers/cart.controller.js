// controllers/cart.controller.js
const Cart = require('../models/cart.model');

exports.createCart = async (req, res) => {
  try {
    const newCart = new Cart(req.body);
    const savedCart = await newCart.save();
    return res.status(201).json(savedCart);
  } catch (error) {
    console.error('Error en createCart:', error);
    return res.status(500).json({ message: 'Error al crear el carrito' });
  }
};

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }
    return res.status(200).json(cart);
  } catch (error) {
    console.error('Error en getCart:', error);
    return res.status(500).json({ message: 'Error al obtener el carrito' });
  }
};

exports.updateCart = async (req, res) => {
  try {
    const updatedCart = await Cart.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updatedCart) {
      return res.status(404).json({ message: 'Carrito no encontrado para actualizar' });
    }
    return res.status(200).json(updatedCart);
  } catch (error) {
    console.error('Error en updateCart:', error);
    return res.status(500).json({ message: 'Error al actualizar el carrito' });
  }
};

exports.deleteCart = async (req, res) => {
  try {
    const deletedCart = await Cart.findByIdAndDelete(req.params.id);
    if (!deletedCart) {
      return res.status(404).json({ message: 'Carrito no encontrado para eliminar' });
    }
    return res.status(200).json({ message: 'Carrito eliminado correctamente' });
  } catch (error) {
    console.error('Error en deleteCart:', error);
    return res.status(500).json({ message: 'Error al eliminar el carrito' });
  }
};