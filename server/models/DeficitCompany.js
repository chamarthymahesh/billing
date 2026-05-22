const mongoose = require('mongoose');

const deficitCompanySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
  lastDeficitAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeficitCompany', deficitCompanySchema);
