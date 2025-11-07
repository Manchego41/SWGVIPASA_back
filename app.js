// app.js
const express = require('express');
const cors    = require('cors');
const mercadopago = require('mercadopago');           // ⬅️ SDK v1
mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const productRoutes   = require('./routes/product.routes');
const cartRoutes      = require('./routes/cart.routes');
const reportsRoutes   = require('./routes/reports.routes');
const purchasesRoutes = require('./routes/purchase.routes');

const app = express();
const paymentRoutes   = require('./routes/payment.routes');

app.use(cors());
app.use(express.json());

// sanity check
app.get('/api/health', (_req,res) => res.json({ ok:true, ts: Date.now() }));

app.post('/api/payments/create', async (req, res) => {
  try {
    const FRONT = (process.env.PUBLIC_URL || process.env.FRONT_URL || 'http://localhost:5173').trim();

    // items esperados: [{ title, unit_price, quantity, currency_id? }]
    const itemsBody = Array.isArray(req.body?.items) ? req.body.items : [];
    const items = (itemsBody.length ? itemsBody : [{ title: 'Productos', unit_price: 1, quantity: 1 }])
      .map(it => ({
        title: String(it.title || 'Producto'),
        unit_price: Number(it.unit_price || 0),
        quantity: Number(it.quantity || 1),
        currency_id: it.currency_id || 'PEN',
      }));

    const pref = await mercadopago.preferences.create({
      items,
      back_urls: {
        success: `${FRONT}/payment-result?status=success`,
        failure: `${FRONT}/payment-result?status=failure`,
        pending: `${FRONT}/payment-result?status=pending`,
      },
      // Deja sin auto_return en sandbox para evitar el error de validación
      // auto_return: 'approved',
      external_reference: `order-${Date.now()}`
    });

    return res.json({
      ok: true,
      id: pref?.body?.id,
      init_point: pref?.body?.init_point,
      sandbox_init_point: pref?.body?.sandbox_init_point,
    });
  } catch (e) {
    console.error('[MP create] error:', e?.message, e?.cause || e?.errors || e?.body);
    return res.status(500).json({ ok: false, message: 'Error creando preferencia' });
  }
});

app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/cart',      cartRoutes);
app.use('/api/reports',   reportsRoutes);
app.use('/api/purchases', purchasesRoutes);

app.use('/api/payments',  paymentRoutes);

module.exports = app;