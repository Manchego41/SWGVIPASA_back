// controllers/cart.controller.js
const CartItem = require('../models/CartItem');
const Purchase = require('../models/purchase.model');

const addCart = async (req, res) => {
  try {
    const userId        = req.user._id;
    const { productId } = req.body;

    let item = await CartItem.findOne({ user: userId, product: productId });
    if (item) {
      item.quantity++;
      await item.save();
    } else {
      item = await CartItem.create({ user: userId, product: productId });
    }
    await item.populate('product');
    res.json(item);
  } catch (err) {
    console.error('addCart error:', err);
    res.status(500).json({ message: 'Error agregando al carrito' });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const items  = await CartItem.find({ user: userId }).populate('product');
    res.json(items);
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ message: 'Error obteniendo el carrito' });
  }
};

const removeCart = async (req, res) => {
  try {
    const { id } = req.params;
    await CartItem.findByIdAndDelete(id);
    res.json({ message: 'Ítem eliminado' });
  } catch (err) {
    console.error('removeCart error:', err);
    res.status(500).json({ message: 'Error eliminando ítem' });
  }
};

// Actualiza la cantidad de un ítem del carrito
const updateCartQuantity = async (req, res) => {
  try {
    const userId   = req.user._id;
    const { id }   = req.params;        // id del CartItem
    const { quantity } = req.body;      // nueva cantidad

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ message: 'Cantidad inválida' });
    }

    const item = await CartItem.findOne({ _id: id, user: userId });
    if (!item) {
      return res.status(404).json({ message: 'Ítem no encontrado' });
    }

    if (qty === 0) {
      await item.deleteOne();
      return res.status(204).send(); // sin contenido
    }

    item.quantity = qty;
    await item.save();

    // opcional: devolver con el producto populado para que el front tenga todo
    const populated = await CartItem.findById(item._id).populate('product');
    return res.json(populated);
  } catch (err) {
    console.error('updateCartQuantity error:', err);
    return res.status(500).json({ message: 'Error actualizando la cantidad' });
  }
};


const checkoutLocal = async (req, res) => {
  try {
    const userId = req.user._id;

    const items = await CartItem.find({ user: userId }).populate('product');
    if (items.length === 0) {
      return res.status(400).json({ message: 'Carrito vacío' });
    }

    const purchaseItems = items.map(it => ({
      product:  it.product._id,
      name:     it.product.name ?? it.product.nombre ?? 'Producto',
      price:    Number(it.product.price ?? it.product.precio ?? 0),
      quantity: Number(it.quantity),
    }));

    const total = purchaseItems.reduce((s, it) => s + it.price * it.quantity, 0);

    const purchase = await Purchase.create({
      user:  userId,
      items: purchaseItems,
      total,
    });

    await CartItem.deleteMany({ user: userId }); // vaciar carrito

    res.status(201).json({ message: 'Compra registrada', purchase });
  } catch (err) {
    console.error('checkoutLocal error:', err);
    res.status(500).json({ message: 'Error registrando la compra' });
  }
};

module.exports = {
  addCart,
  getCart,
  removeCart,
  checkoutLocal,
  updateCartQuantity,
};