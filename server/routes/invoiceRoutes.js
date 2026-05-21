const express = require('express');
const { createInvoice, getInvoices, getInvoiceById, getReports, updateCommissionStatus, updateCommissionDetails, updateInvoice, deleteInvoice, updateTransportDetails } = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createInvoice);
router.get('/', protect, getInvoices);
router.get('/reports', protect, getReports);
router.get('/global-reports', protect, (req, res, next) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
  const { getGlobalReports } = require('../controllers/invoiceController');
  getGlobalReports(req, res);
});
router.get('/detailed-reports', protect, (req, res, next) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
  const { getDetailedReports } = require('../controllers/invoiceController');
  getDetailedReports(req, res);
});
router.get('/:id', protect, getInvoiceById);
router.put('/:id', protect, updateInvoice);
router.delete('/:id', protect, deleteInvoice);
router.put('/:id/status', protect, (req, res, next) => {
  const { updatePaymentStatus } = require('../controllers/invoiceController');
  updatePaymentStatus(req, res);
});
router.put('/:id/commission', protect, updateCommissionStatus);
router.put('/:id/commission-details', protect, updateCommissionDetails);
router.put('/:id/transport-details', protect, updateTransportDetails);

module.exports = router;
