// Invoice routes definition for Billing Software backend
// Sets up all REST endpoints for invoices, reports, and related utilities.
// Uses Express router and protect middleware for authentication and role checks.

const express = require('express');
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getReports,
  getGlobalReports,
  getDetailedReports,
  getGlobalCustomers,
  updateInvoice,
  deleteInvoice,
  updatePaymentStatus,
  updateCommissionStatus,
  updateCommissionDetails,
  updateTransportDetails,
  updateMaterialDeliveryStatus,
  getDeficitCompanies
} = require('../controllers/invoiceController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Core invoice CRUD
router.post('/', protect, createInvoice);
router.get('/', protect, getInvoices);

// Reporting endpoints (Must be declared BEFORE /:id to prevent route collision)
router.get('/reports', protect, getReports);
router.get('/global-reports', protect, getGlobalReports); // superadmin check inside controller
router.get('/detailed-reports', protect, getDetailedReports); // superadmin check inside controller
router.get('/global-customers', protect, getGlobalCustomers);
router.get('/deficit-companies', protect, superAdminOnly, getDeficitCompanies);

// Parameterized core CRUD
router.get('/:id', protect, getInvoiceById);
router.put('/:id', protect, updateInvoice);
router.delete('/:id', protect, deleteInvoice);

// Status & auxiliary updates
router.put('/:id/status', protect, updatePaymentStatus);
router.put('/:id/commission', protect, updateCommissionStatus);
router.put('/:id/commission-details', protect, updateCommissionDetails);
router.put('/:id/transport-details', protect, updateTransportDetails);
router.put('/:id/delivery-status', protect, updateMaterialDeliveryStatus);

module.exports = router;
