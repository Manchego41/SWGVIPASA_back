// SWGVIPASA_back/controllers/receipt.controller.js
const Receipt = require('../models/Receipt');

exports.getReceipt = async (req, res) => {
  try {
    const id = req.params.id;
    const r = await Receipt.findById(id).populate('purchase').lean();
    if (!r) return res.status(404).json({ message: 'Boleta no encontrada' });

    // seguridad: permitir solo al dueño o admin
    const requester = req.user;
    if (String(r.user) !== String(requester._id) && requester.role !== 'administrador') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.json(r);
  } catch (err) {
    console.error('getReceipt', err);
    res.status(500).json({ message: 'Error obteniendo boleta' });
  }
};

// endpoint para descargar imagen/archivo que devuelve el dataURL como imagen
exports.downloadQrImage = async (req, res) => {
  try {
    const r = await Receipt.findById(req.params.id).lean();
    if (!r) return res.status(404).send('Not found');
    // seguridad:
    if (String(r.user) !== String(req.user._id) && req.user.role !== 'administrador') {
      return res.status(403).send('Forbidden');
    }
    // r.qrDataUrl es "data:image/png;base64,...."
    const parts = (r.qrDataUrl || '').split(',');
    if (parts.length !== 2) return res.status(400).send('No QR');

    const mime = parts[0].replace('data:', '').replace(';base64', '');
    const buf = Buffer.from(parts[1], 'base64');
    res.setHeader('Content-Type', mime);
    // download filename:
    res.setHeader('Content-Disposition', `attachment; filename="boleta-${r.code}.png"`);
    res.send(buf);
  } catch (err) {
    console.error('downloadQrImage', err);
    res.status(500).send('Error');
  }
};