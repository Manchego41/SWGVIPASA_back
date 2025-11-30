// controllers/receipt.controller.js
const Receipt = require('../models/Receipt');
const mongoose = require('mongoose');

/**
 * GET /api/cart/receipts/:id
 * Devuelve el receipt (meta + qrDataUrl + documentHtml)
 */
exports.getReceipt = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Id inválido' });
    }
    const row = await Receipt.findById(id).lean();
    if (!row) return res.status(404).json({ message: 'No encontrado' });
    res.json(row);
  } catch (e) {
    console.error('getReceipt error', e);
    res.status(500).json({ message: 'Error obteniendo receipt' });
  }
};

/**
 * GET /api/cart/receipts/:id/download
 * Si hay documentHtml -> lo envía como attachment HTML
 * Si no hay HTML pero hay qrDataUrl -> decodifica base64 y lo envía como image/png
 */
exports.downloadQrImage = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Id inválido' });
    }
    const row = await Receipt.findById(id).lean();
    if (!row) return res.status(404).json({ message: 'No encontrado' });

    if (row.documentHtml) {
      // descargar HTML
      res.setHeader('Content-Disposition', `attachment; filename=boleta-${row.code || id}.html`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(row.documentHtml);
    }

    if (row.qrDataUrl && String(row.qrDataUrl).startsWith('data:image/')) {
      // data:image/png;base64,....
      const parts = row.qrDataUrl.split(',');
      const meta = parts[0];
      const b64 = parts[1];
      const buffer = Buffer.from(b64 || '', 'base64');
      const ext = meta.includes('png') ? 'png' : (meta.includes('jpeg') ? 'jpg' : 'png');
      res.setHeader('Content-Disposition', `attachment; filename=qr-${row.code || id}.${ext}`);
      res.setHeader('Content-Type', `image/${ext}`);
      return res.send(buffer);
    }

    // fallback: no content
    return res.status(404).json({ message: 'No hay documento disponible para descargar' });
  } catch (e) {
    console.error('downloadQrImage error', e);
    res.status(500).json({ message: 'Error descargando receipt' });
  }
};