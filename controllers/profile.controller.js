// SWGVIPASA_back/controllers/profile.controller.js
const mongoose = require('mongoose');
const Profile = require('../models/Profile');
const User = require('../models/user.model'); // ajusta si tu User model tiene otro nombre/ubicación

function requireAdmin(req, res) {
  if (req.user?.role !== 'administrador') {
    res.status(403).json({ message: 'Solo administradores' });
    return false;
  }
  return true;
}

// Helper: split user.name en first/last (fallbacks)
function splitName(fullName = '') {
  const s = String(fullName || '').trim();
  if (!s) return { firstName: '', lastName: '' };
  const parts = s.split(/\s+/);
  const firstName = parts.shift() || '';
  const lastName = parts.length ? parts.join(' ') : '';
  return { firstName, lastName };
}

/**
 * GET /api/profile/me
 * Devuelve perfil del usuario logueado (si existe).
 * Si no existe perfil, devuelve datos básicos del user (merge).
 */
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Obtener user básico
    const user = await User.findById(userId).select('name email').lean();

    // Buscar profile
    const profile = await Profile.findOne({ user: userId }).lean();

    if (!profile) {
      // No hay profile: devolver objeto "fusionado" con datos de user
      const nameParts = splitName(user?.name || '');
      return res.json({
        exists: false,
        user: {
          _id: userId,
          email: user?.email || '',
          name: user?.name || ''
        },
        profile: {
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          document: '',
          gender: '',
          phone: '',
          birthDate: null,
          address: '',
          city: '',
          zip: '',
          notes: ''
        }
      });
    }

    // Si existía profile, devolver fusionado
    res.json({
      exists: true,
      user: {
        _id: userId,
        email: user?.email || '',
        name: user?.name || ''
      },
      profile
    });
  } catch (e) {
    console.error('getMyProfile error', e);
    res.status(500).json({ message: 'Error obteniendo perfil' });
  }
};

/**
 * PATCH /api/profile/me
 * Upsert del perfil del usuario logueado.
 * Si recibes firstName/lastName, opcionalmente actualizas User.name para evitar duplicados.
 * Body: campos opcionales (firstName,lastName,document,gender,phone,birthDate,address,city,zip,notes)
 */
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const body = req.body || {};

    // Normalizar algunos campos
    const toSet = {};
    if (typeof body.firstName !== 'undefined') toSet.firstName = String(body.firstName || '').trim();
    if (typeof body.lastName !== 'undefined')  toSet.lastName  = String(body.lastName || '').trim();
    if (typeof body.document !== 'undefined')  toSet.document  = String(body.document || '').trim();
    if (typeof body.gender !== 'undefined')    toSet.gender    = String(body.gender || '').trim();
    if (typeof body.phone !== 'undefined')     toSet.phone     = String(body.phone || '').trim();
    if (typeof body.birthDate !== 'undefined' && body.birthDate) toSet.birthDate = new Date(body.birthDate);
    if (typeof body.address !== 'undefined')   toSet.address   = String(body.address || '').trim();
    if (typeof body.city !== 'undefined')      toSet.city      = String(body.city || '').trim();
    if (typeof body.zip !== 'undefined')       toSet.zip       = String(body.zip || '').trim();
    if (typeof body.notes !== 'undefined')     toSet.notes     = String(body.notes || '').trim();

    // Upsert (create if not exists)
    const updated = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: toSet, $setOnInsert: { user: userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    // Si el cliente envió nombres, sincronizamos el nombre en User.name (evita duplicados)
    const shouldUpdateUserName = (typeof body.firstName !== 'undefined' || typeof body.lastName !== 'undefined');
    if (shouldUpdateUserName) {
      try {
        // Leer profile final para componer nombre
        const finalFirst = (typeof body.firstName !== 'undefined') ? String(body.firstName || '').trim() : (updated.firstName || '');
        const finalLast  = (typeof body.lastName !== 'undefined') ? String(body.lastName || '').trim()  : (updated.lastName || '');
        const composed = `${finalFirst}${finalLast ? ' ' + finalLast : ''}`.trim();
        if (composed) {
          await User.findByIdAndUpdate(userId, { $set: { name: composed } }).exec();
        }
      } catch (userErr) {
        console.warn('updateMyProfile: fallo actualizar User.name (no crítico):', userErr?.message || userErr);
      }
    }

    // Devolver el perfil actualizado fusionado con datos del user
    const user = await User.findById(userId).select('name email').lean();
    res.json({
      exists: true,
      user: { _id: userId, email: user?.email || '', name: user?.name || '' },
      profile: updated
    });
  } catch (e) {
    console.error('updateMyProfile error', e);
    res.status(500).json({ message: 'Error actualizando perfil' });
  }
};

/**
 * GET /api/profile/:userId  (admin)
 * Devuelve perfil público del usuario (solo admin)
 */
exports.adminGetProfile = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = req.params.userId;
    if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Id inválido' });

    const user = await User.findById(id).select('name email role').lean();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const profile = await Profile.findOne({ user: id }).lean();

    res.json({
      user: {
        _id: user._id,
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'cliente'
      },
      profile: profile || null
    });
  } catch (e) {
    console.error('adminGetProfile error', e);
    res.status(500).json({ message: 'Error obteniendo perfil (admin)' });
  }
};