const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  customer: {
    name: String,
    address: String,
    phone: String,
    gstin: String,
    state: String,
    placeOfSupply: String,
    shippingAddress: String,
    sameAsBilling: { type: Boolean, default: true }
  },
  items: [{
    description: String,
    hsnCode: String,
    quantity: Number,
    rate: Number,
    gstRate: Number, // Percentage (e.g., 18)
    amount: Number,
    cgst: Number,
    sgst: Number,
    igst: Number,
    total: Number
  }],
  subTotal: { type: Number, required: true },
  totalGst: { type: Number, default: 0 },
  transportCharges: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  commissionStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  adjustment: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  isGst: { type: Boolean, default: false },
  status: { type: String, enum: ['paid', 'unpaid', 'partially_paid'], default: 'unpaid' },
  notes: String,
  dispatchAddress: String,
  dispatchState: String
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
