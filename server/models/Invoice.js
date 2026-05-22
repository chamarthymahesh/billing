const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date },
  gemContractNumber: { type: String },
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
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    hsnCode: String,
    quantity: Number,
    rate: Number,
    purchasePrice: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    gstRate: Number, // Percentage (e.g., 18)
    amount: Number,
    cgst: Number,
    sgst: Number,
    igst: Number,
    total: Number,
    materialStatus: { type: String, enum: ['Pending', 'Delivered'], default: 'Pending' },
    hasPurchase: { type: Boolean, default: false }
  }],
  subTotal: { type: Number, required: true },
  totalGst: { type: Number, default: 0 },
  transportCharges: { type: Number, default: 0 },
  transportStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  commission: { type: Number, default: 0 },
  commissionStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  adjustment: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  totalProfit: { type: Number, default: 0 },
  isGst: { type: Boolean, default: false },
  stockDeficit: { type: Boolean, default: false },
  status: { type: String, enum: ['paid', 'unpaid', 'partially_paid'], default: 'unpaid' },
  materialDeliveryStatus: { type: String, enum: ['Pending', 'Delivered'], default: 'Pending' },
  notes: String,
  dispatchAddress: String,
  dispatchState: String
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
