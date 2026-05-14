const express = require('express');
const { 
  createEmployee, getEmployees, updateEmployee, 
  paySalary, getSalaryHistory 
} = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createEmployee);
router.get('/', protect, getEmployees);
router.put('/:id', protect, updateEmployee);

router.post('/salary', protect, paySalary);
router.get('/salary', protect, getSalaryHistory);

module.exports = router;
