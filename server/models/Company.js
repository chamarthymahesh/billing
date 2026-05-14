const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstin: { type: String, default: '' },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  state: { type: String, default: 'Maharashtra' }, // Home state for GST comparison
  logo: { type: String, default: '' },
  bankDetails: {
    bankName: String,
    accountNo: String,
    ifscCode: String,
    branch: String
  },
  settings: {
    hasGst: { type: Boolean, default: false },
    invoicePrefix: { type: String, default: 'INV' },
    nextInvoiceNumber: { type: Number, default: 1 },
    financialYear: { type: String, default: '2026-27' },
    fyPrefix: { type: String, default: '26-27' },
    gstSlabs: { type: [Number], default: [0, 5, 12, 18, 28] },
    invoiceTemplate: { type: String, enum: ['Professional', 'Modern', 'Classic'], default: 'Professional' },
    termsAndConditions: { type: String, default: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.' }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
