const express = require('express');
const { createPurchase, getPurchases, getGlobalStock, updatePurchase, deletePurchase, updatePurchaseBill, deletePurchaseBill } = require('../controllers/purchaseController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createPurchase);
router.get('/', protect, getPurchases);
router.get('/global-stock', protect, superAdminOnly, getGlobalStock);
router.put('/bill/:billNumber', protect, updatePurchaseBill);
router.delete('/bill/:billNumber', protect, deletePurchaseBill);
router.put('/:id', protect, updatePurchase);
router.delete('/:id', protect, deletePurchase);

module.exports = router;
