const express = require('express');
const { createPurchase, getPurchases, getGlobalStock } = require('../controllers/purchaseController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createPurchase);
router.get('/', protect, getPurchases);
router.get('/global-stock', protect, superAdminOnly, getGlobalStock);

module.exports = router;
