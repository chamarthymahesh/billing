const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Company = require('./models/Company');
const Invoice = require('./models/Invoice');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  const company = await Company.findOne({ name: /CRAFTSOFT/i });
  console.log('✅ Company:', company.name, '| ID:', company._id.toString());

  // Simulate what getNegativeStock will now do for CRAFTSOFT
  const companyInvoices = await Invoice.find({ companyId: company._id }).select('items').lean();
  const usedProductIds = new Set();
  companyInvoices.forEach(inv => {
    (inv.items || []).forEach(item => {
      if (item.productId) usedProductIds.add(item.productId.toString());
    });
  });
  console.log(`\n📋 Products in CRAFTSOFT invoices: ${usedProductIds.size}`);

  const products = await Product.find({
    stock: { $lt: 0 },
    _id: { $in: Array.from(usedProductIds) }
  }).populate('companyId', 'name').lean();

  console.log(`\n⚠️  Products that will show in CRAFTSOFT Stock Adjustment: ${products.length}`);
  products.forEach(p => {
    const owner = p.companyId?.name || 'Global/Null';
    console.log(`  - ${p.name} | owned by: ${owner} | stock: ${p.stock}`);
  });

  if (products.length === 0) {
    console.log('\n  → Still empty! Checking why...');
    const allInInvoice = await Product.find({ _id: { $in: Array.from(usedProductIds) } }).populate('companyId', 'name').lean();
    console.log('\n  All invoice products and their stock:');
    allInInvoice.forEach(p => {
      console.log(`    - ${p.name} | owner: ${p.companyId?.name || 'Global'} | stock: ${p.stock}`);
    });
  }

  await mongoose.disconnect();
}

check().catch(console.error);
