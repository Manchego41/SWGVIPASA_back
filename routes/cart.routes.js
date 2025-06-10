const express = require('express');
const router  = express.Router();
const { protect }            = require('../middlewares/auth.middleware');
const { addCart, getCart, removeCart } = require('../controllers/cart.controller');

router.post('/', protect, addCart);
router.get('/',  protect, getCart);
router.delete('/:id', protect, removeCart);

module.exports = router;