const express = require('express');
const { createCompany, getCompanies, getCompanyById, updateCompany } = require('../controllers/companyController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, superAdminOnly, createCompany);
router.get('/', protect, superAdminOnly, getCompanies);
router.get('/:id', protect, getCompanyById);
router.put('/:id', protect, updateCompany);

module.exports = router;
