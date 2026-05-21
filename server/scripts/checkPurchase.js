const mongoose = require('mongoose');
require('dotenv').config();
const Purchase = require('../models/Purchase');
const Company = require('../models/Company');

async function checkPurchase() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', { useNewUrlParser: true, useUnifiedTopology: true });
  const company = await Company.findOne({ name: /jyothi/i });
  const purchases = await Purchase.find({ companyId: company._id, totalAmount: 6200 });
  
  purchases.forEach(p => {
    console.log(p);
  });
  
  process.exit(0);
}
checkPurchase();
