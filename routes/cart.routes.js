// routes/cart.routes.js
const express = require('express');
const router  = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { protect } = require('../middlewares/auth.middleware');
const {
  addCart,
  getCart,
  removeCart,
  checkoutLocal,
  checkoutUnified, // 👈
} = require('../controllers/cart.controller');

router.use(protect);
router.post('/', addCart);
router.get('/',  getCart);
router.delete('/:id', removeCart);

router.post('/checkout-local', checkoutLocal);
router.post('/checkout', upload.single('voucher'), checkoutUnified); // 👈 NUEVO

module.exports = router;
