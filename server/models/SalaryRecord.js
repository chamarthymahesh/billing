const mongoose = require('mongoose');

const salaryRecordSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true }, // e.g. "May 2026"
  amountPaid: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['Cash', 'Bank Transfer', 'Cheque', 'Other'], default: 'Bank Transfer' },
  status: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Paid' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SalaryRecord', salaryRecordSchema);
