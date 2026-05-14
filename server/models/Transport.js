const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  vehicleNumber: { type: String, required: true },
  date: { type: Date, default: Date.now },
  driverName: { type: String },
  type: { 
    type: String, 
    enum: ['Fuel', 'Maintenance', 'Delivery', 'Toll/Expense', 'Other'], 
    default: 'Fuel' 
  },
  description: { type: String },
  amount: { type: Number, required: true },
  odometerReading: { type: Number },
  liters: { type: Number }, // Only for Fuel
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' } // Link to delivery if applicable
}, { timestamps: true });

module.exports = mongoose.model('Transport', transportSchema);
