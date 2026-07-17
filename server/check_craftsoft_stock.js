const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  // Use raw collection queries to avoid populate issues
  const Purchase = require('./models/Purchase');
  const Product = require('./models/Product');
  const Company = require('./models/Company');

  const company = await Company.findOne({ name: /CRAFTSOFT/i }).lean();
  console.log('✅ CRAFTSOFT ID:', company._id.toString());

  // How many purchases exist for CRAFTSOFT?
  const purchases = await Purchase.find({ companyId: company._id }).lean();
  console.log(`\n📦 CRAFTSOFT purchases in DB: ${purchases.length}`);
  for (const p of purchases) {
    const prod = await Product.findById(p.productId).select('name').lean();
    console.log(`  - ${prod?.name || 'Unknown'} | qty: ${p.quantity} | bill: ${p.billNumber} | supplier: ${p.supplierName}`);
  }

  // How many total purchases in DB?
  const allPurchases = await Purchase.find({}).lean();
  console.log(`\n📦 ALL purchases in entire DB: ${allPurchases.length}`);
  for (const p of allPurchases) {
    const comp = await Company.findById(p.companyId).select('name').lean();
    const prod = await Product.findById(p.productId).select('name').lean();
    console.log(`  - [${comp?.name || 'No company'}] ${prod?.name || 'Unknown'} | qty: ${p.quantity} | bill: ${p.billNumber}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
