const express = require('express');
const { createCompany, getCompanies, getCompanyById, updateCompany, deleteCompany, getGlobalStats } = require('../controllers/companyController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, superAdminOnly, createCompany);
router.get('/', protect, superAdminOnly, getCompanies);
router.get('/global-stats', protect, superAdminOnly, getGlobalStats);
router.get('/:id', protect, getCompanyById);
router.put('/:id', protect, updateCompany);
router.delete('/:id', protect, superAdminOnly, deleteCompany);

module.exports = router;
