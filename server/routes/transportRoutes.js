const express = require('express');
const { createTransport, getTransportRecords, deleteTransportRecord } = require('../controllers/transportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createTransport);
router.get('/', protect, getTransportRecords);
router.delete('/:id', protect, deleteTransportRecord);

module.exports = router;
