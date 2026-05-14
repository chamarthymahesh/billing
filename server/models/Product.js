const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, default: '' },
  productType: { type: String, enum: ['Good', 'Service'], default: 'Good' },
  category: { type: String, default: '' },
  sku: { type: String, unique: true },
  barcode: { type: String },
  hsnCode: { type: String },
  unit: { type: String, default: 'Pcs' }, // Pcs, Kg, Ltr, Box, etc.
  description: { type: String },
  purchasePrice: { type: Number, default: 0 },
  price: { type: Number, required: true }, // Selling Price
  mrp: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 0 },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
