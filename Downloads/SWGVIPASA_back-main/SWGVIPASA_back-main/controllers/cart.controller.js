// controllers/cart.controller.js
const CartItem    = require('../models/CartItem');
const mercadopago = require('mercadopago');
const PDFDocument = require('pdfkit');
const nodemailer  = require('nodemailer');

// Configuración de MercadoPago v1.x
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// POST /api/cart       -> añadir o incrementar ítem
exports.addCart = async (req, res) => {
  const userId    = req.user._id;
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
};

// GET /api/cart       -> listar carrito
exports.getCart = async (req, res) => {
  const userId = req.user._id;
  const items  = await CartItem.find({ user: userId }).populate('product');
  res.json(items);
};

// DELETE /api/cart/:id  -> quitar ítem
exports.removeCart = async (req, res) => {
  const { id } = req.params;
  await CartItem.findByIdAndDelete(id);
  res.json({ message: 'Ítem eliminado' });
};

// POST /api/cart/checkout        -> crear preferencia de MercadoPago
exports.createPreference = async (req, res) => {
  try {
    const userId = req.user._id;
    const email  = req.user.email;

    const items = await CartItem.find({ user: userId }).populate('product');
    if (items.length === 0) {
      return res.status(400).json({ message: 'Carrito vacío' });
    }

    const preferenceItems = items.map(item => ({
      title:       item.product.name,
      unit_price:  Number(item.product.price),
      quantity:    item.quantity,
      currency_id: 'PEN'
    }));

    const preference = {
      items: preferenceItems,
      payer: { email },
      back_urls: {
        success: `${process.env.FRONT_URL}/cart/success`,
        failure: `${process.env.FRONT_URL}/cart`,
        pending: `${process.env.FRONT_URL}/cart`
      },
      auto_return: 'approved',
      binary_mode: true
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (err) {
    console.error('Error creando preferencia MP:', err);
    res.status(500).json({ message: 'Error al crear preferencia de pago' });
  }
};

// GET /api/cart/checkout/success  -> procesar pago aprobado, generar boleta y enviar correo
exports.paymentSuccess = async (req, res) => {
  const { collection_id } = req.query;
  const userId = req.user._id;
  const email  = req.user.email;

  try {
    const mpRes = await mercadopago.payment.findById(collection_id);
    if (mpRes.body.status !== 'approved') {
      return res.status(400).json({ message: 'Pago no aprobado' });
    }

    const items = await CartItem.find({ user: userId }).populate('product');
    const total = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);

    // Generar PDF
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);

      // Enviar correo
      const transporter = nodemailer.createTransport({
        host:    process.env.SMTP_HOST,
        port:    Number(process.env.SMTP_PORT),
        secure:  process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from:        process.env.SMTP_FROM,
        to:          email,
        subject:     'Boleta de Compra',
        text:        'Adjunto encontrarás tu boleta de compra. ¡Gracias por tu preferencia!',
        attachments: [{ filename: 'boleta.pdf', content: pdfData }]
      });

      // Vaciar carrito
      await CartItem.deleteMany({ user: userId });
      res.json({ message: 'Pago aprobado y boleta enviada' });
    });

    // Contenido del PDF
    doc.fontSize(20).text('Boleta de Compra', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Usuario: ${email}`);
    doc.text(`Fecha: ${new Date().toLocaleString()}`);
    doc.moveDown();
    items.forEach(it => {
      doc.text(`${it.product.name} x ${it.quantity} = S/ ${(it.product.price * it.quantity).toFixed(2)}`);
    });
    doc.moveDown();
    doc.fontSize(14).text(`Total: S/ ${total.toFixed(2)}`, { align: 'right' });
    doc.end();

  } catch (err) {
    console.error('Error procesando pago:', err);
    res.status(500).json({ message: 'Error procesando pago' });
  }
};