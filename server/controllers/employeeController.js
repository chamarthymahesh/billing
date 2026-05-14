const Employee = require('../models/Employee');
const SalaryRecord = require('../models/SalaryRecord');

// Employee CRUD
exports.createEmployee = async (req, res) => {
  try {
    const emp = new Employee({ ...req.body, companyId: req.user.companyId });
    await emp.save();
    res.status(201).json(emp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ companyId: req.user.companyId });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(emp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Salary Management
exports.paySalary = async (req, res) => {
  try {
    const record = new SalaryRecord({ ...req.body, companyId: req.user.companyId });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSalaryHistory = async (req, res) => {
  try {
    const history = await SalaryRecord.find({ companyId: req.user.companyId })
      .populate('employeeId', 'name designation')
      .sort({ paymentDate: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
