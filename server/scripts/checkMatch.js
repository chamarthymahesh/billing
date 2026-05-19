const mongoose = require('mongoose');
require('dotenv').config();

const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', { useNewUrlParser: true, useUnifiedTopology: true });
  
  const inv = await Invoice.findOne({ invoiceNumber: 'HE/26-27/001' });
  const purchases = await Purchase.find({ companyId: inv.companyId });
  
  console.log('Invoice items:');
  inv.items.forEach(i => console.log(i.productId, i.description));
  
  console.log('Purchases:');
  purchases.forEach(p => console.log(p.productId, p.productName, p.totalAmount));
  
  process.exit(0);
}
check();
