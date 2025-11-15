// routes/favorite.routes.js
const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/favorite.controller');

router.use(protect);

router.get('/', ctrl.getMyFavorites);
router.post('/:productId', ctrl.addFavorite);
router.delete('/:productId', ctrl.removeFavorite);
// opcional si prefieres un solo endpoint
router.put('/:productId/toggle', ctrl.toggleFavorite);

module.exports = router;