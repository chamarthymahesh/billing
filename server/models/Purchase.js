const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  supplierName: { type: String, required: true },
  supplierGstin: { type: String },
  billNumber: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  gstRate: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  totalGst: { type: Number, default: 0 },
  subTotal: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  packagingCharges: { type: Number, default: 0 },
  transportCharges: { type: Number, default: 0 },
  miscCharges: { type: Number, default: 0 },
  isGst: { type: Boolean, default: false },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
