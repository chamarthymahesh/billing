const express = require('express');
const { generateGSTR1Report } = require('../controllers/gstr1Controller');
const { protect, superAdminOnly, managerOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/gstr1', protect, generateGSTR1Report);

module.exports = router;
