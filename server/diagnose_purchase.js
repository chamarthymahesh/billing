const mongoose = require('mongoose');
require('dotenv').config();

const Purchase = require('./models/Purchase');
const Product = require('./models/Product');
const Company = require('./models/Company');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('\n=== STEP 1: Find the bill HGFK87-4774 ===');
  const bills = await Purchase.find({ billNumber: 'HGFK87-4774' })
    .populate('productId', 'name stock companyId')
    .populate('companyId', 'name');
  
  if (!bills.length) {
    console.log('❌ Bill HGFK87-4774 NOT FOUND in database!');
  } else {
    bills.forEach(b => {
      console.log(`✅ Found purchase: _id=${b._id}`);
      console.log(`   Company: ${b.companyId?.name || b.companyId}`);
      console.log(`   Product: ${b.productId?.name || b.productId}`);
      console.log(`   Quantity: ${b.quantity}`);
      console.log(`   Rate: ${b.rate}`);
    });
  }

  console.log('\n=== STEP 2: Find all "REGISTER 200 PAGES" products across companies ===');
  const products = await Product.find({ name: /REGISTER 200 PAGES/i })
    .populate('companyId', 'name');
  
  if (!products.length) {
    console.log('❌ No product named REGISTER 200 PAGES found in ANY company!');
  } else {
    products.forEach(p => {
      console.log(`✅ Product: ${p.name}`);
      console.log(`   _id: ${p._id}`);
      console.log(`   Company: ${p.companyId?.name || p.companyId}`);
      console.log(`   Stock: ${p.stock}`);
      console.log(`   Purchase Price: ${p.purchasePrice}`);
    });
  }

  console.log('\n=== STEP 3: Find Sithara Enterprises company ===');
  const sithara = await Company.findOne({ name: /sithara/i });
  if (!sithara) {
    console.log('❌ Sithara Enterprises company not found!');
  } else {
    console.log(`✅ Sithara Enterprises _id: ${sithara._id}`);
    console.log(`   Name: ${sithara.name}`);

    console.log('\n=== STEP 4: Find all purchases under Sithara Enterprises ===');
    const sitharaPurchases = await Purchase.find({ companyId: sithara._id })
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    if (!sitharaPurchases.length) {
      console.log('❌ NO purchases found under Sithara Enterprises!');
    } else {
      console.log(`Found ${sitharaPurchases.length} purchase(s):`);
      sitharaPurchases.forEach(p => {
        console.log(`   Bill: ${p.billNumber} | Product: ${p.productId?.name} | Qty: ${p.quantity}`);
      });
    }
  }

  mongoose.disconnect();
}).catch(err => {
  console.error('DB Error:', err.message);
  mongoose.disconnect();
});
