const express = require('express');
const { createProduct, getProducts, updateProduct, deleteProduct, getNegativeStock } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/negative-stock', protect, getNegativeStock);
router.post('/', protect, createProduct);
router.get('/', protect, getProducts);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;

